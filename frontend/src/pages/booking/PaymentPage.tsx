/**
 * PaymentPage - Phase 3
 * Route: /payment/:bookingId
 * Shows booking summary with persistent countdown timer
 */

import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link, useLocation } from 'react-router-dom';
import { getBookingById, BookingDetail, formatPrice } from '../../api/booking';
import { VenueDetail } from '../../api/venue';
import { CourtDTO } from '../../api/booking';
import { useAuth } from '../../contexts/AuthContext';
import { ArrowLeft, Clock, MapPin, CreditCard, AlertCircle, Loader2 } from 'lucide-react';
import { Button } from '../../components/ui/Button';

interface LocationState {
    venue?: VenueDetail;
    court?: CourtDTO;
}

export default function PaymentPage() {
    const { bookingId } = useParams<{ bookingId: string }>();
    const navigate = useNavigate();
    const location = useLocation();
    const { token } = useAuth();
    const state = location.state as LocationState | null;

    const [booking, setBooking] = useState<BookingDetail | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [remainingSeconds, setRemainingSeconds] = useState<number | null>(null);
    const [isExpired, setIsExpired] = useState(false);

    // Fetch booking details
    const fetchBooking = useCallback(async () => {
        if (!bookingId || !token) return;

        const result = await getBookingById(bookingId, token);

        if (!result.success) {
            setError(result.error?.message || 'Không thể tải thông tin booking');
            setLoading(false);
            return;
        }

        const data = result.data!;
        setBooking(data);

        // Check if already expired
        if (data.status !== 'PENDING_PAYMENT') {
            setIsExpired(true);
            setRemainingSeconds(0);
        } else if (data.pendingExpiresAt) {
            const expiresAt = new Date(data.pendingExpiresAt).getTime();
            const now = Date.now();
            const remaining = Math.max(0, Math.floor((expiresAt - now) / 1000));
            setRemainingSeconds(remaining);
            setIsExpired(remaining <= 0);
        }

        setLoading(false);
    }, [bookingId, token]);

    useEffect(() => {
        fetchBooking();
    }, [fetchBooking]);

    // Countdown timer
    useEffect(() => {
        if (remainingSeconds === null || remainingSeconds <= 0) return;

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
    }, [remainingSeconds]);

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
                        <h1 className="font-bold text-lg">Thanh toán</h1>
                        <p className="text-sm text-gray-500">{state?.venue?.name || booking.venue.name}</p>
                    </div>
                    {/* Countdown */}
                    {!isExpired && remainingSeconds !== null && (
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
                {/* Expired warning */}
                {isExpired && (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6 flex items-center gap-3">
                        <AlertCircle className="w-6 h-6 text-red-500" />
                        <div>
                            <p className="font-medium text-red-800">Hết thời gian giữ chỗ!</p>
                            <p className="text-sm text-red-600">Khung giờ này đã được nhả. Vui lòng chọn lại.</p>
                        </div>
                    </div>
                )}

                {/* Countdown banner (when active) */}
                {!isExpired && remainingSeconds !== null && (
                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="font-medium text-yellow-800">Thời gian giữ chỗ còn lại</p>
                                <p className="text-sm text-yellow-600">Hoàn tất thanh toán trước khi hết thời gian</p>
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

                {/* Payment placeholder */}
                <div className={`rounded-lg border-2 border-dashed p-6 text-center ${isExpired ? 'bg-gray-100 border-gray-300' : 'bg-blue-50 border-blue-300'}`}>
                    <CreditCard className={`w-12 h-12 mx-auto mb-3 ${isExpired ? 'text-gray-400' : 'text-blue-500'}`} />
                    <h3 className={`font-semibold mb-2 ${isExpired ? 'text-gray-600' : 'text-blue-800'}`}>
                        {isExpired ? 'Đã hết thời gian' : 'Phương thức thanh toán'}
                    </h3>
                    <p className={`text-sm mb-4 ${isExpired ? 'text-gray-500' : 'text-blue-600'}`}>
                        {isExpired
                            ? 'Vui lòng quay lại và chọn khung giờ mới.'
                            : 'Tính năng thanh toán sẽ có trong Phase 4.'
                        }
                    </p>
                </div>
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
                    {isExpired ? (
                        <Button onClick={() => navigate('/')}>
                            Chọn khung giờ khác
                        </Button>
                    ) : (
                        <Button disabled className="opacity-50 cursor-not-allowed">
                            Thanh toán (Phase 4)
                        </Button>
                    )}
                </div>
            </footer>
        </div>
    );
}
