/**
 * Venue API client
 * Fetches venue data from backend
 */

import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

// Types matching backend DTOs (contactPhone excluded)
export interface SportType {
    code: string;
    name: string;
}

export interface VenueCard {
    id: string;
    name: string;
    address: string;
    district: string;
    city: string;
    lat: number;
    lng: number;
    coverImageUrl: string | null;
    sportTypes: SportType[];
    minPricePerHour: number;
    maxPricePerHour: number;
    openingHoursSummary: string;
}

export interface VenueImage {
    id: string;
    url: string;
    isCover: boolean;
}

export interface VenueSchedule {
    dayOfWeek: number;
    openTime: string;
    closeTime: string;
}

export interface VenueHoliday {
    date: string;
    note: string | null;
}

export interface VenueDetail {
    id: string;
    name: string;
    address: string;
    district: string;
    city: string;
    lat: number;
    lng: number;
    description: string | null;
    images: VenueImage[];
    sportTypes: SportType[];
    schedules: VenueSchedule[];
    holidays: VenueHoliday[];
    minPricePerHour: number;
    maxPricePerHour: number;
    avgRating: number;
    reviewCount: number;
    // NOTE: contactPhone is intentionally NOT included
}

export interface VenueFilters {
    sportTypes?: string[];
    district?: string;
    q?: string;
}

interface ApiResponse<T> {
    success: boolean;
    data: T;
    count?: number;
    error?: string;
}

// API functions
export async function fetchVenues(filters: VenueFilters = {}): Promise<VenueCard[]> {
    const params = new URLSearchParams();

    if (filters.sportTypes && filters.sportTypes.length > 0) {
        params.set('sportTypes', filters.sportTypes.join(','));
    }
    if (filters.district) {
        params.set('district', filters.district);
    }
    if (filters.q) {
        params.set('q', filters.q);
    }

    const response = await axios.get<ApiResponse<VenueCard[]>>(
        `${API_BASE}/venues?${params.toString()}`
    );

    return response.data.data;
}

export async function fetchVenueById(id: string): Promise<VenueDetail | null> {
    try {
        const response = await axios.get<ApiResponse<VenueDetail>>(
            `${API_BASE}/venues/${id}`
        );
        return response.data.data;
    } catch (error) {
        if (axios.isAxiosError(error) && error.response?.status === 404) {
            return null;
        }
        throw error;
    }
}

export async function fetchDistricts(): Promise<string[]> {
    const response = await axios.get<ApiResponse<string[]>>(
        `${API_BASE}/venues/districts`
    );
    return response.data.data;
}

export async function fetchSportTypes(): Promise<SportType[]> {
    const response = await axios.get<ApiResponse<SportType[]>>(
        `${API_BASE}/venues/sport-types`
    );
    return response.data.data;
}
