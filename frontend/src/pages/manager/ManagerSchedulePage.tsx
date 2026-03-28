import { useEffect, useState } from 'react';
import { CalendarPlus, Clock3, Plus, Save, Trash2 } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import {
    addManagerBlackout,
    addManagerHoliday,
    getManagerSchedule,
    ManagerSchedule,
    removeManagerBlackout,
    removeManagerHoliday,
    replaceWeeklySchedule,
} from '../../api/manager';
import { getTodayDate } from '../../api/booking';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { toast } from '../../components/ui/Toast';

const DAY_LABELS = ['Chủ nhật', 'Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7'];

type EditableSchedule = {
    id: string;
    dayOfWeek: number;
    openTime: string;
    closeTime: string;
};

export default function ManagerSchedulePage() {
    const { token } = useAuth();
    const [data, setData] = useState<ManagerSchedule | null>(null);
    const [editableSchedules, setEditableSchedules] = useState<EditableSchedule[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [savingWeekly, setSavingWeekly] = useState(false);
    const [holidayDate, setHolidayDate] = useState(getTodayDate());
    const [holidayNote, setHolidayNote] = useState('');
    const [addingHoliday, setAddingHoliday] = useState(false);
    const [blackoutCourtId, setBlackoutCourtId] = useState('');
    const [blackoutDate, setBlackoutDate] = useState(getTodayDate());
    const [blackoutStartTime, setBlackoutStartTime] = useState('08:00');
    const [blackoutEndTime, setBlackoutEndTime] = useState('10:00');
    const [blackoutReason, setBlackoutReason] = useState('');
    const [addingBlackout, setAddingBlackout] = useState(false);

    useEffect(() => {
        async function loadSchedule() {
            if (!token) return;

            setLoading(true);
            setError(null);

            const result = await getManagerSchedule(token);
            if (!result.success) {
                setError(result.error.message);
                setLoading(false);
                return;
            }

            setData(result.data);
            setEditableSchedules(
                result.data.weeklySchedules.map((schedule) => ({
                    id: schedule.id,
                    dayOfWeek: schedule.dayOfWeek,
                    openTime: schedule.openTime,
                    closeTime: schedule.closeTime,
                }))
            );
            setBlackoutCourtId(result.data.courts[0]?.id || '');
            setLoading(false);
        }

        loadSchedule();
    }, [token]);

    async function refreshSchedule() {
        if (!token) return;
        const result = await getManagerSchedule(token);
        if (result.success) {
            setData(result.data);
            setEditableSchedules(
                result.data.weeklySchedules.map((schedule) => ({
                    id: schedule.id,
                    dayOfWeek: schedule.dayOfWeek,
                    openTime: schedule.openTime,
                    closeTime: schedule.closeTime,
                }))
            );
        }
    }

    function addShift(dayOfWeek: number) {
        setEditableSchedules((current) => [
            ...current,
            {
                id: `temp-${dayOfWeek}-${Date.now()}`,
                dayOfWeek,
                openTime: '08:00',
                closeTime: '10:00',
            },
        ]);
    }

    async function handleSaveWeekly() {
        if (!token) return;

        setSavingWeekly(true);
        const result = await replaceWeeklySchedule(
            editableSchedules.map((schedule) => ({
                dayOfWeek: schedule.dayOfWeek,
                openTime: schedule.openTime,
                closeTime: schedule.closeTime,
            })),
            token
        );
        setSavingWeekly(false);

        if (!result.success) {
            toast(result.error.message, 'error');
            return;
        }

        setEditableSchedules(
            result.data.map((schedule) => ({
                id: schedule.id,
                dayOfWeek: schedule.dayOfWeek,
                openTime: schedule.openTime,
                closeTime: schedule.closeTime,
            }))
        );
        await refreshSchedule();
        toast('Đã lưu lịch hoạt động', 'success');
    }

    async function handleAddHoliday() {
        if (!token || !holidayDate) return;

        setAddingHoliday(true);
        const result = await addManagerHoliday({ date: holidayDate, note: holidayNote.trim() || undefined }, token);
        setAddingHoliday(false);

        if (!result.success) {
            toast(result.error.message, 'error');
            return;
        }

        setData((current) =>
            current
                ? {
                    ...current,
                    holidays: [...current.holidays, result.data].sort((first, second) => first.date.localeCompare(second.date)),
                }
                : current
        );
        setHolidayNote('');
        toast('Đã thêm ngày nghỉ', 'success');
    }

    async function handleDeleteHoliday(id: string) {
        if (!token || !data) return;

        const result = await removeManagerHoliday(id, token);
        if (!result.success) {
            toast(result.error.message, 'error');
            return;
        }

        setData({
            ...data,
            holidays: data.holidays.filter((holiday) => holiday.id !== id),
        });
        toast('Đã xóa ngày nghỉ', 'success');
    }

    async function handleAddBlackout() {
        if (!token || !blackoutCourtId) return;

        setAddingBlackout(true);
        const result = await addManagerBlackout(
            {
                courtId: blackoutCourtId,
                date: blackoutDate,
                startTime: blackoutStartTime,
                endTime: blackoutEndTime,
                reason: blackoutReason.trim() || undefined,
            },
            token
        );
        setAddingBlackout(false);

        if (!result.success) {
            toast(result.error.message, 'error');
            return;
        }

        setData((current) =>
            current
                ? {
                    ...current,
                    blackouts: [...current.blackouts, result.data].sort((first, second) =>
                        `${first.date}${first.startTime}`.localeCompare(`${second.date}${second.startTime}`)
                    ),
                }
                : current
        );
        setBlackoutReason('');
        toast('Đã khóa khung giờ', 'success');
    }

    async function handleDeleteBlackout(id: string) {
        if (!token || !data) return;

        const result = await removeManagerBlackout(id, token);
        if (!result.success) {
            toast(result.error.message, 'error');
            return;
        }

        setData({
            ...data,
            blackouts: data.blackouts.filter((blackout) => blackout.id !== id),
        });
        toast('Đã xóa lịch khóa sân', 'success');
    }

    if (loading) {
        return <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center text-slate-500 shadow-sm">Đang tải lịch hoạt động...</div>;
    }

    if (error || !data) {
        return <div className="rounded-2xl border border-rose-200 bg-rose-50 p-5 text-rose-700 shadow-sm">{error || 'Không thể tải lịch hoạt động'}</div>;
    }

    return (
        <div className="space-y-6">
            <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                    <div>
                        <h1 className="text-2xl font-semibold text-slate-900">Lịch hoạt động và ngày nghỉ</h1>
                        <p className="mt-2 text-sm text-slate-500">
                            Quản lý ca mở cửa, ngày nghỉ toàn venue và lịch khóa từng sân.
                        </p>
                    </div>
                    <Button onClick={handleSaveWeekly} loading={savingWeekly}>
                        <Save className="mr-2 h-4 w-4" />
                        Lưu lịch tuần
                    </Button>
                </div>
            </section>

            <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="mb-5 flex items-center gap-2">
                    <Clock3 className="h-5 w-5 text-slate-600" />
                    <h2 className="text-lg font-semibold text-slate-900">Ca hoạt động theo tuần</h2>
                </div>

                <div className="space-y-4">
                    {DAY_LABELS.map((label, dayOfWeek) => {
                        const daySchedules = editableSchedules
                            .filter((schedule) => schedule.dayOfWeek === dayOfWeek)
                            .sort((first, second) => first.openTime.localeCompare(second.openTime));

                        return (
                            <div key={label} className="rounded-2xl border border-slate-200 p-4">
                                <div className="mb-3 flex items-center justify-between">
                                    <div>
                                        <h3 className="font-semibold text-slate-900">{label}</h3>
                                        <p className="text-sm text-slate-500">
                                            {daySchedules.length > 0 ? `${daySchedules.length} ca đang cấu hình` : 'Chưa có ca hoạt động'}
                                        </p>
                                    </div>
                                    <Button variant="secondary" size="sm" onClick={() => addShift(dayOfWeek)}>
                                        <Plus className="mr-1 h-4 w-4" />
                                        Thêm ca
                                    </Button>
                                </div>

                                <div className="space-y-3">
                                    {daySchedules.length === 0 && (
                                        <p className="rounded-xl bg-slate-50 px-4 py-3 text-sm text-slate-500">
                                            Không mở cửa trong ngày này.
                                        </p>
                                    )}

                                    {daySchedules.map((schedule) => (
                                        <div key={schedule.id} className="grid gap-3 rounded-xl bg-slate-50 p-3 md:grid-cols-[1fr_1fr_auto]">
                                            <Input
                                                label="Mở cửa"
                                                type="time"
                                                value={schedule.openTime}
                                                onChange={(event) =>
                                                    setEditableSchedules((current) =>
                                                        current.map((item) =>
                                                            item.id === schedule.id ? { ...item, openTime: event.target.value } : item
                                                        )
                                                    )
                                                }
                                            />
                                            <Input
                                                label="Đóng cửa"
                                                type="time"
                                                value={schedule.closeTime}
                                                onChange={(event) =>
                                                    setEditableSchedules((current) =>
                                                        current.map((item) =>
                                                            item.id === schedule.id ? { ...item, closeTime: event.target.value } : item
                                                        )
                                                    )
                                                }
                                            />
                                            <div className="flex items-end">
                                                <button
                                                    type="button"
                                                    onClick={() =>
                                                        setEditableSchedules((current) => current.filter((item) => item.id !== schedule.id))
                                                    }
                                                    className="rounded-lg border border-rose-200 bg-white p-3 text-rose-500 transition hover:bg-rose-50"
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </section>

            <section className="grid gap-6 xl:grid-cols-2">
                <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                    <div className="mb-5 flex items-center gap-2">
                        <CalendarPlus className="h-5 w-5 text-slate-600" />
                        <h2 className="text-lg font-semibold text-slate-900">Ngày nghỉ toàn venue</h2>
                    </div>

                    <div className="grid gap-3 md:grid-cols-[1fr_1fr_auto]">
                        <Input label="Ngày nghỉ" type="date" value={holidayDate} onChange={(event) => setHolidayDate(event.target.value)} />
                        <Input label="Ghi chú" value={holidayNote} onChange={(event) => setHolidayNote(event.target.value)} placeholder="VD: Nghỉ lễ 30/4" />
                        <div className="flex items-end">
                            <Button onClick={handleAddHoliday} loading={addingHoliday} disabled={!holidayDate}>
                                Thêm ngày nghỉ
                            </Button>
                        </div>
                    </div>

                    <div className="mt-5 space-y-3">
                        {data.holidays.length === 0 && (
                            <p className="rounded-xl bg-slate-50 px-4 py-3 text-sm text-slate-500">Chưa có ngày nghỉ nào.</p>
                        )}
                        {data.holidays.map((holiday) => (
                            <div key={holiday.id} className="flex items-start justify-between rounded-xl border border-slate-200 p-4">
                                <div>
                                    <p className="font-medium text-slate-900">
                                        {new Intl.DateTimeFormat('vi-VN', {
                                            day: '2-digit',
                                            month: '2-digit',
                                            year: 'numeric',
                                        }).format(new Date(`${holiday.date}T00:00:00`))}
                                    </p>
                                    <p className="mt-1 text-sm text-slate-500">{holiday.note || 'Không có ghi chú'}</p>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => handleDeleteHoliday(holiday.id)}
                                    className="rounded-lg p-2 text-rose-500 transition hover:bg-rose-50"
                                >
                                    <Trash2 className="h-4 w-4" />
                                </button>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                    <div className="mb-5 flex items-center gap-2">
                        <Clock3 className="h-5 w-5 text-slate-600" />
                        <h2 className="text-lg font-semibold text-slate-900">Khóa sân theo khung giờ</h2>
                    </div>

                    <div className="grid gap-3 md:grid-cols-2">
                        <div>
                            <label className="mb-1 block text-sm font-medium text-slate-700">Sân</label>
                            <select
                                value={blackoutCourtId}
                                onChange={(event) => setBlackoutCourtId(event.target.value)}
                                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                            >
                                {data.courts.map((court) => (
                                    <option key={court.id} value={court.id}>
                                        {court.name} • {court.sportTypeName}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <Input label="Ngày khóa" type="date" value={blackoutDate} onChange={(event) => setBlackoutDate(event.target.value)} />
                        <Input label="Từ giờ" type="time" value={blackoutStartTime} onChange={(event) => setBlackoutStartTime(event.target.value)} />
                        <Input label="Đến giờ" type="time" value={blackoutEndTime} onChange={(event) => setBlackoutEndTime(event.target.value)} />
                    </div>

                    <div className="mt-3">
                        <Input
                            label="Lý do"
                            value={blackoutReason}
                            onChange={(event) => setBlackoutReason(event.target.value)}
                            placeholder="VD: Bảo trì sân, sự kiện riêng"
                        />
                    </div>

                    <div className="mt-4">
                        <Button onClick={handleAddBlackout} loading={addingBlackout} disabled={!blackoutCourtId}>
                            Thêm lịch khóa
                        </Button>
                    </div>

                    <div className="mt-5 space-y-3">
                        {data.blackouts.length === 0 && (
                            <p className="rounded-xl bg-slate-50 px-4 py-3 text-sm text-slate-500">Chưa có khung giờ nào bị khóa.</p>
                        )}

                        {data.blackouts.map((blackout) => (
                            <div key={blackout.id} className="flex items-start justify-between rounded-xl border border-slate-200 p-4">
                                <div>
                                    <div className="flex items-center gap-2">
                                        <p className="font-medium text-slate-900">{blackout.courtName}</p>
                                        <Badge variant="warning">Khóa sân</Badge>
                                    </div>
                                    <p className="mt-1 text-sm text-slate-600">
                                        {blackout.date} • {blackout.startTime} - {blackout.endTime}
                                    </p>
                                    <p className="mt-1 text-sm text-slate-500">{blackout.reason || 'Không có ghi chú'}</p>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => handleDeleteBlackout(blackout.id)}
                                    className="rounded-lg p-2 text-rose-500 transition hover:bg-rose-50"
                                >
                                    <Trash2 className="h-4 w-4" />
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
            </section>
        </div>
    );
}
