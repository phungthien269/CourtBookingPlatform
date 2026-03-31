import { Prisma } from '@prisma/client';
import prisma from '../lib/prisma.js';
import { appConfig } from '../lib/config.js';
import { logger } from '../lib/logger.js';
import { broadcast, sendToUser } from '../lib/websocket.js';
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

type BankWebhookPayload = {
    providerEventId: string;
    providerTxnId: string;
    referenceCode: string;
    amount: number;
    paidAt: string;
    provider?: string;
    metadata?: Record<string, unknown>;
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

export function buildTransferQrUrl(amount: number, referenceCode: string) {
    const params = new URLSearchParams({
        amount: String(amount),
        addInfo: referenceCode,
        accountName: appConfig.platformBank.accountName,
    });

    return `${appConfig.platformBank.qrBaseUrl}?${params.toString()}`;
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
                    provider: 'BANK_WEBHOOK_AGGREGATOR',
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
                    provider: 'BANK_WEBHOOK_AGGREGATOR',
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
    referenceCode?: string;
    payload: unknown;
    processingStatus: string;
    paymentId?: string;
    bookingId?: string;
}) {
    return prisma.paymentWebhookEvent.create({
        data: {
            providerEventId: input.providerEventId,
            provider: input.provider,
            referenceCode: input.referenceCode,
            payload: input.payload as object,
            processingStatus: input.processingStatus,
            paymentId: input.paymentId,
            bookingId: input.bookingId,
            processedAt: new Date(),
        },
    });
}

export async function processBankWebhook(payload: BankWebhookPayload) {
    const existingEvent = await prisma.paymentWebhookEvent.findUnique({
        where: { providerEventId: payload.providerEventId },
    });

    if (existingEvent) {
        return {
            acknowledged: true,
            duplicate: true,
            processingStatus: existingEvent.processingStatus,
        };
    }

    const provider = payload.provider || appConfig.paymentProviderName;
    const payment = await prisma.payment.findFirst({
        where: { referenceCode: payload.referenceCode },
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
            providerEventId: payload.providerEventId,
            provider,
            referenceCode: payload.referenceCode,
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
    const paidAt = new Date(payload.paidAt);

    if (payment.amount !== payload.amount) {
        await prisma.$transaction([
            prisma.payment.update({
                where: { id: payment.id },
                data: {
                    providerTxnId: payload.providerTxnId,
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
                        receivedAmount: payload.amount,
                        referenceCode: payload.referenceCode,
                    },
                },
            }),
        ]);

        await recordWebhookEvent({
            providerEventId: payload.providerEventId,
            provider,
            referenceCode: payload.referenceCode,
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
                    providerTxnId: payload.providerTxnId,
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
                        referenceCode: payload.referenceCode,
                        paidAt: paidAt.toISOString(),
                    },
                },
            }),
        ]);

        await recordWebhookEvent({
            providerEventId: payload.providerEventId,
            provider,
            referenceCode: payload.referenceCode,
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
                providerTxnId: payload.providerTxnId,
                webhookReceivedAt: now,
                matchedAt: now,
                confirmedAt: now,
                rawPayload: payload as unknown as Prisma.InputJsonValue,
                reconciliationStatus: 'MATCHED',
            },
        }),
        prisma.booking.update({
            where: { id: booking.id },
            data: {
                status: 'CONFIRMED',
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
                    referenceCode: payload.referenceCode,
                    providerTxnId: payload.providerTxnId,
                    amount: payload.amount,
                },
            },
        }),
    ]);

    await recordWebhookEvent({
        providerEventId: payload.providerEventId,
        provider,
        referenceCode: payload.referenceCode,
        payload,
        processingStatus: 'MATCHED',
        paymentId: payment.id,
        bookingId: booking.id,
    });

    broadcast({
        type: 'booking.payment.confirmed',
        payload: {
            bookingId: booking.id,
            userId: booking.userId,
            venueId: booking.court.venue.id,
            referenceCode: payload.referenceCode,
        },
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
        referenceCode: payload.referenceCode,
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
        const payload = event.payload as BankWebhookPayload;
        return {
            id: event.id,
            processingStatus: event.processingStatus,
            receivedAt: event.receivedAt.toISOString(),
            referenceCode: event.referenceCode,
            providerEventId: event.providerEventId,
            providerTxnId: payload.providerTxnId || null,
            amount: typeof payload.amount === 'number' ? payload.amount : null,
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
