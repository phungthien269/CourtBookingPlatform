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
            return res.status(400).json({
                success: false,
                error: 'Invalid query parameters',
                details: parsed.error.issues,
            });
        }

        const { sportTypes, district, q } = parsed.data;

        const venues = await VenueService.getVenues({
            sportTypes: sportTypes ? sportTypes.split(',').map((s) => s.trim()) : undefined,
            district,
            q,
        });

        return res.json({
            success: true,
            data: venues,
            count: venues.length,
        });
    } catch (error) {
        console.error('Error fetching venues:', error);
        return res.status(500).json({
            success: false,
            error: 'Internal server error',
        });
    }
});

/**
 * GET /api/venues/districts
 * Get distinct districts for filter dropdown
 */
router.get('/districts', async (_req: Request, res: Response) => {
    try {
        const districts = await VenueService.getDistricts();
        return res.json({
            success: true,
            data: districts,
        });
    } catch (error) {
        console.error('Error fetching districts:', error);
        return res.status(500).json({
            success: false,
            error: 'Internal server error',
        });
    }
});

/**
 * GET /api/venues/sport-types
 * Get all sport types for filter
 */
router.get('/sport-types', async (_req: Request, res: Response) => {
    try {
        const sportTypes = await VenueService.getSportTypes();
        return res.json({
            success: true,
            data: sportTypes,
        });
    } catch (error) {
        console.error('Error fetching sport types:', error);
        return res.status(500).json({
            success: false,
            error: 'Internal server error',
        });
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

        return res.json({
            success: true,
            data: courts,
        });
    } catch (error) {
        console.error('Error fetching courts:', error);
        return res.status(500).json({
            success: false,
            error: 'Internal server error',
        });
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
            return res.status(400).json({
                success: false,
                error: 'Invalid venue ID',
            });
        }

        const venue = await VenueService.getVenueById(id);

        if (!venue) {
            return res.status(404).json({
                success: false,
                error: 'Venue not found',
            });
        }

        return res.json({
            success: true,
            data: venue,
        });
    } catch (error) {
        console.error('Error fetching venue:', error);
        return res.status(500).json({
            success: false,
            error: 'Internal server error',
        });
    }
});

export default router;

