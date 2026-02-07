export function ManagerDashboard() {
    // Time slots from 6:00 to 22:00
    const hours = Array.from({ length: 17 }, (_, i) => `${6 + i}:00`);
    const courts = ['Sân 1', 'Sân 2', 'Sân 3'];

    // Mock bookings
    const bookings = [
        { court: 'Sân 1', start: 8, end: 10, status: 'CONFIRMED', name: 'Nguyễn A' },
        { court: 'Sân 1', start: 14, end: 16, status: 'PENDING', name: 'Trần B' },
        { court: 'Sân 2', start: 18, end: 20, status: 'CONFIRMED', name: 'Lê C' },
        { court: 'Sân 3', start: 10, end: 12, status: 'LOCKED', name: 'Bảo trì' },
    ];

    const getBookingStyle = (status: string) => {
        switch (status) {
            case 'CONFIRMED': return 'bg-green-100 text-green-800 border-green-200';
            case 'PENDING': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
            case 'LOCKED': return 'bg-gray-200 text-gray-600 border-gray-300';
            default: return 'bg-gray-100';
        }
    };

    return (
        <div>
            {/* Stats */}
            <div className="grid grid-cols-3 gap-4 mb-6">
                <div className="card text-center">
                    <p className="text-3xl font-bold text-primary">12</p>
                    <p className="text-sm text-gray-500">Đơn hôm nay</p>
                </div>
                <div className="card text-center">
                    <p className="text-3xl font-bold text-warning">3</p>
                    <p className="text-sm text-gray-500">Chờ duyệt</p>
                </div>
                <div className="card text-center">
                    <p className="text-3xl font-bold text-success">1.800k</p>
                    <p className="text-sm text-gray-500">Doanh thu ngày</p>
                </div>
            </div>

            {/* Date picker */}
            <div className="flex items-center gap-4 mb-4">
                <button className="p-2 hover:bg-gray-100 rounded">←</button>
                <h2 className="font-heading font-semibold">Hôm nay - 07/02/2026</h2>
                <button className="p-2 hover:bg-gray-100 rounded">→</button>
            </div>

            {/* Timeline grid */}
            <div className="card overflow-x-auto">
                <div className="min-w-[800px]">
                    {/* Header row */}
                    <div className="grid grid-cols-[100px_repeat(17,1fr)] border-b">
                        <div className="p-2 font-medium text-sm text-gray-500">Sân</div>
                        {hours.map((hour) => (
                            <div key={hour} className="p-2 text-xs text-gray-400 text-center border-l">
                                {hour}
                            </div>
                        ))}
                    </div>

                    {/* Court rows */}
                    {courts.map((court) => (
                        <div key={court} className="grid grid-cols-[100px_repeat(17,1fr)] border-b last:border-b-0 relative h-16">
                            <div className="p-2 font-medium text-sm flex items-center">{court}</div>
                            {hours.map((hour) => (
                                <div key={hour} className="border-l h-full" />
                            ))}

                            {/* Booking blocks */}
                            {bookings
                                .filter((b) => b.court === court)
                                .map((booking, i) => {
                                    const left = ((booking.start - 6) / 17) * 100;
                                    const width = ((booking.end - booking.start) / 17) * 100;
                                    return (
                                        <div
                                            key={i}
                                            className={`absolute top-2 h-12 rounded border px-2 py-1 text-xs ${getBookingStyle(booking.status)}`}
                                            style={{ left: `calc(100px + ${left}%)`, width: `calc(${width}% - 4px)` }}
                                        >
                                            <p className="font-medium truncate">{booking.name}</p>
                                            <p className="opacity-75">{booking.start}:00 - {booking.end}:00</p>
                                        </div>
                                    );
                                })}
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
