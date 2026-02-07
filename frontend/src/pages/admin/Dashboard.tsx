export function AdminDashboard() {
    const stats = [
        { label: 'Tổng Manager', value: 24, icon: '👥' },
        { label: 'Tổng User', value: 1250, icon: '👤' },
        { label: 'Chờ duyệt', value: 3, icon: '⏳', highlight: true },
        { label: 'Sân hoạt động', value: 18, icon: '🏸' },
        { label: 'Booking hôm nay', value: 156, icon: '📅' },
        { label: 'Doanh thu tháng', value: '45M', icon: '💰' },
    ];

    const activities = [
        { time: '10:30', action: 'Manager "Sân ABC" đã được tạo', type: 'success' },
        { time: '09:45', action: 'Venue "Sân XYZ" đã được duyệt', type: 'success' },
        { time: '09:00', action: 'User test@email.com bị khóa', type: 'warning' },
        { time: '08:30', action: 'Có 2 venue mới chờ duyệt', type: 'info' },
    ];

    return (
        <div className="text-white">
            {/* Stats grid */}
            <div className="grid grid-cols-3 gap-4 mb-8">
                {stats.map((stat) => (
                    <div
                        key={stat.label}
                        className={`bg-slate-800 rounded-lg p-6 ${stat.highlight ? 'ring-2 ring-warning' : ''}`}
                    >
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-slate-400 text-sm">{stat.label}</p>
                                <p className="text-3xl font-bold mt-1">{stat.value}</p>
                            </div>
                            <span className="text-3xl">{stat.icon}</span>
                        </div>
                    </div>
                ))}
            </div>

            <div className="grid grid-cols-2 gap-6">
                {/* Recent activity */}
                <div className="bg-slate-800 rounded-lg p-6">
                    <h3 className="font-semibold mb-4">Hoạt động gần đây</h3>
                    <div className="space-y-3">
                        {activities.map((activity, i) => (
                            <div key={i} className="flex items-start gap-3 text-sm">
                                <span className="text-slate-500 w-12">{activity.time}</span>
                                <span className="text-slate-300">{activity.action}</span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Quick actions */}
                <div className="bg-slate-800 rounded-lg p-6">
                    <h3 className="font-semibold mb-4">Hành động nhanh</h3>
                    <div className="space-y-3">
                        <button className="w-full py-3 px-4 bg-primary hover:bg-primary-hover rounded-lg text-left font-medium transition-colors">
                            + Tạo Manager mới
                        </button>
                        <button className="w-full py-3 px-4 bg-slate-700 hover:bg-slate-600 rounded-lg text-left font-medium transition-colors">
                            📋 Xem duyệt chờ (3)
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
