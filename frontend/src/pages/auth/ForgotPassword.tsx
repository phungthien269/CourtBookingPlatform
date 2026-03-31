import { useState } from 'react';
import { Link } from 'react-router-dom';
import { authApi } from '../../api/client';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';

export function ForgotPassword() {
    const [email, setEmail] = useState('');
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (event: React.FormEvent) => {
        event.preventDefault();
        setLoading(true);
        setError('');
        setMessage('');

        try {
            const response = await authApi.forgotPassword({ email });
            setMessage(response.data.data.message);
        } catch (err: unknown) {
            const apiError = err as { response?: { data?: { error?: { message?: string } } } };
            setError(apiError.response?.data?.error?.message || 'Không thể gửi yêu cầu lúc này.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div>
            <h1 className="text-2xl font-heading font-semibold text-center mb-4">
                Quên mật khẩu
            </h1>
            <p className="text-sm text-gray-600 text-center mb-6">
                Nhập email để nhận liên kết đặt lại mật khẩu.
            </p>

            <form onSubmit={handleSubmit} className="space-y-4">
                {message && <div className="bg-green-50 text-green-700 px-4 py-2 rounded text-sm">{message}</div>}
                {error && <div className="bg-red-50 text-red-600 px-4 py-2 rounded text-sm">{error}</div>}

                <Input
                    label="Email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="your@email.com"
                    required
                />

                <Button type="submit" className="w-full" loading={loading}>
                    Gửi liên kết đặt lại mật khẩu
                </Button>
            </form>

            <p className="mt-6 text-center text-sm text-gray-600">
                <Link to="/auth/login" className="text-primary hover:underline">
                    Quay lại đăng nhập
                </Link>
            </p>
        </div>
    );
}
