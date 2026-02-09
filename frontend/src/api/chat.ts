/**
 * Chat API Client - Phase 5
 */

import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

// ==================== Types ====================

export interface ChatMessage {
    id: string;
    senderUserId: string;
    senderRole: 'USER' | 'MANAGER';
    content: string;
    createdAt: string;
}

export interface ChatThread {
    threadId: string;
    bookingId: string;
    venueName: string;
    userMasked: string;
    lastMessageAt: string | null;
    managerUnreadCount: number;
}

export interface CreateThreadResponse {
    success: boolean;
    data?: {
        threadId: string;
        isNew: boolean;
    };
    error?: { code: string; message: string };
}

export interface GetMessagesResponse {
    success: boolean;
    data?: {
        messages: ChatMessage[];
    };
    error?: { code: string; message: string };
}

export interface SendMessageResponse {
    success: boolean;
    data?: ChatMessage;
    error?: { code: string; message: string };
}

export interface ManagerInboxResponse {
    success: boolean;
    data?: {
        threads: ChatThread[];
    };
    error?: { code: string; message: string };
}

// ==================== API Functions ====================

/**
 * Create or get existing thread for a booking
 */
export async function createOrGetThread(
    token: string,
    bookingId: string
): Promise<CreateThreadResponse> {
    try {
        const response = await axios.post<CreateThreadResponse>(
            `${API_BASE}/chat/threads`,
            { bookingId },
            { headers: { Authorization: `Bearer ${token}` } }
        );
        return response.data;
    } catch (error: unknown) {
        if (axios.isAxiosError(error) && error.response) {
            return error.response.data as CreateThreadResponse;
        }
        return { success: false, error: { code: 'NETWORK_ERROR', message: 'Lỗi kết nối' } };
    }
}

/**
 * Get messages for a thread
 */
export async function getMessages(
    token: string,
    threadId: string,
    limit: number = 50,
    before?: string
): Promise<GetMessagesResponse> {
    try {
        const response = await axios.get<GetMessagesResponse>(
            `${API_BASE}/chat/threads/${threadId}/messages`,
            {
                params: { limit, ...(before && { before }) },
                headers: { Authorization: `Bearer ${token}` },
            }
        );
        return response.data;
    } catch (error: unknown) {
        if (axios.isAxiosError(error) && error.response) {
            return error.response.data as GetMessagesResponse;
        }
        return { success: false, error: { code: 'NETWORK_ERROR', message: 'Lỗi kết nối' } };
    }
}

/**
 * Send a message in a thread
 */
export async function sendMessage(
    token: string,
    threadId: string,
    content: string
): Promise<SendMessageResponse> {
    try {
        const response = await axios.post<SendMessageResponse>(
            `${API_BASE}/chat/threads/${threadId}/messages`,
            { content },
            { headers: { Authorization: `Bearer ${token}` } }
        );
        return response.data;
    } catch (error: unknown) {
        if (axios.isAxiosError(error) && error.response) {
            return error.response.data as SendMessageResponse;
        }
        return { success: false, error: { code: 'NETWORK_ERROR', message: 'Lỗi kết nối' } };
    }
}

/**
 * Get manager's chat inbox
 */
export async function getManagerInbox(token: string): Promise<ManagerInboxResponse> {
    try {
        const response = await axios.get<ManagerInboxResponse>(
            `${API_BASE}/chat/manager/inbox`,
            { headers: { Authorization: `Bearer ${token}` } }
        );
        return response.data;
    } catch (error: unknown) {
        if (axios.isAxiosError(error) && error.response) {
            return error.response.data as ManagerInboxResponse;
        }
        return { success: false, error: { code: 'NETWORK_ERROR', message: 'Lỗi kết nối' } };
    }
}
