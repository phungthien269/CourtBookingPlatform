/**
 * TimeSlotPage - Select date and time slots
 * Route: /venues/:id/book/:courtId
 */

import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
    CourtDTO,
    fetchCourtsForVenue,
    fetchCourtAvailability,
    AvailabilityDTO,
    getBookingQuote,
    getTomorrowDate,
    formatPrice,
    addDaysToDate,
} from '../../api/booking';
import { fetchVenueById, VenueDetail } from '../../api/venue';
import { TimeSlotPicker, DurationSelector, BookingSummaryCard } from '../../components/booking';
import { Button } from '../../components/ui/Button';
import { ArrowLeft, ArrowRight, Calendar } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

export default function TimeSlotPage() {
    const { id: venueId, courtId } = useParams<{ id: string; courtId: string }>();
    const navigate = useNavigate();
    const { token } = useAuth();

    const [venue, setVenue] = useState<VenueDetail | null>(null);
    const [court, setCourt] = useState<CourtDTO | null>(null);
    const [availability, setAvailability] = useState<AvailabilityDTO | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Selection state
    const [selectedDate, setSelectedDate] = useState<string>(getTomorrowDate());
    const [selectedStartHour, setSelectedStartHour] = useState<number | null>(null);
    const [durationHours, setDurationHours] = useState<number>(1);

    // Load venue and court info
    useEffect(() => {
        if (!venueId || !courtId) return;

        const loadInfo = async () => {
            try {
                const [venueData, courtsData] = await Promise.all([
                    fetchVenueById(venueId),
                    fetchCourtsForVenue(venueId),
                ]);
                setVenue(venueData);
                const foundCourt = courtsData.find(c => c.id === courtId);
                setCourt(foundCourt || null);
            } catch (err) {
                console.error('Failed to load info:', err);
                setError('Không thể tải thông tin');
            }
        };

        loadInfo();
    }, [venueId, courtId]);

    // Load availability when date changes
    useEffect(() => {
        if (!courtId || !selectedDate) return;

        const loadAvailability = async () => {
            setIsLoading(true);
            try {
                const data = await fetchCourtAvailability(courtId, selectedDate);
                setAvailability(data);
                setSelectedStartHour(null); // Reset selection on date change
            } catch (err) {
                console.error('Failed to load availability:', err);
                setError('Không thể tải lịch sân');
            } finally {
                setIsLoading(false);
            }
        };

        loadAvailability();
    }, [courtId, selectedDate]);

    // WebSocket subscription for real-time updates (Phase 3)
    useEffect(() => {
        if (!courtId || !selectedDate) return;

        const wsUrl = import.meta.env.VITE_WS_URL || 'ws://localhost:3001/ws';
        const ws = new WebSocket(wsUrl);

        ws.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);
                if (
                    (data.type === 'booking.hold.created' || data.type === 'booking.hold.expired') &&
                    data.payload?.courtId === courtId &&
                    data.payload?.date === selectedDate
                ) {
                    // Refetch availability when hold changes
                    fetchCourtAvailability(courtId, selectedDate).then(setAvailability).catch(console.error);
                }
            } catch (e) {
                console.error('WS parse error:', e);
            }
        };

        return () => ws.close();
    }, [courtId, selectedDate]);

    const handleSlotSelect = (hour: number) => {
        setSelectedStartHour(hour);
    };

    const handleContinue = async () => {
        if (!selectedStartHour || !court || !venueId || !courtId || !token) return;

        setIsSubmitting(true);
        setError(null);

        try {
            const result = await getBookingQuote(
                {
                    venueId,
                    courtId,
                    date: selectedDate,
                    startHour: selectedStartHour,
                    durationHours,
                },
                token
            );

            if (result.success && result.data) {
                // Navigate to summary with quote data
                navigate(`/venues/${venueId}/book/${courtId}/summary`, {
                    state: {
                        quote: result.data,
                        venue: venue,
                        court: court,
                        startHour: selectedStartHour,
                        durationHours: durationHours,
                    },
                });
            } else {
                setError(result.error?.message || 'Khung giờ không khả dụng');
            }
        } catch (err) {
            console.error('Quote failed:', err);
            setError('Lỗi hệ thống');
        } finally {
            setIsSubmitting(false);
        }
    };

    const isCrossDay = selectedStartHour !== null && selectedStartHour + durationHours > 24;

    if (!venue || !court) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="animate-spin h-12 w-12 border-4 border-primary border-t-transparent rounded-full" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 pb-24">
            {/* Header */}
            <header className="bg-white border-b sticky top-0 z-10">
                <div className="container mx-auto px-4 py-4 flex items-center gap-4">
                    <Link
                        to={`/venues/${venueId}/book`}
                        className="p-2 hover:bg-gray-100 rounded-lg transition"
                    >
                        <ArrowLeft className="w-5 h-5" />
                    </Link>
                    <div>
                        <h1 className="font-bold text-lg">Chọn giờ</h1>
                        <p className="text-sm text-gray-500">{court.name} - {venue.name}</p>
                    </div>
                </div>
            </header>

            {/* Content */}
            <main className="container mx-auto px-4 py-6">
                {/* Progress */}
                <div className="flex items-center gap-2 text-sm mb-6">
                    <span className="text-gray-400 px-3 py-1">1. Chọn sân ✓</span>
                    <span className="text-gray-400">→</span>
                    <span className="bg-primary text-white px-3 py-1 rounded-full">2. Chọn giờ</span>
                    <span className="text-gray-400">→</span>
                    <span className="text-gray-400 px-3 py-1">3. Xác nhận</span>
                </div>

                {/* Date Picker */}
                <div className="bg-white rounded-lg border p-4 mb-6">
                    <div className="flex items-center gap-2 mb-3">
                        <Calendar className="w-5 h-5 text-primary" />
                        <span className="font-medium">Chọn ngày</span>
                    </div>
                    <input
                        type="date"
                        value={selectedDate}
                        onChange={(e) => setSelectedDate(e.target.value)}
                        min={getTomorrowDate()}
                        className="w-full border rounded-lg px-3 py-2"
                    />
                </div>

                {/* Duration Selector */}
                <div className="bg-white rounded-lg border p-4 mb-6">
                    <DurationSelector
                        duration={durationHours}
                        onChange={setDurationHours}
                    />
                </div>

                {/* Time Slots */}
                <div className="bg-white rounded-lg border p-4 mb-6">
                    <h3 className="font-medium mb-4">Chọn giờ bắt đầu</h3>
                    <TimeSlotPicker
                        slots={availability?.slots || []}
                        selectedStartHour={selectedStartHour}
                        durationHours={durationHours}
                        onSlotSelect={handleSlotSelect}
                        isLoading={isLoading}
                    />
                </div>

                {/* Summary Preview */}
                {selectedStartHour !== null && (
                    <BookingSummaryCard
                        courtName={court.name}
                        sportType={court.sportType.name}
                        date={selectedDate}
                        startHour={selectedStartHour}
                        durationHours={durationHours}
                        pricePerHour={court.pricePerHour}
                        endDate={isCrossDay ? addDaysToDate(selectedDate, 1) : undefined}
                    />
                )}

                {/* Error */}
                {error && (
                    <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                        {error}
                    </div>
                )}
            </main>

            {/* Footer */}
            <footer className="fixed bottom-0 left-0 right-0 bg-white border-t p-4">
                <div className="container mx-auto flex items-center justify-between">
                    <div>
                        {selectedStartHour !== null && (
                            <p className="text-lg font-bold text-primary">
                                {formatPrice(court.pricePerHour * durationHours)}đ
                            </p>
                        )}
                    </div>
                    <Button
                        disabled={selectedStartHour === null || isSubmitting}
                        onClick={handleContinue}
                        className="flex items-center gap-2"
                    >
                        {isSubmitting ? 'Đang xử lý...' : 'Tiếp tục'}
                        <ArrowRight className="w-4 h-4" />
                    </Button>
                </div>
            </footer>
        </div>
    );
}
