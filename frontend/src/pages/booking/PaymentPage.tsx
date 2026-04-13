import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link, useLocation } from 'react-router-dom';
import {
    formatPrice,
    getBookingExtended,
    BookingDetailExtended,
    choosePaymentMethod,
    createTransferSession,
    TransferSessionResult,
} from '../../api/booking';
import { VenueDetail } from '../../api/venue';
import { CourtDTO } from '../../api/booking';
import { useAuth } from '../../contexts/AuthContext';
import { ArrowLeft, Clock, MapPin, CreditCard, AlertCircle, Loader2, Banknote, QrCode, Check, CheckCircle } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { toast } from '../../components/ui/Toast';

interface LocationState {
    venue?: VenueDetail;
    court?: CourtDTO;
}

type PaymentStep = 'pending' | 'transfer_pending' | 'waiting_confirm' | 'confirmed' | 'cancelled';

export default function PaymentPage() {
    const { bookingId } = useParams<{ bookingId: string }>();
    const navigate = useNavigate();
    const location = useLocation();
    const { token } = useAuth();
    const state = location.state as LocationState | null;

    const [booking, setBooking] = useState<BookingDetailExtended | null>(null);
    const [transferSession, setTransferSession] = useState<TransferSessionResult | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [remainingSeconds, setRemainingSeconds] = useState<number | null>(null);
    const [isExpired, setIsExpired] = useState(false);
    const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<'CASH' | 'TRANSFER' | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [step, setStep] = useState<PaymentStep>('pending');

    const fetchBooking = useCallback(async () => {
        if (!bookingId || !token) return;

        const result = await getBookingExtended(bookingId, token);
        if (!result.success) {
            setError(result.error?.message || 'Không thể tải thông tin booking');
            setLoading(false);
            return;
        }

        const data = result.data;
        setBooking(data);

        if (data.status === 'CONFIRMED') {
            setStep('confirmed');
        } else if (data.status === 'CANCELLED_BY_MANAGER' || data.status === 'CANCELLED_BY_USER' || data.status === 'EXPIRED') {
            setStep('cancelled');
            setIsExpired(true);
        } else if (data.status === 'WAITING_MANAGER_CONFIRM') {
            setStep('waiting_confirm');
            setSelectedPaymentMethod(data.paymentMethod as 'CASH' | 'TRANSFER' | null);
        } else if (data.status === 'PENDING_PAYMENT') {
            const transferActive =
                data.paymentMethod === 'TRANSFER' &&
                transferSession?.expiresAt &&
                new Date(transferSession.expiresAt).getTime() > Date.now();

            setStep(transferActive ? 'transfer_pending' : 'pending');
            setSelectedPaymentMethod(data.paymentMethod as 'CASH' | 'TRANSFER' | null);

            if (data.pendingExpiresAt) {
                const expiresAt = new Date(data.pendingExpiresAt).getTime();
                const now = Date.now();
                const remaining = Math.max(0, Math.floor((expiresAt - now) / 1000));
                setRemainingSeconds(remaining);
                setIsExpired(remaining <= 0);
            }
        }

        setLoading(false);
    }, [bookingId, token, transferSession?.expiresAt]);

    useEffect(() => {
        void fetchBooking();
    }, [fetchBooking]);

    useEffect(() => {
        if ((step !== 'pending' && step !== 'transfer_pending') || remainingSeconds === null || remainingSeconds <= 0) return;

        const interval = setInterval(() => {
            setRemainingSeconds((prev) => {
                if (prev === null || prev <= 1) {
                    clearInterval(interval);
                    setIsExpired(true);
                    setTransferSession(null);
                    setStep('cancelled');
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);

        return () => clearInterval(interval);
    }, [remainingSeconds, step]);

    useEffect(() => {
        if (!bookingId || !token) return;

        const wsUrl = `${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.host}/ws?token=${encodeURIComponent(token)}`;
        const ws = new WebSocket(wsUrl);

        ws.onmessage = (event) => {
            try {
                const message = JSON.parse(event.data) as { type?: string; payload?: { bookingId?: string; status?: string } };
                if (message.type === 'booking:updated' && message.payload?.bookingId === bookingId) {
                    if (message.payload.status === 'CONFIRMED') {
                        setStep('confirmed');
                        toast('Thanh toán đã được xác nhận tự động', 'success');
                    }
                    void fetchBooking();
                }
            } catch {
                // ignore malformed ws payloads
            }
        };

        return () => {
            ws.close();
        };
    }, [bookingId, token, fetchBooking]);

    const handleChooseCash = async () => {
        if (!bookingId || !token) return;

        setIsSubmitting(true);
        const result = await choosePaymentMethod(bookingId, 'CASH', token);
        setIsSubmitting(false);

        if (!result.success) {
            toast(result.error?.message || 'Có lỗi xảy ra', 'error');
            return;
        }

        setSelectedPaymentMethod('CASH');
        setTransferSession(null);
        setStep('waiting_confirm');
        await fetchBooking();
    };

    const handleCreateTransferSession = async () => {
        if (!bookingId || !token) return;

        setIsSubmitting(true);
        const result = await createTransferSession(bookingId, token);
        setIsSubmitting(false);

        if (!result.success) {
            toast(result.error?.message || 'Không thể tạo phiên chuyển khoản', 'error');
            return;
        }

        setSelectedPaymentMethod('TRANSFER');
        setTransferSession(result.data);
        setStep('transfer_pending');
        toast('Đã tạo QR thanh toán, chờ SePay xác nhận giao dịch', 'info');
        await fetchBooking();
    };

    const formatCountdown = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };

    const formatDate = (dateStr: string) => {
        const date = new Date(dateStr + 'T00:00:00');
        return date.toLocaleDateString('vi-VN', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
        });
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
        );
    }

    if (error || !booking) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center px-4">
                <AlertCircle className="w-12 h-12 text-red-500 mb-4" />
                <p className="text-gray-700 mb-4">{error || 'Không tìm thấy booking'}</p>
                <Link to="/" className="text-primary hover:underline">
                    ← Về trang chủ
                </Link>
            </div>
        );
    }

    const showTransferCard = step === 'transfer_pending' && transferSession;

    return (
        <div className="min-h-screen bg-gray-50 pb-24">
            <header className="bg-white border-b sticky top-0 z-10">
                <div className="container mx-auto px-4 py-4 flex items-center gap-4">
                    <button onClick={() => navigate(-1)} className="p-2 hover:bg-gray-100 rounded-lg transition">
                        <ArrowLeft className="w-5 h-5" />
                    </button>
                    <div className="flex-1">
                        <h1 className="font-bold text-lg">
                            {step === 'confirmed'
                                ? 'Thanh toán thành công'
                                : step === 'waiting_confirm'
                                  ? 'Chờ chủ sân xác nhận'
                                  : step === 'transfer_pending'
                                    ? 'Chờ SePay xác nhận'
                                    : step === 'cancelled'
                                      ? 'Đã hủy'
                                      : 'Thanh toán'}
                        </h1>
                        <p className="text-sm text-gray-500">{state?.venue?.name || booking.venue.name}</p>
                    </div>
                    {(step === 'pending' || step === 'transfer_pending') && !isExpired && remainingSeconds !== null && (
                        <div className="bg-yellow-100 border border-yellow-300 px-3 py-1 rounded-full flex items-center gap-2">
                            <Clock className="w-4 h-4 text-yellow-700" />
                            <span className="font-mono font-bold text-yellow-800">{formatCountdown(remainingSeconds)}</span>
                        </div>
                    )}
                </div>
            </header>

            <main className="container mx-auto px-4 py-6">
                {step === 'confirmed' && (
                    <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6 flex items-center gap-3">
                        <CheckCircle className="w-6 h-6 text-green-500" />
                        <div>
                            <p className="font-medium text-green-800">Thanh toán thành công</p>
                            <p className="text-sm text-green-600">Booking đã được auto-confirm sau khi SePay nhận giao dịch.</p>
                        </div>
                    </div>
                )}

                {step === 'waiting_confirm' && (
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6 flex items-center gap-3">
                        <Clock className="w-6 h-6 text-blue-500" />
                        <div>
                            <p className="font-medium text-blue-800">Đang chờ chủ sân xác nhận</p>
                            <p className="text-sm text-blue-600">Luồng này áp dụng cho thanh toán tiền mặt.</p>
                        </div>
                    </div>
                )}

                {step === 'transfer_pending' && (
                    <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4 mb-6 flex items-center gap-3">
                        <QrCode className="w-6 h-6 text-emerald-600" />
                        <div>
                            <p className="font-medium text-emerald-800">Đang chờ thanh toán chuyển khoản</p>
                            <p className="text-sm text-emerald-700">Khi SePay detect giao dịch đúng nội dung, booking sẽ tự chuyển sang `CONFIRMED`.</p>
                        </div>
                    </div>
                )}

                {step === 'cancelled' && (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6 flex items-center gap-3">
                        <AlertCircle className="w-6 h-6 text-red-500" />
                        <div>
                            <p className="font-medium text-red-800">
                                {booking.status === 'CANCELLED_BY_MANAGER' ? 'Đã bị hủy bởi chủ sân' : 'Booking đã hết hạn hoặc bị hủy'}
                            </p>
                            {booking.managerCancelReason && <p className="text-sm text-red-600">Lý do: {booking.managerCancelReason}</p>}
                        </div>
                    </div>
                )}

                {(step === 'pending' || step === 'transfer_pending') && isExpired && (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6 flex items-center gap-3">
                        <AlertCircle className="w-6 h-6 text-red-500" />
                        <div>
                            <p className="font-medium text-red-800">Hết thời gian giữ chỗ</p>
                            <p className="text-sm text-red-600">Khung giờ này đã được nhả. Vui lòng chọn lại booking khác.</p>
                        </div>
                    </div>
                )}

                {(step === 'pending' || step === 'transfer_pending') && !isExpired && remainingSeconds !== null && (
                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="font-medium text-yellow-800">Thời gian giữ chỗ còn lại</p>
                                <p className="text-sm text-yellow-600">Hoàn tất chọn thanh toán trước khi countdown về 0.</p>
                            </div>
                            <div className="text-3xl font-mono font-bold text-yellow-800">{formatCountdown(remainingSeconds)}</div>
                        </div>
                    </div>
                )}

                <div className="bg-white rounded-lg border p-4 mb-4">
                    <div className="flex items-start gap-3">
                        <MapPin className="w-5 h-5 text-primary mt-1" />
                        <div>
                            <h3 className="font-semibold">{booking.venue.name}</h3>
                            <p className="text-sm text-gray-500">{booking.venue.address}</p>
                            {step === 'confirmed' && booking.venue.contactPhone && (
                                <p className="text-sm text-green-600 mt-2">📞 {booking.venue.contactPhone}</p>
                            )}
                        </div>
                    </div>
                </div>

                <div className="bg-white rounded-lg border p-4 mb-4">
                    <h3 className="font-semibold mb-4 flex items-center gap-2">
                        <Clock className="w-5 h-5 text-primary" />
                        Chi tiết đặt sân
                    </h3>

                    <div className="space-y-3 text-sm">
                        <div className="flex justify-between">
                            <span className="text-gray-500">Sân:</span>
                            <span className="font-medium">{booking.court.name}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-gray-500">Ngày:</span>
                            <span>{formatDate(booking.date)}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-gray-500">Giờ:</span>
                            <span>{booking.startTime} → {booking.endTime}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-gray-500">Thời lượng:</span>
                            <span>{booking.durationHours} giờ</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-gray-500">Đơn giá:</span>
                            <span>{formatPrice(booking.court.pricePerHour)}đ/giờ</span>
                        </div>
                        <hr />
                        <div className="flex justify-between text-lg font-bold">
                            <span>Tổng cộng:</span>
                            <span className="text-primary">{formatPrice(booking.totalPrice)}đ</span>
                        </div>
                    </div>
                </div>

                {step === 'pending' && !isExpired && (
                    <div className="bg-white rounded-lg border p-4 mb-4">
                        <h3 className="font-semibold mb-4 flex items-center gap-2">
                            <CreditCard className="w-5 h-5 text-primary" />
                            Phương thức thanh toán
                        </h3>

                        <div className="space-y-3">
                            <button
                                onClick={() => setSelectedPaymentMethod('CASH')}
                                className={`w-full p-4 border-2 rounded-lg flex items-center gap-4 transition ${
                                    selectedPaymentMethod === 'CASH' ? 'border-primary bg-primary/5' : 'border-gray-200 hover:border-gray-300'
                                }`}
                            >
                                <Banknote className={`w-8 h-8 ${selectedPaymentMethod === 'CASH' ? 'text-primary' : 'text-gray-400'}`} />
                                <div className="flex-1 text-left">
                                    <p className="font-medium">Thanh toán tiền mặt</p>
                                    <p className="text-sm text-gray-500">Chủ sân xác nhận thủ công khi bạn tới chơi.</p>
                                </div>
                                {selectedPaymentMethod === 'CASH' && <Check className="w-6 h-6 text-primary" />}
                            </button>

                            <button
                                onClick={() => setSelectedPaymentMethod('TRANSFER')}
                                className={`w-full p-4 border-2 rounded-lg flex items-center gap-4 transition ${
                                    selectedPaymentMethod === 'TRANSFER' ? 'border-primary bg-primary/5' : 'border-gray-200 hover:border-gray-300'
                                }`}
                            >
                                <QrCode className={`w-8 h-8 ${selectedPaymentMethod === 'TRANSFER' ? 'text-primary' : 'text-gray-400'}`} />
                                <div className="flex-1 text-left">
                                    <p className="font-medium">Chuyển khoản SePay</p>
                                    <p className="text-sm text-gray-500">Tự động xác nhận khi giao dịch được SePay match đúng reference.</p>
                                </div>
                                {selectedPaymentMethod === 'TRANSFER' && <Check className="w-6 h-6 text-primary" />}
                            </button>
                        </div>
                    </div>
                )}

                {showTransferCard && (
                    <div className="bg-white rounded-lg border p-4 mb-4">
                        <h3 className="font-semibold mb-4 flex items-center gap-2">
                            <QrCode className="w-5 h-5 text-primary" />
                            Quét QR để thanh toán
                        </h3>

                        <div className="text-center">
                            <img src={transferSession.qrCodeUrl} alt="SePay QR" className="w-64 h-auto mx-auto mb-4 border rounded-lg" />

                            <div className="space-y-1 text-sm text-gray-600 mb-4">
                                <p><strong>Ngân hàng:</strong> {transferSession.bankAccount.bankName}</p>
                                <p><strong>Số tài khoản:</strong> {transferSession.bankAccount.accountNumber}</p>
                                <p><strong>Chủ tài khoản:</strong> {transferSession.bankAccount.accountName}</p>
                                <p><strong>Số tiền:</strong> {formatPrice(booking.totalPrice)}đ</p>
                                <p><strong>Nội dung:</strong> {transferSession.referenceCode}</p>
                            </div>

                            <div className="rounded-lg bg-emerald-50 border border-emerald-200 px-4 py-3 text-sm text-emerald-800">
                                Không cần bấm "Tôi đã chuyển khoản". Khi SePay detect giao dịch chứa đúng nội dung `{transferSession.referenceCode}`, hệ thống sẽ tự động confirm.
                            </div>
                        </div>
                    </div>
                )}

                {step === 'waiting_confirm' && (
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4 text-center">
                        <Loader2 className="w-8 h-8 animate-spin text-blue-500 mx-auto mb-3" />
                        <p className="font-medium text-blue-800">Đang chờ chủ sân xác nhận</p>
                        <p className="text-sm text-blue-600 mt-1">Bạn sẽ thanh toán tiền mặt khi đến sân.</p>
                    </div>
                )}
            </main>

            <footer className="fixed bottom-0 left-0 right-0 bg-white border-t p-4">
                <div className="container mx-auto flex items-center justify-between">
                    <div>
                        <p className="text-sm text-gray-500">Tổng cộng</p>
                        <p className="text-xl font-bold text-primary">{formatPrice(booking.totalPrice)}đ</p>
                    </div>

                    {step === 'pending' && !isExpired && selectedPaymentMethod === 'CASH' && (
                        <Button onClick={() => void handleChooseCash()} disabled={isSubmitting}>
                            {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : null}
                            Xác nhận tiền mặt
                        </Button>
                    )}

                    {step === 'pending' && !isExpired && selectedPaymentMethod === 'TRANSFER' && (
                        <Button onClick={() => void handleCreateTransferSession()} disabled={isSubmitting}>
                            {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : null}
                            Tạo QR chuyển khoản
                        </Button>
                    )}

                    {(step === 'pending' && !selectedPaymentMethod) || (step === 'pending' && isExpired) ? (
                        <Button onClick={() => navigate('/')} variant="secondary">
                            {isExpired ? 'Chọn khung giờ khác' : 'Chọn phương thức'}
                        </Button>
                    ) : null}

                    {step === 'transfer_pending' && (
                        <Button onClick={() => void handleCreateTransferSession()} variant="secondary" disabled={isSubmitting}>
                            Làm mới QR
                        </Button>
                    )}

                    {step === 'confirmed' && (
                        <Button onClick={() => navigate('/me/bookings')}>
                            Xem lịch sử đặt sân
                        </Button>
                    )}

                    {step === 'cancelled' && (
                        <Button onClick={() => navigate('/')}>
                            Đặt sân mới
                        </Button>
                    )}

                    {step === 'waiting_confirm' && (
                        <Button onClick={() => navigate('/me/bookings')} variant="secondary">
                            Xem lịch sử
                        </Button>
                    )}
                </div>
            </footer>
        </div>
    );
}
