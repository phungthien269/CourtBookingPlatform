import { Prisma } from '@prisma/client';
import prisma from './prisma.js';
import { appConfig } from './config.js';

export async function updateWorkerHeartbeat(meta?: Record<string, unknown>) {
    await prisma.systemHeartbeat.upsert({
        where: { key: appConfig.worker.heartbeatKey },
        update: {
            meta: meta as Prisma.InputJsonValue | undefined,
        },
        create: {
            key: appConfig.worker.heartbeatKey,
            meta: meta as Prisma.InputJsonValue | undefined,
        },
    });
}

export async function getWorkerHeartbeatStatus() {
    const record = await prisma.systemHeartbeat.findUnique({
        where: { key: appConfig.worker.heartbeatKey },
    });

    if (!record) {
        return { status: 'missing' as const, lastSeenAt: null };
    }

    const maxAgeMs = appConfig.worker.heartbeatMaxAgeSeconds * 1000;
    const isHealthy = Date.now() - record.lastSeenAt.getTime() <= maxAgeMs;

    return {
        status: isHealthy ? ('up' as const) : ('stale' as const),
        lastSeenAt: record.lastSeenAt.toISOString(),
    };
}
