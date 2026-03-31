import crypto from 'crypto';
import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { appConfig } from '../lib/config.js';
import { respondError, respondSuccess } from '../lib/api.js';
import { processBankWebhook } from '../services/payment.service.js';

const router = Router();

const bankWebhookSchema = z.object({
    providerEventId: z.string().min(8),
    providerTxnId: z.string().min(3),
    referenceCode: z.string().min(6),
    amount: z.number().int().positive(),
    paidAt: z.string().datetime(),
    provider: z.string().optional(),
    metadata: z.record(z.any()).optional(),
});

function verifySignature(rawBody: string, signature: string | undefined) {
    if (!signature) return false;
    const expected = crypto
        .createHmac('sha256', appConfig.paymentWebhookSecret)
        .update(rawBody)
        .digest('hex');
    if (signature.length !== expected.length) return false;
    return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
}

router.post('/webhook/bank', async (req: Request, res: Response) => {
    const signature = req.headers['x-signature'];
    const rawBody = (req as Request & { rawBody?: string }).rawBody || JSON.stringify(req.body);

    if (typeof signature !== 'string' || !verifySignature(rawBody, signature)) {
        return respondError(res, 401, 'INVALID_SIGNATURE', 'Webhook signature không hợp lệ');
    }

    const parsed = bankWebhookSchema.safeParse(req.body);
    if (!parsed.success) {
        return respondError(res, 400, 'VALIDATION_ERROR', parsed.error.errors[0]?.message || 'Payload không hợp lệ');
    }

    const result = await processBankWebhook(parsed.data);
    return respondSuccess(res, result);
});

export default router;
