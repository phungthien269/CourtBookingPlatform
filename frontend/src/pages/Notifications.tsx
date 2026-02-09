/**
 * Notifications Page - Phase 6
 * Full list with tabs (All / Unread) and infinite scroll
 */

import { useState, useEffect, useCallback } from 'react';
import { Bell, Check, CheckCheck } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { getNotifications, markAsRead, markAllAsRead, NotificationItem } from '../api/notification';
import { Button } from '../components/ui/Button';
import { useNavigate } from 'react-router-dom';

type TabType = 'all' | 'unread';

export default function Notifications() {
    const { token } = useAuth();
    const navigate = useNavigate();
    const [tab, setTab] = useState<TabType>('all');
    const [notifications, setNotifications] = useState<NotificationItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);
    const [nextCursor, setNextCursor] = useState<string | null>(null);
    const [markingAll, setMarkingAll] = useState(false);

    // Fetch notifications
    const fetchNotifications = useCallback(async (cursor?: string) => {
        if (!token) return;

        if (cursor) {
            setLoadingMore(true);
        } else {
            setLoading(true);
        }

        const result = await getNotifications(token, {
            isRead: tab === 'unread' ? false : undefined,
            cursor,
            limit: 20,
        });

        if (result.success && result.data) {
            if (cursor) {
                setNotifications((prev) => [...prev, ...result.data!.items]);
            } else {
                setNotifications(result.data.items);
            }
            setNextCursor(result.data.nextCursor);
        }

        setLoading(false);
        setLoadingMore(false);
    }, [token, tab]);

    // Initial fetch and refetch on tab change
    useEffect(() => {
        setNotifications([]);
        setNextCursor(null);
        fetchNotifications();
    }, [fetchNotifications]);

    // Handle mark as read
    const handleMarkAsRead = async (notification: NotificationItem) => {
        if (!token || notification.isRead) return;

        await markAsRead(token, notification.id);
        setNotifications((prev) =>
            prev.map((n) => (n.id === notification.id ? { ...n, isRead: true } : n))
        );
    };

    // Handle mark all as read
    const handleMarkAllAsRead = async () => {
        if (!token) return;
        setMarkingAll(true);
        const result = await markAllAsRead(token);
        if (result.success) {
            setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
        }
        setMarkingAll(false);
    };

    // Handle notification click
    const handleNotificationClick = async (notification: NotificationItem) => {
        await handleMarkAsRead(notification);
        if (notification.bookingId) {
            navigate(`/me/bookings/${notification.bookingId}`);
        }
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

    // Get icon based on notification type
    const getNotificationIcon = (type: string) => {
        switch (type) {
            case 'BOOKING_CREATED':
                return '📋';
            case 'BOOKING_CONFIRMED':
                return '✅';
            case 'BOOKING_REJECTED':
                return '❌';
            case 'PAYMENT_CONFIRMED':
                return '💳';
            case 'CHAT_MESSAGE':
                return '💬';
            case 'REVIEW_CREATED':
                return '⭐';
            default:
                return '🔔';
        }
    };

    const unreadCount = notifications.filter((n) => !n.isRead).length;

    return (
        <div className="min-h-screen bg-gray-50">
            <div className="max-w-2xl mx-auto px-4 py-6">
                {/* Header */}
                <div className="flex items-center justify-between mb-6">
                    <h1 className="text-2xl font-bold text-gray-800">Thông báo</h1>
                    {unreadCount > 0 && (
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={handleMarkAllAsRead}
                            disabled={markingAll}
                            className="text-primary"
                        >
                            <CheckCheck size={18} className="mr-1" />
                            {markingAll ? 'Đang xử lý...' : 'Đánh dấu tất cả đã đọc'}
                        </Button>
                    )}
                </div>

                {/* Tabs */}
                <div className="flex gap-2 mb-4">
                    <button
                        onClick={() => setTab('all')}
                        className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${tab === 'all'
                                ? 'bg-primary text-white'
                                : 'bg-white text-gray-600 hover:bg-gray-100'
                            }`}
                    >
                        Tất cả
                    </button>
                    <button
                        onClick={() => setTab('unread')}
                        className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${tab === 'unread'
                                ? 'bg-primary text-white'
                                : 'bg-white text-gray-600 hover:bg-gray-100'
                            }`}
                    >
                        Chưa đọc
                    </button>
                </div>

                {/* Content */}
                <div className="bg-white rounded-lg shadow-sm border border-gray-200">
                    {loading ? (
                        <div className="p-8 text-center text-gray-500">
                            <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full mx-auto mb-2" />
                            <p>Đang tải...</p>
                        </div>
                    ) : notifications.length === 0 ? (
                        <div className="p-12 text-center text-gray-500">
                            <Bell className="mx-auto mb-4 text-gray-300" size={48} />
                            <p className="text-lg font-medium">Chưa có thông báo</p>
                            <p className="text-sm mt-1">
                                {tab === 'unread'
                                    ? 'Bạn đã đọc hết thông báo rồi!'
                                    : 'Thông báo mới sẽ xuất hiện ở đây'}
                            </p>
                        </div>
                    ) : (
                        <>
                            {notifications.map((notification) => (
                                <button
                                    key={notification.id}
                                    onClick={() => handleNotificationClick(notification)}
                                    className={`w-full text-left p-4 hover:bg-gray-50 border-b border-gray-100 transition-colors flex items-start gap-3 ${!notification.isRead ? 'bg-blue-50/50' : ''
                                        }`}
                                >
                                    {/* Icon */}
                                    <span className="text-2xl flex-shrink-0">
                                        {getNotificationIcon(notification.type)}
                                    </span>

                                    {/* Content */}
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-start justify-between gap-2">
                                            <p className="font-semibold text-gray-800">
                                                {notification.title}
                                            </p>
                                            {!notification.isRead && (
                                                <span className="w-2 h-2 bg-primary rounded-full flex-shrink-0 mt-2" />
                                            )}
                                        </div>
                                        <p className="text-gray-600 text-sm mt-0.5">
                                            {notification.body}
                                        </p>
                                        <p className="text-gray-400 text-xs mt-2">
                                            {formatRelativeTime(notification.createdAt)}
                                        </p>
                                    </div>

                                    {/* Mark as read button (for unread) */}
                                    {!notification.isRead && (
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleMarkAsRead(notification);
                                            }}
                                            className="p-2 text-gray-400 hover:text-primary transition-colors"
                                            title="Đánh dấu đã đọc"
                                        >
                                            <Check size={18} />
                                        </button>
                                    )}
                                </button>
                            ))}

                            {/* Load more */}
                            {nextCursor && (
                                <div className="p-4 text-center">
                                    <Button
                                        variant="secondary"
                                        onClick={() => fetchNotifications(nextCursor)}
                                        disabled={loadingMore}
                                    >
                                        {loadingMore ? 'Đang tải...' : 'Tải thêm'}
                                    </Button>
                                </div>
                            )}
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}
