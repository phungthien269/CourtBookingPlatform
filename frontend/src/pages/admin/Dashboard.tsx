import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertCircle, CalendarClock, CircleDollarSign, ShieldCheck, Store, Users } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { AdminOverview, getAdminOverview } from '../../api/admin';
import { formatPrice } from '../../api/booking';
import { Badge } from '../../components/ui/Badge';

function formatDateTime(value: string | null) {
    if (!value) return 'Chưa có';

    return new Intl.DateTimeFormat('vi-VN', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    }).format(new Date(value));
}

export function AdminDashboard() {
    const { token } = useAuth();
    const [data, setData] = useState<AdminOverview | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        async function loadOverview() {
            if (!token) return;

            setLoading(true);
            setError(null);

            const result = await getAdminOverview(token);
            if (!result.success) {
                setError(result.error.message);
                setLoading(false);
                return;
            }

            setData(result.data);
            setLoading(false);
        }

        loadOverview();
    }, [token]);

    if (loading) {
        return <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center text-slate-500 shadow-sm">Đang tải dashboard admin...</div>;
    }

    if (error || !data) {
        return <div className="rounded-2xl border border-rose-200 bg-rose-50 p-5 text-rose-700 shadow-sm">{error || 'Không thể tải dashboard admin'}</div>;
    }

    const stats = [
        {
            label: 'Tổng manager',
            value: data.stats.totalManagers,
            icon: Users,
            tone: 'text-slate-900',
        },
        {
            label: 'Tổng user',
            value: data.stats.totalUsers,
            icon: ShieldCheck,
            tone: 'text-slate-900',
        },
        {
            label: 'Venue đang active',
            value: data.stats.activeVenues,
            icon: Store,
            tone: 'text-slate-900',
        },
        {
            label: 'Booking hôm nay',
            value: data.stats.bookingsToday,
            icon: CalendarClock,
            tone: 'text-slate-900',
        },
        {
            label: 'Yêu cầu gia hạn chờ duyệt',
            value: data.stats.pendingRenewals,
            icon: AlertCircle,
            tone: data.stats.pendingRenewals > 0 ? 'text-amber-600' : 'text-slate-900',
        },
        {
            label: 'Manager đã hết hạn',
            value: data.stats.expiredSubscriptions,
            icon: CircleDollarSign,
            tone: data.stats.expiredSubscriptions > 0 ? 'text-rose-600' : 'text-slate-900',
        },
    ];

    return (
        <div className="space-y-6">
            <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                    <div>
                        <h1 className="text-2xl font-semibold text-slate-900">Admin dashboard</h1>
                        <p className="mt-2 text-sm text-slate-500">
                            Theo dõi trạng thái manager, renewal queue và số venue đang hoạt động trên marketplace.
                        </p>
                    </div>

                    <div className="flex flex-wrap gap-3">
                        <Link
                            to="/admin/approvals"
                            className="inline-flex items-center rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-700"
                        >
                            Mở hàng chờ duyệt
                        </Link>
                        <Link
                            to="/admin/managers"
                            className="inline-flex items-center rounded-xl border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                        >
                            Quản lý manager
                        </Link>
                    </div>
                </div>
            </section>

            <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {stats.map((stat) => {
                    const Icon = stat.icon;

                    return (
                        <div key={stat.label} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                            <div className="flex items-start justify-between gap-3">
                                <div>
                                    <p className="text-sm text-slate-500">{stat.label}</p>
                                    <p className={`mt-3 text-3xl font-semibold ${stat.tone}`}>{stat.value}</p>
                                </div>
                                <div className="rounded-xl bg-slate-100 p-3 text-slate-700">
                                    <Icon className="h-5 w-5" />
                                </div>
                            </div>
                        </div>
                    );
                })}
            </section>

            <section className="grid gap-6 xl:grid-cols-[minmax(0,1.25fr)_minmax(320px,0.75fr)]">
                <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                    <div className="flex items-center justify-between gap-3">
                        <div>
                            <h2 className="text-lg font-semibold text-slate-900">Yêu cầu gia hạn gần nhất</h2>
                            <p className="mt-1 text-sm text-slate-500">Dữ liệu lấy trực tiếp từ audit log renewal request.</p>
                        </div>
                        <Link to="/admin/approvals" className="text-sm font-medium text-slate-900 underline-offset-4 hover:underline">
                            Xem tất cả
                        </Link>
                    </div>

                    <div className="mt-5 overflow-x-auto">
                        <table className="min-w-full divide-y divide-slate-200 text-sm">
                            <thead>
                                <tr className="text-left text-slate-500">
                                    <th className="pb-3 pr-4 font-medium">Venue</th>
                                    <th className="pb-3 pr-4 font-medium">Manager</th>
                                    <th className="pb-3 pr-4 font-medium">Gói</th>
                                    <th className="pb-3 pr-4 font-medium">Hết hạn</th>
                                    <th className="pb-3 font-medium">Trạng thái</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {data.recentRenewalRequests.length === 0 && (
                                    <tr>
                                        <td colSpan={5} className="py-6 text-center text-slate-500">
                                            Chưa có yêu cầu gia hạn nào.
                                        </td>
                                    </tr>
                                )}

                                {data.recentRenewalRequests.map((request) => (
                                    <tr key={request.id}>
                                        <td className="py-3 pr-4">
                                            <p className="font-medium text-slate-900">{request.venueName}</p>
                                            <p className="text-xs text-slate-500">{request.venueDistrict}</p>
                                        </td>
                                        <td className="py-3 pr-4">
                                            <p className="font-medium text-slate-900">{request.managerName}</p>
                                            <p className="text-xs text-slate-500">{request.managerEmail}</p>
                                        </td>
                                        <td className="py-3 pr-4 text-slate-600">
                                            {request.months} tháng • {request.courtCount} sân
                                            <p className="text-xs text-slate-500">{formatPrice(request.amount)}đ</p>
                                        </td>
                                        <td className="py-3 pr-4 text-slate-600">
                                            {formatDateTime(request.currentExpiresAt)}
                                        </td>
                                        <td className="py-3">
                                            <Badge variant={request.status === 'PENDING_REVIEW' ? 'warning' : request.status === 'APPROVED' ? 'success' : 'error'}>
                                                {request.status === 'PENDING_REVIEW' && 'Chờ duyệt'}
                                                {request.status === 'APPROVED' && 'Đã duyệt'}
                                                {request.status === 'REJECTED' && 'Từ chối'}
                                            </Badge>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                <aside className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                    <h2 className="text-lg font-semibold text-slate-900">Điểm cần xử lý ngay</h2>

                    <div className="mt-5 space-y-4">
                        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
                            <p className="text-sm font-medium text-amber-900">Renewal queue</p>
                            <p className="mt-2 text-3xl font-semibold text-amber-700">{data.stats.pendingRenewals}</p>
                            <p className="mt-2 text-sm text-amber-800">
                                Yêu cầu đang chờ admin xác nhận thanh toán và cộng dồn ngày gia hạn.
                            </p>
                        </div>

                        <div className="rounded-xl border border-rose-200 bg-rose-50 p-4">
                            <p className="text-sm font-medium text-rose-900">Manager hết hạn</p>
                            <p className="mt-2 text-3xl font-semibold text-rose-700">{data.stats.expiredSubscriptions}</p>
                            <p className="mt-2 text-sm text-rose-800">
                                Những venue này sẽ bị ẩn khỏi map cho tới khi renewal request được duyệt.
                            </p>
                        </div>
                    </div>
                </aside>
            </section>
        </div>
    );
}
