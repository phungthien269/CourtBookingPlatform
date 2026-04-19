/**
 * Court Routes - Phase 2
 * GET /api/courts/:courtId/availability
 */

import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { getCourtAvailability } from '../services/court.service.js';
import { respondError, respondInternalError, respondSuccess, respondValidationError } from '../lib/api.js';
import { logger } from '../lib/logger.js';

const router = Router();

// ==================== VALIDATION SCHEMAS ====================

const availabilityQuerySchema = z.object({
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD format'),
});

// ==================== ROUTES ====================

/**
 * GET /api/courts/:courtId/availability
 * Public endpoint - returns hourly slot availability for a date
 */
router.get('/:courtId/availability', async (req: Request, res: Response) => {
    try {
        const { courtId } = req.params;

        // Validate query params
        const parsed = availabilityQuerySchema.safeParse(req.query);
        if (!parsed.success) {
            return respondValidationError(res, parsed.error.errors[0]?.message || 'Ngày không hợp lệ');
        }

        const { date } = parsed.data;

        const availability = await getCourtAvailability(courtId, date);

        if (!availability) {
            return respondError(res, 404, 'COURT_NOT_FOUND', 'Không tìm thấy sân');
        }

        return respondSuccess(res, availability);
    } catch (error) {
        logger.error({
            event: 'court.availability_failed',
            error,
            courtId: req.params.courtId,
            query: req.query,
        });
        return respondInternalError(res);
    }
});

export default router;
