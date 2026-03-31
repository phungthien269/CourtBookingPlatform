import type { NextFunction, Request, Response } from 'express';
import { ApiError, respondError } from '../lib/api.js';
import { logger } from '../lib/logger.js';

export function notFoundHandler(_req: Request, res: Response) {
    return respondError(res, 404, 'NOT_FOUND', 'Không tìm thấy tài nguyên');
}

export function errorHandler(error: unknown, req: Request, res: Response, _next: NextFunction) {
    if (error instanceof ApiError) {
        return respondError(res, error.statusCode, error.code, error.message, error.details);
    }

    logger.error({
        event: 'http.unhandled_error',
        method: req.method,
        url: req.originalUrl,
        error,
    });

    return respondError(res, 500, 'INTERNAL_ERROR', 'Lỗi hệ thống');
}

