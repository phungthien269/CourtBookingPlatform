import { useState } from 'react';
import { Button } from '../../components/ui/Button';

export function Chat() {
    const [message, setMessage] = useState('');

    const messages = [
        { id: 1, sender: 'manager', text: 'Xin chào! Cảm ơn bạn đã đặt sân. Có gì tôi có thể giúp?', time: '14:30' },
        { id: 2, sender: 'user', text: 'Chào bạn, mình muốn hỏi sân có chỗ gửi xe không ạ?', time: '14:32' },
        { id: 3, sender: 'manager', text: 'Có bạn nhé, sân mình có bãi xe miễn phí cho khách.', time: '14:33' },
    ];

    const handleSend = (e: React.FormEvent) => {
        e.preventDefault();
        if (!message.trim()) return;
        // Phase 1: actually send message
        console.log('Sending:', message);
        setMessage('');
    };

    return (
        <div className="h-[calc(100vh-8rem)] flex flex-col">
            {/* Header */}
            <div className="bg-white border-b px-4 py-3">
                <h2 className="font-semibold">Sân cầu lông Phú Nhuận</h2>
                <p className="text-sm text-gray-500">Booking #BK-123456 • Manager: Nguyễn Văn A</p>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-auto p-4 space-y-4 bg-gray-50">
                {messages.map((msg) => (
                    <div
                        key={msg.id}
                        className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                        <div
                            className={`max-w-[70%] px-4 py-2 rounded-lg ${msg.sender === 'user'
                                    ? 'bg-primary text-white'
                                    : 'bg-white border'
                                }`}
                        >
                            <p>{msg.text}</p>
                            <p className={`text-xs mt-1 ${msg.sender === 'user' ? 'text-primary-light' : 'text-gray-400'}`}>
                                {msg.time}
                            </p>
                        </div>
                    </div>
                ))}
            </div>

            {/* Input */}
            <form onSubmit={handleSend} className="bg-white border-t px-4 py-3 flex gap-2">
                <input
                    type="text"
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Nhập tin nhắn..."
                    className="input flex-1"
                />
                <Button type="submit">Gửi</Button>
            </form>
        </div>
    );
}
