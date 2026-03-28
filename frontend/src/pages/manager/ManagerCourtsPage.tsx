import { useEffect, useState } from 'react';
import { ImagePlus, Pencil, Save, Star, Trash2 } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import {
    addVenueImage,
    deleteVenueImage,
    getManagerCourts,
    ManagerCourtList,
    setVenueCoverImage,
    updateManagerCourt,
} from '../../api/manager';
import { formatPrice } from '../../api/booking';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { toast } from '../../components/ui/Toast';

type CourtDraft = {
    id: string;
    name: string;
    pricePerHour: string;
    isActive: boolean;
};

export default function ManagerCourtsPage() {
    const { token } = useAuth();
    const [data, setData] = useState<ManagerCourtList | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [draft, setDraft] = useState<CourtDraft | null>(null);
    const [savingCourtId, setSavingCourtId] = useState<string | null>(null);
    const [newImageUrl, setNewImageUrl] = useState('');
    const [newImageIsCover, setNewImageIsCover] = useState(false);
    const [imageLoading, setImageLoading] = useState(false);

    useEffect(() => {
        async function loadData() {
            if (!token) return;

            setLoading(true);
            setError(null);

            const result = await getManagerCourts(token);
            if (!result.success) {
                setError(result.error.message);
                setLoading(false);
                return;
            }

            setData(result.data);
            setLoading(false);
        }

        loadData();
    }, [token]);

    async function refreshCourts() {
        if (!token) return;
        const result = await getManagerCourts(token);
        if (result.success) {
            setData(result.data);
        }
    }

    async function handleSaveCourt() {
        if (!token || !draft || !data) return;

        const payload = {
            name: draft.name.trim(),
            pricePerHour: Number(draft.pricePerHour),
            isActive: draft.isActive,
        };

        setSavingCourtId(draft.id);
        const result = await updateManagerCourt(draft.id, payload, token);
        setSavingCourtId(null);

        if (!result.success) {
            toast(result.error.message, 'error');
            return;
        }

        setData({
            ...data,
            courts: data.courts.map((court) =>
                court.id === draft.id
                    ? { ...court, ...result.data, upcomingBookings: court.upcomingBookings }
                    : court
            ),
        });
        setDraft(null);
        toast('Đã cập nhật sân', 'success');
    }

    async function handleAddImage() {
        if (!token || !data || !newImageUrl.trim()) return;

        setImageLoading(true);
        const result = await addVenueImage(
            { url: newImageUrl.trim(), isCover: newImageIsCover },
            token
        );
        setImageLoading(false);

        if (!result.success) {
            toast(result.error.message, 'error');
            return;
        }

        setData({
            ...data,
            venue: {
                ...data.venue,
                images: result.data,
            },
        });
        setNewImageUrl('');
        setNewImageIsCover(false);
        toast('Đã thêm ảnh venue', 'success');
    }

    async function handleSetCover(imageId: string) {
        if (!token || !data) return;

        const result = await setVenueCoverImage(imageId, token);
        if (!result.success) {
            toast(result.error.message, 'error');
            return;
        }

        setData({
            ...data,
            venue: {
                ...data.venue,
                images: result.data,
            },
        });
        toast('Đã cập nhật ảnh đại diện', 'success');
    }

    async function handleDeleteImage(imageId: string) {
        if (!token || !data) return;

        const result = await deleteVenueImage(imageId, token);
        if (!result.success) {
            toast(result.error.message, 'error');
            return;
        }

        setData({
            ...data,
            venue: {
                ...data.venue,
                images: result.data,
            },
        });
        toast('Đã xóa ảnh', 'success');
    }

    if (loading) {
        return <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center text-slate-500 shadow-sm">Đang tải dữ liệu sân...</div>;
    }

    if (error || !data) {
        return <div className="rounded-2xl border border-rose-200 bg-rose-50 p-5 text-rose-700 shadow-sm">{error || 'Không thể tải dữ liệu sân'}</div>;
    }

    return (
        <div className="space-y-6">
            <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                    <div>
                        <h1 className="text-2xl font-semibold text-slate-900">Quản lý sân và gallery</h1>
                        <p className="mt-2 text-sm text-slate-500">
                            Cập nhật giá, trạng thái hoạt động và ảnh hiển thị cho venue.
                        </p>
                    </div>
                    <div className="text-sm text-slate-600">
                        <p className="font-medium text-slate-900">{data.venue.name}</p>
                        <p>{data.venue.address}</p>
                        <p>
                            {data.venue.district}, {data.venue.city}
                        </p>
                    </div>
                </div>

                <div className="mt-6 grid gap-4 xl:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
                    <div>
                        <div className="mb-3 flex items-center justify-between">
                            <h2 className="text-lg font-semibold text-slate-900">Ảnh venue</h2>
                            <Badge variant="info">
                                {data.venue.images.length}/{data.limits.maxImages} ảnh
                            </Badge>
                        </div>

                        {data.venue.images.length === 0 && (
                            <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center text-sm text-slate-500">
                                Chưa có ảnh. Thêm ít nhất 1 ảnh để venue hiển thị tốt hơn.
                            </div>
                        )}

                        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                            {data.venue.images.map((image) => (
                                <div key={image.id} className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
                                    <img src={image.url} alt="Venue" className="h-40 w-full object-cover" />
                                    <div className="space-y-3 p-4">
                                        <div className="flex items-center justify-between">
                                            {image.isCover ? <Badge variant="success">Ảnh đại diện</Badge> : <Badge>Ảnh phụ</Badge>}
                                            <div className="flex items-center gap-2">
                                                {!image.isCover && (
                                                    <button
                                                        type="button"
                                                        onClick={() => handleSetCover(image.id)}
                                                        className="rounded-lg p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-900"
                                                        title="Đặt làm ảnh đại diện"
                                                    >
                                                        <Star className="h-4 w-4" />
                                                    </button>
                                                )}
                                                <button
                                                    type="button"
                                                    onClick={() => handleDeleteImage(image.id)}
                                                    className="rounded-lg p-2 text-rose-500 transition hover:bg-rose-50"
                                                    title="Xóa ảnh"
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </button>
                                            </div>
                                        </div>
                                        <p className="truncate text-xs text-slate-400">{image.url}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
                        <div className="flex items-center gap-2">
                            <ImagePlus className="h-5 w-5 text-slate-600" />
                            <h2 className="text-lg font-semibold text-slate-900">Thêm ảnh mới</h2>
                        </div>
                        <div className="mt-4 space-y-4">
                            <Input
                                label="URL ảnh"
                                value={newImageUrl}
                                onChange={(event) => setNewImageUrl(event.target.value)}
                                placeholder="https://..."
                            />
                            <label className="flex items-center gap-2 text-sm text-slate-700">
                                <input
                                    type="checkbox"
                                    checked={newImageIsCover}
                                    onChange={(event) => setNewImageIsCover(event.target.checked)}
                                />
                                Đặt làm ảnh đại diện ngay
                            </label>
                            <Button onClick={handleAddImage} loading={imageLoading} disabled={!newImageUrl.trim()}>
                                Thêm ảnh
                            </Button>
                        </div>

                        <div className="mt-6 rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-600">
                            <p className="font-medium text-slate-900">Thông tin venue</p>
                            <p className="mt-2">{data.venue.description || 'Chưa có mô tả venue.'}</p>
                            <div className="mt-4 space-y-1">
                                <p>Ngân hàng QR: {data.venue.bankName || 'Chưa cấu hình'}</p>
                                <p>STK: {data.venue.bankAccountNumber || 'Chưa cấu hình'}</p>
                                <p>Chủ TK: {data.venue.bankAccountName || 'Chưa cấu hình'}</p>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="mb-4 flex items-center justify-between">
                    <div>
                        <h2 className="text-lg font-semibold text-slate-900">Danh sách sân con</h2>
                        <p className="text-sm text-slate-500">Mỗi thay đổi giá chỉ áp dụng cho booking mới.</p>
                    </div>
                    <Button variant="secondary" size="sm" onClick={refreshCourts}>
                        Làm mới
                    </Button>
                </div>

                <div className="grid gap-4 lg:grid-cols-2">
                    {data.courts.map((court) => {
                        const isEditing = draft?.id === court.id;

                        return (
                            <div key={court.id} className="rounded-2xl border border-slate-200 p-5">
                                <div className="flex items-start justify-between gap-4">
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <h3 className="text-lg font-semibold text-slate-900">{court.name}</h3>
                                            <Badge variant={court.isActive ? 'success' : 'error'}>
                                                {court.isActive ? 'Đang mở' : 'Đang ẩn'}
                                            </Badge>
                                        </div>
                                        <p className="mt-1 text-sm text-slate-500">{court.sportType.name}</p>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() =>
                                            setDraft({
                                                id: court.id,
                                                name: court.name,
                                                pricePerHour: String(court.pricePerHour),
                                                isActive: court.isActive,
                                            })
                                        }
                                        className="rounded-lg border border-slate-200 p-2 text-slate-500 transition hover:bg-slate-50 hover:text-slate-900"
                                        title="Sửa sân"
                                    >
                                        <Pencil className="h-4 w-4" />
                                    </button>
                                </div>

                                <div className="mt-4 grid gap-3 text-sm text-slate-600 md:grid-cols-2">
                                    <div className="rounded-xl bg-slate-50 p-3">
                                        <p className="text-slate-500">Giá / giờ</p>
                                        <p className="mt-1 text-lg font-semibold text-slate-900">
                                            {formatPrice(court.pricePerHour)}đ
                                        </p>
                                    </div>
                                    <div className="rounded-xl bg-slate-50 p-3">
                                        <p className="text-slate-500">Booking sắp tới</p>
                                        <p className="mt-1 text-lg font-semibold text-slate-900">{court.upcomingBookings}</p>
                                    </div>
                                </div>

                                {isEditing && draft && (
                                    <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                                        <div className="grid gap-4 md:grid-cols-2">
                                            <Input
                                                label="Tên sân"
                                                value={draft.name}
                                                onChange={(event) => setDraft({ ...draft, name: event.target.value })}
                                            />
                                            <Input
                                                label="Giá / giờ"
                                                type="number"
                                                min={10000}
                                                value={draft.pricePerHour}
                                                onChange={(event) => setDraft({ ...draft, pricePerHour: event.target.value })}
                                            />
                                        </div>
                                        <label className="mt-4 flex items-center gap-2 text-sm text-slate-700">
                                            <input
                                                type="checkbox"
                                                checked={draft.isActive}
                                                onChange={(event) => setDraft({ ...draft, isActive: event.target.checked })}
                                            />
                                            Đang mở bán trên hệ thống
                                        </label>

                                        <div className="mt-4 flex gap-3">
                                            <Button
                                                onClick={handleSaveCourt}
                                                loading={savingCourtId === court.id}
                                                disabled={!draft.name.trim() || !draft.pricePerHour}
                                            >
                                                <Save className="mr-2 h-4 w-4" />
                                                Lưu thay đổi
                                            </Button>
                                            <Button variant="secondary" onClick={() => setDraft(null)}>
                                                Hủy
                                            </Button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            </section>
        </div>
    );
}
