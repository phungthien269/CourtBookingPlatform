/**
 * DurationSelector - Duration picker 1-4 hours
 */

interface DurationSelectorProps {
    duration: number;
    onChange: (duration: number) => void;
    maxDuration?: number;
}

const DURATION_OPTIONS = [1, 2, 3, 4];

export function DurationSelector({
    duration,
    onChange,
    maxDuration = 4,
}: DurationSelectorProps) {
    return (
        <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-gray-700">Thời lượng:</span>
            <div className="flex gap-2">
                {DURATION_OPTIONS.filter(d => d <= maxDuration).map((d) => (
                    <button
                        key={d}
                        type="button"
                        className={`
                            px-4 py-2 rounded-lg text-sm font-medium transition-all
                            ${duration === d
                                ? 'bg-primary text-white'
                                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                            }
                        `}
                        onClick={() => onChange(d)}
                    >
                        {d} giờ
                    </button>
                ))}
            </div>
        </div>
    );
}
