/**
 * Venue Routes - Discovery API endpoints
 * GET /api/venues - List venues with filters
 * GET /api/venues/:id - Venue detail
 * GET /api/venues/:id/courts - Courts for venue (Phase 2)
 * GET /api/venues/districts - Distinct districts
 * GET /api/venues/sport-types - All sport types
 */

import { Router, Request, Response } from 'express';
import { z } from 'zod';
import * as VenueService from '../services/venue.service.js';
import { getCourtsForVenue } from '../services/court.service.js';
import { respondError, respondInternalError, respondSuccess, respondValidationError } from '../lib/api.js';
import { logger } from '../lib/logger.js';

const router = Router();

// Query validation schema
const venueQuerySchema = z.object({
    sportTypes: z.string().optional(), // comma-separated: "BADMINTON,PICKLEBALL"
    district: z.string().optional(),
    q: z.string().optional(),
});

/**
 * GET /api/venues
 * List venues for discovery map/list
 */
router.get('/', async (req: Request, res: Response) => {
    try {
        const parsed = venueQuerySchema.safeParse(req.query);
        if (!parsed.success) {
            return respondValidationError(res, 'Query parameters không hợp lệ', parsed.error.issues);
        }

        const { sportTypes, district, q } = parsed.data;

        const venues = await VenueService.getVenues({
            sportTypes: sportTypes ? sportTypes.split(',').map((s) => s.trim()) : undefined,
            district,
            q,
        });

        return respondSuccess(res, {
            items: venues,
            count: venues.length,
        });
    } catch (error) {
        logger.error({ event: 'venue.list_failed', error, query: req.query });
        return respondInternalError(res);
    }
});

/**
 * GET /api/venues/districts
 * Get distinct districts for filter dropdown
 */
router.get('/districts', async (_req: Request, res: Response) => {
    try {
        const districts = await VenueService.getDistricts();
        return respondSuccess(res, districts);
    } catch (error) {
        logger.error({ event: 'venue.districts_failed', error });
        return respondInternalError(res);
    }
});

/**
 * GET /api/venues/sport-types
 * Get all sport types for filter
 */
router.get('/sport-types', async (_req: Request, res: Response) => {
    try {
        const sportTypes = await VenueService.getSportTypes();
        return respondSuccess(res, sportTypes);
    } catch (error) {
        logger.error({ event: 'venue.sport_types_failed', error });
        return respondInternalError(res);
    }
});

/**
 * GET /api/venues/:id/courts
 * Get courts for a venue (Phase 2)
 */
router.get('/:id/courts', async (req: Request, res: Response) => {
    try {
        const { id } = req.params;

        const courts = await getCourtsForVenue(id);

        return respondSuccess(res, courts);
    } catch (error) {
        logger.error({ event: 'venue.courts_failed', error, venueId: req.params.id });
        return respondInternalError(res);
    }
});

/**
 * GET /api/venues/:id
 * Get venue detail
 */
router.get('/:id', async (req: Request, res: Response) => {
    try {
        const { id } = req.params;

        if (!id || typeof id !== 'string') {
            return respondError(res, 400, 'INVALID_VENUE_ID', 'Venue ID không hợp lệ');
        }

        const venue = await VenueService.getVenueById(id);

        if (!venue) {
            return respondError(res, 404, 'VENUE_NOT_FOUND', 'Không tìm thấy venue');
        }

        return respondSuccess(res, venue);
    } catch (error) {
        logger.error({ event: 'venue.detail_failed', error, venueId: req.params.id });
        return respondInternalError(res);
    }
});

export default router;

