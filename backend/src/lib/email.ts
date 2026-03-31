import { Resend } from 'resend';
import { appConfig } from './config.js';
import { logger } from './logger.js';

const resend = appConfig.resendApiKey ? new Resend(appConfig.resendApiKey) : null;

async function sendEmail(params: {
    to: string;
    subject: string;
    html: string;
    text: string;
}) {
    if (!resend) {
        logger.warn({
            event: 'email.skipped',
            to: params.to,
            subject: params.subject,
            reason: 'RESEND_API_KEY missing',
        });
        return;
    }

    await resend.emails.send({
        from: appConfig.emailFrom,
        to: params.to,
        subject: params.subject,
        html: params.html,
        text: params.text,
    });
}

export async function sendOtpEmail(params: {
    to: string;
    name?: string | null;
    otpCode: string;
    expiresInMinutes: number;
}) {
    const greeting = params.name ? `Xin chào ${params.name},` : 'Xin chào,';
    await sendEmail({
        to: params.to,
        subject: 'CourtBooking - Mã xác thực email',
        text: `${greeting}\n\nMã OTP của bạn là ${params.otpCode}. Mã này có hiệu lực trong ${params.expiresInMinutes} phút.`,
        html: `<p>${greeting}</p><p>Mã OTP của bạn là <strong>${params.otpCode}</strong>.</p><p>Mã này có hiệu lực trong ${params.expiresInMinutes} phút.</p>`,
    });
}

export async function sendPasswordResetEmail(params: {
    to: string;
    name?: string | null;
    resetUrl: string;
    expiresInMinutes: number;
}) {
    const greeting = params.name ? `Xin chào ${params.name},` : 'Xin chào,';
    await sendEmail({
        to: params.to,
        subject: 'CourtBooking - Đặt lại mật khẩu',
        text: `${greeting}\n\nBạn vừa yêu cầu đặt lại mật khẩu. Truy cập liên kết sau để hoàn tất trong ${params.expiresInMinutes} phút:\n${params.resetUrl}`,
        html: `<p>${greeting}</p><p>Bạn vừa yêu cầu đặt lại mật khẩu.</p><p><a href="${params.resetUrl}">Đặt lại mật khẩu</a></p><p>Liên kết có hiệu lực trong ${params.expiresInMinutes} phút.</p>`,
    });
}

