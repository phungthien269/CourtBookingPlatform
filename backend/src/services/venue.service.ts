/**
 * Venue Service - Business logic for venue discovery
 * PRIVACY: contactPhone is NEVER selected/returned (per BRD NFR-04)
 */

import { PrismaClient } from '@prisma/client';
import {
    VenueCardDTO,
    VenueDetailDTO,
    VenueFilters,
    SportTypeDTO,
    VenueScheduleDTO,
} from '../types/venue.types.js';

const prisma = new PrismaClient();

// Day names for schedule summary
const DAY_NAMES = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];

/**
 * Generate opening hours summary from schedules
 * e.g., "T2–T6 6:00–11:00, 14:00–22:00; T7–CN 6:00–22:00"
 */
function generateOpeningHoursSummary(schedules: { dayOfWeek: number; openTime: string; closeTime: string }[]): string {
    if (schedules.length === 0) return 'Liên hệ để biết giờ mở cửa';

    // Group schedules by their time pattern
    const scheduleMap = new Map<string, number[]>();

    for (const s of schedules) {
        const key = `${s.openTime}–${s.closeTime}`;
        if (!scheduleMap.has(key)) {
            scheduleMap.set(key, []);
        }
        scheduleMap.get(key)!.push(s.dayOfWeek);
    }

    // Build summary
    const parts: string[] = [];

    for (const [timeRange, days] of scheduleMap) {
        days.sort((a, b) => (a === 0 ? 7 : a) - (b === 0 ? 7 : b));

        if (days.length === 7) {
            parts.push(`Hàng ngày ${timeRange}`);
        } else if (days.length >= 2) {
            const first = DAY_NAMES[days[0]];
            const last = DAY_NAMES[days[days.length - 1]];
            parts.push(`${first}–${last} ${timeRange}`);
        } else {
            parts.push(`${DAY_NAMES[days[0]]} ${timeRange}`);
        }
    }

    return parts.join('; ');
}

/**
 * Get venues with filters for discovery map/list
 */
export async function getVenues(filters: VenueFilters): Promise<VenueCardDTO[]> {
    const { sportTypes, district, q } = filters;

    // Build where clause
    const where: any = {
        status: 'ACTIVE',
    };

    // Sport type filter (venue must have at least one matching sport)
    if (sportTypes && sportTypes.length > 0) {
        where.sportTypes = {
            some: {
                sportType: {
                    code: { in: sportTypes },
                },
            },
        };
    }

    // District filter (exact match)
    if (district) {
        where.district = district;
    }

    // Search query (name or address)
    if (q) {
        where.OR = [
            { name: { contains: q, mode: 'insensitive' } },
            { address: { contains: q, mode: 'insensitive' } },
        ];
    }

    const venues = await prisma.venue.findMany({
        where,
        select: {
            id: true,
            name: true,
            address: true,
            district: true,
            city: true,
            lat: true,
            lng: true,
            // contactPhone: EXCLUDED for privacy
            images: {
                where: { isCover: true },
                select: { url: true },
                take: 1,
            },
            sportTypes: {
                select: {
                    sportType: {
                        select: { code: true, name: true },
                    },
                },
            },
            courts: {
                where: { isActive: true },
                select: { pricePerHour: true },
            },
            schedules: {
                select: { dayOfWeek: true, openTime: true, closeTime: true },
            },
        },
        orderBy: { name: 'asc' },
    });

    return venues.map((venue) => {
        const prices = venue.courts.map((c) => c.pricePerHour);
        const sportTypeList: SportTypeDTO[] = venue.sportTypes.map((vst) => ({
            code: vst.sportType.code,
            name: vst.sportType.name,
        }));

        return {
            id: venue.id,
            name: venue.name,
            address: venue.address,
            district: venue.district,
            city: venue.city,
            lat: venue.lat,
            lng: venue.lng,
            coverImageUrl: venue.images[0]?.url || null,
            sportTypes: sportTypeList,
            minPricePerHour: prices.length > 0 ? Math.min(...prices) : 0,
            maxPricePerHour: prices.length > 0 ? Math.max(...prices) : 0,
            openingHoursSummary: generateOpeningHoursSummary(venue.schedules),
        };
    });
}

/**
 * Get venue detail by ID
 */
export async function getVenueById(id: string): Promise<VenueDetailDTO | null> {
    const venue = await prisma.venue.findFirst({
        where: {
            id,
            status: 'ACTIVE',
        },
        select: {
            id: true,
            name: true,
            address: true,
            district: true,
            city: true,
            lat: true,
            lng: true,
            description: true,
            // contactPhone: EXCLUDED for privacy
            images: {
                select: { id: true, url: true, isCover: true },
                orderBy: [{ isCover: 'desc' }, { createdAt: 'asc' }],
            },
            sportTypes: {
                select: {
                    sportType: {
                        select: { code: true, name: true },
                    },
                },
            },
            schedules: {
                select: { dayOfWeek: true, openTime: true, closeTime: true },
                orderBy: { dayOfWeek: 'asc' },
            },
            holidays: {
                where: { date: { gte: new Date() } },
                select: { date: true, note: true },
                orderBy: { date: 'asc' },
                take: 10,
            },
            courts: {
                where: { isActive: true },
                select: { pricePerHour: true },
            },
        },
    });

    if (!venue) return null;

    const prices = venue.courts.map((c) => c.pricePerHour);

    // TODO: Calculate actual rating from reviews in Phase 7
    const avgRating = 0;
    const reviewCount = 0;

    return {
        id: venue.id,
        name: venue.name,
        address: venue.address,
        district: venue.district,
        city: venue.city,
        lat: venue.lat,
        lng: venue.lng,
        description: venue.description,
        images: venue.images.map((img) => ({
            id: img.id,
            url: img.url,
            isCover: img.isCover,
        })),
        sportTypes: venue.sportTypes.map((vst) => ({
            code: vst.sportType.code,
            name: vst.sportType.name,
        })),
        schedules: venue.schedules.map((s) => ({
            dayOfWeek: s.dayOfWeek,
            openTime: s.openTime,
            closeTime: s.closeTime,
        })),
        holidays: venue.holidays.map((h) => ({
            date: h.date.toISOString().split('T')[0],
            note: h.note,
        })),
        minPricePerHour: prices.length > 0 ? Math.min(...prices) : 0,
        maxPricePerHour: prices.length > 0 ? Math.max(...prices) : 0,
        avgRating,
        reviewCount,
    };
}

/**
 * Get distinct districts from active venues
 */
export async function getDistricts(): Promise<string[]> {
    const result = await prisma.venue.findMany({
        where: { status: 'ACTIVE' },
        select: { district: true },
        distinct: ['district'],
        orderBy: { district: 'asc' },
    });

    return result.map((r) => r.district);
}

/**
 * Get all sport types
 */
export async function getSportTypes(): Promise<SportTypeDTO[]> {
    const sportTypes = await prisma.sportType.findMany({
        select: { code: true, name: true },
        orderBy: { name: 'asc' },
    });

    return sportTypes;
}
