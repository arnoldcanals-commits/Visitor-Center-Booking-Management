import React, { useContext } from "react";
import { TourGuideDataContext } from "../../contexts/TourGuideDataContext";
import { Link } from "react-router-dom";

export default function TourGuideEvents() {
  const { guideData, loading } = useContext(TourGuideDataContext);

  // Use the correct property from context
  const events = guideData?.eventsSummary ?? [];

  if (loading) {
    return <div className="p-6 text-gray-600">Loading events...</div>;
  }

  return (
    <div className="p-4 md:p-6 space-y-6">
      {/* ================= HEADER ================= */}
      <div>
        <h1 className="text-2xl md:text-3xl font-bold">My Events</h1>
        <p className="text-gray-500">Tour events currently assigned to you</p>
      </div>

      {/* ================= EMPTY STATE ================= */}
      {events.length === 0 && (
        <div className="bg-white p-6 rounded-lg shadow text-gray-500 text-center">
          You are not assigned to any events yet.
        </div>
      )}

      {/* ================= EVENT LIST ================= */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {events.map((event) => (
          <Link
            to={`/tour-guide/events/${event.id}`}
            key={event.id}
            className="block hover:shadow-lg transition-shadow"
          >
            <EventCard event={event} />
          </Link>
        ))}
      </div>
    </div>
  );
}

// =====================================================
// Event Card Component (works with aggregated summary)
// =====================================================
function EventCard({ event }) {
  // Determine if the event is today or tomorrow
  const today = new Date();
  const startDate = new Date(event.start_date);
  const diffDays = Math.floor(
    (startDate - today) / (1000 * 60 * 60 * 24)
  );

  let statusText = "";
  let statusColor = "bg-gray-300 text-gray-700";

  if (diffDays < 0) {
    statusText = "Past Event";
    statusColor = "bg-gray-400 text-white";
  } else if (diffDays === 0) {
    statusText = "Happening Today";
    statusColor = "bg-teal-600 text-white";
  } else if (diffDays === 1) {
    statusText = "Happening Tomorrow";
    statusColor = "bg-amber-600 text-white";
  } else {
    statusText = `${diffDays} days to go`;
    statusColor = "bg-green-600 text-white";
  }

  return (
    <div className="bg-white rounded-xl shadow p-5 flex flex-col justify-between h-full">
      {/* TITLE */}
      <div>
        <h2 className="text-lg font-semibold text-teal-700">{event.package_name}</h2>
        <p className="text-sm text-gray-600 mt-1">
          {new Date(event.start_date).toLocaleDateString()} → {new Date(event.end_date).toLocaleDateString()}
        </p>
      </div>

      {/* STATUS BADGE */}
      <div className="mt-3">
        <span
          className={`inline-block px-3 py-1 text-xs font-semibold rounded-full ${statusColor}`}
        >
          {statusText}
        </span>
      </div>

      {/* STATION INFO */}
      <div className="mt-2 text-sm text-gray-700">
        <div>
          Stations Completed: {event.completed_stations ?? 0} / {event.total_stations ?? 0}
        </div>
      </div>
    </div>
  );
}
