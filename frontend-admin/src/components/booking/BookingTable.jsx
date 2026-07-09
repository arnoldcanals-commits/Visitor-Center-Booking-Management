import moment from "moment";
import { useContext } from "react";
import { AdminDataContext } from "../../contexts/AdminDataContext";
import { Link } from "react-router-dom";

export default function BookingTable({
  bookings,
  entriesPerPage,
  selectedIds,
  setSelectedIds,
  statusChoices,
  statusColors,
  openEdit,
  handleStatusChange,
  setGuestModal,
  openAssignEvent,
}) {
  const { updateItem } = useContext(AdminDataContext);

  const markAsRead = (booking) => {
    if (booking?.read_byStaff === false) {
      updateItem("bookings", booking.id, { read_byStaff: true });
    }
  };

  const toggleSelectOne = (id) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  // Select-all applies to the bookings currently rendered on this page,
  // merged with any selections already made elsewhere (e.g. other pages).
  const allSelected =
    bookings.length > 0 && bookings.every((b) => selectedIds.includes(b.id));

  const toggleSelectAll = () => {
    if (allSelected) {
      setSelectedIds((prev) => prev.filter((id) => !bookings.some((b) => b.id === id)));
    } else {
      setSelectedIds((prev) => [...new Set([...prev, ...bookings.map((b) => b.id)])]);
    }
  };

  const placeholderCount = Math.max(0, (entriesPerPage || 0) - bookings.length);

  return (
    <div className="space-y-4">
      {/* Desktop Header - Hidden on Mobile */}
      <div className="hidden md:grid grid-cols-12 gap-4 px-6 py-3 bg-gray-50 text-[11px] uppercase tracking-wider font-bold text-gray-400 rounded-xl">
        <div className="col-span-1 flex justify-center">
          <input
            type="checkbox"
            checked={allSelected}
            onChange={toggleSelectAll}
            className="w-4 h-4 rounded border-gray-300 text-blue-600 transition"
            title="Select all on this page"
          />
        </div>
        <div className="col-span-3">Tourist / Reference</div>
        <div className="col-span-2">Stay Dates</div>
        <div className="col-span-2">Package</div>
        <div className="col-span-2">Status</div>
        <div className="col-span-1 text-center">Guests</div>
        <div className="col-span-1 text-right">Actions</div>
      </div>

      {/* Booking Items */}
      <div className="grid grid-cols-1 gap-4">
        {bookings.map((b) => {
          const isArchived = b.is_archived;
          const isUnread = b.read_byStaff === false;
          const isSelected = selectedIds.includes(b.id);
          const statusMeta = statusChoices.find((s) => s.value === b.status);

          return (
            <div
              key={b.id}
              className={`relative bg-white border rounded-2xl p-4 md:p-0 shadow-sm transition-all duration-200 
                ${isSelected ? "ring-2 ring-blue-500 bg-blue-50/30" : "border-gray-100 hover:shadow-md"}
                ${isArchived ? "opacity-75 grayscale-[0.3]" : ""}
              `}
            >
              {/* Unread Indicator */}
              {isUnread && (
                <div className="absolute top-4 right-4 md:static md:hidden">
                   <span className="flex h-2 w-2 rounded-full bg-blue-500"></span>
                </div>
              )}

              <div className="md:grid md:grid-cols-12 md:gap-4 md:items-center md:px-6 md:py-4">
                
                {/* 1. Selection & Unread (Desktop only needs 1 col) */}
                <div className="flex items-center gap-3 md:col-span-1 md:justify-center mb-4 md:mb-0">
                  <input
                    type="checkbox"
                    className="w-5 h-5 md:w-4 md:h-4 rounded border-gray-300 text-blue-600 transition"
                    checked={isSelected}
                    onChange={() => toggleSelectOne(b.id)}
                  />
                  {isUnread && <span className="hidden md:block w-2 h-2 rounded-full bg-blue-500 animate-pulse"></span>}
                </div>

                {/* 2. Tourist Info */}
                <div className="col-span-3 mb-3 md:mb-0">
                  <p className={`text-base md:text-sm leading-tight ${isUnread ? "font-bold text-gray-900" : "text-gray-700"}`}>
                    {b.tourist_name || b.tourist}
                  </p>
                  <p className="text-[10px] font-mono text-gray-400 mt-1 uppercase flex items-center gap-1">
                    Ref: 
                    <Link 
                      to={`/billing/${b.bill_reference}`} 
                      className="text-blue-500 hover:text-blue-700 hover:underline transition-colors"
                    >
                      {b.bill_reference?.slice(-8) || "N/A"}
                    </Link>
                  </p>
                </div>

                {/* 3. Dates - check-in green, check-out purple */}
                <div className="col-span-2 flex flex-wrap gap-2 mb-3 md:mb-0">
                  <div className="bg-green-100 text-green-700 px-2 py-1 rounded text-xs font-medium">
                    {b.check_in ? moment(b.check_in).format("MMM DD") : "—"}
                  </div>
                  <div className="bg-gray-100 text-gray-700 px-2 py-1 rounded text-xs font-medium">To</div>
                  <div className="bg-purple-100 text-purple-700 px-2 py-1 rounded text-xs font-medium">
                    {b.check_out ? moment(b.check_out).format("MMM DD") : "—"}
                  </div>
                </div>

                {/* 4. Package & Event */}
                <div className="col-span-2 mb-3 md:mb-0">
                  <p className="text-xs font-semibold text-gray-800">{b.package_name || "Custom"}</p> 
                  <button
                    disabled={isArchived}
                    onClick={() => { markAsRead(b); openAssignEvent(b); }}
                    className={`text-[9px] mt-1 px-2 py-0.5 rounded-full border transition-all ${
                        b.event ? "bg-green-50 border-green-100 text-green-600" : "bg-pink-50 border-pink-100 text-pink-600"
                    }`}
                  >
                    {b.event ? "✓ Linked" : "+ Link Event"}
                  </button>
                </div>

                {/* 5. Status - colored badge + plain (uncolored) dropdown */}
                <div className="col-span-2 mb-4 md:mb-0 flex items-center gap-2 flex-wrap">
                  <span
                    className={`text-[10px] px-2 py-1 rounded-full font-bold text-white shadow-sm ${
                      statusColors[b.status] || "bg-gray-400"
                    }`}
                  >
                    {statusMeta?.label || b.status}
                  </span>
                  <select
                    value={b.status}
                    disabled={isArchived}
                    onChange={(e) => { markAsRead(b); handleStatusChange(b.id, e.target.value); }}
                    className="text-[11px] px-4 py-1 rounded-lg border border-gray-300 bg-white text-gray-700 font-medium shadow-sm outline-none focus:border-blue-500"
                  >
                    {statusChoices.map((s) => (
                      <option key={s.value} value={s.value}>{s.label}</option>
                    ))}
                  </select>
                </div>

                {/* 6. Guests */}
                <div className="col-span-1 flex items-center justify-between md:justify-center border-t border-gray-50 pt-3 md:pt-0 md:border-none">
                  <span className="text-xs font-bold text-gray-400 md:hidden uppercase tracking-widest">Guests</span>
                  <div className="text-center">
                    <span className="text-sm font-black text-blue-600">{b.guests?.length || 0}</span>
                    {b.guests?.length > 0 && (
                      <button
                        onClick={() => { markAsRead(b); setGuestModal({ open: true, guests: b.guests, bookingId: b.id }); }}
                        className="block text-[10px] text-blue-500 font-bold hover:underline"
                      >
                        View
                      </button>
                    )}
                  </div>
                </div>

                {/* 7. Actions - justified to the end, pencil moved after the label */}
                <div className="col-span-1 flex justify-end mt-4 md:mt-0">
                  <button
                    onClick={() => { markAsRead(b); openEdit(b); }}
                    disabled={isArchived}
                    className="w-full md:w-auto flex items-center justify-end gap-2 bg-gray-50 hover:bg-gray-100 px-4 py-2 md:p-0 md:bg-transparent text-xs font-bold text-gray-500 hover:text-blue-600 rounded-xl transition-all"
                  >
                    <span className="md:hidden">Edit Booking</span>
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                    </svg>
                  </button>
                </div>

              </div>
            </div>
          );
        })}

        {/* Invisible placeholder rows keep the list the same height
            regardless of how many real bookings are on this page */}
        {Array.from({ length: placeholderCount }).map((_, i) => (
          <div
            key={`placeholder-${i}`}
            aria-hidden="true"
            className="invisible border rounded-2xl p-4 md:p-0 md:h-[75.9px]"
          />
        ))}
      </div>
    </div>
  );
}