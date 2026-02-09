/**
 * TimeSlotPicker - Hourly slot grid with availability status
 */

import { SlotDTO, formatHourDisplay } from '../../api/booking';

interface TimeSlotPickerProps {
    slots: SlotDTO[];
    selectedStartHour: number | null;
    durationHours: number;
    onSlotSelect: (hour: number) => void;
    isLoading?: boolean;
}

const STATUS_COLORS: Record<SlotDTO['status'], string> = {
    AVAILABLE: 'bg-green-500 hover:bg-green-600 text-white cursor-pointer',
    BOOKED: 'bg-red-200 text-red-700 cursor-not-allowed',
    LOCKED: 'bg-yellow-200 text-yellow-700 cursor-not-allowed',
    CLOSED: 'bg-gray-200 text-gray-500 cursor-not-allowed',
    HOLIDAY: 'bg-purple-200 text-purple-700 cursor-not-allowed',
    HOLDING: 'bg-orange-200 text-orange-700 cursor-not-allowed',
};

export function TimeSlotPicker({
    slots,
    selectedStartHour,
    durationHours,
    onSlotSelect,
    isLoading,
}: TimeSlotPickerProps) {
    if (isLoading) {
        return (
            <div className="flex items-center justify-center py-8">
                <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
            </div>
        );
    }

    // Calculate which hours would be selected based on duration
    const getSelectedRange = (): number[] => {
        if (selectedStartHour === null) return [];
        const range: number[] = [];
        for (let i = 0; i < durationHours; i++) {
            range.push(selectedStartHour + i);
        }
        return range;
    };

    const selectedRange = getSelectedRange();

    // Check if a slot can be selected as start (all hours in duration are available)
    const canSelectAsStart = (hour: number): boolean => {
        for (let i = 0; i < durationHours; i++) {
            const checkHour = hour + i;
            if (checkHour >= 24) {
                // Cross-day check would require next day's slots
                // For simplicity, allow selection - FE will validate with quote API
                return true;
            }
            const slot = slots.find(s => s.hour === checkHour);
            if (!slot || slot.status !== 'AVAILABLE') {
                return false;
            }
        }
        return true;
    };

    return (
        <div className="space-y-4">
            {/* Legend */}
            <div className="flex flex-wrap gap-3 text-sm">
                <div className="flex items-center gap-1">
                    <div className="w-4 h-4 rounded bg-green-500" />
                    <span>Trống</span>
                </div>
                <div className="flex items-center gap-1">
                    <div className="w-4 h-4 rounded bg-red-200" />
                    <span>Đã đặt</span>
                </div>
                <div className="flex items-center gap-1">
                    <div className="w-4 h-4 rounded bg-yellow-200" />
                    <span>Khóa</span>
                </div>
                <div className="flex items-center gap-1">
                    <div className="w-4 h-4 rounded bg-gray-200" />
                    <span>Đóng cửa</span>
                </div>
                <div className="flex items-center gap-1">
                    <div className="w-4 h-4 rounded bg-purple-200" />
                    <span>Nghỉ lễ</span>
                </div>
            </div>

            {/* Slot Grid */}
            <div className="grid grid-cols-6 md:grid-cols-8 lg:grid-cols-12 gap-2">
                {slots.map((slot) => {
                    const isSelected = selectedRange.includes(slot.hour);
                    const isStartHour = slot.hour === selectedStartHour;
                    const isAvailable = slot.status === 'AVAILABLE';
                    const canStartHere = isAvailable && canSelectAsStart(slot.hour);

                    return (
                        <div
                            key={slot.hour}
                            className={`
                                relative p-2 text-center rounded-lg text-sm font-medium transition-all
                                ${isSelected
                                    ? 'bg-primary text-white ring-2 ring-primary ring-offset-2'
                                    : STATUS_COLORS[slot.status]
                                }
                                ${isStartHour ? 'ring-4 ring-primary' : ''}
                            `}
                            onClick={() => {
                                if (canStartHere) {
                                    onSlotSelect(slot.hour);
                                }
                            }}
                            title={slot.reason || (canStartHere ? 'Chọn để bắt đầu' : 'Không khả dụng')}
                        >
                            {formatHourDisplay(slot.hour)}
                            {isStartHour && (
                                <div className="absolute -top-1 -right-1 w-4 h-4 bg-blue-500 rounded-full flex items-center justify-center text-xs text-white">
                                    ▶
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>

            {/* Cross-day warning */}
            {selectedStartHour !== null && selectedStartHour + durationHours > 24 && (
                <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg text-sm text-yellow-800">
                    ⚠️ Khung giờ này kéo dài sang ngày hôm sau ({formatHourDisplay(selectedStartHour)} → {formatHourDisplay((selectedStartHour + durationHours) % 24)})
                </div>
            )}
        </div>
    );
}
