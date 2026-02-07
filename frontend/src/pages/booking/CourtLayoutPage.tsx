/**
 * CourtLayoutPage - Select a court from venue
 * Route: /venues/:id/book
 */

import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { CourtDTO, fetchCourtsForVenue } from '../../api/booking';
import { fetchVenueById, VenueDetail } from '../../api/venue';
import { CourtLayoutGrid } from '../../components/booking/CourtLayoutGrid';
import { Button } from '../../components/ui/Button';
import { ArrowLeft, ArrowRight } from 'lucide-react';

export default function CourtLayoutPage() {
    const { id: venueId } = useParams<{ id: string }>();
    const navigate = useNavigate();

    const [venue, setVenue] = useState<VenueDetail | null>(null);
    const [courts, setCourts] = useState<CourtDTO[]>([]);
    const [selectedCourt, setSelectedCourt] = useState<CourtDTO | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!venueId) return;

        const loadData = async () => {
            setIsLoading(true);
            setError(null);
            try {
                const [venueData, courtsData] = await Promise.all([
                    fetchVenueById(venueId),
                    fetchCourtsForVenue(venueId),
                ]);
                setVenue(venueData);
                setCourts(courtsData);
            } catch (err) {
                console.error('Failed to load data:', err);
                setError('Không thể tải thông tin sân');
            } finally {
                setIsLoading(false);
            }
        };

        loadData();
    }, [venueId]);

    const handleCourtSelect = (court: CourtDTO) => {
        if (court.isActive) {
            setSelectedCourt(court);
        }
    };

    const handleContinue = () => {
        if (selectedCourt && venueId) {
            navigate(`/venues/${venueId}/book/${selectedCourt.id}`);
        }
    };

    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="animate-spin h-12 w-12 border-4 border-primary border-t-transparent rounded-full" />
            </div>
        );
    }

    if (error || !venue) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center">
                <p className="text-red-500 mb-4">{error || 'Không tìm thấy địa điểm'}</p>
                <Link to="/" className="text-primary hover:underline">
                    ← Về trang chủ
                </Link>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Header */}
            <header className="bg-white border-b sticky top-0 z-10">
                <div className="container mx-auto px-4 py-4 flex items-center gap-4">
                    <Link
                        to={`/venues/${venueId}`}
                        className="p-2 hover:bg-gray-100 rounded-lg transition"
                    >
                        <ArrowLeft className="w-5 h-5" />
                    </Link>
                    <div>
                        <h1 className="font-bold text-lg">Chọn sân</h1>
                        <p className="text-sm text-gray-500">{venue.name}</p>
                    </div>
                </div>
            </header>

            {/* Content */}
            <main className="container mx-auto px-4 py-6">
                {/* Progress */}
                <div className="flex items-center gap-2 text-sm mb-6">
                    <span className="bg-primary text-white px-3 py-1 rounded-full">1. Chọn sân</span>
                    <span className="text-gray-400">→</span>
                    <span className="text-gray-400 px-3 py-1">2. Chọn giờ</span>
                    <span className="text-gray-400">→</span>
                    <span className="text-gray-400 px-3 py-1">3. Xác nhận</span>
                </div>

                {/* Court Grid */}
                <CourtLayoutGrid
                    courts={courts}
                    selectedCourtId={selectedCourt?.id || null}
                    onCourtSelect={handleCourtSelect}
                />
            </main>

            {/* Footer */}
            <footer className="fixed bottom-0 left-0 right-0 bg-white border-t p-4">
                <div className="container mx-auto flex items-center justify-between">
                    <div>
                        {selectedCourt && (
                            <p className="text-sm">
                                Đã chọn: <strong>{selectedCourt.name}</strong>
                            </p>
                        )}
                    </div>
                    <Button
                        disabled={!selectedCourt}
                        onClick={handleContinue}
                        className="flex items-center gap-2"
                    >
                        Tiếp tục <ArrowRight className="w-4 h-4" />
                    </Button>
                </div>
            </footer>
        </div>
    );
}
