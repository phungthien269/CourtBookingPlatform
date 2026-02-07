/**
 * Home Page - Discovery Experience
 * Map + List + Filters for venue discovery
 */

import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { VenueCard, VenueFilters, VenueMap } from '../components/venue';
import {
    fetchVenues,
    fetchDistricts,
    fetchSportTypes,
    VenueCard as VenueCardType,
    SportType,
} from '../api/venue';

// Debounce hook for search input
function useDebounce<T>(value: T, delay: number): T {
    const [debouncedValue, setDebouncedValue] = useState<T>(value);

    useEffect(() => {
        const handler = setTimeout(() => {
            setDebouncedValue(value);
        }, delay);

        return () => {
            clearTimeout(handler);
        };
    }, [value, delay]);

    return debouncedValue;
}

export function Home() {
    const navigate = useNavigate();

    // Filter state
    const [sportTypes, setSportTypes] = useState<SportType[]>([]);
    const [districts, setDistricts] = useState<string[]>([]);
    const [selectedSportTypes, setSelectedSportTypes] = useState<string[]>([]);
    const [selectedDistrict, setSelectedDistrict] = useState('');
    const [searchQuery, setSearchQuery] = useState('');

    // Venue state
    const [venues, setVenues] = useState<VenueCardType[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [selectedVenueId, setSelectedVenueId] = useState<string | undefined>();

    // Debounced search query
    const debouncedSearch = useDebounce(searchQuery, 300);

    // Load filter options on mount
    useEffect(() => {
        async function loadFilterOptions() {
            try {
                const [sportTypesData, districtsData] = await Promise.all([
                    fetchSportTypes(),
                    fetchDistricts(),
                ]);
                setSportTypes(sportTypesData);
                setDistricts(districtsData);
            } catch (err) {
                console.error('Failed to load filter options:', err);
            }
        }
        loadFilterOptions();
    }, []);

    // Fetch venues when filters change
    useEffect(() => {
        async function loadVenues() {
            setIsLoading(true);
            setError(null);

            try {
                const data = await fetchVenues({
                    sportTypes: selectedSportTypes.length > 0 ? selectedSportTypes : undefined,
                    district: selectedDistrict || undefined,
                    q: debouncedSearch || undefined,
                });
                setVenues(data);
            } catch (err) {
                console.error('Failed to fetch venues:', err);
                setError('Không thể tải danh sách sân. Vui lòng thử lại.');
            } finally {
                setIsLoading(false);
            }
        }
        loadVenues();
    }, [selectedSportTypes, selectedDistrict, debouncedSearch]);

    // Handlers
    const handleVenueSelect = useCallback((venue: VenueCardType) => {
        setSelectedVenueId(venue.id);
    }, []);

    const handleVenueClick = useCallback((venue: VenueCardType) => {
        navigate(`/venues/${venue.id}`);
    }, [navigate]);

    const handleClearFilters = useCallback(() => {
        setSelectedSportTypes([]);
        setSelectedDistrict('');
        setSearchQuery('');
    }, []);

    return (
        <div className="min-h-[calc(100vh-4rem)]">
            {/* Filter bar */}
            <VenueFilters
                sportTypes={sportTypes}
                districts={districts}
                selectedSportTypes={selectedSportTypes}
                selectedDistrict={selectedDistrict}
                searchQuery={searchQuery}
                onSportTypesChange={setSelectedSportTypes}
                onDistrictChange={setSelectedDistrict}
                onSearchChange={setSearchQuery}
                onClear={handleClearFilters}
            />

            {/* Main content: List + Map */}
            <div className="flex h-[calc(100vh-8rem)]">
                {/* Venue list panel - 40% */}
                <div className="w-2/5 overflow-auto border-r p-4 space-y-4">
                    {/* Loading state */}
                    {isLoading && (
                        <div className="flex items-center justify-center py-12">
                            <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
                        </div>
                    )}

                    {/* Error state */}
                    {error && !isLoading && (
                        <div className="text-center py-12">
                            <p className="text-red-500">{error}</p>
                            <button
                                onClick={() => window.location.reload()}
                                className="mt-4 text-primary underline"
                            >
                                Thử lại
                            </button>
                        </div>
                    )}

                    {/* Empty state */}
                    {!isLoading && !error && venues.length === 0 && (
                        <div className="text-center py-12">
                            <div className="text-4xl mb-4">🏸</div>
                            <h3 className="font-semibold text-gray-600">Không tìm thấy sân</h3>
                            <p className="text-gray-400 mt-2">
                                Thử thay đổi bộ lọc hoặc tìm kiếm khác
                            </p>
                            <button
                                onClick={handleClearFilters}
                                className="mt-4 text-primary underline"
                            >
                                Xóa bộ lọc
                            </button>
                        </div>
                    )}

                    {/* Venue cards */}
                    {!isLoading && !error && venues.map((venue) => (
                        <VenueCard
                            key={venue.id}
                            venue={venue}
                            isSelected={venue.id === selectedVenueId}
                            onClick={() => handleVenueClick(venue)}
                        />
                    ))}

                    {/* Results count */}
                    {!isLoading && !error && venues.length > 0 && (
                        <p className="text-center text-sm text-gray-400 py-4">
                            Hiển thị {venues.length} sân
                        </p>
                    )}
                </div>

                {/* Map panel - 60% */}
                <div className="w-3/5 relative">
                    {isLoading ? (
                        <div className="w-full h-full bg-gray-100 flex items-center justify-center">
                            <div className="text-center">
                                <div className="animate-spin h-12 w-12 border-4 border-primary border-t-transparent rounded-full mx-auto" />
                                <p className="mt-4 text-gray-500">Đang tải bản đồ...</p>
                            </div>
                        </div>
                    ) : (
                        <VenueMap
                            venues={venues}
                            selectedVenueId={selectedVenueId}
                            onVenueSelect={handleVenueSelect}
                            onVenueClick={handleVenueClick}
                        />
                    )}
                </div>
            </div>
        </div>
    );
}
