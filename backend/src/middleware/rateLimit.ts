import rateLimit from 'express-rate-limit';
import { appConfig } from '../lib/config.js';
import { respondError } from '../lib/api.js';
import { logger } from '../lib/logger.js';

function buildLimiter(windowMs: number, max: number, code = 'RATE_LIMITED', message = 'Bạn thao tác quá nhanh, vui lòng thử lại sau.') {
    return rateLimit({
        windowMs,
        max,
        standardHeaders: true,
        legacyHeaders: false,
        handler: (req, res) => {
            logger.warn({
                event: 'rate_limit.triggered',
                code,
                path: req.path,
                method: req.method,
                ip: req.ip,
            });
            return respondError(res, 429, code, message);
        },
    });
}

export const authRateLimit = buildLimiter(15 * 60 * 1000, appConfig.isProduction ? 25 : 200);
export const bookingRateLimit = buildLimiter(5 * 60 * 1000, appConfig.isProduction ? 60 : 300);
export const webhookRateLimit = buildLimiter(1 * 60 * 1000, appConfig.isProduction ? 120 : 500);
export const registerRateLimit = buildLimiter(
    60 * 60 * 1000,
    appConfig.isProduction ? 5 : 100,
    'REGISTER_RATE_LIMITED',
    'Bạn đã gửi quá nhiều yêu cầu đăng ký từ địa chỉ IP này. Vui lòng thử lại sau.'
);
export const resendOtpRateLimit = buildLimiter(
    60 * 60 * 1000,
    appConfig.isProduction ? 10 : 200,
    'RESEND_OTP_RATE_LIMITED',
    'Bạn đã gửi quá nhiều yêu cầu gửi lại OTP từ địa chỉ IP này. Vui lòng thử lại sau.'
);
