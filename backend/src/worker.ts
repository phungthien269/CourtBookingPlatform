import 'dotenv/config';
import { appConfig } from './lib/config.js';
import { logger } from './lib/logger.js';
import { updateWorkerHeartbeat } from './lib/worker.js';
import { startExpiryScheduler } from './scheduler/pendingExpiry.js';
import { startManagerConfirmTimeoutScheduler } from './scheduler/managerConfirmTimeout.js';

async function main() {
    logger.info({
        event: 'worker.started',
        heartbeatKey: appConfig.worker.heartbeatKey,
    });

    await updateWorkerHeartbeat({ bootedAt: new Date().toISOString() });
    startExpiryScheduler();
    startManagerConfirmTimeoutScheduler();

    setInterval(() => {
        void updateWorkerHeartbeat({ source: 'worker', updatedAt: new Date().toISOString() });
    }, 30_000);
}

main().catch((error) => {
    logger.error({ event: 'worker.crash', error });
    process.exit(1);
});
