import { z } from 'zod';

const envSchema = z.object({
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
    PORT: z.coerce.number().int().positive().default(3001),
    APP_URL: z.string().url().default('http://localhost:3001'),
    FRONTEND_URL: z.string().url().default('http://localhost:5173'),
    CORS_ORIGIN: z.string().default('http://localhost:5173'),
    JWT_SECRET: z.string().min(10).default('local-dev-jwt-secret'),
    JWT_EXPIRES_IN: z.string().default('7d'),
    LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']).default('info'),
    REQUEST_SIZE_LIMIT: z.string().default('1mb'),
    OTP_TTL_MINUTES: z.coerce.number().int().min(5).max(30).default(10),
    OTP_RESEND_COOLDOWN_SECONDS: z.coerce.number().int().min(30).max(300).default(60),
    PASSWORD_RESET_TTL_MINUTES: z.coerce.number().int().min(10).max(120).default(30),
    RESEND_API_KEY: z.string().optional().or(z.literal('')),
    EMAIL_FROM: z.string().default('CourtBooking <no-reply@example.com>'),
    SENTRY_DSN: z.string().optional().or(z.literal('')),
    PAYMENT_WEBHOOK_SECRET: z.string().min(8).default('local-bank-secret'),
    PAYMENT_PROVIDER_NAME: z.string().default('bank-webhook-aggregator'),
    PLATFORM_BANK_NAME: z.string().default('Vietcombank'),
    PLATFORM_BANK_ACCOUNT_NAME: z.string().default('COURT BOOKING PLATFORM'),
    PLATFORM_BANK_ACCOUNT_NUMBER: z.string().default('0909998888'),
    PLATFORM_BANK_QR_BASE_URL: z.string().url().default('https://img.vietqr.io/image/970436-0909998888-compact2.png'),
    WORKER_HEARTBEAT_KEY: z.string().default('background-jobs'),
    WORKER_HEARTBEAT_MAX_AGE_SECONDS: z.coerce.number().int().min(30).max(300).default(120),
    ENABLE_WEBSOCKET: z.enum(['true', 'false']).default('true'),
    RUN_EMBEDDED_WORKERS: z.enum(['true', 'false']).default('false'),
});

const parsedEnv = envSchema.parse(process.env);

export const appConfig = {
    nodeEnv: parsedEnv.NODE_ENV,
    isProduction: parsedEnv.NODE_ENV === 'production',
    isDevelopment: parsedEnv.NODE_ENV === 'development',
    port: parsedEnv.PORT,
    appUrl: parsedEnv.APP_URL,
    frontendUrl: parsedEnv.FRONTEND_URL,
    corsOrigins: parsedEnv.CORS_ORIGIN.split(',').map((origin) => origin.trim()).filter(Boolean),
    jwtSecret: parsedEnv.JWT_SECRET,
    jwtExpiresIn: parsedEnv.JWT_EXPIRES_IN,
    logLevel: parsedEnv.LOG_LEVEL,
    requestSizeLimit: parsedEnv.REQUEST_SIZE_LIMIT,
    otpTtlMinutes: parsedEnv.OTP_TTL_MINUTES,
    otpResendCooldownSeconds: parsedEnv.OTP_RESEND_COOLDOWN_SECONDS,
    passwordResetTtlMinutes: parsedEnv.PASSWORD_RESET_TTL_MINUTES,
    resendApiKey: parsedEnv.RESEND_API_KEY || null,
    emailFrom: parsedEnv.EMAIL_FROM,
    sentryDsn: parsedEnv.SENTRY_DSN || null,
    paymentWebhookSecret: parsedEnv.PAYMENT_WEBHOOK_SECRET,
    paymentProviderName: parsedEnv.PAYMENT_PROVIDER_NAME,
    platformBank: {
        name: parsedEnv.PLATFORM_BANK_NAME,
        accountName: parsedEnv.PLATFORM_BANK_ACCOUNT_NAME,
        accountNumber: parsedEnv.PLATFORM_BANK_ACCOUNT_NUMBER,
        qrBaseUrl: parsedEnv.PLATFORM_BANK_QR_BASE_URL,
    },
    worker: {
        heartbeatKey: parsedEnv.WORKER_HEARTBEAT_KEY,
        heartbeatMaxAgeSeconds: parsedEnv.WORKER_HEARTBEAT_MAX_AGE_SECONDS,
        runEmbeddedWorkers: parsedEnv.RUN_EMBEDDED_WORKERS === 'true',
    },
    websocketEnabled: parsedEnv.ENABLE_WEBSOCKET === 'true',
};

export type AppConfig = typeof appConfig;

