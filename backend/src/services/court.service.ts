/**
 * Court Service - Phase 2 + Phase 3
 * Phase 2: Court listing and availability logic
 * Phase 3: HOLDING status for pending bookings + 30s release delay
 */

import prisma from '../lib/prisma.js';

// ==================== CONSTANTS ====================

const RELEASE_DELAY_SECONDS = 30;

// ==================== TYPES ====================

interface CourtDTO {
    id: string;
    name: string;
    sportType: { code: string; name: string };
    pricePerHour: number;
    isActive: boolean;
}

interface SlotDTO {
    hour: number;
    status: 'AVAILABLE' | 'BOOKED' | 'LOCKED' | 'CLOSED' | 'HOLIDAY' | 'HOLDING';
    reason?: string;
}

interface AvailabilityDTO {
    courtId: string;
    date: string;
    pricePerHour: number;
    slots: SlotDTO[];
}

// ==================== HELPERS ====================

/**
 * Format hour to HH:mm string
 */
function formatHour(hour: number): string {
    return `${hour.toString().padStart(2, '0')}:00`;
}

/**
 * Check if a slot overlaps with any booking/blackout
 * Overlap rule: [slotStart, slotEnd) overlaps [s, e) if slotStart < e AND slotEnd > s
 */
function overlapsRanges(slotStart: string, slotEnd: string, ranges: { startTime: string; endTime: string }[]): boolean {
    return ranges.some(r => slotStart < r.endTime && slotEnd > r.startTime);
}

/**
 * Check if an hour is within venue schedule for a given day
 * Supports multi-shift schedules
 */
function isWithinSchedule(
    hour: number,
    dayOfWeek: number,
    schedules: { dayOfWeek: number; openTime: string; closeTime: string }[]
): boolean {
    const daySchedules = schedules.filter(s => s.dayOfWeek === dayOfWeek);
    if (daySchedules.length === 0) return false;

    const slotStart = formatHour(hour);
    const slotEnd = formatHour(hour + 1);

    return daySchedules.some(s => {
        // Slot must be fully within this shift
        return slotStart >= s.openTime && slotEnd <= s.closeTime;
    });
}

/**
 * Check if a date is a holiday for venue
 */
function isHoliday(dateInput: Date, holidays: { date: Date; note: string | null }[]): boolean {
    const inputDateStr = dateInput.toISOString().split('T')[0];
    return holidays.some(h => {
        const holidayStr = new Date(h.date).toISOString().split('T')[0];
        return holidayStr === inputDateStr;
    });
}

// ==================== SERVICES ====================

/**
 * Get all courts for a venue
 * PUBLIC endpoint - no auth required
 */
export async function getCourtsForVenue(venueId: string): Promise<CourtDTO[]> {
    const courts = await prisma.court.findMany({
        where: { venueId },
        select: {
            id: true,
            name: true,
            pricePerHour: true,
            isActive: true,
            sportType: {
                select: { code: true, name: true },
            },
        },
        orderBy: { name: 'asc' },
    });

    return courts;
}

/**
 * Get availability slots for a court on a specific date
 * PUBLIC endpoint - no auth required
 * Phase 3: Includes HOLDING status for pending bookings and 30s release delay
 */
export async function getCourtAvailability(courtId: string, dateStr: string): Promise<AvailabilityDTO | null> {
    // Parse date as VN local date
    const dateInput = new Date(dateStr + 'T00:00:00+07:00');
    const dayOfWeek = dateInput.getDay(); // 0 = Sunday
    const now = new Date();
    const releaseThreshold = new Date(now.getTime() - RELEASE_DELAY_SECONDS * 1000);

    // Step 1: Load court with venue schedules and holidays
    // NOTE: contactPhone is NEVER selected
    const court = await prisma.court.findUnique({
        where: { id: courtId },
        select: {
            id: true,
            venueId: true,
            pricePerHour: true,
            isActive: true,
            venue: {
                select: {
                    id: true,
                    // contactPhone: NEVER SELECT
                    schedules: { select: { dayOfWeek: true, openTime: true, closeTime: true } },
                    holidays: { select: { date: true, note: true } },
                },
            },
        },
    });

    if (!court) return null;

    // Step 2: Load CONFIRMED and WAITING_MANAGER_CONFIRM bookings (both block slots)
    const confirmedBookings = await prisma.booking.findMany({
        where: {
            courtId,
            date: new Date(dateStr),
            status: { in: ['CONFIRMED', 'WAITING_MANAGER_CONFIRM'] },
        },
        select: { startTime: true, endTime: true },
    });

    // Step 3: Load PENDING_PAYMENT bookings (active holds)
    const pendingBookings = await prisma.booking.findMany({
        where: {
            courtId,
            date: new Date(dateStr),
            status: 'PENDING_PAYMENT',
            pendingExpiresAt: { gt: now },
        },
        select: { startTime: true, endTime: true },
    });

    // Step 4: Load recently EXPIRED bookings (30s release delay)
    const expiredBookings = await prisma.booking.findMany({
        where: {
            courtId,
            date: new Date(dateStr),
            status: 'EXPIRED',
            expiredAt: { gt: releaseThreshold },
        },
        select: { startTime: true, endTime: true },
    });

    // Step 5: Load blackouts for this court+date
    const blackouts = await prisma.courtBlackout.findMany({
        where: {
            courtId,
            date: new Date(dateStr),
        },
        select: { startTime: true, endTime: true, reason: true },
    });

    // Step 6: Generate 24 hourly slots with precedence
    // HOLIDAY > CLOSED > LOCKED > BOOKED > HOLDING > AVAILABLE
    const slots: SlotDTO[] = [];
    const venueHoliday = isHoliday(dateInput, court.venue.holidays);

    for (let hour = 0; hour < 24; hour++) {
        const slotStart = formatHour(hour);
        const slotEnd = formatHour(hour + 1);

        let status: SlotDTO['status'] = 'AVAILABLE';
        let reason: string | undefined;

        // 1. Check HOLIDAY first (full day)
        if (venueHoliday) {
            status = 'HOLIDAY';
            reason = 'Ngày nghỉ lễ';
        }
        // 2. Check CLOSED (outside venue schedule for this dayOfWeek)
        else if (!isWithinSchedule(hour, dayOfWeek, court.venue.schedules)) {
            status = 'CLOSED';
            reason = 'Ngoài giờ hoạt động';
        }
        // 3. Check LOCKED (overlaps blackout)
        else if (overlapsRanges(slotStart, slotEnd, blackouts)) {
            status = 'LOCKED';
            reason = 'Chủ sân khóa';
        }
        // 4. Check BOOKED (overlaps confirmed or waiting_manager_confirm booking)
        else if (overlapsRanges(slotStart, slotEnd, confirmedBookings)) {
            status = 'BOOKED';
            reason = 'Đã được đặt';
        }
        // 5. Check HOLDING (overlaps active pending or recently expired booking)
        else if (overlapsRanges(slotStart, slotEnd, pendingBookings) || overlapsRanges(slotStart, slotEnd, expiredBookings)) {
            status = 'HOLDING';
            reason = 'Đang giữ chỗ';
        }
        // 6. Else AVAILABLE

        slots.push({ hour, status, reason });
    }

    return {
        courtId: court.id,
        date: dateStr,
        pricePerHour: court.pricePerHour,
        slots,
    };
}

/**
 * Check if a court exists and is active
 */
export async function validateCourt(courtId: string, venueId: string): Promise<{
    valid: boolean;
    court?: { id: string; name: string; pricePerHour: number; venueId: string };
    error?: string;
}> {
    const court = await prisma.court.findUnique({
        where: { id: courtId },
        select: {
            id: true,
            name: true,
            venueId: true,
            pricePerHour: true,
            isActive: true,
        },
    });

    if (!court) {
        return { valid: false, error: 'Court not found' };
    }

    if (court.venueId !== venueId) {
        return { valid: false, error: 'Court does not belong to this venue' };
    }

    if (!court.isActive) {
        return { valid: false, error: 'Court is not active' };
    }

    return { valid: true, court };
}
