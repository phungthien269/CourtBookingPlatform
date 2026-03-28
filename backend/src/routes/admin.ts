import { NextFunction, Response, Router } from 'express';
import { z } from 'zod';
import { authMiddleware, AuthRequest } from '../middleware/auth.js';
import {
    approveRenewalRequest,
    createManagerAccount,
    getAdminOverview,
    listAuditLogs,
    listManagers,
    listRenewalRequests,
    rejectRenewalRequest,
    updateManagerAccountStatus,
} from '../services/adminPortal.service.js';

const router = Router();

const dateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/u, 'Ngày phải theo định dạng YYYY-MM-DD');

const renewalStatusSchema = z.object({
    status: z.enum(['ALL', 'PENDING_REVIEW', 'APPROVED', 'REJECTED']).default('ALL'),
});

const managerListQuerySchema = z.object({
    status: z.enum(['ALL', 'ACTIVE', 'LOCKED', 'EXPIRED', 'NO_VENUE']).default('ALL'),
    query: z.string().trim().optional(),
});

const createManagerSchema = z.object({
    email: z.string().email('Email không hợp lệ'),
    password: z.string().min(8, 'Mật khẩu phải có ít nhất 8 ký tự'),
    name: z.string().trim().min(2, 'Tên người liên hệ phải có ít nhất 2 ký tự').max(80),
    displayName: z.string().trim().min(2, 'Tên hiển thị phải có ít nhất 2 ký tự').max(80),
});

const updateManagerStatusSchema = z.object({
    status: z.enum(['ACTIVE', 'LOCKED']),
});

const auditLogsQuerySchema = z
    .object({
        eventType: z.enum(['ALL', 'MANAGER', 'MANAGER_SUBSCRIPTION', 'USER', 'BOOKING', 'SYSTEM', 'ADMIN']).default('ALL'),
        query: z.string().trim().optional(),
        fromDate: dateSchema.optional(),
        toDate: dateSchema.optional(),
        limit: z.coerce.number().int().min(1).max(200).default(100),
    })
    .refine((value) => {
        if (!value.fromDate || !value.toDate) return true;
        return value.fromDate <= value.toDate;
    }, {
        message: 'Khoảng ngày không hợp lệ',
        path: ['toDate'],
    });

const approveRequestSchema = z.object({
    reviewNote: z.string().trim().max(300).optional(),
});

const rejectRequestSchema = z.object({
    reviewNote: z.string().trim().min(5, 'Lý do phải có ít nhất 5 ký tự').max(300),
});

function requireAdmin(req: AuthRequest, res: Response, next: NextFunction) {
    if (req.userRole !== 'ADMIN') {
        return res.status(403).json({
            success: false,
            error: { code: 'FORBIDDEN', message: 'Chỉ admin mới có quyền truy cập' },
        });
    }

    next();
}

function requireUserId(req: AuthRequest, res: Response): string | null {
    if (!req.userId) {
        res.status(401).json({
            success: false,
            error: { code: 'UNAUTHORIZED', message: 'Bạn cần đăng nhập' },
        });
        return null;
    }

    return req.userId;
}

function mapAdminPortalError(error: unknown): { status: number; code: string; message: string } {
    const message = error instanceof Error ? error.message : 'INTERNAL_ERROR';

    switch (message) {
        case 'REQUEST_NOT_FOUND':
            return { status: 404, code: 'REQUEST_NOT_FOUND', message: 'Không tìm thấy yêu cầu gia hạn' };
        case 'REQUEST_ALREADY_REVIEWED':
            return { status: 400, code: 'REQUEST_ALREADY_REVIEWED', message: 'Yêu cầu này đã được xử lý' };
        case 'EMAIL_ALREADY_EXISTS':
            return { status: 400, code: 'EMAIL_ALREADY_EXISTS', message: 'Email này đã tồn tại trong hệ thống' };
        case 'MANAGER_NOT_FOUND':
            return { status: 404, code: 'MANAGER_NOT_FOUND', message: 'Không tìm thấy manager cần thao tác' };
        case 'ADMIN_NOT_FOUND':
            return { status: 404, code: 'ADMIN_NOT_FOUND', message: 'Không tìm thấy tài khoản admin' };
        default:
            return { status: 500, code: 'INTERNAL_ERROR', message: 'Lỗi hệ thống' };
    }
}

router.get('/overview', authMiddleware, requireAdmin, async (req: AuthRequest, res: Response) => {
    try {
        const userId = requireUserId(req, res);
        if (!userId) return;

        const data = await getAdminOverview();
        return res.json({ success: true, data });
    } catch (error) {
        const mapped = mapAdminPortalError(error);
        console.error('❌ Get admin overview error:', error);
        return res.status(mapped.status).json({ success: false, error: { code: mapped.code, message: mapped.message } });
    }
});

router.get('/renewal-requests', authMiddleware, requireAdmin, async (req: AuthRequest, res: Response) => {
    try {
        const userId = requireUserId(req, res);
        if (!userId) return;

        const parsed = renewalStatusSchema.safeParse(req.query);
        if (!parsed.success) {
            return res.status(400).json({
                success: false,
                error: { code: 'VALIDATION_ERROR', message: parsed.error.errors[0].message },
            });
        }

        const data = await listRenewalRequests(parsed.data.status);
        return res.json({ success: true, data });
    } catch (error) {
        const mapped = mapAdminPortalError(error);
        console.error('❌ List renewal requests error:', error);
        return res.status(mapped.status).json({ success: false, error: { code: mapped.code, message: mapped.message } });
    }
});

router.get('/managers', authMiddleware, requireAdmin, async (req: AuthRequest, res: Response) => {
    try {
        const userId = requireUserId(req, res);
        if (!userId) return;

        const parsed = managerListQuerySchema.safeParse(req.query);
        if (!parsed.success) {
            return res.status(400).json({
                success: false,
                error: { code: 'VALIDATION_ERROR', message: parsed.error.errors[0].message },
            });
        }

        const data = await listManagers(parsed.data);
        return res.json({ success: true, data });
    } catch (error) {
        const mapped = mapAdminPortalError(error);
        console.error('❌ List managers error:', error);
        return res.status(mapped.status).json({ success: false, error: { code: mapped.code, message: mapped.message } });
    }
});

router.post('/managers', authMiddleware, requireAdmin, async (req: AuthRequest, res: Response) => {
    try {
        const userId = requireUserId(req, res);
        if (!userId) return;

        const parsed = createManagerSchema.safeParse(req.body);
        if (!parsed.success) {
            return res.status(400).json({
                success: false,
                error: { code: 'VALIDATION_ERROR', message: parsed.error.errors[0].message },
            });
        }

        const data = await createManagerAccount(parsed.data, userId);
        return res.status(201).json({ success: true, data });
    } catch (error) {
        const mapped = mapAdminPortalError(error);
        console.error('❌ Create manager error:', error);
        return res.status(mapped.status).json({ success: false, error: { code: mapped.code, message: mapped.message } });
    }
});

router.post('/managers/:id/status', authMiddleware, requireAdmin, async (req: AuthRequest, res: Response) => {
    try {
        const userId = requireUserId(req, res);
        if (!userId) return;

        const parsed = updateManagerStatusSchema.safeParse(req.body);
        if (!parsed.success) {
            return res.status(400).json({
                success: false,
                error: { code: 'VALIDATION_ERROR', message: parsed.error.errors[0].message },
            });
        }

        const data = await updateManagerAccountStatus(req.params.id, parsed.data.status, userId);
        return res.json({ success: true, data });
    } catch (error) {
        const mapped = mapAdminPortalError(error);
        console.error('❌ Update manager status error:', error);
        return res.status(mapped.status).json({ success: false, error: { code: mapped.code, message: mapped.message } });
    }
});

router.get('/audit-logs', authMiddleware, requireAdmin, async (req: AuthRequest, res: Response) => {
    try {
        const userId = requireUserId(req, res);
        if (!userId) return;

        const parsed = auditLogsQuerySchema.safeParse(req.query);
        if (!parsed.success) {
            return res.status(400).json({
                success: false,
                error: { code: 'VALIDATION_ERROR', message: parsed.error.errors[0].message },
            });
        }

        const data = await listAuditLogs(parsed.data);
        return res.json({ success: true, data });
    } catch (error) {
        const mapped = mapAdminPortalError(error);
        console.error('❌ List audit logs error:', error);
        return res.status(mapped.status).json({ success: false, error: { code: mapped.code, message: mapped.message } });
    }
});

router.post('/renewal-requests/:id/approve', authMiddleware, requireAdmin, async (req: AuthRequest, res: Response) => {
    try {
        const userId = requireUserId(req, res);
        if (!userId) return;

        const parsed = approveRequestSchema.safeParse(req.body);
        if (!parsed.success) {
            return res.status(400).json({
                success: false,
                error: { code: 'VALIDATION_ERROR', message: parsed.error.errors[0].message },
            });
        }

        const data = await approveRenewalRequest(req.params.id, userId, parsed.data.reviewNote);
        return res.json({ success: true, data });
    } catch (error) {
        const mapped = mapAdminPortalError(error);
        console.error('❌ Approve renewal request error:', error);
        return res.status(mapped.status).json({ success: false, error: { code: mapped.code, message: mapped.message } });
    }
});

router.post('/renewal-requests/:id/reject', authMiddleware, requireAdmin, async (req: AuthRequest, res: Response) => {
    try {
        const userId = requireUserId(req, res);
        if (!userId) return;

        const parsed = rejectRequestSchema.safeParse(req.body);
        if (!parsed.success) {
            return res.status(400).json({
                success: false,
                error: { code: 'VALIDATION_ERROR', message: parsed.error.errors[0].message },
            });
        }

        const data = await rejectRenewalRequest(req.params.id, userId, parsed.data.reviewNote);
        return res.json({ success: true, data });
    } catch (error) {
        const mapped = mapAdminPortalError(error);
        console.error('❌ Reject renewal request error:', error);
        return res.status(mapped.status).json({ success: false, error: { code: mapped.code, message: mapped.message } });
    }
});

export default router;
