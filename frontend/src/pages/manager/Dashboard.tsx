import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { AlertCircle, CalendarDays, ChevronLeft, ChevronRight, Clock3, Wallet } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { getManagerContext, getManagerOverview, ManagerOverview } from '../../api/manager';
import { getTodayDate, formatPrice } from '../../api/booking';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';

const blockStyles: Record<string, string> = {
    WAITING_MANAGER_CONFIRM: 'bg-amber-100 text-amber-900 border-amber-300',
    CONFIRMED: 'bg-emerald-100 text-emerald-900 border-emerald-300',
    COMPLETED: 'bg-sky-100 text-sky-900 border-sky-300',
    CANCELLED_BY_MANAGER: 'bg-rose-100 text-rose-900 border-rose-300',
    LOCKED: 'bg-slate-200 text-slate-700 border-slate-300',
};

function formatDisplayDate(date: string) {
    return new Intl.DateTimeFormat('vi-VN', {
        weekday: 'long',
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
    }).format(new Date(`${date}T00:00:00`));
}

function addDays(date: string, value: number) {
    const next = new Date(`${date}T00:00:00`);
    next.setDate(next.getDate() + value);
    return next.toISOString().split('T')[0];
}

function getSubscriptionVariant(status: ManagerOverview['subscription']['status']) {
    switch (status) {
        case 'ACTIVE':
            return 'success';
        case 'EXPIRING_SOON':
            return 'warning';
        case 'EXPIRED':
            return 'error';
        default:
            return 'default';
    }
}

function getBlockClass(status: string) {
    return blockStyles[status] || 'bg-white text-slate-700 border-slate-300';
}

export function ManagerDashboard() {
    const { token } = useAuth();
    const location = useLocation();
    const [selectedDate, setSelectedDate] = useState(getTodayDate());
    const [overview, setOverview] = useState<ManagerOverview | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [needsVenueOnboarding, setNeedsVenueOnboarding] = useState(false);
    const [managerDisplayName, setManagerDisplayName] = useState<string | null>(null);
    const blockedReason = (location.state as { blockedReason?: string; from?: string } | null)?.blockedReason;
    const blockedFrom = (location.state as { blockedReason?: string; from?: string } | null)?.from;

    useEffect(() => {
        async function loadOverview() {
            if (!token) return;

            setLoading(true);
            setError(null);
            setNeedsVenueOnboarding(false);

            const result = await getManagerOverview(token, selectedDate);

            if (!result.success) {
                if (result.error.code === 'MANAGER_WORKSPACE_NOT_FOUND') {
                    const contextResult = await getManagerContext(token);

                    if (contextResult.success) {
                        setManagerDisplayName(contextResult.data.manager.displayName);
                        setNeedsVenueOnboarding(!contextResult.data.hasVenue);
                        setOverview(null);
                        setLoading(false);
                        return;
                    }
                }

                setError(result.error.message);
                setLoading(false);
                return;
            }

            setManagerDisplayName(null);
            setOverview(result.data);
            setLoading(false);
        }

        loadOverview();
    }, [selectedDate, token]);

    const timelineStartHour = overview?.hours[0] ?? 6;
    const totalTimelineHours = overview?.hours.length || 1;
    const venue = overview?.venue;

    return (
        <div className="space-y-6">
            <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div className="space-y-2">
                        <div className="flex items-center gap-3">
                            <h1 className="text-2xl font-semibold text-slate-900">Bảng điều hành sân</h1>
                            {overview && (
                                <Badge variant={getSubscriptionVariant(overview.subscription.status)}>
                                    {overview.subscription.status === 'ACTIVE' && 'Đang hoạt động'}
                                    {overview.subscription.status === 'EXPIRING_SOON' && 'Sắp hết hạn'}
                                    {overview.subscription.status === 'EXPIRED' && 'Đã hết hạn'}
                                    {overview.subscription.status === 'UNSET' && 'Chưa cài gói'}
                                </Badge>
                            )}
                        </div>
                        <p className="text-sm text-slate-500">
                            Theo dõi booking trong ngày, lịch khóa sân và trạng thái gia hạn của venue.
                        </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-3">
                        <Button variant="secondary" size="sm" onClick={() => setSelectedDate(addDays(selectedDate, -1))}>
                            <ChevronLeft className="mr-1 h-4 w-4" />
                            Ngày trước
                        </Button>
                        <input
                            type="date"
                            value={selectedDate}
                            onChange={(event) => setSelectedDate(event.target.value)}
                            className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
                        />
                        <Button variant="secondary" size="sm" onClick={() => setSelectedDate(addDays(selectedDate, 1))}>
                            Ngày sau
                            <ChevronRight className="ml-1 h-4 w-4" />
                        </Button>
                    </div>
                </div>

                {overview && venue && (
                    <div className="mt-4 flex flex-wrap items-center gap-3 text-sm text-slate-600">
                        <span className="inline-flex items-center gap-2">
                            <CalendarDays className="h-4 w-4" />
                            {formatDisplayDate(overview.date)}
                        </span>
                        <span className="inline-flex items-center gap-2">
                            <Clock3 className="h-4 w-4" />
                            {venue.name} • {venue.district}
                        </span>
                        {overview.subscription.daysRemaining !== null && (
                            <span className="inline-flex items-center gap-2">
                                <Wallet className="h-4 w-4" />
                                Còn {overview.subscription.daysRemaining} ngày gia hạn
                            </span>
                        )}
                    </div>
                )}
            </section>

            {loading && (
                <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center text-slate-500 shadow-sm">
                    Đang tải dashboard manager...
                </div>
            )}

            {error && (
                <div className="rounded-2xl border border-rose-200 bg-rose-50 p-5 text-rose-700 shadow-sm">
                    {error}
                </div>
            )}

            {!loading && !error && needsVenueOnboarding && (
                <section className="rounded-2xl border border-amber-200 bg-amber-50 p-6 shadow-sm">
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                        <div className="space-y-3">
                            <Badge variant="warning">Onboarding chưa hoàn tất</Badge>
                            <div>
                                <h2 className="text-xl font-semibold text-slate-900">
                                    {managerDisplayName || 'Manager'} chưa được gán venue
                                </h2>
                                <p className="mt-2 max-w-2xl text-sm text-slate-600">
                                    Tài khoản manager đã đăng nhập thành công nhưng chưa có venue để vận hành.
                                    Khi admin tạo hoặc gán venue, dashboard, sân, lịch hoạt động và booking sẽ tự hoạt động lại.
                                </p>
                                {blockedReason === 'MANAGER_VENUE_REQUIRED' && blockedFrom && (
                                    <p className="mt-2 text-sm font-medium text-amber-800">
                                        Trang <span className="font-semibold">{blockedFrom}</span> đang bị khóa cho tới khi venue được gán.
                                    </p>
                                )}
                            </div>
                        </div>

                        <Button variant="secondary" onClick={() => window.location.reload()}>
                            Tải lại
                        </Button>
                    </div>

                    <div className="mt-6 grid gap-4 md:grid-cols-3">
                        <div className="rounded-2xl border border-white/70 bg-white/80 p-4">
                            <p className="text-sm font-semibold text-slate-900">1. Yêu cầu admin tạo venue</p>
                            <p className="mt-2 text-sm text-slate-600">
                                Admin cần tạo venue mới hoặc gán venue hiện có cho tài khoản manager này.
                            </p>
                        </div>
                        <div className="rounded-2xl border border-white/70 bg-white/80 p-4">
                            <p className="text-sm font-semibold text-slate-900">2. Hoàn thiện cấu hình vận hành</p>
                            <p className="mt-2 text-sm text-slate-600">
                                Sau khi có venue, cấu hình sân, lịch mở cửa, ảnh venue và thông tin ngân hàng nhận thanh toán.
                            </p>
                        </div>
                        <div className="rounded-2xl border border-white/70 bg-white/80 p-4">
                            <p className="text-sm font-semibold text-slate-900">3. Kiểm tra gói subscription</p>
                            <p className="mt-2 text-sm text-slate-600">
                                Vào mục Gia hạn để kiểm tra phí theo số sân active và trạng thái gói hiện tại.
                            </p>
                        </div>
                    </div>
                </section>
            )}

            {!loading && !error && overview && venue && (
                <>
                    <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
                        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                            <p className="text-sm text-slate-500">Tổng booking</p>
                            <p className="mt-3 text-3xl font-semibold text-slate-900">{overview.stats.totalBookings}</p>
                        </div>
                        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5 shadow-sm">
                            <p className="text-sm text-amber-700">Chờ xác nhận</p>
                            <p className="mt-3 text-3xl font-semibold text-amber-900">{overview.stats.waitingConfirm}</p>
                        </div>
                        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5 shadow-sm">
                            <p className="text-sm text-emerald-700">Đã xác nhận</p>
                            <p className="mt-3 text-3xl font-semibold text-emerald-900">{overview.stats.confirmed}</p>
                        </div>
                        <div className="rounded-2xl border border-sky-200 bg-sky-50 p-5 shadow-sm">
                            <p className="text-sm text-sky-700">Hoàn thành</p>
                            <p className="mt-3 text-3xl font-semibold text-sky-900">{overview.stats.completed}</p>
                        </div>
                        <div className="rounded-2xl border border-slate-200 bg-slate-900 p-5 text-white shadow-sm">
                            <p className="text-sm text-slate-300">Doanh thu ghi nhận</p>
                            <p className="mt-3 text-3xl font-semibold">{formatPrice(overview.stats.revenue)}đ</p>
                        </div>
                    </section>

                    <section className="grid gap-6 xl:grid-cols-[minmax(0,2fr)_360px]">
                        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                            <div className="mb-4 flex items-center justify-between">
                                <div>
                                    <h2 className="text-lg font-semibold text-slate-900">Timeline booking</h2>
                                    <p className="text-sm text-slate-500">
                                        Hiển thị booking và lịch khóa sân theo từng sân con.
                                    </p>
                                </div>
                            </div>

                            <div className="overflow-x-auto">
                                <div className="min-w-[920px]">
                                    <div
                                        className="grid border-b border-slate-200 text-xs text-slate-500"
                                        style={{ gridTemplateColumns: `160px repeat(${totalTimelineHours}, minmax(0, 1fr))` }}
                                    >
                                        <div className="px-3 py-3 font-medium text-slate-600">Sân</div>
                                        {overview.hours.map((hour) => (
                                            <div key={hour} className="border-l border-slate-100 px-2 py-3 text-center">
                                                {hour}:00
                                            </div>
                                        ))}
                                    </div>

                                    {overview.courts.map((court) => (
                                        <div
                                            key={court.id}
                                            className="relative grid min-h-[92px] border-b border-slate-100"
                                            style={{ gridTemplateColumns: `160px repeat(${totalTimelineHours}, minmax(0, 1fr))` }}
                                        >
                                            <div className="flex flex-col justify-center gap-1 px-3 py-3">
                                                <span className="font-medium text-slate-900">{court.name}</span>
                                                <span className="text-xs text-slate-500">{court.sportTypeName}</span>
                                                {!court.isActive && <Badge variant="error">Đang ẩn</Badge>}
                                            </div>

                                            {overview.hours.map((hour) => (
                                                <div key={hour} className="border-l border-slate-100 bg-slate-50/50" />
                                            ))}

                                            {court.blocks.map((block) => {
                                                const left = ((block.startHour - timelineStartHour) / totalTimelineHours) * 100;
                                                const width = ((block.endHour - block.startHour) / totalTimelineHours) * 100;

                                                return (
                                                    <div
                                                        key={block.id}
                                                        className={`absolute top-3 h-[68px] overflow-hidden rounded-xl border px-3 py-2 text-xs shadow-sm ${getBlockClass(block.status)}`}
                                                        style={{
                                                            left: `calc(160px + ${left}%)`,
                                                            width: `calc(${width}% - 8px)`,
                                                        }}
                                                    >
                                                        <p className="truncate font-semibold">{block.title}</p>
                                                        <p className="truncate opacity-80">{block.subtitle}</p>
                                                        <p className="mt-1 opacity-75">
                                                            {block.startTime} - {block.endTime}
                                                        </p>
                                                        {block.amount !== undefined && (
                                                            <p className="mt-1 font-medium">{formatPrice(block.amount)}đ</p>
                                                        )}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>

                        <div className="space-y-6">
                            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                                <div className="flex items-center gap-2">
                                    <AlertCircle className="h-5 w-5 text-slate-500" />
                                    <h2 className="text-lg font-semibold text-slate-900">Tình trạng venue</h2>
                                </div>
                                <div className="mt-4 space-y-3 text-sm text-slate-600">
                                    <div className="flex items-center justify-between">
                                        <span>Trạng thái venue</span>
                                        <Badge variant={venue.status === 'ACTIVE' ? 'success' : 'warning'}>
                                            {venue.status}
                                        </Badge>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <span>Sân đang hoạt động</span>
                                        <span className="font-medium text-slate-900">
                                            {venue.activeCourtCount}/{venue.totalCourtCount}
                                        </span>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <span>Phí tháng hiện tại</span>
                                        <span className="font-medium text-slate-900">
                                            {formatPrice(overview.subscription.totalMonthlyFee)}đ
                                        </span>
                                    </div>
                                </div>
                            </section>

                            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                                <h2 className="text-lg font-semibold text-slate-900">Ngày nghỉ sắp tới</h2>
                                <div className="mt-4 space-y-3">
                                    {overview.upcomingHolidays.length === 0 && (
                                        <p className="text-sm text-slate-500">Chưa có ngày nghỉ nào được cấu hình.</p>
                                    )}
                                    {overview.upcomingHolidays.map((holiday) => (
                                        <div key={holiday.id} className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                                            <p className="font-medium text-slate-900">
                                                {new Intl.DateTimeFormat('vi-VN', {
                                                    day: '2-digit',
                                                    month: '2-digit',
                                                    year: 'numeric',
                                                }).format(new Date(`${holiday.date}T00:00:00`))}
                                            </p>
                                            <p className="mt-1 text-sm text-slate-500">{holiday.note || 'Không có ghi chú'}</p>
                                        </div>
                                    ))}
                                </div>
                            </section>
                        </div>
                    </section>
                </>
            )}
        </div>
    );
}
