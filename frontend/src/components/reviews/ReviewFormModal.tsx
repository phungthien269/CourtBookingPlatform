/**
 * ReviewFormModal - Phase 5
 * Modal form for submitting a review
 */

import { useState } from 'react';
import { Button } from '../ui/Button';
import StarRating from './StarRating';
import { createReview } from '../../api/review';

interface ReviewFormModalProps {
    token: string;
    bookingId: string;
    venueName: string;
    onClose: () => void;
    onSuccess: () => void;
}

export default function ReviewFormModal({
    token,
    bookingId,
    venueName,
    onClose,
    onSuccess,
}: ReviewFormModalProps) {
    const [rating, setRating] = useState(5);
    const [comment, setComment] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            const result = await createReview(token, bookingId, rating, comment || undefined);

            if (!result.success) {
                setError(result.error?.message || 'Có lỗi xảy ra');
                return;
            }

            onSuccess();
        } catch (err) {
            setError('Có lỗi xảy ra khi gửi đánh giá');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg max-w-md w-full p-6">
                <h3 className="text-lg font-semibold mb-1">Đánh giá sân</h3>
                <p className="text-sm text-gray-500 mb-4">{venueName}</p>

                <form onSubmit={handleSubmit}>
                    <div className="mb-4">
                        <label className="block text-sm font-medium mb-2">
                            Đánh giá của bạn
                        </label>
                        <div className="flex items-center gap-3">
                            <StarRating value={rating} onChange={setRating} size="lg" />
                            <span className="text-gray-600">{rating}/5</span>
                        </div>
                    </div>

                    <div className="mb-4">
                        <label className="block text-sm font-medium mb-2">
                            Nhận xét (tùy chọn)
                        </label>
                        <textarea
                            value={comment}
                            onChange={(e) => setComment(e.target.value)}
                            maxLength={300}
                            rows={3}
                            placeholder="Chia sẻ trải nghiệm của bạn..."
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary resize-none"
                        />
                        <div className="text-right text-xs text-gray-400 mt-1">
                            {comment.length}/300
                        </div>
                    </div>

                    {error && (
                        <div className="mb-4 p-3 bg-red-50 text-red-600 rounded-lg text-sm">
                            {error}
                        </div>
                    )}

                    <div className="flex gap-3">
                        <Button
                            type="button"
                            variant="secondary"
                            onClick={onClose}
                            disabled={loading}
                            className="flex-1"
                        >
                            Hủy
                        </Button>
                        <Button
                            type="submit"
                            disabled={loading}
                            className="flex-1"
                        >
                            {loading ? 'Đang gửi...' : 'Gửi đánh giá'}
                        </Button>
                    </div>
                </form>
            </div>
        </div>
    );
}
