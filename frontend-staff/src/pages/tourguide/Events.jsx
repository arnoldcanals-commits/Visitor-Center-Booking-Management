import React, { useContext, useState } from "react";
import { TourGuideDataContext } from "../../contexts/TourGuideDataContext";
import { Link } from "react-router-dom";
import { FaList, FaThLarge, FaChevronRight } from "react-icons/fa";

// Dark mode (the "dark" class on <html>) and the --accent CSS variable are
// both applied globally by AuthProvider from the user's saved profile, so
// this component just needs dark: variants and var(--accent) — no need to
// read AuthContext directly here.

// ================= STATUS PILL =================
// tone="accent" uses the user's saved brand color; the others are fixed
// semantic colors that shouldn't shift with branding.
const StatusPill = ({ tone = "neutral", children }) => {
  const tones = {
    neutral: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
    accent: "bg-[var(--accent)] text-white",
    warn: "bg-amber-500 text-white",
  };
  return (
    <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium whitespace-nowrap ${tones[tone]}`}>
      {children}
    </span>
  );
};

// ================= STATUS HELPER =================
function getEventStatus(event) {
  const today = new Date();
  const startDate = new Date(event.start_date);
  const diffDays = Math.floor((startDate - today) / (1000 * 60 * 60 * 24));

  if (diffDays < 0) return { text: "Past event", tone: "neutral" };
  if (diffDays === 0) return { text: "Happening today", tone: "accent" };
  if (diffDays === 1) return { text: "Happening tomorrow", tone: "warn" };
  return { text: `${diffDays} days to go`, tone: "neutral" };
}

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

// ================= MAIN COMPONENT =================
export default function TourGuideEvents() {
  const { guideData, loading } = useContext(TourGuideDataContext);
  const [view, setView] = useState("list");

  const events = guideData?.eventsSummary ?? [];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100">
      <div className="max-w-5xl mx-auto p-4 md:p-6 space-y-6 ">
        {/* ================= HEADER ================= */}
        <div className="flex items-start justify-between gap-4 bg-white dark:bg-gray-900 rounded-xl shadow p-4 border border-transparent dark:border-gray-800">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">My events</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Tour events currently assigned to you
            </p>
          </div>
          {!loading && events.length > 0 && <ViewToggle view={view} onChange={setView} />}
        </div>

        {/* ================= LOADING ================= */}
        {loading && (
          <p className="text-sm text-gray-500 dark:text-gray-400">Loading events…</p>
        )}

        {/* ================= EMPTY STATE ================= */}
        {!loading && events.length === 0 && (
          <div className="rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-8 text-center text-sm text-gray-500 dark:text-gray-400">
            You're not assigned to any events yet.
          </div>
        )}

        {/* ================= GRID VIEW ================= */}
        {!loading && events.length > 0 && view === "grid" && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {events.map((event) => (
              <EventCard key={event.id} event={event} />
            ))}
          </div>
        )}

        {/* ================= LIST VIEW ================= */}
        {!loading && events.length > 0 && view === "list" && (
          <div className="rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 divide-y divide-gray-100 dark:divide-gray-800 overflow-hidden">
            {events.map((event) => (
              <EventRow key={event.id} event={event} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// =====================================================
// Event Card (grid view)
// =====================================================
function EventCard({ event }) {
  const status = getEventStatus(event);
  const completed = event.completed_stations ?? 0;
  const total = event.total_stations ?? 0;
  const percent = total > 0 ? Math.round((completed / total) * 100) : 0;

  return (
    <Link
      to={`/tour-guide/events/${event.id}`}
      className="flex flex-col justify-between h-full rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-5 hover:border-gray-300 dark:hover:border-gray-700 transition-colors"
    >
      <div className="space-y-2">
        <h2 className="text-base font-semibold">{event.package_name}</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          {new Date(event.start_date).toLocaleDateString()} → {new Date(event.end_date).toLocaleDateString()}
        </p>
        <StatusPill tone={status.tone}>{status.text}</StatusPill>
      </div>

      <div className="mt-4 space-y-1.5">
        <div className="flex justify-between items-baseline text-xs text-gray-500 dark:text-gray-400">
          <span>Stations</span>
          <span>{completed}/{total}</span>
        </div>
        <div className="w-full bg-gray-100 dark:bg-gray-800 h-1.5 rounded-full overflow-hidden">
          <div
            className="bg-[var(--accent)] h-1.5 rounded-full transition-all duration-500"
            style={{ width: `${percent}%` }}
          />
        </div>
      </div>
    </Link>
  );
}

// =====================================================
// Event Row (list view)
// =====================================================
function EventRow({ event }) {
  const status = getEventStatus(event);
  const completed = event.completed_stations ?? 0;
  const total = event.total_stations ?? 0;

  return (
    <Link
      to={`/tour-guide/events/${event.id}`}
      className="flex items-center gap-4 px-4 py-3.5 hover:bg-gray-50 dark:hover:bg-gray-800/60 transition-colors"
    >
      <div className="min-w-0 flex-1 space-y-1">
        <div className="flex items-center gap-2 flex-wrap">
          <h2 className="text-sm font-semibold truncate">{event.package_name}</h2>
          <StatusPill tone={status.tone}>{status.text}</StatusPill>
        </div>
        <p className="text-xs text-gray-500 dark:text-gray-400">
          {new Date(event.start_date).toLocaleDateString()} → {new Date(event.end_date).toLocaleDateString()}
          {" · "}
          {completed}/{total} stations
        </p>
      </div>
      <FaChevronRight size={12} className="shrink-0 text-gray-300 dark:text-gray-600" />
    </Link>
  );
}