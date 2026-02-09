/**
 * Chat - Phase 5
 * User chat page with real-time messaging
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { createOrGetThread, getMessages, sendMessage, ChatMessage } from '../../api/chat';
import { ArrowLeft, Send, Loader2 } from 'lucide-react';
import { Button } from '../../components/ui/Button';

export function Chat() {
    const { bookingId } = useParams<{ bookingId: string }>();
    const { token } = useAuth();
    const navigate = useNavigate();
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const [threadId, setThreadId] = useState<string | null>(null);
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [loading, setLoading] = useState(true);
    const [sending, setSending] = useState(false);
    const [newMessage, setNewMessage] = useState('');
    const [error, setError] = useState<string | null>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    // Initialize thread
    useEffect(() => {
        const initThread = async () => {
            if (!token || !bookingId) return;
            setLoading(true);
            setError(null);

            try {
                const result = await createOrGetThread(token, bookingId);
                if (result.success && result.data) {
                    setThreadId(result.data.threadId);
                } else {
                    setError(result.error?.message || 'Không thể tạo cuộc trò chuyện');
                }
            } catch (err) {
                setError('Có lỗi xảy ra');
            } finally {
                setLoading(false);
            }
        };

        initThread();
    }, [token, bookingId]);

    // Fetch messages when thread is ready
    const fetchMessages = useCallback(async () => {
        if (!token || !threadId) return;

        try {
            const result = await getMessages(token, threadId);
            if (result.success && result.data) {
                setMessages(result.data.messages);
                setTimeout(scrollToBottom, 100);
            }
        } catch (err) {
            console.error('Failed to fetch messages:', err);
        }
    }, [token, threadId]);

    useEffect(() => {
        if (threadId) {
            fetchMessages();

            // Setup WebSocket for real-time updates
            const wsUrl = `${import.meta.env.VITE_WS_URL || 'ws://localhost:3001/ws'}?token=${token}`;
            const ws = new WebSocket(wsUrl);

            ws.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data);
                    if (data.type === 'chat.message.created' && data.payload.threadId === threadId) {
                        setMessages((prev) => [...prev, {
                            id: Date.now().toString(),
                            senderUserId: '',
                            senderRole: data.payload.senderRole,
                            content: data.payload.content,
                            createdAt: data.payload.createdAt,
                        }]);
                        setTimeout(scrollToBottom, 100);
                    }
                } catch { }
            };

            return () => ws.close();
        }
    }, [fetchMessages, token, threadId]);

    const handleSend = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!token || !threadId || !newMessage.trim() || sending) return;

        setSending(true);
        try {
            const result = await sendMessage(token, threadId, newMessage.trim());
            if (result.success && result.data) {
                setMessages((prev) => [...prev, result.data!]);
                setNewMessage('');
                setTimeout(scrollToBottom, 100);
            } else {
                setError(result.error?.message || 'Không thể gửi tin nhắn');
            }
        } catch {
            setError('Không thể gửi tin nhắn');
        } finally {
            setSending(false);
        }
    };

    const formatTime = (dateStr: string) => {
        return new Date(dateStr).toLocaleTimeString('vi-VN', {
            hour: '2-digit',
            minute: '2-digit',
        });
    };

    if (loading) {
        return (
            <div className="h-[calc(100vh-8rem)] flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
        );
    }

    if (error) {
        return (
            <div className="h-[calc(100vh-8rem)] flex items-center justify-center">
                <div className="text-center">
                    <p className="text-red-500 mb-4">{error}</p>
                    <Button onClick={() => navigate(-1)}>Quay lại</Button>
                </div>
            </div>
        );
    }

    return (
        <div className="h-[calc(100vh-8rem)] flex flex-col">
            {/* Header */}
            <div className="bg-white border-b px-4 py-3 flex items-center gap-3">
                <button onClick={() => navigate(-1)} className="p-1 hover:bg-gray-100 rounded">
                    <ArrowLeft className="w-5 h-5" />
                </button>
                <div>
                    <h2 className="font-semibold">Chat với quản lý sân</h2>
                    <p className="text-xs text-gray-500">Booking: {bookingId?.slice(0, 8)}...</p>
                </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-auto p-4 space-y-3 bg-gray-50">
                {messages.length === 0 ? (
                    <div className="text-center text-gray-500 py-8">
                        Bắt đầu cuộc trò chuyện với quản lý sân
                    </div>
                ) : (
                    messages.map((msg) => (
                        <div
                            key={msg.id}
                            className={`flex ${msg.senderRole === 'USER' ? 'justify-end' : 'justify-start'}`}
                        >
                            <div
                                className={`max-w-[70%] px-4 py-2 rounded-lg ${msg.senderRole === 'USER'
                                    ? 'bg-primary text-white'
                                    : 'bg-white border'
                                    }`}
                            >
                                <p>{msg.content}</p>
                                <p className={`text-xs mt-1 ${msg.senderRole === 'USER' ? 'text-white/70' : 'text-gray-400'
                                    }`}>
                                    {formatTime(msg.createdAt)}
                                </p>
                            </div>
                        </div>
                    ))
                )}
                <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <form onSubmit={handleSend} className="bg-white border-t px-4 py-3 flex gap-2">
                <input
                    type="text"
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder="Nhập tin nhắn..."
                    maxLength={1000}
                    className="flex-1 px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                    disabled={sending}
                />
                <Button type="submit" disabled={sending || !newMessage.trim()}>
                    {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                </Button>
            </form>
        </div>
    );
}
