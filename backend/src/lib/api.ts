import type { Response } from 'express';

export interface ApiErrorShape {
    code: string;
    message: string;
    details?: unknown;
}

export class ApiError extends Error {
    statusCode: number;
    code: string;
    details?: unknown;

    constructor(statusCode: number, code: string, message: string, details?: unknown) {
        super(message);
        this.statusCode = statusCode;
        this.code = code;
        this.details = details;
    }
}

export function respondSuccess<T>(res: Response, data: T, statusCode = 200) {
    return res.status(statusCode).json({
        success: true,
        data,
    });
}

export function respondError(res: Response, statusCode: number, code: string, message: string, details?: unknown) {
    return res.status(statusCode).json({
        success: false,
        error: {
            code,
            message,
            ...(details !== undefined ? { details } : {}),
        },
    });
}

