import React, { useEffect, useState, useContext, useCallback } from "react";
import { useParams, Link, Navigate } from "react-router-dom";
import { TourGuideDataContext } from "../../contexts/TourGuideDataContext";
import { AuthContext } from "../../contexts/AuthContext";
import { FaCheckCircle, FaTimesCircle, FaMoon, FaSun } from "react-icons/fa";
import { useJsApiLoader } from "@react-google-maps/api";
import GuestLiveMap from "../../components/guide/GuestLiveMap";

// Auth and theme both come from AuthProvider: isAuthenticated/isTourGuide
// gate the page, and dark mode + the --accent color are the user's saved
// profile settings (applied to <html> by AuthProvider itself), toggled here
// via updateDarkMode rather than any local state.

// ================= STATUS PILL =================
// tone="accent" uses the user's saved brand color (var(--accent)); the
// others are fixed semantic colors that shouldn't shift with branding.
const StatusPill = ({ tone = "neutral", children }) => {
  const tones = {
    neutral: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
    accent: "bg-[var(--accent)] text-white",
    warn: "bg-amber-500 text-white",
    danger: "bg-rose-600 text-white",
    success: "bg-emerald-600 text-white",
  };
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium ${tones[tone]}`}>
      {children}
    </span>
  );
};

// ================= MODAL COMPONENT =================
const Modal = ({ onClose, title, children }) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
    <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg w-full max-w-md p-6 space-y-4 relative shadow-xl">
      <button
        onClick={onClose}
        aria-label="Close"
        className="absolute top-3 right-3 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 text-xl leading-none"
      >
        ×
      </button>
      <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">{title}</h2>
      <div className="text-sm text-gray-600 dark:text-gray-300">{children}</div>
    </div>
  </div>
);

// ================= MAIN COMPONENT =================
export default function TourGuideEventDetail() {
  const { id } = useParams();
  const { getEventDetail } = useContext(TourGuideDataContext);
  const { user, isAuthenticated, isTourGuide, updateDarkMode } = useContext(AuthContext);

  const [eventDetail, setEventDetail] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedGuest, setSelectedGuest] = useState(null);
  const isDark = !!user?.darkMode;

  const GOOGLE_MAPS_KEY = "<YOUR_GOOGLE_MAPS_API_KEY>";
  const { isLoaded: mapsLoaded } = useJsApiLoader({ googleMapsApiKey: GOOGLE_MAPS_KEY });

  const fetchEvent = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getEventDetail(id);
      setEventDetail(data);
    } catch (err) {
      setError("We couldn't load this event. Try refreshing the page.");
    } finally {
      setLoading(false);
    }
  }, [id, getEventDetail]);

  useEffect(() => {
    if (isAuthenticated && isTourGuide) fetchEvent();
  }, [isAuthenticated, isTourGuide, fetchEvent]);

  // ---- Auth gate ----
  // AuthProvider withholds its children until its own initial token check
  // finishes, so by the time this component mounts there's nothing left
  // to "load" here — just react to whether the session is valid.
  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: `/tour-guide/events/${id}` }} />;
  }

  if (!isTourGuide) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 px-6">
        <div className="text-center space-y-2">
          <p className="text-lg font-semibold text-gray-900 dark:text-gray-100">Access restricted</p>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            This page is only available to tour guide accounts.
          </p>
          <Link to="/" className="inline-block text-sm text-[var(--accent)] hover:underline">
            Return home
          </Link>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 text-gray-500 dark:text-gray-400 text-sm">
        Loading event details…
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 px-6">
        <div className="text-center space-y-3">
          <p className="text-sm text-gray-500 dark:text-gray-400">{error}</p>
          <button
            onClick={fetchEvent}
            className="text-sm font-medium text-[var(--accent)] hover:underline"
          >
            Try again
          </button>
        </div>
      </div>
    );
  }

  if (!eventDetail) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 text-gray-500 dark:text-gray-400 text-sm">
        Event not found.
      </div>
    );
  }

  const {
    package_name,
    start_date,
    end_date,
    slot_limit,
    slots_used,
    total_bookings,
    bookings,
    stations_progress,
    itinerary_file,
  } = eventDetail;

  const isFull = slots_used >= slot_limit;
  const totalGuests = bookings.reduce((sum, b) => sum + b.guests.length, 0);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100">
      <div className="max-w-5xl mx-auto p-6 space-y-10">
        <div>
          <Link
            to="/tour-guide/events"
            className="text-sm text-gray-500 dark:text-gray-400 hover:text-[var(--accent)]"
          >
            ← Back to events
          </Link>
        </div>
        {/* ================= HEADER ================= */}
        <div className="flex items-start justify-between gap-4 bg-white dark:bg-gray-900 rounded-xl shadow p-4 border border-transparent dark:border-gray-800">
          <div className="space-y-2">
            <h1 className="text-2xl font-semibold tracking-tight">{package_name}</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {start_date} → {end_date}
            </p>
            <div className="flex flex-wrap items-center gap-2 pt-1">
              <StatusPill tone={isFull ? "warn" : "accent"}>
                {isFull ? "Full" : "Slots available"}
              </StatusPill>
              <span className="text-xs text-gray-500 dark:text-gray-400">
                {slots_used}/{slot_limit} slots · {total_bookings} bookings
              </span>
              {itinerary_file && (
                <a
                  href={itinerary_file}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-[var(--accent)] hover:underline"
                >
                  View itinerary
                </a>
              )}
            </div>
          </div>

         
        </div>

        {/* ================= LIVE MAP VIEW ================= */}
        <section className="space-y-3">
          <div className="flex items-center gap-2">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[var(--accent)] opacity-75" />
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-[var(--accent)]" />
            </span>
            <h2 className="text-base font-semibold">Live guest locations</h2>
          </div>
          <div className="relative z-0 isolate rounded-lg overflow-hidden border border-gray-200 dark:border-gray-800">
            <GuestLiveMap bookings={bookings} mapsLoaded={mapsLoaded} />
          </div>
        </section>

        {/* ================= BOOKINGS & GUEST CHECKS ================= */}
        <section className="space-y-3">
          <h2 className="text-base font-semibold">Guest tracking</h2>
          {bookings.length === 0 ? (
            <p className="text-sm text-gray-500 dark:text-gray-400">No bookings yet.</p>
          ) : (
            <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-800">
              <table className="min-w-full text-sm">
                <thead className="bg-gray-100 dark:bg-gray-900">
                  <tr>
                    <th className="px-4 py-2.5 text-left font-medium text-gray-600 dark:text-gray-300">Guest</th>
                    {stations_progress.map((s) => (
                      <th
                        key={s.station_id}
                        className="px-4 py-2.5 text-center font-medium text-gray-600 dark:text-gray-300"
                      >
                        {s.station_name}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800 bg-white dark:bg-gray-900">
                  {bookings.map((b) =>
                    b.guests.map((g) => (
                      <tr key={g.id} className="hover:bg-gray-50 dark:hover:bg-gray-900">
                        <td className="px-4 py-2.5">
                          <button
                            onClick={() => setSelectedGuest(g)}
                            className="text-left font-medium text-[var(--accent)] hover:underline"
                          >
                            {g.full_name}
                          </button>
                          <span className="text-gray-400 dark:text-gray-500"> · {g.gender}, {g.age}</span>
                          {g.local && (
                            <span className="ml-2 align-middle">
                              <StatusPill tone="neutral">Local</StatusPill>
                            </span>
                          )}
                        </td>

                        {stations_progress.map((s) => {
                          const guestCheck = s.guest_checks?.find((c) => c.guest_id === g.id);
                          const isChecked = guestCheck?.checked;

                          return (
                            <td key={s.station_id} className="px-4 py-2.5 text-center">
                              {isChecked ? (
                                <div className="flex flex-col items-center gap-0.5">
                                  <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 text-xs font-medium">
                                    <FaCheckCircle size={11} /> Checked
                                  </span>
                                  {guestCheck?.checked_at && (
                                    <span className="text-xs text-gray-400 dark:text-gray-500">
                                      {new Date(guestCheck.checked_at).toLocaleTimeString([], {
                                        hour: "2-digit",
                                        minute: "2-digit",
                                      })}
                                      {guestCheck?.checked_by_name && ` · ${guestCheck.checked_by_name}`}
                                    </span>
                                  )}
                                </div>
                              ) : (
                                <span className="inline-flex items-center gap-1 text-gray-400 dark:text-gray-500 text-xs">
                                  <FaTimesCircle size={11} /> Pending
                                </span>
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* ================= STATION PROGRESS BARS ================= */}
        {stations_progress.length > 0 && (
          <section className="space-y-4">
            <h2 className="text-base font-semibold">Station progress</h2>
            <div className="space-y-4">
              {stations_progress.map((station) => {
                const checkedGuests = bookings.reduce((sum, b) => {
                  return (
                    sum +
                    b.guests.reduce((gSum, g) => {
                      const guestCheck = station.guest_checks?.find((c) => c.guest_id === g.id);
                      return gSum + (guestCheck?.checked ? 1 : 0);
                    }, 0)
                  );
                }, 0);

                const percent = totalGuests > 0 ? Math.round((checkedGuests / totalGuests) * 100) : 0;

                const barColor =
                  station.status === "MIA"
                    ? "bg-rose-500"
                    : station.status === "partial"
                    ? "bg-amber-500"
                    : station.status === "complete"
                    ? "bg-[var(--accent)]"
                    : "bg-gray-300 dark:bg-gray-700";

                return (
                  <div key={station.station_id} className="space-y-1.5">
                    <div className="flex justify-between items-baseline text-sm">
                      <span className="font-medium">{station.station_name}</span>
                      <span className="text-gray-500 dark:text-gray-400 text-xs">{percent}%</span>
                    </div>
                    <div className="w-full bg-gray-100 dark:bg-gray-900 h-1.5 rounded-full overflow-hidden">
                      <div
                        className={`${barColor} h-1.5 rounded-full transition-all duration-500`}
                        style={{ width: `${percent}%` }}
                      />
                    </div>
                    {station.guide_check_status?.checked && (
                      <p className="text-xs text-gray-400 dark:text-gray-500">
                        Guide confirmed by {station.guide_check_status.checked_by_name} at{" "}
                        {new Date(station.guide_check_status.checked_at).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* ================= BACK ================= */}
        <div>
          <Link
            to="/tour-guide/events"
            className="text-sm text-gray-500 dark:text-gray-400 hover:text-[var(--accent)]"
          >
            ← Back to events
          </Link>
        </div>
      </div>

      {/* ================= MODAL ================= */}
      {selectedGuest && (
        <Modal onClose={() => setSelectedGuest(null)} title={selectedGuest.full_name}>
          <div className="space-y-1.5">
            <p>Age: {selectedGuest.age}</p>
            <p>ID: {selectedGuest.id_number}</p>
            <p>Created: {new Date(selectedGuest.created_at).toLocaleString()}</p>
          </div>

          {mapsLoaded && selectedGuest.latitude && selectedGuest.longitude && (
            <div className="relative z-0 isolate mt-3 rounded-lg overflow-hidden border border-gray-200 dark:border-gray-800">
              <GuestLiveMap
                bookings={[{ guests: [selectedGuest] }]}
                mapsLoaded={mapsLoaded}
              />
            </div>
          )}
        </Modal>
      )}
    </div>
  );
}