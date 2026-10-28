import React, { useState, useEffect, useRef } from "react";
import { Star, CheckCircle2, X, Loader2, MessageSquarePlus } from "lucide-react";
import api from "../../api";

export default function ReviewForm({ booking }) {
  const [isOpen, setIsOpen] = useState(false);
  const [closing, setClosing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(null);
  const [error, setError] = useState(null);
  const modalRef = useRef(null);

  const canReview = booking.status === "completed";

  const eventGuide = booking.event?.assigned_guide;
  const guide = booking.assigned_guide || eventGuide;

  const packageName =
    booking.package_name || booking.event?.package?.name || "Tour Package";

  const guideName = guide ? `${guide.first_name} ${guide.last_name}` : null;

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

  // Close on Escape
  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (e) => {
      if (e.key === "Escape") closeModal();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
    // eslint-disable-next-line
  }, [isOpen]);

  if (!canReview) return null;

  const reviewTypes = [
    { key: "package", label: "Tour Package", name: packageName },
    ...(guideName ? [{ key: "guide", label: "Tour Guide", name: guideName }] : []),
    { key: "site", label: "Visitor Center", name: "Sablayan Visitor Center" },
  ];

  const openModal = () => {
    setSuccess(null);
    setError(null);
    setIsOpen(true);
  };

  const closeModal = () => {
    setClosing(true);
    setTimeout(() => {
      setIsOpen(false);
      setClosing(false);
    }, 180);
  };

  const handleOverlayClick = (e) => {
    if (e.target === e.currentTarget) closeModal();
  };

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

    const totalRatings = Object.values(reviews).reduce((sum, r) => sum + r.rating, 0);
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

          const existing = booking.reviews?.find((r) => r.target_type === key && r.id);
          const payload = { booking: booking.id, target_type: key, rating, comment };

          return existing?.id
            ? api.patch(`/api/booking/review/${existing.id}/`, payload)
            : api.post("/api/booking/review/", payload);
        })
      );

      setSuccess("Reviews submitted successfully!");
      setTimeout(closeModal, 900);
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.detail || "Failed to submit reviews. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const renderStars = (type, rating) =>
    Array.from({ length: 5 }, (_, i) => {
      const value = i + 1;
      const filled = value <= rating;
      return (
        <button
          key={value}
          type="button"
          onClick={() => handleRatingChange(type, value)}
          disabled={submitting}
          className="disabled:opacity-50 disabled:pointer-events-none"
        >
          <Star
            size={24}
            className={`transition-transform duration-150 ${
              filled
                ? "fill-[var(--accent)] text-[var(--accent)] scale-110"
                : "text-slate-300 dark:text-slate-600 hover:text-[var(--accent)]/60"
            }`}
          />
        </button>
      );
    });

  return (
    <div className="mt-2">
      <button
        onClick={openModal}
        className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium text-white bg-[var(--accent)] hover:opacity-90 transition"
      >
        <MessageSquarePlus size={15} />
        Leave / edit review
      </button>

      {isOpen && (
        <div
          onMouseDown={handleOverlayClick}
          className={`fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 ${
            closing ? "animate-[fadeOut_0.18s_ease-in_forwards]" : "animate-[fadeIn_0.18s_ease-out]"
          }`}
        >
          <div
            ref={modalRef}
            role="dialog"
            aria-modal="true"
            className={`w-full max-w-lg max-h-[85vh] overflow-y-auto bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-100 dark:border-slate-800 ${
              closing
                ? "animate-[scaleOut_0.18s_ease-in_forwards]"
                : "animate-[scaleIn_0.2s_cubic-bezier(0.16,1,0.3,1)]"
            }`}
          >
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800 sticky top-0 bg-white dark:bg-slate-900 rounded-t-2xl">
              <h2 className="font-semibold text-slate-900 dark:text-slate-100">
                Rate your experience
              </h2>
              <button
                onClick={closeModal}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-5">
              {reviewTypes.map(({ key, label, name }) => {
                const existing = booking.reviews?.find((r) => r.target_type === key);
                return (
                  <div
                    key={key}
                    className="bg-slate-50 dark:bg-slate-800/60 rounded-xl p-4 space-y-3 border border-slate-100 dark:border-slate-800"
                  >
                    <div>
                      <h3 className="font-medium text-sm text-slate-900 dark:text-slate-100">
                        {label}
                      </h3>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{name}</p>
                    </div>

                    {existing && (
                      <span className="inline-block text-xs px-2 py-0.5 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-500 dark:text-slate-400">
                        Previously rated {existing.rating}★
                      </span>
                    )}

                    <div className="flex gap-1">{renderStars(key, reviews[key].rating)}</div>

                    <textarea
                      value={reviews[key].comment}
                      onChange={(e) => handleCommentChange(key, e.target.value)}
                      placeholder={`Share your experience about ${name}...`}
                      rows={3}
                      disabled={submitting}
                      className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent)]/20 p-3 text-sm outline-none resize-none transition"
                    />
                  </div>
                );
              })}

              {error && (
                <div className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-500/10 p-3 rounded-lg">
                  {error}
                </div>
              )}

              {success && (
                <div className="flex items-center gap-2 text-sm text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 p-3 rounded-lg">
                  <CheckCircle2 size={16} />
                  {success}
                </div>
              )}

              <button
                type="submit"
                disabled={submitting}
                className="w-full inline-flex items-center justify-center gap-2 py-3 rounded-xl bg-[var(--accent)] text-white font-medium hover:opacity-90 transition disabled:opacity-50"
              >
                {submitting && <Loader2 size={16} className="animate-spin" />}
                {submitting ? "Submitting…" : "Submit reviews"}
              </button>
            </form>
          </div>
        </div>
      )}

      <style>{`
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes fadeOut { from { opacity: 1; } to { opacity: 0; } }
        @keyframes scaleIn {
          from { opacity: 0; transform: scale(0.94) translateY(8px); }
          to { opacity: 1; transform: scale(1) translateY(0); }
        }
        @keyframes scaleOut {
          from { opacity: 1; transform: scale(1) translateY(0); }
          to { opacity: 0; transform: scale(0.96) translateY(4px); }
        }
      `}</style>
    </div>
  );
}