import { useEffect, useMemo, useState } from 'react';
import { Download, RefreshCw } from 'lucide-react';
import { AdminAuditEventType, AdminAuditLog, getAdminAuditLogs } from '../../api/admin';
import { useAuth } from '../../contexts/AuthContext';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { toast } from '../../components/ui/Toast';

const eventTypeOptions: Array<{ value: AdminAuditEventType; label: string }> = [
    { value: 'ALL', label: 'Tất cả' },
    { value: 'MANAGER', label: 'Manager' },
    { value: 'MANAGER_SUBSCRIPTION', label: 'Subscription' },
    { value: 'USER', label: 'User' },
    { value: 'BOOKING', label: 'Booking' },
    { value: 'SYSTEM', label: 'System' },
    { value: 'ADMIN', label: 'Admin' },
];

function formatDateTime(value: string) {
    return new Intl.DateTimeFormat('vi-VN', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
    }).format(new Date(value));
}

function getEventBadge(eventType: string) {
    const variants: Record<string, 'success' | 'info' | 'warning' | 'error' | 'default'> = {
        MANAGER: 'info',
        MANAGER_SUBSCRIPTION: 'warning',
        USER: 'info',
        BOOKING: 'success',
        SYSTEM: 'default',
        ADMIN: 'default',
    };

    return <Badge variant={variants[eventType] || 'default'}>{eventType}</Badge>;
}

function exportLogsToCsv(logs: AdminAuditLog[]) {
    const rows = [
        ['createdAt', 'eventType', 'actorEmail', 'actorRole', 'action', 'targetType', 'targetId', 'targetLabel', 'summary'],
        ...logs.map((log) => [
            log.createdAt,
            log.eventType,
            log.actorEmail || '',
            log.actorRole || '',
            log.action,
            log.targetType || '',
            log.targetId || '',
            log.targetLabel || '',
            log.summary,
        ]),
    ];

    const csv = rows
        .map((row) =>
            row
                .map((cell) => `"${String(cell).replace(/"/g, '""')}"`)
                .join(',')
        )
        .join('\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `audit-logs-${new Date().toISOString().slice(0, 10)}.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
}

export function AdminAuditLogs() {
    const { token } = useAuth();
    const [logs, setLogs] = useState<AdminAuditLog[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [eventType, setEventType] = useState<AdminAuditEventType>('ALL');
    const [query, setQuery] = useState('');
    const [fromDate, setFromDate] = useState('');
    const [toDate, setToDate] = useState('');
    const [reloadKey, setReloadKey] = useState(0);

    useEffect(() => {
        async function loadLogs() {
            if (!token) return;

            setLoading(true);
            setError(null);

            const result = await getAdminAuditLogs(token, {
                eventType,
                query: query.trim() || undefined,
                fromDate: fromDate || undefined,
                toDate: toDate || undefined,
                limit: 100,
            });

            if (!result.success) {
                setError(result.error.message);
                setLoading(false);
                return;
            }

            setLogs(result.data);
            setLoading(false);
        }

        loadLogs();
    }, [eventType, fromDate, query, reloadKey, toDate, token]);

    const stats = useMemo(() => {
        return {
            total: logs.length,
            renewal: logs.filter((log) => log.eventType === 'MANAGER_SUBSCRIPTION').length,
            manager: logs.filter((log) => log.eventType === 'MANAGER').length,
        };
    }, [logs]);

    return (
        <div className="space-y-6">
            <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                    <div>
                        <h1 className="text-2xl font-semibold text-slate-900">Nhật ký hệ thống</h1>
                        <p className="mt-2 text-sm text-slate-500">
                            Theo dõi toàn bộ thao tác admin và các sự kiện quan trọng như renewal request, approve và lock manager.
                        </p>
                    </div>

                    <div className="flex flex-wrap gap-3">
                        <Button type="button" variant="secondary" onClick={() => setReloadKey((value) => value + 1)}>
                            <RefreshCw className="mr-2 h-4 w-4" />
                            Làm mới
                        </Button>
                        <Button type="button" onClick={() => {
                            exportLogsToCsv(logs);
                            toast('Đã xuất CSV từ danh sách hiện tại', 'success');
                        }}>
                            <Download className="mr-2 h-4 w-4" />
                            Xuất CSV
                        </Button>
                    </div>
                </div>
            </section>

            <section className="grid gap-4 md:grid-cols-3">
                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                    <p className="text-sm text-slate-500">Bản ghi đang hiển thị</p>
                    <p className="mt-3 text-3xl font-semibold text-slate-900">{stats.total}</p>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                    <p className="text-sm text-slate-500">Subscription logs</p>
                    <p className="mt-3 text-3xl font-semibold text-amber-700">{stats.renewal}</p>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                    <p className="text-sm text-slate-500">Manager logs</p>
                    <p className="mt-3 text-3xl font-semibold text-slate-900">{stats.manager}</p>
                </div>
            </section>

            <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                    <div>
                        <label className="mb-1 block text-sm font-medium text-slate-700">Loại event</label>
                        <select
                            value={eventType}
                            onChange={(event) => setEventType(event.target.value as AdminAuditEventType)}
                            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                        >
                            {eventTypeOptions.map((option) => (
                                <option key={option.value} value={option.value}>
                                    {option.label}
                                </option>
                            ))}
                        </select>
                    </div>

                    <Input
                        label="Từ ngày"
                        type="date"
                        value={fromDate}
                        onChange={(event) => setFromDate(event.target.value)}
                    />
                    <Input
                        label="Đến ngày"
                        type="date"
                        value={toDate}
                        onChange={(event) => setToDate(event.target.value)}
                    />
                    <Input
                        label="Tìm kiếm"
                        value={query}
                        onChange={(event) => setQuery(event.target.value)}
                        placeholder="Actor, action, target hoặc event type"
                    />
                </div>
            </section>

            {loading && (
                <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center text-slate-500 shadow-sm">
                    Đang tải audit logs...
                </div>
            )}

            {!loading && error && (
                <div className="rounded-2xl border border-rose-200 bg-rose-50 p-5 text-rose-700 shadow-sm">{error}</div>
            )}

            {!loading && !error && (
                <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-slate-200 text-sm">
                            <thead>
                                <tr className="text-left text-slate-500">
                                    <th className="px-5 py-4 font-medium">Thời gian</th>
                                    <th className="px-5 py-4 font-medium">Loại</th>
                                    <th className="px-5 py-4 font-medium">Actor</th>
                                    <th className="px-5 py-4 font-medium">Action</th>
                                    <th className="px-5 py-4 font-medium">Target</th>
                                    <th className="px-5 py-4 font-medium">Tóm tắt</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {logs.length === 0 && (
                                    <tr>
                                        <td colSpan={6} className="px-5 py-10 text-center text-slate-500">
                                            Chưa có audit log phù hợp với bộ lọc hiện tại.
                                        </td>
                                    </tr>
                                )}

                                {logs.map((log) => (
                                    <tr key={log.id}>
                                        <td className="px-5 py-4 align-top font-mono text-xs text-slate-500">{formatDateTime(log.createdAt)}</td>
                                        <td className="px-5 py-4 align-top">{getEventBadge(log.eventType)}</td>
                                        <td className="px-5 py-4 align-top text-slate-600">
                                            <p className="font-medium text-slate-900">{log.actorEmail || 'system'}</p>
                                            <p className="mt-1 text-xs text-slate-500">{log.actorRole || 'SYSTEM'}</p>
                                        </td>
                                        <td className="px-5 py-4 align-top text-slate-600">
                                            <p className="font-medium text-slate-900">{log.action}</p>
                                            <p className="mt-1 text-xs text-slate-500">{log.targetType || 'N/A'}</p>
                                        </td>
                                        <td className="px-5 py-4 align-top text-slate-600">
                                            <p className="font-medium text-slate-900">{log.targetLabel || 'Không có target'}</p>
                                            <p className="mt-1 text-xs text-slate-500">{log.targetId || 'N/A'}</p>
                                        </td>
                                        <td className="px-5 py-4 align-top text-slate-600">
                                            <p>{log.summary}</p>
                                            {log.details && (
                                                <p className="mt-2 text-xs text-slate-400">
                                                    {Object.entries(log.details)
                                                        .slice(0, 3)
                                                        .map(([key, value]) => `${key}: ${String(value)}`)
                                                        .join(' • ')}
                                                </p>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </section>
            )}
        </div>
    );
}
