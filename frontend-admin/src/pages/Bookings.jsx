import { useContext, useState, useMemo, useEffect } from "react";
import { AdminDataContext } from "../contexts/AdminDataContext";
import moment from "moment";
import BookingTable from "../components/booking/BookingTable";
import BookingModal from "../components/booking/BookingModal";
import GuestModal from "../components/booking/GuestModal";
import MessageBox from "../components/booking/MessageBox";
import ImagePreview from "../components/booking/ImagePreview";
import StatusTabs from "../components/booking/StatusTabs";
import YearMonthFilter from "../components/booking/YearMonthFilter";
import EventAssignModal from "../components/booking/EventAssignModal";

const STATUS_CHOICES = [
  { value: "pending", label: "Pending", color: "bg-yellow-500" },
  { value: "approved", label: "Approved", color: "bg-blue-600" },
  { value: "cancelled", label: "Cancelled", color: "bg-red-600" },
  { value: "completed", label: "Completed", color: "bg-green-600" },
  { value: "active", label: "Active", color: "bg-green-600" },
  { value: "rejected", label: "Rejected", color: "bg-red-600" },
];

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
      <div className="flex items-center justify-between gap-4 mb-4 ">
        <div>
          <h1 className="text-2xl font-semibold">Bookings</h1>
          <p className="text-sm text-gray-500">
            Bookings today: <span className="font-medium text-black">{bookingsTodayCount}</span>
          </p>
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
            className={`px-3 py-2 rounded-lg text-sm font-medium border transition ${
              showArchived ? "bg-gray-800 text-white border-gray-800" : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
            }`}
          >
            {showArchived ? "View Active" : "View Archive"}
          </button>

          <input
            type="text"
            placeholder="Search by tourist..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setCurrentPage(1); }}
            className="border p-2 rounded"
          />
          <select
            value={entriesPerPage}
            onChange={(e) => { setEntriesPerPage(parseInt(e.target.value)); setCurrentPage(1); }}
            className="border p-2 rounded pr-8"
          >
            {[5, 10, 25, 50].map((n) => (
              <option key={n} value={n}>{n} per page</option>
            ))}
          </select>
          <button onClick={openCreate} className="px-3 py-2 bg-blue-600 text-white rounded-lg">+ Add Booking</button>
        </div>
      </div>

      <StatusTabs activeTab={activeTab} setActiveTab={setActiveTab} statusChoices={STATUS_CHOICES} setCurrentPage={setCurrentPage} />
      
      <YearMonthFilter
        year={yearFilter}
        month={monthFilter}
        setYear={setYearFilter}
        setMonth={setMonthFilter}
        setCurrentPage={setCurrentPage}
      />

      <BookingTable
        bookings={paginatedBookings}
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