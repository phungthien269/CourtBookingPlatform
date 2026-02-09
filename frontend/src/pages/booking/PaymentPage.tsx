/**
 * PaymentPage - Phase 3 + Phase 4
 * Route: /payment/:bookingId
 * Phase 3: Shows booking summary with persistent countdown timer
 * Phase 4: Payment method selection, VietQR display, transfer declaration
 */

import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link, useLocation } from 'react-router-dom';
import { formatPrice, getBookingExtended, BookingDetailExtended, choosePaymentMethod, declareTransfer } from '../../api/booking';
import { VenueDetail } from '../../api/venue';
import { CourtDTO } from '../../api/booking';
import { useAuth } from '../../contexts/AuthContext';
import { ArrowLeft, Clock, MapPin, CreditCard, AlertCircle, Loader2, Banknote, QrCode, Check, CheckCircle } from 'lucide-react';
import { Button } from '../../components/ui/Button';

interface LocationState {
    venue?: VenueDetail;
    court?: CourtDTO;
}

/**
 * Build VietQR URL
 * Spec: https://vietqr.io/danh-sach-api/link-tao-ma-vietqr
 */
function buildVietQRUrl(
    bankName: string,
    accountNumber: string,
    accountName: string,
    amount: number,
    description: string
): string {
    // Map common bank names to VietQR BIN codes
    const bankBins: Record<string, string> = {
        'Vietcombank': '970436',
        'Techcombank': '970407',
        'MBBank': '970422',
        'VPBank': '970432',
        'ACB': '970416',
        'Sacombank': '970403',
        'BIDV': '970418',
        'VietinBank': '970415',
        'TPBank': '970423',
        'Agribank': '970405',
    };

    const bin = bankBins[bankName] || '970436'; // Default to Vietcombank
    const template = 'compact2'; // Or 'qr_only', 'compact', 'print'

    const url = `https://img.vietqr.io/image/${bin}-${accountNumber}-${template}.png?amount=${amount}&addInfo=${encodeURIComponent(description)}&accountName=${encodeURIComponent(accountName)}`;
    return url;
}

export default function PaymentPage() {
    const { bookingId } = useParams<{ bookingId: string }>();
    const navigate = useNavigate();
    const location = useLocation();
    const { token } = useAuth();
    const state = location.state as LocationState | null;

    const [booking, setBooking] = useState<BookingDetailExtended | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [remainingSeconds, setRemainingSeconds] = useState<number | null>(null);
    const [isExpired, setIsExpired] = useState(false);

    // Phase 4 state
    const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<'CASH' | 'TRANSFER' | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [transferDeclared, setTransferDeclared] = useState(false);
    const [step, setStep] = useState<'pending' | 'choosing' | 'waiting_confirm' | 'confirmed' | 'cancelled'>('pending');

    // Fetch booking details
    const fetchBooking = useCallback(async () => {
        if (!bookingId || !token) return;

        const result = await getBookingExtended(bookingId, token);

        if (!result.success) {
            setError(result.error?.message || 'Không thể tải thông tin booking');
            setLoading(false);
            return;
        }

        const data = result.data!;
        setBooking(data);

        // Determine step based on status
        if (data.status === 'CONFIRMED') {
            setStep('confirmed');
        } else if (data.status === 'CANCELLED_BY_MANAGER' || data.status === 'CANCELLED_BY_USER' || data.status === 'EXPIRED') {
            setStep('cancelled');
            setIsExpired(true);
        } else if (data.status === 'WAITING_MANAGER_CONFIRM') {
            setStep('waiting_confirm');
            setSelectedPaymentMethod(data.paymentMethod as 'CASH' | 'TRANSFER' | null);
            setTransferDeclared(!!data.paymentDeclaredAt);
        } else if (data.status === 'PENDING_PAYMENT') {
            setStep('pending');
            // Check if already expired
            if (data.pendingExpiresAt) {
                const expiresAt = new Date(data.pendingExpiresAt).getTime();
                const now = Date.now();
                const remaining = Math.max(0, Math.floor((expiresAt - now) / 1000));
                setRemainingSeconds(remaining);
                setIsExpired(remaining <= 0);
            }
        }

        setLoading(false);
    }, [bookingId, token]);

    useEffect(() => {
        fetchBooking();
    }, [fetchBooking]);

    // Countdown timer (only for PENDING_PAYMENT)
    useEffect(() => {
        if (step !== 'pending' || remainingSeconds === null || remainingSeconds <= 0) return;

        const interval = setInterval(() => {
            setRemainingSeconds((prev) => {
                if (prev === null || prev <= 1) {
                    clearInterval(interval);
                    setIsExpired(true);
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);

        return () => clearInterval(interval);
    }, [remainingSeconds, step]);

    // Handle payment method selection and submission
    const handleChoosePaymentMethod = async () => {
        if (!selectedPaymentMethod || !bookingId || !token) return;

        setIsSubmitting(true);
        const result = await choosePaymentMethod(bookingId, selectedPaymentMethod, token);
        setIsSubmitting(false);

        if (!result.success) {
            alert(result.error?.message || 'Có lỗi xảy ra');
            return;
        }

        setStep('waiting_confirm');
        // Refresh booking data
        fetchBooking();
    };

    // Handle transfer declaration
    const handleDeclareTransfer = async () => {
        if (!bookingId || !token) return;

        setIsSubmitting(true);
        const result = await declareTransfer(bookingId, token);
        setIsSubmitting(false);

        if (!result.success) {
            alert(result.error?.message || 'Có lỗi xảy ra');
            return;
        }

        setTransferDeclared(true);
    };

    // Format countdown
    const formatCountdown = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };

    // Format date for display
    const formatDate = (dateStr: string) => {
        const d = new Date(dateStr + 'T00:00:00');
        return d.toLocaleDateString('vi-VN', {
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

    const showQRCode = step === 'waiting_confirm' &&
        selectedPaymentMethod === 'TRANSFER' &&
        booking.venue.bankName &&
        booking.venue.bankAccountNumber;

    const qrUrl = showQRCode
        ? buildVietQRUrl(
            booking.venue.bankName!,
            booking.venue.bankAccountNumber!,
            booking.venue.bankAccountName || '',
            booking.totalPrice,
            `Dat san ${booking.court.name} ${booking.date}`
        )
        : null;

    return (
        <div className="min-h-screen bg-gray-50 pb-24">
            {/* Header */}
            <header className="bg-white border-b sticky top-0 z-10">
                <div className="container mx-auto px-4 py-4 flex items-center gap-4">
                    <button
                        onClick={() => navigate(-1)}
                        className="p-2 hover:bg-gray-100 rounded-lg transition"
                    >
                        <ArrowLeft className="w-5 h-5" />
                    </button>
                    <div className="flex-1">
                        <h1 className="font-bold text-lg">
                            {step === 'confirmed' ? 'Đặt sân thành công' :
                                step === 'waiting_confirm' ? 'Chờ xác nhận' :
                                    step === 'cancelled' ? 'Đã hủy' :
                                        'Thanh toán'}
                        </h1>
                        <p className="text-sm text-gray-500">{state?.venue?.name || booking.venue.name}</p>
                    </div>
                    {/* Countdown (only for PENDING_PAYMENT) */}
                    {step === 'pending' && !isExpired && remainingSeconds !== null && (
                        <div className="bg-yellow-100 border border-yellow-300 px-3 py-1 rounded-full flex items-center gap-2">
                            <Clock className="w-4 h-4 text-yellow-700" />
                            <span className="font-mono font-bold text-yellow-800">
                                {formatCountdown(remainingSeconds)}
                            </span>
                        </div>
                    )}
                </div>
            </header>

            {/* Content */}
            <main className="container mx-auto px-4 py-6">
                {/* Status banners */}
                {step === 'confirmed' && (
                    <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6 flex items-center gap-3">
                        <CheckCircle className="w-6 h-6 text-green-500" />
                        <div>
                            <p className="font-medium text-green-800">Đặt sân thành công!</p>
                            <p className="text-sm text-green-600">Chủ sân đã xác nhận đơn đặt của bạn.</p>
                        </div>
                    </div>
                )}

                {step === 'waiting_confirm' && (
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6 flex items-center gap-3">
                        <Clock className="w-6 h-6 text-blue-500" />
                        <div>
                            <p className="font-medium text-blue-800">Đang chờ chủ sân xác nhận</p>
                            <p className="text-sm text-blue-600">Bạn sẽ nhận được thông báo khi đơn được xác nhận.</p>
                        </div>
                    </div>
                )}

                {step === 'cancelled' && (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6 flex items-center gap-3">
                        <AlertCircle className="w-6 h-6 text-red-500" />
                        <div>
                            <p className="font-medium text-red-800">
                                {booking.status === 'CANCELLED_BY_MANAGER' ? 'Đã bị hủy bởi chủ sân' : 'Đã hết hạn'}
                            </p>
                            {booking.managerCancelReason && (
                                <p className="text-sm text-red-600">Lý do: {booking.managerCancelReason}</p>
                            )}
                        </div>
                    </div>
                )}

                {step === 'pending' && isExpired && (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6 flex items-center gap-3">
                        <AlertCircle className="w-6 h-6 text-red-500" />
                        <div>
                            <p className="font-medium text-red-800">Hết thời gian giữ chỗ!</p>
                            <p className="text-sm text-red-600">Khung giờ này đã được nhả. Vui lòng chọn lại.</p>
                        </div>
                    </div>
                )}

                {step === 'pending' && !isExpired && remainingSeconds !== null && (
                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="font-medium text-yellow-800">Thời gian giữ chỗ còn lại</p>
                                <p className="text-sm text-yellow-600">Chọn phương thức thanh toán trước khi hết giờ</p>
                            </div>
                            <div className="text-3xl font-mono font-bold text-yellow-800">
                                {formatCountdown(remainingSeconds)}
                            </div>
                        </div>
                    </div>
                )}

                {/* Venue info */}
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

                {/* Booking details */}
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

                {/* Payment method selection (only for PENDING_PAYMENT) */}
                {step === 'pending' && !isExpired && (
                    <div className="bg-white rounded-lg border p-4 mb-4">
                        <h3 className="font-semibold mb-4 flex items-center gap-2">
                            <CreditCard className="w-5 h-5 text-primary" />
                            Phương thức thanh toán
                        </h3>

                        <div className="space-y-3">
                            {/* Cash option */}
                            <button
                                onClick={() => setSelectedPaymentMethod('CASH')}
                                className={`w-full p-4 border-2 rounded-lg flex items-center gap-4 transition ${selectedPaymentMethod === 'CASH'
                                    ? 'border-primary bg-primary/5'
                                    : 'border-gray-200 hover:border-gray-300'
                                    }`}
                            >
                                <Banknote className={`w-8 h-8 ${selectedPaymentMethod === 'CASH' ? 'text-primary' : 'text-gray-400'}`} />
                                <div className="flex-1 text-left">
                                    <p className="font-medium">Thanh toán tiền mặt</p>
                                    <p className="text-sm text-gray-500">Thanh toán trực tiếp khi đến sân</p>
                                </div>
                                {selectedPaymentMethod === 'CASH' && (
                                    <Check className="w-6 h-6 text-primary" />
                                )}
                            </button>

                            {/* Transfer option */}
                            <button
                                onClick={() => setSelectedPaymentMethod('TRANSFER')}
                                className={`w-full p-4 border-2 rounded-lg flex items-center gap-4 transition ${selectedPaymentMethod === 'TRANSFER'
                                    ? 'border-primary bg-primary/5'
                                    : 'border-gray-200 hover:border-gray-300'
                                    }`}
                            >
                                <QrCode className={`w-8 h-8 ${selectedPaymentMethod === 'TRANSFER' ? 'text-primary' : 'text-gray-400'}`} />
                                <div className="flex-1 text-left">
                                    <p className="font-medium">Chuyển khoản ngân hàng</p>
                                    <p className="text-sm text-gray-500">Quét mã QR để thanh toán</p>
                                </div>
                                {selectedPaymentMethod === 'TRANSFER' && (
                                    <Check className="w-6 h-6 text-primary" />
                                )}
                            </button>
                        </div>
                    </div>
                )}

                {/* VietQR display (for TRANSFER in WAITING_MANAGER_CONFIRM) */}
                {showQRCode && qrUrl && (
                    <div className="bg-white rounded-lg border p-4 mb-4">
                        <h3 className="font-semibold mb-4 flex items-center gap-2">
                            <QrCode className="w-5 h-5 text-primary" />
                            Quét mã QR để thanh toán
                        </h3>

                        <div className="text-center">
                            <img
                                src={qrUrl}
                                alt="VietQR"
                                className="w-64 h-auto mx-auto mb-4 border rounded-lg"
                            />

                            <div className="text-sm text-gray-600 mb-4">
                                <p><strong>Ngân hàng:</strong> {booking.venue.bankName}</p>
                                <p><strong>Số tài khoản:</strong> {booking.venue.bankAccountNumber}</p>
                                <p><strong>Chủ tài khoản:</strong> {booking.venue.bankAccountName}</p>
                                <p><strong>Số tiền:</strong> {formatPrice(booking.totalPrice)}đ</p>
                            </div>

                            {!transferDeclared ? (
                                <button
                                    onClick={handleDeclareTransfer}
                                    disabled={isSubmitting}
                                    className="w-full py-3 bg-green-500 text-white rounded-lg hover:bg-green-600 transition disabled:opacity-50 flex items-center justify-center gap-2"
                                >
                                    {isSubmitting ? (
                                        <Loader2 className="w-5 h-5 animate-spin" />
                                    ) : (
                                        <Check className="w-5 h-5" />
                                    )}
                                    Tôi đã chuyển khoản
                                </button>
                            ) : (
                                <div className="flex items-center justify-center gap-2 py-3 bg-green-100 text-green-700 rounded-lg">
                                    <CheckCircle className="w-5 h-5" />
                                    Đã xác nhận chuyển khoản
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* Waiting for manager (CASH in WAITING_MANAGER_CONFIRM) */}
                {step === 'waiting_confirm' && selectedPaymentMethod === 'CASH' && (
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4 text-center">
                        <Loader2 className="w-8 h-8 animate-spin text-blue-500 mx-auto mb-3" />
                        <p className="font-medium text-blue-800">Đang chờ chủ sân xác nhận</p>
                        <p className="text-sm text-blue-600 mt-1">Bạn sẽ thanh toán tiền mặt khi đến sân</p>
                    </div>
                )}
            </main>

            {/* Footer */}
            <footer className="fixed bottom-0 left-0 right-0 bg-white border-t p-4">
                <div className="container mx-auto flex items-center justify-between">
                    <div>
                        <p className="text-sm text-gray-500">Tổng cộng</p>
                        <p className="text-xl font-bold text-primary">
                            {formatPrice(booking.totalPrice)}đ
                        </p>
                    </div>
                    {step === 'pending' && isExpired && (
                        <Button onClick={() => navigate('/')}>
                            Chọn khung giờ khác
                        </Button>
                    )}
                    {step === 'pending' && !isExpired && (
                        <Button
                            onClick={handleChoosePaymentMethod}
                            disabled={!selectedPaymentMethod || isSubmitting}
                        >
                            {isSubmitting ? (
                                <Loader2 className="w-5 h-5 animate-spin mr-2" />
                            ) : null}
                            Xác nhận thanh toán
                        </Button>
                    )}
                    {step === 'confirmed' && (
                        <Button onClick={() => navigate('/bookings')}>
                            Xem lịch sử đặt sân
                        </Button>
                    )}
                    {step === 'cancelled' && (
                        <Button onClick={() => navigate('/')}>
                            Đặt sân mới
                        </Button>
                    )}
                    {step === 'waiting_confirm' && (
                        <Button onClick={() => navigate('/bookings')} variant="secondary">
                            Xem lịch sử
                        </Button>
                    )}
                </div>
            </footer>
        </div>
    );
}
