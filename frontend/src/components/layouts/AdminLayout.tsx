import { Outlet, Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { ConnectionStatus } from '../ConnectionStatus';

const sidebarItems = [
    { path: '/admin', label: 'Dashboard', icon: '📊' },
    { path: '/admin/managers', label: 'Quản lý Manager', icon: '👥' },
    { path: '/admin/approvals', label: 'Duyệt sân', icon: '✅' },
    { path: '/admin/logs', label: 'Nhật ký hệ thống', icon: '📋' },
];

export function AdminLayout() {
    const { user, logout } = useAuth();
    const location = useLocation();

    return (
        <div className="min-h-screen bg-slate-900 flex">
            {/* Sidebar */}
            <aside className="w-64 bg-slate-800 fixed left-0 top-0 bottom-0 z-40">
                {/* Logo */}
                <div className="h-16 flex items-center px-6 border-b border-slate-700">
                    <Link to="/admin" className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                            <span className="text-white font-bold">C</span>
                        </div>
                        <span className="font-heading font-semibold text-white">Admin</span>
                    </Link>
                </div>

                {/* Nav items */}
                <nav className="p-4 space-y-1">
                    {sidebarItems.map((item) => (
                        <Link
                            key={item.path}
                            to={item.path}
                            className={`flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${location.pathname === item.path
                                    ? 'bg-primary text-white'
                                    : 'text-slate-300 hover:bg-slate-700'
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
                <header className="h-16 bg-slate-800 border-b border-slate-700 flex items-center justify-between px-6 sticky top-0 z-30">
                    <h1 className="font-heading font-semibold text-white">Admin Panel</h1>
                    <div className="flex items-center gap-4">
                        <button className="relative p-2 text-slate-300 hover:bg-slate-700 rounded-lg">
                            🔔
                        </button>
                        <span className="text-sm text-slate-300">{user?.name || user?.email}</span>
                        <button
                            onClick={logout}
                            className="text-sm text-slate-400 hover:text-white"
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
