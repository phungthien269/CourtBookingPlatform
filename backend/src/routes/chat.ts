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
import { respondInternalError, respondValidationError } from '../lib/api.js';
import { logger } from '../lib/logger.js';

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
            return respondValidationError(res, parsed.error.message);
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
        logger.error({ event: 'chat.thread_create_failed', error, userId: req.userId, body: req.body });
        return respondInternalError(res, 'Lỗi server');
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
            return respondValidationError(res, parsed.error.message);
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
        logger.error({
            event: 'chat.messages_failed',
            error,
            userId: req.userId,
            threadId: req.params.threadId,
            query: req.query,
        });
        return respondInternalError(res, 'Lỗi server');
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
            return respondValidationError(res, parsed.error.message);
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
        logger.error({
            event: 'chat.message_send_failed',
            error,
            userId: req.userId,
            threadId: req.params.threadId,
            body: req.body,
        });
        return respondInternalError(res, 'Lỗi server');
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
        logger.error({ event: 'chat.manager_inbox_failed', error, userId: req.userId });
        return respondInternalError(res, 'Lỗi server');
    }
});

export default router;
