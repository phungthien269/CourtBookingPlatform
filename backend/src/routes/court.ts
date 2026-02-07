/**
 * Court Routes - Phase 2
 * GET /api/courts/:courtId/availability
 */

import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { getCourtAvailability } from '../services/court.service.js';

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
            return res.status(400).json({
                success: false,
                error: {
                    code: 'INVALID_INPUT',
                    message: parsed.error.errors[0]?.message || 'Invalid date format',
                },
            });
        }

        const { date } = parsed.data;

        const availability = await getCourtAvailability(courtId, date);

        if (!availability) {
            return res.status(404).json({
                success: false,
                error: {
                    code: 'COURT_NOT_FOUND',
                    message: 'Không tìm thấy sân',
                },
            });
        }

        return res.json({
            success: true,
            data: availability,
        });
    } catch (error) {
        console.error('Error getting court availability:', error);
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
