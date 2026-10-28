import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import Topbar from "../../components/TopBar";
import api from "../../api";
import {
  ArrowLeft,
  Users,
  CheckCircle2,
  CalendarDays,
  X,
  ChevronDown,
  ChevronUp,
  Package,
  Sparkles,
  Wallet,
  Receipt,
  Coins,
} from "lucide-react";
import PaymentMethodSelector from "../../components/PaymentMethodSelector";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import "./calendar.css";
import GuestManagement from "../Guests";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";

/* =======================
   Collapsible section
   ======================= */
function CollapsibleSection({ title, icon: Icon, isOpen, onToggle, children, trailing }) {
  return (
    <div className="border border-gray-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 overflow-hidden">
      <button
        type="button"
        onClick={onToggle}
        className="w-full flex items-center justify-between p-4 text-left"
      >
        <div className="flex items-center gap-2">
          {Icon && <Icon size={18} style={{ color: "var(--accent)" }} />}
          <span className="font-semibold text-gray-900 dark:text-slate-100">{title}</span>
        </div>
        <div className="flex items-center gap-3">
          {trailing}
          {isOpen ? (
            <ChevronUp size={18} className="text-gray-500 dark:text-slate-400" />
          ) : (
            <ChevronDown size={18} className="text-gray-500 dark:text-slate-400" />
          )}
        </div>
      </button>
      {isOpen && <div className="px-4 pb-4 pt-0">{children}</div>}
    </div>
  );
}

export default function BookingPage() {
  const [showGuests, setShowGuests] = useState(false);
  const { id } = useParams();
  const navigate = useNavigate();

  const [pkg, setPkg] = useState(null);
  const [user, setUser] = useState(null);
  const [userGuests, setUserGuests] = useState([]);
  const [loading, setLoading] = useState(true);

  const [form, setForm] = useState({
    startDate: new Date(),
    endDate: new Date(),
    guests: [],
    activities: [],
    paymentMethod: "gcash",
  });

  // Which sections are expanded
  const [openSections, setOpenSections] = useState({
    details: true,
    activities: true,
    dates: true,
    guests: true,
    payment: true,
  });
  const toggleSection = (key) =>
    setOpenSections((s) => ({ ...s, [key]: !s[key] }));

  // Read-only Tiptap editor for the package description
  const descriptionEditor = useEditor({
    extensions: [StarterKit],
    editable: false,
    content: "",
  });

  const fetchPackage = useCallback(async () => {
    try {
      const res = await api.get(`api/packages/${id}/`);
      setPkg(res.data);
    } catch {
      navigate("/packages");
    } finally {
      setLoading(false);
    }
  }, [id, navigate]);

  const fetchUser = useCallback(async () => {
    try {
      const res = await api.get("api/user/me/");
      setUser(res.data);
    } catch {}
  }, []);

  const fetchUserGuests = useCallback(async () => {
    try {
      const res = await api.get("api/guests/");
      setUserGuests(res.data);
    } catch {}
  }, []);

  useEffect(() => {
    fetchPackage();
    fetchUser();
    fetchUserGuests();
  }, [fetchPackage, fetchUser, fetchUserGuests]);

  // push the description into the editor once it (or the editor) is ready
  useEffect(() => {
    if (descriptionEditor && pkg?.description) {
      descriptionEditor.commands.setContent(pkg.description);
    }
  }, [descriptionEditor, pkg]);

  const handleGuestToggle = (guest) => {
    setForm((f) => {
      const exists = f.guests.find((g) => g.id === guest.id);
      return exists
        ? { ...f, guests: f.guests.filter((g) => g.id !== guest.id) }
        : { ...f, guests: [...f.guests, guest] };
    });
  };

  const handleActivityToggle = (activity) => {
    setForm((f) => {
      const exists = f.activities.find((a) => a.id === activity.id);
      return exists
        ? { ...f, activities: f.activities.filter((a) => a.id !== activity.id) }
        : { ...f, activities: [...f.activities, activity] };
    });
  };

  const handleDateChange = (field, value) => {
    if (!value) return;

    setForm((prev) => {
      const updated = { ...prev, [field]: value };

      if (field === "startDate" && updated.endDate < value) {
        updated.endDate = value;
      }

      return updated;
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (form.guests.length === 0) {
      alert("Select at least one guest!");
      return;
    }

    const payload = {
      package: pkg.id,
      check_in: form.startDate.toISOString(),
      check_out: form.endDate.toISOString(),
      payment_method: form.paymentMethod,
      guests: form.guests.map((g) => ({
        guest: g.id,
      })),
      activity_ids: form.activities.map((a) => a.id),
    };

    try {
      await api.post("api/booking/book/", payload);
      alert("Booking successful!");
      navigate("/booking/my/");
    } catch (err) {
      console.error(err.response?.data || err);
      alert("Booking failed");
    }
  };

  if (loading || !pkg || !user) return null;

  const totalSlots = Math.ceil(userGuests.length / 4) * 4;
  const placeholders = Array.from({
    length: totalSlots - userGuests.length,
  });

  const activitiesTotal = form.activities.reduce(
    (sum, a) => sum + Number(a.extra_price || 0),
    0
  );
  const guestCount = form.guests.length || 1;
  const total = pkg.base_price * guestCount + activitiesTotal;

  return (
    <div
      className="min-h-screen bg-white dark:bg-slate-900 transition-colors"
      style={{ fontFamily: "'Poppins', sans-serif" }}
    >
      <link
        href="https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;700&display=swap"
        rel="stylesheet"
      />
      <Topbar />

      <div className="max-w-6xl mx-auto p-4 sm:p-6 mt-6 sm:mt-12">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 text-white px-4 py-2 rounded-lg font-semibold hover:brightness-90 transition"
            style={{ backgroundColor: "var(--accent)" }}
          >
            <ArrowLeft size={16} />
            Return
          </button>

          <button
            onClick={() => setShowGuests(true)}
            className="flex items-center gap-2 px-4 py-2 text-white rounded-lg shadow hover:brightness-90 transition"
            style={{ backgroundColor: "var(--accent)" }}
          >
            <Users size={16} />
            Manage Guests
          </button>

          {showGuests && (
            <div className="fixed inset-0 z-40 flex items-start justify-center bg-black/30 dark:bg-black/60 backdrop-blur-sm p-4 pt-20 overflow-y-auto">
              <div className="bg-gray-50 dark:bg-slate-900 rounded-2xl shadow-xl w-full max-w-6xl relative mb-8">
                <button
                  onClick={() => setShowGuests(false)}
                  className="absolute top-3 right-3 z-10 h-8 w-8 flex items-center justify-center rounded-full bg-white dark:bg-slate-700 text-gray-600 dark:text-slate-200 shadow hover:bg-gray-100 dark:hover:bg-slate-600 transition"
                  aria-label="Close"
                >
                  <X size={16} />
                </button>
                {/* embedded: suppresses GuestManagement's own <TopBar/> since we're already inside a modal */}
                <GuestManagement embedded />
              </div>
            </div>
          )}
        </div>

        <h1
          className="text-xl sm:text-2xl font-bold text-gray-100 mb-6 rounded-lg p-2 text-center"
          style={{ backgroundColor: "var(--accent)" }}
        >
          Book: {pkg.name}
        </h1>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {/* 1. Package details */}
          <CollapsibleSection
            title="Package Details"
            icon={Package}
            isOpen={openSections.details}
            onToggle={() => toggleSection("details")}
          >
            <div className="border rounded-lg overflow-hidden border-gray-300 dark:border-slate-600">
              {pkg.image && (
                <img
                  src={pkg.image}
                  alt={pkg.name}
                  className="w-full h-48 sm:h-64 object-cover"
                />
              )}
              <div className="p-4">
                <h2 className="font-semibold text-lg sm:text-xl text-gray-900 dark:text-slate-100">
                  {pkg.name}
                </h2>
                <div className="mt-1 text-gray-600 dark:text-slate-300 prose prose-sm dark:prose-invert max-w-none [&_p]:m-0">
                  <EditorContent editor={descriptionEditor} />
                </div>
              </div>
            </div>

            <div className="flex justify-between font-semibold text-gray-700 dark:text-slate-200 text-base sm:text-lg mt-4">
              <span>Base Price: ₱{pkg.base_price}</span>
              <span>Total: ₱{total}</span>
            </div>
          </CollapsibleSection>

          {/* 2. Activities */}
          {pkg.activities?.length > 0 && (
            <CollapsibleSection
              title="Activities"
              icon={Sparkles}
              isOpen={openSections.activities}
              onToggle={() => toggleSection("activities")}
              trailing={
                form.activities.length > 0 && (
                  <span
                    className="text-xs font-semibold px-2 py-0.5 rounded-full text-white"
                    style={{ backgroundColor: "var(--accent)" }}
                  >
                    {form.activities.length}
                  </span>
                )
              }
            >
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {pkg.activities
                  .filter((a) => a.is_active)
                  .map((activity) => {
                    const selected = form.activities.some(
                      (a) => a.id === activity.id
                    );
                    return (
                      <div
                        key={activity.id}
                        onClick={() => handleActivityToggle(activity)}
                        className="p-3 border rounded-lg cursor-pointer transition bg-gray-50 dark:bg-slate-900 border-gray-200 dark:border-slate-600"
                        style={
                          selected
                            ? {
                                backgroundColor:
                                  "color-mix(in srgb, var(--accent) 12%, transparent)",
                                borderColor: "var(--accent)",
                              }
                            : undefined
                        }
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <h4 className="font-semibold text-sm text-gray-900 dark:text-slate-100">
                              {activity.name}
                            </h4>
                            {activity.description && (
                              <p className="text-xs text-gray-600 dark:text-slate-300 mt-0.5">
                                {activity.description}
                              </p>
                            )}
                          </div>
                          {selected && (
                            <CheckCircle2
                              size={16}
                              className="shrink-0"
                              style={{ color: "var(--accent)" }}
                            />
                          )}
                        </div>
                        {Number(activity.extra_price) > 0 && (
                          <p className="text-xs font-medium text-gray-700 dark:text-slate-200 mt-1">
                            +₱{activity.extra_price}
                          </p>
                        )}
                      </div>
                    );
                  })}
              </div>
            </CollapsibleSection>
          )}

          {/* 3. Preferred dates (with time) */}
          <CollapsibleSection
            title="Preferred Dates"
            icon={CalendarDays}
            isOpen={openSections.dates}
            onToggle={() => toggleSection("dates")}
          >
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1 flex flex-col">
                <label className="text-sm font-medium text-gray-600 dark:text-slate-300 mb-1">
                  Check-in
                </label>
                <div className="relative">
                  <DatePicker
                    selected={form.startDate}
                    onChange={(date) => handleDateChange("startDate", date)}
                    minDate={new Date()}
                    showTimeSelect
                    timeIntervals={30}
                    dateFormat="MMM d, yyyy h:mm aa"
                    portalId="datepicker-portal"
                    className="w-full border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-900 text-gray-900 dark:text-slate-100 p-2 pl-10 rounded-lg"
                  />
                  <CalendarDays
                    size={16}
                    className="absolute left-3 top-3 text-gray-400 dark:text-slate-500"
                  />
                </div>
              </div>

              <div className="flex-1 flex flex-col">
                <label className="text-sm font-medium text-gray-600 dark:text-slate-300 mb-1">
                  Check-out
                </label>
                <div className="relative">
                  <DatePicker
                    selected={form.endDate}
                    onChange={(date) => handleDateChange("endDate", date)}
                    minDate={form.startDate}
                    showTimeSelect
                    timeIntervals={30}
                    dateFormat="MMM d, yyyy h:mm aa"
                    portalId="datepicker-portal"
                    className="w-full border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-900 text-gray-900 dark:text-slate-100 p-2 pl-10 rounded-lg"
                  />
                  <CalendarDays
                    size={16}
                    className="absolute left-3 top-3 text-gray-400 dark:text-slate-500"
                  />
                </div>
              </div>
            </div>
          </CollapsibleSection>

          {/* 4. Guests, back to a grid */}
          <CollapsibleSection
            title="Guest List"
            icon={Users}
            isOpen={openSections.guests}
            onToggle={() => toggleSection("guests")}
            trailing={
              form.guests.length > 0 && (
                <span
                  className="text-xs font-semibold px-2 py-0.5 rounded-full text-white"
                  style={{ backgroundColor: "var(--accent)" }}
                >
                  {form.guests.length}
                </span>
              )
            }
          >
            {userGuests.length === 0 ? (
              <p className="text-sm text-gray-500 dark:text-slate-400 py-4 text-center">
                No guests yet. Tap &ldquo;Manage Guests&rdquo; above to add one.
              </p>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                {userGuests.map((g) => {
                  const selected = form.guests.find((x) => x.id === g.id);
                  return (
                    <div
                      key={g.id}
                      onClick={() => handleGuestToggle(g)}
                      className="aspect-square p-2 border rounded-lg cursor-pointer text-center transition bg-gray-50 dark:bg-slate-900 border-gray-200 dark:border-slate-600 flex flex-col items-center justify-center"
                      style={
                        selected
                          ? {
                              backgroundColor:
                                "color-mix(in srgb, var(--accent) 12%, transparent)",
                              borderColor: "var(--accent)",
                            }
                          : undefined
                      }
                    >
                      <h3 className="font-semibold text-sm text-gray-900 dark:text-slate-100">
                        {g.full_name}
                      </h3>
                      <p className="text-xs text-gray-600 dark:text-slate-300">
                        Age: {g.age}
                      </p>
                      {selected && (
                        <CheckCircle2
                          size={16}
                          className="mx-auto mt-1"
                          style={{ color: "var(--accent)" }}
                        />
                      )}
                    </div>
                  );
                })}

                {placeholders.map((_, i) => (
                  <div key={i} className="aspect-square invisible" />
                ))}
              </div>
            )}
          </CollapsibleSection>

          {/* 5. Payment */}
          <CollapsibleSection
            title="Payment Method"
            icon={Wallet}
            isOpen={openSections.payment}
            onToggle={() => toggleSection("payment")}
          >
            <PaymentMethodSelector
              value={form.paymentMethod}
              onChange={(val) =>
                setForm((prev) => ({ ...prev, paymentMethod: val }))
              }
            />
          </CollapsibleSection>

          {/* Confirm bar - sticky within the content column so it never
              overlays a fixed sidebar; scoped to this max-w-6xl wrapper */}
          <div
            className="sticky bottom-4 z-30 mt-2 bg-white/95 dark:bg-slate-800/95 backdrop-blur rounded-lg shadow-lg p-3 sm:p-4"
            style={{ borderTop: "3px solid var(--accent)" }}
          >
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <Receipt size={18} className="text-gray-500 dark:text-slate-400" />
                <div>
                  <p className="text-xs text-gray-500 dark:text-slate-400">Total</p>
                  <p className="text-lg font-bold text-gray-900 dark:text-slate-100 flex items-center gap-1">
                    <Coins size={16} style={{ color: "var(--accent)" }} />
                    ₱{total}
                  </p>
                </div>
              </div>
              <button
                type="submit"
                className="flex items-center gap-2 text-white py-3 px-6 rounded-lg font-semibold hover:brightness-90 transition"
                style={{ backgroundColor: "var(--accent)" }}
              >
                <CheckCircle2 size={18} />
                Confirm Booking
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}