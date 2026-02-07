/**
 * VenueFilters component - Sport types and district filters
 */

import { SportType } from '../../api/venue';

interface Props {
    sportTypes: SportType[];
    districts: string[];
    selectedSportTypes: string[];
    selectedDistrict: string;
    searchQuery: string;
    onSportTypesChange: (codes: string[]) => void;
    onDistrictChange: (district: string) => void;
    onSearchChange: (query: string) => void;
    onClear: () => void;
}

export function VenueFilters({
    sportTypes,
    districts,
    selectedSportTypes,
    selectedDistrict,
    searchQuery,
    onSportTypesChange,
    onDistrictChange,
    onSearchChange,
    onClear,
}: Props) {
    const handleSportTypeToggle = (code: string) => {
        if (selectedSportTypes.includes(code)) {
            onSportTypesChange(selectedSportTypes.filter((c) => c !== code));
        } else {
            onSportTypesChange([...selectedSportTypes, code]);
        }
    };

    const hasActiveFilters = selectedSportTypes.length > 0 || selectedDistrict || searchQuery;

    return (
        <div className="bg-white border-b py-4">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex flex-wrap gap-4 items-center">
                    {/* Sport type multi-select (as checkboxes) */}
                    <div className="flex flex-wrap gap-2">
                        {sportTypes.map((sport) => (
                            <label
                                key={sport.code}
                                className={`px-3 py-1.5 rounded-full text-sm cursor-pointer transition-colors ${selectedSportTypes.includes(sport.code)
                                        ? 'bg-primary text-white'
                                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                    }`}
                            >
                                <input
                                    type="checkbox"
                                    className="sr-only"
                                    checked={selectedSportTypes.includes(sport.code)}
                                    onChange={() => handleSportTypeToggle(sport.code)}
                                />
                                {sport.name}
                            </label>
                        ))}
                    </div>

                    {/* District dropdown */}
                    <select
                        className="input w-48"
                        value={selectedDistrict}
                        onChange={(e) => onDistrictChange(e.target.value)}
                    >
                        <option value="">Tất cả quận</option>
                        {districts.map((d) => (
                            <option key={d} value={d}>
                                {d}
                            </option>
                        ))}
                    </select>

                    {/* Search input */}
                    <input
                        type="text"
                        placeholder="Tìm theo tên sân..."
                        className="input flex-1 min-w-[200px]"
                        value={searchQuery}
                        onChange={(e) => onSearchChange(e.target.value)}
                    />

                    {/* Clear filters button */}
                    {hasActiveFilters && (
                        <button
                            onClick={onClear}
                            className="text-sm text-gray-500 hover:text-gray-700 underline"
                        >
                            Xóa bộ lọc
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}
