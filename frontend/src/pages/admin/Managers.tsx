import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';

export function AdminManagers() {
    const managers = [
        { id: 1, name: 'Nguyễn Văn Manager', email: 'manager@courtbooking.vn', venue: 'Sân cầu lông Phú Nhuận', expires: '31/12/2026', status: 'ACTIVE' },
        { id: 2, name: 'Trần Thị B', email: 'b@venue.vn', venue: 'Sân Pickleball Q1', expires: '15/06/2026', status: 'ACTIVE' },
        { id: 3, name: 'Lê Văn C', email: 'c@venue.vn', venue: 'Sân ABC', expires: '01/01/2026', status: 'EXPIRED' },
    ];

    return (
        <div className="text-white">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-heading font-semibold">Quản lý Manager</h1>
                <Button>+ Tạo Manager mới</Button>
            </div>

            {/* Filters */}
            <div className="flex gap-4 mb-6">
                <input
                    type="text"
                    placeholder="Tìm theo tên, email..."
                    className="input bg-slate-800 border-slate-700 text-white placeholder-slate-400 w-64"
                />
                <select className="input bg-slate-800 border-slate-700 text-white w-40">
                    <option>Tất cả</option>
                    <option>Hoạt động</option>
                    <option>Đã khóa</option>
                    <option>Hết hạn</option>
                </select>
            </div>

            {/* Table */}
            <div className="bg-slate-800 rounded-lg overflow-hidden">
                <table className="w-full">
                    <thead className="bg-slate-700">
                        <tr>
                            <th className="text-left px-4 py-3 text-sm font-medium text-slate-300">Manager</th>
                            <th className="text-left px-4 py-3 text-sm font-medium text-slate-300">Venue</th>
                            <th className="text-left px-4 py-3 text-sm font-medium text-slate-300">Hết hạn</th>
                            <th className="text-left px-4 py-3 text-sm font-medium text-slate-300">Trạng thái</th>
                            <th className="text-left px-4 py-3 text-sm font-medium text-slate-300">Thao tác</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-700">
                        {managers.map((m) => (
                            <tr key={m.id} className="hover:bg-slate-700/50">
                                <td className="px-4 py-3">
                                    <p className="font-medium">{m.name}</p>
                                    <p className="text-sm text-slate-400">{m.email}</p>
                                </td>
                                <td className="px-4 py-3 text-slate-300">{m.venue}</td>
                                <td className="px-4 py-3 text-slate-300">{m.expires}</td>
                                <td className="px-4 py-3">
                                    <Badge variant={m.status === 'ACTIVE' ? 'success' : 'warning'}>
                                        {m.status === 'ACTIVE' ? 'Hoạt động' : 'Hết hạn'}
                                    </Badge>
                                </td>
                                <td className="px-4 py-3">
                                    <button className="text-primary hover:underline text-sm mr-3">Xem</button>
                                    <button className="text-slate-400 hover:text-white text-sm">Khóa</button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
