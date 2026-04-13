import { Prisma } from '@prisma/client';
import prisma from '../lib/prisma.js';
import { appConfig } from '../lib/config.js';
import { logger } from '../lib/logger.js';
import { sendToUser } from '../lib/websocket.js';
import { createAndDispatch, notifyBookingStatusChange } from './notification.service.js';

type TransferSessionResult = {
    bookingId: string;
    status: string;
    referenceCode: string;
    expiresAt: string;
    qrCodeUrl: string;
    bankAccount: {
        bankName: string;
        accountName: string;
        accountNumber: string;
    };
};

export type SepayWebhookPayload = {
    id: number;
    gateway: string;
    transactionDate: string;
    accountNumber: string;
    subAccount?: string | null;
    transferType: 'in' | 'out';
    transferAmount: number;
    accumulated?: number;
    code?: string | null;
    content: string;
    referenceCode: string;
    description?: string;
    bankTransferId?: string | null;
};

export interface PaymentReconciliationItemDTO {
    id: string;
    processingStatus: string;
    receivedAt: string;
    referenceCode: string | null;
    providerEventId: string;
    providerTxnId: string | null;
    amount: number | null;
    booking: {
        id: string;
        status: string;
        date: string;
        startTime: string;
        endTime: string;
        totalPrice: number;
        venueName: string;
        courtName: string;
        userEmail: string;
    } | null;
}

function buildReferenceCode(bookingId: string) {
    const bookingPart = bookingId.replace(/-/g, '').slice(0, 10).toUpperCase();
    const timePart = Date.now().toString().slice(-6);
    return `CBP${bookingPart}${timePart}`;
}

function normalizeSepayReference(payload: SepayWebhookPayload) {
    const extracted = payload.content.match(/CBP[A-Z0-9]{10,}/i)?.[0] || payload.referenceCode || '';
    const normalized = extracted.replace(/\s+/g, '').toUpperCase();
    return normalized || null;
}

function parseSepayTransactionDate(value: string) {
    const normalized = value.trim().replace(' ', 'T');
    return new Date(normalized.endsWith('Z') || normalized.includes('+') ? normalized : `${normalized}+07:00`);
}

export function buildTransferQrUrl(amount: number, referenceCode: string) {
    const params = new URLSearchParams({
        bank: appConfig.platformBank.name,
        acc: appConfig.platformBank.accountNumber,
        amount: String(amount),
        des: referenceCode,
    });

    return `https://qr.sepay.vn/img?${params.toString()}`;
}

export async function createTransferSession(bookingId: string, userId: string): Promise<TransferSessionResult> {
    const booking = await prisma.booking.findFirst({
        where: {
            id: bookingId,
            userId,
        },
        include: {
            payment: true,
        },
    });

    if (!booking) {
        throw new Error('BOOKING_NOT_FOUND');
    }

    if (booking.status !== 'PENDING_PAYMENT') {
        throw new Error('BOOKING_NOT_PENDING_PAYMENT');
    }

    if (!booking.pendingExpiresAt || booking.pendingExpiresAt.getTime() <= Date.now()) {
        throw new Error('BOOKING_HOLD_EXPIRED');
    }

    const existingSession =
        booking.payment?.method === 'TRANSFER' &&
        booking.payment.referenceCode &&
        booking.payment.transferSessionExpiresAt &&
        booking.payment.transferSessionExpiresAt.getTime() > Date.now()
            ? booking.payment
            : null;

    const referenceCode = existingSession?.referenceCode || buildReferenceCode(booking.id);
    const expiresAt = booking.pendingExpiresAt;

    await prisma.$transaction(async (tx) => {
        await tx.booking.update({
            where: { id: booking.id },
            data: {
                paymentMethod: 'TRANSFER',
            },
        });

        if (booking.payment) {
            await tx.payment.update({
                where: { bookingId: booking.id },
                data: {
                    method: 'TRANSFER',
                    provider: 'SEPAY',
                    amount: booking.totalPrice,
                    referenceCode,
                    transferSessionExpiresAt: expiresAt,
                    reconciliationStatus: 'AWAITING_WEBHOOK',
                },
            });
        } else {
            await tx.payment.create({
                data: {
                    bookingId: booking.id,
                    method: 'TRANSFER',
                    provider: 'SEPAY',
                    amount: booking.totalPrice,
                    referenceCode,
                    transferSessionExpiresAt: expiresAt,
                    reconciliationStatus: 'AWAITING_WEBHOOK',
                },
            });
        }
    });

    return {
        bookingId: booking.id,
        status: booking.status,
        referenceCode,
        expiresAt: expiresAt.toISOString(),
        qrCodeUrl: buildTransferQrUrl(booking.totalPrice, referenceCode),
        bankAccount: {
            bankName: appConfig.platformBank.name,
            accountName: appConfig.platformBank.accountName,
            accountNumber: appConfig.platformBank.accountNumber,
        },
    };
}

async function recordWebhookEvent(input: {
    providerEventId: string;
    provider: string;
    referenceCode?: string | null;
    payload: unknown;
    processingStatus: string;
    paymentId?: string;
    bookingId?: string;
}) {
    return prisma.paymentWebhookEvent.create({
        data: {
            providerEventId: input.providerEventId,
            provider: input.provider,
            referenceCode: input.referenceCode || null,
            payload: input.payload as Prisma.InputJsonValue,
            processingStatus: input.processingStatus,
            paymentId: input.paymentId,
            bookingId: input.bookingId,
            processedAt: new Date(),
        },
    });
}

export async function processSepayWebhook(payload: SepayWebhookPayload) {
    if (payload.transferType !== 'in') {
        return {
            acknowledged: true,
            duplicate: false,
            processingStatus: 'IGNORED_OUTGOING',
        };
    }

    const providerEventId = String(payload.id);
    const existingEvent = await prisma.paymentWebhookEvent.findUnique({
        where: { providerEventId },
    });

    if (existingEvent) {
        return {
            acknowledged: true,
            duplicate: true,
            processingStatus: existingEvent.processingStatus,
        };
    }

    const referenceCode = normalizeSepayReference(payload);
    const provider = 'SEPAY';
    const providerTxnId = payload.bankTransferId || payload.code || providerEventId;

    if (!referenceCode) {
        await recordWebhookEvent({
            providerEventId,
            provider,
            payload,
            processingStatus: 'UNMATCHED',
        });

        await prisma.auditLog.create({
            data: {
                eventType: 'BOOKING',
                actorRole: 'SYSTEM',
                action: 'PAYMENT_WEBHOOK_UNMATCHED',
                targetType: 'PAYMENT',
                details: payload as unknown as Prisma.InputJsonValue,
            },
        });

        return {
            acknowledged: true,
            duplicate: false,
            processingStatus: 'UNMATCHED',
        };
    }

    const payment = await prisma.payment.findFirst({
        where: { referenceCode },
        include: {
            booking: {
                include: {
                    user: {
                        select: { id: true, email: true, name: true },
                    },
                    court: {
                        select: {
                            id: true,
                            name: true,
                            venue: {
                                select: {
                                    id: true,
                                    name: true,
                                    manager: {
                                        select: {
                                            user: {
                                                select: { id: true, email: true },
                                            },
                                        },
                                    },
                                },
                            },
                        },
                    },
                },
            },
        },
    });

    if (!payment) {
        await recordWebhookEvent({
            providerEventId,
            provider,
            referenceCode,
            payload,
            processingStatus: 'UNMATCHED',
        });

        await prisma.auditLog.create({
            data: {
                eventType: 'BOOKING',
                actorRole: 'SYSTEM',
                action: 'PAYMENT_WEBHOOK_UNMATCHED',
                targetType: 'PAYMENT',
                details: payload as unknown as Prisma.InputJsonValue,
            },
        });

        return {
            acknowledged: true,
            duplicate: false,
            processingStatus: 'UNMATCHED',
        };
    }

    const booking = payment.booking;
    const now = new Date();
    const paidAt = parseSepayTransactionDate(payload.transactionDate);

    if (payment.amount !== payload.transferAmount) {
        await prisma.$transaction([
            prisma.payment.update({
                where: { id: payment.id },
                data: {
                    providerTxnId,
                    webhookReceivedAt: now,
                    rawPayload: payload as unknown as Prisma.InputJsonValue,
                    reconciliationStatus: 'AMOUNT_MISMATCH',
                },
            }),
            prisma.auditLog.create({
                data: {
                    eventType: 'BOOKING',
                    actorRole: 'SYSTEM',
                    action: 'PAYMENT_AMOUNT_MISMATCH',
                    targetType: 'BOOKING',
                    targetId: booking.id,
                    details: {
                        expectedAmount: payment.amount,
                        receivedAmount: payload.transferAmount,
                        referenceCode,
                    },
                },
            }),
        ]);

        await recordWebhookEvent({
            providerEventId,
            provider,
            referenceCode,
            payload,
            processingStatus: 'AMOUNT_MISMATCH',
            paymentId: payment.id,
            bookingId: booking.id,
        });

        return {
            acknowledged: true,
            duplicate: false,
            processingStatus: 'AMOUNT_MISMATCH',
        };
    }

    const stillWithinHold =
        booking.status === 'PENDING_PAYMENT' &&
        booking.pendingExpiresAt !== null &&
        booking.pendingExpiresAt.getTime() > Date.now();

    if (!stillWithinHold) {
        await prisma.$transaction([
            prisma.payment.update({
                where: { id: payment.id },
                data: {
                    providerTxnId,
                    webhookReceivedAt: now,
                    rawPayload: payload as unknown as Prisma.InputJsonValue,
                    reconciliationStatus: 'LATE_PAYMENT',
                },
            }),
            prisma.auditLog.create({
                data: {
                    eventType: 'BOOKING',
                    actorRole: 'SYSTEM',
                    action: 'PAYMENT_LATE_WEBHOOK',
                    targetType: 'BOOKING',
                    targetId: booking.id,
                    details: {
                        bookingStatus: booking.status,
                        referenceCode,
                        paidAt: paidAt.toISOString(),
                    },
                },
            }),
        ]);

        await recordWebhookEvent({
            providerEventId,
            provider,
            referenceCode,
            payload,
            processingStatus: 'LATE_PAYMENT',
            paymentId: payment.id,
            bookingId: booking.id,
        });

        return {
            acknowledged: true,
            duplicate: false,
            processingStatus: 'LATE_PAYMENT',
        };
    }

    await prisma.$transaction([
        prisma.payment.update({
            where: { id: payment.id },
            data: {
                providerTxnId,
                webhookReceivedAt: now,
                matchedAt: now,
                confirmedAt: now,
                transferTicked: true,
                rawPayload: payload as unknown as Prisma.InputJsonValue,
                reconciliationStatus: 'MATCHED',
            },
        }),
        prisma.booking.update({
            where: { id: booking.id },
            data: {
                status: 'CONFIRMED',
                paymentDeclaredAt: now,
                confirmedAt: now,
                pendingExpiresAt: null,
                waitingConfirmSince: null,
            },
        }),
        prisma.auditLog.create({
            data: {
                eventType: 'BOOKING',
                actorRole: 'SYSTEM',
                action: 'PAYMENT_AUTO_CONFIRMED',
                targetType: 'BOOKING',
                targetId: booking.id,
                details: {
                    referenceCode,
                    providerTxnId,
                    amount: payload.transferAmount,
                },
            },
        }),
    ]);

    await recordWebhookEvent({
        providerEventId,
        provider,
        referenceCode,
        payload,
        processingStatus: 'MATCHED',
        paymentId: payment.id,
        bookingId: booking.id,
    });

    sendToUser(booking.user.id, {
        type: 'booking:updated',
        payload: { bookingId: booking.id, status: 'CONFIRMED', action: 'payment_confirmed' },
    });

    const managerUserId = booking.court.venue.manager.user.id;
    sendToUser(managerUserId, {
        type: 'booking:updated',
        payload: { bookingId: booking.id, status: 'CONFIRMED', action: 'payment_confirmed' },
    });

    await notifyBookingStatusChange(
        booking.id,
        booking.user.id,
        'PAYMENT_CONFIRMED',
        'Thanh toán đã được xác nhận',
        'Hệ thống đã tự động xác nhận booking chuyển khoản của bạn.',
        booking.court.venue.id
    );

    await createAndDispatch({
        type: 'PAYMENT_CONFIRMED',
        role: 'MANAGER',
        managerId: managerUserId,
        venueId: booking.court.venue.id,
        bookingId: booking.id,
        title: 'Booking đã thanh toán thành công',
        body: `${booking.user.name || booking.user.email} đã thanh toán booking ${booking.court.name}`,
    });

    logger.info({
        event: 'payment.webhook.matched',
        bookingId: booking.id,
        referenceCode,
    });

    return {
        acknowledged: true,
        duplicate: false,
        processingStatus: 'MATCHED',
    };
}

export async function listPaymentReconciliationItems(): Promise<PaymentReconciliationItemDTO[]> {
    const events = await prisma.paymentWebhookEvent.findMany({
        where: {
            processingStatus: {
                in: ['UNMATCHED', 'LATE_PAYMENT', 'AMOUNT_MISMATCH'],
            },
        },
        orderBy: { receivedAt: 'desc' },
        include: {
            booking: {
                include: {
                    user: {
                        select: { email: true },
                    },
                    court: {
                        select: {
                            name: true,
                            venue: {
                                select: { name: true },
                            },
                        },
                    },
                },
            },
        },
    });

    return events.map((event) => {
        const payload = event.payload as SepayWebhookPayload;
        return {
            id: event.id,
            processingStatus: event.processingStatus,
            receivedAt: event.receivedAt.toISOString(),
            referenceCode: event.referenceCode,
            providerEventId: event.providerEventId,
            providerTxnId: payload.bankTransferId || payload.code || null,
            amount: typeof payload.transferAmount === 'number' ? payload.transferAmount : null,
            booking: event.booking
                ? {
                    id: event.booking.id,
                    status: event.booking.status,
                    date: event.booking.date.toISOString().split('T')[0],
                    startTime: event.booking.startTime,
                    endTime: event.booking.endTime,
                    totalPrice: event.booking.totalPrice,
                    venueName: event.booking.court.venue.name,
                    courtName: event.booking.court.name,
                    userEmail: event.booking.user.email,
                }
                : null,
        };
    });
}
