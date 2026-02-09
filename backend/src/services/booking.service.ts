/**
 * Booking Service - Phase 2 + Phase 3
 * Phase 2: Booking quote/validation
 * Phase 3: Pending hold creation with concurrency safety
 */

import { Prisma } from '@prisma/client';
import { randomUUID } from 'crypto';
import prisma from '../lib/prisma.js';
import { getCourtAvailability, validateCourt } from './court.service.js';
import { broadcast } from '../lib/websocket.js';
import { notifyManagerNewBooking } from './notification.service.js';

// ==================== TYPES ====================

interface QuoteRequest {
    venueId: string;
    courtId: string;
    date: string;        // YYYY-MM-DD
    startHour: number;   // 0-23
    durationHours: number; // 1-4
}

interface QuoteResult {
    valid: boolean;
    courtId?: string;
    courtName?: string;
    date?: string;
    startTime?: string;
    endTime?: string;
    endDate?: string;
    durationHours?: number;
    pricePerHour?: number;
    totalPrice?: number;
    errorCode?: string;
    errorMessage?: string;
    blockedHours?: number[];
}

interface HoldRequest {
    userId: string;
    venueId: string;
    courtId: string;
    date: string;        // YYYY-MM-DD
    startHour: number;   // 0-23
    durationHours: number; // 1-4
}

interface HoldResult {
    success: boolean;
    data?: {
        bookingId: string;
        holdId: string;
        status: string;
        pendingExpiresAt: string;
        date: string;
        startTime: string;
        endTime: string;
        durationHours: number;
        totalPrice: number;
    };
    error?: {
        code: string;
        message: string;
    };
}

interface BookingDetail {
    bookingId: string;
    status: string;
    pendingExpiresAt: string | null;
    date: string;
    startTime: string;
    endTime: string;
    durationHours: number;
    totalPrice: number;
    court: { id: string; name: string; pricePerHour: number };
    venue: { id: string; name: string; address: string };
}

// ==================== CONSTANTS ====================

const PENDING_HOLD_MINUTES = 5;
const MAX_USER_BOOKINGS = 5;
const RELEASE_DELAY_SECONDS = 30;

// ==================== HELPERS ====================

/**
 * Add days to a date string
 */
function addDays(dateStr: string, days: number): string {
    const date = new Date(dateStr + 'T00:00:00+07:00');
    date.setDate(date.getDate() + days);
    return date.toISOString().split('T')[0];
}

/**
 * Format hour to HH:mm string
 */
function formatHour(hour: number): string {
    return `${hour.toString().padStart(2, '0')}:00`;
}

/**
 * Check if two time ranges overlap
 * Range format: "HH:mm"
 */
function timeRangesOverlap(
    start1: string, end1: string,
    start2: string, end2: string
): boolean {
    return start1 < end2 && end1 > start2;
}

// ==================== SERVICES ====================

/**
 * Validate a booking selection and compute quote
 * NO booking creation - only validation and price calculation
 */
export async function getBookingQuote(request: QuoteRequest): Promise<QuoteResult> {
    const { venueId, courtId, date, startHour, durationHours } = request;

    // Validation 1: Check input ranges
    if (!Number.isInteger(startHour) || startHour < 0 || startHour > 23) {
        return {
            valid: false,
            errorCode: 'INVALID_INPUT',
            errorMessage: 'Giờ bắt đầu phải từ 0-23',
        };
    }

    if (!Number.isInteger(durationHours) || durationHours < 1 || durationHours > 4) {
        return {
            valid: false,
            errorCode: 'INVALID_INPUT',
            errorMessage: 'Thời lượng phải từ 1-4 giờ',
        };
    }

    // Validation 2: Check court exists and is active
    const courtValidation = await validateCourt(courtId, venueId);
    if (!courtValidation.valid || !courtValidation.court) {
        return {
            valid: false,
            errorCode: 'COURT_INACTIVE',
            errorMessage: courtValidation.error || 'Sân không khả dụng',
        };
    }

    const court = courtValidation.court;

    // Calculate end hour and handle cross-day
    let endHour = startHour + durationHours;
    let endDate = date;
    const isCrossDay = endHour > 24;

    if (endHour >= 24) {
        endHour = endHour - 24;
        endDate = addDays(date, 1);
    }

    // Determine which hours to check on each date
    const hoursToCheckDay1: number[] = [];
    const hoursToCheckDay2: number[] = [];

    if (isCrossDay) {
        // Day 1: startHour to 23
        for (let h = startHour; h < 24; h++) {
            hoursToCheckDay1.push(h);
        }
        // Day 2: 0 to endHour-1
        for (let h = 0; h < endHour; h++) {
            hoursToCheckDay2.push(h);
        }
    } else {
        // Same day: startHour to endHour-1
        for (let h = startHour; h < endHour; h++) {
            hoursToCheckDay1.push(h);
        }
    }

    // Get availability for day 1
    const availabilityDay1 = await getCourtAvailability(courtId, date);
    if (!availabilityDay1) {
        return {
            valid: false,
            errorCode: 'SLOT_UNAVAILABLE',
            errorMessage: 'Không thể tải thông tin sân',
        };
    }

    // Check all hours on day 1
    const blockedHours: number[] = [];
    for (const hour of hoursToCheckDay1) {
        const slot = availabilityDay1.slots.find(s => s.hour === hour);
        if (!slot || slot.status !== 'AVAILABLE') {
            blockedHours.push(hour);
        }
    }

    // Check day 2 if cross-day
    if (isCrossDay && hoursToCheckDay2.length > 0) {
        const availabilityDay2 = await getCourtAvailability(courtId, endDate);
        if (!availabilityDay2) {
            return {
                valid: false,
                errorCode: 'SLOT_UNAVAILABLE',
                errorMessage: 'Không thể tải thông tin sân cho ngày tiếp theo',
            };
        }

        for (const hour of hoursToCheckDay2) {
            const slot = availabilityDay2.slots.find(s => s.hour === hour);
            if (!slot || slot.status !== 'AVAILABLE') {
                blockedHours.push(hour + 24); // Indicate it's next day
            }
        }
    }

    // If any blocked hours, return error
    if (blockedHours.length > 0) {
        // Determine error type based on slot status
        const firstBlockedSlot = availabilityDay1.slots.find(s => blockedHours.includes(s.hour));
        let errorCode = 'SLOT_UNAVAILABLE';
        let errorMessage = 'Một số giờ không khả dụng';

        if (firstBlockedSlot) {
            switch (firstBlockedSlot.status) {
                case 'BOOKED':
                    errorCode = 'SLOT_UNAVAILABLE';
                    errorMessage = 'Khung giờ đã được đặt';
                    break;
                case 'HOLDING':
                    errorCode = 'SLOT_UNAVAILABLE';
                    errorMessage = 'Khung giờ đang được giữ chỗ';
                    break;
                case 'LOCKED':
                    errorCode = 'SLOT_UNAVAILABLE';
                    errorMessage = 'Khung giờ bị khóa bởi chủ sân';
                    break;
                case 'CLOSED':
                    errorCode = 'OUTSIDE_HOURS';
                    errorMessage = 'Khung giờ ngoài giờ hoạt động';
                    break;
                case 'HOLIDAY':
                    errorCode = 'HOLIDAY';
                    errorMessage = 'Ngày nghỉ lễ';
                    break;
            }
        }

        return {
            valid: false,
            errorCode,
            errorMessage,
            blockedHours,
        };
    }

    // All checks passed - compute price
    const totalPrice = court.pricePerHour * durationHours;

    return {
        valid: true,
        courtId: court.id,
        courtName: court.name,
        date,
        startTime: formatHour(startHour),
        endTime: formatHour(endHour),
        endDate,
        durationHours,
        pricePerHour: court.pricePerHour,
        totalPrice,
    };
}

/**
 * Create a booking hold with SERIALIZABLE transaction
 * Phase 3: Implements pending payment with 5-min countdown
 */
export async function createBookingHold(request: HoldRequest): Promise<HoldResult> {
    const { userId, venueId, courtId, date, startHour, durationHours } = request;

    // Pre-validation (outside transaction for quick fail)
    if (!Number.isInteger(startHour) || startHour < 0 || startHour > 23) {
        return {
            success: false,
            error: { code: 'INVALID_INPUT', message: 'Giờ bắt đầu phải từ 0-23' },
        };
    }

    if (!Number.isInteger(durationHours) || durationHours < 1 || durationHours > 4) {
        return {
            success: false,
            error: { code: 'INVALID_DURATION', message: 'Thời lượng phải từ 1-4 giờ' },
        };
    }

    // Calculate times
    let endHour = startHour + durationHours;
    if (endHour >= 24) endHour = endHour - 24;
    const startTime = formatHour(startHour);
    const endTime = formatHour(endHour);
    const bookingDate = new Date(date + 'T00:00:00+07:00');

    // Validate court exists
    const courtValidation = await validateCourt(courtId, venueId);
    if (!courtValidation.valid || !courtValidation.court) {
        return {
            success: false,
            error: { code: 'COURT_INACTIVE', message: courtValidation.error || 'Sân không khả dụng' },
        };
    }

    const court = courtValidation.court;
    const totalPrice = court.pricePerHour * durationHours;

    try {
        // Use SERIALIZABLE transaction for race safety
        const result = await prisma.$transaction(async (tx) => {
            const now = new Date();
            const pendingExpiresAt = new Date(now.getTime() + PENDING_HOLD_MINUTES * 60 * 1000);
            const releaseThreshold = new Date(now.getTime() - RELEASE_DELAY_SECONDS * 1000);

            // 1. IDEMPOTENCY CHECK: Return existing active hold for same user+slot
            const existingHold = await tx.booking.findFirst({
                where: {
                    userId,
                    courtId,
                    date: bookingDate,
                    startTime,
                    endTime,
                    status: 'PENDING_PAYMENT',
                    pendingExpiresAt: { gt: now },
                },
            });

            if (existingHold) {
                return {
                    isExisting: true,
                    booking: existingHold,
                };
            }

            // 2. USER LIMIT CHECK: Max 5 active bookings
            const userBookingCount = await tx.booking.count({
                where: {
                    userId,
                    status: { in: ['PENDING_PAYMENT', 'WAITING_MANAGER_CONFIRM', 'CONFIRMED'] },
                },
            });

            if (userBookingCount >= MAX_USER_BOOKINGS) {
                throw new Error('USER_BOOKING_LIMIT');
            }

            // 3. SLOT AVAILABILITY CHECK: Find any conflicting bookings
            // Query all bookings for this court+date that might conflict
            const conflictingBookings = await tx.booking.findMany({
                where: {
                    courtId,
                    date: bookingDate,
                    OR: [
                        { status: 'CONFIRMED' },
                        {
                            status: 'PENDING_PAYMENT',
                            pendingExpiresAt: { gt: now },
                        },
                        {
                            status: 'EXPIRED',
                            expiredAt: { gt: releaseThreshold },
                        },
                    ],
                },
                select: { startTime: true, endTime: true, status: true },
            });

            // Check for time overlap
            for (const booking of conflictingBookings) {
                if (timeRangesOverlap(startTime, endTime, booking.startTime, booking.endTime)) {
                    throw new Error('SLOT_UNAVAILABLE');
                }
            }

            // 4. VALIDATION: Run quote validations (schedule, holiday, blackout)
            const quote = await getBookingQuote({ venueId, courtId, date, startHour, durationHours });
            if (!quote.valid) {
                throw new Error(quote.errorCode || 'SLOT_UNAVAILABLE');
            }

            // 5. CREATE BOOKING
            const holdId = randomUUID();
            const newBooking = await tx.booking.create({
                data: {
                    courtId,
                    userId,
                    date: bookingDate,
                    startTime,
                    endTime,
                    durationHours,
                    totalPrice,
                    status: 'PENDING_PAYMENT',
                    pendingExpiresAt,
                    holdId,
                },
            });

            return {
                isExisting: false,
                booking: newBooking,
            };
        }, {
            isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
            maxWait: 5000,
            timeout: 10000,
        });

        // Broadcast WS event for new holds
        if (!result.isExisting) {
            broadcast({
                type: 'booking.hold.created',
                payload: {
                    bookingId: result.booking.id,
                    courtId: result.booking.courtId,
                    date,
                    startTime: result.booking.startTime,
                    endTime: result.booking.endTime,
                    pendingExpiresAt: result.booking.pendingExpiresAt?.toISOString(),
                },
            });
        }

        return {
            success: true,
            data: {
                bookingId: result.booking.id,
                holdId: result.booking.holdId!,
                status: result.booking.status,
                pendingExpiresAt: result.booking.pendingExpiresAt!.toISOString(),
                date,
                startTime: result.booking.startTime,
                endTime: result.booking.endTime,
                durationHours: result.booking.durationHours,
                totalPrice: result.booking.totalPrice,
            },
        };
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';

        // Map error messages to user-friendly responses
        const errorMap: Record<string, { code: string; message: string }> = {
            'USER_BOOKING_LIMIT': { code: 'USER_BOOKING_LIMIT', message: 'Bạn đã đạt giới hạn 5 booking.' },
            'SLOT_UNAVAILABLE': { code: 'SLOT_UNAVAILABLE', message: 'Khung giờ đang được giữ chỗ.' },
            'OUTSIDE_HOURS': { code: 'OUTSIDE_HOURS', message: 'Khung giờ ngoài giờ hoạt động.' },
            'HOLIDAY': { code: 'HOLIDAY', message: 'Ngày nghỉ lễ.' },
            'COURT_INACTIVE': { code: 'COURT_INACTIVE', message: 'Sân không khả dụng.' },
        };

        const mappedError = errorMap[message] || { code: 'SLOT_UNAVAILABLE', message: 'Không thể giữ chỗ. Vui lòng thử lại.' };

        return {
            success: false,
            error: mappedError,
        };
    }
}

/**
 * Get booking by ID (for owner user only)
 * Phase 3: Used for payment page countdown
 */
export async function getBookingById(bookingId: string, userId: string): Promise<BookingDetail | null> {
    const booking = await prisma.booking.findFirst({
        where: {
            id: bookingId,
            userId, // Owner check
        },
        include: {
            court: {
                select: {
                    id: true,
                    name: true,
                    pricePerHour: true,
                    venue: {
                        select: {
                            id: true,
                            name: true,
                            address: true,
                            // contactPhone: NEVER SELECT
                        },
                    },
                },
            },
        },
    });

    if (!booking) return null;

    return {
        bookingId: booking.id,
        status: booking.status,
        pendingExpiresAt: booking.pendingExpiresAt?.toISOString() || null,
        date: booking.date.toISOString().split('T')[0],
        startTime: booking.startTime,
        endTime: booking.endTime,
        durationHours: booking.durationHours,
        totalPrice: booking.totalPrice,
        court: {
            id: booking.court.id,
            name: booking.court.name,
            pricePerHour: booking.court.pricePerHour,
        },
        venue: {
            id: booking.court.venue.id,
            name: booking.court.venue.name,
            address: booking.court.venue.address,
        },
    };
}

// ==================== PHASE 4: PAYMENT METHOD + MANAGER CONFIRMATION ====================

interface PaymentMethodRequest {
    bookingId: string;
    userId: string;
    paymentMethod: 'CASH' | 'TRANSFER';
}

interface PaymentMethodResult {
    success: boolean;
    data?: {
        bookingId: string;
        status: string;
        paymentMethod: string;
        waitingConfirmSince: string;
    };
    error?: {
        code: string;
        message: string;
    };
}

/**
 * Choose payment method and transition to WAITING_MANAGER_CONFIRM
 * Phase 4: PENDING_PAYMENT -> WAITING_MANAGER_CONFIRM
 */
export async function choosePaymentMethod(request: PaymentMethodRequest): Promise<PaymentMethodResult> {
    const { bookingId, userId, paymentMethod } = request;

    const booking = await prisma.booking.findFirst({
        where: {
            id: bookingId,
            userId, // Owner check
        },
        include: {
            court: {
                select: {
                    id: true,
                    venueId: true,
                },
            },
        },
    });

    if (!booking) {
        return {
            success: false,
            error: { code: 'NOT_FOUND', message: 'Không tìm thấy đơn đặt sân' },
        };
    }

    if (booking.status !== 'PENDING_PAYMENT') {
        return {
            success: false,
            error: { code: 'INVALID_STATUS', message: 'Đơn đặt sân không ở trạng thái chờ thanh toán' },
        };
    }

    // Check if pending hold expired
    if (booking.pendingExpiresAt && booking.pendingExpiresAt < new Date()) {
        return {
            success: false,
            error: { code: 'EXPIRED', message: 'Đơn đặt sân đã hết hạn giữ chỗ' },
        };
    }

    const now = new Date();
    const updated = await prisma.booking.update({
        where: { id: bookingId },
        data: {
            paymentMethod: paymentMethod,
            status: 'WAITING_MANAGER_CONFIRM',
            waitingConfirmSince: now,
            pendingExpiresAt: null, // No longer relevant
        },
    });

    // Broadcast to manager
    broadcast({
        type: 'booking.waiting_manager_confirm',
        payload: {
            bookingId: updated.id,
            courtId: booking.court.id,
            venueId: booking.court.venueId,
            date: booking.date.toISOString().split('T')[0],
            startTime: booking.startTime,
            endTime: booking.endTime,
            paymentMethod: paymentMethod,
        },
    });

    // Phase 6: Notify manager about new booking
    const manager = await prisma.manager.findFirst({
        where: { venue: { id: booking.court.venueId } },
        select: { userId: true },
    });
    if (manager) {
        const venue = await prisma.venue.findUnique({
            where: { id: booking.court.venueId },
            select: { name: true },
        });
        await notifyManagerNewBooking(
            bookingId,
            manager.userId,
            booking.court.venueId,
            venue?.name || 'Sân'
        );
    }

    return {
        success: true,
        data: {
            bookingId: updated.id,
            status: updated.status,
            paymentMethod: updated.paymentMethod || '',
            waitingConfirmSince: now.toISOString(),
        },
    };
}

/**
 * Declare transfer payment (user ticks "I have transferred")
 * Phase 4: Sets paymentDeclaredAt, notifies manager
 */
export async function declareTransfer(bookingId: string, userId: string): Promise<PaymentMethodResult> {
    const booking = await prisma.booking.findFirst({
        where: {
            id: bookingId,
            userId, // Owner check
        },
        include: {
            court: {
                select: {
                    venueId: true,
                },
            },
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

    if (booking.paymentMethod !== 'TRANSFER') {
        return {
            success: false,
            error: { code: 'INVALID_PAYMENT_METHOD', message: 'Phương thức thanh toán không phải chuyển khoản' },
        };
    }

    const now = new Date();
    const updated = await prisma.booking.update({
        where: { id: bookingId },
        data: {
            paymentDeclaredAt: now,
        },
    });

    // Broadcast to manager
    broadcast({
        type: 'booking.transfer.declared',
        payload: {
            bookingId: updated.id,
            venueId: booking.court.venueId,
            paymentDeclaredAt: now.toISOString(),
        },
    });

    return {
        success: true,
        data: {
            bookingId: updated.id,
            status: updated.status,
            paymentMethod: updated.paymentMethod || '',
            waitingConfirmSince: updated.waitingConfirmSince?.toISOString() || '',
        },
    };
}

// ==================== PHASE 4: EXTENDED BOOKING DETAIL ====================

interface BookingDetailExtended {
    bookingId: string;
    status: string;
    paymentMethod: string | null;
    pendingExpiresAt: string | null;
    waitingConfirmSince: string | null;
    paymentDeclaredAt: string | null;
    confirmedAt: string | null;
    managerCancelReason: string | null;
    date: string;
    startTime: string;
    endTime: string;
    durationHours: number;
    totalPrice: number;
    court: { id: string; name: string; pricePerHour: number };
    venue: {
        id: string;
        name: string;
        address: string;
        contactPhone: string | null; // Only if CONFIRMED
        bankName: string | null;
        bankAccountNumber: string | null;
        bankAccountName: string | null;
    };
    user?: { id: string; name: string | null; email: string };
}

/**
 * Get booking by ID with extended Phase 4 fields
 * contactPhone is only returned when booking is CONFIRMED
 * Accessible by: owner user, manager of venue, admin
 */
export async function getBookingByIdExtended(
    bookingId: string,
    requesterId: string,
    requesterRole: string
): Promise<BookingDetailExtended | null> {
    const booking = await prisma.booking.findUnique({
        where: { id: bookingId },
        include: {
            court: {
                select: {
                    id: true,
                    name: true,
                    pricePerHour: true,
                    venue: {
                        select: {
                            id: true,
                            name: true,
                            address: true,
                            contactPhone: true,
                            bankName: true,
                            bankAccountNumber: true,
                            bankAccountName: true,
                            managerId: true,
                        },
                    },
                },
            },
            user: {
                select: {
                    id: true,
                    name: true,
                    email: true,
                },
            },
        },
    });

    if (!booking) return null;

    // Access control
    const isOwner = booking.userId === requesterId;
    const isManager = requesterRole === 'MANAGER';
    const isAdmin = requesterRole === 'ADMIN';

    // Check manager ownership via venue
    if (isManager && !isAdmin && !isOwner) {
        const manager = await prisma.manager.findFirst({
            where: { userId: requesterId },
        });
        if (!manager || booking.court.venue.managerId !== manager.id) {
            return null; // Not authorized
        }
    }

    if (!isOwner && !isManager && !isAdmin) {
        return null; // Not authorized
    }

    // Privacy rule: contactPhone only when CONFIRMED and requester is owner/manager/admin
    const showContactPhone = booking.status === 'CONFIRMED' && (isOwner || isManager || isAdmin);

    return {
        bookingId: booking.id,
        status: booking.status,
        paymentMethod: booking.paymentMethod,
        pendingExpiresAt: booking.pendingExpiresAt?.toISOString() || null,
        waitingConfirmSince: booking.waitingConfirmSince?.toISOString() || null,
        paymentDeclaredAt: booking.paymentDeclaredAt?.toISOString() || null,
        confirmedAt: booking.confirmedAt?.toISOString() || null,
        managerCancelReason: booking.managerCancelReason,
        date: booking.date.toISOString().split('T')[0],
        startTime: booking.startTime,
        endTime: booking.endTime,
        durationHours: booking.durationHours,
        totalPrice: booking.totalPrice,
        court: {
            id: booking.court.id,
            name: booking.court.name,
            pricePerHour: booking.court.pricePerHour,
        },
        venue: {
            id: booking.court.venue.id,
            name: booking.court.venue.name,
            address: booking.court.venue.address,
            contactPhone: showContactPhone ? booking.court.venue.contactPhone : null,
            bankName: booking.court.venue.bankName,
            bankAccountNumber: booking.court.venue.bankAccountNumber,
            bankAccountName: booking.court.venue.bankAccountName,
        },
        user: isManager || isAdmin ? {
            id: booking.user.id,
            name: booking.user.name,
            email: booking.user.email,
        } : undefined,
    };
}
