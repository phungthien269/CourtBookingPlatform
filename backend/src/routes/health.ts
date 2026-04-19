import { Router } from 'express';
import prisma from '../lib/prisma.js';
import { appConfig } from '../lib/config.js';
import { getWorkerHeartbeatStatus } from '../lib/worker.js';

const router = Router();

router.get('/', async (_req, res) => {
    const timestamp = new Date().toISOString();

    try {
        await prisma.$queryRaw`SELECT 1`;
        const worker = await getWorkerHeartbeatStatus();
        const workerRequired = appConfig.worker.runEmbeddedWorkers;
        const workerHealthy = worker.status === 'up' || (!workerRequired && worker.status === 'missing');
        const isReady = workerHealthy;

        return res.status(isReady ? 200 : 503).json({
            status: isReady ? 'ok' : 'degraded',
            timestamp,
            service: 'CourtBooking API',
            env: appConfig.nodeEnv,
            checks: {
                database: 'up',
                worker,
                workerRequired,
                websocket: appConfig.websocketEnabled ? 'enabled' : 'disabled',
            },
        });
    } catch {
        return res.status(503).json({
            status: 'down',
            timestamp,
            service: 'CourtBooking API',
            env: appConfig.nodeEnv,
            checks: {
                database: 'down',
            },
        });
    }
});

export default router;
