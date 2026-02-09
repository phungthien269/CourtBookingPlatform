/**
 * Manager API Client - Phase 4
 * API functions for manager booking operations
 */

import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

// ==================== TYPES ====================

export interface ManagerBookingItem {
    bookingId: string;
    status: string;
    paymentMethod: string | null;
    paymentDeclaredAt: string | null;
    waitingConfirmSince: string | null;
    date: string;
    startTime: string;
    endTime: string;
    totalPrice: number;
    court: { id: string; name: string };
    user: { id: string; name: string | null; email: string };
}

interface ApiResponse<T> {
    success: boolean;
    data: T;
    error?: { code: string; message: string };
}

// ==================== API FUNCTIONS ====================

/**
 * Get manager's bookings
 */
export async function getManagerBookings(
    token: string,
    filters?: { date?: string; status?: string }
): Promise<{ success: true; data: ManagerBookingItem[] } | { success: false; error: { code: string; message: string } }> {
    try {
        const params: Record<string, string> = {};
        if (filters?.date) params.date = filters.date;
        if (filters?.status) params.status = filters.status;

        const response = await axios.get<ApiResponse<ManagerBookingItem[]>>(
            `${API_BASE}/manager/bookings`,
            {
                params,
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
 * Confirm a booking
 */
export async function confirmBooking(
    bookingId: string,
    token: string
): Promise<{ success: true; data: { bookingId: string; status: string; confirmedAt: string } } | { success: false; error: { code: string; message: string } }> {
    try {
        const response = await axios.post<ApiResponse<{ bookingId: string; status: string; confirmedAt: string }>>(
            `${API_BASE}/manager/bookings/${bookingId}/confirm`,
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

/**
 * Cancel a booking with reason
 */
export async function cancelBooking(
    bookingId: string,
    reason: string,
    token: string
): Promise<{ success: true; data: { bookingId: string; status: string; reason: string } } | { success: false; error: { code: string; message: string } }> {
    try {
        const response = await axios.post<ApiResponse<{ bookingId: string; status: string; reason: string }>>(
            `${API_BASE}/manager/bookings/${bookingId}/cancel`,
            { reason },
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
