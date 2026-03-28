/**
 * NotificationBell - Phase 6
 * Bell icon with unread badge + dropdown for header
 */

import { useState, useEffect, useRef } from 'react';
import { Bell } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { getNotifications, getUnreadCount, markAsRead, NotificationItem } from '../api/notification';

export default function NotificationBell() {
    const { token, user } = useAuth();
    const navigate = useNavigate();
    const [unreadCount, setUnreadCount] = useState(0);
    const [isOpen, setIsOpen] = useState(false);
    const [notifications, setNotifications] = useState<NotificationItem[]>([]);
    const [loading, setLoading] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    // Fetch unread count
    const fetchUnreadCount = async () => {
        if (!token) return;
        const result = await getUnreadCount(token);
        if (result.success && result.data) {
            setUnreadCount(result.data.count);
        }
    };

    // Fetch recent notifications for dropdown
    const fetchRecentNotifications = async () => {
        if (!token) return;
        setLoading(true);
        const result = await getNotifications(token, { limit: 5 });
        if (result.success && result.data) {
            setNotifications(result.data.items);
        }
        setLoading(false);
    };

    // Initial fetch
    useEffect(() => {
        fetchUnreadCount();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [token]);

    // Handle dropdown open
    useEffect(() => {
        if (isOpen) {
            fetchRecentNotifications();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isOpen]);

    // Close on outside click
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Handle WebSocket notification:new
    useEffect(() => {
        const handleWsMessage = (event: MessageEvent) => {
            try {
                const data = JSON.parse(event.data);
                if (data.type === 'notification:new') {
                    setUnreadCount((prev) => prev + 1);
                    // Prepend to list if dropdown is open
                    if (isOpen) {
                        setNotifications((prev) => [data.payload, ...prev.slice(0, 4)]);
                    }
                }
            } catch {
                // Ignore non-JSON messages
            }
        };

        // Find WS instance (if available globally)
        const ws = (window as any).__ws;
        if (ws) {
            ws.addEventListener('message', handleWsMessage);
            return () => ws.removeEventListener('message', handleWsMessage);
        }
    }, [isOpen]);

    // Mark notification as read and navigate
    const handleNotificationClick = async (notification: NotificationItem) => {
        if (!token) return;

        if (!notification.isRead) {
            await markAsRead(token, notification.id);
            setUnreadCount((prev) => Math.max(0, prev - 1));
            setNotifications((prev) =>
                prev.map((n) => (n.id === notification.id ? { ...n, isRead: true } : n))
            );
        }

        setIsOpen(false);

        // Navigate based on type
        if (notification.bookingId) {
            if (user?.role === 'MANAGER') {
                navigate('/manager/bookings');
                return;
            }

            navigate(`/me/bookings/${notification.bookingId}`);
            return;
        }

        navigate(user?.role === 'MANAGER' ? '/manager/notifications' : '/notifications');
    };

    // Format relative time
    const formatRelativeTime = (dateStr: string) => {
        const date = new Date(dateStr);
        const now = new Date();
        const diffMs = now.getTime() - date.getTime();
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);
        const diffDays = Math.floor(diffMs / 86400000);

        if (diffMins < 1) return 'Vừa xong';
        if (diffMins < 60) return `${diffMins} phút trước`;
        if (diffHours < 24) return `${diffHours} giờ trước`;
        return `${diffDays} ngày trước`;
    };

    return (
        <div className="relative" ref={dropdownRef}>
            {/* Bell Button */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="relative p-2 text-gray-600 hover:text-primary transition-colors rounded-full hover:bg-gray-100"
                aria-label="Thông báo"
            >
                <Bell size={22} />
                {unreadCount > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] flex items-center justify-center text-xs font-medium text-white bg-red-500 rounded-full px-1">
                        {unreadCount > 99 ? '99+' : unreadCount}
                    </span>
                )}
            </button>

            {/* Dropdown */}
            {isOpen && (
                <div className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-lg border border-gray-200 z-50">
                    <div className="p-3 border-b border-gray-100 flex items-center justify-between">
                        <span className="font-semibold text-gray-800">Thông báo</span>
                        <Link
                            to={user?.role === 'MANAGER' ? '/manager/notifications' : '/notifications'}
                            onClick={() => setIsOpen(false)}
                            className="text-sm text-primary hover:underline"
                        >
                            Xem tất cả
                        </Link>
                    </div>

                    <div className="max-h-80 overflow-y-auto">
                        {loading ? (
                            <div className="p-4 text-center text-gray-500">Đang tải...</div>
                        ) : notifications.length === 0 ? (
                            <div className="p-6 text-center text-gray-500">
                                <Bell className="mx-auto mb-2 text-gray-300" size={32} />
                                <p>Chưa có thông báo</p>
                            </div>
                        ) : (
                            notifications.map((notification) => (
                                <button
                                    key={notification.id}
                                    onClick={() => handleNotificationClick(notification)}
                                    className={`w-full text-left p-3 hover:bg-gray-50 border-b border-gray-50 transition-colors ${!notification.isRead ? 'bg-blue-50/50' : ''
                                        }`}
                                >
                                    <div className="flex items-start gap-2">
                                        {!notification.isRead && (
                                            <span className="mt-1.5 w-2 h-2 bg-primary rounded-full flex-shrink-0" />
                                        )}
                                        <div className="flex-1 min-w-0">
                                            <p className="font-medium text-gray-800 text-sm truncate">
                                                {notification.title}
                                            </p>
                                            <p className="text-gray-600 text-sm line-clamp-2">
                                                {notification.body}
                                            </p>
                                            <p className="text-gray-400 text-xs mt-1">
                                                {formatRelativeTime(notification.createdAt)}
                                            </p>
                                        </div>
                                    </div>
                                </button>
                            ))
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
