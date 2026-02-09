import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'default-secret';

export interface AuthRequest extends Request {
    userId?: string;
    userEmail?: string;
    userRole?: string;
}

export function authMiddleware(
    req: AuthRequest,
    res: Response,
    next: NextFunction
) {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'No token provided' });
    }

    const token = authHeader.split(' ')[1];

    try {
        const decoded = jwt.verify(token, JWT_SECRET) as {
            userId: string;
            email: string;
            role: string;
        };

        req.userId = decoded.userId;
        req.userEmail = decoded.email;
        req.userRole = decoded.role;

        next();
    } catch (error) {
        return res.status(401).json({ error: 'Invalid token' });
    }
}

/**
 * Require MANAGER role middleware (Phase 5)
 */
export function requireManager(
    req: AuthRequest,
    res: Response,
    next: NextFunction
) {
    if (req.userRole !== 'MANAGER') {
        return res.status(403).json({ error: 'Manager role required' });
    }
    next();
}
