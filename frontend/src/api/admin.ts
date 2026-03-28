import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

interface ApiResponse<T> {
    success: boolean;
    data: T;
    error?: { code: string; message: string };
}

type ApiResult<T> = { success: true; data: T } | { success: false; error: { code: string; message: string } };

export type RenewalRequestStatus = 'ALL' | 'PENDING_REVIEW' | 'APPROVED' | 'REJECTED';
export type AdminManagerStatusFilter = 'ALL' | 'ACTIVE' | 'LOCKED' | 'EXPIRED' | 'NO_VENUE';
export type AdminManagerAccessState = Exclude<AdminManagerStatusFilter, 'ALL'>;
export type AdminAuditEventType = 'ALL' | 'MANAGER' | 'MANAGER_SUBSCRIPTION' | 'USER' | 'BOOKING' | 'SYSTEM' | 'ADMIN';

export interface AdminRenewalRequest {
    id: string;
    managerId: string;
    managerName: string;
    managerEmail: string;
    venueName: string;
    venueDistrict: string;
    currentExpiresAt: string | null;
    projectedExpiresAt: string | null;
    requestedAt: string;
    months: number;
    courtCount: number;
    amount: number;
    note: string | null;
    status: Exclude<RenewalRequestStatus, 'ALL'>;
    reviewedAt: string | null;
    reviewedByEmail: string | null;
    reviewNote: string | null;
}

export interface AdminOverview {
    stats: {
        totalManagers: number;
        totalUsers: number;
        activeVenues: number;
        pendingRenewals: number;
        expiredSubscriptions: number;
        bookingsToday: number;
    };
    recentRenewalRequests: AdminRenewalRequest[];
}

export interface AdminManager {
    id: string;
    displayName: string;
    contactName: string | null;
    email: string;
    createdAt: string;
    accessState: AdminManagerAccessState;
    userStatus: 'ACTIVE' | 'LOCKED';
    venue: {
        id: string;
        name: string;
        address: string;
        district: string;
        city: string;
        status: string;
    } | null;
    subscription: {
        expiresAt: string | null;
        daysRemaining: number | null;
        status: 'ACTIVE' | 'EXPIRED' | 'UNSET';
    };
    courtStats: {
        total: number;
        active: number;
    };
}

export interface AdminAuditLog {
    id: string;
    createdAt: string;
    eventType: string;
    actorEmail: string | null;
    actorRole: string | null;
    action: string;
    targetType: string | null;
    targetId: string | null;
    targetLabel: string | null;
    summary: string;
    details: Record<string, unknown> | null;
}

function getAuthConfig(token: string) {
    return {
        headers: { Authorization: `Bearer ${token}` },
    };
}

function getApiError(err: unknown): { code: string; message: string } {
    if (axios.isAxiosError(err) && err.response?.data?.error) {
        return err.response.data.error;
    }

    return { code: 'NETWORK_ERROR', message: 'Lỗi kết nối' };
}

async function getWithToken<T>(url: string, token: string, params?: Record<string, string | undefined>): Promise<ApiResult<T>> {
    try {
        const response = await axios.get<ApiResponse<T>>(url, {
            ...getAuthConfig(token),
            params,
        });

        return { success: true, data: response.data.data };
    } catch (err: unknown) {
        return { success: false, error: getApiError(err) };
    }
}

async function postWithToken<TResponse, TPayload>(url: string, payload: TPayload, token: string): Promise<ApiResult<TResponse>> {
    try {
        const response = await axios.post<ApiResponse<TResponse>>(url, payload, getAuthConfig(token));
        return { success: true, data: response.data.data };
    } catch (err: unknown) {
        return { success: false, error: getApiError(err) };
    }
}

export async function getAdminOverview(token: string): Promise<ApiResult<AdminOverview>> {
    return getWithToken(`${API_BASE}/admin/overview`, token);
}

export async function getAdminManagers(
    token: string,
    filters: { status: AdminManagerStatusFilter; query?: string }
): Promise<ApiResult<AdminManager[]>> {
    return getWithToken(`${API_BASE}/admin/managers`, token, {
        status: filters.status,
        query: filters.query,
    });
}

export async function createAdminManager(
    payload: { email: string; password: string; name: string; displayName: string },
    token: string
): Promise<ApiResult<AdminManager>> {
    return postWithToken(`${API_BASE}/admin/managers`, payload, token);
}

export async function updateAdminManagerStatus(
    managerId: string,
    status: 'ACTIVE' | 'LOCKED',
    token: string
): Promise<ApiResult<AdminManager>> {
    return postWithToken(`${API_BASE}/admin/managers/${managerId}/status`, { status }, token);
}

export async function getAdminRenewalRequests(
    token: string,
    status: RenewalRequestStatus
): Promise<ApiResult<AdminRenewalRequest[]>> {
    return getWithToken(`${API_BASE}/admin/renewal-requests`, token, { status });
}

export async function getAdminAuditLogs(
    token: string,
    filters: {
        eventType: AdminAuditEventType;
        query?: string;
        fromDate?: string;
        toDate?: string;
        limit?: number;
    }
): Promise<ApiResult<AdminAuditLog[]>> {
    return getWithToken(`${API_BASE}/admin/audit-logs`, token, {
        eventType: filters.eventType,
        query: filters.query,
        fromDate: filters.fromDate,
        toDate: filters.toDate,
        limit: filters.limit ? String(filters.limit) : undefined,
    });
}

export async function approveAdminRenewalRequest(
    requestId: string,
    token: string,
    reviewNote?: string
): Promise<ApiResult<AdminRenewalRequest>> {
    return postWithToken(`${API_BASE}/admin/renewal-requests/${requestId}/approve`, { reviewNote }, token);
}

export async function rejectAdminRenewalRequest(
    requestId: string,
    token: string,
    reviewNote: string
): Promise<ApiResult<AdminRenewalRequest>> {
    return postWithToken(`${API_BASE}/admin/renewal-requests/${requestId}/reject`, { reviewNote }, token);
}
