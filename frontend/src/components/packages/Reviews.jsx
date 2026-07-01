import { useEffect, useState } from "react";
import api from "../../api";

import {
  Star,
  User,
  ShieldAlert,
  Package as PackageIcon,
  Loader2,
  AlertCircle,
} from "lucide-react";

export default function Reviews({ packageId }) {
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const serverURL = import.meta.env.VITE_API_URL;

  useEffect(() => {
    if (!packageId) return;

    fetchReviews();
  }, [packageId]);

  async function fetchReviews() {
    try {
      setLoading(true);

      // fetch ALL reviews
      const res = await api.get("api/reviews/");

      // filter reviews belonging to this package
      const filtered = res.data.filter(
        (r) => r.package?.id === packageId
      );

      setReviews(filtered);
    } catch (err) {
      console.error(err);
      setError("Failed to load reviews.");
    } finally {
      setLoading(false);
    }
  }

  function getImageURL(path) {
    if (!path) return null;
    if (path.startsWith("http")) return path;
    return `${serverURL}${path}`;
  }

  function renderStars(rating) {
    return (
      <div className="flex items-center gap-1">
        {[...Array(5)].map((_, i) => (
          <Star
            key={i}
            size={16}
            className={
              i < rating
                ? "text-yellow-500 fill-yellow-500"
                : "text-gray-300"
            }
          />
        ))}
      </div>
    );
  }

  if (loading)
    return (
      <div className="flex items-center gap-2 text-gray-500">
        <Loader2 className="animate-spin" size={18} />
        Loading reviews...
      </div>
    );

  if (error)
    return (
      <div className="flex items-center gap-2 text-red-500">
        <AlertCircle size={18} />
        {error}
      </div>
    );

  if (!reviews.length)
    return (
      <div className="text-gray-500 italic">
        No reviews yet.
      </div>
    );

  return (
    <div className="space-y-4">
      {reviews.map((review) => {
        const reviewRemoved = !review.is_active;

        const reviewerActive =
          review.reviewer?.is_active ?? false;

        const guideActive =
          review.tour_guide?.is_active ?? false;

        const packageActive =
          review.package?.is_active ?? false;

        const reviewerImage = getImageURL(
          review.reviewer?.profile_picture
        );

        return (
          <div
            key={review.id}
            className="bg-white/40 backdrop-blur-md border border-white/30 rounded-xl p-4 shadow-sm"
          >
            {/* REVIEW REMOVED */}
            {reviewRemoved ? (
              <div className="flex items-center gap-2 text-gray-500 italic">
                <ShieldAlert size={16} />
                This review had been removed by the moderator.
              </div>
            ) : (
              <>
                {/* HEADER */}
                <div className="flex items-center gap-3 mb-2">

                  {/* profile picture */}
                  {reviewerActive && reviewerImage ? (
                    <img
                      src={reviewerImage}
                      className="w-10 h-10 rounded-full object-cover border"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center">
                      <User size={18} />
                    </div>
                  )}

                  {/* reviewer info */}
                  <div className="flex flex-col">

                    <div className="font-semibold flex items-center gap-2">
                      {reviewerActive
                        ? review.reviewer.username
                        : (
                          <span className="italic text-gray-500">
                            removed
                          </span>
                        )}
                    </div>

                    {/* package info */}
                    <div className="text-sm text-gray-600 flex items-center gap-1">
                      <PackageIcon size={14} />

                      {packageActive
                        ? review.package?.name
                        : (
                          <span className="italic">
                            removed
                          </span>
                        )}
                    </div>

                    
                  </div>

                  {/* stars */}
                  <div className="ml-auto">
                    {renderStars(review.rating)}
                  </div>
                </div>

                {/* COMMENT */}
                <div className="text-gray-800">
                  {review.comment}
                </div>

                {/* DATE */}
                <div className="text-xs text-gray-400 mt-2">
                  {new Date(
                    review.created_at
                  ).toLocaleDateString()}
                </div>
              </>
            )}
          </div>
        );
      })}
    </div>
  );
}
