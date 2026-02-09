/**
 * Notification Service - Phase 6
 * Handles in-app notifications with WebSocket dispatch
 */

import prisma from '../lib/prisma';
import { NotificationType, NotificationTargetRole, Prisma } from '@prisma/client';
import { sendToUser } from '../lib/websocket';

// ==================== Types ====================

interface CreateNotificationParams {
    type: NotificationType;
    role: NotificationTargetRole;
    userId?: string;
    managerId?: string;
    venueId?: string;
    bookingId?: string;
    title: string;
    body: string;
}

interface ListNotificationsParams {
    role: NotificationTargetRole;
    userId?: string;
    managerId?: string;
    isRead?: boolean;
    cursor?: string;
    limit?: number;
}

interface NotificationDTO {
    id: string;
    type: NotificationType;
    role: NotificationTargetRole;
    title: string;
    body: string;
    bookingId: string | null;
    venueId: string | null;
    isRead: boolean;
    createdAt: string;
}

// ==================== Service Functions ====================

/**
 * Create a notification and dispatch via WebSocket
 */
export async function createAndDispatch(params: CreateNotificationParams): Promise<void> {
    const { type, role, userId, managerId, venueId, bookingId, title, body } = params;

    try {
        // Create DB record
        const notification = await prisma.notification.create({
            data: {
                type,
                role,
                userId,
                managerId,
                venueId,
                bookingId,
                title,
                body,
            },
        });

        // Dispatch via WebSocket
        const payload: NotificationDTO = {
            id: notification.id,
            type: notification.type,
            role: notification.role,
            title: notification.title,
            body: notification.body,
            bookingId: notification.bookingId,
            venueId: notification.venueId,
            isRead: notification.isRead,
            createdAt: notification.createdAt.toISOString(),
        };

        // Send to appropriate user
        const targetUserId = role === 'USER' ? userId : managerId;
        if (targetUserId) {
            sendToUser(targetUserId, {
                type: 'notification:new',
                payload: { ...payload },
            });
        }

        console.log(`📢 Notification created: ${type} -> ${role}:${targetUserId}`);
    } catch (error) {
        console.error('Failed to create notification:', error);
        // Don't throw - notifications should not block main flow
    }
}

/**
 * List notifications with cursor pagination
 */
export async function listNotifications(params: ListNotificationsParams): Promise<{
    success: boolean;
    data?: {
        items: NotificationDTO[];
        nextCursor: string | null;
    };
    error?: { code: string; message: string };
}> {
    const { role, userId, managerId, isRead, cursor, limit = 20 } = params;

    try {
        // Build where clause
        const where: Prisma.NotificationWhereInput = { role };

        if (role === 'USER' && userId) {
            where.userId = userId;
        } else if (role === 'MANAGER' && managerId) {
            where.managerId = managerId;
        }

        if (typeof isRead === 'boolean') {
            where.isRead = isRead;
        }

        if (cursor) {
            where.createdAt = { lt: new Date(cursor) };
        }

        const notifications = await prisma.notification.findMany({
            where,
            orderBy: { createdAt: 'desc' },
            take: limit + 1, // fetch one extra to check if there's more
        });

        const hasMore = notifications.length > limit;
        const items = hasMore ? notifications.slice(0, limit) : notifications;
        const nextCursor = hasMore ? items[items.length - 1].createdAt.toISOString() : null;

        return {
            success: true,
            data: {
                items: items.map((n) => ({
                    id: n.id,
                    type: n.type,
                    role: n.role,
                    title: n.title,
                    body: n.body,
                    bookingId: n.bookingId,
                    venueId: n.venueId,
                    isRead: n.isRead,
                    createdAt: n.createdAt.toISOString(),
                })),
                nextCursor,
            },
        };
    } catch (error) {
        console.error('List notifications error:', error);
        return { success: false, error: { code: 'SERVER_ERROR', message: 'Lỗi server' } };
    }
}

/**
 * Get unread count
 */
export async function getUnreadCount(params: {
    role: NotificationTargetRole;
    userId?: string;
    managerId?: string;
}): Promise<{ success: boolean; data?: { count: number }; error?: { code: string; message: string } }> {
    const { role, userId, managerId } = params;

    try {
        const where: Prisma.NotificationWhereInput = {
            role,
            isRead: false,
        };

        if (role === 'USER' && userId) {
            where.userId = userId;
        } else if (role === 'MANAGER' && managerId) {
            where.managerId = managerId;
        }

        const count = await prisma.notification.count({ where });

        return { success: true, data: { count } };
    } catch (error) {
        console.error('Get unread count error:', error);
        return { success: false, error: { code: 'SERVER_ERROR', message: 'Lỗi server' } };
    }
}

/**
 * Mark single notification as read
 */
export async function markAsRead(
    notificationId: string,
    userId: string,
    role: NotificationTargetRole
): Promise<{ success: boolean; error?: { code: string; message: string } }> {
    try {
        // Build ownership check
        const where: Prisma.NotificationWhereInput = {
            id: notificationId,
            role,
        };

        if (role === 'USER') {
            where.userId = userId;
        } else {
            where.managerId = userId;
        }

        const notification = await prisma.notification.findFirst({ where });

        if (!notification) {
            return { success: false, error: { code: 'NOT_FOUND', message: 'Notification not found' } };
        }

        if (!notification.isRead) {
            await prisma.notification.update({
                where: { id: notificationId },
                data: { isRead: true },
            });
        }

        return { success: true };
    } catch (error) {
        console.error('Mark as read error:', error);
        return { success: false, error: { code: 'SERVER_ERROR', message: 'Lỗi server' } };
    }
}

/**
 * Mark all notifications as read
 */
export async function markAllAsRead(
    userId: string,
    role: NotificationTargetRole
): Promise<{ success: boolean; data?: { count: number }; error?: { code: string; message: string } }> {
    try {
        const where: Prisma.NotificationWhereInput = {
            role,
            isRead: false,
        };

        if (role === 'USER') {
            where.userId = userId;
        } else {
            where.managerId = userId;
        }

        const result = await prisma.notification.updateMany({
            where,
            data: { isRead: true },
        });

        return { success: true, data: { count: result.count } };
    } catch (error) {
        console.error('Mark all as read error:', error);
        return { success: false, error: { code: 'SERVER_ERROR', message: 'Lỗi server' } };
    }
}

// ==================== Helper: Notify by booking ====================

/**
 * Helper to notify user about booking status change
 */
export async function notifyBookingStatusChange(
    bookingId: string,
    userId: string,
    type: NotificationType,
    title: string,
    body: string,
    venueId?: string
): Promise<void> {
    await createAndDispatch({
        type,
        role: 'USER',
        userId,
        bookingId,
        venueId,
        title,
        body,
    });
}

/**
 * Helper to notify manager about new booking
 */
export async function notifyManagerNewBooking(
    bookingId: string,
    managerId: string,
    venueId: string,
    venueName: string
): Promise<void> {
    await createAndDispatch({
        type: 'BOOKING_CREATED',
        role: 'MANAGER',
        managerId,
        bookingId,
        venueId,
        title: 'Đặt sân mới',
        body: `Có khách đặt sân tại ${venueName}`,
    });

    // Also emit booking:updated for realtime list refresh
    sendToUser(managerId, {
        type: 'booking:updated',
        payload: { bookingId, venueId, action: 'created' },
    });
}

/**
 * Helper to notify manager about new review
 */
export async function notifyManagerNewReview(
    managerId: string,
    venueId: string,
    venueName: string,
    rating: number
): Promise<void> {
    await createAndDispatch({
        type: 'REVIEW_CREATED',
        role: 'MANAGER',
        managerId,
        venueId,
        title: 'Đánh giá mới',
        body: `Khách hàng đánh giá ${rating}⭐ cho ${venueName}`,
    });
}
