import { useEffect, useState } from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { ConnectionStatus } from '../ConnectionStatus';
import NotificationBell from '../NotificationBell';
import { getManagerContext, ManagerContext } from '../../api/manager';
import { Badge } from '../ui/Badge';

const sidebarItems = [
    { path: '/manager', label: 'Dashboard', icon: '📊' },
    { path: '/manager/bookings', label: 'Booking', icon: '🧾' },
    { path: '/manager/courts', label: 'Quản lý sân', icon: '🏸' },
    { path: '/manager/schedule', label: 'Lịch hoạt động', icon: '📅' },
    { path: '/manager/analytics', label: 'Thống kê', icon: '📈' },
    { path: '/manager/subscription', label: 'Gia hạn', icon: '💳' },
    { path: '/manager/chat', label: 'Chat khách hàng', icon: '💬' },
    { path: '/manager/notifications', label: 'Thông báo', icon: '🔔' },
];

function getSubscriptionVariant(status: ManagerContext['subscription']['status']) {
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

export function ManagerLayout() {
    const { user, token, logout } = useAuth();
    const location = useLocation();
    const [context, setContext] = useState<ManagerContext | null>(null);

    useEffect(() => {
        async function loadContext() {
            if (!token) return;

            const result = await getManagerContext(token);
            if (result.success) {
                setContext(result.data);
            }
        }

        loadContext();
    }, [token]);

    return (
        <div className="min-h-screen bg-slate-50 flex">
            <aside className="fixed left-0 top-0 bottom-0 z-40 w-72 border-r border-slate-200 bg-white">
                <div className="border-b border-slate-200 px-6 py-5">
                    <Link to="/manager" className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-900 text-white">
                            C
                        </div>
                        <div>
                            <p className="text-xs uppercase tracking-[0.18em] text-slate-400">CourtBooking</p>
                            <p className="font-semibold text-slate-900">Manager Portal</p>
                        </div>
                    </Link>
                </div>

                <div className="border-b border-slate-200 px-6 py-5">
                    <p className="text-sm font-medium text-slate-900">
                        {context?.venue.name || context?.manager.displayName || 'Đang tải venue...'}
                    </p>
                    <p className="mt-1 text-sm text-slate-500">
                        {context?.venue.address || user?.email}
                    </p>
                    {context && (
                        <div className="mt-3 flex flex-wrap gap-2">
                            <Badge variant={getSubscriptionVariant(context.subscription.status)}>
                                {context.subscription.status === 'ACTIVE' && 'Đang hoạt động'}
                                {context.subscription.status === 'EXPIRING_SOON' && 'Sắp hết hạn'}
                                {context.subscription.status === 'EXPIRED' && 'Đã hết hạn'}
                                {context.subscription.status === 'UNSET' && 'Chưa có gói'}
                            </Badge>
                            <Badge variant="info">
                                {context.venue.activeCourtCount}/{context.venue.totalCourtCount} sân active
                            </Badge>
                        </div>
                    )}
                </div>

                <nav className="space-y-1 p-4">
                    {sidebarItems.map((item) => {
                        const isActive =
                            item.path === '/manager'
                                ? location.pathname === item.path
                                : location.pathname.startsWith(item.path);

                        return (
                            <Link
                                key={item.path}
                                to={item.path}
                                className={`flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-colors ${
                                    isActive
                                        ? 'bg-slate-900 text-white'
                                        : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                                }`}
                            >
                                <span>{item.icon}</span>
                                {item.label}
                            </Link>
                        );
                    })}
                </nav>
            </aside>

            <div className="ml-72 flex-1">
                <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-slate-200 bg-white px-6">
                    <div>
                        <p className="text-sm font-medium text-slate-900">
                            {context?.manager.displayName || user?.name || user?.email}
                        </p>
                        <p className="text-xs text-slate-500">
                            {context?.subscription.daysRemaining !== null && context?.subscription.daysRemaining !== undefined
                                ? `Còn ${context.subscription.daysRemaining} ngày gia hạn`
                                : 'Đang tải thông tin subscription'}
                        </p>
                    </div>

                    <div className="flex items-center gap-4">
                        <NotificationBell />
                        <span className="text-sm text-slate-600">{user?.email}</span>
                        <button
                            onClick={logout}
                            className="text-sm font-medium text-slate-500 transition hover:text-slate-900"
                        >
                            Đăng xuất
                        </button>
                    </div>
                </header>

                <main className="p-6">
                    <Outlet />
                </main>
            </div>

            <ConnectionStatus />
        </div>
    );
}
