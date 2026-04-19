import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import { createServer } from 'http';
import healthRouter from './routes/health.js';
import authRouter from './routes/auth.js';
import venueRouter from './routes/venue.js';
import courtRouter from './routes/court.js';
import bookingRouter from './routes/booking.js';
import managerRouter from './routes/manager.js';
import reviewRouter from './routes/review.js';
import chatRouter from './routes/chat.js';
import notificationRouter from './routes/notification.js';
import adminRouter from './routes/admin.js';
import paymentRouter from './routes/payments.js';
import { initWebSocket } from './lib/websocket.js';
import { startExpiryScheduler } from './scheduler/pendingExpiry.js';
import { startManagerConfirmTimeoutScheduler } from './scheduler/managerConfirmTimeout.js';
import { startUnverifiedUserCleanupScheduler } from './scheduler/unverifiedUserCleanup.js';
import { appConfig } from './lib/config.js';
import { logger } from './lib/logger.js';
import { notFoundHandler, errorHandler } from './middleware/error.js';
import { requestContextMiddleware } from './middleware/requestContext.js';

const app = express();
const server = createServer(app);

app.disable('x-powered-by');
app.set('trust proxy', appConfig.trustProxy);

app.use(
    cors({
        origin: appConfig.corsOrigins,
        credentials: true,
    })
);
app.use(
    helmet({
        crossOriginResourcePolicy: { policy: 'cross-origin' },
    })
);
app.use(compression());
app.use(requestContextMiddleware);
app.use(express.json({ limit: appConfig.requestSizeLimit }));
app.use(express.urlencoded({ extended: true, limit: appConfig.requestSizeLimit }));

app.use('/api/health', healthRouter);
app.use('/api/auth', authRouter);
app.use('/api/venues', venueRouter);
app.use('/api/courts', courtRouter);
app.use('/api/bookings', bookingRouter);
app.use('/api/payments', paymentRouter);
app.use('/api/manager', managerRouter);
app.use('/api/admin', adminRouter);
app.use('/api', reviewRouter);
app.use('/api/chat', chatRouter);
app.use('/api/notifications', notificationRouter);

app.use(notFoundHandler);
app.use(errorHandler);

if (appConfig.websocketEnabled) {
    initWebSocket(server);
}

startExpiryScheduler();
startManagerConfirmTimeoutScheduler();
startUnverifiedUserCleanupScheduler();

server.listen(appConfig.port, () => {
    logger.info({
        event: 'server.started',
        port: appConfig.port,
        appUrl: appConfig.appUrl,
        websocketEnabled: appConfig.websocketEnabled,
    });
});

function shutdown(signal: string) {
    logger.info({ event: 'server.shutdown_requested', signal });

    server.close((error) => {
        if (error) {
            logger.error({ event: 'server.shutdown_failed', signal, error });
            process.exit(1);
        }

        logger.info({ event: 'server.shutdown_completed', signal });
        process.exit(0);
    });

    setTimeout(() => {
        logger.error({ event: 'server.shutdown_forced', signal });
        process.exit(1);
    }, 10_000).unref();
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
