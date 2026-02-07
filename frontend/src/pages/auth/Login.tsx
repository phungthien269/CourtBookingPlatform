import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';

export function Login() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const { login, user } = useAuth();
    const navigate = useNavigate();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            await login(email, password);
            // Redirect based on role
            const userData = user;
            if (userData?.role === 'ADMIN') {
                navigate('/admin');
            } else if (userData?.role === 'MANAGER') {
                navigate('/manager');
            } else {
                navigate('/me/bookings');
            }
        } catch (err: any) {
            const errorCode = err.response?.data?.error;
            if (errorCode === 'EMAIL_NOT_VERIFIED') {
                setError('Email chưa được xác thực. Vui lòng kiểm tra email.');
            } else if (errorCode === 'ACCOUNT_LOCKED') {
                setError('Tài khoản đã bị khóa.');
            } else {
                setError('Email hoặc mật khẩu không đúng.');
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <div>
            <h1 className="text-2xl font-heading font-semibold text-center mb-6">
                Đăng nhập
            </h1>

            <form onSubmit={handleSubmit} className="space-y-4">
                {error && (
                    <div className="bg-red-50 text-red-600 px-4 py-2 rounded text-sm">
                        {error}
                    </div>
                )}

                <Input
                    label="Email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="your@email.com"
                    required
                />

                <Input
                    label="Mật khẩu"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                />

                <Button type="submit" className="w-full" loading={loading}>
                    Đăng nhập
                </Button>
            </form>

            <div className="mt-6 text-center">
                <Link to="#" className="text-sm text-primary hover:underline">
                    Quên mật khẩu?
                </Link>
            </div>

            <div className="relative my-6">
                <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t" />
                </div>
                <div className="relative flex justify-center text-sm">
                    <span className="px-2 bg-white text-gray-500">hoặc</span>
                </div>
            </div>

            <Button variant="secondary" className="w-full" disabled>
                Đăng nhập với Google (Phase 2)
            </Button>

            <p className="mt-6 text-center text-sm text-gray-600">
                Chưa có tài khoản?{' '}
                <Link to="/auth/register" className="text-primary hover:underline">
                    Đăng ký
                </Link>
            </p>
        </div>
    );
}
