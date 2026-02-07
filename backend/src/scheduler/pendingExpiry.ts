/**
 * Pending Booking Expiry Scheduler - Phase 3
 * Runs every 15 seconds to mark expired pending bookings
 */

import prisma from '../lib/prisma.js';
import { broadcast } from '../lib/websocket.js';

const EXPIRY_INTERVAL_MS = 15_000; // 15 seconds

/**
 * Process expired pending bookings
 */
async function processExpiredBookings(): Promise<void> {
    const now = new Date();

    try {
        // Find all expired pending bookings
        const expiredBookings = await prisma.booking.findMany({
            where: {
                status: 'PENDING_PAYMENT',
                pendingExpiresAt: {
                    lte: now,
                },
            },
            select: {
                id: true,
                courtId: true,
                date: true,
                startTime: true,
                endTime: true,
            },
        });

        if (expiredBookings.length === 0) {
            return;
        }

        console.log(`⏰ Found ${expiredBookings.length} expired pending booking(s)`);

        // Update each to EXPIRED and broadcast
        for (const booking of expiredBookings) {
            await prisma.booking.update({
                where: { id: booking.id },
                data: {
                    status: 'EXPIRED',
                    expiredAt: now,
                },
            });

            // Broadcast expiry event
            broadcast({
                type: 'booking.hold.expired',
                payload: {
                    bookingId: booking.id,
                    courtId: booking.courtId,
                    date: booking.date.toISOString().split('T')[0],
                    startTime: booking.startTime,
                    endTime: booking.endTime,
                },
            });

            console.log(`⏰ Expired booking ${booking.id}`);
        }
    } catch (error) {
        console.error('Error processing expired bookings:', error);
    }
}

/**
 * Start the expiry scheduler
 */
export function startExpiryScheduler(): NodeJS.Timeout {
    console.log('⏰ Starting pending expiry scheduler (15s interval)');

    // Run immediately once
    processExpiredBookings();

    // Then run every 15 seconds
    return setInterval(processExpiredBookings, EXPIRY_INTERVAL_MS);
}

/**
 * Stop the scheduler (for cleanup)
 */
export function stopExpiryScheduler(intervalId: NodeJS.Timeout): void {
    clearInterval(intervalId);
    console.log('⏰ Stopped pending expiry scheduler');
}
