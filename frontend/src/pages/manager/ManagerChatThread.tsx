/**
 * ManagerChatThread - Phase 5
 * Route: /manager/chat/:threadId
 * Message view and send for managers
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { getMessages, sendMessage, ChatMessage } from '../../api/chat';
import { ArrowLeft, Send, Loader2 } from 'lucide-react';
import { Button } from '../../components/ui/Button';

export default function ManagerChatThread() {
    const { threadId } = useParams<{ threadId: string }>();
    const { token } = useAuth();
    const navigate = useNavigate();
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [loading, setLoading] = useState(true);
    const [sending, setSending] = useState(false);
    const [newMessage, setNewMessage] = useState('');
    const [error, setError] = useState<string | null>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    const fetchMessages = useCallback(async () => {
        if (!token || !threadId) return;
        setLoading(true);

        try {
            const result = await getMessages(token, threadId);
            if (result.success && result.data) {
                setMessages(result.data.messages);
                setTimeout(scrollToBottom, 100);
            } else {
                setError(result.error?.message || 'Có lỗi xảy ra');
            }
        } catch (err) {
            setError('Không thể tải tin nhắn');
        } finally {
            setLoading(false);
        }
    }, [token, threadId]);

    useEffect(() => {
        fetchMessages();

        // Setup WebSocket listener for real-time messages
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

    return (
        <div className="h-[calc(100vh-4rem)] flex flex-col">
            {/* Header */}
            <div className="bg-white border-b px-4 py-3 flex items-center gap-3">
                <button onClick={() => navigate('/manager/chat')} className="p-1 hover:bg-gray-100 rounded">
                    <ArrowLeft className="w-5 h-5" />
                </button>
                <div>
                    <h2 className="font-semibold">Chat với khách hàng</h2>
                    <p className="text-xs text-gray-500">Thread: {threadId?.slice(0, 8)}...</p>
                </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-auto p-4 space-y-3 bg-gray-50">
                {loading ? (
                    <div className="flex justify-center py-8">
                        <Loader2 className="w-6 h-6 animate-spin text-primary" />
                    </div>
                ) : error ? (
                    <div className="text-center text-red-500 py-8">{error}</div>
                ) : messages.length === 0 ? (
                    <div className="text-center text-gray-500 py-8">
                        Chưa có tin nhắn
                    </div>
                ) : (
                    messages.map((msg) => (
                        <div
                            key={msg.id}
                            className={`flex ${msg.senderRole === 'MANAGER' ? 'justify-end' : 'justify-start'}`}
                        >
                            <div
                                className={`max-w-[70%] px-4 py-2 rounded-lg ${msg.senderRole === 'MANAGER'
                                    ? 'bg-primary text-white'
                                    : 'bg-white border'
                                    }`}
                            >
                                <p>{msg.content}</p>
                                <p className={`text-xs mt-1 ${msg.senderRole === 'MANAGER' ? 'text-white/70' : 'text-gray-400'
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
