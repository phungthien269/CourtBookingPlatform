import { useMemo, useState } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { authApi } from '../../api/client';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';

export function ResetPassword() {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const token = useMemo(() => searchParams.get('token') || '', [searchParams]);

    const handleSubmit = async (event: React.FormEvent) => {
        event.preventDefault();
        setError('');

        if (!token) {
            setError('Liên kết đặt lại mật khẩu không hợp lệ.');
            return;
        }

        if (password !== confirmPassword) {
            setError('Mật khẩu xác nhận không khớp.');
            return;
        }

        setLoading(true);
        try {
            await authApi.resetPassword({ token, password });
            navigate('/auth/login');
        } catch (err: unknown) {
            const apiError = err as { response?: { data?: { error?: { message?: string } } } };
            setError(apiError.response?.data?.error?.message || 'Không thể đặt lại mật khẩu.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div>
            <h1 className="text-2xl font-heading font-semibold text-center mb-4">
                Đặt lại mật khẩu
            </h1>
            <p className="text-sm text-gray-600 text-center mb-6">
                Mật khẩu mới phải có ít nhất 8 ký tự, gồm chữ hoa, chữ thường và số.
            </p>

            <form onSubmit={handleSubmit} className="space-y-4">
                {error && <div className="bg-red-50 text-red-600 px-4 py-2 rounded text-sm">{error}</div>}

                <Input
                    label="Mật khẩu mới"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                />

                <Input
                    label="Xác nhận mật khẩu mới"
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                />

                <Button type="submit" className="w-full" loading={loading}>
                    Cập nhật mật khẩu
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
