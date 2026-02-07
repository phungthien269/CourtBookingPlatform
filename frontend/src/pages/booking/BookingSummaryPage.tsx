/**
 * BookingSummaryPage - Phase 2 + Phase 3
 * Phase 2: Final confirmation with quote display
 * Phase 3: Create booking hold and navigate to payment
 * Route: /venues/:id/book/:courtId/summary
 */

import { useState } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import { QuoteResult, formatPrice, createBookingHold } from '../../api/booking';
import { VenueDetail } from '../../api/venue';
import { CourtDTO } from '../../api/booking';
import { Button } from '../../components/ui/Button';
import { ArrowLeft, CheckCircle, Clock, MapPin, CreditCard, Loader2 } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

interface LocationState {
    quote: QuoteResult;
    venue: VenueDetail;
    court: CourtDTO;
    startHour: number;
    durationHours: number;
}

export default function BookingSummaryPage() {
    const location = useLocation();
    const navigate = useNavigate();
    const { token } = useAuth();
    const state = location.state as LocationState | null;

    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    if (!state || !state.quote || !state.venue || !state.court) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center">
                <p className="text-gray-500 mb-4">Không có thông tin đặt sân</p>
                <Link to="/" className="text-primary hover:underline">
                    ← Về trang chủ
                </Link>
            </div>
        );
    }

    const { quote, venue, court, startHour, durationHours } = state;
    const isCrossDay = quote.date !== quote.endDate;

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

    const handleCreateHold = async () => {
        if (!token) {
            setError('Bạn cần đăng nhập để đặt sân');
            return;
        }

        setIsLoading(true);
        setError(null);

        const result = await createBookingHold({
            venueId: venue.id,
            courtId: court.id,
            date: quote.date,
            startHour: startHour,
            durationHours: durationHours,
        }, token);

        setIsLoading(false);

        if (!result.success) {
            // Map error codes to user-friendly messages
            const errorMessages: Record<string, string> = {
                'USER_BOOKING_LIMIT': 'Bạn đã đạt giới hạn 5 booking.',
                'SLOT_UNAVAILABLE': 'Khung giờ đang được giữ chỗ bởi người khác.',
                'OUTSIDE_HOURS': 'Khung giờ ngoài giờ hoạt động.',
                'HOLIDAY': 'Ngày nghỉ lễ.',
                'COURT_INACTIVE': 'Sân không khả dụng.',
            };
            setError(result.error?.message || errorMessages[result.error?.code || ''] || 'Không thể giữ chỗ.');
            return;
        }

        // Navigate to payment page with booking ID
        navigate(`/payment/${result.data?.bookingId}`, {
            state: {
                venue,
                court,
            },
        });
    };

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
                    <div>
                        <h1 className="font-bold text-lg">Xác nhận đặt sân</h1>
                        <p className="text-sm text-gray-500">{venue.name}</p>
                    </div>
                </div>
            </header>

            {/* Content */}
            <main className="container mx-auto px-4 py-6">
                {/* Progress */}
                <div className="flex items-center gap-2 text-sm mb-6">
                    <span className="text-gray-400 px-3 py-1">1. Chọn sân ✓</span>
                    <span className="text-gray-400">→</span>
                    <span className="text-gray-400 px-3 py-1">2. Chọn giờ ✓</span>
                    <span className="text-gray-400">→</span>
                    <span className="bg-primary text-white px-3 py-1 rounded-full">3. Xác nhận</span>
                </div>

                {/* Success indicator */}
                <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6 flex items-center gap-3">
                    <CheckCircle className="w-6 h-6 text-green-500" />
                    <div>
                        <p className="font-medium text-green-800">Khung giờ khả dụng!</p>
                        <p className="text-sm text-green-600">Bạn có thể tiến hành đặt sân</p>
                    </div>
                </div>

                {/* Error message */}
                {error && (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
                        <p className="text-red-700">{error}</p>
                    </div>
                )}

                {/* Venue info */}
                <div className="bg-white rounded-lg border p-4 mb-4">
                    <div className="flex items-start gap-3">
                        <MapPin className="w-5 h-5 text-primary mt-1" />
                        <div>
                            <h3 className="font-semibold">{venue.name}</h3>
                            <p className="text-sm text-gray-500">{venue.address}, {venue.district}</p>
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
                            <span className="font-medium">{quote.courtName}</span>
                        </div>

                        <div className="flex justify-between">
                            <span className="text-gray-500">Môn:</span>
                            <span>{court.sportType.name}</span>
                        </div>

                        <div className="flex justify-between">
                            <span className="text-gray-500">Ngày:</span>
                            <span>{formatDate(quote.date)}</span>
                        </div>

                        <div className="flex justify-between">
                            <span className="text-gray-500">Giờ:</span>
                            <span>
                                {quote.startTime} → {quote.endTime}
                                {isCrossDay && (
                                    <span className="text-yellow-600 ml-1">(sang ngày)</span>
                                )}
                            </span>
                        </div>

                        {isCrossDay && (
                            <div className="flex justify-between">
                                <span className="text-gray-500">Ngày kết thúc:</span>
                                <span>{formatDate(quote.endDate)}</span>
                            </div>
                        )}

                        <div className="flex justify-between">
                            <span className="text-gray-500">Thời lượng:</span>
                            <span>{quote.durationHours} giờ</span>
                        </div>

                        <div className="flex justify-between">
                            <span className="text-gray-500">Đơn giá:</span>
                            <span>{formatPrice(quote.pricePerHour)}đ/giờ</span>
                        </div>

                        <hr />

                        <div className="flex justify-between text-lg font-bold">
                            <span>Tổng cộng:</span>
                            <span className="text-primary">{formatPrice(quote.totalPrice)}đ</span>
                        </div>
                    </div>
                </div>

                {/* Payment info */}
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-center">
                    <CreditCard className="w-12 h-12 text-blue-500 mx-auto mb-3" />
                    <h3 className="font-semibold text-blue-800 mb-2">Giữ chỗ & Thanh toán</h3>
                    <p className="text-sm text-blue-600 mb-2">
                        Bạn sẽ có <strong>5 phút</strong> để hoàn tất thanh toán.
                    </p>
                    <p className="text-xs text-blue-500">
                        Sau thời gian này, khung giờ sẽ được nhả cho người khác.
                    </p>
                </div>
            </main>

            {/* Footer */}
            <footer className="fixed bottom-0 left-0 right-0 bg-white border-t p-4">
                <div className="container mx-auto flex items-center justify-between">
                    <div>
                        <p className="text-sm text-gray-500">Tổng cộng</p>
                        <p className="text-xl font-bold text-primary">
                            {formatPrice(quote.totalPrice)}đ
                        </p>
                    </div>
                    <Button
                        onClick={handleCreateHold}
                        disabled={isLoading}
                        className="min-w-[180px]"
                    >
                        {isLoading ? (
                            <>
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                Đang giữ chỗ...
                            </>
                        ) : (
                            'Đi tới thanh toán'
                        )}
                    </Button>
                </div>
            </footer>
        </div>
    );
}

