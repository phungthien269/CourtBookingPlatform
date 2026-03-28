import { useEffect, useState } from 'react';
import { BarChart3, CalendarRange, Clock3, TrendingUp } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { getManagerAnalytics, ManagerAnalytics } from '../../api/manager';
import { formatPrice } from '../../api/booking';
import { Badge } from '../../components/ui/Badge';

type Range = 'day' | 'week' | 'month';

const statusVariant: Record<string, 'success' | 'warning' | 'error' | 'info' | 'default'> = {
    WAITING_MANAGER_CONFIRM: 'warning',
    CONFIRMED: 'success',
    COMPLETED: 'info',
    CANCELLED_BY_MANAGER: 'error',
    CANCELLED_BY_USER: 'default',
    EXPIRED: 'default',
};

export default function ManagerAnalyticsPage() {
    const { token } = useAuth();
    const [range, setRange] = useState<Range>('week');
    const [analytics, setAnalytics] = useState<ManagerAnalytics | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        async function loadAnalytics() {
            if (!token) return;

            setLoading(true);
            setError(null);

            const result = await getManagerAnalytics(token, range);
            if (!result.success) {
                setError(result.error.message);
                setLoading(false);
                return;
            }

            setAnalytics(result.data);
            setLoading(false);
        }

        loadAnalytics();
    }, [range, token]);

    const maxRevenue = Math.max(...(analytics?.byDay.map((day) => day.revenue) || [1]));

    if (loading) {
        return <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center text-slate-500 shadow-sm">Đang tải thống kê...</div>;
    }

    if (error || !analytics) {
        return <div className="rounded-2xl border border-rose-200 bg-rose-50 p-5 text-rose-700 shadow-sm">{error || 'Không thể tải thống kê'}</div>;
    }

    return (
        <div className="space-y-6">
            <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                    <div>
                        <h1 className="text-2xl font-semibold text-slate-900">Thống kê manager</h1>
                        <p className="mt-2 text-sm text-slate-500">
                            Theo dõi doanh thu, số booking và mức sử dụng sân theo từng giai đoạn.
                        </p>
                    </div>

                    <div className="flex rounded-xl bg-slate-100 p-1">
                        {(['day', 'week', 'month'] as Range[]).map((item) => (
                            <button
                                key={item}
                                type="button"
                                onClick={() => setRange(item)}
                                className={`rounded-lg px-4 py-2 text-sm font-medium transition ${
                                    range === item ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'
                                }`}
                            >
                                {item === 'day' && 'Hôm nay'}
                                {item === 'week' && 'Tuần'}
                                {item === 'month' && 'Tháng'}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="mt-4 flex flex-wrap items-center gap-3 text-sm text-slate-600">
                    <span className="inline-flex items-center gap-2">
                        <CalendarRange className="h-4 w-4" />
                        {analytics.period.label}: {analytics.period.startDate} đến {analytics.period.endDate}
                    </span>
                    <span className="inline-flex items-center gap-2">
                        <Clock3 className="h-4 w-4" />
                        {analytics.summary.utilizedHours} giờ sân đã sử dụng
                    </span>
                </div>
            </section>

            <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                    <p className="text-sm text-slate-500">Doanh thu</p>
                    <p className="mt-3 text-3xl font-semibold text-slate-900">{formatPrice(analytics.summary.totalRevenue)}đ</p>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                    <p className="text-sm text-slate-500">Booking</p>
                    <p className="mt-3 text-3xl font-semibold text-slate-900">{analytics.summary.totalBookings}</p>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                    <p className="text-sm text-slate-500">Đơn xác nhận</p>
                    <p className="mt-3 text-3xl font-semibold text-emerald-700">{analytics.summary.confirmed + analytics.summary.completed}</p>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                    <p className="text-sm text-slate-500">Giá trị booking TB</p>
                    <p className="mt-3 text-3xl font-semibold text-slate-900">{formatPrice(analytics.summary.averageBookingValue)}đ</p>
                </div>
            </section>

            <section className="grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
                <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                    <div className="mb-5 flex items-center gap-2">
                        <TrendingUp className="h-5 w-5 text-slate-600" />
                        <h2 className="text-lg font-semibold text-slate-900">Doanh thu theo ngày</h2>
                    </div>
                    <div className="space-y-4">
                        {analytics.byDay.length === 0 && (
                            <p className="rounded-xl bg-slate-50 px-4 py-3 text-sm text-slate-500">Chưa có dữ liệu trong giai đoạn này.</p>
                        )}
                        {analytics.byDay.map((day) => (
                            <div key={day.date} className="space-y-2">
                                <div className="flex items-center justify-between text-sm">
                                    <span className="font-medium text-slate-700">{day.label}</span>
                                    <span className="text-slate-500">
                                        {day.bookingCount} booking • {formatPrice(day.revenue)}đ
                                    </span>
                                </div>
                                <div className="h-3 rounded-full bg-slate-100">
                                    <div
                                        className="h-3 rounded-full bg-slate-900"
                                        style={{ width: `${Math.max(8, (day.revenue / maxRevenue) * 100)}%` }}
                                    />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                    <div className="mb-5 flex items-center gap-2">
                        <BarChart3 className="h-5 w-5 text-slate-600" />
                        <h2 className="text-lg font-semibold text-slate-900">Hiệu suất theo sân</h2>
                    </div>
                    <div className="space-y-3">
                        {analytics.byCourt.map((court) => (
                            <div key={court.courtId} className="rounded-xl border border-slate-200 p-4">
                                <div className="flex items-center justify-between gap-3">
                                    <div>
                                        <p className="font-medium text-slate-900">{court.courtName}</p>
                                        <p className="text-sm text-slate-500">{court.sportTypeName}</p>
                                    </div>
                                    <span className="text-sm font-semibold text-slate-900">{formatPrice(court.revenue)}đ</span>
                                </div>
                                <div className="mt-3 grid grid-cols-3 gap-3 text-sm text-slate-600">
                                    <div>
                                        <p className="text-slate-500">Booking</p>
                                        <p className="mt-1 font-medium text-slate-900">{court.bookingCount}</p>
                                    </div>
                                    <div>
                                        <p className="text-slate-500">Đã chốt</p>
                                        <p className="mt-1 font-medium text-slate-900">{court.confirmedCount}</p>
                                    </div>
                                    <div>
                                        <p className="text-slate-500">Giờ sử dụng</p>
                                        <p className="mt-1 font-medium text-slate-900">{court.utilizedHours}</p>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <h2 className="text-lg font-semibold text-slate-900">Booking gần nhất</h2>
                <div className="mt-5 overflow-x-auto">
                    <table className="min-w-full divide-y divide-slate-200 text-sm">
                        <thead>
                            <tr className="text-left text-slate-500">
                                <th className="pb-3 pr-4 font-medium">Ngày giờ</th>
                                <th className="pb-3 pr-4 font-medium">Sân</th>
                                <th className="pb-3 pr-4 font-medium">Khách</th>
                                <th className="pb-3 pr-4 font-medium">Thanh toán</th>
                                <th className="pb-3 pr-4 font-medium">Trạng thái</th>
                                <th className="pb-3 font-medium text-right">Giá trị</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {analytics.recentBookings.map((booking) => (
                                <tr key={booking.bookingId}>
                                    <td className="py-3 pr-4 text-slate-600">
                                        <p>{booking.date}</p>
                                        <p className="text-xs text-slate-400">
                                            {booking.startTime} - {booking.endTime}
                                        </p>
                                    </td>
                                    <td className="py-3 pr-4">
                                        <p className="font-medium text-slate-900">{booking.courtName}</p>
                                    </td>
                                    <td className="py-3 pr-4 text-slate-600">{booking.userName}</td>
                                    <td className="py-3 pr-4 text-slate-600">{booking.paymentMethod || 'Chưa chọn'}</td>
                                    <td className="py-3 pr-4">
                                        <Badge variant={statusVariant[booking.status] || 'default'}>{booking.status}</Badge>
                                    </td>
                                    <td className="py-3 text-right font-medium text-slate-900">
                                        {formatPrice(booking.totalPrice)}đ
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </section>
        </div>
    );
}
