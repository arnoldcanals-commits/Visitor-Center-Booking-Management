import React, { useContext, useState, useMemo } from "react";
import { TourGuideDataContext } from "../../contexts/TourGuideDataContext";
import { FaList, FaThLarge, FaStar, FaSearch } from "react-icons/fa";

// Dark mode (the "dark" class on <html>) and the --accent CSS variable are
// applied globally by AuthProvider from the user's saved profile, so this
// component just needs dark: variants and var(--accent) — no need to read
// AuthContext directly here.

// ASSUMED REVIEW SHAPE (no serializer was provided, so adjust field names
// if your api/guide/reviews/ response differs):
//   { id, rating, comment, created_at, reviewer_name, booking: { package_name } }
// The Review model supports target_type "package" | "guide" | "site" on the
// same table, so this filters defensively to guide-targeted reviews in case
// the endpoint ever returns a mixed set.

// ================= STATUS PILL =================
// tone="accent" uses the user's saved brand color — used here for the
// review date, per request.
const StatusPill = ({ tone = "neutral", children }) => {
  const tones = {
    neutral: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
    accent: "bg-[var(--accent)] text-white",
  };
  return (
    <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium whitespace-nowrap ${tones[tone]}`}>
      {children}
    </span>
  );
};

// ================= STARS =================
const Stars = ({ rating, size = 13 }) => (
  <div className="flex items-center gap-0.5" aria-label={`${rating} out of 5 stars`}>
    {[1, 2, 3, 4, 5].map((n) => (
      <FaStar
        key={n}
        size={size}
        className={n <= rating ? "text-[var(--accent)]" : "text-gray-200 dark:text-gray-700"}
      />
    ))}
  </div>
);

// ================= STAR FILTER =================
const StarFilter = ({ value, onChange }) => (
  <div className="flex items-center gap-1 rounded-md border border-gray-200 dark:border-gray-800 p-1 shrink-0 overflow-x-auto">
    {[null, 5, 4, 3, 2, 1].map((star) => (
      <button
        key={star ?? "all"}
        onClick={() => onChange(star)}
        aria-pressed={value === star}
        className={`px-2.5 py-1.5 rounded text-xs font-medium flex items-center gap-1 shrink-0 transition-colors ${
          value === star
            ? "bg-[var(--accent)] text-white"
            : "text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-900"
        }`}
      >
        {star === null ? (
          "All"
        ) : (
          <>
            {star} <FaStar size={9} />
          </>
        )}
      </button>
    ))}
  </div>
);

// ================= VIEW TOGGLE =================
const ViewToggle = ({ view, onChange }) => (
  <div className="flex items-center gap-1 rounded-md border border-gray-200 dark:border-gray-800 p-1 shrink-0">
    {[
      { key: "list", icon: FaList, label: "List view" },
      { key: "grid", icon: FaThLarge, label: "Grid view" },
    ].map(({ key, icon: Icon, label }) => (
      <button
        key={key}
        onClick={() => onChange(key)}
        aria-label={label}
        aria-pressed={view === key}
        className={`p-1.5 rounded transition-colors ${
          view === key
            ? "bg-[var(--accent)] text-white"
            : "text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-900"
        }`}
      >
        <Icon size={13} />
      </button>
    ))}
  </div>
);

// ================= RATING SUMMARY =================
function ReviewSummary({ reviews }) {
  const total = reviews.length;
  const average = total > 0 ? reviews.reduce((sum, r) => sum + r.rating, 0) / total : 0;

  const breakdown = [5, 4, 3, 2, 1].map((star) => ({
    star,
    count: reviews.filter((r) => r.rating === star).length,
  }));

  return (
    <div className="rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-5 flex flex-col sm:flex-row gap-6">
      <div className="flex flex-col items-center justify-center gap-1 sm:border-r sm:border-gray-100 sm:dark:border-gray-800 sm:pr-6 shrink-0">
        <span className="text-3xl font-semibold tracking-tight">{average.toFixed(1)}</span>
        <Stars rating={Math.round(average)} size={12} />
        <span className="text-xs text-gray-500 dark:text-gray-400">
          {total} review{total !== 1 ? "s" : ""}
        </span>
      </div>

      <div className="flex-1 space-y-1.5 justify-center flex flex-col">
        {breakdown.map(({ star, count }) => {
          const pct = total > 0 ? Math.round((count / total) * 100) : 0;
          return (
            <div key={star} className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
              <span className="w-3 text-right">{star}</span>
              <FaStar size={9} className="text-gray-300 dark:text-gray-700" />
              <div className="flex-1 bg-gray-100 dark:bg-gray-800 h-1.5 rounded-full overflow-hidden">
                <div
                  className="bg-[var(--accent)] h-1.5 rounded-full transition-all duration-500"
                  style={{ width: `${pct}%` }}
                />
              </div>
              <span className="w-6 text-right">{count}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ================= MAIN COMPONENT =================
export default function TourGuideReviews() {
  const { guideData, loading } = useContext(TourGuideDataContext);
  const [view, setView] = useState("list");
  const [search, setSearch] = useState("");
  const [starFilter, setStarFilter] = useState(null);

  const reviews = (guideData?.reviews ?? []).filter(
    (r) => !r.target_type || r.target_type === "guide"
  );

  const filteredReviews = useMemo(() => {
    const query = search.trim().toLowerCase();

    return reviews.filter((review) => {
      if (starFilter !== null && review.rating !== starFilter) return false;
      if (!query) return true;

      const reviewerName =
  review.reviewer_name ??
  review.reviewer?.full_name ??
  review.reviewer?.username ??
  "Anonymous guest";
      const packageName = review.booking?.package_name ?? review.package_name ?? "";
      const haystack = `${reviewerName} ${packageName} ${review.comment ?? ""}`.toLowerCase();
      return haystack.includes(query);
    });
  }, [reviews, search, starFilter]);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100">
      <div className="max-w-5xl mx-auto p-4 md:p-6 space-y-6">
        {/* ================= HEADER ================= */}
        <div className="flex items-start justify-between gap-4 bg-white dark:bg-gray-900 rounded-xl shadow p-4 border border-transparent dark:border-gray-800">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">My reviews</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Feedback visitors have left about your tours
            </p>
          </div>
        </div>

        {/* ================= LOADING ================= */}
        {loading && (
          <p className="text-sm text-gray-500 dark:text-gray-400">Loading reviews…</p>
        )}

        {/* ================= EMPTY STATE (no reviews at all) ================= */}
        {!loading && reviews.length === 0 && (
          <div className="rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-8 text-center text-sm text-gray-500 dark:text-gray-400">
            No reviews yet.
          </div>
        )}

        {/* ================= SUMMARY + TOOLBAR + LIST/GRID ================= */}
        {!loading && reviews.length > 0 && (
          <>
            <ReviewSummary reviews={reviews} />

            <div className="flex flex-col sm:flex-row sm:items-center gap-3">
              <div className="relative flex-1">
                <FaSearch
                  size={13}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500"
                />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search by guest, tour, or comment"
                  className="w-full pl-9 pr-3 py-2 text-sm rounded-md border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
                />
              </div>
              <StarFilter value={starFilter} onChange={setStarFilter} />
              <ViewToggle view={view} onChange={setView} />
            </div>

            {filteredReviews.length === 0 ? (
              <div className="rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-8 text-center text-sm text-gray-500 dark:text-gray-400">
                No reviews match your search or filter.
              </div>
            ) : view === "grid" ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredReviews.map((review) => (
                  <ReviewCard key={review.id} review={review} />
                ))}
              </div>
            ) : (
              <div className="rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 divide-y divide-gray-100 dark:divide-gray-800 overflow-hidden">
                {filteredReviews.map((review) => (
                  <ReviewRow key={review.id} review={review} />
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

// =====================================================
// Review Card (grid view)
// =====================================================
function ReviewCard({ review }) {
  const packageName = review.booking?.package_name ?? review.package_name;
  const reviewerName =
                  review.reviewer_name ??
                  review.reviewer?.full_name ??
                  review.reviewer?.username ??
                  "Anonymous guest";
  return (
    <div className="flex flex-col justify-between h-full rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-5">
      <div className="space-y-2">
        <div className="flex items-center justify-between gap-2">
          <Stars rating={review.rating} />
          {review.created_at && (
            <StatusPill tone="accent">{new Date(review.created_at).toLocaleDateString()}</StatusPill>
          )}
        </div>
        {review.comment ? (
          <p className="text-sm text-gray-700 dark:text-gray-300 line-clamp-4">{review.comment}</p>
        ) : (
          <p className="text-sm text-gray-400 dark:text-gray-500 italic">No comment left</p>
        )}
      </div>

      <div className="mt-4 pt-3 border-t border-gray-100 dark:border-gray-800 text-xs text-gray-500 dark:text-gray-400 space-y-0.5">
        <p className="font-medium text-gray-700 dark:text-gray-300">{reviewerName}</p>
        {packageName && <p>{packageName}</p>}
      </div>
    </div>
  );
}

// =====================================================
// Review Row (list view)
// =====================================================
function ReviewRow({ review }) {
  const packageName = review.booking?.package_name ?? review.package_name;
  const reviewerName =
  review.reviewer_name ??
  review.reviewer?.full_name ??
  review.reviewer?.username ??
  "Anonymous guest";
  return (
    <div className="flex items-start gap-4 px-4 py-3.5">
      <Stars rating={review.rating} size={12} />
      <div className="min-w-0 flex-1 space-y-1">
        {review.comment ? (
          <p className="text-sm text-gray-700 dark:text-gray-300">{review.comment}</p>
        ) : (
          <p className="text-sm text-gray-400 dark:text-gray-500 italic">No comment left</p>
        )}
        <p className="text-xs text-gray-500 dark:text-gray-400">
          {reviewerName}
          {packageName && ` · ${packageName}`}
        </p>
      </div>
      {review.created_at && (
        <span className="shrink-0">
          <StatusPill tone="accent">{new Date(review.created_at).toLocaleDateString()}</StatusPill>
        </span>
      )}
    </div>
  );
}