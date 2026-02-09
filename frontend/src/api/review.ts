/**
 * Review API Client - Phase 5
 */

import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

// ==================== Types ====================

export interface ReviewItem {
    id: string;
    rating: number;
    comment: string | null;
    createdAt: string;
    userDisplayName: string;
}

export interface VenueReviewsResponse {
    success: boolean;
    data?: {
        averageRating: number;
        total: number;
        items: ReviewItem[];
    };
    error?: { code: string; message: string };
}

export interface ReviewEligibilityResponse {
    success: boolean;
    data?: {
        eligible: boolean;
        bookingId?: string;
    };
    error?: { code: string; message: string };
}

export interface CreateReviewResponse {
    success: boolean;
    data?: {
        id: string;
        bookingId: string;
        venueId: string;
        rating: number;
        comment: string | null;
        createdAt: string;
    };
    error?: { code: string; message: string };
}

// ==================== API Functions ====================

/**
 * Get reviews for a venue (public)
 */
export async function getVenueReviews(
    venueId: string,
    page: number = 1,
    limit: number = 10
): Promise<VenueReviewsResponse> {
    try {
        const response = await axios.get<VenueReviewsResponse>(
            `${API_BASE}/venues/${venueId}/reviews`,
            { params: { page, limit } }
        );
        return response.data;
    } catch (error: unknown) {
        if (axios.isAxiosError(error) && error.response) {
            return error.response.data as VenueReviewsResponse;
        }
        return { success: false, error: { code: 'NETWORK_ERROR', message: 'Lỗi kết nối' } };
    }
}

/**
 * Check if user can review a venue
 */
export async function getReviewEligibility(
    token: string,
    venueId: string
): Promise<ReviewEligibilityResponse> {
    try {
        const response = await axios.get<ReviewEligibilityResponse>(
            `${API_BASE}/me/review-eligibility`,
            {
                params: { venueId },
                headers: { Authorization: `Bearer ${token}` },
            }
        );
        return response.data;
    } catch (error: unknown) {
        if (axios.isAxiosError(error) && error.response) {
            return error.response.data as ReviewEligibilityResponse;
        }
        return { success: false, error: { code: 'NETWORK_ERROR', message: 'Lỗi kết nối' } };
    }
}

/**
 * Create a review for a booking
 */
export async function createReview(
    token: string,
    bookingId: string,
    rating: number,
    comment?: string
): Promise<CreateReviewResponse> {
    try {
        const response = await axios.post<CreateReviewResponse>(
            `${API_BASE}/reviews`,
            { bookingId, rating, comment },
            { headers: { Authorization: `Bearer ${token}` } }
        );
        return response.data;
    } catch (error: unknown) {
        if (axios.isAxiosError(error) && error.response) {
            return error.response.data as CreateReviewResponse;
        }
        return { success: false, error: { code: 'NETWORK_ERROR', message: 'Lỗi kết nối' } };
    }
}
