import React, { useContext } from "react";
import { Link } from "react-router-dom";
import { TourGuideDataContext } from "../../contexts/TourGuideDataContext";
import {
  Calendar,
  ClipboardList,
  Users,
  Star,
  ChevronRight,
} from "lucide-react";

// Dark mode (the "dark" class on <html>) and the --accent CSS variable are
// applied globally by AuthProvider from the user's saved profile, so this
// component just needs dark: variants and var(--accent).
//
// Two bugs fixed from the original while rebuilding:
// - guideData exposes "eventsSummary", not "events" (see TourGuideDataContext).
// - review.reviewer.username assumed a shape that isn't guaranteed; now
//   falls back the same way the Reviews page does.

// ================= STATUS PILL =================
const StatusPill = ({ tone = "neutral", children }) => {
  const tones = {
    neutral: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
    accent: "bg-[var(--accent)] text-white",
    warn: "bg-amber-500 text-white",
    danger: "bg-rose-600 text-white",
    success: "bg-emerald-600 text-white",
  };
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium whitespace-nowrap ${tones[tone]}`}>
      {children}
    </span>
  );
};

const STATUS_TONE = {
  available: "success",
  busy: "warn",
  on_leave: "neutral",
};

const BOOKING_TONE = {
  approved: "accent",
  active: "accent",
  pending: "warn",
  cancelled: "danger",
  rejected: "danger",
};

function formatDate(dateString) {
  if (!dateString) return "-";
  return new Date(dateString).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

// =====================================================
// TOUR GUIDE DASHBOARD
// =====================================================
export default function TourGuideDashboard() {
  const { guideData, updateStatus, loading } = useContext(TourGuideDataContext);

  const {
    profile = {},
    bookings = [],
    eventsSummary = [],
    reviews = [],
  } = guideData || {};

  const activeBookings = bookings.filter(
    (b) => b.status === "approved" || b.status === "active"
  );

  const upcomingEvents = eventsSummary
    .filter((e) => new Date(e.start_date) >= new Date())
    .sort((a, b) => new Date(a.start_date) - new Date(b.start_date));

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 text-sm text-gray-500 dark:text-gray-400">
        Loading dashboard…
      </div>
    );
  }

  const status = profile.status || "unknown";

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100">
      <style>{`
        @media (prefers-reduced-motion: no-preference) {
          .dashboard-enter { animation: dashboardFadeUp 0.4s ease-out both; }
        }
        @keyframes dashboardFadeUp {
          from { opacity: 0; transform: translateY(6px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>

      <div className="dashboard-enter max-w-5xl mx-auto p-4 md:p-6 space-y-8">
        {/* ================= HEADER ================= */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-gray-900 rounded-xl shadow p-4 border border-transparent dark:border-gray-800">
          <div className="space-y-1.5 ">
            <h1 className="text-2xl font-semibold tracking-tight">
              Welcome, {profile.username || "Guide"}
            </h1>
            <div className="flex items-center gap-2">
              <StatusPill tone={STATUS_TONE[status] ?? "neutral"}>
                {status === "available" && (
                  <span className="relative flex h-1.5 w-1.5 mr-0.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75" />
                    <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-white" />
                  </span>
                )}
                <span className="capitalize">{status.replace("_", " ")}</span>
              </StatusPill>
            </div>
          </div>

          <select
            value={profile.status || ""}
            onChange={(e) => updateStatus(e.target.value)}
            className="rounded-md border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-[var(--accent)] transition-shadow"
          >
            <option value="available">Available</option>
            <option value="busy">Busy</option>
            <option value="on_leave">On leave</option>
          </select>
        </div>

        {/* ================= STATS ================= */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <StatCard icon={Users} title="Active bookings" value={activeBookings.length} />
          <StatCard icon={Calendar} title="Upcoming events" value={upcomingEvents.length} />
          <StatCard icon={ClipboardList} title="Total assignments" value={bookings.length} />
        </div>

        {/* ================= UPCOMING EVENTS ================= */}
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold">Upcoming events</h2>
            <Link
              to="/tour-guide/events"
              className="text-xs font-medium text-[var(--accent)] hover:underline"
            >
              View all
            </Link>
          </div>

          {upcomingEvents.length === 0 ? (
            <div className="rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-6 text-center text-sm text-gray-500 dark:text-gray-400">
              No upcoming events assigned.
            </div>
          ) : (
            <div className="rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 divide-y divide-gray-100 dark:divide-gray-800 overflow-hidden">
              {upcomingEvents.slice(0, 5).map((event) => (
                <Link
                  key={event.id}
                  to={`/tour-guide/events/${event.id}`}
                  className="flex items-center gap-4 px-4 py-3.5 hover:bg-gray-50 dark:hover:bg-gray-800/60 transition-colors"
                >
                  <div className="min-w-0 flex-1 space-y-1">
                    <p className="text-sm font-semibold truncate">{event.package_name}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {formatDate(event.start_date)} → {formatDate(event.end_date)}
                      {" · "}
                      {event.total_bookings ?? 0} bookings
                      {" · "}
                      {event.slots_used ?? 0}/{event.slot_limit ?? "-"} slots
                    </p>
                  </div>
                  <ChevronRight size={14} className="shrink-0 text-gray-300 dark:text-gray-600" />
                </Link>
              ))}
            </div>
          )}
        </section>

        {/* ================= RECENT BOOKINGS ================= */}
        <section className="space-y-3">
          <h2 className="text-base font-semibold">Recent bookings</h2>

          {bookings.length === 0 ? (
            <div className="rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-6 text-center text-sm text-gray-500 dark:text-gray-400">
              No bookings yet.
            </div>
          ) : (
            <div className="rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 divide-y divide-gray-100 dark:divide-gray-800 overflow-hidden">
              {bookings.slice(0, 5).map((booking) => (
                <div key={booking.id} className="flex items-center gap-4 px-4 py-3.5">
                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-semibold truncate">
                        Booking #{booking.id} · {booking.tourist_name || "Guest"}
                      </p>
                      <StatusPill tone={BOOKING_TONE[booking.status] ?? "neutral"}>
                        <span className="capitalize">{booking.status}</span>
                      </StatusPill>
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {booking.event?.package?.name || "—"}
                      {" · "}
                      <span className="inline-flex items-center gap-1">
                        <Users size={11} /> {booking.guests?.length ?? 0}
                      </span>
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* ================= RECENT REVIEWS ================= */}
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold">Recent reviews</h2>
            <Link
              to="/tour-guide/reviews"
              className="text-xs font-medium text-[var(--accent)] hover:underline"
            >
              View all
            </Link>
          </div>

          {reviews.length === 0 ? (
            <div className="rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-6 text-center text-sm text-gray-500 dark:text-gray-400">
              No reviews yet.
            </div>
          ) : (
            <div className="rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 divide-y divide-gray-100 dark:divide-gray-800 overflow-hidden">
              {reviews.slice(0, 5).map((review) => {
                const reviewerName =
                  review.reviewer_name ??
                  review.reviewer?.full_name ??
                  review.reviewer?.username ??
                  "Anonymous guest";

                return (
                  <div key={review.id} className="px-4 py-3.5 space-y-1.5">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-semibold">{reviewerName}</p>
                      {review.created_at && (
                        <StatusPill tone="accent">{formatDate(review.created_at)}</StatusPill>
                      )}
                    </div>
                    <div className="flex items-center gap-0.5">
                      {[1, 2, 3, 4, 5].map((n) => (
                        <Star
                          key={n}
                          size={13}
                          className={
                            n <= review.rating
                              ? "text-[var(--accent)] fill-[var(--accent)]"
                              : "text-gray-200 dark:text-gray-700"
                          }
                        />
                      ))}
                    </div>
                    {review.comment && (
                      <p className="text-sm text-gray-600 dark:text-gray-300">{review.comment}</p>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

// =====================================================
// SMALL COMPONENTS
// =====================================================
function StatCard({ icon: Icon, title, value }) {
  return (
    <div className="rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-5 flex items-center gap-3 transition-transform duration-200 hover:-translate-y-0.5">
      <Icon size={18} className="shrink-0 text-[var(--accent)]" />
      <div>
        <p className="text-2xl font-semibold tracking-tight leading-none">{value}</p>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{title}</p>
      </div>
    </div>
  );
}