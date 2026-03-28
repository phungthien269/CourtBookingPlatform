import bcrypt from 'bcryptjs';
import prisma from '../lib/prisma.js';
import { createAndDispatch } from './notification.service.js';

type RenewalRequestStatus = 'PENDING_REVIEW' | 'APPROVED' | 'REJECTED';
type AdminManagerFilterStatus = 'ALL' | 'ACTIVE' | 'LOCKED' | 'EXPIRED' | 'NO_VENUE';
type AdminManagerAccessState = Exclude<AdminManagerFilterStatus, 'ALL'>;
type AdminAuditEventType = 'ALL' | 'MANAGER' | 'MANAGER_SUBSCRIPTION' | 'USER' | 'BOOKING' | 'SYSTEM' | 'ADMIN';

type JsonRecord = Record<string, unknown>;

type RenewalDetails = {
    venueId?: string;
    venueName?: string;
    months?: number;
    courtCount?: number;
    amount?: number;
    note?: string | null;
    status?: RenewalRequestStatus;
    reviewedAt?: string;
    reviewedByUserId?: string;
    reviewedByEmail?: string;
    reviewNote?: string | null;
    previousExpiresAt?: string | null;
    resolvedExpiresAt?: string | null;
};

export interface AdminRenewalRequestDTO {
    id: string;
    managerId: string;
    managerName: string;
    managerEmail: string;
    venueName: string;
    venueDistrict: string;
    currentExpiresAt: string | null;
    projectedExpiresAt: string | null;
    requestedAt: string;
    months: number;
    courtCount: number;
    amount: number;
    note: string | null;
    status: RenewalRequestStatus;
    reviewedAt: string | null;
    reviewedByEmail: string | null;
    reviewNote: string | null;
}

export interface AdminOverviewDTO {
    stats: {
        totalManagers: number;
        totalUsers: number;
        activeVenues: number;
        pendingRenewals: number;
        expiredSubscriptions: number;
        bookingsToday: number;
    };
    recentRenewalRequests: AdminRenewalRequestDTO[];
}

export interface AdminManagerDTO {
    id: string;
    displayName: string;
    contactName: string | null;
    email: string;
    createdAt: string;
    accessState: AdminManagerAccessState;
    userStatus: 'ACTIVE' | 'LOCKED';
    venue: {
        id: string;
        name: string;
        address: string;
        district: string;
        city: string;
        status: string;
    } | null;
    subscription: {
        expiresAt: string | null;
        daysRemaining: number | null;
        status: 'ACTIVE' | 'EXPIRED' | 'UNSET';
    };
    courtStats: {
        total: number;
        active: number;
    };
}

export interface AdminAuditLogDTO {
    id: string;
    createdAt: string;
    eventType: string;
    actorEmail: string | null;
    actorRole: string | null;
    action: string;
    targetType: string | null;
    targetId: string | null;
    targetLabel: string | null;
    summary: string;
    details: JsonRecord | null;
}

const DAY_IN_MS = 24 * 60 * 60 * 1000;

function parseJsonObject(details: unknown): JsonRecord {
    if (!details || typeof details !== 'object' || Array.isArray(details)) {
        return {};
    }

    return details as JsonRecord;
}

function parseRenewalDetails(details: unknown): RenewalDetails {
    return parseJsonObject(details) as RenewalDetails;
}

function ensurePending(details: RenewalDetails): void {
    const status = details.status || 'PENDING_REVIEW';
    if (status !== 'PENDING_REVIEW') {
        throw new Error('REQUEST_ALREADY_REVIEWED');
    }
}

function calculateProjectedExpiry(currentExpiry: Date | null, months: number): Date {
    const now = new Date();
    const base = currentExpiry && currentExpiry > now ? new Date(currentExpiry) : now;
    const projected = new Date(base);
    projected.setMonth(projected.getMonth() + months);
    return projected;
}

function getSubscriptionMeta(expiresAt: Date | null): {
    expiresAt: string | null;
    daysRemaining: number | null;
    status: 'ACTIVE' | 'EXPIRED' | 'UNSET';
} {
    if (!expiresAt) {
        return {
            expiresAt: null,
            daysRemaining: null,
            status: 'UNSET',
        };
    }

    const now = new Date();
    const diff = expiresAt.getTime() - now.getTime();
    const daysRemaining = Math.ceil(diff / DAY_IN_MS);

    return {
        expiresAt: expiresAt.toISOString(),
        daysRemaining,
        status: daysRemaining >= 0 ? 'ACTIVE' : 'EXPIRED',
    };
}

async function getRenewalLogs() {
    return prisma.auditLog.findMany({
        where: {
            action: 'SUBSCRIPTION_RENEWAL_REQUEST',
            targetType: 'MANAGER_SUBSCRIPTION',
        },
        orderBy: { createdAt: 'desc' },
        take: 200,
    });
}

async function getManagerMap(managerIds: string[]) {
    const managers = await prisma.manager.findMany({
        where: {
            id: { in: managerIds },
        },
        include: {
            user: {
                select: {
                    id: true,
                    email: true,
                    name: true,
                    status: true,
                },
            },
            venue: {
                include: {
                    courts: {
                        select: {
                            isActive: true,
                        },
                    },
                },
            },
        },
    });

    return new Map(managers.map((manager) => [manager.id, manager]));
}

function mapManagerAccessState(
    manager: Awaited<ReturnType<typeof getManagerMap>> extends Map<string, infer T> ? T : never
): AdminManagerAccessState {
    if (manager.user.status === 'LOCKED') {
        return 'LOCKED';
    }

    if (!manager.venue) {
        return 'NO_VENUE';
    }

    if (!manager.subscriptionExpiresAt || manager.subscriptionExpiresAt < new Date()) {
        return 'EXPIRED';
    }

    return 'ACTIVE';
}

function mapManagerDTO(
    manager: Awaited<ReturnType<typeof getManagerMap>> extends Map<string, infer T> ? T : never
): AdminManagerDTO {
    const subscription = getSubscriptionMeta(manager.subscriptionExpiresAt);
    const accessState = mapManagerAccessState(manager);
    const courts = manager.venue?.courts || [];

    return {
        id: manager.id,
        displayName: manager.displayName,
        contactName: manager.user.name,
        email: manager.user.email,
        createdAt: manager.createdAt.toISOString(),
        accessState,
        userStatus: manager.user.status,
        venue: manager.venue
            ? {
                id: manager.venue.id,
                name: manager.venue.name,
                address: manager.venue.address,
                district: manager.venue.district,
                city: manager.venue.city,
                status: manager.venue.status,
            }
            : null,
        subscription,
        courtStats: {
            total: courts.length,
            active: courts.filter((court) => court.isActive).length,
        },
    };
}

function mapRenewalRequest(
    log: Awaited<ReturnType<typeof getRenewalLogs>>[number],
    managerMap: Awaited<ReturnType<typeof getManagerMap>>
): AdminRenewalRequestDTO | null {
    if (!log.targetId) {
        return null;
    }

    const manager = managerMap.get(log.targetId);
    if (!manager || !manager.venue) {
        return null;
    }

    const details = parseRenewalDetails(log.details);
    const months = Number(details.months || 1);
    const status = details.status || 'PENDING_REVIEW';
    const projectedExpiresAt =
        status === 'APPROVED'
            ? details.resolvedExpiresAt || manager.subscriptionExpiresAt?.toISOString() || null
            : calculateProjectedExpiry(manager.subscriptionExpiresAt, months).toISOString();

    return {
        id: log.id,
        managerId: manager.id,
        managerName: manager.user.name || manager.user.email,
        managerEmail: manager.user.email,
        venueName: manager.venue.name,
        venueDistrict: manager.venue.district,
        currentExpiresAt: manager.subscriptionExpiresAt?.toISOString() || null,
        projectedExpiresAt,
        requestedAt: log.createdAt.toISOString(),
        months,
        courtCount: Number(details.courtCount || 0),
        amount: Number(details.amount || 0),
        note: typeof details.note === 'string' ? details.note : null,
        status,
        reviewedAt: details.reviewedAt || null,
        reviewedByEmail: details.reviewedByEmail || null,
        reviewNote: details.reviewNote || null,
    };
}

function buildAuditTargetLabel(
    log: { targetId: string | null; targetType: string | null; details: unknown },
    managerMap: Awaited<ReturnType<typeof getManagerMap>>
): string | null {
    if (log.targetId) {
        const manager = managerMap.get(log.targetId);
        if (manager) {
            return manager.venue?.name || manager.displayName || manager.user.email;
        }
    }

    const details = parseJsonObject(log.details);

    if (typeof details.venueName === 'string') return details.venueName;
    if (typeof details.displayName === 'string') return details.displayName;
    if (typeof details.email === 'string') return details.email;
    if (typeof details.requestId === 'string') return details.requestId;

    return log.targetId || null;
}

function buildAuditSummary(
    log: { action: string; details: unknown },
    targetLabel: string | null
): string {
    const details = parseJsonObject(log.details);
    const months = typeof details.months === 'number' ? details.months : null;
    const reviewNote = typeof details.reviewNote === 'string' ? details.reviewNote : null;

    switch (log.action) {
        case 'MANAGER_CREATED':
            return `Tạo tài khoản manager ${targetLabel || ''}`.trim();
        case 'MANAGER_LOCKED':
            return `Khóa tài khoản manager ${targetLabel || ''}`.trim();
        case 'MANAGER_UNLOCKED':
            return `Mở khóa tài khoản manager ${targetLabel || ''}`.trim();
        case 'SUBSCRIPTION_RENEWAL_REQUEST':
            return `${targetLabel || 'Manager'} gửi yêu cầu gia hạn${months ? ` ${months} tháng` : ''}`.trim();
        case 'SUBSCRIPTION_RENEWAL_APPROVED':
            return `Duyệt yêu cầu gia hạn${months ? ` ${months} tháng` : ''}`.trim();
        case 'SUBSCRIPTION_RENEWAL_REJECTED':
            return `Từ chối yêu cầu gia hạn${reviewNote ? `: ${reviewNote}` : ''}`.trim();
        default:
            return log.action;
    }
}

export async function getAdminOverview(): Promise<AdminOverviewDTO> {
    const [totalManagers, totalUsers, activeVenues, expiredSubscriptions, bookingsToday, logs] = await Promise.all([
        prisma.manager.count(),
        prisma.user.count({ where: { role: 'USER' } }),
        prisma.venue.count({ where: { status: 'ACTIVE' } }),
        prisma.manager.count({
            where: {
                subscriptionExpiresAt: {
                    lt: new Date(),
                },
            },
        }),
        prisma.booking.count({
            where: {
                date: new Date(new Date().toISOString().split('T')[0]),
            },
        }),
        getRenewalLogs(),
    ]);

    const managerIds = logs.map((log) => log.targetId).filter((id): id is string => Boolean(id));
    const managerMap = await getManagerMap(managerIds);
    const requests = logs
        .map((log) => mapRenewalRequest(log, managerMap))
        .filter((item): item is AdminRenewalRequestDTO => Boolean(item));

    return {
        stats: {
            totalManagers,
            totalUsers,
            activeVenues,
            pendingRenewals: requests.filter((request) => request.status === 'PENDING_REVIEW').length,
            expiredSubscriptions,
            bookingsToday,
        },
        recentRenewalRequests: requests.slice(0, 5),
    };
}

export async function listRenewalRequests(
    status: RenewalRequestStatus | 'ALL'
): Promise<AdminRenewalRequestDTO[]> {
    const logs = await getRenewalLogs();
    const managerIds = logs.map((log) => log.targetId).filter((id): id is string => Boolean(id));
    const managerMap = await getManagerMap(managerIds);

    return logs
        .map((log) => mapRenewalRequest(log, managerMap))
        .filter((item): item is AdminRenewalRequestDTO => Boolean(item))
        .filter((item) => (status === 'ALL' ? true : item.status === status));
}

export async function approveRenewalRequest(
    requestId: string,
    adminUserId: string,
    reviewNote?: string
): Promise<AdminRenewalRequestDTO> {
    const requestLog = await prisma.auditLog.findUnique({
        where: { id: requestId },
    });

    if (!requestLog || requestLog.action !== 'SUBSCRIPTION_RENEWAL_REQUEST' || !requestLog.targetId) {
        throw new Error('REQUEST_NOT_FOUND');
    }

    const details = parseRenewalDetails(requestLog.details);
    ensurePending(details);

    const [manager, adminUser] = await Promise.all([
        prisma.manager.findUnique({
            where: { id: requestLog.targetId },
            include: {
                user: {
                    select: { id: true, email: true, name: true, status: true },
                },
                venue: {
                    select: { name: true, district: true },
                },
            },
        }),
        prisma.user.findUnique({
            where: { id: adminUserId },
            select: { id: true, email: true },
        }),
    ]);

    if (!manager || !manager.venue || !adminUser) {
        throw new Error('REQUEST_NOT_FOUND');
    }

    const months = Number(details.months || 1);
    const nextExpiry = calculateProjectedExpiry(manager.subscriptionExpiresAt, months);
    const now = new Date();
    const trimmedReviewNote = reviewNote?.trim() || null;

    await prisma.$transaction([
        prisma.manager.update({
            where: { id: manager.id },
            data: {
                subscriptionExpiresAt: nextExpiry,
            },
        }),
        prisma.auditLog.update({
            where: { id: requestId },
            data: {
                details: {
                    ...details,
                    status: 'APPROVED',
                    reviewedAt: now.toISOString(),
                    reviewedByUserId: adminUser.id,
                    reviewedByEmail: adminUser.email,
                    reviewNote: trimmedReviewNote,
                    previousExpiresAt: manager.subscriptionExpiresAt?.toISOString() || null,
                    resolvedExpiresAt: nextExpiry.toISOString(),
                },
            },
        }),
        prisma.auditLog.create({
            data: {
                eventType: 'MANAGER_SUBSCRIPTION',
                actorId: adminUser.id,
                actorEmail: adminUser.email,
                actorRole: 'ADMIN',
                action: 'SUBSCRIPTION_RENEWAL_APPROVED',
                targetType: 'MANAGER_SUBSCRIPTION',
                targetId: manager.id,
                details: {
                    requestId,
                    months,
                    resolvedExpiresAt: nextExpiry.toISOString(),
                    reviewNote: trimmedReviewNote,
                },
            },
        }),
    ]);

    await createAndDispatch({
        type: 'SYSTEM',
        role: 'MANAGER',
        managerId: manager.user.id,
        venueId: details.venueId,
        title: 'Yêu cầu gia hạn đã được duyệt',
        body: `Admin đã duyệt gia hạn ${months} tháng cho ${manager.venue.name}`,
    });

    return {
        id: requestLog.id,
        managerId: manager.id,
        managerName: manager.user.name || manager.user.email,
        managerEmail: manager.user.email,
        venueName: manager.venue.name,
        venueDistrict: manager.venue.district,
        currentExpiresAt: nextExpiry.toISOString(),
        projectedExpiresAt: nextExpiry.toISOString(),
        requestedAt: requestLog.createdAt.toISOString(),
        months,
        courtCount: Number(details.courtCount || 0),
        amount: Number(details.amount || 0),
        note: typeof details.note === 'string' ? details.note : null,
        status: 'APPROVED',
        reviewedAt: now.toISOString(),
        reviewedByEmail: adminUser.email,
        reviewNote: trimmedReviewNote,
    };
}

export async function rejectRenewalRequest(
    requestId: string,
    adminUserId: string,
    reviewNote: string
): Promise<AdminRenewalRequestDTO> {
    const requestLog = await prisma.auditLog.findUnique({
        where: { id: requestId },
    });

    if (!requestLog || requestLog.action !== 'SUBSCRIPTION_RENEWAL_REQUEST' || !requestLog.targetId) {
        throw new Error('REQUEST_NOT_FOUND');
    }

    const details = parseRenewalDetails(requestLog.details);
    ensurePending(details);

    const [manager, adminUser] = await Promise.all([
        prisma.manager.findUnique({
            where: { id: requestLog.targetId },
            include: {
                user: {
                    select: { id: true, email: true, name: true, status: true },
                },
                venue: {
                    select: { name: true, district: true },
                },
            },
        }),
        prisma.user.findUnique({
            where: { id: adminUserId },
            select: { id: true, email: true },
        }),
    ]);

    if (!manager || !manager.venue || !adminUser) {
        throw new Error('REQUEST_NOT_FOUND');
    }

    const months = Number(details.months || 1);
    const now = new Date();
    const trimmedReviewNote = reviewNote.trim();

    await prisma.$transaction([
        prisma.auditLog.update({
            where: { id: requestId },
            data: {
                details: {
                    ...details,
                    status: 'REJECTED',
                    reviewedAt: now.toISOString(),
                    reviewedByUserId: adminUser.id,
                    reviewedByEmail: adminUser.email,
                    reviewNote: trimmedReviewNote,
                },
            },
        }),
        prisma.auditLog.create({
            data: {
                eventType: 'MANAGER_SUBSCRIPTION',
                actorId: adminUser.id,
                actorEmail: adminUser.email,
                actorRole: 'ADMIN',
                action: 'SUBSCRIPTION_RENEWAL_REJECTED',
                targetType: 'MANAGER_SUBSCRIPTION',
                targetId: manager.id,
                details: {
                    requestId,
                    months,
                    reviewNote: trimmedReviewNote,
                },
            },
        }),
    ]);

    await createAndDispatch({
        type: 'SYSTEM',
        role: 'MANAGER',
        managerId: manager.user.id,
        venueId: details.venueId,
        title: 'Yêu cầu gia hạn bị từ chối',
        body: `Admin từ chối yêu cầu gia hạn của ${manager.venue.name}. Lý do: ${trimmedReviewNote}`,
    });

    return {
        id: requestLog.id,
        managerId: manager.id,
        managerName: manager.user.name || manager.user.email,
        managerEmail: manager.user.email,
        venueName: manager.venue.name,
        venueDistrict: manager.venue.district,
        currentExpiresAt: manager.subscriptionExpiresAt?.toISOString() || null,
        projectedExpiresAt: null,
        requestedAt: requestLog.createdAt.toISOString(),
        months,
        courtCount: Number(details.courtCount || 0),
        amount: Number(details.amount || 0),
        note: typeof details.note === 'string' ? details.note : null,
        status: 'REJECTED',
        reviewedAt: now.toISOString(),
        reviewedByEmail: adminUser.email,
        reviewNote: trimmedReviewNote,
    };
}

export async function listManagers(filters: {
    status: AdminManagerFilterStatus;
    query?: string;
}): Promise<AdminManagerDTO[]> {
    const records = await prisma.manager.findMany({
        include: {
            user: {
                select: {
                    id: true,
                    email: true,
                    name: true,
                    status: true,
                },
            },
            venue: {
                include: {
                    courts: {
                        select: {
                            isActive: true,
                        },
                    },
                },
            },
        },
        orderBy: { createdAt: 'desc' },
    });

    const normalizedQuery = filters.query?.trim().toLowerCase();

    return records
        .map((manager) => mapManagerDTO(new Map([[manager.id, manager]]).get(manager.id)!))
        .filter((manager) => (filters.status === 'ALL' ? true : manager.accessState === filters.status))
        .filter((manager) => {
            if (!normalizedQuery) return true;

            const haystack = [
                manager.displayName,
                manager.contactName || '',
                manager.email,
                manager.venue?.name || '',
                manager.venue?.district || '',
            ]
                .join(' ')
                .toLowerCase();

            return haystack.includes(normalizedQuery);
        });
}

export async function createManagerAccount(
    payload: {
        email: string;
        password: string;
        name: string;
        displayName: string;
    },
    adminUserId: string
): Promise<AdminManagerDTO> {
    const [existingUser, adminUser] = await Promise.all([
        prisma.user.findUnique({
            where: { email: payload.email },
            select: { id: true },
        }),
        prisma.user.findUnique({
            where: { id: adminUserId },
            select: { id: true, email: true },
        }),
    ]);

    if (existingUser) {
        throw new Error('EMAIL_ALREADY_EXISTS');
    }

    if (!adminUser) {
        throw new Error('ADMIN_NOT_FOUND');
    }

    const passwordHash = await bcrypt.hash(payload.password, 12);

    const manager = await prisma.$transaction(async (tx) => {
        const user = await tx.user.create({
            data: {
                email: payload.email,
                passwordHash,
                name: payload.name,
                role: 'MANAGER',
                isEmailVerified: true,
                status: 'ACTIVE',
            },
        });

        const createdManager = await tx.manager.create({
            data: {
                userId: user.id,
                displayName: payload.displayName,
            },
            include: {
                user: {
                    select: {
                        id: true,
                        email: true,
                        name: true,
                        status: true,
                    },
                },
                venue: {
                    include: {
                        courts: {
                            select: {
                                isActive: true,
                            },
                        },
                    },
                },
            },
        });

        await tx.auditLog.create({
            data: {
                eventType: 'MANAGER',
                actorId: adminUser.id,
                actorEmail: adminUser.email,
                actorRole: 'ADMIN',
                action: 'MANAGER_CREATED',
                targetType: 'MANAGER',
                targetId: createdManager.id,
                details: {
                    email: payload.email,
                    name: payload.name,
                    displayName: payload.displayName,
                },
            },
        });

        return createdManager;
    });

    return mapManagerDTO(new Map([[manager.id, manager]]).get(manager.id)!);
}

export async function updateManagerAccountStatus(
    managerId: string,
    status: 'ACTIVE' | 'LOCKED',
    adminUserId: string
): Promise<AdminManagerDTO> {
    const [manager, adminUser] = await Promise.all([
        prisma.manager.findUnique({
            where: { id: managerId },
            include: {
                user: {
                    select: {
                        id: true,
                        email: true,
                        name: true,
                        status: true,
                    },
                },
                venue: {
                    include: {
                        courts: {
                            select: {
                                isActive: true,
                            },
                        },
                    },
                },
            },
        }),
        prisma.user.findUnique({
            where: { id: adminUserId },
            select: { id: true, email: true },
        }),
    ]);

    if (!manager) {
        throw new Error('MANAGER_NOT_FOUND');
    }

    if (!adminUser) {
        throw new Error('ADMIN_NOT_FOUND');
    }

    const updatedManager = await prisma.$transaction(async (tx) => {
        await tx.user.update({
            where: { id: manager.user.id },
            data: { status },
        });

        await tx.auditLog.create({
            data: {
                eventType: 'MANAGER',
                actorId: adminUser.id,
                actorEmail: adminUser.email,
                actorRole: 'ADMIN',
                action: status === 'LOCKED' ? 'MANAGER_LOCKED' : 'MANAGER_UNLOCKED',
                targetType: 'MANAGER',
                targetId: manager.id,
                details: {
                    email: manager.user.email,
                    displayName: manager.displayName,
                    nextStatus: status,
                },
            },
        });

        return tx.manager.findUnique({
            where: { id: manager.id },
            include: {
                user: {
                    select: {
                        id: true,
                        email: true,
                        name: true,
                        status: true,
                    },
                },
                venue: {
                    include: {
                        courts: {
                            select: {
                                isActive: true,
                            },
                        },
                    },
                },
            },
        });
    });

    if (!updatedManager) {
        throw new Error('MANAGER_NOT_FOUND');
    }

    await createAndDispatch({
        type: 'SYSTEM',
        role: 'MANAGER',
        managerId: manager.user.id,
        venueId: manager.venue?.id,
        title: status === 'LOCKED' ? 'Tài khoản manager đã bị khóa' : 'Tài khoản manager đã được mở khóa',
        body:
            status === 'LOCKED'
                ? 'Admin đã khóa tài khoản manager của bạn. Vui lòng liên hệ platform để được hỗ trợ.'
                : 'Admin đã mở khóa tài khoản manager của bạn. Bạn có thể đăng nhập lại hệ thống.',
    });

    return mapManagerDTO(new Map([[updatedManager.id, updatedManager]]).get(updatedManager.id)!);
}

export async function listAuditLogs(filters: {
    eventType?: AdminAuditEventType;
    query?: string;
    fromDate?: string;
    toDate?: string;
    limit: number;
}): Promise<AdminAuditLogDTO[]> {
    const where: {
        eventType?: string;
        createdAt?: { gte?: Date; lte?: Date };
        OR?: Array<Record<string, { contains: string; mode: 'insensitive' }>>;
    } = {};

    if (filters.eventType && filters.eventType !== 'ALL') {
        where.eventType = filters.eventType;
    }

    if (filters.fromDate || filters.toDate) {
        where.createdAt = {};
        if (filters.fromDate) {
            where.createdAt.gte = new Date(`${filters.fromDate}T00:00:00.000`);
        }
        if (filters.toDate) {
            where.createdAt.lte = new Date(`${filters.toDate}T23:59:59.999`);
        }
    }

    if (filters.query?.trim()) {
        const query = filters.query.trim();
        where.OR = [
            { actorEmail: { contains: query, mode: 'insensitive' } },
            { actorRole: { contains: query, mode: 'insensitive' } },
            { action: { contains: query, mode: 'insensitive' } },
            { targetType: { contains: query, mode: 'insensitive' } },
            { targetId: { contains: query, mode: 'insensitive' } },
            { eventType: { contains: query, mode: 'insensitive' } },
        ];
    }

    const logs = await prisma.auditLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: filters.limit,
    });

    const managerIds = logs.map((log) => log.targetId).filter((id): id is string => Boolean(id));
    const managerMap = await getManagerMap(managerIds);

    return logs.map((log) => {
        const details = parseJsonObject(log.details);
        const targetLabel = buildAuditTargetLabel(log, managerMap);

        return {
            id: log.id,
            createdAt: log.createdAt.toISOString(),
            eventType: log.eventType,
            actorEmail: log.actorEmail || null,
            actorRole: log.actorRole || null,
            action: log.action,
            targetType: log.targetType || null,
            targetId: log.targetId || null,
            targetLabel,
            summary: buildAuditSummary(log, targetLabel),
            details: Object.keys(details).length > 0 ? details : null,
        };
    });
}
