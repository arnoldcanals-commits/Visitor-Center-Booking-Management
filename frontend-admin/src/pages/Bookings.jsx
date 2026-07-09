import { useContext, useState, useMemo, useEffect } from "react";
import { AdminDataContext } from "../contexts/AdminDataContext";
import moment from "moment";
import BookingTable from "../components/booking/BookingTable";
import BookingModal from "../components/booking/BookingModal";
import GuestModal from "../components/booking/GuestModal";
import MessageBox from "../components/booking/MessageBox";
import ImagePreview from "../components/booking/ImagePreview";
import YearMonthFilter from "../components/booking/YearMonthFilter";
import EventAssignModal from "../components/booking/EventAssignModal";
import { Ticket } from "lucide-react";

const STATUS_CHOICES = [
  { value: "pending", label: "Pending", color: "bg-yellow-500" },
  { value: "approved", label: "Approved", color: "bg-blue-600" },
  { value: "cancelled", label: "Cancelled", color: "bg-red-600" },
  { value: "completed", label: "Completed", color: "bg-green-600" },
  { value: "active", label: "Active", color: "bg-green-600" },
  { value: "rejected", label: "Rejected", color: "bg-red-600" },
];

// How many entries per page to size the min-height against.
// Keeps the table area stable whether a page has 1 row or a full page.
const ROW_HEIGHT_PX = 56; // approx height per table row, tune to your BookingTable styling
const HEADER_HEIGHT_PX = 44; // approx height of the table header row

export default function Bookings() {
  const { adminData, createItem, updateItem, deleteItem, loading } = useContext(AdminDataContext);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [guestModal, setGuestModal] = useState({ open: false, guests: [], bookingId: null });
  const [eventModal, setEventModal] = useState({ open: false, booking: null, validEvents: [] });
  const [editing, setEditing] = useState(null);
  const [messageBox, setMessageBox] = useState(null);
  const [activeTab, setActiveTab] = useState("all");
  const [yearFilter, setYearFilter] = useState("");
  const [monthFilter, setMonthFilter] = useState("");
  const [form, setForm] = useState({ tourist: "", check_in: "", check_out: "", total_amount: "", event: "" });
  const [search, setSearch] = useState("");
  const [entriesPerPage, setEntriesPerPage] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);
  const [imagePreview, setImagePreview] = useState(null);

  const [showArchived, setShowArchived] = useState(false);

  // New state for bulk checkbox selection
  const [selectedIds, setSelectedIds] = useState([]);

  // Reset selection when switching views or tabs
  useEffect(() => {
    setSelectedIds([]);
  }, [showArchived, activeTab]);

  // -------------------- BOOKINGS TODAY --------------------
  const bookingsTodayCount = useMemo(() => {
    const today = moment();
    return (adminData.bookings || []).filter((b) => {
      if (!b.booking_date) return false;
      return moment(b.booking_date).isSame(today, "day");
    }).length;
  }, [adminData.bookings]);

  const bookingsCount = useMemo(() => {
  return (adminData.bookings || []).length;
}, [adminData.bookings]);

const bookingsPendingCount = useMemo(() => {
  return (adminData.bookings || []).filter((b) => b.status === "pending").length;
}, [adminData.bookings]);

const bookingsRejectedCount = useMemo(() => {
  return (adminData.bookings || []).filter((b) => b.status === "rejected").length;
}, [adminData.bookings]);


const today = new Date();

// ==========================================
// PENDING BOOKINGS
// ==========================================

const bookingsPendingTodayCount = useMemo(() => {
  const today = moment();
  return (adminData.bookings || []).filter((b) => {
    if (!b.booking_date) return false;
    if (b.status !== "pending") return false;
    return moment(b.booking_date).isSame(today, "day");
  }).length;
}, [adminData.bookings]);


const bookingsPendingThisMonthCount = useMemo(() => {
  return (adminData.bookings || []).filter((b) => {
    const d = new Date(b.createdAt);
    return b.status === "pending" && d.getMonth() === today.getMonth() && d.getFullYear() === today.getFullYear();
  }).length;
}, [adminData.bookings]);

const bookingsPendingThisYearCount = useMemo(() => {
  return (adminData.bookings || []).filter((b) => {
    const d = new Date(b.createdAt);
    return b.status === "pending" && d.getFullYear() === today.getFullYear();
  }).length;
}, [adminData.bookings]);


// ==========================================
// APPROVED BOOKINGS
// ==========================================
const bookingsApprovedTodayCount = useMemo(() => {
  return (adminData.bookings || []).filter((b) => {
    const d = new Date(b.createdAt);
    return b.status === "approved" && d.toDateString() === today.toDateString();
  }).length;
}, [adminData.bookings]);

const bookingsApprovedThisMonthCount = useMemo(() => {
  return (adminData.bookings || []).filter((b) => {
    const d = new Date(b.createdAt);
    return b.status === "approved" && d.getMonth() === today.getMonth() && d.getFullYear() === today.getFullYear();
  }).length;
}, [adminData.bookings]);

const bookingsApprovedThisYearCount = useMemo(() => {
  return (adminData.bookings || []).filter((b) => {
    const d = new Date(b.createdAt);
    return b.status === "approved" && d.getFullYear() === today.getFullYear();
  }).length;
}, [adminData.bookings]);


// ==========================================
// COMPLETED BOOKINGS
// ==========================================
const bookingsCompletedTodayCount = useMemo(() => {
  return (adminData.bookings || []).filter((b) => {
    const d = new Date(b.createdAt);
    return b.status === "completed" && d.toDateString() === today.toDateString();
  }).length;
}, [adminData.bookings]);

const bookingsCompletedThisMonthCount = useMemo(() => {
  return (adminData.bookings || []).filter((b) => {
    const d = new Date(b.createdAt);
    return b.status === "completed" && d.getMonth() === today.getMonth() && d.getFullYear() === today.getFullYear();
  }).length;
}, [adminData.bookings]);

const bookingsCompletedThisYearCount = useMemo(() => {
  return (adminData.bookings || []).filter((b) => {
    const d = new Date(b.createdAt);
    return b.status === "completed" && d.getFullYear() === today.getFullYear();
  }).length;
}, [adminData.bookings]);


// ==========================================
// CANCELLED BOOKINGS
// ==========================================
const bookingsCancelledTodayCount = useMemo(() => {
  return (adminData.bookings || []).filter((b) => {
    const d = new Date(b.createdAt);
    return b.status === "cancelled" && d.toDateString() === today.toDateString();
  }).length;
}, [adminData.bookings]);

const bookingsCancelledThisMonthCount = useMemo(() => {
  return (adminData.bookings || []).filter((b) => {
    const d = new Date(b.createdAt);
    return b.status === "cancelled" && d.getMonth() === today.getMonth() && d.getFullYear() === today.getFullYear();
  }).length;
}, [adminData.bookings]);

const bookingsCancelledThisYearCount = useMemo(() => {
  return (adminData.bookings || []).filter((b) => {
    const d = new Date(b.createdAt);
    return b.status === "cancelled" && d.getFullYear() === today.getFullYear();
  }).length;
}, [adminData.bookings]);


// ==========================================
// REJECTED BOOKINGS
// ==========================================
const bookingsRejectedTodayCount = useMemo(() => {
  return (adminData.bookings || []).filter((b) => {
    const d = new Date(b.createdAt);
    return b.status === "rejected" && d.toDateString() === today.toDateString();
  }).length;
}, [adminData.bookings]);

const bookingsRejectedThisMonthCount = useMemo(() => {
  return (adminData.bookings || []).filter((b) => {
    const d = new Date(b.createdAt);
    return b.status === "rejected" && d.getMonth() === today.getMonth() && d.getFullYear() === today.getFullYear();
  }).length;
}, [adminData.bookings]);

const bookingsRejectedThisYearCount = useMemo(() => {
  return (adminData.bookings || []).filter((b) => {
    const d = new Date(b.createdAt);
    return b.status === "rejected" && d.getFullYear() === today.getFullYear();
  }).length;
}, [adminData.bookings]);

const bookingsApprovedCount = useMemo(() => {
  return (adminData.bookings || []).filter((b) => b.status === "approved").length;
}, [adminData.bookings]);

const bookingsCompletedCount = useMemo(() => {
  return (adminData.bookings || []).filter((b) => b.status === "completed").length;
}, [adminData.bookings]);

const bookingsCancelledCount = useMemo(() => {
  return (adminData.bookings || []).filter((b) => b.status === "cancelled").length;
}, [adminData.bookings]);



  // -------------------- FILTERED BOOKINGS --------------------
  const filteredBookings = useMemo(() => {
    let data = adminData.bookings || [];

    data = data.filter((b) => !!b.is_archived === showArchived);

    if (activeTab !== "all") data = data.filter((b) => b.status === activeTab);
    if (yearFilter) data = data.filter((b) => moment(b.booking_date).year() === parseInt(yearFilter));
    if (monthFilter) data = data.filter((b) => moment(b.booking_date).month() + 1 === parseInt(monthFilter));
    if (search) data = data.filter((b) => b.tourist_name?.toLowerCase().includes(search.toLowerCase()));

    data.sort((a, b) => new Date(b.booking_date) - new Date(a.booking_date));
    return data;
  }, [search, adminData.bookings, activeTab, yearFilter, monthFilter, showArchived]);

  const paginatedBookings = useMemo(() => {
    const start = (currentPage - 1) * entriesPerPage;
    return filteredBookings.slice(start, start + entriesPerPage);
  }, [filteredBookings, currentPage, entriesPerPage]);

  const totalPages = Math.max(1, Math.ceil(filteredBookings.length / entriesPerPage));

  // Clamp currentPage if filters shrink the result set below it
  useEffect(() => {
    if (currentPage > totalPages) setCurrentPage(totalPages);
  }, [totalPages, currentPage]);

  // -------------------- PAGE NUMBERS --------------------
  // Builds a compact page list with ellipses, e.g. 1 ... 4 5 [6] 7 8 ... 20
  const pageNumbers = useMemo(() => {
    const pages = [];
    const delta = 1; // how many neighbors to show around currentPage
    const range = [];

    for (let i = Math.max(2, currentPage - delta); i <= Math.min(totalPages - 1, currentPage + delta); i++) {
      range.push(i);
    }

    if (currentPage - delta > 2) {
      pages.push(1, "...");
    } else {
      pages.push(1);
    }

    pages.push(...range);

    if (currentPage + delta < totalPages - 1) {
      pages.push("...", totalPages);
    } else if (totalPages > 1) {
      pages.push(totalPages);
    }

    return [...new Set(pages)];
  }, [currentPage, totalPages]);

  // -------------------- HANDLERS --------------------

  // Bulk action for checkboxes
  const handleBulkAction = async () => {
    const actionText = showArchived ? "restore" : "archive";
    if (!confirm(`Are you sure you want to ${actionText} ${selectedIds.length} selected bookings?`)) return;

    const promises = selectedIds.map(id => {
      const booking = adminData.bookings.find(b => b.id === id);
      return updateItem("bookings", id, {
        ...booking,
        is_archived: !showArchived,
        read_byStaff: true
      });
    });

    await Promise.all(promises);
    setSelectedIds([]); // Clear selection after action
  };

  const openCreate = () => {
    setEditing(null);
    setForm({ tourist: "", check_in: "", check_out: "", total_amount: "", event: "" });
    setIsModalOpen(true);
  };

  const openEdit = (item) => {
    setEditing(item.id);
    setForm({
      tourist: item.tourist || "",
      check_in: item.check_in || "",
      check_out: item.check_out || "",
      total_amount: item.total_amount || "",
      event: item.event || "",
    });
    setIsModalOpen(true);
  };

  const handleSave = async () => {
    if (!confirm(editing ? "Save changes to this booking?" : "Create new booking?")) return;
    if (editing) await updateItem("bookings", editing, form);
    else await createItem("bookings", form);
    setIsModalOpen(false);
  };

  const handleArchive = async (id) => {
    const booking = adminData.bookings.find((b) => b.id === id);
    if (!booking) return;

    await updateItem("bookings", id, {
      ...booking,
      is_archived: !booking.is_archived,
      read_byStaff: true
    });
  };

  const handleStatusChange = (bookingId, newStatus) => {
    const booking = adminData.bookings.find((b) => b.id === bookingId);
    if (!booking) return;

    setMessageBox({
      text: `Set status to "${newStatus}"?`,
      onConfirm: async () => {
        const updatedBooking = { ...booking, status: newStatus, read_byStaff: true };
        await updateItem("bookings", bookingId, updatedBooking);
        setMessageBox(null);
      },
      onCancel: () => setMessageBox(null),
    });
  };

  const openAssignEvent = (booking) => {
    if (!booking.package) return;
    const validEvents = (adminData.events || []).filter((ev) => {
      if (ev.package !== booking.package) return false;
      const eventStart = moment(ev.start_date);
      const eventEnd = moment(ev.end_date);
      const checkIn = moment(booking.check_in);
      const checkOut = moment(booking.check_out);
      const daysDiffStart = Math.abs(checkIn.diff(eventStart, "days"));
      const daysDiffEnd = Math.abs(checkOut.diff(eventEnd, "days"));
      return daysDiffStart <= 3 && daysDiffEnd <= 3;
    });
    setEventModal({ open: true, booking, validEvents });
  };

  const assignEventToBooking = async (event) => {
    if (!eventModal.booking) return;
    const updatedBooking = { ...eventModal.booking, event: event.id, read_byStaff: true };
    await updateItem("bookings", eventModal.booking.id, updatedBooking);
    setEventModal({ open: false, booking: null, validEvents: [] });
  };

  if (loading) return <div>Loading bookings...</div>;

  return (
    <div>
      {/* Header & Controls */}
      <div className="flex flex-col gap-4 mb-4 w-full">
  
  {/* ROW 1: Page Title (Left) & Actions (Right) */}
  <div className="flex items-center justify-between w-full bg-white rounded-xl shadow p-4">
    <div className="flex items-center gap-2 p-3 bg-green-50 text-green-600 rounded-xl w-fit border border-purple-100">
      <Ticket size={18} />
      <span className="text-sm font-black uppercase tracking-tight">Booking Management</span>
    </div>

    <div className="flex gap-2 items-center">
      {/* BULK RESTORE/ARCHIVE BUTTON */}
      {selectedIds.length > 0 && (
        <button
          onClick={handleBulkAction}
          className={`px-4 py-2 rounded-lg text-sm font-bold shadow-md transition-all ${
            showArchived
              ? "bg-green-600 hover:bg-green-700 text-white"
              : "bg-red-600 hover:bg-red-700 text-white"
          }`}
        >
          {showArchived ? `Restore (${selectedIds.length})` : `Archive (${selectedIds.length})`}
        </button>
      )}

      <button
        onClick={() => { setShowArchived(!showArchived); setCurrentPage(1); }}
        className={`text-sm px-3 py-2 rounded-lg text-sm font-medium border transition ${
          showArchived ? "bg-gray-800 text-white border-gray-800" : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
        }`}
      >
        {showArchived ? "View Active" : "View Archive"}
      </button>

      <button onClick={openCreate} className="px-3 py-2 bg-blue-600 text-white rounded-lg whitespace-nowrap text-sm">
        + Add Booking
      </button>
    </div>
  </div>

  {/* ROW 2: Booking's Today Counter */}
 <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 w-full">
  {/* Pending Bookings */}
  <div className="bg-white rounded-xl shadow p-4 flex flex-col justify-between min-w-0">
    <div className="flex items-center justify-between gap-2 mb-3">
      <h3 className="font-semibold text-gray-700 text-sm truncate">Pending</h3>
      <span className="text-xs bg-gray-100 text-gray-800 font-bold px-2 py-0.5 rounded-full">{bookingsPendingCount}</span>
    </div>
    <div className="flex items-center justify-between text-xs text-gray-500 border-t pt-2">
      <div>T: <span className="font-semibold text-black">{bookingsPendingTodayCount}</span></div>
      <div className="text-gray-300">|</div>
      <div>M: <span className="font-semibold text-black">{bookingsPendingThisMonthCount}</span></div>
      <div className="text-gray-300">|</div>
      <div>Y: <span className="font-semibold text-black">{bookingsPendingThisYearCount}</span></div>
    </div>
  </div>

  {/* Approved Bookings */}
  <div className="bg-white rounded-xl shadow p-4 flex flex-col justify-between min-w-0">
    <div className="flex items-center justify-between gap-2 mb-3">
      <h3 className="font-semibold text-gray-700 text-sm truncate">Approved</h3>
      <span className="text-xs bg-emerald-50 text-emerald-700 font-bold px-2 py-0.5 rounded-full">{bookingsApprovedCount}</span>
    </div>
    <div className="flex items-center justify-between text-xs text-gray-500 border-t pt-2">
      <div>T: <span className="font-semibold text-black">{bookingsApprovedTodayCount}</span></div>
      <div className="text-gray-300">|</div>
      <div>M: <span className="font-semibold text-black">{bookingsApprovedThisMonthCount}</span></div>
      <div className="text-gray-300">|</div>
      <div>Y: <span className="font-semibold text-black">{bookingsApprovedThisYearCount}</span></div>
    </div>
  </div>

  {/* Completed Bookings */}
  <div className="bg-white rounded-xl shadow p-4 flex flex-col justify-between min-w-0">
    <div className="flex items-center justify-between gap-2 mb-3">
      <h3 className="font-semibold text-gray-700 text-sm truncate">Completed</h3>
      <span className="text-xs bg-blue-50 text-blue-700 font-bold px-2 py-0.5 rounded-full">{bookingsCompletedCount}</span>
    </div>
    <div className="flex items-center justify-between text-xs text-gray-500 border-t pt-2">
      <div>T: <span className="font-semibold text-black">{bookingsCompletedTodayCount}</span></div>
      <div className="text-gray-300">|</div>
      <div>M: <span className="font-semibold text-black">{bookingsCompletedThisMonthCount}</span></div>
      <div className="text-gray-300">|</div>
      <div>Y: <span className="font-semibold text-black">{bookingsCompletedThisYearCount}</span></div>
    </div>
  </div>

  {/* Cancelled Bookings */}
  <div className="bg-white rounded-xl shadow p-4 flex flex-col justify-between min-w-0">
    <div className="flex items-center justify-between gap-2 mb-3">
      <h3 className="font-semibold text-gray-700 text-sm truncate">Cancelled</h3>
      <span className="text-xs bg-amber-50 text-amber-700 font-bold px-2 py-0.5 rounded-full">{bookingsCancelledCount}</span>
    </div>
    <div className="flex items-center justify-between text-xs text-gray-500 border-t pt-2">
      <div>T: <span className="font-semibold text-black">{bookingsCancelledTodayCount}</span></div>
      <div className="text-gray-300">|</div>
      <div>M: <span className="font-semibold text-black">{bookingsCancelledThisMonthCount}</span></div>
      <div className="text-gray-300">|</div>
      <div>Y: <span className="font-semibold text-black">{bookingsCancelledThisYearCount}</span></div>
    </div>
  </div>

  {/* Rejected Bookings */}
  <div className="bg-white rounded-xl shadow p-4 flex flex-col justify-between min-w-0">
    <div className="flex items-center justify-between gap-2 mb-3">
      <h3 className="font-semibold text-gray-700 text-sm truncate">Rejected</h3>
      <span className="text-xs bg-rose-50 text-rose-700 font-bold px-2 py-0.5 rounded-full">{bookingsRejectedCount}</span>
    </div>
    <div className="flex items-center justify-between text-xs text-gray-500 border-t pt-2">
      <div>T: <span className="font-semibold text-black">{bookingsRejectedTodayCount}</span></div>
      <div className="text-gray-300">|</div>
      <div>M: <span className="font-semibold text-black">{bookingsRejectedThisMonthCount}</span></div>
      <div className="text-gray-300">|</div>
      <div>Y: <span className="font-semibold text-black">{bookingsRejectedThisYearCount}</span></div>
    </div>
  </div>
</div>

  {/* ROW 3: Filters (Search, Dropdowns, and Year/Month Filter) */}
  <div className="flex flex-wrap items-center justify-between gap-4 w-full bg-white rounded-xl shadow p-4">
    <div className="flex flex-wrap gap-2 items-center text-slate-600">
      <input
        type="text"
        placeholder="Search by tourist..."
        value={search}
        onChange={(e) => { setSearch(e.target.value); setCurrentPage(1); }}
        className="border border-gray-300 text-gray-700 text-sm p-2 rounded-lg outline-none focus:border-blue-500 placeholder-gray-400"
      />

      {/* STATUS FILTER DROPDOWN */}
      <select
        value={activeTab}
        onChange={(e) => { setActiveTab(e.target.value); setCurrentPage(1); }}
        className="border border-gray-300 text-gray-700 text-sm p-2 rounded-lg outline-none focus:border-blue-500 placeholder-gray-400"
      >
        <option value="all">All</option>
        {STATUS_CHOICES.map((s) => (
          <option key={s.value} value={s.value}>{s.label}</option>
        ))}
      </select>

      <select
        value={entriesPerPage}
        onChange={(e) => { setEntriesPerPage(parseInt(e.target.value)); setCurrentPage(1); }}
        className="border border-gray-300 text-gray-700 text-sm p-2 rounded-lg outline-none focus:border-blue-500 placeholder-gray-400 px-6"
      >
        {[5, 10, 25, 50].map((n) => (
          <option key={n} value={n}>{n} per page</option>
        ))}
      </select>
    </div>

    {/* Custom Date Filters */}
    <YearMonthFilter
      year={yearFilter}
      month={monthFilter}
      setYear={setYearFilter}
      setMonth={setMonthFilter}
      setCurrentPage={setCurrentPage}
    />
  </div>

</div>

    

      {/* Fixed-height wrapper so the page doesn't jump as row count changes per page */}
      <div
   
        className="flex flex-col"
      >
        <BookingTable
          bookings={paginatedBookings}
          entriesPerPage={entriesPerPage}
          selectedIds={selectedIds}
          setSelectedIds={setSelectedIds}
          statusChoices={STATUS_CHOICES}
          statusColors={{
            pending: "bg-yellow-500 text-white",
            approved: "bg-blue-600 text-white",
            cancelled: "bg-red-600 text-white",
            completed: "bg-green-600 text-white",
            active: "bg-green-600 text-white",
            rejected: "bg-red-600 text-white",
          }}
          openEdit={openEdit}
          handleArchive={handleArchive}
          handleStatusChange={handleStatusChange}
          setGuestModal={setGuestModal}
          currentPage={currentPage}
          totalPages={totalPages}
          setCurrentPage={setCurrentPage}
          openAssignEvent={openAssignEvent}
        />
      </div>

      {/* Pagination Controls */}
      <div className="flex items-center justify-between mt-4">
        <p className="text-sm text-gray-500">
          Showing page <span className="font-medium text-black">{currentPage}</span> of{" "}
          <span className="font-medium text-black">{totalPages}</span>
          {" "}({filteredBookings.length} total)
        </p>
        <div className="flex gap-1 items-center">
          <button
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            disabled={currentPage === 1}
            className={`px-3 py-2 rounded-lg text-sm font-medium border transition ${
              currentPage === 1
                ? "bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed"
                : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
            }`}
          >
            Previous
          </button>

          {pageNumbers.map((p, idx) =>
            p === "..." ? (
              <span key={`ellipsis-${idx}`} className="px-2 text-sm text-gray-400 select-none">
                ...
              </span>
            ) : (
              <button
                key={p}
                onClick={() => setCurrentPage(p)}
                className={`min-w-[2.25rem] px-3 py-2 rounded-lg text-sm font-medium border transition ${
                  p === currentPage
                    ? "bg-blue-600 text-white border-blue-600"
                    : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
                }`}
              >
                {p}
              </button>
            )
          )}

          <button
            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
            className={`px-3 py-2 rounded-lg text-sm font-medium border transition ${
              currentPage === totalPages
                ? "bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed"
                : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
            }`}
          >
            Next
          </button>
        </div>
      </div>

      {/* Modals */}
      <BookingModal
        isOpen={isModalOpen}
        close={() => setIsModalOpen(false)}
        form={form}
        setForm={setForm}
        handleSave={handleSave}
        editing={editing}
        users={adminData.users}
        events={adminData.events}
      />

      <GuestModal
        guestModal={guestModal}
        setGuestModal={setGuestModal}
        updateItem={updateItem}
      />

      <EventAssignModal
        eventModal={eventModal}
        setEventModal={setEventModal}
        assignEvent={assignEventToBooking}
        createItem={createItem}
      />

      <MessageBox messageBox={messageBox} setMessageBox={setMessageBox} />
      <ImagePreview image={imagePreview} close={() => setImagePreview(null)} />
    </div>
  );
}