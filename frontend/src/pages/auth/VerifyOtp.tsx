import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { authApi } from '../../api/client';
import { Button } from '../../components/ui/Button';

const RESEND_COOLDOWN_UNTIL_KEY = 'resendCooldownUntil';

export function VerifyOtp() {
    const [otp, setOtp] = useState(['', '', '', '', '', '']);
    const [error, setError] = useState('');
    const [message, setMessage] = useState('');
    const [loading, setLoading] = useState(false);
    const [resending, setResending] = useState(false);
    const [countdown, setCountdown] = useState(() => {
        const storedUntil = Number(sessionStorage.getItem(RESEND_COOLDOWN_UNTIL_KEY));
        if (Number.isFinite(storedUntil) && storedUntil > Date.now()) {
            return Math.ceil((storedUntil - Date.now()) / 1000);
        }

        const storedCountdown = Number(sessionStorage.getItem('resendCooldownSeconds'));
        return Number.isFinite(storedCountdown) && storedCountdown > 0 ? storedCountdown : 0;
    });
    const inputRefs = useRef<(HTMLInputElement | null)[]>([]);
    const navigate = useNavigate();

    const email = sessionStorage.getItem('pendingEmail');
    const otpHint = sessionStorage.getItem('otpHint');

    const persistOtpSession = (pendingEmail: string, otpHintValue?: string, resendCooldownSeconds?: number) => {
        sessionStorage.setItem('pendingEmail', pendingEmail);

        if (typeof resendCooldownSeconds === 'number') {
            sessionStorage.setItem('resendCooldownSeconds', String(resendCooldownSeconds));
            sessionStorage.setItem(RESEND_COOLDOWN_UNTIL_KEY, String(Date.now() + resendCooldownSeconds * 1000));
            setCountdown(resendCooldownSeconds);
        }

        if (otpHintValue) {
            sessionStorage.setItem('otpHint', otpHintValue);
        } else {
            sessionStorage.removeItem('otpHint');
        }
    };

    const clearOtpSession = () => {
        sessionStorage.removeItem('pendingEmail');
        sessionStorage.removeItem('otpHint');
        sessionStorage.removeItem('resendCooldownSeconds');
        sessionStorage.removeItem(RESEND_COOLDOWN_UNTIL_KEY);
    };

    const getErrorCode = (err: any) => err?.response?.data?.error?.code || err?.response?.data?.error;
    const getErrorDetails = (err: any) => err?.response?.data?.error?.details;

    useEffect(() => {
        inputRefs.current[0]?.focus();
    }, []);

    useEffect(() => {
        if (!email) {
            navigate('/auth/login');
        }
    }, [email, navigate]);

    useEffect(() => {
        if (countdown > 0) {
            const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
            return () => clearTimeout(timer);
        }

        sessionStorage.removeItem('resendCooldownSeconds');
        sessionStorage.removeItem(RESEND_COOLDOWN_UNTIL_KEY);
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

    const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
        const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
        if (!pasted) {
            return;
        }

        e.preventDefault();
        const nextOtp = pasted.split('');
        while (nextOtp.length < 6) {
            nextOtp.push('');
        }

        setOtp(nextOtp);
        const lastFilledIndex = Math.min(pasted.length - 1, 5);
        inputRefs.current[lastFilledIndex]?.focus();
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setMessage('');

        const otpCode = otp.join('');
        if (otpCode.length !== 6) {
            setError('Vui lòng nhập đủ 6 số.');
            return;
        }

        setLoading(true);

        try {
            await authApi.verifyOtp({ email: email!, otp: otpCode });
            clearOtpSession();
            navigate('/auth/login');
        } catch (err: any) {
            const errorCode = getErrorCode(err);

            if (errorCode === 'OTP_INVALID') {
                setError('Mã OTP không đúng.');
            } else if (errorCode === 'OTP_EXPIRED') {
                setError('Mã OTP đã hết hạn. Vui lòng gửi lại mã mới.');
            } else if (errorCode === 'OTP_ATTEMPTS_EXCEEDED') {
                setError('Bạn đã nhập sai quá nhiều lần. Mã hiện tại đã bị vô hiệu hóa, vui lòng gửi lại OTP.');
                setOtp(['', '', '', '', '', '']);
                sessionStorage.removeItem('otpHint');
                sessionStorage.setItem('resendCooldownSeconds', '0');
                sessionStorage.removeItem(RESEND_COOLDOWN_UNTIL_KEY);
                setCountdown(0);
            } else if (errorCode === 'EMAIL_ALREADY_VERIFIED') {
                clearOtpSession();
                setMessage('Email đã được xác thực trước đó. Bạn có thể đăng nhập.');
            } else {
                setError('Không thể xác thực OTP lúc này.');
            }
        } finally {
            setLoading(false);
        }
    };

    const handleResendOtp = async () => {
        if (!email || countdown > 0) {
            return;
        }

        setResending(true);
        setError('');
        setMessage('');

        try {
            const response = await authApi.resendOtp({ email });
            persistOtpSession(response.data.email, response.data.otpHint, response.data.resendCooldownSeconds);
            setOtp(['', '', '', '', '', '']);
            inputRefs.current[0]?.focus();
            setMessage('Đã gửi lại OTP tới email của bạn.');
        } catch (err: any) {
            const errorCode = getErrorCode(err);
            const errorDetails = getErrorDetails(err);

            if (errorCode === 'OTP_RESEND_COOLDOWN') {
                const remainingSeconds = Number(errorDetails?.remainingSeconds);
                if (Number.isFinite(remainingSeconds) && remainingSeconds > 0) {
                    sessionStorage.setItem('resendCooldownSeconds', String(remainingSeconds));
                    sessionStorage.setItem(RESEND_COOLDOWN_UNTIL_KEY, String(Date.now() + remainingSeconds * 1000));
                    setCountdown(remainingSeconds);
                }
                setError('Bạn vừa yêu cầu OTP gần đây. Vui lòng chờ thêm để gửi lại.');
            } else if (errorCode === 'EMAIL_ALREADY_VERIFIED') {
                clearOtpSession();
                setMessage('Email đã được xác thực trước đó. Bạn có thể đăng nhập.');
            } else if (errorCode === 'RESEND_OTP_RATE_LIMITED') {
                setError('Bạn đã gửi lại OTP quá nhiều lần từ địa chỉ IP này. Vui lòng thử lại sau.');
            } else {
                setError('Không thể gửi lại OTP lúc này.');
            }
        } finally {
            setResending(false);
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
                {message && (
                    <div className="bg-green-50 text-green-700 px-4 py-2 rounded text-sm mb-4">
                        {message}
                    </div>
                )}
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
                            id={`otp-digit-${index + 1}`}
                            name={`otpDigit${index + 1}`}
                            aria-label={`OTP digit ${index + 1}`}
                            type="text"
                            inputMode="numeric"
                            maxLength={1}
                            value={digit}
                            onChange={(e) => handleChange(index, e.target.value)}
                            onKeyDown={(e) => handleKeyDown(index, e)}
                            onPaste={handlePaste}
                            autoComplete="one-time-code"
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
                    <button
                        type="button"
                        onClick={handleResendOtp}
                        disabled={resending}
                        className="text-primary hover:underline disabled:opacity-50"
                    >
                        Gửi lại mã
                    </button>
                )}
            </p>

            <p className="mt-4 text-sm text-gray-500">
                Sai email hoặc muốn bắt đầu lại?{' '}
                <button
                    type="button"
                    onClick={() => {
                        clearOtpSession();
                        navigate('/auth/register');
                    }}
                    className="text-primary hover:underline"
                >
                    Quay lại đăng ký
                </button>
            </p>
        </div>
    );
}
