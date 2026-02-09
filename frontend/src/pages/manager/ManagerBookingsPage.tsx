/**
 * ManagerBookingsPage - Phase 4
 * Route: /manager/bookings
 * Shows manager's venue bookings with confirm/cancel actions
 */

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { getManagerBookings, confirmBooking, cancelBooking, ManagerBookingItem } from '../../api/manager';
import { formatPrice, getTodayDate } from '../../api/booking';
import { Clock, Calendar, User, Check, X, Loader2, AlertCircle, RefreshCw, Banknote, QrCode } from 'lucide-react';
import { Button } from '../../components/ui/Button';

type StatusFilter = 'ALL' | 'WAITING_MANAGER_CONFIRM' | 'CONFIRMED' | 'CANCELLED_BY_MANAGER';

const STATUS_LABELS: Record<string, string> = {
    PENDING_PAYMENT: 'Chờ thanh toán',
    WAITING_MANAGER_CONFIRM: 'Chờ xác nhận',
    CONFIRMED: 'Đã xác nhận',
    CANCELLED_BY_MANAGER: 'Đã hủy',
    CANCELLED_BY_USER: 'Khách hủy',
    EXPIRED: 'Hết hạn',
    COMPLETED: 'Hoàn thành',
};

const STATUS_COLORS: Record<string, string> = {
    PENDING_PAYMENT: 'bg-yellow-100 text-yellow-800',
    WAITING_MANAGER_CONFIRM: 'bg-blue-100 text-blue-800',
    CONFIRMED: 'bg-green-100 text-green-800',
    CANCELLED_BY_MANAGER: 'bg-red-100 text-red-800',
    CANCELLED_BY_USER: 'bg-gray-100 text-gray-800',
    EXPIRED: 'bg-gray-100 text-gray-600',
    COMPLETED: 'bg-green-100 text-green-800',
};

export default function ManagerBookingsPage() {
    const { token } = useAuth();

    const [bookings, setBookings] = useState<ManagerBookingItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [statusFilter, setStatusFilter] = useState<StatusFilter>('WAITING_MANAGER_CONFIRM');
    const [dateFilter, setDateFilter] = useState<string>(getTodayDate());
    const [actionLoading, setActionLoading] = useState<string | null>(null);
    const [cancelModal, setCancelModal] = useState<{ bookingId: string; reason: string } | null>(null);

    // Fetch bookings
    const fetchBookings = useCallback(async () => {
        if (!token) return;

        setLoading(true);
        setError(null);

        const filters: { date?: string; status?: string } = {};
        if (dateFilter) filters.date = dateFilter;
        if (statusFilter !== 'ALL') filters.status = statusFilter;

        const result = await getManagerBookings(token, filters);

        if (!result.success) {
            setError(result.error?.message || 'Không thể tải danh sách booking');
            setLoading(false);
            return;
        }

        setBookings(result.data);
        setLoading(false);
    }, [token, statusFilter, dateFilter]);

    useEffect(() => {
        fetchBookings();
    }, [fetchBookings]);

    // Handle confirm
    const handleConfirm = async (bookingId: string) => {
        if (!token) return;

        setActionLoading(bookingId);
        const result = await confirmBooking(bookingId, token);
        setActionLoading(null);

        if (!result.success) {
            alert(result.error?.message || 'Có lỗi xảy ra');
            return;
        }

        // Refresh bookings
        fetchBookings();
    };

    // Handle cancel
    const handleCancel = async () => {
        if (!cancelModal || !token) return;

        if (cancelModal.reason.trim().length < 5) {
            alert('Lý do hủy phải có ít nhất 5 ký tự');
            return;
        }

        setActionLoading(cancelModal.bookingId);
        const result = await cancelBooking(cancelModal.bookingId, cancelModal.reason, token);
        setActionLoading(null);
        setCancelModal(null);

        if (!result.success) {
            alert(result.error?.message || 'Có lỗi xảy ra');
            return;
        }

        // Refresh bookings
        fetchBookings();
    };

    // Format date for display
    const formatDate = (dateStr: string) => {
        const d = new Date(dateStr + 'T00:00:00');
        return d.toLocaleDateString('vi-VN', {
            weekday: 'short',
            day: 'numeric',
            month: 'numeric',
        });
    };

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Header */}
            <header className="bg-white border-b sticky top-0 z-10">
                <div className="container mx-auto px-4 py-4">
                    <h1 className="font-bold text-xl">Quản lý đặt sân</h1>
                    <p className="text-sm text-gray-500">Xác nhận hoặc hủy các booking</p>
                </div>
            </header>

            {/* Filters */}
            <div className="bg-white border-b px-4 py-3">
                <div className="container mx-auto flex flex-wrap gap-3 items-center">
                    {/* Date filter */}
                    <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-gray-500" />
                        <input
                            type="date"
                            value={dateFilter}
                            onChange={(e) => setDateFilter(e.target.value)}
                            className="border rounded px-2 py-1 text-sm"
                        />
                    </div>

                    {/* Status filter */}
                    <select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
                        className="border rounded px-2 py-1 text-sm"
                    >
                        <option value="WAITING_MANAGER_CONFIRM">Chờ xác nhận</option>
                        <option value="CONFIRMED">Đã xác nhận</option>
                        <option value="CANCELLED_BY_MANAGER">Đã hủy</option>
                        <option value="ALL">Tất cả</option>
                    </select>

                    {/* Refresh */}
                    <button
                        onClick={fetchBookings}
                        disabled={loading}
                        className="flex items-center gap-1 text-sm text-primary hover:underline"
                    >
                        <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                        Làm mới
                    </button>
                </div>
            </div>

            {/* Content */}
            <main className="container mx-auto px-4 py-6">
                {loading && (
                    <div className="text-center py-12">
                        <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto" />
                        <p className="text-gray-500 mt-2">Đang tải...</p>
                    </div>
                )}

                {error && (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center gap-3">
                        <AlertCircle className="w-6 h-6 text-red-500" />
                        <p className="text-red-700">{error}</p>
                    </div>
                )}

                {!loading && !error && bookings.length === 0 && (
                    <div className="text-center py-12">
                        <Calendar className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                        <p className="text-gray-500">Không có booking nào</p>
                    </div>
                )}

                {!loading && !error && bookings.length > 0 && (
                    <div className="space-y-4">
                        {bookings.map((booking) => (
                            <div
                                key={booking.bookingId}
                                className="bg-white rounded-lg border p-4"
                            >
                                <div className="flex items-start justify-between mb-3">
                                    <div>
                                        <span className={`inline-block px-2 py-1 rounded text-xs font-medium ${STATUS_COLORS[booking.status] || 'bg-gray-100'}`}>
                                            {STATUS_LABELS[booking.status] || booking.status}
                                        </span>
                                        <p className="text-xs text-gray-400 mt-1">
                                            ID: {booking.bookingId.slice(0, 8)}...
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-1 text-xs text-gray-500">
                                        {booking.paymentMethod === 'CASH' ? (
                                            <><Banknote className="w-4 h-4" /> Tiền mặt</>
                                        ) : booking.paymentMethod === 'TRANSFER' ? (
                                            <><QrCode className="w-4 h-4" /> Chuyển khoản {booking.paymentDeclaredAt && '✓'}</>
                                        ) : null}
                                    </div>
                                </div>

                                <div className="space-y-2 text-sm mb-4">
                                    <div className="flex items-center gap-2">
                                        <Calendar className="w-4 h-4 text-gray-400" />
                                        <span>{formatDate(booking.date)}</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Clock className="w-4 h-4 text-gray-400" />
                                        <span>{booking.startTime} → {booking.endTime}</span>
                                        <span className="text-gray-400">•</span>
                                        <span>{booking.court.name}</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <User className="w-4 h-4 text-gray-400" />
                                        <span>{booking.user.name || booking.user.email}</span>
                                    </div>
                                    <div className="font-medium text-primary">
                                        {formatPrice(booking.totalPrice)}đ
                                    </div>
                                </div>

                                {/* Actions */}
                                {booking.status === 'WAITING_MANAGER_CONFIRM' && (
                                    <div className="flex gap-2">
                                        <Button
                                            onClick={() => handleConfirm(booking.bookingId)}
                                            disabled={actionLoading === booking.bookingId}
                                            className="flex-1"
                                        >
                                            {actionLoading === booking.bookingId ? (
                                                <Loader2 className="w-4 h-4 animate-spin mr-2" />
                                            ) : (
                                                <Check className="w-4 h-4 mr-2" />
                                            )}
                                            Xác nhận
                                        </Button>
                                        <Button
                                            variant="danger"
                                            onClick={() => setCancelModal({ bookingId: booking.bookingId, reason: '' })}
                                            disabled={actionLoading === booking.bookingId}
                                            className="flex-1"
                                        >
                                            <X className="w-4 h-4 mr-2" />
                                            Hủy
                                        </Button>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </main>

            {/* Cancel Modal */}
            {cancelModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-lg max-w-md w-full p-6">
                        <h3 className="font-bold text-lg mb-4">Hủy booking</h3>
                        <p className="text-sm text-gray-600 mb-4">
                            Vui lòng nhập lý do hủy (ít nhất 5 ký tự):
                        </p>
                        <textarea
                            value={cancelModal.reason}
                            onChange={(e) => setCancelModal({ ...cancelModal, reason: e.target.value })}
                            placeholder="Lý do hủy..."
                            className="w-full border rounded-lg p-3 text-sm mb-4"
                            rows={3}
                        />
                        <div className="flex gap-2">
                            <Button
                                variant="secondary"
                                onClick={() => setCancelModal(null)}
                                className="flex-1"
                            >
                                Đóng
                            </Button>
                            <Button
                                variant="danger"
                                onClick={handleCancel}
                                disabled={cancelModal.reason.trim().length < 5 || actionLoading !== null}
                                className="flex-1"
                            >
                                {actionLoading ? (
                                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                                ) : null}
                                Xác nhận hủy
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
