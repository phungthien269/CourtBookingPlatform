import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, Clock3, Download, RefreshCw, Search } from 'lucide-react';
import { AdminPaymentReconciliationItem, getAdminPaymentReconciliation } from '../../api/admin';
import { useAuth } from '../../contexts/AuthContext';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { toast } from '../../components/ui/Toast';

type ReconciliationFilter = 'ALL' | 'UNMATCHED' | 'LATE_PAYMENT' | 'AMOUNT_MISMATCH';

const filterOptions: Array<{ value: ReconciliationFilter; label: string }> = [
    { value: 'ALL', label: 'Tất cả' },
    { value: 'UNMATCHED', label: 'Không match reference' },
    { value: 'LATE_PAYMENT', label: 'Tiền về muộn' },
    { value: 'AMOUNT_MISMATCH', label: 'Sai số tiền' },
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

function formatCurrency(value: number | null) {
    if (value === null) return 'N/A';

    return new Intl.NumberFormat('vi-VN').format(value);
}

function getProcessingBadge(status: string) {
    switch (status) {
        case 'UNMATCHED':
            return <Badge variant="warning">Unmatched</Badge>;
        case 'LATE_PAYMENT':
            return <Badge variant="error">Late payment</Badge>;
        case 'AMOUNT_MISMATCH':
            return <Badge variant="info">Amount mismatch</Badge>;
        default:
            return <Badge>{status}</Badge>;
    }
}

function getResolutionHint(item: AdminPaymentReconciliationItem) {
    switch (item.processingStatus) {
        case 'UNMATCHED':
            return 'Kiểm tra reference code và đối soát thủ công với giao dịch ngân hàng. Không auto-confirm booking.';
        case 'LATE_PAYMENT':
            return 'Tiền vào sau khi hold hết hạn. Cần liên hệ user để hoàn tiền hoặc tạo xử lý nội bộ.';
        case 'AMOUNT_MISMATCH':
            return 'Số tiền nhận được khác total booking. Xác minh phí hoặc phần thiếu trước khi ra quyết định.';
        default:
            return 'Cần review thủ công.';
    }
}

function exportReconciliationCsv(items: AdminPaymentReconciliationItem[]) {
    const rows = [
        ['receivedAt', 'status', 'referenceCode', 'providerEventId', 'providerTxnId', 'amount', 'bookingId', 'bookingStatus', 'venue', 'court', 'userEmail'],
        ...items.map((item) => [
            item.receivedAt,
            item.processingStatus,
            item.referenceCode || '',
            item.providerEventId,
            item.providerTxnId || '',
            item.amount ?? '',
            item.booking?.id || '',
            item.booking?.status || '',
            item.booking?.venueName || '',
            item.booking?.courtName || '',
            item.booking?.userEmail || '',
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
    anchor.download = `payment-reconciliation-${new Date().toISOString().slice(0, 10)}.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
}

export function AdminPaymentReconciliation() {
    const { token } = useAuth();
    const [items, setItems] = useState<AdminPaymentReconciliationItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [reloadKey, setReloadKey] = useState(0);
    const [statusFilter, setStatusFilter] = useState<ReconciliationFilter>('ALL');
    const [query, setQuery] = useState('');

    useEffect(() => {
        async function loadItems() {
            if (!token) return;

            setLoading(true);
            setError(null);

            const result = await getAdminPaymentReconciliation(token);
            if (!result.success) {
                setError(result.error.message);
                setLoading(false);
                return;
            }

            setItems(result.data);
            setLoading(false);
        }

        loadItems();
    }, [reloadKey, token]);

    const filteredItems = useMemo(() => {
        const normalizedQuery = query.trim().toLowerCase();

        return items.filter((item) => {
            if (statusFilter !== 'ALL' && item.processingStatus !== statusFilter) {
                return false;
            }

            if (!normalizedQuery) {
                return true;
            }

            const searchable = [
                item.referenceCode,
                item.providerEventId,
                item.providerTxnId,
                item.booking?.id,
                item.booking?.venueName,
                item.booking?.courtName,
                item.booking?.userEmail,
            ]
                .filter(Boolean)
                .join(' ')
                .toLowerCase();

            return searchable.includes(normalizedQuery);
        });
    }, [items, query, statusFilter]);

    const stats = useMemo(() => {
        return {
            total: items.length,
            unmatched: items.filter((item) => item.processingStatus === 'UNMATCHED').length,
            late: items.filter((item) => item.processingStatus === 'LATE_PAYMENT').length,
            mismatch: items.filter((item) => item.processingStatus === 'AMOUNT_MISMATCH').length,
        };
    }, [items]);

    return (
        <div className="space-y-6">
            <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                    <div>
                        <h1 className="text-2xl font-semibold text-slate-900">Đối soát thanh toán chuyển khoản</h1>
                        <p className="mt-2 text-sm text-slate-500">
                            Hàng chờ xử lý cho các webhook không thể auto-confirm: mismatch số tiền, reference không khớp hoặc tiền vào sau khi hold đã hết hạn.
                        </p>
                    </div>

                    <div className="flex flex-wrap gap-3">
                        <Button type="button" variant="secondary" onClick={() => setReloadKey((value) => value + 1)}>
                            <RefreshCw className="mr-2 h-4 w-4" />
                            Làm mới
                        </Button>
                        <Button
                            type="button"
                            onClick={() => {
                                exportReconciliationCsv(filteredItems);
                                toast('Đã xuất CSV từ danh sách đối soát hiện tại', 'success');
                            }}
                        >
                            <Download className="mr-2 h-4 w-4" />
                            Xuất CSV
                        </Button>
                    </div>
                </div>
            </section>

            <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                    <p className="text-sm text-slate-500">Tổng mục cần review</p>
                    <p className="mt-3 text-3xl font-semibold text-slate-900">{stats.total}</p>
                </div>
                <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5 shadow-sm">
                    <p className="text-sm text-amber-900">Reference không khớp</p>
                    <p className="mt-3 text-3xl font-semibold text-amber-700">{stats.unmatched}</p>
                </div>
                <div className="rounded-2xl border border-rose-200 bg-rose-50 p-5 shadow-sm">
                    <p className="text-sm text-rose-900">Tiền vào muộn</p>
                    <p className="mt-3 text-3xl font-semibold text-rose-700">{stats.late}</p>
                </div>
                <div className="rounded-2xl border border-blue-200 bg-blue-50 p-5 shadow-sm">
                    <p className="text-sm text-blue-900">Sai số tiền</p>
                    <p className="mt-3 text-3xl font-semibold text-blue-700">{stats.mismatch}</p>
                </div>
            </section>

            <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="grid gap-4 md:grid-cols-[220px_minmax(0,1fr)]">
                    <div>
                        <label className="mb-1 block text-sm font-medium text-slate-700">Loại đối soát</label>
                        <select
                            value={statusFilter}
                            onChange={(event) => setStatusFilter(event.target.value as ReconciliationFilter)}
                            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                        >
                            {filterOptions.map((option) => (
                                <option key={option.value} value={option.value}>
                                    {option.label}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className="relative">
                        <Input
                            label="Tìm theo reference, booking, venue hoặc email user"
                            value={query}
                            onChange={(event) => setQuery(event.target.value)}
                            placeholder="CBP..., booking id, user@..."
                            className="pl-10"
                        />
                        <Search className="pointer-events-none absolute left-3 top-[38px] h-4 w-4 text-slate-400" />
                    </div>
                </div>
            </section>

            {loading && (
                <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center text-slate-500 shadow-sm">
                    Đang tải hàng chờ đối soát thanh toán...
                </div>
            )}

            {!loading && error && (
                <div className="rounded-2xl border border-rose-200 bg-rose-50 p-5 text-rose-700 shadow-sm">{error}</div>
            )}

            {!loading && !error && filteredItems.length === 0 && (
                <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center shadow-sm">
                    <p className="text-lg font-medium text-slate-900">Không có mục đối soát phù hợp</p>
                    <p className="mt-2 text-sm text-slate-500">
                        Khi webhook gặp mismatch hoặc tiền vào muộn, các bản ghi sẽ xuất hiện tại đây để admin xử lý thủ công.
                    </p>
                </div>
            )}

            {!loading && !error && filteredItems.length > 0 && (
                <div className="space-y-4">
                    {filteredItems.map((item) => (
                        <article key={item.id} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                            <div className="space-y-4">
                                <div className="flex flex-wrap items-center gap-3">
                                    {getProcessingBadge(item.processingStatus)}
                                    <Badge variant="default">{item.referenceCode || 'Không có reference'}</Badge>
                                    <span className="text-sm text-slate-500">Webhook lúc {formatDateTime(item.receivedAt)}</span>
                                </div>

                                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                                    <div>
                                        <p className="text-sm text-slate-500">Provider event</p>
                                        <p className="mt-1 break-all font-medium text-slate-900">{item.providerEventId}</p>
                                    </div>
                                    <div>
                                        <p className="text-sm text-slate-500">Provider txn</p>
                                        <p className="mt-1 break-all font-medium text-slate-900">{item.providerTxnId || 'Chưa có'}</p>
                                    </div>
                                    <div>
                                        <p className="text-sm text-slate-500">Số tiền nhận được</p>
                                        <p className="mt-1 font-medium text-slate-900">{formatCurrency(item.amount)}đ</p>
                                    </div>
                                    <div>
                                        <p className="text-sm text-slate-500">Khuyến nghị xử lý</p>
                                        <p className="mt-1 font-medium text-slate-900">
                                            {item.processingStatus === 'UNMATCHED' && 'Đối soát / hoàn tiền'}
                                            {item.processingStatus === 'LATE_PAYMENT' && 'Liên hệ user / hoàn tiền'}
                                            {item.processingStatus === 'AMOUNT_MISMATCH' && 'Xác minh số tiền'}
                                        </p>
                                    </div>
                                </div>

                                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
                                    <div className="flex items-start gap-3">
                                        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
                                        <p>{getResolutionHint(item)}</p>
                                    </div>
                                </div>

                                {item.booking ? (
                                    <div className="rounded-xl border border-slate-200 p-4">
                                        <div className="flex flex-wrap items-center gap-3">
                                            <p className="font-medium text-slate-900">Booking liên quan</p>
                                            <Badge variant={item.booking.status === 'CONFIRMED' ? 'success' : item.booking.status === 'EXPIRED' ? 'error' : 'warning'}>
                                                {item.booking.status}
                                            </Badge>
                                        </div>

                                        <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-4 text-sm text-slate-600">
                                            <div>
                                                <p className="text-slate-500">Venue / court</p>
                                                <p className="mt-1 font-medium text-slate-900">{item.booking.venueName}</p>
                                                <p>{item.booking.courtName}</p>
                                            </div>
                                            <div>
                                                <p className="text-slate-500">Lịch chơi</p>
                                                <p className="mt-1 font-medium text-slate-900">{item.booking.date}</p>
                                                <p>
                                                    {item.booking.startTime} - {item.booking.endTime}
                                                </p>
                                            </div>
                                            <div>
                                                <p className="text-slate-500">Tổng booking</p>
                                                <p className="mt-1 font-medium text-slate-900">{formatCurrency(item.booking.totalPrice)}đ</p>
                                            </div>
                                            <div>
                                                <p className="text-slate-500">User</p>
                                                <p className="mt-1 font-medium text-slate-900">{item.booking.userEmail}</p>
                                                <p className="font-mono text-xs text-slate-500">{item.booking.id}</p>
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
                                        <div className="flex items-start gap-3">
                                            <Clock3 className="mt-0.5 h-4 w-4 shrink-0" />
                                            <p>
                                                Webhook này chưa map được tới booking nào trong hệ thống. Admin cần tra cứu reference code hoặc hoàn tiền thủ công nếu giao dịch không thuộc nền tảng.
                                            </p>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </article>
                    ))}
                </div>
            )}
        </div>
    );
}
