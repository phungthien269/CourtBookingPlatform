/**
 * Venue DTOs - Type definitions for venue API responses
 * IMPORTANT: contactPhone is NEVER included (privacy rule per BRD NFR-04)
 */

export interface SportTypeDTO {
    code: string;
    name: string;
}

export interface VenueCardDTO {
    id: string;
    name: string;
    address: string;
    district: string;
    city: string;
    lat: number;
    lng: number;
    coverImageUrl: string | null;
    sportTypes: SportTypeDTO[];
    minPricePerHour: number;
    maxPricePerHour: number;
    openingHoursSummary: string;
}

export interface VenueImageDTO {
    id: string;
    url: string;
    isCover: boolean;
}

export interface VenueScheduleDTO {
    dayOfWeek: number;
    openTime: string;
    closeTime: string;
}

export interface VenueHolidayDTO {
    date: string;
    note: string | null;
}

export interface VenueDetailDTO {
    id: string;
    name: string;
    address: string;
    district: string;
    city: string;
    lat: number;
    lng: number;
    description: string | null;
    images: VenueImageDTO[];
    sportTypes: SportTypeDTO[];
    schedules: VenueScheduleDTO[];
    holidays: VenueHolidayDTO[];
    minPricePerHour: number;
    maxPricePerHour: number;
    avgRating: number;
    reviewCount: number;
    // NOTE: contactPhone is intentionally EXCLUDED
}

export interface VenueFilters {
    sportTypes?: string[];
    district?: string;
    q?: string;
}
