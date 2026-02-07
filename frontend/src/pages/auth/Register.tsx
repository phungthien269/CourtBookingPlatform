import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { authApi } from '../../api/client';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';

export function Register() {
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [agreed, setAgreed] = useState(false);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        if (password !== confirmPassword) {
            setError('Mật khẩu xác nhận không khớp.');
            return;
        }

        if (!agreed) {
            setError('Vui lòng đồng ý với điều khoản sử dụng.');
            return;
        }

        setLoading(true);

        try {
            const response = await authApi.register({ email, password, name });
            // Store email for OTP page
            sessionStorage.setItem('pendingEmail', email);
            sessionStorage.setItem('otpHint', response.data.otpHint);
            navigate('/auth/verify-otp');
        } catch (err: any) {
            const errorCode = err.response?.data?.error;
            if (errorCode === 'EMAIL_ALREADY_EXISTS') {
                setError('Email này đã được đăng ký.');
            } else {
                setError('Đã có lỗi xảy ra. Vui lòng thử lại.');
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <div>
            <h1 className="text-2xl font-heading font-semibold text-center mb-6">
                Đăng ký tài khoản
            </h1>

            <form onSubmit={handleSubmit} className="space-y-4">
                {error && (
                    <div className="bg-red-50 text-red-600 px-4 py-2 rounded text-sm">
                        {error}
                    </div>
                )}

                <Input
                    label="Họ tên"
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Nguyễn Văn A"
                />

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

                <Input
                    label="Xác nhận mật khẩu"
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                />

                <label className="flex items-center gap-2 text-sm">
                    <input
                        type="checkbox"
                        checked={agreed}
                        onChange={(e) => setAgreed(e.target.checked)}
                        className="rounded"
                    />
                    <span>
                        Tôi đồng ý với{' '}
                        <Link to="#" className="text-primary hover:underline">
                            điều khoản sử dụng
                        </Link>
                    </span>
                </label>

                <Button type="submit" className="w-full" loading={loading}>
                    Đăng ký
                </Button>
            </form>

            <div className="relative my-6">
                <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t" />
                </div>
                <div className="relative flex justify-center text-sm">
                    <span className="px-2 bg-white text-gray-500">hoặc</span>
                </div>
            </div>

            <Button variant="secondary" className="w-full" disabled>
                Đăng ký với Google (Phase 2)
            </Button>

            <p className="mt-6 text-center text-sm text-gray-600">
                Đã có tài khoản?{' '}
                <Link to="/auth/login" className="text-primary hover:underline">
                    Đăng nhập
                </Link>
            </p>
        </div>
    );
}
