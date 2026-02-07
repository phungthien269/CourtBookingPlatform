/**
 * BookingSummaryCard - Display booking summary with price
 */

import { formatPrice, formatHourDisplay } from '../../api/booking';

interface BookingSummaryCardProps {
    courtName: string;
    sportType: string;
    date: string;
    startHour: number;
    durationHours: number;
    pricePerHour: number;
    endDate?: string;  // For cross-day
}

export function BookingSummaryCard({
    courtName,
    sportType,
    date,
    startHour,
    durationHours,
    pricePerHour,
    endDate,
}: BookingSummaryCardProps) {
    const endHour = (startHour + durationHours) % 24;
    const isCrossDay = startHour + durationHours >= 24;
    const totalPrice = pricePerHour * durationHours;

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

    return (
        <div className="bg-white rounded-lg border p-4 shadow-sm">
            <h3 className="font-semibold text-lg mb-4">Chi tiết đặt sân</h3>

            <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                    <span className="text-gray-500">Sân:</span>
                    <span className="font-medium">{courtName}</span>
                </div>

                <div className="flex justify-between">
                    <span className="text-gray-500">Môn:</span>
                    <span>{sportType}</span>
                </div>

                <div className="flex justify-between">
                    <span className="text-gray-500">Ngày:</span>
                    <span>{formatDate(date)}</span>
                </div>

                <div className="flex justify-between">
                    <span className="text-gray-500">Giờ:</span>
                    <span>
                        {formatHourDisplay(startHour)} → {formatHourDisplay(endHour)}
                        {isCrossDay && (
                            <span className="text-yellow-600 ml-1">(sang ngày)</span>
                        )}
                    </span>
                </div>

                {isCrossDay && endDate && (
                    <div className="flex justify-between">
                        <span className="text-gray-500">Ngày kết thúc:</span>
                        <span>{formatDate(endDate)}</span>
                    </div>
                )}

                <div className="flex justify-between">
                    <span className="text-gray-500">Thời lượng:</span>
                    <span>{durationHours} giờ</span>
                </div>

                <div className="flex justify-between">
                    <span className="text-gray-500">Đơn giá:</span>
                    <span>{formatPrice(pricePerHour)}đ/giờ</span>
                </div>

                <hr />

                <div className="flex justify-between text-lg font-bold">
                    <span>Tổng cộng:</span>
                    <span className="text-primary">{formatPrice(totalPrice)}đ</span>
                </div>
            </div>
        </div>
    );
}
