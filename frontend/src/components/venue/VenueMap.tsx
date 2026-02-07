/**
 * VenueMap component - Leaflet map with venue markers and clustering
 * Uses OpenStreetMap tiles (free, requires attribution)
 */

import { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import MarkerClusterGroup from 'react-leaflet-cluster';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { VenueCard as VenueCardType } from '../../api/venue';

// Fix Leaflet default marker icon issue
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

// @ts-ignore
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: markerIcon2x,
    iconUrl: markerIcon,
    shadowUrl: markerShadow,
});

// HCMC center coordinates
const HCMC_CENTER: [number, number] = [10.8231, 106.6297];
const DEFAULT_ZOOM = 12;

interface Props {
    venues: VenueCardType[];
    selectedVenueId?: string;
    onVenueSelect: (venue: VenueCardType) => void;
    onVenueClick: (venue: VenueCardType) => void;
}

// Component to handle flying to selected venue
function FlyToVenue({ venue }: { venue: VenueCardType | null }) {
    const map = useMap();

    useEffect(() => {
        if (venue) {
            map.flyTo([venue.lat, venue.lng], 15, { duration: 0.5 });
        }
    }, [venue, map]);

    return null;
}

function formatPrice(price: number): string {
    return new Intl.NumberFormat('vi-VN').format(price);
}

export function VenueMap({ venues, selectedVenueId, onVenueSelect, onVenueClick }: Props) {
    const selectedVenue = venues.find(v => v.id === selectedVenueId) || null;

    return (
        <MapContainer
            center={HCMC_CENTER}
            zoom={DEFAULT_ZOOM}
            className="w-full h-full"
            scrollWheelZoom={true}
        >
            {/* OpenStreetMap tiles with required attribution */}
            <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />

            {/* Fly to selected venue */}
            <FlyToVenue venue={selectedVenue} />

            {/* Marker cluster group */}
            <MarkerClusterGroup
                chunkedLoading
                maxClusterRadius={50}
            >
                {venues.map((venue) => (
                    <Marker
                        key={venue.id}
                        position={[venue.lat, venue.lng]}
                        eventHandlers={{
                            click: () => onVenueSelect(venue),
                        }}
                    >
                        <Popup>
                            <div className="min-w-[200px]">
                                {venue.coverImageUrl && (
                                    <img
                                        src={venue.coverImageUrl}
                                        alt={venue.name}
                                        className="w-full h-24 object-cover rounded mb-2"
                                    />
                                )}
                                <h3 className="font-semibold text-base">{venue.name}</h3>
                                <p className="text-sm text-gray-500">{venue.address}</p>
                                <p className="text-xs text-gray-400">{venue.district}</p>

                                {/* Sport badges */}
                                <div className="flex flex-wrap gap-1 my-2">
                                    {venue.sportTypes.map((s) => (
                                        <span key={s.code} className="text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded">
                                            {s.name}
                                        </span>
                                    ))}
                                </div>

                                {/* Price */}
                                <p className="text-sm font-medium text-green-600">
                                    {formatPrice(venue.minPricePerHour)}đ
                                    {venue.maxPricePerHour !== venue.minPricePerHour && (
                                        <> - {formatPrice(venue.maxPricePerHour)}đ</>
                                    )}
                                    /h
                                </p>

                                {/* Opening hours */}
                                <p className="text-xs text-gray-400 mt-1">
                                    🕐 {venue.openingHoursSummary}
                                </p>

                                {/* CTA Button */}
                                <button
                                    onClick={() => onVenueClick(venue)}
                                    className="w-full mt-3 bg-primary text-white py-2 px-4 rounded text-sm font-medium hover:bg-primary/90 transition-colors"
                                >
                                    Xem chi tiết
                                </button>
                            </div>
                        </Popup>
                    </Marker>
                ))}
            </MarkerClusterGroup>
        </MapContainer>
    );
}
