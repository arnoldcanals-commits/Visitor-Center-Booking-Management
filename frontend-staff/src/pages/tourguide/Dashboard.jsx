import React, { useContext } from "react";
import { TourGuideDataContext } from "../../contexts/TourGuideDataContext";

// =====================================================
// TOUR GUIDE DASHBOARD
// =====================================================
export default function TourGuideDashboard() {
  const { guideData, updateStatus, loading } = useContext(TourGuideDataContext);

  // ======================================
  // SAFE DESTRUCTURING
  // ======================================
  const {
    profile = {},
    bookings = [],
    events = [],
    reviews = [],
  } = guideData || {};

  // ======================================
  // COMPUTED DATA
  // ======================================
  const activeBookings = bookings.filter(
    (b) => b.status === "approved" || b.status === "active"
  );

  const upcomingEvents = events.filter(
    (e) => new Date(e.start_date) >= new Date()
  );

  // ======================================
  // LOADING STATE
  // ======================================
  if (loading) {
    return (
      <div className="p-6 text-center text-gray-500">
        Loading dashboard...
      </div>
    );
  }

  // ======================================
  // RENDER DASHBOARD
  // ======================================
  return (
    <div className="p-6 space-y-6">
      {/* ================= HEADER ================= */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold">
            Welcome, {profile.username || "Guide"}
          </h1>
          <p className="text-gray-500 mt-1">
            Status:{" "}
            <span className="font-semibold capitalize">
              {profile.status || "unknown"}
            </span>
          </p>
        </div>

        {/* ================= STATUS TOGGLE ================= */}
        <select
          className="border rounded-lg px-12 py-2 bg-teal-800 text-white font-medium"
          value={profile.status || ""}
          onChange={(e) => updateStatus(e.target.value)}
        >
          <option value="available">Available</option>
          <option value="busy">Busy</option>
          <option value="on_leave">On Leave</option>
        </select>
      </div>

      {/* ================= STATS ================= */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard title="Active Bookings" value={activeBookings.length} />
        <StatCard title="Upcoming Events" value={upcomingEvents.length} />
        <StatCard title="Total Assignments" value={bookings.length} />
      </div>

      {/* ================= UPCOMING EVENTS ================= */}
      <div>
        <h2 className="text-xl font-semibold mb-3">Upcoming Events</h2>

        {upcomingEvents.length === 0 ? (
          <p className="text-gray-500">No upcoming events assigned.</p>
        ) : (
          <div className="bg-white shadow rounded divide-y">
            {upcomingEvents.map((event) => (
              <div
                key={event.id}
                className="p-4 hover:bg-gray-50 transition cursor-pointer"
              >
                <p className="font-semibold">{event.package_name}</p>
                <p className="text-sm text-gray-600">
                  {formatDate(event.start_date)} → {formatDate(event.end_date)}
                </p>
                <p className="text-sm text-gray-600">
                  Bookings: {event.total_bookings ?? 0}
                </p>
                <p className="text-sm text-gray-600">
                  Slots: {event.slots_used ?? 0}/{event.slot_limit ?? "-"}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ================= RECENT BOOKINGS ================= */}
      <div>
        <h2 className="text-xl font-semibold mb-3">Recent Bookings</h2>

        {bookings.length === 0 ? (
          <p className="text-gray-500">No bookings yet.</p>
        ) : (
          <div className="bg-white shadow rounded divide-y">
            {bookings.slice(0, 5).map((booking) => (
              <div
                key={booking.id}
                className="p-4 hover:bg-gray-50 transition cursor-pointer"
              >
                <p className="font-semibold">
                  Booking #{booking.id} - {booking.tourist_name || "Guest"}
                </p>
                <p className="text-sm text-gray-600">
                  Status: <span className="capitalize">{booking.status}</span>
                </p>
                <p className="text-sm text-gray-600">
                  Event: {booking.event?.package?.name || "—"}
                </p>
                <p className="text-sm text-gray-600">
                  Guests: {booking.guests?.length ?? 0}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ================= REVIEWS (OPTIONAL) ================= */}
      <div>
        <h2 className="text-xl font-semibold mb-3">Recent Reviews</h2>
        {reviews.length === 0 ? (
          <p className="text-gray-500">No reviews yet.</p>
        ) : (
          <div className="bg-white shadow rounded divide-y">
            {reviews.slice(0, 5).map((review) => (
              <div key={review.id} className="p-4">
                <p className="font-semibold">{review.reviewer.username}</p>
                <p className="text-sm text-gray-600">
                  Rating: {review.rating}/5
                </p>
                <p className="text-sm">{review.comment}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// =====================================================
// SMALL COMPONENTS
// =====================================================
function StatCard({ title, value }) {
  return (
    <div className="bg-white rounded shadow p-4 text-center">
      <p className="text-sm text-gray-500">{title}</p>
      <p className="text-2xl font-bold text-teal-600">{value}</p>
    </div>
  );
}

// =====================================================
// HELPERS
// =====================================================
function formatDate(dateString) {
  if (!dateString) return "-";
  const options = { year: "numeric", month: "short", day: "numeric" };
  return new Date(dateString).toLocaleDateString(undefined, options);
}
