import { Router, Response } from 'express';
import { z } from 'zod';
import { authMiddleware, AuthRequest } from '../middleware/auth.js';
import {
    getManagerBookings,
    confirmBooking,
    cancelBooking,
} from '../services/manager.service.js';
import {
    addManagerBlackout,
    addManagerHoliday,
    addVenueImage,
    deleteVenueImage,
    getManagerAnalytics,
    getManagerContext,
    getManagerCourts,
    getManagerOverview,
    getManagerSchedule,
    getManagerSubscription,
    removeManagerBlackout,
    removeManagerHoliday,
    replaceWeeklySchedule,
    requestSubscriptionRenewal,
    setVenueCoverImage,
    updateManagerCourt,
} from '../services/managerPortal.service.js';

const router = Router();

const dateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/u, 'Ngày phải theo định dạng YYYY-MM-DD');
const timeSchema = z.string().regex(/^\d{2}:\d{2}$/u, 'Giờ phải theo định dạng HH:mm');

const cancelSchema = z.object({
    reason: z.string().min(5, 'Lý do phải có ít nhất 5 ký tự'),
});

const overviewQuerySchema = z.object({
    date: dateSchema.optional(),
});

const updateCourtSchema = z
    .object({
        name: z.string().trim().min(2, 'Tên sân phải có ít nhất 2 ký tự').max(80).optional(),
        pricePerHour: z.number().int().min(10_000, 'Giá tối thiểu là 10.000đ').max(5_000_000).optional(),
        isActive: z.boolean().optional(),
    })
    .refine((value) => Object.keys(value).length > 0, {
        message: 'Bạn phải gửi ít nhất 1 trường cần cập nhật',
    });

const addImageSchema = z.object({
    url: z.string().url('URL ảnh không hợp lệ'),
    isCover: z.boolean().optional(),
});

const replaceScheduleSchema = z.object({
    schedules: z.array(
        z.object({
            dayOfWeek: z.number().int().min(0).max(6),
            openTime: timeSchema,
            closeTime: timeSchema,
        })
    ),
});

const holidaySchema = z.object({
    date: dateSchema,
    note: z.string().trim().max(200).optional(),
});

const blackoutSchema = z.object({
    courtId: z.string().uuid('courtId không hợp lệ'),
    date: dateSchema,
    startTime: timeSchema,
    endTime: timeSchema,
    reason: z.string().trim().max(200).optional(),
});

const analyticsQuerySchema = z.object({
    range: z.enum(['day', 'week', 'month']).default('week'),
});

const renewalRequestSchema = z.object({
    months: z.number().int().min(1).max(12),
    note: z.string().trim().max(300).optional(),
});

function requireManager(req: AuthRequest, res: Response, next: () => void) {
    if (req.userRole !== 'MANAGER' && req.userRole !== 'ADMIN') {
        return res.status(403).json({
            success: false,
            error: { code: 'FORBIDDEN', message: 'Chỉ manager mới có quyền truy cập' },
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

function mapManagerPortalError(error: unknown): { status: number; code: string; message: string } {
    const message = error instanceof Error ? error.message : 'INTERNAL_ERROR';

    switch (message) {
        case 'MANAGER_WORKSPACE_NOT_FOUND':
            return { status: 404, code: 'MANAGER_WORKSPACE_NOT_FOUND', message: 'Không tìm thấy venue của manager' };
        case 'COURT_NOT_FOUND':
            return { status: 404, code: 'COURT_NOT_FOUND', message: 'Không tìm thấy sân cần thao tác' };
        case 'COURT_HAS_UPCOMING_BOOKINGS':
            return { status: 400, code: 'COURT_HAS_UPCOMING_BOOKINGS', message: 'Không thể ẩn sân khi còn booking sắp tới' };
        case 'MAX_IMAGES_REACHED':
            return { status: 400, code: 'MAX_IMAGES_REACHED', message: 'Bạn chỉ có thể lưu tối đa 10 ảnh' };
        case 'IMAGE_NOT_FOUND':
            return { status: 404, code: 'IMAGE_NOT_FOUND', message: 'Không tìm thấy ảnh' };
        case 'HOLIDAY_ALREADY_EXISTS':
            return { status: 400, code: 'HOLIDAY_ALREADY_EXISTS', message: 'Ngày nghỉ này đã tồn tại' };
        case 'HOLIDAY_NOT_FOUND':
            return { status: 404, code: 'HOLIDAY_NOT_FOUND', message: 'Không tìm thấy ngày nghỉ' };
        case 'BLACKOUT_NOT_FOUND':
            return { status: 404, code: 'BLACKOUT_NOT_FOUND', message: 'Không tìm thấy lịch khóa sân' };
        case 'BLACKOUT_OVERLAP':
            return { status: 400, code: 'BLACKOUT_OVERLAP', message: 'Khung giờ khóa bị chồng với lịch khóa hiện có' };
        case 'BLACKOUT_CONFLICTS_BOOKING':
            return { status: 400, code: 'BLACKOUT_CONFLICTS_BOOKING', message: 'Khung giờ khóa trùng với booking đang tồn tại' };
        case 'INVALID_TIME_RANGE':
            return { status: 400, code: 'INVALID_TIME_RANGE', message: 'Giờ bắt đầu phải nhỏ hơn giờ kết thúc' };
        default:
            if (message.startsWith('INVALID_SCHEDULE_RANGE')) {
                return { status: 400, code: 'INVALID_SCHEDULE_RANGE', message: 'Có ca làm việc không hợp lệ' };
            }

            if (message.startsWith('OVERLAPPING_SCHEDULES')) {
                return { status: 400, code: 'OVERLAPPING_SCHEDULES', message: 'Các ca làm việc trong ngày đang bị chồng nhau' };
            }

            return { status: 500, code: 'INTERNAL_ERROR', message: 'Lỗi hệ thống' };
    }
}

router.get('/bookings', authMiddleware, requireManager, async (req: AuthRequest, res: Response) => {
    try {
        const userId = requireUserId(req, res);
        if (!userId) return;

        const date = req.query.date as string | undefined;
        const status = req.query.status as string | undefined;

        const bookings = await getManagerBookings(userId, { date, status });

        return res.json({
            success: true,
            data: bookings,
        });
    } catch (error) {
        console.error('❌ Get manager bookings error:', error);
        return res.status(500).json({
            success: false,
            error: { code: 'INTERNAL_ERROR', message: 'Lỗi hệ thống' },
        });
    }
});

router.post('/bookings/:id/confirm', authMiddleware, requireManager, async (req: AuthRequest, res: Response) => {
    try {
        const userId = requireUserId(req, res);
        if (!userId) return;

        const bookingId = req.params.id;
        const result = await confirmBooking(bookingId, userId);

        if (!result.success) {
            return res.status(400).json({
                success: false,
                error: result.error,
            });
        }

        return res.json({
            success: true,
            data: result.data,
        });
    } catch (error) {
        console.error('❌ Confirm booking error:', error);
        return res.status(500).json({
            success: false,
            error: { code: 'INTERNAL_ERROR', message: 'Lỗi hệ thống' },
        });
    }
});

router.post('/bookings/:id/cancel', authMiddleware, requireManager, async (req: AuthRequest, res: Response) => {
    try {
        const userId = requireUserId(req, res);
        if (!userId) return;

        const parsed = cancelSchema.safeParse(req.body);
        if (!parsed.success) {
            return res.status(400).json({
                success: false,
                error: { code: 'VALIDATION_ERROR', message: parsed.error.errors[0].message },
            });
        }

        const bookingId = req.params.id;
        const result = await cancelBooking(bookingId, userId, parsed.data.reason);

        if (!result.success) {
            return res.status(400).json({
                success: false,
                error: result.error,
            });
        }

        return res.json({
            success: true,
            data: result.data,
        });
    } catch (error) {
        console.error('❌ Cancel booking error:', error);
        return res.status(500).json({
            success: false,
            error: { code: 'INTERNAL_ERROR', message: 'Lỗi hệ thống' },
        });
    }
});

router.get('/context', authMiddleware, requireManager, async (req: AuthRequest, res: Response) => {
    try {
        const userId = requireUserId(req, res);
        if (!userId) return;

        const data = await getManagerContext(userId);
        return res.json({ success: true, data });
    } catch (error) {
        const mapped = mapManagerPortalError(error);
        console.error('❌ Get manager context error:', error);
        return res.status(mapped.status).json({ success: false, error: { code: mapped.code, message: mapped.message } });
    }
});

router.get('/overview', authMiddleware, requireManager, async (req: AuthRequest, res: Response) => {
    try {
        const userId = requireUserId(req, res);
        if (!userId) return;

        const parsed = overviewQuerySchema.safeParse(req.query);
        if (!parsed.success) {
            return res.status(400).json({
                success: false,
                error: { code: 'VALIDATION_ERROR', message: parsed.error.errors[0].message },
            });
        }

        const data = await getManagerOverview(userId, parsed.data.date);
        return res.json({ success: true, data });
    } catch (error) {
        const mapped = mapManagerPortalError(error);
        console.error('❌ Get manager overview error:', error);
        return res.status(mapped.status).json({ success: false, error: { code: mapped.code, message: mapped.message } });
    }
});

router.get('/courts', authMiddleware, requireManager, async (req: AuthRequest, res: Response) => {
    try {
        const userId = requireUserId(req, res);
        if (!userId) return;

        const data = await getManagerCourts(userId);
        return res.json({ success: true, data });
    } catch (error) {
        const mapped = mapManagerPortalError(error);
        console.error('❌ Get manager courts error:', error);
        return res.status(mapped.status).json({ success: false, error: { code: mapped.code, message: mapped.message } });
    }
});

router.patch('/courts/:id', authMiddleware, requireManager, async (req: AuthRequest, res: Response) => {
    try {
        const userId = requireUserId(req, res);
        if (!userId) return;

        const parsed = updateCourtSchema.safeParse(req.body);
        if (!parsed.success) {
            return res.status(400).json({
                success: false,
                error: { code: 'VALIDATION_ERROR', message: parsed.error.errors[0].message },
            });
        }

        const data = await updateManagerCourt(userId, req.params.id, parsed.data);
        return res.json({ success: true, data });
    } catch (error) {
        const mapped = mapManagerPortalError(error);
        console.error('❌ Update manager court error:', error);
        return res.status(mapped.status).json({ success: false, error: { code: mapped.code, message: mapped.message } });
    }
});

router.post('/venue/images', authMiddleware, requireManager, async (req: AuthRequest, res: Response) => {
    try {
        const userId = requireUserId(req, res);
        if (!userId) return;

        const parsed = addImageSchema.safeParse(req.body);
        if (!parsed.success) {
            return res.status(400).json({
                success: false,
                error: { code: 'VALIDATION_ERROR', message: parsed.error.errors[0].message },
            });
        }

        const data = await addVenueImage(userId, parsed.data);
        return res.status(201).json({ success: true, data });
    } catch (error) {
        const mapped = mapManagerPortalError(error);
        console.error('❌ Add venue image error:', error);
        return res.status(mapped.status).json({ success: false, error: { code: mapped.code, message: mapped.message } });
    }
});

router.delete('/venue/images/:imageId', authMiddleware, requireManager, async (req: AuthRequest, res: Response) => {
    try {
        const userId = requireUserId(req, res);
        if (!userId) return;

        const data = await deleteVenueImage(userId, req.params.imageId);
        return res.json({ success: true, data });
    } catch (error) {
        const mapped = mapManagerPortalError(error);
        console.error('❌ Delete venue image error:', error);
        return res.status(mapped.status).json({ success: false, error: { code: mapped.code, message: mapped.message } });
    }
});

router.post('/venue/images/:imageId/cover', authMiddleware, requireManager, async (req: AuthRequest, res: Response) => {
    try {
        const userId = requireUserId(req, res);
        if (!userId) return;

        const data = await setVenueCoverImage(userId, req.params.imageId);
        return res.json({ success: true, data });
    } catch (error) {
        const mapped = mapManagerPortalError(error);
        console.error('❌ Set venue cover image error:', error);
        return res.status(mapped.status).json({ success: false, error: { code: mapped.code, message: mapped.message } });
    }
});

router.get('/schedule', authMiddleware, requireManager, async (req: AuthRequest, res: Response) => {
    try {
        const userId = requireUserId(req, res);
        if (!userId) return;

        const data = await getManagerSchedule(userId);
        return res.json({ success: true, data });
    } catch (error) {
        const mapped = mapManagerPortalError(error);
        console.error('❌ Get manager schedule error:', error);
        return res.status(mapped.status).json({ success: false, error: { code: mapped.code, message: mapped.message } });
    }
});

router.put('/schedule/weekly', authMiddleware, requireManager, async (req: AuthRequest, res: Response) => {
    try {
        const userId = requireUserId(req, res);
        if (!userId) return;

        const parsed = replaceScheduleSchema.safeParse(req.body);
        if (!parsed.success) {
            return res.status(400).json({
                success: false,
                error: { code: 'VALIDATION_ERROR', message: parsed.error.errors[0].message },
            });
        }

        const data = await replaceWeeklySchedule(userId, parsed.data.schedules);
        return res.json({ success: true, data });
    } catch (error) {
        const mapped = mapManagerPortalError(error);
        console.error('❌ Replace weekly schedule error:', error);
        return res.status(mapped.status).json({ success: false, error: { code: mapped.code, message: mapped.message } });
    }
});

router.post('/holidays', authMiddleware, requireManager, async (req: AuthRequest, res: Response) => {
    try {
        const userId = requireUserId(req, res);
        if (!userId) return;

        const parsed = holidaySchema.safeParse(req.body);
        if (!parsed.success) {
            return res.status(400).json({
                success: false,
                error: { code: 'VALIDATION_ERROR', message: parsed.error.errors[0].message },
            });
        }

        const data = await addManagerHoliday(userId, parsed.data);
        return res.status(201).json({ success: true, data });
    } catch (error) {
        const mapped = mapManagerPortalError(error);
        console.error('❌ Add manager holiday error:', error);
        return res.status(mapped.status).json({ success: false, error: { code: mapped.code, message: mapped.message } });
    }
});

router.delete('/holidays/:holidayId', authMiddleware, requireManager, async (req: AuthRequest, res: Response) => {
    try {
        const userId = requireUserId(req, res);
        if (!userId) return;

        await removeManagerHoliday(userId, req.params.holidayId);
        return res.json({ success: true, data: { deleted: true } });
    } catch (error) {
        const mapped = mapManagerPortalError(error);
        console.error('❌ Remove manager holiday error:', error);
        return res.status(mapped.status).json({ success: false, error: { code: mapped.code, message: mapped.message } });
    }
});

router.post('/blackouts', authMiddleware, requireManager, async (req: AuthRequest, res: Response) => {
    try {
        const userId = requireUserId(req, res);
        if (!userId) return;

        const parsed = blackoutSchema.safeParse(req.body);
        if (!parsed.success) {
            return res.status(400).json({
                success: false,
                error: { code: 'VALIDATION_ERROR', message: parsed.error.errors[0].message },
            });
        }

        const data = await addManagerBlackout(userId, parsed.data);
        return res.status(201).json({ success: true, data });
    } catch (error) {
        const mapped = mapManagerPortalError(error);
        console.error('❌ Add manager blackout error:', error);
        return res.status(mapped.status).json({ success: false, error: { code: mapped.code, message: mapped.message } });
    }
});

router.delete('/blackouts/:blackoutId', authMiddleware, requireManager, async (req: AuthRequest, res: Response) => {
    try {
        const userId = requireUserId(req, res);
        if (!userId) return;

        await removeManagerBlackout(userId, req.params.blackoutId);
        return res.json({ success: true, data: { deleted: true } });
    } catch (error) {
        const mapped = mapManagerPortalError(error);
        console.error('❌ Remove manager blackout error:', error);
        return res.status(mapped.status).json({ success: false, error: { code: mapped.code, message: mapped.message } });
    }
});

router.get('/analytics', authMiddleware, requireManager, async (req: AuthRequest, res: Response) => {
    try {
        const userId = requireUserId(req, res);
        if (!userId) return;

        const parsed = analyticsQuerySchema.safeParse(req.query);
        if (!parsed.success) {
            return res.status(400).json({
                success: false,
                error: { code: 'VALIDATION_ERROR', message: parsed.error.errors[0].message },
            });
        }

        const data = await getManagerAnalytics(userId, parsed.data.range);
        return res.json({ success: true, data });
    } catch (error) {
        const mapped = mapManagerPortalError(error);
        console.error('❌ Get manager analytics error:', error);
        return res.status(mapped.status).json({ success: false, error: { code: mapped.code, message: mapped.message } });
    }
});

router.get('/subscription', authMiddleware, requireManager, async (req: AuthRequest, res: Response) => {
    try {
        const userId = requireUserId(req, res);
        if (!userId) return;

        const data = await getManagerSubscription(userId);
        return res.json({ success: true, data });
    } catch (error) {
        const mapped = mapManagerPortalError(error);
        console.error('❌ Get manager subscription error:', error);
        return res.status(mapped.status).json({ success: false, error: { code: mapped.code, message: mapped.message } });
    }
});

router.post('/subscription/renewal-request', authMiddleware, requireManager, async (req: AuthRequest, res: Response) => {
    try {
        const userId = requireUserId(req, res);
        if (!userId) return;

        const parsed = renewalRequestSchema.safeParse(req.body);
        if (!parsed.success) {
            return res.status(400).json({
                success: false,
                error: { code: 'VALIDATION_ERROR', message: parsed.error.errors[0].message },
            });
        }

        const data = await requestSubscriptionRenewal(userId, parsed.data);
        return res.status(201).json({ success: true, data });
    } catch (error) {
        const mapped = mapManagerPortalError(error);
        console.error('❌ Create renewal request error:', error);
        return res.status(mapped.status).json({ success: false, error: { code: mapped.code, message: mapped.message } });
    }
});

export default router;
