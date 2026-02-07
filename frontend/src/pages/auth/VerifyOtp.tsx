import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { authApi } from '../../api/client';
import { Button } from '../../components/ui/Button';

export function VerifyOtp() {
    const [otp, setOtp] = useState(['', '', '', '', '', '']);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [countdown, setCountdown] = useState(60);
    const inputRefs = useRef<(HTMLInputElement | null)[]>([]);
    const navigate = useNavigate();

    const email = sessionStorage.getItem('pendingEmail');
    const otpHint = sessionStorage.getItem('otpHint');

    useEffect(() => {
        if (!email) {
            navigate('/auth/register');
        }
    }, [email, navigate]);

    useEffect(() => {
        if (countdown > 0) {
            const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
            return () => clearTimeout(timer);
        }
    }, [countdown]);

    const handleChange = (index: number, value: string) => {
        if (!/^\d*$/.test(value)) return;

        const newOtp = [...otp];
        newOtp[index] = value.slice(-1);
        setOtp(newOtp);

        // Auto focus next input
        if (value && index < 5) {
            inputRefs.current[index + 1]?.focus();
        }
    };

    const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
        if (e.key === 'Backspace' && !otp[index] && index > 0) {
            inputRefs.current[index - 1]?.focus();
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        const otpCode = otp.join('');
        if (otpCode.length !== 6) {
            setError('Vui lòng nhập đủ 6 số.');
            return;
        }

        setLoading(true);

        try {
            await authApi.verifyOtp({ email: email!, otp: otpCode });
            sessionStorage.removeItem('pendingEmail');
            sessionStorage.removeItem('otpHint');
            navigate('/auth/login');
        } catch (err: any) {
            setError('Mã OTP không đúng hoặc đã hết hạn.');
        } finally {
            setLoading(false);
        }
    };

    const maskedEmail = email ? email.replace(/(.{3}).*(@.*)/, '$1***$2') : '';

    return (
        <div className="text-center">
            <div className="text-6xl mb-4">📧</div>

            <h1 className="text-2xl font-heading font-semibold mb-2">
                Xác thực email
            </h1>

            <p className="text-gray-600 mb-6">
                Nhập mã OTP đã được gửi đến<br />
                <span className="font-medium">{maskedEmail}</span>
            </p>

            {otpHint && (
                <p className="text-sm text-gray-500 mb-4">
                    [DEV] Gợi ý: {otpHint}
                </p>
            )}

            <form onSubmit={handleSubmit}>
                {error && (
                    <div className="bg-red-50 text-red-600 px-4 py-2 rounded text-sm mb-4">
                        {error}
                    </div>
                )}

                <div className="flex justify-center gap-2 mb-6">
                    {otp.map((digit, index) => (
                        <input
                            key={index}
                            ref={(el) => (inputRefs.current[index] = el)}
                            type="text"
                            inputMode="numeric"
                            maxLength={1}
                            value={digit}
                            onChange={(e) => handleChange(index, e.target.value)}
                            onKeyDown={(e) => handleKeyDown(index, e)}
                            className="w-12 h-12 text-center text-2xl font-semibold border rounded focus:outline-none focus:ring-2 focus:ring-primary"
                        />
                    ))}
                </div>

                <Button type="submit" className="w-full" loading={loading}>
                    Xác nhận
                </Button>
            </form>

            <p className="mt-4 text-sm text-gray-500">
                {countdown > 0 ? (
                    <>Gửi lại mã sau {countdown}s</>
                ) : (
                    <button className="text-primary hover:underline">
                        Gửi lại mã
                    </button>
                )}
            </p>
        </div>
    );
}
