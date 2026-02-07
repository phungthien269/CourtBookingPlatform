import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || '';

export const api = axios.create({
    baseURL: API_BASE_URL,
    headers: {
        'Content-Type': 'application/json',
    },
});

// Request interceptor to add auth token
api.interceptors.request.use((config) => {
    const token = localStorage.getItem('token');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

// Response interceptor to handle 401
api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response?.status === 401) {
            localStorage.removeItem('token');
            window.location.href = '/auth/login';
        }
        return Promise.reject(error);
    }
);

// Auth API
export const authApi = {
    register: (data: { email: string; password: string; name?: string }) =>
        api.post('/api/auth/register', data),

    verifyOtp: (data: { email: string; otp: string }) =>
        api.post('/api/auth/verify-otp', data),

    login: (data: { email: string; password: string }) =>
        api.post('/api/auth/login', data),

    getMe: () => api.get('/api/auth/me'),
};

export default api;
