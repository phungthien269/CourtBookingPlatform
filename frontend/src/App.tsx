import { Suspense, lazy } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './contexts/AuthContext';
import { ToastContainer } from './components/ui/Toast';
import { RequireManagerVenue } from './components/manager/RequireManagerVenue';

// Layouts
import { PublicLayout, AuthLayout, UserLayout, ManagerLayout, AdminLayout } from './components/layouts';

const Home = lazy(() => import('./pages/Home').then((module) => ({ default: module.Home })));
const VenueDetail = lazy(() => import('./pages/venue/VenueDetail').then((module) => ({ default: module.VenueDetail })));
const Login = lazy(() => import('./pages/auth/Login').then((module) => ({ default: module.Login })));
const Register = lazy(() => import('./pages/auth/Register').then((module) => ({ default: module.Register })));
const VerifyOtp = lazy(() => import('./pages/auth/VerifyOtp').then((module) => ({ default: module.VerifyOtp })));
const ForgotPassword = lazy(() => import('./pages/auth/ForgotPassword').then((module) => ({ default: module.ForgotPassword })));
const ResetPassword = lazy(() => import('./pages/auth/ResetPassword').then((module) => ({ default: module.ResetPassword })));
const MyBookings = lazy(() => import('./pages/user/MyBookings').then((module) => ({ default: module.MyBookings })));
const BookingDetail = lazy(() => import('./pages/user/BookingDetail').then((module) => ({ default: module.BookingDetail })));
const Chat = lazy(() => import('./pages/user/Chat').then((module) => ({ default: module.Chat })));
const ManagerDashboard = lazy(() => import('./pages/manager/Dashboard').then((module) => ({ default: module.ManagerDashboard })));
const AdminDashboard = lazy(() => import('./pages/admin/Dashboard').then((module) => ({ default: module.AdminDashboard })));
const AdminManagers = lazy(() => import('./pages/admin/Managers').then((module) => ({ default: module.AdminManagers })));
const AdminApprovals = lazy(() => import('./pages/admin/Approvals').then((module) => ({ default: module.AdminApprovals })));
const AdminAuditLogs = lazy(() => import('./pages/admin/AuditLogs').then((module) => ({ default: module.AdminAuditLogs })));
const AdminPaymentReconciliation = lazy(() =>
    import('./pages/admin/PaymentReconciliation').then((module) => ({ default: module.AdminPaymentReconciliation }))
);
const CourtLayoutPage = lazy(() => import('./pages/booking/CourtLayoutPage'));
const TimeSlotPage = lazy(() => import('./pages/booking/TimeSlotPage'));
const BookingSummaryPage = lazy(() => import('./pages/booking/BookingSummaryPage'));
const PaymentPage = lazy(() => import('./pages/booking/PaymentPage'));
const ManagerBookingsPage = lazy(() => import('./pages/manager/ManagerBookingsPage'));
const ManagerCourtsPage = lazy(() => import('./pages/manager/ManagerCourtsPage'));
const ManagerSchedulePage = lazy(() => import('./pages/manager/ManagerSchedulePage'));
const ManagerAnalyticsPage = lazy(() => import('./pages/manager/ManagerAnalyticsPage'));
const ManagerSubscriptionPage = lazy(() => import('./pages/manager/ManagerSubscriptionPage'));
const ManagerChatInbox = lazy(() => import('./pages/manager/ManagerChatInbox'));
const ManagerChatThread = lazy(() => import('./pages/manager/ManagerChatThread'));
const Notifications = lazy(() => import('./pages/Notifications'));

function PageLoadingFallback() {
    return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50 text-slate-500">
            Đang tải trang...
        </div>
    );
}

// Route guards
function RequireAuth({ children }: { children: React.ReactNode }) {
    const { user, isLoading } = useAuth();

    if (isLoading) {
        return <PageLoadingFallback />;
    }

    if (!user) {
        return <Navigate to="/auth/login" replace />;
    }

    return <>{children}</>;
}

function RequireRole({ role, children }: { role: string; children: React.ReactNode }) {
    const { user } = useAuth();

    if (user?.role !== role) {
        if (user?.role === 'ADMIN') return <Navigate to="/admin" replace />;
        if (user?.role === 'MANAGER') return <Navigate to="/manager" replace />;
        return <Navigate to="/me/bookings" replace />;
    }

    return <>{children}</>;
}

function RedirectIfAuth({ children }: { children: React.ReactNode }) {
    const { user, isLoading } = useAuth();

    if (isLoading) {
        return <PageLoadingFallback />;
    }

    if (user) {
        if (user.role === 'ADMIN') return <Navigate to="/admin" replace />;
        if (user.role === 'MANAGER') return <Navigate to="/manager" replace />;
        return <Navigate to="/me/bookings" replace />;
    }

    return <>{children}</>;
}

export default function App() {
    return (
        <>
            <Suspense fallback={<PageLoadingFallback />}>
                <Routes>
                    <Route element={<PublicLayout />}>
                        <Route path="/" element={<Home />} />
                        <Route path="/venues/:id" element={<VenueDetail />} />
                    </Route>

                    <Route
                        path="/venues/:id/book"
                        element={
                            <RequireAuth>
                                <CourtLayoutPage />
                            </RequireAuth>
                        }
                    />
                    <Route
                        path="/venues/:id/book/:courtId"
                        element={
                            <RequireAuth>
                                <TimeSlotPage />
                            </RequireAuth>
                        }
                    />
                    <Route
                        path="/venues/:id/book/:courtId/summary"
                        element={
                            <RequireAuth>
                                <BookingSummaryPage />
                            </RequireAuth>
                        }
                    />

                    <Route
                        path="/payment/:bookingId"
                        element={
                            <RequireAuth>
                                <PaymentPage />
                            </RequireAuth>
                        }
                    />

                    <Route
                        element={
                            <RedirectIfAuth>
                                <AuthLayout />
                            </RedirectIfAuth>
                        }
                    >
                        <Route path="/auth/login" element={<Login />} />
                        <Route path="/auth/register" element={<Register />} />
                        <Route path="/auth/verify-otp" element={<VerifyOtp />} />
                        <Route path="/auth/forgot-password" element={<ForgotPassword />} />
                        <Route path="/auth/reset-password" element={<ResetPassword />} />
                    </Route>

                    <Route
                        element={
                            <RequireAuth>
                                <RequireRole role="USER">
                                    <UserLayout />
                                </RequireRole>
                            </RequireAuth>
                        }
                    >
                        <Route path="/me/bookings" element={<MyBookings />} />
                        <Route path="/me/bookings/:id" element={<BookingDetail />} />
                        <Route path="/me/chat/:bookingId" element={<Chat />} />
                        <Route path="/notifications" element={<Notifications />} />
                    </Route>

                    <Route
                        element={
                            <RequireAuth>
                                <RequireRole role="MANAGER">
                                    <ManagerLayout />
                                </RequireRole>
                            </RequireAuth>
                        }
                    >
                        <Route path="/manager" element={<ManagerDashboard />} />
                        <Route path="/manager/subscription" element={<ManagerSubscriptionPage />} />
                        <Route path="/manager/notifications" element={<Notifications />} />
                        <Route element={<RequireManagerVenue />}>
                            <Route path="/manager/bookings" element={<ManagerBookingsPage />} />
                            <Route path="/manager/courts" element={<ManagerCourtsPage />} />
                            <Route path="/manager/schedule" element={<ManagerSchedulePage />} />
                            <Route path="/manager/analytics" element={<ManagerAnalyticsPage />} />
                            <Route path="/manager/chat" element={<ManagerChatInbox />} />
                            <Route path="/manager/chat/:threadId" element={<ManagerChatThread />} />
                        </Route>
                    </Route>

                    <Route
                        element={
                            <RequireAuth>
                                <RequireRole role="ADMIN">
                                    <AdminLayout />
                                </RequireRole>
                            </RequireAuth>
                        }
                    >
                        <Route path="/admin" element={<AdminDashboard />} />
                        <Route path="/admin/managers" element={<AdminManagers />} />
                        <Route path="/admin/approvals" element={<AdminApprovals />} />
                        <Route path="/admin/payment-reconciliation" element={<AdminPaymentReconciliation />} />
                        <Route path="/admin/logs" element={<AdminAuditLogs />} />
                    </Route>

                    <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
            </Suspense>

            <ToastContainer />
        </>
    );
}
