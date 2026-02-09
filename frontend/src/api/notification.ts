/**
 * Notification API Client - Phase 6
 */

import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

// ==================== Types ====================

export interface NotificationItem {
    id: string;
    type: string;
    role: string;
    title: string;
    body: string;
    bookingId: string | null;
    venueId: string | null;
    isRead: boolean;
    createdAt: string;
}

export interface ListNotificationsResponse {
    success: boolean;
    data?: {
        items: NotificationItem[];
        nextCursor: string | null;
    };
    error?: { code: string; message: string };
}

export interface UnreadCountResponse {
    success: boolean;
    data?: { count: number };
    error?: { code: string; message: string };
}

export interface MarkReadResponse {
    success: boolean;
    data?: { count?: number };
    error?: { code: string; message: string };
}

// ==================== API Functions ====================

/**
 * Get notifications list
 */
export async function getNotifications(
    token: string,
    options?: { isRead?: boolean; cursor?: string; limit?: number }
): Promise<ListNotificationsResponse> {
    try {
        const params: Record<string, unknown> = {};
        if (options?.isRead !== undefined) params.isRead = options.isRead.toString();
        if (options?.cursor) params.cursor = options.cursor;
        if (options?.limit) params.limit = options.limit;

        const response = await axios.get<ListNotificationsResponse>(
            `${API_BASE}/notifications`,
            {
                params,
                headers: { Authorization: `Bearer ${token}` },
            }
        );
        return response.data;
    } catch (error: unknown) {
        if (axios.isAxiosError(error) && error.response) {
            return error.response.data as ListNotificationsResponse;
        }
        return { success: false, error: { code: 'NETWORK_ERROR', message: 'Lỗi kết nối' } };
    }
}

/**
 * Get unread count
 */
export async function getUnreadCount(token: string): Promise<UnreadCountResponse> {
    try {
        const response = await axios.get<UnreadCountResponse>(
            `${API_BASE}/notifications/unread-count`,
            { headers: { Authorization: `Bearer ${token}` } }
        );
        return response.data;
    } catch (error: unknown) {
        if (axios.isAxiosError(error) && error.response) {
            return error.response.data as UnreadCountResponse;
        }
        return { success: false, error: { code: 'NETWORK_ERROR', message: 'Lỗi kết nối' } };
    }
}

/**
 * Mark single notification as read
 */
export async function markAsRead(token: string, notificationId: string): Promise<MarkReadResponse> {
    try {
        const response = await axios.post<MarkReadResponse>(
            `${API_BASE}/notifications/${notificationId}/read`,
            {},
            { headers: { Authorization: `Bearer ${token}` } }
        );
        return response.data;
    } catch (error: unknown) {
        if (axios.isAxiosError(error) && error.response) {
            return error.response.data as MarkReadResponse;
        }
        return { success: false, error: { code: 'NETWORK_ERROR', message: 'Lỗi kết nối' } };
    }
}

/**
 * Mark all notifications as read
 */
export async function markAllAsRead(token: string): Promise<MarkReadResponse> {
    try {
        const response = await axios.post<MarkReadResponse>(
            `${API_BASE}/notifications/read-all`,
            {},
            { headers: { Authorization: `Bearer ${token}` } }
        );
        return response.data;
    } catch (error: unknown) {
        if (axios.isAxiosError(error) && error.response) {
            return error.response.data as MarkReadResponse;
        }
        return { success: false, error: { code: 'NETWORK_ERROR', message: 'Lỗi kết nối' } };
    }
}
