/**
 * VenueDetail Page - Full venue information
 * Route: /venues/:id
 * 
 * PRIVACY: contactPhone is NOT displayed (per BRD NFR-04)
 */

import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { fetchVenueById, VenueDetail as VenueDetailType } from '../../api/venue';

const DAY_NAMES = ['Chủ nhật', 'Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7'];

function formatPrice(price: number): string {
    return new Intl.NumberFormat('vi-VN').format(price);
}

function formatDate(dateStr: string): string {
    return new Date(dateStr).toLocaleDateString('vi-VN', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
    });
}

export function VenueDetail() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();

    const [venue, setVenue] = useState<VenueDetailType | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [selectedImageIndex, setSelectedImageIndex] = useState(0);

    useEffect(() => {
        async function loadVenue() {
            if (!id) return;

            setIsLoading(true);
            setError(null);

            try {
                const data = await fetchVenueById(id);
                if (data) {
                    setVenue(data);
                } else {
                    setError('Không tìm thấy sân');
                }
            } catch (err) {
                console.error('Failed to fetch venue:', err);
                setError('Không thể tải thông tin sân');
            } finally {
                setIsLoading(false);
            }
        }
        loadVenue();
    }, [id]);

    // Group schedules by day pattern
    const groupedSchedules = venue?.schedules?.reduce((acc, s) => {
        const timeStr = `${s.openTime} - ${s.closeTime}`;
        if (!acc[timeStr]) {
            acc[timeStr] = [];
        }
        acc[timeStr].push(s.dayOfWeek);
        return acc;
    }, {} as Record<string, number[]>) || {};

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
                <div className="text-4xl mb-4">😢</div>
                <h2 className="text-xl font-semibold text-gray-600">{error || 'Không tìm thấy sân'}</h2>
                <button
                    onClick={() => navigate('/')}
                    className="mt-4 text-primary underline"
                >
                    Quay lại trang chủ
                </button>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Header with back button */}
            <div className="bg-white border-b sticky top-0 z-10">
                <div className="max-w-5xl mx-auto px-4 py-4 flex items-center gap-4">
                    <button
                        onClick={() => navigate(-1)}
                        className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                    >
                        ← Quay lại
                    </button>
                    <h1 className="text-xl font-semibold truncate">{venue.name}</h1>
                </div>
            </div>

            <div className="max-w-5xl mx-auto px-4 py-6">
                {/* Image gallery */}
                <div className="bg-white rounded-lg shadow overflow-hidden mb-6">
                    {venue.images.length > 0 ? (
                        <>
                            {/* Main image */}
                            <img
                                src={venue.images[selectedImageIndex]?.url}
                                alt={venue.name}
                                className="w-full h-80 object-cover"
                            />

                            {/* Thumbnail strip */}
                            {venue.images.length > 1 && (
                                <div className="flex gap-2 p-4 overflow-x-auto">
                                    {venue.images.map((img, idx) => (
                                        <img
                                            key={img.id}
                                            src={img.url}
                                            alt={`${venue.name} ${idx + 1}`}
                                            className={`w-20 h-16 object-cover rounded cursor-pointer transition-all ${idx === selectedImageIndex
                                                ? 'ring-2 ring-primary'
                                                : 'opacity-60 hover:opacity-100'
                                                }`}
                                            onClick={() => setSelectedImageIndex(idx)}
                                        />
                                    ))}
                                </div>
                            )}
                        </>
                    ) : (
                        <div className="w-full h-80 bg-gray-200 flex items-center justify-center">
                            <span className="text-gray-400">Chưa có ảnh</span>
                        </div>
                    )}
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Main info */}
                    <div className="lg:col-span-2 space-y-6">
                        {/* Basic info card */}
                        <div className="bg-white rounded-lg shadow p-6">
                            <h2 className="text-2xl font-bold mb-2">{venue.name}</h2>
                            <p className="text-gray-600">{venue.address}</p>
                            <p className="text-gray-500">{venue.district}, {venue.city}</p>

                            {/* Sport badges */}
                            <div className="flex flex-wrap gap-2 mt-4">
                                {venue.sportTypes.map((s) => (
                                    <span key={s.code} className="badge badge-info">
                                        {s.name}
                                    </span>
                                ))}
                            </div>

                            {/* Description */}
                            {venue.description && (
                                <div className="mt-4 pt-4 border-t">
                                    <h3 className="font-semibold mb-2">Giới thiệu</h3>
                                    <p className="text-gray-600 whitespace-pre-line">{venue.description}</p>
                                </div>
                            )}
                        </div>

                        {/* Opening hours */}
                        <div className="bg-white rounded-lg shadow p-6">
                            <h3 className="font-semibold mb-4">🕐 Giờ mở cửa</h3>

                            {Object.entries(groupedSchedules).map(([time, days]) => {
                                const sortedDays = [...days].sort((a, b) => (a === 0 ? 7 : a) - (b === 0 ? 7 : b));
                                let dayLabel: string;

                                if (sortedDays.length === 7) {
                                    dayLabel = 'Hàng ngày';
                                } else if (sortedDays.length >= 2) {
                                    dayLabel = `${DAY_NAMES[sortedDays[0]]} - ${DAY_NAMES[sortedDays[sortedDays.length - 1]]}`;
                                } else {
                                    dayLabel = DAY_NAMES[sortedDays[0]];
                                }

                                return (
                                    <div key={time} className="flex justify-between py-2 border-b last:border-0">
                                        <span className="text-gray-600">{dayLabel}</span>
                                        <span className="font-medium">{time}</span>
                                    </div>
                                );
                            })}
                        </div>

                        {/* Upcoming holidays */}
                        {venue.holidays.length > 0 && (
                            <div className="bg-orange-50 rounded-lg p-6">
                                <h3 className="font-semibold mb-4 text-orange-800">🎌 Ngày nghỉ sắp tới</h3>
                                {venue.holidays.map((h, idx) => (
                                    <div key={idx} className="flex justify-between py-2 border-b border-orange-200 last:border-0">
                                        <span className="text-orange-800">{formatDate(h.date)}</span>
                                        <span className="text-orange-600">{h.note}</span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Sidebar - Price + Booking CTA */}
                    <div className="space-y-6">
                        {/* Price card */}
                        <div className="bg-white rounded-lg shadow p-6">
                            <h3 className="font-semibold mb-4">💰 Giá thuê sân</h3>
                            <div className="text-2xl font-bold text-primary">
                                {formatPrice(venue.minPricePerHour)}đ
                                {venue.maxPricePerHour !== venue.minPricePerHour && (
                                    <> - {formatPrice(venue.maxPricePerHour)}đ</>
                                )}
                                <span className="text-base font-normal text-gray-500">/giờ</span>
                            </div>
                            <p className="text-sm text-gray-400 mt-1">
                                Giá có thể thay đổi theo khung giờ
                            </p>
                        </div>

                        {/* Booking CTA - Active in Phase 2 */}
                        <div className="bg-primary/5 rounded-lg p-6 border-2 border-primary/20">
                            <button
                                onClick={() => navigate(`/venues/${id}/book`)}
                                className="w-full bg-primary hover:bg-primary-dark text-white py-3 px-6 rounded-lg font-semibold transition-colors shadow-lg hover:shadow-xl"
                            >
                                🏸 Chọn sân & Đặt giờ
                            </button>
                            <p className="text-center text-sm text-gray-500 mt-3">
                                Chọn sân → Chọn giờ → Xác nhận đặt sân
                            </p>
                        </div>

                        {/* Location mini map placeholder */}
                        <div className="bg-white rounded-lg shadow p-6">
                            <h3 className="font-semibold mb-4">📍 Vị trí</h3>
                            <div className="bg-gray-200 rounded h-40 flex items-center justify-center">
                                <a
                                    href={`https://www.google.com/maps/search/?api=1&query=${venue.lat},${venue.lng}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-primary underline"
                                >
                                    Xem trên Google Maps
                                </a>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
