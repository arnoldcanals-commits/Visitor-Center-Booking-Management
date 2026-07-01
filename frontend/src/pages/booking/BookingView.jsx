import { useEffect, useState, useCallback, useMemo } from "react";
import api from "../../api";
import BookingCard from "../../components/booking/BookingCard";

export default function BookingView() {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState("current"); // current | history

  const fetchBookings = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get("api/booking/my/");
      setBookings(res.data);
    } catch (err) {
      console.error("Failed to fetch bookings:", err);
      setError("Failed to load bookings. Please try again.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBookings();
  }, [fetchBookings]);

  const handleCancel = async (bookingId) => {
    try {
      await api.patch(`api/booking/my/?user_id=${bookingId}`, {
        status: "cancelled",
      });
      fetchBookings();
      alert("Booking cancelled successfully.");
    } catch (err) {
      console.error(err);
      alert("Failed to cancel booking.");
    }
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

  if (loading) {
    return (
      <div className="flex justify-center items-center h-40">
        <p className="text-gray-500 text-lg animate-pulse">
          Loading bookings…
        </p>
      </div>
    );
  }

  if (error) {
    return (
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
  }

  return (
    <div className="min-h-[300px] animate-[fadeInUp_0.35s_ease-out]">
      <div className="max-w-4xl mx-auto p-2 sm:p-4">

        {/* HEADER */}
        <div className="bg-white p-4 sm:p-6 rounded-2xl shadow mb-6 relative overflow-hidden">
          <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-teal-500 to-cyan-500 rounded-full" />
          <h1 className="text-xl sm:text-2xl font-semibold mb-1">
            📅 Your Bookings
          </h1>
          <p className="text-gray-500 text-sm sm:text-base">
            All bookings — even those waiting for events
          </p>
        </div>

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

        {/* TABS */}
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

        {/* BOOKINGS LIST */}
        {displayedBookings.length === 0 ? (
          <div className="flex flex-col items-center justify-center text-center py-10">
            <h2 className="text-2xl font-bold mb-2">
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
        ) : (
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
                      <>
                        <p className="font-medium text-gray-800">
                          {booking.package?.name}
                        </p>
                        <p>
                          📆 {booking.event.start_date} →{" "}
                          {booking.event.end_date}
                        </p>
                        {booking.assigned_guide && (
                          <p>🧭 Guide assigned</p>
                        )}
                      </>
                    ) : (
                      <p className="italic text-gray-400">
                        No event assigned yet — we’ll notify you.
                      </p>
                    )}
                  </div>

                  <BookingCard
                    booking={booking}
                    onCancel={handleCancel}
                  />
                </div>
              );
            })}
          </div>
        )}
      </div>

      <style>{`
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
