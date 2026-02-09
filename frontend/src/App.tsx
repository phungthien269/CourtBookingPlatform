import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './contexts/AuthContext';
import { ToastContainer } from './components/ui/Toast';

// Layouts
import { PublicLayout, AuthLayout, UserLayout, ManagerLayout, AdminLayout } from './components/layouts';

// Pages
import { Home } from './pages/Home';
import { VenueDetail } from './pages/venue/VenueDetail';
import { Login } from './pages/auth/Login';
import { Register } from './pages/auth/Register';
import { VerifyOtp } from './pages/auth/VerifyOtp';
import { MyBookings } from './pages/user/MyBookings';
import { BookingDetail } from './pages/user/BookingDetail';
import { Chat } from './pages/user/Chat';
import { ManagerDashboard } from './pages/manager/Dashboard';
import { AdminDashboard } from './pages/admin/Dashboard';
import { AdminManagers } from './pages/admin/Managers';
import { AdminApprovals } from './pages/admin/Approvals';
import { AdminAuditLogs } from './pages/admin/AuditLogs';
import { PlaceholderPage } from './pages/PlaceholderPage';

// Phase 2: Booking pages
import CourtLayoutPage from './pages/booking/CourtLayoutPage';
import TimeSlotPage from './pages/booking/TimeSlotPage';
import BookingSummaryPage from './pages/booking/BookingSummaryPage';

// Phase 3: Payment page
import PaymentPage from './pages/booking/PaymentPage';

// Phase 4: Manager bookings page
import ManagerBookingsPage from './pages/manager/ManagerBookingsPage';

// Phase 5: Manager chat pages
import ManagerChatInbox from './pages/manager/ManagerChatInbox';
import ManagerChatThread from './pages/manager/ManagerChatThread';

// Phase 6: Notifications page
import Notifications from './pages/Notifications';

// Route guards
function RequireAuth({ children }: { children: React.ReactNode }) {
    const { user, isLoading } = useAuth();

    if (isLoading) {
        return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
    }

    if (!user) {
        return <Navigate to="/auth/login" replace />;
    }

    return <>{children}</>;
}

function RequireRole({ role, children }: { role: string; children: React.ReactNode }) {
    const { user } = useAuth();

    if (user?.role !== role) {
        // Redirect to correct dashboard
        if (user?.role === 'ADMIN') return <Navigate to="/admin" replace />;
        if (user?.role === 'MANAGER') return <Navigate to="/manager" replace />;
        return <Navigate to="/me/bookings" replace />;
    }

    return <>{children}</>;
}

function RedirectIfAuth({ children }: { children: React.ReactNode }) {
    const { user, isLoading } = useAuth();

    if (isLoading) {
        return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
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
            <Routes>
                {/* Public routes */}
                <Route element={<PublicLayout />}>
                    <Route path="/" element={<Home />} />
                    <Route path="/venues/:id" element={<VenueDetail />} />
                </Route>

                {/* Phase 2: Booking flow routes (auth required, any role) */}
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

                {/* Phase 3: Payment page */}
                <Route
                    path="/payment/:bookingId"
                    element={
                        <RequireAuth>
                            <PaymentPage />
                        </RequireAuth>
                    }
                />

                {/* Auth routes */}
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
                </Route>

                {/* User routes */}
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

                {/* Manager routes */}
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
                    <Route path="/manager/bookings" element={<ManagerBookingsPage />} />
                    <Route path="/manager/courts" element={<PlaceholderPage title="Quản lý sân" />} />
                    <Route path="/manager/schedule" element={<PlaceholderPage title="Lịch hoạt động" />} />
                    <Route path="/manager/analytics" element={<PlaceholderPage title="Thống kê" />} />
                    <Route path="/manager/subscription" element={<PlaceholderPage title="Gia hạn" />} />
                    <Route path="/manager/chat" element={<ManagerChatInbox />} />
                    <Route path="/manager/chat/:threadId" element={<ManagerChatThread />} />
                    <Route path="/manager/notifications" element={<Notifications />} />
                </Route>

                {/* Admin routes */}
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
                    <Route path="/admin/logs" element={<AdminAuditLogs />} />
                </Route>

                {/* Fallback */}
                <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>

            <ToastContainer />
        </>
    );
}
