/**
 * CourtLayoutGrid - Grid container for court selection
 */

import { CourtDTO } from '../../api/booking';
import { CourtCard } from './CourtCard';

interface CourtLayoutGridProps {
    courts: CourtDTO[];
    selectedCourtId: string | null;
    onCourtSelect: (court: CourtDTO) => void;
    isLoading?: boolean;
}

export function CourtLayoutGrid({
    courts,
    selectedCourtId,
    onCourtSelect,
    isLoading,
}: CourtLayoutGridProps) {
    if (isLoading) {
        return (
            <div className="flex items-center justify-center py-12">
                <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
            </div>
        );
    }

    if (courts.length === 0) {
        return (
            <div className="text-center py-12">
                <div className="text-4xl mb-4">🏸</div>
                <p className="text-gray-500">Không có sân nào</p>
            </div>
        );
    }

    // Group courts by sport type
    const courtsBySport = courts.reduce((acc, court) => {
        const sportName = court.sportType.name;
        if (!acc[sportName]) {
            acc[sportName] = [];
        }
        acc[sportName].push(court);
        return acc;
    }, {} as Record<string, CourtDTO[]>);

    return (
        <div className="space-y-6">
            {Object.entries(courtsBySport).map(([sportName, sportCourts]) => (
                <div key={sportName}>
                    <h3 className="font-semibold text-gray-700 mb-3">{sportName}</h3>
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                        {sportCourts.map((court) => (
                            <CourtCard
                                key={court.id}
                                court={court}
                                isSelected={court.id === selectedCourtId}
                                onClick={() => onCourtSelect(court)}
                            />
                        ))}
                    </div>
                </div>
            ))}
        </div>
    );
}
