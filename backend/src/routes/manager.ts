/**
 * Manager Routes - Phase 4
 * Handles manager booking operations
 */

import { Router, Response } from 'express';
import { z } from 'zod';
import { authMiddleware, AuthRequest } from '../middleware/auth.js';
import {
    getManagerBookings,
    confirmBooking,
    cancelBooking,
} from '../services/manager.service.js';

const router = Router();

// ==================== VALIDATION SCHEMAS ====================

const cancelSchema = z.object({
    reason: z.string().min(5, 'Lý do phải có ít nhất 5 ký tự'),
});

// ==================== MIDDLEWARE ====================

/**
 * Require MANAGER role
 */
function requireManager(req: AuthRequest, res: Response, next: () => void) {
    if (req.userRole !== 'MANAGER' && req.userRole !== 'ADMIN') {
        return res.status(403).json({
            success: false,
            error: { code: 'FORBIDDEN', message: 'Chỉ manager mới có quyền truy cập' },
        });
    }
    next();
}

// ==================== ROUTES ====================

/**
 * GET /api/manager/bookings
 * Get bookings for manager's venue
 */
router.get('/bookings', authMiddleware, requireManager, async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.userId;
        if (!userId) {
            return res.status(401).json({
                success: false,
                error: { code: 'UNAUTHORIZED', message: 'Bạn cần đăng nhập' },
            });
        }

        const date = req.query.date as string | undefined;
        const status = req.query.status as string | undefined;

        const bookings = await getManagerBookings(userId, { date, status });

        return res.json({
            success: true,
            data: bookings,
        });
    } catch (err) {
        console.error('❌ Get manager bookings error:', err);
        return res.status(500).json({
            success: false,
            error: { code: 'INTERNAL_ERROR', message: 'Lỗi hệ thống' },
        });
    }
});

/**
 * POST /api/manager/bookings/:id/confirm
 * Confirm a booking
 */
router.post('/bookings/:id/confirm', authMiddleware, requireManager, async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.userId;
        if (!userId) {
            return res.status(401).json({
                success: false,
                error: { code: 'UNAUTHORIZED', message: 'Bạn cần đăng nhập' },
            });
        }

        const bookingId = req.params.id;
        const result = await confirmBooking(bookingId, userId);

        if (!result.success) {
            return res.status(400).json({
                success: false,
                error: result.error,
            });
        }

        return res.json({
            success: true,
            data: result.data,
        });
    } catch (err) {
        console.error('❌ Confirm booking error:', err);
        return res.status(500).json({
            success: false,
            error: { code: 'INTERNAL_ERROR', message: 'Lỗi hệ thống' },
        });
    }
});

/**
 * POST /api/manager/bookings/:id/cancel
 * Cancel a booking with reason
 */
router.post('/bookings/:id/cancel', authMiddleware, requireManager, async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.userId;
        if (!userId) {
            return res.status(401).json({
                success: false,
                error: { code: 'UNAUTHORIZED', message: 'Bạn cần đăng nhập' },
            });
        }

        const parsed = cancelSchema.safeParse(req.body);
        if (!parsed.success) {
            return res.status(400).json({
                success: false,
                error: { code: 'VALIDATION_ERROR', message: parsed.error.errors[0].message },
            });
        }

        const bookingId = req.params.id;
        const result = await cancelBooking(bookingId, userId, parsed.data.reason);

        if (!result.success) {
            return res.status(400).json({
                success: false,
                error: result.error,
            });
        }

        return res.json({
            success: true,
            data: result.data,
        });
    } catch (err) {
        console.error('❌ Cancel booking error:', err);
        return res.status(500).json({
            success: false,
            error: { code: 'INTERNAL_ERROR', message: 'Lỗi hệ thống' },
        });
    }
});

export default router;
