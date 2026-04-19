import { Navigate, Outlet, useLocation, useOutletContext } from 'react-router-dom';
import { AlertCircle } from 'lucide-react';
import type { ManagerLayoutOutletContext } from '../layouts/ManagerLayout';

export function RequireManagerVenue() {
    const { context, isContextLoading } = useOutletContext<ManagerLayoutOutletContext>();
    const location = useLocation();

    if (isContextLoading) {
        return (
            <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center text-slate-500 shadow-sm">
                Đang tải workspace manager...
            </div>
        );
    }

    if (!context) {
        return (
            <div className="rounded-2xl border border-rose-200 bg-rose-50 p-5 text-rose-700 shadow-sm">
                Không thể tải thông tin manager workspace.
            </div>
        );
    }

    if (!context.hasVenue) {
        return (
            <Navigate
                to="/manager"
                replace
                state={{
                    blockedReason: 'MANAGER_VENUE_REQUIRED',
                    from: location.pathname,
                }}
            />
        );
    }

    if (location.pathname === '/manager') {
        return (
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="flex items-start gap-3">
                    <AlertCircle className="mt-0.5 h-5 w-5 text-slate-500" />
                    <div>
                        <h2 className="text-lg font-semibold text-slate-900">Venue đã sẵn sàng</h2>
                        <p className="mt-1 text-sm text-slate-600">
                            Workspace manager đã có venue. Bạn có thể truy cập các trang vận hành từ sidebar.
                        </p>
                    </div>
                </div>
            </div>
        );
    }

    return <Outlet />;
}
