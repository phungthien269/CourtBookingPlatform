import pino from 'pino';
import { appConfig } from './config.js';

export const logger = pino({
    level: appConfig.logLevel,
    base: {
        service: 'courtbooking-backend',
        env: appConfig.nodeEnv,
    },
    timestamp: pino.stdTimeFunctions.isoTime,
});

