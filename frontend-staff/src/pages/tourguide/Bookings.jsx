import React, { useContext, useMemo } from "react";
import { TourGuideDataContext } from "../../contexts/TourGuideDataContext";

const STATUS_LABELS = {
  pending: "Pending",
  approved: "Approved",
  active: "Active",
  completed: "Completed",
  cancelled: "Cancelled",
  rejected: "Rejected",
};

export default function TourGuideBookings() {
  const { guideData, loading } = useContext(TourGuideDataContext);

  const bookings = guideData?.bookings ?? [];

  // Group bookings by status (for clarity)
  const groupedBookings = useMemo(() => {
    return bookings.reduce((acc, booking) => {
      const status = booking.status || "unknown";
      if (!acc[status]) acc[status] = [];
      acc[status].push(booking);
      return acc;
    }, {});
  }, [bookings]);

  if (loading) {
    return <div className="p-6">Loading bookings...</div>;
  }

  return (
    <div className="p-6 space-y-6">
      {/* ================= HEADER ================= */}
      <div>
        <h1 className="text-2xl font-bold">My Bookings</h1>
        <p className="text-gray-500">
          Bookings assigned to you through tour events
        </p>
      </div>

      {/* ================= EMPTY STATE ================= */}
      {bookings.length === 0 && (
        <div className="bg-white p-6 rounded shadow text-gray-500">
          No bookings assigned yet.
        </div>
      )}

      {/* ================= BOOKINGS BY STATUS ================= */}
      {Object.entries(groupedBookings).map(([status, items]) => (
        <div key={status} className="space-y-3">
          <h2 className="text-lg font-semibold capitalize">
            {STATUS_LABELS[status] || status} ({items.length})
          </h2>

          <div className="bg-white rounded shadow divide-y">
            {items.map((booking) => (
              <BookingRow key={booking.id} booking={booking} />
            ))}
          </div>
        </div>
      ))}
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
    <div className="p-4 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
      {/* Left */}
      <div>
        <p className="font-semibold">
          Booking #{booking.id}
        </p>
        <p className="text-sm text-gray-600">
          Package: {packageName}
        </p>
        <p className="text-sm text-gray-600">
          Event: {event?.start_date} → {event?.end_date}
        </p>
      </div>

      {/* Right */}
      <div className="text-sm text-gray-700">
        <p>
          Status:{" "}
          <span className="font-medium capitalize">
            {booking.status}
          </span>
        </p>
        <p>
          Check-in:{" "}
          {booking.check_in
            ? new Date(booking.check_in).toLocaleString()
            : "—"}
        </p>
        <p>
          Check-out:{" "}
          {booking.check_out
            ? new Date(booking.check_out).toLocaleString()
            : "—"}
        </p>
      </div>
    </div>
  );
}
