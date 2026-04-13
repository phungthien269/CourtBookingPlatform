import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { appConfig } from '../lib/config.js';
import { logger } from '../lib/logger.js';
import { processSepayWebhook } from '../services/payment.service.js';

const router = Router();

const sepayWebhookSchema = z.object({
    id: z.number().int(),
    gateway: z.string(),
    transactionDate: z.string(),
    accountNumber: z.string(),
    subAccount: z.string().nullable().optional(),
    transferType: z.enum(['in', 'out']),
    transferAmount: z.number().positive(),
    accumulated: z.number().optional(),
    code: z.string().nullable().optional(),
    content: z.string(),
    referenceCode: z.string(),
    description: z.string().optional(),
    bankTransferId: z.string().nullable().optional(),
});

router.post('/sepay-webhook', async (req: Request, res: Response) => {
    const authorization = req.headers.authorization;

    if (!appConfig.sepayApiKey || authorization !== `Apikey ${appConfig.sepayApiKey}`) {
        logger.warn({
            event: 'payment.sepay_webhook_unauthorized',
            authorization: typeof authorization === 'string' ? 'provided' : 'missing',
        });
        return res.status(200).json({ success: false });
    }

    const parsed = sepayWebhookSchema.safeParse(req.body);
    if (!parsed.success) {
        logger.warn({
            event: 'payment.sepay_webhook_invalid_payload',
            issues: parsed.error.errors,
        });
        return res.status(200).json({ success: false });
    }

    try {
        await processSepayWebhook(parsed.data);
    } catch (error) {
        logger.error({ event: 'payment.sepay_webhook_failed', error, payload: parsed.data });
    }

    return res.status(200).json({ success: true });
});

export default router;
