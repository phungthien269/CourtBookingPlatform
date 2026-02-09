/**
 * ReviewList - Phase 5
 * Display list of reviews with masked user names
 */

import { ReviewItem } from '../../api/review';
import StarRating from './StarRating';

interface ReviewListProps {
    reviews: ReviewItem[];
    loading?: boolean;
}

export default function ReviewList({ reviews, loading }: ReviewListProps) {
    if (loading) {
        return (
            <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                    <div key={i} className="animate-pulse">
                        <div className="h-4 bg-gray-200 rounded w-32 mb-2"></div>
                        <div className="h-3 bg-gray-200 rounded w-48 mb-2"></div>
                        <div className="h-3 bg-gray-200 rounded w-full"></div>
                    </div>
                ))}
            </div>
        );
    }

    if (reviews.length === 0) {
        return (
            <div className="text-center py-8 text-gray-500">
                Chưa có đánh giá nào
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {reviews.map((review) => (
                <div key={review.id} className="bg-white border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                            <StarRating value={review.rating} readonly size="sm" />
                            <span className="text-sm text-gray-500">
                                {review.userDisplayName}
                            </span>
                        </div>
                        <span className="text-xs text-gray-400">
                            {new Date(review.createdAt).toLocaleDateString('vi-VN')}
                        </span>
                    </div>
                    {review.comment && (
                        <p className="text-gray-700 text-sm">{review.comment}</p>
                    )}
                </div>
            ))}
        </div>
    );
}
