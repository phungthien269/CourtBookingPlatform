import type { NextFunction, Request, Response } from 'express';
import { randomUUID } from 'crypto';
import { logger } from '../lib/logger.js';

function getRequestId(req: Request) {
    const headerValue = req.header('x-request-id');
    return headerValue && headerValue.trim().length > 0 ? headerValue.trim() : randomUUID();
}

export function requestContextMiddleware(req: Request, res: Response, next: NextFunction) {
    const requestId = getRequestId(req);
    const startTime = Date.now();

    res.locals.requestId = requestId;
    res.setHeader('x-request-id', requestId);

    res.on('finish', () => {
        logger.info({
            event: 'http.request_completed',
            requestId,
            method: req.method,
            path: req.originalUrl,
            statusCode: res.statusCode,
            durationMs: Date.now() - startTime,
            ip: req.ip,
            userAgent: req.get('user-agent') || null,
        });
    });

    next();
}
