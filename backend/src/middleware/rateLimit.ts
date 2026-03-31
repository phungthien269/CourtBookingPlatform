import rateLimit from 'express-rate-limit';
import { appConfig } from '../lib/config.js';
import { respondError } from '../lib/api.js';

function buildLimiter(windowMs: number, max: number) {
    return rateLimit({
        windowMs,
        max,
        standardHeaders: true,
        legacyHeaders: false,
        handler: (_req, res) => respondError(res, 429, 'RATE_LIMITED', 'Bạn thao tác quá nhanh, vui lòng thử lại sau.'),
    });
}

export const authRateLimit = buildLimiter(15 * 60 * 1000, appConfig.isProduction ? 25 : 200);
export const bookingRateLimit = buildLimiter(5 * 60 * 1000, appConfig.isProduction ? 60 : 300);
export const webhookRateLimit = buildLimiter(1 * 60 * 1000, appConfig.isProduction ? 120 : 500);

