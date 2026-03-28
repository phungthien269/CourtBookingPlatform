import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

interface ApiResponse<T> {
    success: boolean;
    data: T;
    error?: { code: string; message: string };
}

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

export interface ManagerContext {
    manager: {
        id: string;
        displayName: string;
        contactEmail: string;
        contactName: string | null;
    };
    venue: {
        id: string;
        name: string;
        address: string;
        district: string;
        city: string;
        status: string;
        activeCourtCount: number;
        totalCourtCount: number;
    };
    subscription: {
        expiresAt: string | null;
        daysRemaining: number | null;
        monthlyFeePerCourt: number;
        totalMonthlyFee: number;
        status: 'ACTIVE' | 'EXPIRING_SOON' | 'EXPIRED' | 'UNSET';
    };
}

export interface ManagerOverview {
    date: string;
    venue: ManagerContext['venue'];
    subscription: ManagerContext['subscription'];
    stats: {
        totalBookings: number;
        waitingConfirm: number;
        confirmed: number;
        cancelled: number;
        completed: number;
        revenue: number;
    };
    hours: number[];
    courts: Array<{
        id: string;
        name: string;
        sportTypeName: string;
        isActive: boolean;
        blocks: Array<{
            id: string;
            type: 'BOOKING' | 'BLACKOUT';
            status: string;
            startHour: number;
            endHour: number;
            startTime: string;
            endTime: string;
            title: string;
            subtitle: string;
            amount?: number;
        }>;
    }>;
    upcomingHolidays: Array<{
        id: string;
        date: string;
        note: string | null;
    }>;
}

export interface ManagerCourtList {
    venue: {
        id: string;
        name: string;
        address: string;
        district: string;
        city: string;
        description: string | null;
        status: string;
        bankName: string | null;
        bankAccountNumber: string | null;
        bankAccountName: string | null;
        images: Array<{
            id: string;
            url: string;
            isCover: boolean;
        }>;
    };
    limits: {
        maxImages: number;
    };
    courts: Array<{
        id: string;
        name: string;
        pricePerHour: number;
        isActive: boolean;
        sportType: {
            code: string;
            name: string;
        };
        upcomingBookings: number;
    }>;
}

export interface ManagerSchedule {
    venueId: string;
    weeklySchedules: Array<{
        id: string;
        dayOfWeek: number;
        openTime: string;
        closeTime: string;
    }>;
    holidays: Array<{
        id: string;
        date: string;
        note: string | null;
    }>;
    blackouts: Array<{
        id: string;
        courtId: string;
        courtName: string;
        date: string;
        startTime: string;
        endTime: string;
        reason: string | null;
    }>;
    courts: Array<{
        id: string;
        name: string;
        sportTypeName: string;
        isActive: boolean;
    }>;
}

export interface ManagerAnalytics {
    range: 'day' | 'week' | 'month';
    period: {
        startDate: string;
        endDate: string;
        label: string;
    };
    summary: {
        totalBookings: number;
        waitingConfirm: number;
        confirmed: number;
        cancelled: number;
        completed: number;
        totalRevenue: number;
        averageBookingValue: number;
        utilizedHours: number;
    };
    byDay: Array<{
        label: string;
        date: string;
        bookingCount: number;
        revenue: number;
    }>;
    byCourt: Array<{
        courtId: string;
        courtName: string;
        sportTypeName: string;
        bookingCount: number;
        confirmedCount: number;
        utilizedHours: number;
        revenue: number;
    }>;
    recentBookings: Array<{
        bookingId: string;
        date: string;
        startTime: string;
        endTime: string;
        status: string;
        totalPrice: number;
        courtName: string;
        userName: string;
        paymentMethod: string | null;
    }>;
}

export interface ManagerSubscription {
    venueName: string;
    displayName: string;
    subscription: {
        expiresAt: string | null;
        daysRemaining: number | null;
        monthlyFeePerCourt: number;
        totalMonthlyFee: number;
        status: 'ACTIVE' | 'EXPIRING_SOON' | 'EXPIRED' | 'UNSET';
        activeCourtCount: number;
        totalCourtCount: number;
    };
    paymentInstruction: {
        bankName: string;
        accountName: string;
        accountNumber: string;
        qrCodeUrl: string;
        transferContent: string;
        note: string;
    };
    requests: Array<{
        id: string;
        months: number;
        courtCount: number;
        amount: number;
        requestedAt: string;
        note: string | null;
        status: string;
    }>;
}

type ApiResult<T> = { success: true; data: T } | { success: false; error: { code: string; message: string } };

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

async function patchWithToken<TResponse, TPayload>(url: string, payload: TPayload, token: string): Promise<ApiResult<TResponse>> {
    try {
        const response = await axios.patch<ApiResponse<TResponse>>(url, payload, getAuthConfig(token));
        return { success: true, data: response.data.data };
    } catch (err: unknown) {
        return { success: false, error: getApiError(err) };
    }
}

async function putWithToken<TResponse, TPayload>(url: string, payload: TPayload, token: string): Promise<ApiResult<TResponse>> {
    try {
        const response = await axios.put<ApiResponse<TResponse>>(url, payload, getAuthConfig(token));
        return { success: true, data: response.data.data };
    } catch (err: unknown) {
        return { success: false, error: getApiError(err) };
    }
}

async function deleteWithToken<TResponse>(url: string, token: string): Promise<ApiResult<TResponse>> {
    try {
        const response = await axios.delete<ApiResponse<TResponse>>(url, getAuthConfig(token));
        return { success: true, data: response.data.data };
    } catch (err: unknown) {
        return { success: false, error: getApiError(err) };
    }
}

export async function getManagerBookings(
    token: string,
    filters?: { date?: string; status?: string }
): Promise<ApiResult<ManagerBookingItem[]>> {
    return getWithToken(`${API_BASE}/manager/bookings`, token, filters);
}

export async function confirmBooking(
    bookingId: string,
    token: string
): Promise<ApiResult<{ bookingId: string; status: string; confirmedAt: string }>> {
    return postWithToken(`${API_BASE}/manager/bookings/${bookingId}/confirm`, {}, token);
}

export async function cancelBooking(
    bookingId: string,
    reason: string,
    token: string
): Promise<ApiResult<{ bookingId: string; status: string; reason: string }>> {
    return postWithToken(`${API_BASE}/manager/bookings/${bookingId}/cancel`, { reason }, token);
}

export async function getManagerContext(token: string): Promise<ApiResult<ManagerContext>> {
    return getWithToken(`${API_BASE}/manager/context`, token);
}

export async function getManagerOverview(token: string, date?: string): Promise<ApiResult<ManagerOverview>> {
    return getWithToken(`${API_BASE}/manager/overview`, token, { date });
}

export async function getManagerCourts(token: string): Promise<ApiResult<ManagerCourtList>> {
    return getWithToken(`${API_BASE}/manager/courts`, token);
}

export async function updateManagerCourt(
    courtId: string,
    payload: { name?: string; pricePerHour?: number; isActive?: boolean },
    token: string
): Promise<ApiResult<ManagerCourtList['courts'][number]>> {
    return patchWithToken(`${API_BASE}/manager/courts/${courtId}`, payload, token);
}

export async function addVenueImage(
    payload: { url: string; isCover?: boolean },
    token: string
): Promise<ApiResult<ManagerCourtList['venue']['images']>> {
    return postWithToken(`${API_BASE}/manager/venue/images`, payload, token);
}

export async function deleteVenueImage(
    imageId: string,
    token: string
): Promise<ApiResult<ManagerCourtList['venue']['images']>> {
    return deleteWithToken(`${API_BASE}/manager/venue/images/${imageId}`, token);
}

export async function setVenueCoverImage(
    imageId: string,
    token: string
): Promise<ApiResult<ManagerCourtList['venue']['images']>> {
    return postWithToken(`${API_BASE}/manager/venue/images/${imageId}/cover`, {}, token);
}

export async function getManagerSchedule(token: string): Promise<ApiResult<ManagerSchedule>> {
    return getWithToken(`${API_BASE}/manager/schedule`, token);
}

export async function replaceWeeklySchedule(
    schedules: Array<{ dayOfWeek: number; openTime: string; closeTime: string }>,
    token: string
): Promise<ApiResult<ManagerSchedule['weeklySchedules']>> {
    return putWithToken(`${API_BASE}/manager/schedule/weekly`, { schedules }, token);
}

export async function addManagerHoliday(
    payload: { date: string; note?: string },
    token: string
): Promise<ApiResult<ManagerSchedule['holidays'][number]>> {
    return postWithToken(`${API_BASE}/manager/holidays`, payload, token);
}

export async function removeManagerHoliday(
    holidayId: string,
    token: string
): Promise<ApiResult<{ deleted: boolean }>> {
    return deleteWithToken(`${API_BASE}/manager/holidays/${holidayId}`, token);
}

export async function addManagerBlackout(
    payload: { courtId: string; date: string; startTime: string; endTime: string; reason?: string },
    token: string
): Promise<ApiResult<ManagerSchedule['blackouts'][number]>> {
    return postWithToken(`${API_BASE}/manager/blackouts`, payload, token);
}

export async function removeManagerBlackout(
    blackoutId: string,
    token: string
): Promise<ApiResult<{ deleted: boolean }>> {
    return deleteWithToken(`${API_BASE}/manager/blackouts/${blackoutId}`, token);
}

export async function getManagerAnalytics(
    token: string,
    range: 'day' | 'week' | 'month'
): Promise<ApiResult<ManagerAnalytics>> {
    return getWithToken(`${API_BASE}/manager/analytics`, token, { range });
}

export async function getManagerSubscription(token: string): Promise<ApiResult<ManagerSubscription>> {
    return getWithToken(`${API_BASE}/manager/subscription`, token);
}

export async function requestSubscriptionRenewal(
    payload: { months: number; note?: string },
    token: string
): Promise<ApiResult<{ id: string; months: number; courtCount: number; amount: number; requestedAt: string; note: string | null; status: string }>> {
    return postWithToken(`${API_BASE}/manager/subscription/renewal-request`, payload, token);
}
