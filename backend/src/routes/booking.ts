/**
 * Booking Routes - Phase 2 + Phase 3
 * Phase 2: POST /api/bookings/quote (NO booking creation)
 * Phase 3: POST /api/bookings/hold, GET /api/bookings/:id
 */

import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { authMiddleware, AuthRequest } from '../middleware/auth.js';
import { getBookingQuote, createBookingHold, getBookingById } from '../services/booking.service.js';

const router = Router();

// ==================== VALIDATION SCHEMAS ====================

const quoteRequestSchema = z.object({
    venueId: z.string().uuid('Invalid venue ID'),
    courtId: z.string().uuid('Invalid court ID'),
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD format'),
    startHour: z.number().int().min(0).max(23),
    durationHours: z.number().int().min(1).max(4),
});

const holdRequestSchema = z.object({
    venueId: z.string().uuid('Invalid venue ID'),
    courtId: z.string().uuid('Invalid court ID'),
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD format'),
    startHour: z.number().int().min(0).max(23),
    durationHours: z.number().int().min(1).max(4),
});

// ==================== ROUTES ====================

/**
 * POST /api/bookings/quote
 * Auth required - validates selection and returns price quote
 * NO booking creation in Phase 2
 */
router.post('/quote', authMiddleware, async (req: Request, res: Response) => {
    try {
        // Validate request body
        const parsed = quoteRequestSchema.safeParse(req.body);
        if (!parsed.success) {
            return res.status(400).json({
                success: false,
                error: {
                    code: 'INVALID_INPUT',
                    message: parsed.error.errors[0]?.message || 'Invalid request',
                },
            });
        }

        const result = await getBookingQuote(parsed.data);

        if (!result.valid) {
            return res.status(400).json({
                success: false,
                error: {
                    code: result.errorCode,
                    message: result.errorMessage,
                    details: result.blockedHours ? { blockedHours: result.blockedHours } : undefined,
                },
            });
        }

        return res.json({
            success: true,
            data: {
                valid: true,
                courtId: result.courtId,
                courtName: result.courtName,
                date: result.date,
                startTime: result.startTime,
                endTime: result.endTime,
                endDate: result.endDate,
                durationHours: result.durationHours,
                pricePerHour: result.pricePerHour,
                totalPrice: result.totalPrice,
            },
        });
    } catch (error) {
        console.error('Error getting booking quote:', error);
        return res.status(500).json({
            success: false,
            error: {
                code: 'INTERNAL_ERROR',
                message: 'Lỗi hệ thống',
            },
        });
    }
});

/**
 * POST /api/bookings/hold
 * Phase 3: Create a pending booking hold (5-minute countdown)
 * Auth required
 */
router.post('/hold', authMiddleware, async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.userId;
        if (!userId) {
            return res.status(401).json({
                success: false,
                error: { code: 'UNAUTHORIZED', message: 'Bạn cần đăng nhập' },
            });
        }

        // Validate request body
        const parsed = holdRequestSchema.safeParse(req.body);
        if (!parsed.success) {
            return res.status(400).json({
                success: false,
                error: {
                    code: 'INVALID_INPUT',
                    message: parsed.error.errors[0]?.message || 'Invalid request',
                },
            });
        }

        const result = await createBookingHold({
            userId,
            ...parsed.data,
        });

        if (!result.success) {
            // Map error codes to HTTP status
            const statusMap: Record<string, number> = {
                'USER_BOOKING_LIMIT': 429,
                'SLOT_UNAVAILABLE': 409,
            };
            const status = result.error ? (statusMap[result.error.code] || 400) : 400;

            return res.status(status).json({
                success: false,
                error: result.error,
            });
        }

        return res.status(201).json({
            success: true,
            data: result.data,
        });
    } catch (error) {
        console.error('Error creating booking hold:', error);
        return res.status(500).json({
            success: false,
            error: {
                code: 'INTERNAL_ERROR',
                message: 'Lỗi hệ thống',
            },
        });
    }
});

/**
 * GET /api/bookings/:id
 * Phase 3: Get booking details for owner user
 * Auth required
 */
router.get('/:id', authMiddleware, async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.userId;
        if (!userId) {
            return res.status(401).json({
                success: false,
                error: { code: 'UNAUTHORIZED', message: 'Bạn cần đăng nhập' },
            });
        }

        const bookingId = req.params.id;
        if (!bookingId) {
            return res.status(400).json({
                success: false,
                error: { code: 'INVALID_INPUT', message: 'Booking ID is required' },
            });
        }

        const booking = await getBookingById(bookingId, userId);

        if (!booking) {
            return res.status(404).json({
                success: false,
                error: { code: 'NOT_FOUND', message: 'Không tìm thấy booking' },
            });
        }

        return res.json({
            success: true,
            data: booking,
        });
    } catch (error) {
        console.error('Error getting booking:', error);
        return res.status(500).json({
            success: false,
            error: {
                code: 'INTERNAL_ERROR',
                message: 'Lỗi hệ thống',
            },
        });
    }
});

export default router;

