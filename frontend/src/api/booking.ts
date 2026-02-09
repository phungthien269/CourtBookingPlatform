/**
 * Booking API Client - Phase 2 + Phase 3
 * Phase 2: Court and booking availability endpoints
 * Phase 3: Hold creation and booking retrieval
 */

import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

// ==================== TYPES ====================

export interface CourtDTO {
    id: string;
    name: string;
    sportType: { code: string; name: string };
    pricePerHour: number;
    isActive: boolean;
}

export interface SlotDTO {
    hour: number;
    status: 'AVAILABLE' | 'BOOKED' | 'LOCKED' | 'CLOSED' | 'HOLIDAY' | 'HOLDING';
    reason?: string;
}

export interface AvailabilityDTO {
    courtId: string;
    date: string;
    pricePerHour: number;
    slots: SlotDTO[];
}

export interface QuoteRequest {
    venueId: string;
    courtId: string;
    date: string;
    startHour: number;
    durationHours: number;
}

export interface QuoteResult {
    valid: boolean;
    courtId: string;
    courtName: string;
    date: string;
    startTime: string;
    endTime: string;
    endDate: string;
    durationHours: number;
    pricePerHour: number;
    totalPrice: number;
}

// Phase 3 Types
export interface HoldRequest {
    venueId: string;
    courtId: string;
    date: string;
    startHour: number;
    durationHours: number;
}

export interface HoldResult {
    bookingId: string;
    holdId: string;
    status: string;
    pendingExpiresAt: string;
    date: string;
    startTime: string;
    endTime: string;
    durationHours: number;
    totalPrice: number;
}

export interface BookingDetail {
    bookingId: string;
    status: string;
    pendingExpiresAt: string | null;
    date: string;
    startTime: string;
    endTime: string;
    durationHours: number;
    totalPrice: number;
    court: { id: string; name: string; pricePerHour: number };
    venue: { id: string; name: string; address: string };
}

interface ApiResponse<T> {
    success: boolean;
    data: T;
    error?: {
        code: string;
        message: string;
        details?: { blockedHours?: number[] };
    };
}

// ==================== API FUNCTIONS ====================

/**
 * Get courts for a venue
 */
export async function fetchCourtsForVenue(venueId: string): Promise<CourtDTO[]> {
    const response = await axios.get<ApiResponse<CourtDTO[]>>(
        `${API_BASE}/venues/${venueId}/courts`
    );
    return response.data.data;
}

/**
 * Get availability slots for a court on a date
 */
export async function fetchCourtAvailability(
    courtId: string,
    date: string
): Promise<AvailabilityDTO> {
    const response = await axios.get<ApiResponse<AvailabilityDTO>>(
        `${API_BASE}/courts/${courtId}/availability`,
        { params: { date } }
    );
    return response.data.data;
}

/**
 * Get booking quote (validate selection + compute price)
 */
export async function getBookingQuote(
    request: QuoteRequest,
    token: string
): Promise<{ success: boolean; data?: QuoteResult; error?: { code: string; message: string } }> {
    try {
        const response = await axios.post<ApiResponse<QuoteResult>>(
            `${API_BASE}/bookings/quote`,
            request,
            {
                headers: { Authorization: `Bearer ${token}` },
            }
        );
        return { success: true, data: response.data.data };
    } catch (err: unknown) {
        if (axios.isAxiosError(err) && err.response?.data?.error) {
            return {
                success: false,
                error: err.response.data.error,
            };
        }
        return {
            success: false,
            error: { code: 'NETWORK_ERROR', message: 'Lỗi kết nối' },
        };
    }
}

/**
 * Create a booking hold (Phase 3)
 * Returns booking data with 5-minute countdown
 */
export async function createBookingHold(
    request: HoldRequest,
    token: string
): Promise<{ success: boolean; data?: HoldResult; error?: { code: string; message: string } }> {
    try {
        const response = await axios.post<ApiResponse<HoldResult>>(
            `${API_BASE}/bookings/hold`,
            request,
            {
                headers: { Authorization: `Bearer ${token}` },
            }
        );
        return { success: true, data: response.data.data };
    } catch (err: unknown) {
        if (axios.isAxiosError(err) && err.response?.data?.error) {
            return {
                success: false,
                error: err.response.data.error,
            };
        }
        return {
            success: false,
            error: { code: 'NETWORK_ERROR', message: 'Lỗi kết nối' },
        };
    }
}

/**
 * Get booking by ID (Phase 3)
 * For owner user only
 */
export async function getBookingById(
    bookingId: string,
    token: string
): Promise<{ success: boolean; data?: BookingDetail; error?: { code: string; message: string } }> {
    try {
        const response = await axios.get<ApiResponse<BookingDetail>>(
            `${API_BASE}/bookings/${bookingId}`,
            {
                headers: { Authorization: `Bearer ${token}` },
            }
        );
        return { success: true, data: response.data.data };
    } catch (err: unknown) {
        if (axios.isAxiosError(err) && err.response?.data?.error) {
            return {
                success: false,
                error: err.response.data.error,
            };
        }
        return {
            success: false,
            error: { code: 'NETWORK_ERROR', message: 'Lỗi kết nối' },
        };
    }
}

// ==================== HELPERS ====================

/**
 * Format hour number to display string
 */
export function formatHourDisplay(hour: number): string {
    return `${hour.toString().padStart(2, '0')}:00`;
}

/**
 * Format price in VND
 */
export function formatPrice(price: number): string {
    return new Intl.NumberFormat('vi-VN').format(price);
}

/**
 * Get today's date in YYYY-MM-DD format (VN timezone)
 */
export function getTodayDate(): string {
    const now = new Date();
    // Adjust to VN timezone (UTC+7)
    const vnOffset = 7 * 60;
    const utcOffset = now.getTimezoneOffset();
    const vnTime = new Date(now.getTime() + (vnOffset + utcOffset) * 60000);
    return vnTime.toISOString().split('T')[0];
}

/**
 * Get tomorrow's date in YYYY-MM-DD format
 */
export function getTomorrowDate(): string {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow.toISOString().split('T')[0];
}

/**
 * Add days to a date string
 */
export function addDaysToDate(dateStr: string, days: number): string {
    const date = new Date(dateStr + 'T00:00:00');
    date.setDate(date.getDate() + days);
    return date.toISOString().split('T')[0];
}

// ==================== PHASE 4 TYPES ====================

export interface BookingDetailExtended {
    bookingId: string;
    status: string;
    paymentMethod: string | null;
    pendingExpiresAt: string | null;
    waitingConfirmSince: string | null;
    paymentDeclaredAt: string | null;
    confirmedAt: string | null;
    managerCancelReason: string | null;
    date: string;
    startTime: string;
    endTime: string;
    durationHours: number;
    totalPrice: number;
    court: { id: string; name: string; pricePerHour: number };
    venue: {
        id: string;
        name: string;
        address: string;
        contactPhone: string | null;
        bankName: string | null;
        bankAccountNumber: string | null;
        bankAccountName: string | null;
    };
    user?: { id: string; name: string | null; email: string };
}

// ==================== PHASE 4 API FUNCTIONS ====================

/**
 * Get extended booking details (Phase 4)
 */
export async function getBookingExtended(
    bookingId: string,
    token: string
): Promise<{ success: true; data: BookingDetailExtended } | { success: false; error: { code: string; message: string } }> {
    try {
        const response = await axios.get<ApiResponse<BookingDetailExtended>>(
            `${API_BASE}/bookings/${bookingId}/extended`,
            {
                headers: { Authorization: `Bearer ${token}` },
            }
        );
        return { success: true, data: response.data.data };
    } catch (err: unknown) {
        if (axios.isAxiosError(err) && err.response?.data?.error) {
            return { success: false, error: err.response.data.error };
        }
        return { success: false, error: { code: 'NETWORK_ERROR', message: 'Lỗi kết nối' } };
    }
}

/**
 * Choose payment method (Phase 4)
 */
export async function choosePaymentMethod(
    bookingId: string,
    paymentMethod: 'CASH' | 'TRANSFER',
    token: string
): Promise<{ success: true; data: { bookingId: string; status: string; paymentMethod: string; waitingConfirmSince: string } } | { success: false; error: { code: string; message: string } }> {
    try {
        const response = await axios.post<ApiResponse<{ bookingId: string; status: string; paymentMethod: string; waitingConfirmSince: string }>>(
            `${API_BASE}/bookings/${bookingId}/choose-payment`,
            { paymentMethod },
            {
                headers: { Authorization: `Bearer ${token}` },
            }
        );
        return { success: true, data: response.data.data };
    } catch (err: unknown) {
        if (axios.isAxiosError(err) && err.response?.data?.error) {
            return { success: false, error: err.response.data.error };
        }
        return { success: false, error: { code: 'NETWORK_ERROR', message: 'Lỗi kết nối' } };
    }
}

/**
 * Declare transfer payment (Phase 4)
 */
export async function declareTransfer(
    bookingId: string,
    token: string
): Promise<{ success: true; data: { bookingId: string; status: string } } | { success: false; error: { code: string; message: string } }> {
    try {
        const response = await axios.post<ApiResponse<{ bookingId: string; status: string }>>(
            `${API_BASE}/bookings/${bookingId}/declare-transfer`,
            {},
            {
                headers: { Authorization: `Bearer ${token}` },
            }
        );
        return { success: true, data: response.data.data };
    } catch (err: unknown) {
        if (axios.isAxiosError(err) && err.response?.data?.error) {
            return { success: false, error: err.response.data.error };
        }
        return { success: false, error: { code: 'NETWORK_ERROR', message: 'Lỗi kết nối' } };
    }
}
