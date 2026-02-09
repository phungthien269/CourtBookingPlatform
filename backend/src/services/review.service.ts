/**
 * Review Service - Phase 5
 * Handles venue reviews (rating + comment)
 */

import prisma from '../lib/prisma';

// ==================== Types ====================

export interface CreateReviewRequest {
    userId: string;
    bookingId: string;
    rating: number;
    comment?: string;
}

export interface CreateReviewResult {
    success: boolean;
    data?: {
        id: string;
        bookingId: string;
        venueId: string;
        rating: number;
        comment: string | null;
        createdAt: string;
    };
    error?: { code: string; message: string };
}

export interface VenueReviewsResult {
    success: boolean;
    data?: {
        averageRating: number;
        total: number;
        items: Array<{
            id: string;
            rating: number;
            comment: string | null;
            createdAt: string;
            userDisplayName: string; // masked
        }>;
    };
    error?: { code: string; message: string };
}

export interface ReviewEligibilityResult {
    success: boolean;
    data?: {
        eligible: boolean;
        bookingId?: string;
    };
    error?: { code: string; message: string };
}

// ==================== Helpers ====================

/**
 * Mask email for public display: "th***@gmail.com"
 */
function maskEmail(email: string): string {
    const [local, domain] = email.split('@');
    if (!domain) return '***';

    const visibleChars = Math.min(2, local.length);
    const masked = local.slice(0, visibleChars) + '***';
    return `${masked}@${domain}`;
}

// ==================== Service Functions ====================

/**
 * Create a review for a booking
 */
export async function createReview(request: CreateReviewRequest): Promise<CreateReviewResult> {
    const { userId, bookingId, rating, comment } = request;

    // Validate rating
    if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
        return {
            success: false,
            error: { code: 'INVALID_RATING', message: 'Rating phải là số nguyên từ 1-5' },
        };
    }

    // Validate comment length
    if (comment && comment.length > 300) {
        return {
            success: false,
            error: { code: 'COMMENT_TOO_LONG', message: 'Comment tối đa 300 ký tự' },
        };
    }

    // Get booking with venue info
    const booking = await prisma.booking.findUnique({
        where: { id: bookingId },
        include: {
            court: {
                include: { venue: true },
            },
            review: true,
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
            error: { code: 'FORBIDDEN', message: 'Bạn không có quyền review booking này' },
        };
    }

    // Check status - must be CONFIRMED (or COMPLETED if exists)
    if (booking.status !== 'CONFIRMED' && booking.status !== 'COMPLETED') {
        return {
            success: false,
            error: { code: 'INVALID_STATUS', message: 'Chỉ có thể review booking đã xác nhận' },
        };
    }

    // Check if already reviewed
    if (booking.review) {
        return {
            success: false,
            error: { code: 'ALREADY_REVIEWED', message: 'Booking này đã được review' },
        };
    }

    // Create review
    const venueId = booking.court.venue.id;

    const review = await prisma.review.create({
        data: {
            bookingId,
            userId,
            venueId,
            rating,
            comment: comment || null,
        },
    });

    return {
        success: true,
        data: {
            id: review.id,
            bookingId: review.bookingId,
            venueId: review.venueId,
            rating: review.rating,
            comment: review.comment,
            createdAt: review.createdAt.toISOString(),
        },
    };
}

/**
 * Get reviews for a venue (public)
 */
export async function getVenueReviews(
    venueId: string,
    page: number = 1,
    limit: number = 10
): Promise<VenueReviewsResult> {
    // Validate venue exists
    const venue = await prisma.venue.findUnique({
        where: { id: venueId },
    });

    if (!venue) {
        return {
            success: false,
            error: { code: 'VENUE_NOT_FOUND', message: 'Không tìm thấy sân' },
        };
    }

    // Get aggregate stats
    const stats = await prisma.review.aggregate({
        where: { venueId },
        _avg: { rating: true },
        _count: { id: true },
    });

    // Get paginated reviews
    const skip = (page - 1) * limit;
    const reviews = await prisma.review.findMany({
        where: { venueId },
        include: {
            user: {
                select: { email: true, name: true },
            },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
    });

    const items = reviews.map((r) => ({
        id: r.id,
        rating: r.rating,
        comment: r.comment,
        createdAt: r.createdAt.toISOString(),
        userDisplayName: r.user.name ? r.user.name.slice(0, 2) + '***' : maskEmail(r.user.email),
    }));

    return {
        success: true,
        data: {
            averageRating: stats._avg.rating || 0,
            total: stats._count.id,
            items,
        },
    };
}

/**
 * Check if user is eligible to review a venue
 */
export async function getReviewEligibility(
    userId: string,
    venueId: string
): Promise<ReviewEligibilityResult> {
    // Find user's confirmed bookings for this venue that haven't been reviewed
    const eligibleBooking = await prisma.booking.findFirst({
        where: {
            userId,
            court: { venueId },
            status: { in: ['CONFIRMED', 'COMPLETED'] },
            review: null, // No review yet
        },
        orderBy: { createdAt: 'desc' },
    });

    if (eligibleBooking) {
        return {
            success: true,
            data: {
                eligible: true,
                bookingId: eligibleBooking.id,
            },
        };
    }

    return {
        success: true,
        data: {
            eligible: false,
        },
    };
}
