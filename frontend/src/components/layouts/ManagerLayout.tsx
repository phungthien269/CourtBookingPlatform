import { Outlet, Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { ConnectionStatus } from '../ConnectionStatus';
import NotificationBell from '../NotificationBell';

const sidebarItems = [
    { path: '/manager', label: 'Dashboard', icon: '📊' },
    { path: '/manager/courts', label: 'Quản lý sân', icon: '🏸' },
    { path: '/manager/schedule', label: 'Lịch hoạt động', icon: '📅' },
    { path: '/manager/analytics', label: 'Thống kê', icon: '📈' },
    { path: '/manager/subscription', label: 'Gia hạn', icon: '💳' },
];

export function ManagerLayout() {
    const { user, logout } = useAuth();
    const location = useLocation();

    return (
        <div className="min-h-screen bg-gray-50 flex">
            {/* Sidebar */}
            <aside className="w-64 bg-white border-r fixed left-0 top-0 bottom-0 z-40">
                {/* Logo */}
                <div className="h-16 flex items-center px-6 border-b">
                    <Link to="/manager" className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                            <span className="text-white font-bold">C</span>
                        </div>
                        <span className="font-heading font-semibold">Manager</span>
                    </Link>
                </div>

                {/* Nav items */}
                <nav className="p-4 space-y-1">
                    {sidebarItems.map((item) => (
                        <Link
                            key={item.path}
                            to={item.path}
                            className={`flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${location.pathname === item.path
                                ? 'bg-primary-light text-primary'
                                : 'text-gray-600 hover:bg-gray-100'
                                }`}
                        >
                            <span>{item.icon}</span>
                            {item.label}
                        </Link>
                    ))}
                </nav>
            </aside>

            {/* Main area */}
            <div className="flex-1 ml-64">
                {/* Top bar */}
                <header className="h-16 bg-white border-b flex items-center justify-between px-6 sticky top-0 z-30">
                    <h1 className="font-heading font-semibold">Sân cầu lông Phú Nhuận</h1>
                    <div className="flex items-center gap-4">
                        <NotificationBell />
                        <span className="text-sm text-gray-600">{user?.name || user?.email}</span>
                        <button
                            onClick={logout}
                            className="text-sm text-gray-500 hover:text-gray-700"
                        >
                            Đăng xuất
                        </button>
                    </div>
                </header>

                {/* Content */}
                <main className="p-6">
                    <Outlet />
                </main>
            </div>

            <ConnectionStatus />
        </div>
    );
}
