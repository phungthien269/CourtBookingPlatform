/**
 * ManagerChatInbox - Phase 5
 * Route: /manager/chat
 * Shows manager's chat threads with unread badges
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { getManagerInbox, ChatThread } from '../../api/chat';
import { MessageSquare, RefreshCw, User, Clock } from 'lucide-react';
import { Button } from '../../components/ui/Button';

export default function ManagerChatInbox() {
    const { token } = useAuth();
    const navigate = useNavigate();

    const [threads, setThreads] = useState<ChatThread[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchThreads = async () => {
        if (!token) return;
        setLoading(true);
        setError(null);

        try {
            const result = await getManagerInbox(token);
            if (result.success && result.data) {
                setThreads(result.data.threads);
            } else {
                setError(result.error?.message || 'Có lỗi xảy ra');
            }
        } catch (err) {
            setError('Không thể tải danh sách chat');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchThreads();
    }, [token]);

    const formatTime = (dateStr: string | null) => {
        if (!dateStr) return '';
        const date = new Date(dateStr);
        const now = new Date();
        const diffMs = now.getTime() - date.getTime();
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMins / 60);
        const diffDays = Math.floor(diffHours / 24);

        if (diffMins < 1) return 'Vừa xong';
        if (diffMins < 60) return `${diffMins} phút trước`;
        if (diffHours < 24) return `${diffHours} giờ trước`;
        if (diffDays < 7) return `${diffDays} ngày trước`;
        return date.toLocaleDateString('vi-VN');
    };

    return (
        <div className="max-w-2xl mx-auto p-4">
            <div className="flex items-center justify-between mb-6">
                <h1 className="text-2xl font-bold flex items-center gap-2">
                    <MessageSquare className="w-6 h-6" />
                    Hộp thư chat
                </h1>
                <Button variant="ghost" onClick={fetchThreads} disabled={loading}>
                    <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                </Button>
            </div>

            {error && (
                <div className="bg-red-50 text-red-600 p-4 rounded-lg mb-4">
                    {error}
                </div>
            )}

            {loading && threads.length === 0 ? (
                <div className="space-y-3">
                    {[1, 2, 3].map((i) => (
                        <div key={i} className="animate-pulse bg-gray-100 rounded-lg p-4">
                            <div className="h-4 bg-gray-200 rounded w-48 mb-2"></div>
                            <div className="h-3 bg-gray-200 rounded w-32"></div>
                        </div>
                    ))}
                </div>
            ) : threads.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                    <MessageSquare className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>Chưa có cuộc trò chuyện nào</p>
                </div>
            ) : (
                <div className="space-y-2">
                    {threads.map((thread) => (
                        <button
                            key={thread.threadId}
                            onClick={() => navigate(`/manager/chat/${thread.threadId}`)}
                            className="w-full bg-white border rounded-lg p-4 hover:bg-gray-50 transition-colors text-left flex items-center justify-between"
                        >
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                                    <User className="w-5 h-5 text-primary" />
                                </div>
                                <div>
                                    <div className="font-medium flex items-center gap-2">
                                        {thread.userMasked}
                                        {thread.managerUnreadCount > 0 && (
                                            <span className="bg-red-500 text-white text-xs px-2 py-0.5 rounded-full">
                                                {thread.managerUnreadCount}
                                            </span>
                                        )}
                                    </div>
                                    <div className="text-sm text-gray-500">
                                        {thread.venueName}
                                    </div>
                                </div>
                            </div>
                            <div className="text-xs text-gray-400 flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                {formatTime(thread.lastMessageAt)}
                            </div>
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}
