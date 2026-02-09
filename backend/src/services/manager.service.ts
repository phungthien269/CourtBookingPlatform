/**
 * Manager Service - Phase 4
 * Handles manager booking confirmations and cancellations
 */

import prisma from '../lib/prisma.js';
import { broadcast, sendToUser } from '../lib/websocket.js';
import { notifyBookingStatusChange } from './notification.service.js';

// ==================== TYPES ====================

interface ManagerBookingListItem {
    bookingId: string;
    status: string;
    paymentMethod: string | null;
    paymentDeclaredAt: string | null;
    waitingConfirmSince: string | null;
    date: string;
    startTime: string;
    endTime: string;
    totalPrice: number;
    court: { id: string; name: string };
    user: { id: string; name: string | null; email: string };
}

interface ConfirmResult {
    success: boolean;
    data?: {
        bookingId: string;
        status: string;
        confirmedAt: string;
    };
    error?: {
        code: string;
        message: string;
    };
}

interface CancelResult {
    success: boolean;
    data?: {
        bookingId: string;
        status: string;
        reason: string;
    };
    error?: {
        code: string;
        message: string;
    };
}

// ==================== HELPERS ====================

/**
 * Get manager's venue ID
 */
async function getManagerVenueId(userId: string): Promise<string | null> {
    const manager = await prisma.manager.findFirst({
        where: { userId },
        include: {
            venue: {
                select: { id: true },
            },
        },
    });
    return manager?.venue?.id || null;
}

// ==================== SERVICES ====================

/**
 * Get bookings for manager's venue
 */
export async function getManagerBookings(
    managerId: string,
    filters?: { date?: string; status?: string }
): Promise<ManagerBookingListItem[]> {
    const venueId = await getManagerVenueId(managerId);
    if (!venueId) return [];

    const whereClause: any = {
        court: {
            venueId: venueId,
        },
    };

    if (filters?.date) {
        whereClause.date = new Date(filters.date);
    }

    if (filters?.status) {
        whereClause.status = filters.status;
    }

    const bookings = await prisma.booking.findMany({
        where: whereClause,
        include: {
            court: {
                select: { id: true, name: true },
            },
            user: {
                select: { id: true, name: true, email: true },
            },
        },
        orderBy: [
            { date: 'asc' },
            { startTime: 'asc' },
        ],
    });

    return bookings.map((b) => ({
        bookingId: b.id,
        status: b.status,
        paymentMethod: b.paymentMethod,
        paymentDeclaredAt: b.paymentDeclaredAt?.toISOString() || null,
        waitingConfirmSince: b.waitingConfirmSince?.toISOString() || null,
        date: b.date.toISOString().split('T')[0],
        startTime: b.startTime,
        endTime: b.endTime,
        totalPrice: b.totalPrice,
        court: { id: b.court.id, name: b.court.name },
        user: { id: b.user.id, name: b.user.name, email: b.user.email },
    }));
}

/**
 * Confirm a booking by manager
 */
export async function confirmBooking(bookingId: string, managerId: string): Promise<ConfirmResult> {
    const venueId = await getManagerVenueId(managerId);
    if (!venueId) {
        return {
            success: false,
            error: { code: 'VENUE_NOT_FOUND', message: 'Không tìm thấy địa điểm của bạn' },
        };
    }

    const booking = await prisma.booking.findFirst({
        where: {
            id: bookingId,
            court: { venueId },
        },
    });

    if (!booking) {
        return {
            success: false,
            error: { code: 'NOT_FOUND', message: 'Không tìm thấy đơn đặt sân' },
        };
    }

    if (booking.status !== 'WAITING_MANAGER_CONFIRM') {
        return {
            success: false,
            error: { code: 'INVALID_STATUS', message: 'Đơn đặt sân không ở trạng thái chờ xác nhận' },
        };
    }

    const now = new Date();
    const updated = await prisma.booking.update({
        where: { id: bookingId },
        data: {
            status: 'CONFIRMED',
            confirmedAt: now,
            managerDecisionAt: now,
        },
    });

    // Broadcast to user
    broadcast({
        type: 'booking.confirmed',
        payload: {
            bookingId: updated.id,
            userId: booking.userId,
            confirmedAt: now.toISOString(),
        },
    });

    // Phase 6: Notify user
    await notifyBookingStatusChange(
        bookingId,
        booking.userId,
        'BOOKING_CONFIRMED',
        'Đặt sân được xác nhận',
        'Quản lý đã xác nhận đơn đặt sân của bạn',
        venueId
    );
    sendToUser(booking.userId, {
        type: 'booking:updated',
        payload: { bookingId, status: 'CONFIRMED', action: 'confirmed' },
    });

    return {
        success: true,
        data: {
            bookingId: updated.id,
            status: updated.status,
            confirmedAt: now.toISOString(),
        },
    };
}

/**
 * Cancel a booking by manager (with required reason)
 * Allowed statuses: WAITING_MANAGER_CONFIRM, CONFIRMED
 */
export async function cancelBooking(
    bookingId: string,
    managerId: string,
    reason: string
): Promise<CancelResult> {
    if (!reason || reason.trim().length < 5) {
        return {
            success: false,
            error: { code: 'REASON_REQUIRED', message: 'Lý do hủy phải có ít nhất 5 ký tự' },
        };
    }

    const venueId = await getManagerVenueId(managerId);
    if (!venueId) {
        return {
            success: false,
            error: { code: 'VENUE_NOT_FOUND', message: 'Không tìm thấy địa điểm của bạn' },
        };
    }

    const booking = await prisma.booking.findFirst({
        where: {
            id: bookingId,
            court: { venueId },
        },
    });

    if (!booking) {
        return {
            success: false,
            error: { code: 'NOT_FOUND', message: 'Không tìm thấy đơn đặt sân' },
        };
    }

    const allowedStatuses = ['WAITING_MANAGER_CONFIRM', 'CONFIRMED'];
    if (!allowedStatuses.includes(booking.status)) {
        return {
            success: false,
            error: { code: 'INVALID_STATUS', message: 'Không thể hủy đơn này' },
        };
    }

    const now = new Date();
    const updated = await prisma.booking.update({
        where: { id: bookingId },
        data: {
            status: 'CANCELLED_BY_MANAGER',
            managerCancelReason: reason.trim(),
            managerDecisionAt: now,
        },
    });

    // Broadcast to user
    broadcast({
        type: 'booking.cancelled',
        payload: {
            bookingId: updated.id,
            userId: booking.userId,
            reason: reason.trim(),
        },
    });

    // Phase 6: Notify user
    await notifyBookingStatusChange(
        bookingId,
        booking.userId,
        'BOOKING_REJECTED',
        'Đặt sân bị từ chối',
        `Lý do: ${reason.trim()}`,
        venueId
    );
    sendToUser(booking.userId, {
        type: 'booking:updated',
        payload: { bookingId, status: 'CANCELLED_BY_MANAGER', action: 'rejected' },
    });

    return {
        success: true,
        data: {
            bookingId: updated.id,
            status: updated.status,
            reason: reason.trim(),
        },
    };
}
