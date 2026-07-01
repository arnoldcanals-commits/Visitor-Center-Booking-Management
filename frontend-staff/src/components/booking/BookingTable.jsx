import moment from "moment";

export default function BookingTable({
  bookings,
  statusChoices,
  statusColors,
  openEdit,
  handleDelete,
  handleStatusChange,
  setGuestModal,
  openAssignEvent,
  currentPage,
  totalPages,
  setCurrentPage,
}) {
  return (
    <div className="bg-white shadow rounded-xl p-4 overflow-x-auto min-h-[500px]">
      <table className="w-full">
        <thead>
          <tr className="border-b text-left">
            <th className="p-2">Tourist</th>
            <th className="p-2">Package</th>
            <th className="p-2">Event</th>
            <th className="p-2">Check In</th>
            <th className="p-2">Check Out</th>
            <th className="p-2">Amount</th>
            <th className="p-2">Status</th>
            <th className="p-2">Total Guests</th>
            <th className="p-2 w-36">Actions</th>
          </tr>
        </thead>
        <tbody>
          {bookings.length === 0 && (
            <tr>
              <td colSpan="9" className="p-4 text-center text-gray-500">
                No bookings found
              </td>
            </tr>
          )}
          {bookings.map((b) => (
            <tr key={b.id} className="border-b">
              <td className="p-2">{b.tourist_name || b.tourist}</td>
              <td className="p-2">{b.package_name || b.package || "—"}</td>
              <td className="p-2">
                <button
                  onClick={() => openAssignEvent(b)}
                  className={`px-3 py-1 text-sm rounded ${
                    b.event ? "bg-gray-300 text-black" : "bg-pink-500 text-white"
                  }`}
                  title={
                    b.event?.package_name
                      ? `${b.event.package_name} | ${moment(b.event.start_date).format(
                          "MMM DD, YYYY"
                        )} - ${moment(b.event.end_date).format("MMM DD, YYYY")}`
                      : "Assign Event"
                  }
                >
                  {b.event ? `Event ID: ${b.event?.id || b.event}` : "Assign Event"}
                </button>
              </td>
              <td className="p-2">{b.check_in ? moment(b.check_in).format("MMM DD, YYYY") : ""}</td>
              <td className="p-2">{b.check_out ? moment(b.check_out).format("MMM DD, YYYY") : ""}</td>
              <td className="p-2">₱{b.total_amount}</td>
              <td className="p-2">
                <select
                  value={b.status}
                  onChange={(e) => handleStatusChange(b.id, e.target.value)}
                  className={`px-4 pr-8 py-1 rounded text-white border-none ${statusColors[b.status]}`}
                >
                  {statusChoices.map((s) => (
                    <option key={s.value} value={s.value}>
                      {s.label}
                    </option>
                  ))}
                </select>
              </td>
              <td className="p-2">
                {b.guests?.length || 0}
                {b.guests?.length > 0 && (
                  <button
                    onClick={() =>
                      setGuestModal({ open: true, guests: b.guests, bookingId: b.id })
                    }
                    className="ml-2 px-2 py-1 text-xs bg-gray-200 rounded"
                  >
                    View Guests
                  </button>
                )}
              </td>
              <td className="p-2">
                <button
                  onClick={() => openEdit(b)}
                  className="px-2 py-1 text-sm bg-yellow-500 text-white rounded mr-1"
                >
                  Edit
                </button>
                <button
                  onClick={() => handleDelete(b.id)}
                  className="px-2 py-1 text-sm bg-red-600 text-white rounded"
                >
                  Del
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-end gap-2 mt-4 items-center">
          <button
            onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
            disabled={currentPage === 1}
            className="px-3 py-1 border rounded disabled:opacity-50"
          >
            Prev
          </button>

          {[...Array(totalPages)].map((_, idx) => {
            const page = idx + 1;
            return (
              <button
                key={page}
                onClick={() => setCurrentPage(page)}
                className={`px-3 py-1 border rounded ${
                  currentPage === page ? "bg-blue-600 text-white" : "bg-gray-200"
                }`}
              >
                {page}
              </button>
            );
          })}

          <button
            onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
            disabled={currentPage === totalPages}
            className="px-3 py-1 border rounded disabled:opacity-50"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
