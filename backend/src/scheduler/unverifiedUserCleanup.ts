import prisma from '../lib/prisma.js';
import { appConfig } from '../lib/config.js';
import { logger } from '../lib/logger.js';

const CLEANUP_INTERVAL_MS = 60 * 1000;

async function runCleanup() {
    const cutoff = new Date(Date.now() - appConfig.unverifiedUserTtlMinutes * 60 * 1000);

    const result = await prisma.user.deleteMany({
        where: {
            isEmailVerified: false,
            createdAt: {
                lt: cutoff,
            },
        },
    });

    if (result.count > 0) {
        logger.info({
            event: 'auth.unverified_user_cleanup',
            deletedCount: result.count,
            cutoff: cutoff.toISOString(),
        });
    }
}

export function startUnverifiedUserCleanupScheduler() {
    void runCleanup().catch((error) => {
        logger.error({ event: 'auth.unverified_user_cleanup_failed', error });
    });

    setInterval(() => {
        void runCleanup().catch((error) => {
            logger.error({ event: 'auth.unverified_user_cleanup_failed', error });
        });
    }, CLEANUP_INTERVAL_MS);
}
