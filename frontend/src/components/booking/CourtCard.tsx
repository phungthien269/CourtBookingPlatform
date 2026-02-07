/**
 * CourtCard - Individual court display for layout grid
 */

import { CourtDTO, formatPrice } from '../../api/booking';

interface CourtCardProps {
    court: CourtDTO;
    isSelected: boolean;
    onClick: () => void;
}

export function CourtCard({ court, isSelected, onClick }: CourtCardProps) {
    const isDisabled = !court.isActive;

    return (
        <div
            className={`
                relative p-4 rounded-lg border-2 transition-all cursor-pointer
                ${isDisabled
                    ? 'bg-gray-100 border-gray-200 cursor-not-allowed opacity-60'
                    : isSelected
                        ? 'bg-primary/10 border-primary shadow-md'
                        : 'bg-white border-gray-200 hover:border-primary/50 hover:shadow-sm'
                }
            `}
            onClick={isDisabled ? undefined : onClick}
        >
            {/* Selection indicator */}
            {isSelected && (
                <div className="absolute top-2 right-2 w-6 h-6 bg-primary rounded-full flex items-center justify-center">
                    <span className="text-white text-sm">✓</span>
                </div>
            )}

            {/* Court name */}
            <h3 className="font-semibold text-lg">{court.name}</h3>

            {/* Sport type badge */}
            <span className="inline-block mt-2 px-2 py-1 text-xs rounded-full bg-blue-100 text-blue-700">
                {court.sportType.name}
            </span>

            {/* Price */}
            <p className="mt-3 text-lg font-bold text-primary">
                {formatPrice(court.pricePerHour)}đ
                <span className="text-sm font-normal text-gray-500">/giờ</span>
            </p>

            {/* Status */}
            {isDisabled && (
                <p className="mt-2 text-sm text-red-500">Sân tạm đóng</p>
            )}
        </div>
    );
}
