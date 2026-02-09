/**
 * Chat Service - Phase 5
 * Handles chat threads and messages between users and managers
 */

import prisma from '../lib/prisma';
import { SenderRole } from '@prisma/client';
import { sendToUser } from '../lib/websocket';

// ==================== Types ====================

export interface CreateThreadRequest {
    userId: string;
    bookingId: string;
}

export interface CreateThreadResult {
    success: boolean;
    data?: {
        threadId: string;
        isNew: boolean;
    };
    error?: { code: string; message: string };
}

export interface GetMessagesResult {
    success: boolean;
    data?: {
        messages: Array<{
            id: string;
            senderUserId: string;
            senderRole: SenderRole;
            content: string;
            createdAt: string;
        }>;
    };
    error?: { code: string; message: string };
}

export interface SendMessageRequest {
    threadId: string;
    senderUserId: string;
    senderRole: SenderRole;
    content: string;
}

export interface SendMessageResult {
    success: boolean;
    data?: {
        id: string;
        threadId: string;
        senderUserId: string;
        senderRole: SenderRole;
        content: string;
        createdAt: string;
    };
    error?: { code: string; message: string };
}

export interface ManagerInboxResult {
    success: boolean;
    data?: {
        threads: Array<{
            threadId: string;
            bookingId: string;
            venueName: string;
            userMasked: string;
            lastMessageAt: string | null;
            managerUnreadCount: number;
        }>;
    };
    error?: { code: string; message: string };
}

// ==================== Helpers ====================

function maskEmail(email: string): string {
    const [local, domain] = email.split('@');
    if (!domain) return '***';
    const visibleChars = Math.min(2, local.length);
    return `${local.slice(0, visibleChars)}***@${domain}`;
}

// ==================== Service Functions ====================

/**
 * Create or get existing chat thread for a booking
 */
export async function createOrGetThread(request: CreateThreadRequest): Promise<CreateThreadResult> {
    const { userId, bookingId } = request;

    // Get booking with venue and manager info
    const booking = await prisma.booking.findUnique({
        where: { id: bookingId },
        include: {
            court: {
                include: {
                    venue: {
                        include: {
                            manager: true,
                        },
                    },
                },
            },
            chatThread: true,
        },
    });

    if (!booking) {
        return {
            success: false,
            error: { code: 'BOOKING_NOT_FOUND', message: 'Không tìm thấy booking' },
        };
    }

    // Check ownership
    if (booking.userId !== userId) {
        return {
            success: false,
            error: { code: 'FORBIDDEN', message: 'Bạn không có quyền chat cho booking này' },
        };
    }

    // Check status - only WAITING_MANAGER_CONFIRM or CONFIRMED
    if (!['WAITING_MANAGER_CONFIRM', 'CONFIRMED'].includes(booking.status)) {
        return {
            success: false,
            error: { code: 'INVALID_STATUS', message: 'Chỉ có thể chat khi booking đang chờ xác nhận hoặc đã xác nhận' },
        };
    }

    // If thread exists, return it
    if (booking.chatThread) {
        return {
            success: true,
            data: {
                threadId: booking.chatThread.id,
                isNew: false,
            },
        };
    }

    // Create new thread
    const venue = booking.court.venue;
    const managerUserId = venue.manager.userId;

    const thread = await prisma.chatThread.create({
        data: {
            bookingId,
            userId,
            managerUserId,
            venueId: venue.id,
        },
    });

    return {
        success: true,
        data: {
            threadId: thread.id,
            isNew: true,
        },
    };
}

/**
 * Get messages for a thread
 * Also resets unread count for the requesting party
 */
export async function getMessages(
    threadId: string,
    requesterId: string,
    requesterRole: 'USER' | 'MANAGER',
    limit: number = 50,
    before?: string
): Promise<GetMessagesResult> {
    // Get thread and verify access
    const thread = await prisma.chatThread.findUnique({
        where: { id: threadId },
    });

    if (!thread) {
        return {
            success: false,
            error: { code: 'THREAD_NOT_FOUND', message: 'Không tìm thấy cuộc trò chuyện' },
        };
    }

    // Check access
    const hasAccess =
        (requesterRole === 'USER' && thread.userId === requesterId) ||
        (requesterRole === 'MANAGER' && thread.managerUserId === requesterId);

    if (!hasAccess) {
        return {
            success: false,
            error: { code: 'FORBIDDEN', message: 'Bạn không có quyền xem cuộc trò chuyện này' },
        };
    }

    // Build query
    const whereClause: { threadId: string; createdAt?: { lt: Date } } = { threadId };
    if (before) {
        whereClause.createdAt = { lt: new Date(before) };
    }

    const messages = await prisma.chatMessage.findMany({
        where: whereClause,
        orderBy: { createdAt: 'asc' },
        take: limit,
    });

    // Reset unread count for the requesting party
    if (requesterRole === 'USER' && thread.userUnreadCount > 0) {
        await prisma.chatThread.update({
            where: { id: threadId },
            data: { userUnreadCount: 0 },
        });
    } else if (requesterRole === 'MANAGER' && thread.managerUnreadCount > 0) {
        await prisma.chatThread.update({
            where: { id: threadId },
            data: { managerUnreadCount: 0 },
        });
    }

    return {
        success: true,
        data: {
            messages: messages.map((m) => ({
                id: m.id,
                senderUserId: m.senderUserId,
                senderRole: m.senderRole,
                content: m.content,
                createdAt: m.createdAt.toISOString(),
            })),
        },
    };
}

/**
 * Send a message in a thread
 */
export async function sendMessage(request: SendMessageRequest): Promise<SendMessageResult> {
    const { threadId, senderUserId, senderRole, content } = request;

    // Validate content
    if (!content || content.trim().length === 0) {
        return {
            success: false,
            error: { code: 'EMPTY_CONTENT', message: 'Nội dung tin nhắn không được trống' },
        };
    }

    if (content.length > 1000) {
        return {
            success: false,
            error: { code: 'CONTENT_TOO_LONG', message: 'Tin nhắn tối đa 1000 ký tự' },
        };
    }

    // Get thread and verify access
    const thread = await prisma.chatThread.findUnique({
        where: { id: threadId },
        include: {
            booking: true,
            user: { select: { name: true, email: true } },
            venue: { select: { name: true } },
        },
    });

    if (!thread) {
        return {
            success: false,
            error: { code: 'THREAD_NOT_FOUND', message: 'Không tìm thấy cuộc trò chuyện' },
        };
    }

    // Check access
    const hasAccess =
        (senderRole === 'USER' && thread.userId === senderUserId) ||
        (senderRole === 'MANAGER' && thread.managerUserId === senderUserId);

    if (!hasAccess) {
        return {
            success: false,
            error: { code: 'FORBIDDEN', message: 'Bạn không có quyền gửi tin nhắn' },
        };
    }

    // Create message and update thread
    const now = new Date();

    const [message] = await prisma.$transaction([
        prisma.chatMessage.create({
            data: {
                threadId,
                senderUserId,
                senderRole,
                content: content.trim(),
            },
        }),
        prisma.chatThread.update({
            where: { id: threadId },
            data: {
                lastMessageAt: now,
                // Increment unread count for the other party
                ...(senderRole === 'USER'
                    ? { managerUnreadCount: { increment: 1 } }
                    : { userUnreadCount: { increment: 1 } }),
            },
        }),
    ]);

    // Send realtime event to the other party
    const targetUserId = senderRole === 'USER' ? thread.managerUserId : thread.userId;
    const senderName = senderRole === 'USER'
        ? (thread.user.name || maskEmail(thread.user.email))
        : thread.venue.name;

    sendToUser(targetUserId, {
        type: 'chat.message.created',
        payload: {
            threadId,
            bookingId: thread.bookingId,
            senderRole,
            senderName,
            content: content.trim(),
            createdAt: message.createdAt.toISOString(),
        },
    });

    return {
        success: true,
        data: {
            id: message.id,
            threadId: message.threadId,
            senderUserId: message.senderUserId,
            senderRole: message.senderRole,
            content: message.content,
            createdAt: message.createdAt.toISOString(),
        },
    };
}

/**
 * Get manager's chat inbox
 */
export async function getManagerInbox(managerUserId: string): Promise<ManagerInboxResult> {
    const threads = await prisma.chatThread.findMany({
        where: { managerUserId },
        include: {
            user: { select: { email: true, name: true } },
            venue: { select: { name: true } },
        },
        orderBy: { lastMessageAt: 'desc' },
    });

    return {
        success: true,
        data: {
            threads: threads.map((t) => ({
                threadId: t.id,
                bookingId: t.bookingId,
                venueName: t.venue.name,
                userMasked: t.user.name ? t.user.name.slice(0, 2) + '***' : maskEmail(t.user.email),
                lastMessageAt: t.lastMessageAt?.toISOString() || null,
                managerUnreadCount: t.managerUnreadCount,
            })),
        },
    };
}
