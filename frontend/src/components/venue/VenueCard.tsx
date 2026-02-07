/**
 * VenueCard component - List item for venue discovery
 */

import { VenueCard as VenueCardType } from '../../api/venue';

interface Props {
    venue: VenueCardType;
    isSelected?: boolean;
    onClick?: () => void;
}

function formatPrice(price: number): string {
    return new Intl.NumberFormat('vi-VN').format(price);
}

export function VenueCard({ venue, isSelected, onClick }: Props) {
    return (
        <div
            className={`card hover:shadow-lg transition-shadow cursor-pointer ${isSelected ? 'ring-2 ring-primary bg-primary/5' : ''
                }`}
            onClick={onClick}
        >
            <div className="flex gap-4">
                <img
                    src={venue.coverImageUrl || 'https://placehold.co/120x90/e2e8f0/64748b?text=No+Image'}
                    alt={venue.name}
                    className="w-30 h-24 object-cover rounded"
                />
                <div className="flex-1 min-w-0">
                    <h3 className="font-semibold truncate">{venue.name}</h3>
                    <p className="text-sm text-gray-500 truncate">{venue.address}</p>
                    <p className="text-xs text-gray-400">{venue.district}</p>

                    {/* Sport type badges */}
                    <div className="flex flex-wrap gap-1 mt-1">
                        {venue.sportTypes.slice(0, 3).map((sport) => (
                            <span key={sport.code} className="badge badge-info text-xs">
                                {sport.name}
                            </span>
                        ))}
                        {venue.sportTypes.length > 3 && (
                            <span className="badge text-xs">+{venue.sportTypes.length - 3}</span>
                        )}
                    </div>

                    {/* Price and rating */}
                    <div className="flex items-center justify-between mt-2">
                        <span className="text-sm font-medium text-primary">
                            {formatPrice(venue.minPricePerHour)}đ
                            {venue.maxPricePerHour !== venue.minPricePerHour && (
                                <> - {formatPrice(venue.maxPricePerHour)}đ</>
                            )}
                            /h
                        </span>
                    </div>
                </div>
            </div>

            {/* Opening hours summary */}
            <p className="text-xs text-gray-400 mt-2 truncate">
                🕐 {venue.openingHoursSummary}
            </p>
        </div>
    );
}
