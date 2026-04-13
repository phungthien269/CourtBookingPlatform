import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import jwt, { SignOptions } from 'jsonwebtoken';
import { authMiddleware, AuthRequest } from '../middleware/auth.js';
import prisma from '../lib/prisma.js';
import { appConfig } from '../lib/config.js';
import { sendOtpEmail } from '../lib/email.js';
import { logger } from '../lib/logger.js';
import { respondError, respondSuccess } from '../lib/api.js';
import { registerRateLimit, resendOtpRateLimit } from '../middleware/rateLimit.js';

const router = Router();

const JWT_SECRET = process.env.JWT_SECRET || 'default-secret';
const OTP_ATTEMPT_WINDOW_MS = appConfig.otpVerifyAttemptWindowMinutes * 60 * 1000;
const otpFailedAttempts = new Map<string, number[]>();

function normalizeEmail(email: string): string {
    return email.trim().toLowerCase();
}

function buildOtpResponse(email: string, otpCode?: string) {
    return {
        message: 'OTP đã được gửi tới email của bạn.',
        email,
        resendCooldownSeconds: appConfig.otpResendCooldownSeconds,
        ...(appConfig.isDevelopment && otpCode ? { otpHint: otpCode } : {}),
    };
}

function generateOtp(): string {
    return crypto.randomInt(100000, 1000000).toString();
}

function hashOtp(otpCode: string) {
    if (!appConfig.isProduction) {
        return otpCode;
    }

    return crypto.createHash('sha256').update(otpCode).digest('hex');
}

function getRecentFailedAttempts(email: string, now = Date.now()) {
    const key = normalizeEmail(email);
    const timestamps = otpFailedAttempts.get(key) ?? [];
    const fresh = timestamps.filter((timestamp) => now - timestamp < OTP_ATTEMPT_WINDOW_MS);
    otpFailedAttempts.set(key, fresh);
    return fresh;
}

function resetFailedAttempts(email: string) {
    otpFailedAttempts.delete(normalizeEmail(email));
}

function registerFailedAttempt(email: string, now = Date.now()) {
    const key = normalizeEmail(email);
    const attempts = [...getRecentFailedAttempts(key, now), now];
    otpFailedAttempts.set(key, attempts);
    return attempts.length;
}

async function invalidateUnusedOtps(userId: string) {
    await prisma.otpVerification.updateMany({
        where: {
            userId,
            used: false,
        },
        data: {
            used: true,
        },
    });
}

async function createAndSendOtp(user: { id: string; email: string; name: string | null }) {
    const otpCode = generateOtp();
    const otpHash = hashOtp(otpCode);
    const expiresAt = new Date(Date.now() + appConfig.otpTtlMinutes * 60 * 1000);

    await invalidateUnusedOtps(user.id);

    await prisma.otpVerification.create({
        data: {
            userId: user.id,
            otpCode: otpHash,
            expiresAt,
        },
    });

    logger.info({
        event: 'otp.created',
        userId: user.id,
        email: user.email,
        expiresAt: expiresAt.toISOString(),
    });

    await sendOtpEmail({
        to: user.email,
        name: user.name,
        otpCode,
        expiresInMinutes: appConfig.otpTtlMinutes,
    });

    logger.info({
        event: 'otp.sent',
        userId: user.id,
        email: user.email,
    });

    return otpCode;
}

async function getLatestUnusedOtp(userId: string) {
    return prisma.otpVerification.findFirst({
        where: {
            userId,
            used: false,
        },
        orderBy: {
            createdAt: 'desc',
        },
    });
}

async function ensureCanResendOtp(user: { id: string; email: string }) {
    const latestOtp = await getLatestUnusedOtp(user.id);
    if (!latestOtp) {
        return;
    }

    const cooldownMs = appConfig.otpResendCooldownSeconds * 1000;
    const availableAt = latestOtp.createdAt.getTime() + cooldownMs;
    const now = Date.now();

    if (availableAt > now) {
        const remainingSeconds = Math.ceil((availableAt - now) / 1000);
        logger.warn({
            event: 'otp.resend_rate_limited',
            userId: user.id,
            email: user.email,
            remainingSeconds,
        });
        return remainingSeconds;
    }
}

// POST /api/auth/register
router.post('/register', registerRateLimit, async (req: Request, res: Response) => {
    try {
        const { email, password, name } = req.body;

        if (!email || !password) {
            return respondError(res, 400, 'VALIDATION_ERROR', 'Email và mật khẩu là bắt buộc.');
        }

        const normalizedEmail = normalizeEmail(email);
        const existingUser = await prisma.user.findUnique({ where: { email: normalizedEmail } });
        const passwordHash = await bcrypt.hash(password, 12);

        let user;

        if (existingUser && existingUser.isEmailVerified) {
            return respondError(res, 400, 'EMAIL_ALREADY_EXISTS', 'Email này đã được đăng ký.');
        }

        if (existingUser) {
            user = await prisma.user.update({
                where: { id: existingUser.id },
                data: {
                    passwordHash,
                    name: name || null,
                    updatedAt: new Date(),
                },
            });
        } else {
            user = await prisma.user.create({
                data: {
                    email: normalizedEmail,
                    passwordHash,
                    name: name || null,
                    role: 'USER',
                    isEmailVerified: false,
                },
            });
        }

        try {
            const otpCode = await createAndSendOtp(user);
            resetFailedAttempts(user.email);
            return res.status(201).json(buildOtpResponse(user.email, otpCode));
        } catch (error) {
            logger.error({
                event: 'otp.send_failed',
                userId: user.id,
                email: user.email,
                error,
            });
            return respondError(res, 500, 'EMAIL_SEND_FAILED', 'Không thể gửi OTP xác thực lúc này.');
        }
    } catch (error) {
        logger.error({ event: 'auth.register_failed', error });
        return respondError(res, 500, 'INTERNAL_SERVER_ERROR', 'Đã có lỗi xảy ra.');
    }
});

// POST /api/auth/resend-otp
router.post('/resend-otp', resendOtpRateLimit, async (req: Request, res: Response) => {
    try {
        const { email } = req.body;

        if (!email) {
            return respondError(res, 400, 'VALIDATION_ERROR', 'Email là bắt buộc.');
        }

        const normalizedEmail = normalizeEmail(email);
        const user = await prisma.user.findUnique({ where: { email: normalizedEmail } });

        if (!user) {
            return respondError(res, 404, 'USER_NOT_FOUND', 'Không tìm thấy tài khoản.');
        }

        if (user.isEmailVerified) {
            return respondError(res, 400, 'EMAIL_ALREADY_VERIFIED', 'Email đã được xác thực.');
        }

        const remainingSeconds = await ensureCanResendOtp(user);
        if (remainingSeconds) {
            return respondError(
                res,
                429,
                'OTP_RESEND_COOLDOWN',
                'Vui lòng chờ thêm trước khi gửi lại OTP.',
                { remainingSeconds }
            );
        }

        try {
            const otpCode = await createAndSendOtp(user);
            resetFailedAttempts(user.email);
            return res.json(buildOtpResponse(user.email, otpCode));
        } catch (error) {
            logger.error({
                event: 'otp.send_failed',
                userId: user.id,
                email: user.email,
                error,
            });
            return respondError(res, 500, 'EMAIL_SEND_FAILED', 'Không thể gửi OTP xác thực lúc này.');
        }
    } catch (error) {
        logger.error({ event: 'auth.resend_otp_failed', error });
        return respondError(res, 500, 'INTERNAL_SERVER_ERROR', 'Đã có lỗi xảy ra.');
    }
});

// POST /api/auth/verify-otp
router.post('/verify-otp', async (req: Request, res: Response) => {
    try {
        const { email, otp } = req.body;

        if (!email || !otp) {
            return respondError(res, 400, 'VALIDATION_ERROR', 'Email và OTP là bắt buộc.');
        }

        const normalizedEmail = normalizeEmail(email);
        const user = await prisma.user.findUnique({ where: { email: normalizedEmail } });
        if (!user) {
            return respondError(res, 404, 'USER_NOT_FOUND', 'Không tìm thấy tài khoản.');
        }

        if (user.isEmailVerified) {
            return respondError(res, 400, 'EMAIL_ALREADY_VERIFIED', 'Email đã được xác thực.');
        }

        const failedAttempts = getRecentFailedAttempts(normalizedEmail);
        if (failedAttempts.length >= appConfig.otpVerifyMaxAttempts) {
            logger.warn({
                event: 'otp.verify_rate_limited',
                email: normalizedEmail,
                attempts: failedAttempts.length,
            });
            return respondError(
                res,
                429,
                'OTP_ATTEMPTS_EXCEEDED',
                'Bạn đã nhập sai OTP quá nhiều lần. Vui lòng yêu cầu gửi lại mã mới.'
            );
        }

        const otpRecord = await getLatestUnusedOtp(user.id);
        if (!otpRecord) {
            return respondError(res, 400, 'OTP_EXPIRED', 'OTP đã hết hạn. Vui lòng yêu cầu mã mới.');
        }

        if (otpRecord.expiresAt.getTime() <= Date.now()) {
            await invalidateUnusedOtps(user.id);
            return respondError(res, 400, 'OTP_EXPIRED', 'OTP đã hết hạn. Vui lòng yêu cầu mã mới.');
        }

        if (otpRecord.otpCode !== hashOtp(String(otp))) {
            const attempts = registerFailedAttempt(normalizedEmail);

            if (attempts >= appConfig.otpVerifyMaxAttempts) {
                await invalidateUnusedOtps(user.id);
                logger.warn({
                    event: 'otp.attempts_exceeded',
                    userId: user.id,
                    email: normalizedEmail,
                    attempts,
                });
                return respondError(
                    res,
                    429,
                    'OTP_ATTEMPTS_EXCEEDED',
                    'Bạn đã nhập sai OTP quá nhiều lần. Vui lòng yêu cầu gửi lại mã mới.'
                );
            }

            return respondError(res, 400, 'OTP_INVALID', 'Mã OTP không đúng.');
        }

        await prisma.$transaction([
            prisma.otpVerification.update({
                where: { id: otpRecord.id },
                data: { used: true },
            }),
            prisma.user.update({
                where: { id: user.id },
                data: { isEmailVerified: true },
            }),
        ]);

        resetFailedAttempts(normalizedEmail);

        logger.info({
            event: 'otp.verified',
            userId: user.id,
            email: normalizedEmail,
        });

        return res.json({ message: 'Email đã được xác thực thành công.' });
    } catch (error) {
        logger.error({ event: 'auth.verify_otp_failed', error });
        return respondError(res, 500, 'INTERNAL_SERVER_ERROR', 'Đã có lỗi xảy ra.');
    }
});

// POST /api/auth/login
router.post('/login', async (req: Request, res: Response) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return respondError(res, 400, 'VALIDATION_ERROR', 'Email và mật khẩu là bắt buộc.');
        }

        const normalizedEmail = normalizeEmail(email);
        const user = await prisma.user.findUnique({ where: { email: normalizedEmail } });
        if (!user) {
            return respondError(res, 401, 'INVALID_CREDENTIALS', 'Email hoặc mật khẩu không đúng.');
        }

        const validPassword = await bcrypt.compare(password, user.passwordHash);
        if (!validPassword) {
            return respondError(res, 401, 'INVALID_CREDENTIALS', 'Email hoặc mật khẩu không đúng.');
        }

        if (!user.isEmailVerified) {
            return respondError(res, 403, 'EMAIL_NOT_VERIFIED', 'Email chưa được xác thực.');
        }

        if (user.status === 'LOCKED') {
            return respondError(res, 403, 'ACCOUNT_LOCKED', 'Tài khoản đã bị khóa.');
        }

        const signOptions: SignOptions = { expiresIn: '7d' };
        const token = jwt.sign(
            { userId: user.id, email: user.email, role: user.role },
            JWT_SECRET,
            signOptions
        );

        res.json({
            token,
            user: {
                id: user.id,
                email: user.email,
                name: user.name,
                role: user.role,
            },
        });
    } catch (error) {
        logger.error({ event: 'auth.login_failed', error });
        return respondError(res, 500, 'INTERNAL_SERVER_ERROR', 'Đã có lỗi xảy ra.');
    }
});

// GET /api/auth/me
router.get('/me', authMiddleware, async (req: AuthRequest, res: Response) => {
    try {
        const user = await prisma.user.findUnique({
            where: { id: req.userId },
            select: {
                id: true,
                email: true,
                name: true,
                role: true,
                isEmailVerified: true,
                status: true,
                createdAt: true,
            },
        });

        if (!user) {
            return respondError(res, 404, 'USER_NOT_FOUND', 'Không tìm thấy tài khoản.');
        }

        return respondSuccess(res, { user });
    } catch (error) {
        logger.error({ event: 'auth.me_failed', error });
        return respondError(res, 500, 'INTERNAL_SERVER_ERROR', 'Đã có lỗi xảy ra.');
    }
});

export default router;
