import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';

export function AdminApprovals() {
    const tabs = ['Chờ duyệt', 'Đã duyệt', 'Từ chối'];

    const pending = [
        { id: 1, venue: 'Sân Tennis Q7', manager: 'Phạm Văn D', type: 'Thông tin mới', date: '06/02/2026' },
        { id: 2, venue: 'Sân cầu lông Thủ Đức', manager: 'Hoàng E', type: 'Cập nhật', date: '05/02/2026' },
    ];

    return (
        <div className="text-white">
            <h1 className="text-2xl font-heading font-semibold mb-6">Duyệt thông tin sân</h1>

            {/* Tabs */}
            <div className="flex gap-2 mb-6 border-b border-slate-700">
                {tabs.map((tab, i) => (
                    <button
                        key={tab}
                        className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${i === 0 ? 'border-primary text-primary' : 'border-transparent text-slate-400 hover:text-white'
                            }`}
                    >
                        {tab} {i === 0 && <Badge variant="warning" className="ml-2">2</Badge>}
                    </button>
                ))}
            </div>

            {/* Pending cards */}
            <div className="space-y-4">
                {pending.map((item) => (
                    <div key={item.id} className="bg-slate-800 rounded-lg p-4 flex gap-4">
                        <img
                            src="https://placehold.co/120x90/0ddff2/white?text=Venue"
                            alt="Venue"
                            className="w-30 h-24 object-cover rounded"
                        />
                        <div className="flex-1">
                            <div className="flex justify-between items-start">
                                <div>
                                    <h3 className="font-semibold">{item.venue}</h3>
                                    <p className="text-sm text-slate-400">Manager: {item.manager}</p>
                                </div>
                                <Badge variant={item.type === 'Thông tin mới' ? 'info' : 'default'}>
                                    {item.type}
                                </Badge>
                            </div>
                            <p className="text-sm text-slate-500 mt-2">Gửi lúc: {item.date}</p>
                            <div className="flex gap-2 mt-3">
                                <Button variant="secondary" size="sm">Xem trước</Button>
                                <Button variant="primary" size="sm">Duyệt</Button>
                                <Button variant="danger" size="sm">Từ chối</Button>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
