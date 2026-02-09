/**
 * Manager Confirmation Timeout Scheduler - Phase 4
 * Auto-cancels WAITING_MANAGER_CONFIRM bookings after 1 hour
 */

import prisma from '../lib/prisma.js';
import { broadcast } from '../lib/websocket.js';

const CONFIRM_TIMEOUT_HOURS = 1;
const SCHEDULER_INTERVAL_MS = 60 * 1000; // 1 minute

/**
 * Start the manager confirmation timeout scheduler
 */
export function startManagerConfirmTimeoutScheduler(): void {
    console.log('⏰ [Phase 4] Manager confirm timeout scheduler started (1h timeout, 1min interval)');

    setInterval(async () => {
        try {
            await processExpiredConfirmations();
        } catch (err) {
            console.error('❌ [Phase 4] Timeout scheduler error:', err);
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

        console.log(`⏰ [Phase 4] Auto-cancelled booking ${booking.id} - timeout exceeded`);
    }

    if (expiredBookings.length > 0) {
        console.log(`⏰ [Phase 4] Processed ${expiredBookings.length} expired booking(s)`);
    }
}
