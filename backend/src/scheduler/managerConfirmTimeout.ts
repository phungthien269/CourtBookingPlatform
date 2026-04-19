/**
 * Manager Confirmation Timeout Scheduler - Phase 4
 * Auto-cancels WAITING_MANAGER_CONFIRM bookings after 1 hour
 */

import prisma from '../lib/prisma.js';
import { logger } from '../lib/logger.js';
import { broadcast } from '../lib/websocket.js';

const CONFIRM_TIMEOUT_HOURS = 1;
const SCHEDULER_INTERVAL_MS = 60 * 1000; // 1 minute

/**
 * Start the manager confirmation timeout scheduler
 */
export function startManagerConfirmTimeoutScheduler(): void {
    logger.info({
        event: 'booking.manager_confirm_timeout_scheduler_started',
        timeoutHours: CONFIRM_TIMEOUT_HOURS,
        intervalMs: SCHEDULER_INTERVAL_MS,
    });

    setInterval(async () => {
        try {
            await processExpiredConfirmations();
        } catch (err) {
            logger.error({
                event: 'booking.manager_confirm_timeout_scheduler_failed',
                error: err,
            });
        }
    }, SCHEDULER_INTERVAL_MS);
}

/**
 * Process bookings that have exceeded the 1-hour confirmation timeout
 */
async function processExpiredConfirmations(): Promise<void> {
    const cutoffTime = new Date(Date.now() - CONFIRM_TIMEOUT_HOURS * 60 * 60 * 1000);

    // Find expired WAITING_MANAGER_CONFIRM bookings
    const expiredBookings = await prisma.booking.findMany({
        where: {
            status: 'WAITING_MANAGER_CONFIRM',
            waitingConfirmSince: {
                lte: cutoffTime,
            },
            managerDecisionAt: null,
        },
        include: {
            court: {
                select: { venueId: true },
            },
        },
    });

    if (expiredBookings.length === 0) return;

    const now = new Date();
    const reason = 'Quá thời gian xác nhận';

    for (const booking of expiredBookings) {
        // Update booking
        await prisma.booking.update({
            where: { id: booking.id },
            data: {
                status: 'CANCELLED_BY_MANAGER',
                managerCancelReason: reason,
                managerDecisionAt: now,
            },
        });

        // Broadcast to user and manager
        broadcast({
            type: 'booking.timeout.cancelled',
            payload: {
                bookingId: booking.id,
                userId: booking.userId,
                venueId: booking.court.venueId,
                reason: reason,
            },
        });

        logger.info({
            event: 'booking.manager_confirm_timeout_cancelled',
            bookingId: booking.id,
            userId: booking.userId,
            venueId: booking.court.venueId,
        });
    }

    if (expiredBookings.length > 0) {
        logger.info({
            event: 'booking.manager_confirm_timeout_batch_processed',
            count: expiredBookings.length,
        });
    }
}
