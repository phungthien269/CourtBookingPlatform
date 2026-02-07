import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';

export function MyBookings() {
    const tabs = ['Tất cả', 'Sắp tới', 'Đã hoàn thành', 'Đã hủy'];

    // Mock bookings
    const bookings = [
        { id: 'BK-001', venue: 'Sân cầu lông Phú Nhuận', court: 'Sân 1 - Cầu lông', date: '15/02/2026', time: '18:00 - 20:00', price: '300.000đ', status: 'CONFIRMED' },
        { id: 'BK-002', venue: 'Sân cầu lông Phú Nhuận', court: 'Sân 2 - Cầu lông', date: '10/02/2026', time: '08:00 - 10:00', price: '240.000đ', status: 'COMPLETED' },
        { id: 'BK-003', venue: 'Sân cầu lông Phú Nhuận', court: 'Sân 3 - Pickleball', date: '05/02/2026', time: '14:00 - 16:00', price: '300.000đ', status: 'CANCELLED' },
    ];

    const statusBadge = (status: string) => {
        const config: Record<string, { variant: 'success' | 'warning' | 'error' | 'default'; label: string }> = {
            CONFIRMED: { variant: 'success', label: 'Đã xác nhận' },
            PENDING: { variant: 'warning', label: 'Chờ xác nhận' },
            COMPLETED: { variant: 'default', label: 'Hoàn thành' },
            CANCELLED: { variant: 'error', label: 'Đã hủy' },
        };
        const { variant, label } = config[status] || { variant: 'default', label: status };
        return <Badge variant={variant}>{label}</Badge>;
    };

    return (
        <div>
            <h1 className="text-2xl font-heading font-semibold mb-6">Lịch sử đặt sân</h1>

            {/* Tabs */}
            <div className="flex gap-2 mb-6 border-b">
                {tabs.map((tab, i) => (
                    <button
                        key={tab}
                        className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${i === 0 ? 'border-primary text-primary' : 'border-transparent text-gray-500 hover:text-gray-700'
                            }`}
                    >
                        {tab}
                    </button>
                ))}
            </div>

            {/* Booking list */}
            <div className="space-y-4">
                {bookings.map((booking) => (
                    <div key={booking.id} className="card flex gap-4">
                        <img
                            src="https://placehold.co/120x90/0ddff2/white?text=San"
                            alt="Venue"
                            className="w-30 h-24 object-cover rounded"
                        />
                        <div className="flex-1">
                            <div className="flex justify-between items-start">
                                <div>
                                    <h3 className="font-semibold">{booking.venue}</h3>
                                    <p className="text-sm text-gray-500">{booking.court}</p>
                                </div>
                                {statusBadge(booking.status)}
                            </div>
                            <p className="text-sm text-gray-600 mt-2">
                                📅 {booking.date} • 🕐 {booking.time}
                            </p>
                            <div className="flex justify-between items-center mt-3">
                                <span className="font-medium text-primary">{booking.price}</span>
                                <div className="flex gap-2">
                                    <Button variant="secondary" size="sm">Xem chi tiết</Button>
                                    {booking.status === 'CONFIRMED' && (
                                        <Button variant="ghost" size="sm">Hủy đặt</Button>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
