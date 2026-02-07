import { Router } from 'express';

const router = Router();

router.get('/', (_req, res) => {
    res.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        service: 'CourtBooking API',
    });
});

export default router;
