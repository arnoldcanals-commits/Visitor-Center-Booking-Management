import { useContext, useState, useMemo } from "react";
import { StaffDataContext } from "../contexts/StaffDataContext";
import moment from "moment";
import BookingTable from "../components/booking/BookingTable";
import BookingModal from "../components/booking/BookingModal";
import GuestModal from "../components/booking/GuestModal";
import MessageBox from "../components/booking/MessageBox";
import ImagePreview from "../components/booking/ImagePreview";
import StatusTabs from "../components/booking/StatusTabs";
import YearMonthFilter from "../components/booking/YearMonthFilter";
import EventAssignModal from "../components/booking/EventAssignModal"; // New modal

const STATUS_CHOICES = [
  { value: "pending", label: "Pending", color: "bg-yellow-500" },
  { value: "approved", label: "Approved", color: "bg-blue-600" },
  { value: "cancelled", label: "Cancelled", color: "bg-red-600" },
  { value: "completed", label: "Completed", color: "bg-green-600" },
];

export default function Bookings() {
  const { staffData, createItem, updateItem, deleteItem, loading } = useContext(StaffDataContext);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [guestModal, setGuestModal] = useState({ open: false, guests: [], bookingId: null });
  const [eventModal, setEventModal] = useState({ open: false, booking: null, validEvents: [] }); // New
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

 // -------------------- BOOKINGS TODAY --------------------
const bookingsTodayCount = useMemo(() => {
  const today = moment(); // current date
  return (staffData.bookings || []).filter((b) => {
    if (!b.booking_date) return false;
    return moment(b.booking_date).isSame(today, "day"); // compare only the date part
  }).length;
}, [staffData.bookings]);

// -------------------- FILTERED BOOKINGS --------------------
const filteredBookings = useMemo(() => {
  let data = staffData.bookings || [];

  if (activeTab !== "all") data = data.filter((b) => b.status === activeTab);
  if (yearFilter) data = data.filter((b) => moment(b.booking_date).year() === parseInt(yearFilter));
  if (monthFilter) data = data.filter((b) => moment(b.booking_date).month() + 1 === parseInt(monthFilter));
  if (search) data = data.filter((b) => b.tourist_name?.toLowerCase().includes(search.toLowerCase()));

  data.sort((a, b) => new Date(b.booking_date) - new Date(a.booking_date));
  return data;
}, [search, staffData.bookings, activeTab, yearFilter, monthFilter]);


  const paginatedBookings = useMemo(() => {
    const start = (currentPage - 1) * entriesPerPage;
    return filteredBookings.slice(start, start + entriesPerPage);
  }, [filteredBookings, currentPage, entriesPerPage]);

  const totalPages = Math.max(1, Math.ceil(filteredBookings.length / entriesPerPage));

  // -------------------- MODAL HANDLERS --------------------
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

  const handleDelete = async (id) => {
    if (!confirm("Delete booking?")) return;
    await deleteItem("bookings", id);
  };

  const handleStatusChange = (bookingId, newStatus) => {
    const booking = staffData.bookings.find((b) => b.id === bookingId);
    if (!booking) return;

    setMessageBox({
      text: `Set status to "${newStatus}"?`,
      onConfirm: async () => {
        const updatedBooking = { ...booking, status: newStatus };
        await updateItem("bookings", bookingId, updatedBooking);
        setMessageBox(null);
      },
      onCancel: () => setMessageBox(null),
    });
  };

  // -------------------- EVENT ASSIGN --------------------
  const openAssignEvent = (booking) => {
    if (!booking.package) return;

    // valid events: duration within ±3 days of booking
    const validEvents = (staffData.events || []).filter((ev) => {
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
    const updatedBooking = { ...eventModal.booking, event: event.id };
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
            Bookings today: <span className="font-medium">{bookingsTodayCount}</span>
          </p>
        </div>
        <div className="flex gap-2 items-center">
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

      {/* Filters */}
      <StatusTabs activeTab={activeTab} setActiveTab={setActiveTab} statusChoices={STATUS_CHOICES} setCurrentPage={setCurrentPage} />
      <YearMonthFilter
        year={yearFilter}
        month={monthFilter}
        setYear={setYearFilter}
        setMonth={setMonthFilter}
        setCurrentPage={setCurrentPage}
      />

      {/* Table */}
      <BookingTable
        bookings={paginatedBookings}
        statusChoices={STATUS_CHOICES}
        statusColors={{
          pending: "bg-yellow-500 text-white",
          approved: "bg-blue-600 text-white",
          cancelled: "bg-red-600 text-white",
          completed: "bg-green-600 text-white",
        }}
        openEdit={openEdit}
        handleDelete={handleDelete}
        handleStatusChange={handleStatusChange}
        setGuestModal={setGuestModal}
        currentPage={currentPage}
        totalPages={totalPages}
        setCurrentPage={setCurrentPage}
        openAssignEvent={openAssignEvent} // pass the new handler
      />

      {/* Modals */}
      <BookingModal
        isOpen={isModalOpen}
        close={() => setIsModalOpen(false)}
        form={form}
        setForm={setForm}
        handleSave={handleSave}
        editing={editing}
        users={staffData.users}
        events={staffData.events}
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
        createItem={createItem} // optionally allow creating new event
      />

      <MessageBox messageBox={messageBox} setMessageBox={setMessageBox} />
      <ImagePreview image={imagePreview} close={() => setImagePreview(null)} />
    </div>
  );
}
