import { useEffect, useMemo, useState } from 'react';
import { CheckCircle2, Clock3, XCircle } from 'lucide-react';
import {
    AdminRenewalRequest,
    RenewalRequestStatus,
    approveAdminRenewalRequest,
    getAdminRenewalRequests,
    rejectAdminRenewalRequest,
} from '../../api/admin';
import { formatPrice } from '../../api/booking';
import { useAuth } from '../../contexts/AuthContext';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';
import { toast } from '../../components/ui/Toast';

type ReviewAction = 'approve' | 'reject';

const tabs: Array<{ key: RenewalRequestStatus; label: string }> = [
    { key: 'PENDING_REVIEW', label: 'Chờ duyệt' },
    { key: 'APPROVED', label: 'Đã duyệt' },
    { key: 'REJECTED', label: 'Đã từ chối' },
    { key: 'ALL', label: 'Tất cả' },
];

function formatDateTime(value: string | null) {
    if (!value) return 'Chưa có';

    return new Intl.DateTimeFormat('vi-VN', {
        hour: '2-digit',
        minute: '2-digit',
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
    }).format(new Date(value));
}

function getStatusBadge(status: AdminRenewalRequest['status']) {
    switch (status) {
        case 'PENDING_REVIEW':
            return <Badge variant="warning">Chờ duyệt</Badge>;
        case 'APPROVED':
            return <Badge variant="success">Đã duyệt</Badge>;
        case 'REJECTED':
            return <Badge variant="error">Đã từ chối</Badge>;
        default:
            return <Badge>Không xác định</Badge>;
    }
}

export function AdminApprovals() {
    const { token } = useAuth();
    const [status, setStatus] = useState<RenewalRequestStatus>('PENDING_REVIEW');
    const [requests, setRequests] = useState<AdminRenewalRequest[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [reloadKey, setReloadKey] = useState(0);
    const [selectedRequest, setSelectedRequest] = useState<AdminRenewalRequest | null>(null);
    const [action, setAction] = useState<ReviewAction>('approve');
    const [reviewNote, setReviewNote] = useState('');
    const [actionLoading, setActionLoading] = useState(false);

    useEffect(() => {
        async function loadRequests() {
            if (!token) return;

            setLoading(true);
            setError(null);

            const result = await getAdminRenewalRequests(token, status);
            if (!result.success) {
                setError(result.error.message);
                setLoading(false);
                return;
            }

            setRequests(result.data);
            setLoading(false);
        }

        loadRequests();
    }, [reloadKey, status, token]);

    const pendingCount = useMemo(
        () => requests.filter((request) => request.status === 'PENDING_REVIEW').length,
        [requests]
    );

    function openActionModal(request: AdminRenewalRequest, nextAction: ReviewAction) {
        setSelectedRequest(request);
        setAction(nextAction);
        setReviewNote(request.reviewNote || '');
    }

    function closeActionModal() {
        setSelectedRequest(null);
        setReviewNote('');
        setAction('approve');
        setActionLoading(false);
    }

    async function handleSubmitAction() {
        if (!token || !selectedRequest) return;

        if (action === 'reject' && reviewNote.trim().length < 5) {
            toast('Lý do từ chối phải có ít nhất 5 ký tự', 'warning');
            return;
        }

        setActionLoading(true);

        const result =
            action === 'approve'
                ? await approveAdminRenewalRequest(selectedRequest.id, token, reviewNote.trim() || undefined)
                : await rejectAdminRenewalRequest(selectedRequest.id, token, reviewNote.trim());

        setActionLoading(false);

        if (!result.success) {
            toast(result.error.message, 'error');
            return;
        }

        toast(action === 'approve' ? 'Đã duyệt yêu cầu gia hạn' : 'Đã từ chối yêu cầu gia hạn', 'success');
        closeActionModal();
        setReloadKey((value) => value + 1);
    }

    return (
        <div className="space-y-6">
            <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                    <div>
                        <h1 className="text-2xl font-semibold text-slate-900">Duyệt yêu cầu gia hạn</h1>
                        <p className="mt-2 text-sm text-slate-500">
                            Admin xác nhận thủ công các renewal request do manager gửi từ màn Subscription.
                        </p>
                    </div>

                    <div className="flex items-center gap-3 rounded-2xl bg-amber-50 px-4 py-3 text-sm text-amber-900">
                        <Clock3 className="h-4 w-4" />
                        {status === 'PENDING_REVIEW'
                            ? `${pendingCount} yêu cầu đang hiển thị trong hàng chờ`
                            : 'Chuyển tab để xem toàn bộ lịch sử xử lý'}
                    </div>
                </div>
            </section>

            <section className="flex flex-wrap gap-2 border-b border-slate-200 pb-3">
                {tabs.map((tab) => (
                    <button
                        key={tab.key}
                        type="button"
                        onClick={() => setStatus(tab.key)}
                        className={`rounded-xl px-4 py-2 text-sm font-medium transition ${
                            status === tab.key ? 'bg-slate-900 text-white' : 'bg-white text-slate-500 hover:bg-slate-100 hover:text-slate-900'
                        }`}
                    >
                        {tab.label}
                    </button>
                ))}
            </section>

            {loading && (
                <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center text-slate-500 shadow-sm">
                    Đang tải danh sách duyệt...
                </div>
            )}

            {!loading && error && (
                <div className="rounded-2xl border border-rose-200 bg-rose-50 p-5 text-rose-700 shadow-sm">{error}</div>
            )}

            {!loading && !error && requests.length === 0 && (
                <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center shadow-sm">
                    <p className="text-lg font-medium text-slate-900">Không có yêu cầu phù hợp</p>
                    <p className="mt-2 text-sm text-slate-500">
                        Khi manager gửi renewal request mới, mục này sẽ tự dùng lại luồng duyệt hiện tại.
                    </p>
                </div>
            )}

            {!loading && !error && requests.length > 0 && (
                <div className="space-y-4">
                    {requests.map((request) => (
                        <article key={request.id} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                            <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                                <div className="space-y-4">
                                    <div className="flex flex-wrap items-center gap-3">
                                        <h2 className="text-lg font-semibold text-slate-900">{request.venueName}</h2>
                                        {getStatusBadge(request.status)}
                                        <Badge variant="info">{request.venueDistrict}</Badge>
                                    </div>

                                    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                                        <div>
                                            <p className="text-sm text-slate-500">Manager</p>
                                            <p className="mt-1 font-medium text-slate-900">{request.managerName}</p>
                                            <p className="text-sm text-slate-500">{request.managerEmail}</p>
                                        </div>
                                        <div>
                                            <p className="text-sm text-slate-500">Yêu cầu</p>
                                            <p className="mt-1 font-medium text-slate-900">
                                                {request.months} tháng • {request.courtCount} sân
                                            </p>
                                            <p className="text-sm text-slate-500">{formatPrice(request.amount)}đ</p>
                                        </div>
                                        <div>
                                            <p className="text-sm text-slate-500">Ngày gửi</p>
                                            <p className="mt-1 font-medium text-slate-900">{formatDateTime(request.requestedAt)}</p>
                                        </div>
                                        <div>
                                            <p className="text-sm text-slate-500">Hạn hiện tại</p>
                                            <p className="mt-1 font-medium text-slate-900">{formatDateTime(request.currentExpiresAt)}</p>
                                            <p className="text-sm text-slate-500">
                                                Dự kiến sau duyệt: {formatDateTime(request.projectedExpiresAt)}
                                            </p>
                                        </div>
                                    </div>

                                    <div className="rounded-xl bg-slate-50 p-4 text-sm text-slate-600">
                                        <p className="font-medium text-slate-900">Ghi chú manager</p>
                                        <p className="mt-2">{request.note || 'Không có ghi chú từ manager.'}</p>
                                    </div>

                                    {request.status !== 'PENDING_REVIEW' && (
                                        <div className="rounded-xl border border-slate-200 p-4 text-sm text-slate-600">
                                            <p className="font-medium text-slate-900">Kết quả xử lý</p>
                                            <p className="mt-2">
                                                {request.status === 'APPROVED' ? 'Đã duyệt' : 'Đã từ chối'} lúc {formatDateTime(request.reviewedAt)}
                                            </p>
                                            <p className="mt-1">Người xử lý: {request.reviewedByEmail || 'Không rõ'}</p>
                                            <p className="mt-1">Ghi chú: {request.reviewNote || 'Không có ghi chú nội bộ'}</p>
                                        </div>
                                    )}
                                </div>

                                {request.status === 'PENDING_REVIEW' && (
                                    <div className="flex min-w-[220px] flex-col gap-3">
                                        <Button type="button" onClick={() => openActionModal(request, 'approve')}>
                                            <CheckCircle2 className="mr-2 h-4 w-4" />
                                            Duyệt gia hạn
                                        </Button>
                                        <Button type="button" variant="danger" onClick={() => openActionModal(request, 'reject')}>
                                            <XCircle className="mr-2 h-4 w-4" />
                                            Từ chối yêu cầu
                                        </Button>
                                    </div>
                                )}
                            </div>
                        </article>
                    ))}
                </div>
            )}

            <Modal
                isOpen={Boolean(selectedRequest)}
                onClose={closeActionModal}
                title={action === 'approve' ? 'Duyệt yêu cầu gia hạn' : 'Từ chối yêu cầu gia hạn'}
                footer={
                    <>
                        <Button variant="secondary" onClick={closeActionModal}>
                            Hủy
                        </Button>
                        <Button
                            variant={action === 'approve' ? 'primary' : 'danger'}
                            onClick={handleSubmitAction}
                            loading={actionLoading}
                        >
                            {action === 'approve' ? 'Xác nhận duyệt' : 'Xác nhận từ chối'}
                        </Button>
                    </>
                }
            >
                {selectedRequest && (
                    <div className="space-y-4">
                        <div className="rounded-xl bg-slate-50 p-4 text-sm text-slate-600">
                            <p className="font-medium text-slate-900">{selectedRequest.venueName}</p>
                            <p className="mt-1">
                                {selectedRequest.managerName} • {selectedRequest.months} tháng • {formatPrice(selectedRequest.amount)}đ
                            </p>
                        </div>

                        <div>
                            <label className="mb-1 block text-sm font-medium text-slate-700">
                                {action === 'approve' ? 'Ghi chú nội bộ (tuỳ chọn)' : 'Lý do từ chối'}
                            </label>
                            <textarea
                                value={reviewNote}
                                onChange={(event) => setReviewNote(event.target.value)}
                                rows={4}
                                placeholder={
                                    action === 'approve'
                                        ? 'Ví dụ: đã đối soát thành công với giao dịch sáng nay'
                                        : 'Nhập lý do từ chối để manager biết cần xử lý lại'
                                }
                                className="w-full rounded-lg border border-slate-300 px-4 py-3 text-sm text-slate-900 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary"
                            />
                            {action === 'reject' && <p className="mt-2 text-xs text-slate-500">Bắt buộc tối thiểu 5 ký tự.</p>}
                        </div>
                    </div>
                )}
            </Modal>
        </div>
    );
}
