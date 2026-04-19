/**
 * Booking Routes - Phase 2 + Phase 3 + Phase 4
 * Phase 2: POST /api/bookings/quote (NO booking creation)
 * Phase 3: POST /api/bookings/hold, GET /api/bookings/:id
 * Phase 4: POST /api/bookings/:id/choose-payment, POST /api/bookings/:id/declare-transfer
 */

import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { authMiddleware, AuthRequest } from '../middleware/auth.js';
import {
    getBookingQuote,
    createBookingHold,
    getBookingById,
    choosePaymentMethod,
    declareTransfer,
    getBookingByIdExtended,
} from '../services/booking.service.js';
import { createTransferSession } from '../services/payment.service.js';
import { respondError, respondInternalError, respondSuccess, respondValidationError } from '../lib/api.js';
import { logger } from '../lib/logger.js';

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

// Phase 4: Payment method schema
const paymentMethodSchema = z.object({
    paymentMethod: z.enum(['CASH', 'TRANSFER']),
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
            return respondValidationError(res, parsed.error.errors[0]?.message || 'Dữ liệu không hợp lệ');
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

        return respondSuccess(res, {
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
        });
    } catch (error) {
        logger.error({ event: 'booking.quote_failed', error, body: req.body });
        return respondInternalError(res);
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
            return respondValidationError(res, parsed.error.errors[0]?.message || 'Dữ liệu không hợp lệ');
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

        return respondSuccess(res, result.data, 201);
    } catch (error) {
        logger.error({ event: 'booking.hold_failed', error, userId: req.userId, body: req.body });
        return respondInternalError(res);
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
            return respondValidationError(res, 'Booking ID là bắt buộc');
        }

        const booking = await getBookingById(bookingId, userId);

        if (!booking) {
            return respondError(res, 404, 'BOOKING_NOT_FOUND', 'Không tìm thấy booking');
        }

        return respondSuccess(res, booking);
    } catch (error) {
        logger.error({ event: 'booking.detail_failed', error, userId: req.userId, bookingId: req.params.id });
        return respondInternalError(res);
    }
});

// ==================== PHASE 4 ROUTES ====================

/**
 * POST /api/bookings/:id/choose-payment
 * Phase 4: Choose payment method and move to WAITING_MANAGER_CONFIRM
 */
router.post('/:id/choose-payment', authMiddleware, async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.userId;
        if (!userId) {
            return respondError(res, 401, 'UNAUTHORIZED', 'Bạn cần đăng nhập');
        }

        const parsed = paymentMethodSchema.safeParse(req.body);
        if (!parsed.success) {
            return respondValidationError(res, 'Phương thức thanh toán không hợp lệ');
        }

        const result = await choosePaymentMethod({
            bookingId: req.params.id,
            userId,
            paymentMethod: parsed.data.paymentMethod,
        });

        if (!result.success) {
            return res.status(400).json({
                success: false,
                error: result.error,
            });
        }

        return respondSuccess(res, result.data);
    } catch (error) {
        logger.error({
            event: 'booking.choose_payment_failed',
            error,
            userId: req.userId,
            bookingId: req.params.id,
            body: req.body,
        });
        return respondInternalError(res);
    }
});

/**
 * POST /api/bookings/:id/declare-transfer
 * Phase 4: User declares they have transferred payment
 */
router.post('/:id/declare-transfer', authMiddleware, async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.userId;
        if (!userId) {
            return respondError(res, 401, 'UNAUTHORIZED', 'Bạn cần đăng nhập');
        }

        const result = await declareTransfer(req.params.id, userId);

        if (!result.success) {
            return res.status(400).json({
                success: false,
                error: result.error,
            });
        }

        return respondSuccess(res, result.data);
    } catch (error) {
        logger.error({
            event: 'booking.declare_transfer_failed',
            error,
            userId: req.userId,
            bookingId: req.params.id,
        });
        return respondInternalError(res);
    }
});

router.post('/:id/transfer-session', authMiddleware, async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.userId;
        if (!userId) {
            return respondError(res, 401, 'UNAUTHORIZED', 'Bạn cần đăng nhập');
        }

        const data = await createTransferSession(req.params.id, userId);
        return respondSuccess(res, data);
    } catch (error: unknown) {
        const code = error instanceof Error ? error.message : 'INTERNAL_ERROR';
        const statusMap: Record<string, number> = {
            BOOKING_NOT_FOUND: 404,
            BOOKING_NOT_PENDING_PAYMENT: 400,
            BOOKING_HOLD_EXPIRED: 400,
        };

        logger.error({
            event: 'booking.transfer_session_failed',
            error,
            userId: req.userId,
            bookingId: req.params.id,
            code,
        });

        return respondError(res, statusMap[code] || 500, code, code);
    }
});

/**
 * GET /api/bookings/:id/extended
 * Phase 4: Get booking with extended fields (contactPhone if CONFIRMED)
 */
router.get('/:id/extended', authMiddleware, async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.userId;
        const userRole = req.userRole || 'USER';
        if (!userId) {
            return respondError(res, 401, 'UNAUTHORIZED', 'Bạn cần đăng nhập');
        }

        const booking = await getBookingByIdExtended(req.params.id, userId, userRole);

        if (!booking) {
            return respondError(res, 404, 'BOOKING_NOT_FOUND', 'Không tìm thấy booking');
        }

        return respondSuccess(res, booking);
    } catch (error) {
        logger.error({
            event: 'booking.detail_extended_failed',
            error,
            userId: req.userId,
            bookingId: req.params.id,
        });
        return respondInternalError(res);
    }
});

export default router;

