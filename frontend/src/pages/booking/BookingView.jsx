import { useEffect, useState, useCallback, useMemo } from "react";
import api from "../../api";
import { ACCESS_TOKEN } from "../../constants";
import BookingCard from "../../components/booking/BookingCard";
import TopBar from "../../components/TopBar";
import LoadingIndicator from "../../components/LoadingIndicator";
import { CheckCircle2, Calendar, Clock, Palmtree, X } from "lucide-react";

export default function BookingView() {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState("current"); // current | history

  const isLoggedIn = () => {
    const token = localStorage.getItem(ACCESS_TOKEN);
    return !!token && token !== "null" && token !== "undefined";
  };

  const accentChip = {
    backgroundColor: "color-mix(in srgb, var(--accent) 8%, transparent)",
    color: "var(--accent)",
    borderColor: "color-mix(in srgb, var(--accent) 20%, transparent)",
  };

  // authed is derived synchronously from the token, so it (and therefore
  // the header/tabs below) is known on first render — no need to wait
  // for the bookings fetch to resolve.
  const [authed, setAuthed] = useState(isLoggedIn());

  const fetchBookings = useCallback(async () => {
    if (!isLoggedIn()) {
      setAuthed(false);
      setLoading(false);
      return;
    }
    setAuthed(true);
    setLoading(true);
    setError(null);
    try {
      const res = await api.get("api/booking/my/");
      setBookings(res.data);
    } catch (err) {
      console.error("Failed to fetch bookings:", err);
      // A 401 here means the interceptor's refresh also failed;
      // it will redirect on its own, but guard just in case.
      if (err.response?.status === 401) {
        setAuthed(false);
      } else {
        setError("Failed to load bookings. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBookings();
  }, [fetchBookings]);

  // BookingCard performs the actual cancellation-request PATCH itself
  // (setting requested_cancellation on the booking); this just refreshes
  // the list afterward so the updated state shows up.
  const handleCancel = () => {
    fetchBookings();
  };

  // --- STATUS GROUPING (MODEL-ALIGNED) ---
  const currentStatuses = ["pending", "approved", "active"];
  const historyStatuses = ["completed", "cancelled", "rejected"];

  const currentBookings = bookings.filter((b) =>
    currentStatuses.includes(b.status)
  );
  const historyBookings = bookings.filter((b) =>
    historyStatuses.includes(b.status)
  );

  const displayedBookings =
    activeTab === "current" ? currentBookings : historyBookings;

  // --- ACTIVE BOOKING (SPECIAL UX) ---
  const activeBooking = useMemo(
    () => bookings.find((b) => b.status === "active"),
    [bookings]
  );

  // Only the list/status area below the header + tabs reacts to
  // loading / auth / error — the header and tabs render immediately.
  let body;

  if (loading) {
    body = (
      <div className="flex justify-center items-center h-40">
        <LoadingIndicator />
      </div>
    );
  } else if (!authed) {
    body = (
      <div className="flex flex-col items-center justify-center py-10 text-center">
        <h2 className="text-2xl font-bold mb-2">🔒 Login required</h2>
        <p className="text-gray-500 mb-4">
          Login to view your booking information.
        </p>

        <a
          href="/login"
          className="px-4 py-2 bg-teal-600 text-white rounded hover:bg-teal-700 transition"
        >
          Log in
        </a>
      </div>
    );
  } else if (error) {
    body = (
      <div className="flex flex-col items-center justify-center py-10 text-center">
        <h2 className="text-2xl font-bold mb-2">😅 Oops!</h2>
        <p className="text-red-500 mb-4">{error}</p>
        <button
          onClick={fetchBookings}
          className="px-4 py-2 bg-teal-600 text-white rounded hover:bg-teal-700 transition"
        >
          Retry
        </button>
      </div>
    );
  } else if (displayedBookings.length === 0) {
    body = (
      <div className="flex flex-col items-center justify-center text-center py-10">
        <h2 className="text-2xl font-bold mb-2 text-black dark:text-white">
          {activeTab === "current"
            ? "No active bookings 😴"
            : "Nothing here yet 📖"}
        </h2>
        <p className="text-gray-500">
          {activeTab === "current"
            ? "You can book even before an event is assigned."
            : "Completed or cancelled bookings will appear here."}
        </p>
      </div>
    );
  } else {
    body = (
      <div className="space-y-4">
        {displayedBookings.map((booking) => {
          const isActive = booking.status === "active";

          return (
            <div
              key={booking.id}
              className={`
                rounded-xl transition
                ${isActive ? "ring-2 ring-teal-400 shadow-lg" : "hover:shadow-md"}
              `}
            >
              {/* EVENT INFO */}
              <div className="px-4 pt-4 text-sm text-gray-600">
                {booking.event ? (
                  <div className="mb-2">
                    <p className="font-medium text-gray-800">
                      {booking.package?.name}
                    </p>
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-[color-mix(in_srgb,var(--accent)_12%,white)] text-[var(--accent)]">
                      <Calendar size={13} />
                      {booking.event.start_date}
                      <Clock size={13} />
                      {booking.event.end_date}
                    </span>
                    {booking.assigned_guide && (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-[color-mix(in_srgb,var(--accent)_12%,white)] text-[var(--accent)] ml-2">
                        <CheckCircle2 size={13} />
                        Guide assigned
                      </span>
                    )}
                  </div>
                ) : (
                  <p className="italic text-gray-400">
                    No event assigned yet — we’ll notify you.
                  </p>
                )}
              </div>

              <BookingCard booking={booking} onCancel={handleCancel} />
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <div className="min-h-[700px] bg-white dark:bg-gray-900">
      <TopBar />

      <div className="max-w-4xl mx-auto p-2 sm:p-4 bg-white dark:bg-gray-900 animate-[fadeInUp_0.35s_ease-out]">
        {/* HEADER — renders immediately with the TopBar, no fetch wait */}
        <div className="bg-white dark:bg-gray-800 p-4 sm:p-6 rounded-2xl shadow dark:shadow-black/30 border border-transparent dark:border-gray-700 flex flex-wrap gap-4 justify-between items-center mb-6">
          <div className="flex items-center gap-3">
            <div
              className="flex items-center gap-2 p-3 rounded-xl w-fit border"
              style={accentChip}
            >
              <Palmtree size={28} />
              <span className="text-sm font-black uppercase tracking-tight">
                Your Bookings
              </span>
            </div>
          </div>
        </div>

        {/* TABS — also renders immediately; counts fill in once bookings load */}
        {authed && (
          <div className="flex gap-3 mb-6">
            {["current", "history"].map((tab) => {
              const isActive = activeTab === tab;
              const count =
                tab === "history"
                  ? historyBookings.length
                  : currentBookings.length;

              return (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`
                    px-4 py-2 rounded-xl font-medium text-sm transition-all
                    ${
                      isActive
                        ? "bg-teal-50 text-teal-700 shadow-sm -translate-y-[1px]"
                        : "text-gray-500 hover:text-teal-600 hover:bg-teal-50/60"
                    }
                  `}
                >
                  {tab === "current" ? "Current" : `History (${count})`}
                  {isActive && (
                    <span className="block mt-1 h-0.5 bg-gradient-to-r from-teal-500 to-cyan-500 rounded-full" />
                  )}
                </button>
              );
            })}
          </div>
        )}

        {/* ACTIVE BOOKING BANNER */}
        {activeBooking && (
          <div className="mb-6 rounded-2xl border border-teal-300 bg-teal-50 p-4 shadow-sm animate-pulse">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-semibold text-teal-800 text-lg">
                  🟢 You’re currently on a tour
                </h2>
                <p className="text-sm text-teal-700">
                  Enjoy the experience — we’ll track everything for you.
                </p>
              </div>
              <span className="px-3 py-1 text-xs font-bold rounded-full bg-teal-600 text-white">
                LIVE
              </span>
            </div>
          </div>
        )}

        {/* BODY — this is the part that reacts to loading / auth / error */}
        {body}

        <style>{`
          @keyframes fadeInUp {
            from { opacity: 0; transform: translateY(8px); }
            to { opacity: 1; transform: translateY(0); }
          }
        `}</style>
      </div>
    </div>
  );
}