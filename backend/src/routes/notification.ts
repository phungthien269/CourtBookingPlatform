/**
 * Notification Routes - Phase 6
 */

import { Router, Response } from 'express';
import { z } from 'zod';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import {
    listNotifications,
    getUnreadCount,
    markAsRead,
    markAllAsRead,
} from '../services/notification.service';
import { NotificationTargetRole } from '@prisma/client';

const router = Router();

// ==================== Schemas ====================

const listSchema = z.object({
    isRead: z.enum(['true', 'false']).optional().transform((v) => v === 'true' ? true : v === 'false' ? false : undefined),
    cursor: z.string().datetime().optional(),
    limit: z.coerce.number().int().min(1).max(50).default(20),
});

// ==================== Routes ====================

/**
 * GET /api/notifications
 * List notifications for current user
 */
router.get('/', authMiddleware, async (req: AuthRequest, res: Response) => {
    try {
        const parsed = listSchema.safeParse(req.query);
        if (!parsed.success) {
            return res.status(400).json({
                success: false,
                error: { code: 'VALIDATION_ERROR', message: parsed.error.message },
            });
        }

        const role: NotificationTargetRole = req.userRole === 'MANAGER' ? 'MANAGER' : 'USER';

        const result = await listNotifications({
            role,
            userId: role === 'USER' ? req.userId : undefined,
            managerId: role === 'MANAGER' ? req.userId : undefined,
            isRead: parsed.data.isRead,
            cursor: parsed.data.cursor,
            limit: parsed.data.limit,
        });

        if (!result.success) {
            return res.status(500).json(result);
        }

        return res.json(result);
    } catch (error) {
        console.error('List notifications error:', error);
        return res.status(500).json({
            success: false,
            error: { code: 'SERVER_ERROR', message: 'Lỗi server' },
        });
    }
});

/**
 * GET /api/notifications/unread-count
 * Get unread notification count
 */
router.get('/unread-count', authMiddleware, async (req: AuthRequest, res: Response) => {
    try {
        const role: NotificationTargetRole = req.userRole === 'MANAGER' ? 'MANAGER' : 'USER';

        const result = await getUnreadCount({
            role,
            userId: role === 'USER' ? req.userId : undefined,
            managerId: role === 'MANAGER' ? req.userId : undefined,
        });

        if (!result.success) {
            return res.status(500).json(result);
        }

        return res.json(result);
    } catch (error) {
        console.error('Get unread count error:', error);
        return res.status(500).json({
            success: false,
            error: { code: 'SERVER_ERROR', message: 'Lỗi server' },
        });
    }
});

/**
 * POST /api/notifications/:id/read
 * Mark single notification as read
 */
router.post('/:id/read', authMiddleware, async (req: AuthRequest, res: Response) => {
    try {
        const notificationId = req.params.id;
        const role: NotificationTargetRole = req.userRole === 'MANAGER' ? 'MANAGER' : 'USER';

        const result = await markAsRead(notificationId, req.userId!, role);

        if (!result.success) {
            const statusCode = result.error?.code === 'NOT_FOUND' ? 404 : 500;
            return res.status(statusCode).json(result);
        }

        return res.json(result);
    } catch (error) {
        console.error('Mark as read error:', error);
        return res.status(500).json({
            success: false,
            error: { code: 'SERVER_ERROR', message: 'Lỗi server' },
        });
    }
});

/**
 * POST /api/notifications/read-all
 * Mark all notifications as read
 */
router.post('/read-all', authMiddleware, async (req: AuthRequest, res: Response) => {
    try {
        const role: NotificationTargetRole = req.userRole === 'MANAGER' ? 'MANAGER' : 'USER';

        const result = await markAllAsRead(req.userId!, role);

        if (!result.success) {
            return res.status(500).json(result);
        }

        return res.json(result);
    } catch (error) {
        console.error('Mark all as read error:', error);
        return res.status(500).json({
            success: false,
            error: { code: 'SERVER_ERROR', message: 'Lỗi server' },
        });
    }
});

export default router;
