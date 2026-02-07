import { Link, useParams } from 'react-router-dom';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';

export function BookingDetail() {
    const { id } = useParams();

    const booking = {
        id: id || 'BK-123456',
        venue: 'Sân cầu lông Phú Nhuận',
        court: 'Sân 2 - Cầu lông',
        date: '15/02/2026',
        time: '18:00 - 20:00',
        duration: '2 giờ',
        pricePerHour: '150.000đ',
        totalPrice: '300.000đ',
        status: 'CONFIRMED',
        createdAt: '10/02/2026 14:30',
    };

    const timeline = [
        { step: 'Pending Payment', done: true },
        { step: 'Waiting Confirm', done: true },
        { step: 'Confirmed', done: true, active: true },
        { step: 'Completed', done: false },
    ];

    return (
        <div>
            <Link to="/me/bookings" className="text-primary hover:underline text-sm mb-4 inline-block">
                ← Quay lại
            </Link>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left column */}
                <div className="lg:col-span-2 space-y-6">
                    {/* Header */}
                    <div className="card">
                        <div className="flex items-center gap-4">
                            <Badge variant="info">#{booking.id}</Badge>
                            <Badge variant="success">Đã xác nhận</Badge>
                            <span className="text-sm text-gray-500">Tạo lúc: {booking.createdAt}</span>
                        </div>
                    </div>

                    {/* Venue info */}
                    <div className="card">
                        <h3 className="font-semibold mb-4">Thông tin sân</h3>
                        <div className="flex gap-4">
                            <img
                                src="https://placehold.co/160x120/0ddff2/white?text=San"
                                alt="Venue"
                                className="w-40 h-30 object-cover rounded"
                            />
                            <div>
                                <h4 className="font-medium">{booking.venue}</h4>
                                <p className="text-sm text-gray-500 mt-1">123 Phan Xích Long, Phường 2, Phú Nhuận</p>
                                <p className="text-sm text-primary mt-2">{booking.court}</p>
                            </div>
                        </div>
                    </div>

                    {/* Booking details */}
                    <div className="card">
                        <h3 className="font-semibold mb-4">Chi tiết đặt sân</h3>
                        <div className="grid grid-cols-2 gap-4 text-sm">
                            <div>
                                <span className="text-gray-500">Ngày:</span>
                                <span className="ml-2 font-medium">{booking.date}</span>
                            </div>
                            <div>
                                <span className="text-gray-500">Giờ:</span>
                                <span className="ml-2 font-medium">{booking.time}</span>
                            </div>
                            <div>
                                <span className="text-gray-500">Thời lượng:</span>
                                <span className="ml-2 font-medium">{booking.duration}</span>
                            </div>
                            <div>
                                <span className="text-gray-500">Đơn giá:</span>
                                <span className="ml-2 font-medium">{booking.pricePerHour}/h</span>
                            </div>
                        </div>
                        <div className="mt-4 pt-4 border-t flex justify-between">
                            <span className="font-semibold">Tổng cộng:</span>
                            <span className="font-semibold text-primary text-lg">{booking.totalPrice}</span>
                        </div>
                    </div>
                </div>

                {/* Right column - Timeline */}
                <div className="space-y-6">
                    <div className="card">
                        <h3 className="font-semibold mb-4">Trạng thái</h3>
                        <div className="space-y-4">
                            {timeline.map((item, i) => (
                                <div key={i} className="flex items-center gap-3">
                                    <div className={`w-3 h-3 rounded-full ${item.active ? 'bg-primary' : item.done ? 'bg-green-500' : 'bg-gray-300'
                                        }`} />
                                    <span className={item.active ? 'font-medium' : item.done ? 'text-gray-600' : 'text-gray-400'}>
                                        {item.step}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="card space-y-3">
                        <Button variant="secondary" className="w-full">
                            💬 Chat với chủ sân
                        </Button>
                        <Button variant="ghost" className="w-full text-error">
                            Hủy đặt
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
}
