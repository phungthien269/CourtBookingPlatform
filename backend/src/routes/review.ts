/**
 * Review Routes - Phase 5
 */

import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import {
    createReview,
    getVenueReviews,
    getReviewEligibility,
} from '../services/review.service';

const router = Router();

// ==================== Schemas ====================

const createReviewSchema = z.object({
    bookingId: z.string().uuid(),
    rating: z.number().int().min(1).max(5),
    comment: z.string().max(300).optional(),
});

const getVenueReviewsSchema = z.object({
    page: z.coerce.number().int().positive().default(1),
    limit: z.coerce.number().int().positive().max(50).default(10),
});

// ==================== Routes ====================

/**
 * POST /api/reviews
 * Create a review for a booking
 */
router.post('/', authMiddleware, async (req: AuthRequest, res: Response) => {
    try {
        const parsed = createReviewSchema.safeParse(req.body);
        if (!parsed.success) {
            return res.status(400).json({
                success: false,
                error: { code: 'VALIDATION_ERROR', message: parsed.error.message },
            });
        }

        const result = await createReview({
            userId: req.userId!,
            bookingId: parsed.data.bookingId,
            rating: parsed.data.rating,
            comment: parsed.data.comment,
        });

        if (!result.success) {
            const statusCode =
                result.error?.code === 'FORBIDDEN' ? 403 :
                    result.error?.code === 'BOOKING_NOT_FOUND' ? 404 : 400;
            return res.status(statusCode).json(result);
        }

        return res.status(201).json(result);
    } catch (error) {
        console.error('Create review error:', error);
        return res.status(500).json({
            success: false,
            error: { code: 'SERVER_ERROR', message: 'Lỗi server' },
        });
    }
});

/**
 * GET /api/venues/:id/reviews
 * Get reviews for a venue (public)
 */
router.get('/venues/:id/reviews', async (req: Request, res: Response) => {
    try {
        const venueId = req.params.id;
        const parsed = getVenueReviewsSchema.safeParse(req.query);

        if (!parsed.success) {
            return res.status(400).json({
                success: false,
                error: { code: 'VALIDATION_ERROR', message: parsed.error.message },
            });
        }

        const result = await getVenueReviews(venueId, parsed.data.page, parsed.data.limit);

        if (!result.success) {
            return res.status(404).json(result);
        }

        return res.json(result);
    } catch (error) {
        console.error('Get venue reviews error:', error);
        return res.status(500).json({
            success: false,
            error: { code: 'SERVER_ERROR', message: 'Lỗi server' },
        });
    }
});

/**
 * GET /api/me/review-eligibility
 * Check if user can review a venue
 */
router.get('/me/review-eligibility', authMiddleware, async (req: AuthRequest, res: Response) => {
    try {
        const venueId = req.query.venueId as string;

        if (!venueId) {
            return res.status(400).json({
                success: false,
                error: { code: 'MISSING_VENUE_ID', message: 'venueId is required' },
            });
        }

        const result = await getReviewEligibility(req.userId!, venueId);
        return res.json(result);
    } catch (error) {
        console.error('Get review eligibility error:', error);
        return res.status(500).json({
            success: false,
            error: { code: 'SERVER_ERROR', message: 'Lỗi server' },
        });
    }
});

export default router;
