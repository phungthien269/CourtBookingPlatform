/**
 * Chat Routes - Phase 5
 */

import { Router, Response } from 'express';
import { z } from 'zod';
import { authMiddleware, requireManager, AuthRequest } from '../middleware/auth';
import {
    createOrGetThread,
    getMessages,
    sendMessage,
    getManagerInbox,
} from '../services/chat.service';

const router = Router();

// ==================== Schemas ====================

const createThreadSchema = z.object({
    bookingId: z.string().uuid(),
});

const getMessagesSchema = z.object({
    limit: z.coerce.number().int().positive().max(100).default(50),
    before: z.string().datetime().optional(),
});

const sendMessageSchema = z.object({
    content: z.string().min(1).max(1000),
});

// ==================== Routes ====================

/**
 * POST /api/chat/threads
 * Create or get existing thread for a booking
 */
router.post('/threads', authMiddleware, async (req: AuthRequest, res: Response) => {
    try {
        const parsed = createThreadSchema.safeParse(req.body);
        if (!parsed.success) {
            return res.status(400).json({
                success: false,
                error: { code: 'VALIDATION_ERROR', message: parsed.error.message },
            });
        }

        const result = await createOrGetThread({
            userId: req.userId!,
            bookingId: parsed.data.bookingId,
        });

        if (!result.success) {
            const statusCode =
                result.error?.code === 'FORBIDDEN' ? 403 :
                    result.error?.code === 'BOOKING_NOT_FOUND' ? 404 : 400;
            return res.status(statusCode).json(result);
        }

        return res.status(result.data?.isNew ? 201 : 200).json(result);
    } catch (error) {
        console.error('Create thread error:', error);
        return res.status(500).json({
            success: false,
            error: { code: 'SERVER_ERROR', message: 'Lỗi server' },
        });
    }
});

/**
 * GET /api/chat/threads/:threadId/messages
 * Get messages for a thread
 */
router.get('/threads/:threadId/messages', authMiddleware, async (req: AuthRequest, res: Response) => {
    try {
        const threadId = req.params.threadId;
        const parsed = getMessagesSchema.safeParse(req.query);

        if (!parsed.success) {
            return res.status(400).json({
                success: false,
                error: { code: 'VALIDATION_ERROR', message: parsed.error.message },
            });
        }

        // Determine role based on user
        const requesterRole = req.userRole === 'MANAGER' ? 'MANAGER' : 'USER';

        const result = await getMessages(
            threadId,
            req.userId!,
            requesterRole as 'USER' | 'MANAGER',
            parsed.data.limit,
            parsed.data.before
        );

        if (!result.success) {
            const statusCode =
                result.error?.code === 'FORBIDDEN' ? 403 :
                    result.error?.code === 'THREAD_NOT_FOUND' ? 404 : 400;
            return res.status(statusCode).json(result);
        }

        return res.json(result);
    } catch (error) {
        console.error('Get messages error:', error);
        return res.status(500).json({
            success: false,
            error: { code: 'SERVER_ERROR', message: 'Lỗi server' },
        });
    }
});

/**
 * POST /api/chat/threads/:threadId/messages
 * Send a message in a thread
 */
router.post('/threads/:threadId/messages', authMiddleware, async (req: AuthRequest, res: Response) => {
    try {
        const threadId = req.params.threadId;
        const parsed = sendMessageSchema.safeParse(req.body);

        if (!parsed.success) {
            return res.status(400).json({
                success: false,
                error: { code: 'VALIDATION_ERROR', message: parsed.error.message },
            });
        }

        // Determine sender role
        const senderRole = req.userRole === 'MANAGER' ? 'MANAGER' : 'USER';

        const result = await sendMessage({
            threadId,
            senderUserId: req.userId!,
            senderRole: senderRole as 'USER' | 'MANAGER',
            content: parsed.data.content,
        });

        if (!result.success) {
            const statusCode =
                result.error?.code === 'FORBIDDEN' ? 403 :
                    result.error?.code === 'THREAD_NOT_FOUND' ? 404 : 400;
            return res.status(statusCode).json(result);
        }

        return res.status(201).json(result);
    } catch (error) {
        console.error('Send message error:', error);
        return res.status(500).json({
            success: false,
            error: { code: 'SERVER_ERROR', message: 'Lỗi server' },
        });
    }
});

/**
 * GET /api/manager/chat/inbox
 * Get manager's chat inbox
 */
router.get('/manager/inbox', authMiddleware, requireManager, async (req: AuthRequest, res: Response) => {
    try {
        const result = await getManagerInbox(req.userId!);
        return res.json(result);
    } catch (error) {
        console.error('Get manager inbox error:', error);
        return res.status(500).json({
            success: false,
            error: { code: 'SERVER_ERROR', message: 'Lỗi server' },
        });
    }
});

export default router;
