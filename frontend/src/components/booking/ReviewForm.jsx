import React, { useState, useEffect } from "react";
import { FaStar, FaCheckCircle } from "react-icons/fa";
import api from "../../api";

export default function ReviewForm({ booking }) {
  const [isOpen, setIsOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(null);
  const [error, setError] = useState(null);

  const canReview = booking.status === "completed";

  const eventGuide = booking.event?.assigned_guide;
  const guide = booking.assigned_guide || eventGuide;

  const packageName =
    booking.package_name || booking.event?.package?.name || "Tour Package";

  const guideName = guide
    ? `${guide.first_name} ${guide.last_name}`
    : null;

  const [reviews, setReviews] = useState({
    package: { rating: 0, comment: "" },
    guide: { rating: 0, comment: "" },
    site: { rating: 0, comment: "" },
  });

  useEffect(() => {
    if (!booking.reviews) return;

    const updated = { ...reviews };

    booking.reviews.forEach((review) => {
      if (updated[review.target_type]) {
        updated[review.target_type] = {
          rating: review.rating,
          comment: review.comment || "",
        };
      }
    });

    setReviews(updated);
    // eslint-disable-next-line
  }, [booking.reviews]);

  if (!canReview) return null;

  const reviewTypes = [
    {
      key: "package",
      label: "Tour Package",
      name: packageName,
    },
    ...(guideName
      ? [
          {
            key: "guide",
            label: "Tour Guide",
            name: guideName,
          },
        ]
      : []),
    {
      key: "site",
      label: "Visitor Center",
      name: "Sablayan Visitor Center",
    },
  ];

  const handleRatingChange = (type, value) => {
    setReviews((prev) => ({
      ...prev,
      [type]: { ...prev[type], rating: value },
    }));
  };

  const handleCommentChange = (type, value) => {
    setReviews((prev) => ({
      ...prev,
      [type]: { ...prev[type], comment: value },
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    const totalRatings = Object.values(reviews).reduce(
      (sum, r) => sum + r.rating,
      0
    );

    if (totalRatings === 0) {
      setError("Please provide at least one rating.");
      return;
    }

    try {
      setSubmitting(true);

      await Promise.all(
        reviewTypes.map(async ({ key }) => {
          const { rating, comment } = reviews[key];
          if (rating === 0) return;

          const existing = booking.reviews?.find(
            (r) => r.target_type === key && r.id
          );

          const payload = {
            booking: booking.id,
            target_type: key,
            rating,
            comment,
          };

          if (existing?.id) {
            return api.patch(`/api/booking/review/${existing.id}/`, payload);
          } else {
            return api.post("/api/booking/review/", payload);
          }
        })
      );

      setSuccess("Reviews submitted successfully!");
      setIsOpen(false);
    } catch (err) {
      console.error(err);
      setError(
        err.response?.data?.detail ||
          "Failed to submit reviews. Please try again."
      );
    } finally {
      setSubmitting(false);
    }
  };

  const renderStars = (type, rating) =>
    Array.from({ length: 5 }, (_, i) => {
      const value = i + 1;
      return (
        <FaStar
          key={value}
          onClick={() => handleRatingChange(type, value)}
          className={`text-2xl cursor-pointer transition-all duration-200 ${
            value <= rating
              ? "text-yellow-400 scale-110 drop-shadow"
              : "text-gray-300 hover:text-yellow-300"
          } ${submitting ? "pointer-events-none opacity-50" : ""}`}
        />
      );
    });

  return (
    <div className="mt-8 font-inter">
      {/* Inline Google Font Import */}
     

      <button
        onClick={() => setIsOpen(!isOpen)}
        className="px-5 py-2 rounded-full bg-gradient-to-r from-teal-500 to-emerald-500 text-white text-sm font-medium shadow-md hover:shadow-lg transition-all duration-200"
      >
        {isOpen ? "Close Review" : "Leave / Edit Review"}
      </button>

      {isOpen && (
        <form
          onSubmit={handleSubmit}
          className="mt-8 bg-white rounded-3xl shadow-2xl p-10 space-y-10 border border-gray-100"
        >
          {reviewTypes.map(({ key, label, name }) => {
            const existing = booking.reviews?.find(
              (r) => r.target_type === key
            );

            return (
              <div
                key={key}
                className="bg-gradient-to-br from-gray-50 to-white rounded-2xl p-7 space-y-5 border border-gray-100 shadow-sm hover:shadow-md transition"
              >
                <div>
                  <h3 className="font-playfair text-xl text-gray-900">
                    {label}
                  </h3>
                  <p className="text-sm text-gray-500 italic mt-1">
                    {name}
                  </p>
                </div>

                {existing && (
                  <span className="text-xs text-gray-400">
                    Previously rated {existing.rating}★
                  </span>
                )}

                <div className="flex gap-2">
                  {renderStars(key, reviews[key].rating)}
                </div>

                <textarea
                  value={reviews[key].comment}
                  onChange={(e) =>
                    handleCommentChange(key, e.target.value)
                  }
                  placeholder={`Share your experience about ${name}...`}
                  rows={4}
                  disabled={submitting}
                  className="w-full rounded-xl border border-gray-200 focus:border-teal-400 focus:ring-2 focus:ring-teal-100 p-4 text-sm transition-all outline-none resize-none"
                />
              </div>
            );
          })}

          {error && (
            <div className="text-sm text-red-600 bg-red-50 p-4 rounded-xl">
              {error}
            </div>
          )}

          {success && (
            <div className="flex items-center gap-2 text-sm text-green-600 bg-green-50 p-4 rounded-xl">
              <FaCheckCircle />
              {success}
            </div>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="w-full py-4 rounded-2xl bg-gradient-to-r from-teal-600 to-emerald-600 text-white font-semibold shadow-lg hover:shadow-xl transition-all duration-200 disabled:opacity-50"
          >
            {submitting ? "Submitting..." : "Submit Reviews"}
          </button>
        </form>
      )}
    </div>
  );
}
