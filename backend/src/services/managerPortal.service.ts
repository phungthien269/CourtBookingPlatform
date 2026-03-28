import prisma from '../lib/prisma.js';

const SUBSCRIPTION_FEE_PER_COURT = 10_000;
const DEFAULT_TIMELINE_START_HOUR = 6;
const DEFAULT_TIMELINE_END_HOUR = 23;
const DAY_IN_MS = 24 * 60 * 60 * 1000;

type ManagerWorkspace = {
    id: string;
    displayName: string;
    subscriptionExpiresAt: Date | null;
    user: {
        id: string;
        email: string;
        name: string | null;
    };
    venue: {
        id: string;
        name: string;
        address: string;
        district: string;
        city: string;
        status: string;
        description: string | null;
        bankName: string | null;
        bankAccountNumber: string | null;
        bankAccountName: string | null;
        images: { id: string; url: string; isCover: boolean; createdAt: Date }[];
        courts: {
            id: string;
            name: string;
            pricePerHour: number;
            isActive: boolean;
            sportType: { code: string; name: string };
        }[];
        schedules: {
            id: string;
            dayOfWeek: number;
            openTime: string;
            closeTime: string;
        }[];
        holidays: {
            id: string;
            date: Date;
            note: string | null;
        }[];
    } | null;
};

export interface ManagerContextDTO {
    manager: {
        id: string;
        displayName: string;
        contactEmail: string;
        contactName: string | null;
    };
    venue: {
        id: string;
        name: string;
        address: string;
        district: string;
        city: string;
        status: string;
        activeCourtCount: number;
        totalCourtCount: number;
    };
    subscription: {
        expiresAt: string | null;
        daysRemaining: number | null;
        monthlyFeePerCourt: number;
        totalMonthlyFee: number;
        status: 'ACTIVE' | 'EXPIRING_SOON' | 'EXPIRED' | 'UNSET';
    };
}

export interface ManagerOverviewDTO {
    date: string;
    venue: ManagerContextDTO['venue'];
    subscription: ManagerContextDTO['subscription'];
    stats: {
        totalBookings: number;
        waitingConfirm: number;
        confirmed: number;
        cancelled: number;
        completed: number;
        revenue: number;
    };
    hours: number[];
    courts: Array<{
        id: string;
        name: string;
        sportTypeName: string;
        isActive: boolean;
        blocks: Array<{
            id: string;
            type: 'BOOKING' | 'BLACKOUT';
            status: string;
            startHour: number;
            endHour: number;
            startTime: string;
            endTime: string;
            title: string;
            subtitle: string;
            amount?: number;
        }>;
    }>;
    upcomingHolidays: Array<{
        id: string;
        date: string;
        note: string | null;
    }>;
}

export interface ManagerCourtListDTO {
    venue: {
        id: string;
        name: string;
        address: string;
        district: string;
        city: string;
        description: string | null;
        status: string;
        bankName: string | null;
        bankAccountNumber: string | null;
        bankAccountName: string | null;
        images: Array<{
            id: string;
            url: string;
            isCover: boolean;
        }>;
    };
    limits: {
        maxImages: number;
    };
    courts: Array<{
        id: string;
        name: string;
        pricePerHour: number;
        isActive: boolean;
        sportType: {
            code: string;
            name: string;
        };
        upcomingBookings: number;
    }>;
}

export interface ManagerScheduleDTO {
    venueId: string;
    weeklySchedules: Array<{
        id: string;
        dayOfWeek: number;
        openTime: string;
        closeTime: string;
    }>;
    holidays: Array<{
        id: string;
        date: string;
        note: string | null;
    }>;
    blackouts: Array<{
        id: string;
        courtId: string;
        courtName: string;
        date: string;
        startTime: string;
        endTime: string;
        reason: string | null;
    }>;
    courts: Array<{
        id: string;
        name: string;
        sportTypeName: string;
        isActive: boolean;
    }>;
}

export interface ManagerAnalyticsDTO {
    range: 'day' | 'week' | 'month';
    period: {
        startDate: string;
        endDate: string;
        label: string;
    };
    summary: {
        totalBookings: number;
        waitingConfirm: number;
        confirmed: number;
        cancelled: number;
        completed: number;
        totalRevenue: number;
        averageBookingValue: number;
        utilizedHours: number;
    };
    byDay: Array<{
        label: string;
        date: string;
        bookingCount: number;
        revenue: number;
    }>;
    byCourt: Array<{
        courtId: string;
        courtName: string;
        sportTypeName: string;
        bookingCount: number;
        confirmedCount: number;
        utilizedHours: number;
        revenue: number;
    }>;
    recentBookings: Array<{
        bookingId: string;
        date: string;
        startTime: string;
        endTime: string;
        status: string;
        totalPrice: number;
        courtName: string;
        userName: string;
        paymentMethod: string | null;
    }>;
}

export interface ManagerSubscriptionDTO {
    venueName: string;
    displayName: string;
    subscription: {
        expiresAt: string | null;
        daysRemaining: number | null;
        monthlyFeePerCourt: number;
        totalMonthlyFee: number;
        status: 'ACTIVE' | 'EXPIRING_SOON' | 'EXPIRED' | 'UNSET';
        activeCourtCount: number;
        totalCourtCount: number;
    };
    paymentInstruction: {
        bankName: string;
        accountName: string;
        accountNumber: string;
        qrCodeUrl: string;
        transferContent: string;
        note: string;
    };
    requests: Array<{
        id: string;
        months: number;
        courtCount: number;
        amount: number;
        requestedAt: string;
        note: string | null;
        status: string;
    }>;
}

type ScheduleInput = {
    dayOfWeek: number;
    openTime: string;
    closeTime: string;
};

type RenewalRequestResult = {
    id: string;
    months: number;
    courtCount: number;
    amount: number;
    requestedAt: string;
    note: string | null;
    status: string;
};

function getCurrentVnDateString(): string {
    const now = new Date();
    const utcTime = now.getTime() + now.getTimezoneOffset() * 60_000;
    const vnTime = new Date(utcTime + 7 * 60 * 60_000);
    return vnTime.toISOString().split('T')[0];
}

function parseDateOnly(dateStr: string): Date {
    return new Date(`${dateStr}T00:00:00.000Z`);
}

function addDays(dateStr: string, days: number): string {
    const date = parseDateOnly(dateStr);
    date.setUTCDate(date.getUTCDate() + days);
    return date.toISOString().split('T')[0];
}

function diffInDays(date: Date, baseDateStr: string): number {
    const compare = parseDateOnly(date.toISOString().split('T')[0]).getTime();
    const base = parseDateOnly(baseDateStr).getTime();
    return Math.ceil((compare - base) / DAY_IN_MS);
}

function parseHour(time: string): number {
    return Number.parseInt(time.slice(0, 2), 10);
}

function getSubscriptionStatus(
    expiresAt: Date | null,
    activeCourtCount: number
): ManagerContextDTO['subscription'] {
    if (!expiresAt) {
        return {
            expiresAt: null,
            daysRemaining: null,
            monthlyFeePerCourt: SUBSCRIPTION_FEE_PER_COURT,
            totalMonthlyFee: activeCourtCount * SUBSCRIPTION_FEE_PER_COURT,
            status: 'UNSET',
        };
    }

    const today = getCurrentVnDateString();
    const daysRemaining = diffInDays(expiresAt, today);
    let status: ManagerContextDTO['subscription']['status'] = 'ACTIVE';

    if (daysRemaining < 0) {
        status = 'EXPIRED';
    } else if (daysRemaining <= 7) {
        status = 'EXPIRING_SOON';
    }

    return {
        expiresAt: expiresAt.toISOString(),
        daysRemaining,
        monthlyFeePerCourt: SUBSCRIPTION_FEE_PER_COURT,
        totalMonthlyFee: activeCourtCount * SUBSCRIPTION_FEE_PER_COURT,
        status,
    };
}

async function getManagerWorkspace(userId: string): Promise<ManagerWorkspace | null> {
    return prisma.manager.findUnique({
        where: { userId },
        include: {
            user: {
                select: {
                    id: true,
                    email: true,
                    name: true,
                },
            },
            venue: {
                include: {
                    images: {
                        orderBy: [{ isCover: 'desc' }, { createdAt: 'asc' }],
                    },
                    courts: {
                        include: {
                            sportType: {
                                select: {
                                    code: true,
                                    name: true,
                                },
                            },
                        },
                        orderBy: {
                            name: 'asc',
                        },
                    },
                    schedules: {
                        orderBy: [{ dayOfWeek: 'asc' }, { openTime: 'asc' }],
                    },
                    holidays: {
                        orderBy: { date: 'asc' },
                    },
                },
            },
        },
    });
}

function ensureManagerWorkspace(workspace: ManagerWorkspace | null): asserts workspace is ManagerWorkspace & { venue: NonNullable<ManagerWorkspace['venue']> } {
    if (!workspace || !workspace.venue) {
        throw new Error('MANAGER_WORKSPACE_NOT_FOUND');
    }
}

function buildManagerContext(workspace: ManagerWorkspace & { venue: NonNullable<ManagerWorkspace['venue']> }): ManagerContextDTO {
    const activeCourtCount = workspace.venue.courts.filter((court) => court.isActive).length;

    return {
        manager: {
            id: workspace.id,
            displayName: workspace.displayName,
            contactEmail: workspace.user.email,
            contactName: workspace.user.name,
        },
        venue: {
            id: workspace.venue.id,
            name: workspace.venue.name,
            address: workspace.venue.address,
            district: workspace.venue.district,
            city: workspace.venue.city,
            status: workspace.venue.status,
            activeCourtCount,
            totalCourtCount: workspace.venue.courts.length,
        },
        subscription: getSubscriptionStatus(workspace.subscriptionExpiresAt, activeCourtCount),
    };
}

function formatTimelineHours(schedules: { dayOfWeek: number; openTime: string; closeTime: string }[], date: string): number[] {
    const weekday = parseDateOnly(date).getUTCDay();
    const daySchedules = schedules.filter((schedule) => schedule.dayOfWeek === weekday);

    const minHour = daySchedules.length > 0
        ? Math.min(...daySchedules.map((schedule) => parseHour(schedule.openTime)))
        : DEFAULT_TIMELINE_START_HOUR;
    const maxHour = daySchedules.length > 0
        ? Math.max(...daySchedules.map((schedule) => parseHour(schedule.closeTime)))
        : DEFAULT_TIMELINE_END_HOUR;

    return Array.from({ length: Math.max(1, maxHour - minHour) }, (_, index) => minHour + index);
}

function buildAnalyticsPeriod(range: 'day' | 'week' | 'month'): ManagerAnalyticsDTO['period'] {
    const today = getCurrentVnDateString();

    if (range === 'day') {
        return {
            startDate: today,
            endDate: today,
            label: 'Hôm nay',
        };
    }

    if (range === 'week') {
        const date = parseDateOnly(today);
        const weekday = date.getUTCDay() === 0 ? 7 : date.getUTCDay();
        const startDate = addDays(today, 1 - weekday);
        const endDate = addDays(startDate, 6);
        return {
            startDate,
            endDate,
            label: '7 ngày gần nhất',
        };
    }

    const monthStart = `${today.slice(0, 8)}01`;
    const date = parseDateOnly(monthStart);
    date.setUTCMonth(date.getUTCMonth() + 1);
    date.setUTCDate(0);

    return {
        startDate: monthStart,
        endDate: date.toISOString().split('T')[0],
        label: 'Tháng này',
    };
}

function createSubscriptionTransferContent(venueName: string): string {
    const normalized = venueName
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^A-Za-z0-9]/g, '')
        .toUpperCase()
        .slice(0, 16);

    return `GIAHAN-${normalized || 'VENUE'}`;
}

function parseAuditLogDetails(details: unknown): Record<string, unknown> {
    if (!details || typeof details !== 'object' || Array.isArray(details)) {
        return {};
    }

    return details as Record<string, unknown>;
}

function validateSchedulesInput(schedules: ScheduleInput[]): void {
    const grouped = new Map<number, ScheduleInput[]>();

    for (const schedule of schedules) {
        if (!grouped.has(schedule.dayOfWeek)) {
            grouped.set(schedule.dayOfWeek, []);
        }

        grouped.get(schedule.dayOfWeek)?.push(schedule);
    }

    for (const [dayOfWeek, items] of grouped.entries()) {
        const sorted = [...items].sort((a, b) => a.openTime.localeCompare(b.openTime));

        for (let index = 0; index < sorted.length; index += 1) {
            const current = sorted[index];

            if (current.openTime >= current.closeTime) {
                throw new Error(`INVALID_SCHEDULE_RANGE:${dayOfWeek}`);
            }

            const previous = sorted[index - 1];
            if (previous && previous.closeTime > current.openTime) {
                throw new Error(`OVERLAPPING_SCHEDULES:${dayOfWeek}`);
            }
        }
    }
}

export async function getManagerContext(userId: string): Promise<ManagerContextDTO> {
    const workspace = await getManagerWorkspace(userId);
    ensureManagerWorkspace(workspace);
    return buildManagerContext(workspace);
}

export async function getManagerOverview(userId: string, dateInput?: string): Promise<ManagerOverviewDTO> {
    const workspace = await getManagerWorkspace(userId);
    ensureManagerWorkspace(workspace);

    const selectedDate = dateInput || getCurrentVnDateString();
    const bookingDate = parseDateOnly(selectedDate);

    const [bookings, blackouts] = await Promise.all([
        prisma.booking.findMany({
            where: {
                date: bookingDate,
                court: {
                    venueId: workspace.venue.id,
                },
            },
            select: {
                id: true,
                status: true,
                startTime: true,
                endTime: true,
                totalPrice: true,
                paymentMethod: true,
                courtId: true,
                user: {
                    select: {
                        name: true,
                        email: true,
                    },
                },
            },
            orderBy: [{ startTime: 'asc' }],
        }),
        prisma.courtBlackout.findMany({
            where: {
                date: bookingDate,
                court: {
                    venueId: workspace.venue.id,
                },
            },
            select: {
                id: true,
                courtId: true,
                startTime: true,
                endTime: true,
                reason: true,
            },
        }),
    ]);

    const hours = formatTimelineHours(workspace.venue.schedules, selectedDate);
    const context = buildManagerContext(workspace);

    const stats = bookings.reduce(
        (accumulator, booking) => {
            accumulator.totalBookings += 1;

            if (booking.status === 'WAITING_MANAGER_CONFIRM') {
                accumulator.waitingConfirm += 1;
            }

            if (booking.status === 'CONFIRMED') {
                accumulator.confirmed += 1;
                accumulator.revenue += booking.totalPrice;
            }

            if (booking.status === 'COMPLETED') {
                accumulator.completed += 1;
                accumulator.revenue += booking.totalPrice;
            }

            if (booking.status.startsWith('CANCELLED') || booking.status === 'EXPIRED') {
                accumulator.cancelled += 1;
            }

            return accumulator;
        },
        {
            totalBookings: 0,
            waitingConfirm: 0,
            confirmed: 0,
            cancelled: 0,
            completed: 0,
            revenue: 0,
        }
    );

    const courts = workspace.venue.courts.map((court) => {
        const bookingBlocks = bookings
            .filter((booking) => booking.courtId === court.id)
            .map((booking) => ({
                id: booking.id,
                type: 'BOOKING' as const,
                status: booking.status,
                startHour: parseHour(booking.startTime),
                endHour: parseHour(booking.endTime),
                startTime: booking.startTime,
                endTime: booking.endTime,
                title: booking.user.name || booking.user.email,
                subtitle:
                    booking.paymentMethod === 'TRANSFER'
                        ? 'Chuyển khoản'
                        : booking.paymentMethod === 'CASH'
                            ? 'Tiền mặt'
                            : 'Booking',
                amount: booking.totalPrice,
            }));

        const blackoutBlocks = blackouts
            .filter((blackout) => blackout.courtId === court.id)
            .map((blackout) => ({
                id: blackout.id,
                type: 'BLACKOUT' as const,
                status: 'LOCKED',
                startHour: parseHour(blackout.startTime),
                endHour: parseHour(blackout.endTime),
                startTime: blackout.startTime,
                endTime: blackout.endTime,
                title: 'Khóa sân',
                subtitle: blackout.reason || 'Lịch chặn',
            }));

        return {
            id: court.id,
            name: court.name,
            sportTypeName: court.sportType.name,
            isActive: court.isActive,
            blocks: [...bookingBlocks, ...blackoutBlocks].sort((first, second) =>
                first.startTime.localeCompare(second.startTime)
            ),
        };
    });

    return {
        date: selectedDate,
        venue: context.venue,
        subscription: context.subscription,
        stats,
        hours,
        courts,
        upcomingHolidays: workspace.venue.holidays
            .filter((holiday) => holiday.date >= bookingDate)
            .slice(0, 5)
            .map((holiday) => ({
                id: holiday.id,
                date: holiday.date.toISOString().split('T')[0],
                note: holiday.note,
            })),
    };
}

export async function getManagerCourts(userId: string): Promise<ManagerCourtListDTO> {
    const workspace = await getManagerWorkspace(userId);
    ensureManagerWorkspace(workspace);

    const today = parseDateOnly(getCurrentVnDateString());
    const futureBookings = await prisma.booking.findMany({
        where: {
            date: {
                gte: today,
            },
            status: {
                in: ['WAITING_MANAGER_CONFIRM', 'CONFIRMED', 'COMPLETED'],
            },
            court: {
                venueId: workspace.venue.id,
            },
        },
        select: {
            courtId: true,
        },
    });

    const upcomingCounts = futureBookings.reduce<Map<string, number>>((map, booking) => {
        map.set(booking.courtId, (map.get(booking.courtId) || 0) + 1);
        return map;
    }, new Map<string, number>());

    return {
        venue: {
            id: workspace.venue.id,
            name: workspace.venue.name,
            address: workspace.venue.address,
            district: workspace.venue.district,
            city: workspace.venue.city,
            description: workspace.venue.description,
            status: workspace.venue.status,
            bankName: workspace.venue.bankName,
            bankAccountNumber: workspace.venue.bankAccountNumber,
            bankAccountName: workspace.venue.bankAccountName,
            images: workspace.venue.images.map((image) => ({
                id: image.id,
                url: image.url,
                isCover: image.isCover,
            })),
        },
        limits: {
            maxImages: 10,
        },
        courts: workspace.venue.courts.map((court) => ({
            id: court.id,
            name: court.name,
            pricePerHour: court.pricePerHour,
            isActive: court.isActive,
            sportType: {
                code: court.sportType.code,
                name: court.sportType.name,
            },
            upcomingBookings: upcomingCounts.get(court.id) || 0,
        })),
    };
}

export async function updateManagerCourt(
    userId: string,
    courtId: string,
    input: { name?: string; pricePerHour?: number; isActive?: boolean }
): Promise<ManagerCourtListDTO['courts'][number]> {
    const workspace = await getManagerWorkspace(userId);
    ensureManagerWorkspace(workspace);

    const existingCourt = workspace.venue.courts.find((court) => court.id === courtId);
    if (!existingCourt) {
        throw new Error('COURT_NOT_FOUND');
    }

    if (input.isActive === false) {
        const upcomingBlockingBookings = await prisma.booking.count({
            where: {
                courtId,
                date: {
                    gte: parseDateOnly(getCurrentVnDateString()),
                },
                status: {
                    in: ['WAITING_MANAGER_CONFIRM', 'CONFIRMED'],
                },
            },
        });

        if (upcomingBlockingBookings > 0) {
            throw new Error('COURT_HAS_UPCOMING_BOOKINGS');
        }
    }

    const updated = await prisma.court.update({
        where: { id: courtId },
        data: {
            name: input.name?.trim(),
            pricePerHour: input.pricePerHour,
            isActive: input.isActive,
        },
        include: {
            sportType: {
                select: {
                    code: true,
                    name: true,
                },
            },
        },
    });

    return {
        id: updated.id,
        name: updated.name,
        pricePerHour: updated.pricePerHour,
        isActive: updated.isActive,
        sportType: updated.sportType,
        upcomingBookings: 0,
    };
}

export async function addVenueImage(
    userId: string,
    input: { url: string; isCover?: boolean }
): Promise<ManagerCourtListDTO['venue']['images']> {
    const workspace = await getManagerWorkspace(userId);
    ensureManagerWorkspace(workspace);

    if (workspace.venue.images.length >= 10) {
        throw new Error('MAX_IMAGES_REACHED');
    }

    await prisma.$transaction(async (transaction) => {
        const shouldBeCover = Boolean(input.isCover) || workspace.venue.images.length === 0;

        if (shouldBeCover) {
            await transaction.venueImage.updateMany({
                where: { venueId: workspace.venue.id },
                data: { isCover: false },
            });
        }

        await transaction.venueImage.create({
            data: {
                venueId: workspace.venue.id,
                url: input.url,
                isCover: shouldBeCover,
            },
        });
    });

    const images = await prisma.venueImage.findMany({
        where: { venueId: workspace.venue.id },
        orderBy: [{ isCover: 'desc' }, { createdAt: 'asc' }],
    });

    return images.map((image) => ({
        id: image.id,
        url: image.url,
        isCover: image.isCover,
    }));
}

export async function deleteVenueImage(
    userId: string,
    imageId: string
): Promise<ManagerCourtListDTO['venue']['images']> {
    const workspace = await getManagerWorkspace(userId);
    ensureManagerWorkspace(workspace);

    const image = await prisma.venueImage.findFirst({
        where: {
            id: imageId,
            venueId: workspace.venue.id,
        },
    });

    if (!image) {
        throw new Error('IMAGE_NOT_FOUND');
    }

    await prisma.$transaction(async (transaction) => {
        await transaction.venueImage.delete({
            where: { id: imageId },
        });

        if (image.isCover) {
            const replacement = await transaction.venueImage.findFirst({
                where: { venueId: workspace.venue.id },
                orderBy: { createdAt: 'asc' },
            });

            if (replacement) {
                await transaction.venueImage.update({
                    where: { id: replacement.id },
                    data: { isCover: true },
                });
            }
        }
    });

    const images = await prisma.venueImage.findMany({
        where: { venueId: workspace.venue.id },
        orderBy: [{ isCover: 'desc' }, { createdAt: 'asc' }],
    });

    return images.map((item) => ({
        id: item.id,
        url: item.url,
        isCover: item.isCover,
    }));
}

export async function setVenueCoverImage(
    userId: string,
    imageId: string
): Promise<ManagerCourtListDTO['venue']['images']> {
    const workspace = await getManagerWorkspace(userId);
    ensureManagerWorkspace(workspace);

    const image = await prisma.venueImage.findFirst({
        where: {
            id: imageId,
            venueId: workspace.venue.id,
        },
    });

    if (!image) {
        throw new Error('IMAGE_NOT_FOUND');
    }

    await prisma.$transaction([
        prisma.venueImage.updateMany({
            where: { venueId: workspace.venue.id },
            data: { isCover: false },
        }),
        prisma.venueImage.update({
            where: { id: imageId },
            data: { isCover: true },
        }),
    ]);

    const images = await prisma.venueImage.findMany({
        where: { venueId: workspace.venue.id },
        orderBy: [{ isCover: 'desc' }, { createdAt: 'asc' }],
    });

    return images.map((item) => ({
        id: item.id,
        url: item.url,
        isCover: item.isCover,
    }));
}

export async function getManagerSchedule(userId: string): Promise<ManagerScheduleDTO> {
    const workspace = await getManagerWorkspace(userId);
    ensureManagerWorkspace(workspace);

    const blackouts = await prisma.courtBlackout.findMany({
        where: {
            court: {
                venueId: workspace.venue.id,
            },
            date: {
                gte: parseDateOnly(getCurrentVnDateString()),
            },
        },
        include: {
            court: {
                select: {
                    name: true,
                },
            },
        },
        orderBy: [{ date: 'asc' }, { startTime: 'asc' }],
        take: 30,
    });

    return {
        venueId: workspace.venue.id,
        weeklySchedules: workspace.venue.schedules.map((schedule) => ({
            id: schedule.id,
            dayOfWeek: schedule.dayOfWeek,
            openTime: schedule.openTime,
            closeTime: schedule.closeTime,
        })),
        holidays: workspace.venue.holidays
            .filter((holiday) => holiday.date >= parseDateOnly(getCurrentVnDateString()))
            .map((holiday) => ({
                id: holiday.id,
                date: holiday.date.toISOString().split('T')[0],
                note: holiday.note,
            })),
        blackouts: blackouts.map((blackout) => ({
            id: blackout.id,
            courtId: blackout.courtId,
            courtName: blackout.court.name,
            date: blackout.date.toISOString().split('T')[0],
            startTime: blackout.startTime,
            endTime: blackout.endTime,
            reason: blackout.reason,
        })),
        courts: workspace.venue.courts.map((court) => ({
            id: court.id,
            name: court.name,
            sportTypeName: court.sportType.name,
            isActive: court.isActive,
        })),
    };
}

export async function replaceWeeklySchedule(
    userId: string,
    schedules: ScheduleInput[]
): Promise<ManagerScheduleDTO['weeklySchedules']> {
    validateSchedulesInput(schedules);

    const workspace = await getManagerWorkspace(userId);
    ensureManagerWorkspace(workspace);

    await prisma.$transaction(async (transaction) => {
        await transaction.schedule.deleteMany({
            where: {
                venueId: workspace.venue.id,
            },
        });

        if (schedules.length > 0) {
            await transaction.schedule.createMany({
                data: schedules.map((schedule) => ({
                    venueId: workspace.venue.id,
                    dayOfWeek: schedule.dayOfWeek,
                    openTime: schedule.openTime,
                    closeTime: schedule.closeTime,
                })),
            });
        }
    });

    const updatedSchedules = await prisma.schedule.findMany({
        where: { venueId: workspace.venue.id },
        orderBy: [{ dayOfWeek: 'asc' }, { openTime: 'asc' }],
    });

    return updatedSchedules.map((schedule) => ({
        id: schedule.id,
        dayOfWeek: schedule.dayOfWeek,
        openTime: schedule.openTime,
        closeTime: schedule.closeTime,
    }));
}

export async function addManagerHoliday(
    userId: string,
    input: { date: string; note?: string }
): Promise<ManagerScheduleDTO['holidays'][number]> {
    const workspace = await getManagerWorkspace(userId);
    ensureManagerWorkspace(workspace);

    const date = parseDateOnly(input.date);
    const existing = await prisma.holiday.findFirst({
        where: {
            venueId: workspace.venue.id,
            date,
        },
    });

    if (existing) {
        throw new Error('HOLIDAY_ALREADY_EXISTS');
    }

    const holiday = await prisma.holiday.create({
        data: {
            venueId: workspace.venue.id,
            date,
            note: input.note?.trim() || null,
        },
    });

    return {
        id: holiday.id,
        date: holiday.date.toISOString().split('T')[0],
        note: holiday.note,
    };
}

export async function removeManagerHoliday(userId: string, holidayId: string): Promise<void> {
    const workspace = await getManagerWorkspace(userId);
    ensureManagerWorkspace(workspace);

    const holiday = await prisma.holiday.findFirst({
        where: {
            id: holidayId,
            venueId: workspace.venue.id,
        },
    });

    if (!holiday) {
        throw new Error('HOLIDAY_NOT_FOUND');
    }

    await prisma.holiday.delete({
        where: { id: holidayId },
    });
}

export async function addManagerBlackout(
    userId: string,
    input: { courtId: string; date: string; startTime: string; endTime: string; reason?: string }
): Promise<ManagerScheduleDTO['blackouts'][number]> {
    const workspace = await getManagerWorkspace(userId);
    ensureManagerWorkspace(workspace);

    const court = workspace.venue.courts.find((item) => item.id === input.courtId);
    if (!court) {
        throw new Error('COURT_NOT_FOUND');
    }

    if (input.startTime >= input.endTime) {
        throw new Error('INVALID_TIME_RANGE');
    }

    const date = parseDateOnly(input.date);

    const overlappingBlackout = await prisma.courtBlackout.findFirst({
        where: {
            courtId: input.courtId,
            date,
            startTime: { lt: input.endTime },
            endTime: { gt: input.startTime },
        },
    });

    if (overlappingBlackout) {
        throw new Error('BLACKOUT_OVERLAP');
    }

    const conflictingBooking = await prisma.booking.findFirst({
        where: {
            courtId: input.courtId,
            date,
            status: {
                in: ['WAITING_MANAGER_CONFIRM', 'CONFIRMED', 'COMPLETED'],
            },
            startTime: { lt: input.endTime },
            endTime: { gt: input.startTime },
        },
        select: { id: true },
    });

    if (conflictingBooking) {
        throw new Error('BLACKOUT_CONFLICTS_BOOKING');
    }

    const blackout = await prisma.courtBlackout.create({
        data: {
            courtId: input.courtId,
            date,
            startTime: input.startTime,
            endTime: input.endTime,
            reason: input.reason?.trim() || null,
        },
    });

    return {
        id: blackout.id,
        courtId: blackout.courtId,
        courtName: court.name,
        date: blackout.date.toISOString().split('T')[0],
        startTime: blackout.startTime,
        endTime: blackout.endTime,
        reason: blackout.reason,
    };
}

export async function removeManagerBlackout(userId: string, blackoutId: string): Promise<void> {
    const workspace = await getManagerWorkspace(userId);
    ensureManagerWorkspace(workspace);

    const blackout = await prisma.courtBlackout.findFirst({
        where: {
            id: blackoutId,
            court: {
                venueId: workspace.venue.id,
            },
        },
    });

    if (!blackout) {
        throw new Error('BLACKOUT_NOT_FOUND');
    }

    await prisma.courtBlackout.delete({
        where: { id: blackoutId },
    });
}

export async function getManagerAnalytics(
    userId: string,
    range: 'day' | 'week' | 'month'
): Promise<ManagerAnalyticsDTO> {
    const workspace = await getManagerWorkspace(userId);
    ensureManagerWorkspace(workspace);

    const period = buildAnalyticsPeriod(range);
    const startDate = parseDateOnly(period.startDate);
    const endExclusive = parseDateOnly(addDays(period.endDate, 1));

    const bookings = await prisma.booking.findMany({
        where: {
            court: {
                venueId: workspace.venue.id,
            },
            date: {
                gte: startDate,
                lt: endExclusive,
            },
        },
        select: {
            id: true,
            date: true,
            startTime: true,
            endTime: true,
            durationHours: true,
            status: true,
            totalPrice: true,
            paymentMethod: true,
            user: {
                select: {
                    name: true,
                    email: true,
                },
            },
            court: {
                select: {
                    id: true,
                    name: true,
                    sportType: {
                        select: {
                            name: true,
                        },
                    },
                },
            },
        },
        orderBy: [{ date: 'desc' }, { startTime: 'desc' }],
    });

    const summary = bookings.reduce(
        (accumulator, booking) => {
            accumulator.totalBookings += 1;

            if (booking.status === 'WAITING_MANAGER_CONFIRM') {
                accumulator.waitingConfirm += 1;
            }

            if (booking.status === 'CONFIRMED') {
                accumulator.confirmed += 1;
                accumulator.totalRevenue += booking.totalPrice;
                accumulator.utilizedHours += booking.durationHours;
            }

            if (booking.status === 'COMPLETED') {
                accumulator.completed += 1;
                accumulator.totalRevenue += booking.totalPrice;
                accumulator.utilizedHours += booking.durationHours;
            }

            if (booking.status.startsWith('CANCELLED') || booking.status === 'EXPIRED') {
                accumulator.cancelled += 1;
            }

            return accumulator;
        },
        {
            totalBookings: 0,
            waitingConfirm: 0,
            confirmed: 0,
            cancelled: 0,
            completed: 0,
            totalRevenue: 0,
            utilizedHours: 0,
        }
    );

    const byDayMap = new Map<string, { bookingCount: number; revenue: number }>();
    const byCourtMap = new Map<string, ManagerAnalyticsDTO['byCourt'][number]>();

    for (const court of workspace.venue.courts) {
        byCourtMap.set(court.id, {
            courtId: court.id,
            courtName: court.name,
            sportTypeName: court.sportType.name,
            bookingCount: 0,
            confirmedCount: 0,
            utilizedHours: 0,
            revenue: 0,
        });
    }

    for (const booking of bookings) {
        const dateKey = booking.date.toISOString().split('T')[0];
        const dayEntry = byDayMap.get(dateKey) || { bookingCount: 0, revenue: 0 };
        dayEntry.bookingCount += 1;
        if (booking.status === 'CONFIRMED' || booking.status === 'COMPLETED') {
            dayEntry.revenue += booking.totalPrice;
        }
        byDayMap.set(dateKey, dayEntry);

        const courtEntry = byCourtMap.get(booking.court.id);
        if (courtEntry) {
            courtEntry.bookingCount += 1;
            if (booking.status === 'CONFIRMED' || booking.status === 'COMPLETED') {
                courtEntry.confirmedCount += 1;
                courtEntry.utilizedHours += booking.durationHours;
                courtEntry.revenue += booking.totalPrice;
            }
        }
    }

    const byDay = Array.from(byDayMap.entries())
        .sort(([firstDate], [secondDate]) => firstDate.localeCompare(secondDate))
        .map(([date, values]) => ({
            date,
            label: new Intl.DateTimeFormat('vi-VN', {
                day: '2-digit',
                month: '2-digit',
            }).format(parseDateOnly(date)),
            bookingCount: values.bookingCount,
            revenue: values.revenue,
        }));

    const averageBookingValue =
        summary.confirmed + summary.completed > 0
            ? Math.round(summary.totalRevenue / (summary.confirmed + summary.completed))
            : 0;

    return {
        range,
        period,
        summary: {
            ...summary,
            averageBookingValue,
        },
        byDay,
        byCourt: Array.from(byCourtMap.values()).sort((first, second) => second.revenue - first.revenue),
        recentBookings: bookings.slice(0, 20).map((booking) => ({
            bookingId: booking.id,
            date: booking.date.toISOString().split('T')[0],
            startTime: booking.startTime,
            endTime: booking.endTime,
            status: booking.status,
            totalPrice: booking.totalPrice,
            courtName: booking.court.name,
            userName: booking.user.name || booking.user.email,
            paymentMethod: booking.paymentMethod,
        })),
    };
}

export async function getManagerSubscription(userId: string): Promise<ManagerSubscriptionDTO> {
    const workspace = await getManagerWorkspace(userId);
    ensureManagerWorkspace(workspace);

    const activeCourtCount = workspace.venue.courts.filter((court) => court.isActive).length;
    const subscription = getSubscriptionStatus(workspace.subscriptionExpiresAt, activeCourtCount);
    const transferContent = createSubscriptionTransferContent(workspace.venue.name);

    const requests = await prisma.auditLog.findMany({
        where: {
            actorId: workspace.user.id,
            action: 'SUBSCRIPTION_RENEWAL_REQUEST',
            targetType: 'MANAGER_SUBSCRIPTION',
            targetId: workspace.id,
        },
        orderBy: { createdAt: 'desc' },
        take: 20,
    });

    return {
        venueName: workspace.venue.name,
        displayName: workspace.displayName,
        subscription: {
            ...subscription,
            activeCourtCount,
            totalCourtCount: workspace.venue.courts.length,
        },
        paymentInstruction: {
            bankName: 'VietQR Platform',
            accountName: 'COURT BOOKING PLATFORM',
            accountNumber: '0909998888',
            qrCodeUrl: `https://placehold.co/360x360/14532d/FFFFFF?text=${transferContent}`,
            transferContent,
            note: 'Sau khi chuyển khoản, hệ thống sẽ ghi nhận yêu cầu gia hạn để admin xác nhận thủ công.',
        },
        requests: requests.map((request) => {
            const details = parseAuditLogDetails(request.details);
            return {
                id: request.id,
                months: Number(details.months || 1),
                courtCount: Number(details.courtCount || activeCourtCount),
                amount: Number(details.amount || 0),
                requestedAt: request.createdAt.toISOString(),
                note: typeof details.note === 'string' ? details.note : null,
                status: typeof details.status === 'string' ? details.status : 'PENDING_REVIEW',
            };
        }),
    };
}

export async function requestSubscriptionRenewal(
    userId: string,
    input: { months: number; note?: string }
): Promise<RenewalRequestResult> {
    const workspace = await getManagerWorkspace(userId);
    ensureManagerWorkspace(workspace);

    const activeCourtCount = workspace.venue.courts.filter((court) => court.isActive).length;
    const amount = activeCourtCount * SUBSCRIPTION_FEE_PER_COURT * input.months;

    const log = await prisma.auditLog.create({
        data: {
            actorId: workspace.user.id,
            actorEmail: workspace.user.email,
            actorRole: 'MANAGER',
            action: 'SUBSCRIPTION_RENEWAL_REQUEST',
            targetType: 'MANAGER_SUBSCRIPTION',
            targetId: workspace.id,
            details: {
                venueId: workspace.venue.id,
                venueName: workspace.venue.name,
                months: input.months,
                courtCount: activeCourtCount,
                amount,
                note: input.note?.trim() || null,
                status: 'PENDING_REVIEW',
            },
            eventType: 'MANAGER_SUBSCRIPTION',
        },
    });

    return {
        id: log.id,
        months: input.months,
        courtCount: activeCourtCount,
        amount,
        requestedAt: log.createdAt.toISOString(),
        note: input.note?.trim() || null,
        status: 'PENDING_REVIEW',
    };
}
