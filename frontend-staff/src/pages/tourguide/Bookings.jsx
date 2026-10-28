import React, { useContext, useMemo } from "react";
import { TourGuideDataContext } from "../../contexts/TourGuideDataContext";
import { Package, Calendar, LogIn, LogOut } from "lucide-react";

// Dark mode (the "dark" class on <html>) and the --accent CSS variable are
// applied globally by AuthProvider from the user's saved profile, so this
// component just needs dark: variants and var(--accent).

const STATUS_LABELS = {
  pending: "Pending",
  approved: "Approved",
  active: "Active",
  completed: "Completed",
  cancelled: "Cancelled",
  rejected: "Rejected",
  unknown: "Unknown",
};

// Fixed display order so groups read as a lifecycle rather than whatever
// order statuses happened to first appear in the data.
const STATUS_ORDER = ["active", "approved", "pending", "completed", "cancelled", "rejected"];

const STATUS_TONE = {
  active: "accent",
  approved: "accent",
  pending: "warn",
  completed: "success",
  cancelled: "danger",
  rejected: "danger",
  unknown: "neutral",
};

function formatDate(dateString) {
  if (!dateString) return "-";
  return new Date(dateString).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function formatDateTime(dateString) {
  if (!dateString) return "—";
  return new Date(dateString).toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

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

export default function TourGuideBookings() {
  const { guideData, loading } = useContext(TourGuideDataContext);

  const bookings = guideData?.bookings ?? [];

  // Group bookings by status, then order the groups by lifecycle rather
  // than insertion order.
  const groupedBookings = useMemo(() => {
    const groups = bookings.reduce((acc, booking) => {
      const status = booking.status || "unknown";
      if (!acc[status]) acc[status] = [];
      acc[status].push(booking);
      return acc;
    }, {});

    const orderedKeys = [
      ...STATUS_ORDER.filter((s) => groups[s]),
      ...Object.keys(groups).filter((s) => !STATUS_ORDER.includes(s)),
    ];

    return orderedKeys.map((status) => [status, groups[status]]);
  }, [bookings]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 text-sm text-gray-500 dark:text-gray-400">
        Loading bookings…
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100">
      <style>{`
        @media (prefers-reduced-motion: no-preference) {
          .bookings-enter { animation: bookingsFadeUp 0.4s ease-out both; }
        }
        @keyframes bookingsFadeUp {
          from { opacity: 0; transform: translateY(6px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>

      <div className="bookings-enter max-w-5xl mx-auto p-4 md:p-6 space-y-8">
        {/* ================= HEADER ================= */}
        <div className="bg-white dark:bg-gray-900 rounded-xl shadow p-4 border border-transparent dark:border-gray-800">
          <h1 className="text-2xl font-semibold tracking-tight">My bookings</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Bookings assigned to you through tour events
          </p>
        </div>

        {/* ================= EMPTY STATE ================= */}
        {bookings.length === 0 && (
          <div className="rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-8 text-center text-sm text-gray-500 dark:text-gray-400">
            No bookings assigned yet.
          </div>
        )}

        {/* ================= BOOKINGS BY STATUS ================= */}
        {groupedBookings.map(([status, items]) => (
          <section key={status} className="space-y-3">
            <div className="flex items-center gap-2">
              <h2 className="text-base font-semibold">{STATUS_LABELS[status] || status}</h2>
              <StatusPill tone={STATUS_TONE[status] ?? "neutral"}>{items.length}</StatusPill>
            </div>

            <div className="rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 divide-y divide-gray-100 dark:divide-gray-800 overflow-hidden">
              {items.map((booking) => (
                <BookingRow key={booking.id} booking={booking} />
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}

// =====================================================
// Booking Row Component
// =====================================================
function BookingRow({ booking }) {
  const event = booking.event;
  const packageName = event?.package?.name || "—";

  return (
    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 px-4 py-3.5 hover:bg-gray-50 dark:hover:bg-gray-800/60 transition-colors">
      {/* Left */}
      <div className="space-y-1 min-w-0">
        <p className="text-sm font-semibold">Booking #{booking.id}</p>
        <p className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
          <Package size={12} className="shrink-0" />
          {packageName}
        </p>
        <p className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
          <Calendar size={12} className="shrink-0" />
          {formatDate(event?.start_date)} → {formatDate(event?.end_date)}
        </p>
      </div>

      {/* Right */}
      <div className="space-y-1 text-xs text-gray-500 dark:text-gray-400 md:text-right shrink-0">
        <p className="flex items-center gap-1.5 md:justify-end">
          <LogIn size={12} className="shrink-0" />
          {formatDateTime(booking.check_in)}
        </p>
        <p className="flex items-center gap-1.5 md:justify-end">
          <LogOut size={12} className="shrink-0" />
          {formatDateTime(booking.check_out)}
        </p>
      </div>
    </div>
  );
}