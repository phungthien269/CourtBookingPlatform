import { useEffect, useState } from 'react';
import { CreditCard, QrCode, ShieldCheck } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { getManagerSubscription, ManagerSubscription, requestSubscriptionRenewal } from '../../api/manager';
import { formatPrice } from '../../api/booking';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { toast } from '../../components/ui/Toast';

function getStatusVariant(status: ManagerSubscription['subscription']['status']) {
    switch (status) {
        case 'ACTIVE':
            return 'success';
        case 'EXPIRING_SOON':
            return 'warning';
        case 'EXPIRED':
            return 'error';
        default:
            return 'default';
    }
}

export default function ManagerSubscriptionPage() {
    const { token } = useAuth();
    const [data, setData] = useState<ManagerSubscription | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [months, setMonths] = useState('1');
    const [note, setNote] = useState('');
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        async function loadSubscription() {
            if (!token) return;

            setLoading(true);
            setError(null);

            const result = await getManagerSubscription(token);
            if (!result.success) {
                setError(result.error.message);
                setLoading(false);
                return;
            }

            setData(result.data);
            setLoading(false);
        }

        loadSubscription();
    }, [token]);

    async function handleRenewalRequest() {
        if (!token || !data) return;

        setSubmitting(true);
        const result = await requestSubscriptionRenewal(
            {
                months: Number(months),
                note: note.trim() || undefined,
            },
            token
        );
        setSubmitting(false);

        if (!result.success) {
            toast(result.error.message, 'error');
            return;
        }

        setData({
            ...data,
            requests: [result.data, ...data.requests],
        });
        setNote('');
        toast('Đã gửi yêu cầu gia hạn', 'success');
    }

    if (loading) {
        return <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center text-slate-500 shadow-sm">Đang tải thông tin gia hạn...</div>;
    }

    if (error || !data) {
        return <div className="rounded-2xl border border-rose-200 bg-rose-50 p-5 text-rose-700 shadow-sm">{error || 'Không thể tải dữ liệu gia hạn'}</div>;
    }

    const estimatedAmount = data.subscription.activeCourtCount * data.subscription.monthlyFeePerCourt * Number(months);

    return (
        <div className="space-y-6">
            <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div>
                        <h1 className="text-2xl font-semibold text-slate-900">Gia hạn nền tảng manager</h1>
                        <p className="mt-2 text-sm text-slate-500">
                            Theo dõi hạn sử dụng theo số sân đang active và gửi yêu cầu gia hạn qua QR platform.
                        </p>
                    </div>
                    <Badge variant={getStatusVariant(data.subscription.status)}>
                        {data.subscription.status === 'ACTIVE' && 'Gói đang hoạt động'}
                        {data.subscription.status === 'EXPIRING_SOON' && 'Sắp hết hạn'}
                        {data.subscription.status === 'EXPIRED' && 'Đã hết hạn'}
                        {data.subscription.status === 'UNSET' && 'Chưa có gói'}
                    </Badge>
                </div>
            </section>

            <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                    <p className="text-sm text-slate-500">Venue</p>
                    <p className="mt-3 text-lg font-semibold text-slate-900">{data.venueName}</p>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                    <p className="text-sm text-slate-500">Sân tính phí</p>
                    <p className="mt-3 text-3xl font-semibold text-slate-900">{data.subscription.activeCourtCount}</p>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                    <p className="text-sm text-slate-500">Phí hàng tháng</p>
                    <p className="mt-3 text-3xl font-semibold text-slate-900">
                        {formatPrice(data.subscription.totalMonthlyFee)}đ
                    </p>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                    <p className="text-sm text-slate-500">Còn lại</p>
                    <p className="mt-3 text-3xl font-semibold text-slate-900">
                        {data.subscription.daysRemaining ?? 0} ngày
                    </p>
                </div>
            </section>

            <section className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
                <div className="space-y-6">
                    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                        <div className="flex items-center gap-2">
                            <CreditCard className="h-5 w-5 text-slate-600" />
                            <h2 className="text-lg font-semibold text-slate-900">Gửi yêu cầu gia hạn</h2>
                        </div>

                        <div className="mt-5 grid gap-4 md:grid-cols-2">
                            <div>
                                <label className="mb-1 block text-sm font-medium text-slate-700">Số tháng</label>
                                <select
                                    value={months}
                                    onChange={(event) => setMonths(event.target.value)}
                                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                                >
                                    {Array.from({ length: 12 }, (_, index) => index + 1).map((value) => (
                                        <option key={value} value={value}>
                                            {value} tháng
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div className="rounded-xl bg-slate-50 p-4">
                                <p className="text-sm text-slate-500">Số tiền ước tính</p>
                                <p className="mt-2 text-2xl font-semibold text-slate-900">{formatPrice(estimatedAmount)}đ</p>
                            </div>
                        </div>

                        <div className="mt-4">
                            <Input
                                label="Ghi chú"
                                value={note}
                                onChange={(event) => setNote(event.target.value)}
                                placeholder="Ví dụ: đã chuyển khoản chiều nay"
                            />
                        </div>

                        <div className="mt-5 flex items-center gap-3">
                            <Button onClick={handleRenewalRequest} loading={submitting}>
                                Gửi yêu cầu gia hạn
                            </Button>
                            <span className="text-sm text-slate-500">
                                Admin sẽ xác nhận thủ công sau khi kiểm tra thanh toán.
                            </span>
                        </div>
                    </div>

                    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                        <div className="flex items-center gap-2">
                            <ShieldCheck className="h-5 w-5 text-slate-600" />
                            <h2 className="text-lg font-semibold text-slate-900">Lịch sử yêu cầu</h2>
                        </div>

                        <div className="mt-5 space-y-3">
                            {data.requests.length === 0 && (
                                <p className="rounded-xl bg-slate-50 px-4 py-3 text-sm text-slate-500">
                                    Chưa có yêu cầu gia hạn nào được gửi.
                                </p>
                            )}

                            {data.requests.map((request) => (
                                <div key={request.id} className="rounded-xl border border-slate-200 p-4">
                                    <div className="flex items-start justify-between gap-3">
                                        <div>
                                            <p className="font-medium text-slate-900">
                                                {request.months} tháng • {request.courtCount} sân
                                            </p>
                                            <p className="mt-1 text-sm text-slate-500">
                                                {new Intl.DateTimeFormat('vi-VN', {
                                                    hour: '2-digit',
                                                    minute: '2-digit',
                                                    day: '2-digit',
                                                    month: '2-digit',
                                                    year: 'numeric',
                                                }).format(new Date(request.requestedAt))}
                                            </p>
                                        </div>
                                        <Badge variant="warning">{request.status}</Badge>
                                    </div>
                                    <p className="mt-3 text-sm font-medium text-slate-900">
                                        Số tiền: {formatPrice(request.amount)}đ
                                    </p>
                                    <p className="mt-1 text-sm text-slate-500">{request.note || 'Không có ghi chú'}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                <aside className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                    <div className="flex items-center gap-2">
                        <QrCode className="h-5 w-5 text-slate-600" />
                        <h2 className="text-lg font-semibold text-slate-900">Thông tin chuyển khoản</h2>
                    </div>

                    <img
                        src={data.paymentInstruction.qrCodeUrl}
                        alt="QR renewal"
                        className="mt-5 w-full rounded-2xl border border-slate-200"
                    />

                    <div className="mt-5 space-y-3 text-sm text-slate-600">
                        <div>
                            <p className="text-slate-500">Ngân hàng</p>
                            <p className="font-medium text-slate-900">{data.paymentInstruction.bankName}</p>
                        </div>
                        <div>
                            <p className="text-slate-500">Số tài khoản</p>
                            <p className="font-medium text-slate-900">{data.paymentInstruction.accountNumber}</p>
                        </div>
                        <div>
                            <p className="text-slate-500">Chủ tài khoản</p>
                            <p className="font-medium text-slate-900">{data.paymentInstruction.accountName}</p>
                        </div>
                        <div>
                            <p className="text-slate-500">Nội dung chuyển khoản</p>
                            <p className="font-medium text-slate-900">{data.paymentInstruction.transferContent}</p>
                        </div>
                    </div>

                    <div className="mt-5 rounded-xl bg-slate-50 p-4 text-sm text-slate-600">
                        {data.paymentInstruction.note}
                    </div>
                </aside>
            </section>
        </div>
    );
}
