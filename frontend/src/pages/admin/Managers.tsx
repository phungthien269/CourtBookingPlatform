import { useEffect, useMemo, useState } from 'react';
import { Lock, Plus, Unlock } from 'lucide-react';
import {
    AdminManager,
    AdminManagerStatusFilter,
    createAdminManager,
    getAdminManagers,
    updateAdminManagerStatus,
} from '../../api/admin';
import { useAuth } from '../../contexts/AuthContext';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Modal } from '../../components/ui/Modal';
import { toast } from '../../components/ui/Toast';

const statusOptions: Array<{ value: AdminManagerStatusFilter; label: string }> = [
    { value: 'ALL', label: 'Tất cả' },
    { value: 'ACTIVE', label: 'Hoạt động' },
    { value: 'LOCKED', label: 'Đã khóa' },
    { value: 'EXPIRED', label: 'Hết hạn' },
    { value: 'NO_VENUE', label: 'Chưa có venue' },
];

function formatDate(value: string | null) {
    if (!value) return 'Chưa có';

    return new Intl.DateTimeFormat('vi-VN', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
    }).format(new Date(value));
}

function getAccessBadge(manager: AdminManager) {
    switch (manager.accessState) {
        case 'ACTIVE':
            return <Badge variant="success">Hoạt động</Badge>;
        case 'LOCKED':
            return <Badge variant="error">Đã khóa</Badge>;
        case 'EXPIRED':
            return <Badge variant="warning">Hết hạn</Badge>;
        case 'NO_VENUE':
            return <Badge variant="default">Chưa có venue</Badge>;
        default:
            return <Badge variant="default">Không xác định</Badge>;
    }
}

export function AdminManagers() {
    const { token } = useAuth();
    const [status, setStatus] = useState<AdminManagerStatusFilter>('ALL');
    const [query, setQuery] = useState('');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [managers, setManagers] = useState<AdminManager[]>([]);
    const [reloadKey, setReloadKey] = useState(0);
    const [modalOpen, setModalOpen] = useState(false);
    const [submitLoading, setSubmitLoading] = useState(false);
    const [createForm, setCreateForm] = useState({
        email: '',
        password: '',
        name: '',
        displayName: '',
    });
    const [updatingManagerId, setUpdatingManagerId] = useState<string | null>(null);

    useEffect(() => {
        async function loadManagers() {
            if (!token) return;

            setLoading(true);
            setError(null);

            const result = await getAdminManagers(token, {
                status,
                query: query.trim() || undefined,
            });

            if (!result.success) {
                setError(result.error.message);
                setLoading(false);
                return;
            }

            setManagers(result.data);
            setLoading(false);
        }

        loadManagers();
    }, [query, reloadKey, status, token]);

    const stats = useMemo(() => {
        return {
            total: managers.length,
            active: managers.filter((manager) => manager.accessState === 'ACTIVE').length,
            locked: managers.filter((manager) => manager.accessState === 'LOCKED').length,
            noVenue: managers.filter((manager) => manager.accessState === 'NO_VENUE').length,
        };
    }, [managers]);

    function closeModal() {
        setModalOpen(false);
        setCreateForm({
            email: '',
            password: '',
            name: '',
            displayName: '',
        });
        setSubmitLoading(false);
    }

    async function handleCreateManager() {
        if (!token) return;

        setSubmitLoading(true);
        const result = await createAdminManager(createForm, token);
        setSubmitLoading(false);

        if (!result.success) {
            toast(result.error.message, 'error');
            return;
        }

        toast('Đã tạo tài khoản manager mới', 'success');
        closeModal();
        setReloadKey((value) => value + 1);
    }

    async function handleToggleLock(manager: AdminManager) {
        if (!token) return;

        const nextStatus = manager.userStatus === 'LOCKED' ? 'ACTIVE' : 'LOCKED';
        setUpdatingManagerId(manager.id);

        const result = await updateAdminManagerStatus(manager.id, nextStatus, token);
        setUpdatingManagerId(null);

        if (!result.success) {
            toast(result.error.message, 'error');
            return;
        }

        toast(nextStatus === 'LOCKED' ? 'Đã khóa manager' : 'Đã mở khóa manager', 'success');
        setManagers((prev) => prev.map((item) => (item.id === result.data.id ? result.data : item)));
    }

    return (
        <div className="space-y-6">
            <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                    <div>
                        <h1 className="text-2xl font-semibold text-slate-900">Quản lý manager</h1>
                        <p className="mt-2 text-sm text-slate-500">
                            Tạo tài khoản manager mới, theo dõi trạng thái subscription và khóa/mở khóa truy cập.
                        </p>
                    </div>

                    <Button onClick={() => setModalOpen(true)}>
                        <Plus className="mr-2 h-4 w-4" />
                        Tạo Manager mới
                    </Button>
                </div>
            </section>

            <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                    <p className="text-sm text-slate-500">Đang hiển thị</p>
                    <p className="mt-3 text-3xl font-semibold text-slate-900">{stats.total}</p>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                    <p className="text-sm text-slate-500">Hoạt động</p>
                    <p className="mt-3 text-3xl font-semibold text-emerald-700">{stats.active}</p>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                    <p className="text-sm text-slate-500">Đã khóa</p>
                    <p className="mt-3 text-3xl font-semibold text-rose-700">{stats.locked}</p>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                    <p className="text-sm text-slate-500">Chưa có venue</p>
                    <p className="mt-3 text-3xl font-semibold text-slate-900">{stats.noVenue}</p>
                </div>
            </section>

            <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="grid gap-4 lg:grid-cols-[220px_minmax(0,1fr)]">
                    <div>
                        <label className="mb-1 block text-sm font-medium text-slate-700">Trạng thái</label>
                        <select
                            value={status}
                            onChange={(event) => setStatus(event.target.value as AdminManagerStatusFilter)}
                            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                        >
                            {statusOptions.map((option) => (
                                <option key={option.value} value={option.value}>
                                    {option.label}
                                </option>
                            ))}
                        </select>
                    </div>

                    <Input
                        label="Tìm kiếm"
                        value={query}
                        onChange={(event) => setQuery(event.target.value)}
                        placeholder="Tên manager, email, venue hoặc quận"
                    />
                </div>
            </section>

            {loading && (
                <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center text-slate-500 shadow-sm">
                    Đang tải danh sách manager...
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
                                    <th className="px-5 py-4 font-medium">Manager</th>
                                    <th className="px-5 py-4 font-medium">Venue</th>
                                    <th className="px-5 py-4 font-medium">Subscription</th>
                                    <th className="px-5 py-4 font-medium">Trạng thái</th>
                                    <th className="px-5 py-4 font-medium">Tạo lúc</th>
                                    <th className="px-5 py-4 font-medium text-right">Thao tác</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {managers.length === 0 && (
                                    <tr>
                                        <td colSpan={6} className="px-5 py-10 text-center text-slate-500">
                                            Không có manager phù hợp với bộ lọc hiện tại.
                                        </td>
                                    </tr>
                                )}

                                {managers.map((manager) => (
                                    <tr key={manager.id}>
                                        <td className="px-5 py-4 align-top">
                                            <p className="font-medium text-slate-900">{manager.displayName}</p>
                                            <p className="mt-1 text-slate-600">{manager.contactName || 'Chưa có tên liên hệ'}</p>
                                            <p className="mt-1 text-xs text-slate-500">{manager.email}</p>
                                        </td>
                                        <td className="px-5 py-4 align-top text-slate-600">
                                            {manager.venue ? (
                                                <>
                                                    <p className="font-medium text-slate-900">{manager.venue.name}</p>
                                                    <p className="mt-1">{manager.venue.district}, {manager.venue.city}</p>
                                                    <p className="mt-1 text-xs text-slate-500">{manager.courtStats.active}/{manager.courtStats.total} sân active</p>
                                                </>
                                            ) : (
                                                <span className="text-slate-500">Chưa có venue</span>
                                            )}
                                        </td>
                                        <td className="px-5 py-4 align-top text-slate-600">
                                            <p className="font-medium text-slate-900">{formatDate(manager.subscription.expiresAt)}</p>
                                            <p className="mt-1 text-xs text-slate-500">
                                                {manager.subscription.status === 'UNSET' && 'Chưa có gói'}
                                                {manager.subscription.status === 'ACTIVE' &&
                                                    `Còn ${manager.subscription.daysRemaining ?? 0} ngày`}
                                                {manager.subscription.status === 'EXPIRED' && 'Đã hết hạn'}
                                            </p>
                                        </td>
                                        <td className="px-5 py-4 align-top">
                                            <div className="flex flex-wrap gap-2">
                                                {getAccessBadge(manager)}
                                                <Badge variant={manager.userStatus === 'LOCKED' ? 'error' : 'info'}>
                                                    {manager.userStatus === 'LOCKED' ? 'User LOCKED' : 'User ACTIVE'}
                                                </Badge>
                                            </div>
                                        </td>
                                        <td className="px-5 py-4 align-top text-slate-600">{formatDate(manager.createdAt)}</td>
                                        <td className="px-5 py-4 align-top text-right">
                                            <Button
                                                type="button"
                                                variant={manager.userStatus === 'LOCKED' ? 'secondary' : 'danger'}
                                                size="sm"
                                                loading={updatingManagerId === manager.id}
                                                onClick={() => handleToggleLock(manager)}
                                            >
                                                {manager.userStatus === 'LOCKED' ? (
                                                    <>
                                                        <Unlock className="mr-2 h-4 w-4" />
                                                        Mở khóa
                                                    </>
                                                ) : (
                                                    <>
                                                        <Lock className="mr-2 h-4 w-4" />
                                                        Khóa
                                                    </>
                                                )}
                                            </Button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </section>
            )}

            <Modal
                isOpen={modalOpen}
                onClose={closeModal}
                title="Tạo tài khoản manager"
                footer={
                    <>
                        <Button variant="secondary" onClick={closeModal}>
                            Hủy
                        </Button>
                        <Button onClick={handleCreateManager} loading={submitLoading}>
                            Tạo tài khoản
                        </Button>
                    </>
                }
            >
                <div className="space-y-4">
                    <Input
                        label="Tên liên hệ"
                        value={createForm.name}
                        onChange={(event) => setCreateForm((prev) => ({ ...prev, name: event.target.value }))}
                        placeholder="Ví dụ: Nguyễn Văn Manager"
                    />
                    <Input
                        label="Email đăng nhập"
                        type="email"
                        value={createForm.email}
                        onChange={(event) => setCreateForm((prev) => ({ ...prev, email: event.target.value }))}
                        placeholder="manager-new@courtbooking.vn"
                    />
                    <Input
                        label="Tên hiển thị manager"
                        value={createForm.displayName}
                        onChange={(event) => setCreateForm((prev) => ({ ...prev, displayName: event.target.value }))}
                        placeholder="Ví dụ: Sân Bình Thạnh Center"
                    />
                    <Input
                        label="Mật khẩu tạm"
                        type="password"
                        value={createForm.password}
                        onChange={(event) => setCreateForm((prev) => ({ ...prev, password: event.target.value }))}
                        placeholder="Tối thiểu 8 ký tự"
                    />

                    <div className="rounded-xl bg-slate-50 p-4 text-sm text-slate-600">
                        Tài khoản được tạo ở trạng thái đã verify email. Venue có thể bổ sung sau ở các bước quản trị tiếp theo.
                    </div>
                </div>
            </Modal>
        </div>
    );
}
