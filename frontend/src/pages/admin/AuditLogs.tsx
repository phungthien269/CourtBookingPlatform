import { Badge } from '../../components/ui/Badge';

export function AdminAuditLogs() {
    const logs = [
        { time: '07/02/2026 10:30:15', type: 'USER', actor: 'admin@courtbooking.vn', action: 'Created manager account', target: 'manager@test.vn' },
        { time: '07/02/2026 09:45:30', type: 'VENUE', actor: 'admin@courtbooking.vn', action: 'Approved venue', target: 'Sân XYZ' },
        { time: '07/02/2026 09:00:00', type: 'USER', actor: 'system', action: 'Locked user for inactivity', target: 'inactive@user.vn' },
        { time: '06/02/2026 18:30:00', type: 'BOOKING', actor: 'manager@venue.vn', action: 'Confirmed booking', target: 'BK-123456' },
    ];

    const typeBadge = (type: string) => {
        const variants: Record<string, 'success' | 'info' | 'warning' | 'default'> = {
            USER: 'info',
            VENUE: 'success',
            BOOKING: 'warning',
            SYSTEM: 'default',
        };
        return <Badge variant={variants[type] || 'default'}>{type}</Badge>;
    };

    return (
        <div className="text-white">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-heading font-semibold">Nhật ký hệ thống</h1>
                <button className="btn-secondary">Xuất CSV</button>
            </div>

            {/* Filters */}
            <div className="flex gap-4 mb-6">
                <input type="date" className="input bg-slate-800 border-slate-700 text-white" />
                <input type="date" className="input bg-slate-800 border-slate-700 text-white" />
                <select className="input bg-slate-800 border-slate-700 text-white w-40">
                    <option>Tất cả</option>
                    <option>USER</option>
                    <option>VENUE</option>
                    <option>BOOKING</option>
                    <option>SYSTEM</option>
                </select>
                <input
                    type="text"
                    placeholder="Tìm theo actor..."
                    className="input bg-slate-800 border-slate-700 text-white placeholder-slate-400 flex-1"
                />
            </div>

            {/* Table */}
            <div className="bg-slate-800 rounded-lg overflow-hidden">
                <table className="w-full">
                    <thead className="bg-slate-700">
                        <tr>
                            <th className="text-left px-4 py-3 text-sm font-medium text-slate-300">Thời gian</th>
                            <th className="text-left px-4 py-3 text-sm font-medium text-slate-300">Loại</th>
                            <th className="text-left px-4 py-3 text-sm font-medium text-slate-300">Actor</th>
                            <th className="text-left px-4 py-3 text-sm font-medium text-slate-300">Hành động</th>
                            <th className="text-left px-4 py-3 text-sm font-medium text-slate-300">Target</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-700">
                        {logs.map((log, i) => (
                            <tr key={i} className="hover:bg-slate-700/50">
                                <td className="px-4 py-3 text-sm text-slate-400 font-mono">{log.time}</td>
                                <td className="px-4 py-3">{typeBadge(log.type)}</td>
                                <td className="px-4 py-3 text-slate-300">{log.actor}</td>
                                <td className="px-4 py-3 text-slate-300">{log.action}</td>
                                <td className="px-4 py-3 text-slate-400">{log.target}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
