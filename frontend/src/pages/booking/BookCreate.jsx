import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import Topbar from "../../components/TopBar";
import api from "../../api";
import {
  ArrowLeft,
  ArrowRight,
  Users,
  CheckCircle2,
  CalendarDays,
  X,
  Package,
  Sparkles,
  Wallet,
  Minus,
  Plus,
  Check,
  Loader2,
} from "lucide-react";
import PaymentMethodSelector from "../../components/PaymentMethodSelector";
import DateTimeRangePicker from "../../components/DateTimeRangePicker";
import "./calendar.css";
import GuestManagement from "../Guests";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";

/* =======================
   Helpers
   ======================= */
const peso = (n) => `₱${Number(n || 0).toLocaleString()}`;

const addDays = (date, days) => {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
};

const fmtDateTime = (d) =>
  d.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });

// next half-hour from now, so the default check-in is never in the past
const nextHalfHour = () => {
  const HALF_HOUR = 30 * 60 * 1000;
  return new Date(Math.ceil((Date.now() + 60 * 1000) / HALF_HOUR) * HALF_HOUR);
};

/* =======================
   Step indicator
   ======================= */
function StepIndicator({ steps, current, onJump }) {
  return (
    <div className="mb-5">
      <div className="flex items-center">
        {steps.map((s, i) => {
          const done = i < current;
          const active = i === current;
          const Icon = s.icon;
          return (
            <div key={s.key} className="flex items-center flex-1 last:flex-none">
              <button
                type="button"
                onClick={() => done && onJump(i)}
                disabled={!done}
                aria-label={s.label}
                aria-current={active ? "step" : undefined}
                className="flex flex-col items-center gap-1 disabled:cursor-default"
              >
                <span
                  className={`h-9 w-9 rounded-full flex items-center justify-center border-2 transition ${
                    done || active
                      ? "text-white"
                      : "text-gray-400 dark:text-slate-500 border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-800"
                  }`}
                  style={
                    done || active
                      ? { backgroundColor: "var(--accent)", borderColor: "var(--accent)" }
                      : undefined
                  }
                >
                  {done ? <Check size={16} /> : <Icon size={16} />}
                </span>
                <span
                  className={`hidden sm:block text-xs ${
                    active
                      ? "font-semibold text-gray-900 dark:text-slate-100"
                      : "text-gray-500 dark:text-slate-400"
                  }`}
                >
                  {s.label}
                </span>
              </button>
              {i < steps.length - 1 && (
                <div
                  className={`h-0.5 flex-1 mx-1.5 sm:mb-5 rounded ${
                    done ? "" : "bg-gray-200 dark:bg-slate-700"
                  }`}
                  style={done ? { backgroundColor: "var(--accent)" } : undefined}
                />
              )}
            </div>
          );
        })}
      </div>
      <p className="sm:hidden text-center text-sm mt-3 text-gray-600 dark:text-slate-300">
        Step {current + 1} of {steps.length}
        <span className="font-semibold text-gray-900 dark:text-slate-100">
          {" "}
          · {steps[current].label}
        </span>
      </p>
    </div>
  );
}

/* =======================
   Small quantity stepper (big touch targets)
   ======================= */
function QuantityStepper({ value, min = 1, max, onChange }) {
  const btn =
    "h-10 w-10 flex items-center justify-center rounded-full border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-gray-800 dark:text-slate-100 disabled:opacity-40 active:scale-95 transition";
  return (
    <div className="flex items-center gap-3" onClick={(e) => e.stopPropagation()}>
      <button
        type="button"
        className={btn}
        onClick={() => onChange(Math.max(min, value - 1))}
        disabled={value <= min}
        aria-label="Fewer participants"
      >
        <Minus size={16} />
      </button>
      <span className="w-6 text-center font-semibold text-gray-900 dark:text-slate-100 tabular-nums">
        {value}
      </span>
      <button
        type="button"
        className={btn}
        onClick={() => onChange(Math.min(max, value + 1))}
        disabled={value >= max}
        aria-label="More participants"
      >
        <Plus size={16} />
      </button>
    </div>
  );
}

/* =======================
   Page
   ======================= */
export default function BookingPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const topRef = useRef(null);

  const [showGuests, setShowGuests] = useState(false);
  const [pkg, setPkg] = useState(null);
  const [user, setUser] = useState(null);
  const [userGuests, setUserGuests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const [error, setError] = useState("");

  const [form, setForm] = useState(() => {
    const start = nextHalfHour();
    return {
      startDate: start,
      endDate: addDays(start, 1),
      guests: [],
      // [{ activity, participants }]
      activities: [],
      paymentMethod: "gcash",
    };
  });

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

  useEffect(() => {
    if (descriptionEditor && pkg?.description) {
      descriptionEditor.commands.setContent(pkg.description);
    }
  }, [descriptionEditor, pkg]);

  const activeActivities = useMemo(
    () => (pkg?.activities || []).filter((a) => a.is_active),
    [pkg]
  );
  const hasActivities = activeActivities.length > 0;

  // Activities come after guests so we know the max number of participants
  const steps = useMemo(
    () => [
      { key: "details", label: "Package", icon: Package },
      { key: "dates", label: "Dates", icon: CalendarDays },
      { key: "guests", label: "Guests", icon: Users },
      ...(hasActivities ? [{ key: "activities", label: "Activities", icon: Sparkles }] : []),
      { key: "review", label: "Review & pay", icon: Wallet },
    ],
    [hasActivities]
  );

  const currentStep = steps[stepIndex];
  const isLast = stepIndex === steps.length - 1;

  /* ---------- pricing ---------- */
  const guestCount = form.guests.length;
  const billableGuests = Math.max(guestCount, 1);

  // participants can never exceed the number of selected guests
  const effectiveParticipants = useCallback(
    (p) => Math.min(p, billableGuests),
    [billableGuests]
  );

  const baseTotal = pkg ? Number(pkg.base_price) * billableGuests : 0;
  const activitiesTotal = form.activities.reduce(
    (sum, { activity, participants }) =>
      sum + Number(activity.extra_price || 0) * effectiveParticipants(participants),
    0
  );
  const total = baseTotal + activitiesTotal;

  const nights = Math.max(
    1,
    Math.ceil((form.endDate - form.startDate) / (1000 * 60 * 60 * 24))
  );

  /* ---------- handlers ---------- */
  const handleGuestToggle = (guest) => {
    setError("");
    setForm((f) => {
      const exists = f.guests.some((g) => g.id === guest.id);
      const guests = exists
        ? f.guests.filter((g) => g.id !== guest.id)
        : [...f.guests, guest];
      const cap = Math.max(guests.length, 1);
      return {
        ...f,
        guests,
        // keep activity participant counts within the new guest count
        activities: f.activities.map((a) => ({
          ...a,
          participants: Math.min(a.participants, cap),
        })),
      };
    });
  };

  const handleSelectAllGuests = () => {
    setError("");
    setForm((f) => {
      const allSelected = f.guests.length === userGuests.length;
      const guests = allSelected ? [] : [...userGuests];
      const cap = Math.max(guests.length, 1);
      return {
        ...f,
        guests,
        activities: f.activities.map((a) => ({
          ...a,
          participants: Math.min(a.participants, cap),
        })),
      };
    });
  };

  const handleActivityToggle = (activity) => {
    setForm((f) => {
      const exists = f.activities.some((a) => a.activity.id === activity.id);
      return exists
        ? { ...f, activities: f.activities.filter((a) => a.activity.id !== activity.id) }
        : {
            ...f,
            // default: everyone takes part, they can lower it
            activities: [...f.activities, { activity, participants: billableGuests }],
          };
    });
  };

  const handleParticipantsChange = (activityId, participants) => {
    setForm((f) => ({
      ...f,
      activities: f.activities.map((a) =>
        a.activity.id === activityId ? { ...a, participants } : a
      ),
    }));
  };

  const handleDatesChange = ({ startDate, endDate }) => {
    setError("");
    setForm((prev) => ({ ...prev, startDate, endDate }));
  };

  /* ---------- step navigation ---------- */
  const validateStep = (key) => {
    if (key === "dates") {
      if (form.startDate < new Date()) {
        return "That check-in time has already passed. Pick a later time.";
      }
      if (form.endDate <= form.startDate) {
        return "Check-out must be after check-in.";
      }
    }
    if (key === "guests" && form.guests.length === 0) {
      return "Select at least one guest to continue.";
    }
    return "";
  };

  const goTo = (i) => {
    setError("");
    setStepIndex(i);
    requestAnimationFrame(() =>
      topRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })
    );
  };

  const handleNext = () => {
    const msg = validateStep(currentStep.key);
    if (msg) {
      setError(msg);
      return;
    }
    goTo(Math.min(stepIndex + 1, steps.length - 1));
  };

  const handleBack = () => goTo(Math.max(stepIndex - 1, 0));

  const handleSubmit = async () => {
    // re-check everything before sending, in case someone jumped around
    for (const s of steps) {
      const msg = validateStep(s.key);
      if (msg) {
        setError(msg);
        setStepIndex(steps.findIndex((x) => x.key === s.key));
        return;
      }
    }

    const payload = {
      package: pkg.id,
      check_in: form.startDate.toISOString(),
      check_out: form.endDate.toISOString(),
      payment_method: form.paymentMethod,
      guests: form.guests.map((g) => ({ guest: g.id })),
      // kept for backwards compatibility with the current endpoint
      activity_ids: form.activities.map((a) => a.activity.id),
      // NEW: per-activity participant counts
      activities: form.activities.map(({ activity, participants }) => ({
        activity: activity.id,
        participants: effectiveParticipants(participants),
      })),
    };

    setSubmitting(true);
    setError("");
    try {
      await api.post("api/booking/book/", payload);
      navigate("/booking/my/");
    } catch (err) {
      console.error(err.response?.data || err);
      setError("Booking failed. Please check your details and try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const closeGuestModal = () => {
    setShowGuests(false);
    fetchUserGuests(); // pick up guests added/edited in the modal
  };

  if (loading || !pkg || !user) return null;

  /* ---------- shared styles ---------- */
  const cardBase =
    "border rounded-xl cursor-pointer transition bg-gray-50 dark:bg-slate-900 border-gray-200 dark:border-slate-600";
  const selectedStyle = {
    backgroundColor: "color-mix(in srgb, var(--accent) 12%, transparent)",
    borderColor: "var(--accent)",
  };

  /* =======================
     Step content
     ======================= */
  const renderStep = () => {
    switch (currentStep.key) {
      /* ---------- 1. package ---------- */
      case "details":
        return (
          <div className="border rounded-xl overflow-hidden border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800">
            {pkg.image && (
              <img
                src={pkg.image}
                alt={pkg.name}
                className="w-full h-48 sm:h-72 object-cover"
              />
            )}
            <div className="p-4 sm:p-5">
              <h2 className="font-semibold text-lg sm:text-xl text-gray-900 dark:text-slate-100">
                {pkg.name}
              </h2>
              <div className="mt-2 text-gray-600 dark:text-slate-300 prose prose-sm dark:prose-invert max-w-none [&_p]:m-0">
                <EditorContent editor={descriptionEditor} />
              </div>
              <p className="mt-4 font-semibold text-gray-800 dark:text-slate-100">
                {peso(pkg.base_price)}{" "}
                <span className="font-normal text-sm text-gray-500 dark:text-slate-400">
                  per guest
                </span>
              </p>
            </div>
          </div>
        );

      /* ---------- 2. dates ---------- */
      case "dates":
        return (
          <div className="border rounded-xl p-4 sm:p-5 border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800">
            <DateTimeRangePicker
              startDate={form.startDate}
              endDate={form.endDate}
              onChange={handleDatesChange}
            />
          </div>
        );

      /* ---------- 3. guests ---------- */
      case "guests":
        return (
          <div className="border rounded-xl p-4 sm:p-5 border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800">
            <div className="flex items-center justify-between gap-2 mb-4">
              <p className="text-sm text-gray-600 dark:text-slate-300">
                {guestCount === 0
                  ? "Tap guests to add them to this booking."
                  : `${guestCount} selected`}
              </p>
              <div className="flex items-center gap-2">
                {userGuests.length > 1 && (
                  <button
                    type="button"
                    onClick={handleSelectAllGuests}
                    className="text-sm px-3 py-2 rounded-lg border border-gray-300 dark:border-slate-600 text-gray-700 dark:text-slate-200"
                  >
                    {guestCount === userGuests.length ? "Clear" : "Select all"}
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setShowGuests(true)}
                  className="flex items-center gap-1.5 text-sm px-3 py-2 text-white rounded-lg hover:brightness-90 transition"
                  style={{ backgroundColor: "var(--accent)" }}
                >
                  <Users size={14} />
                  Manage
                </button>
              </div>
            </div>

            {userGuests.length === 0 ? (
              <p className="text-sm text-gray-500 dark:text-slate-400 py-6 text-center">
                No guests yet. Tap &ldquo;Manage&rdquo; to add one.
              </p>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                {userGuests.map((g) => {
                  const selected = form.guests.some((x) => x.id === g.id);
                  return (
                    <button
                      type="button"
                      key={g.id}
                      onClick={() => handleGuestToggle(g)}
                      aria-pressed={selected}
                      className={`${cardBase} p-3 min-h-[5.5rem] text-center flex flex-col items-center justify-center`}
                      style={selected ? selectedStyle : undefined}
                    >
                      <span className="font-semibold text-sm text-gray-900 dark:text-slate-100 break-words">
                        {g.full_name}
                      </span>
                      <span className="text-xs text-gray-600 dark:text-slate-300">
                        Age: {g.age}
                      </span>
                      {selected && (
                        <CheckCircle2
                          size={16}
                          className="mt-1"
                          style={{ color: "var(--accent)" }}
                        />
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        );

      /* ---------- 4. activities ---------- */
      case "activities":
        return (
          <div className="border rounded-xl p-4 sm:p-5 border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800">
            <p className="text-sm text-gray-600 dark:text-slate-300 mb-4">
              Optional. Pick any activities, then set how many of your {guestCount}{" "}
              {guestCount === 1 ? "guest" : "guests"} will join.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {activeActivities.map((activity) => {
                const entry = form.activities.find((a) => a.activity.id === activity.id);
                const selected = !!entry;
                const participants = entry ? effectiveParticipants(entry.participants) : 0;
                const price = Number(activity.extra_price || 0);

                return (
                  <div
                    key={activity.id}
                    className={`${cardBase} p-4`}
                    style={selected ? selectedStyle : undefined}
                  >
                    <button
                      type="button"
                      onClick={() => handleActivityToggle(activity)}
                      aria-pressed={selected}
                      className="w-full text-left flex items-start justify-between gap-3"
                    >
                      <div className="min-w-0">
                        <h4 className="font-semibold text-sm sm:text-base text-gray-900 dark:text-slate-100">
                          {activity.name}
                        </h4>
                        {activity.description && (
                          <p className="text-xs sm:text-sm text-gray-600 dark:text-slate-300 mt-0.5">
                            {activity.description}
                          </p>
                        )}
                        {price > 0 && (
                          <p className="text-xs sm:text-sm font-medium text-gray-700 dark:text-slate-200 mt-1">
                            +{peso(price)} per person
                          </p>
                        )}
                      </div>
                      <span
                        className={`shrink-0 h-6 w-6 rounded-full border-2 flex items-center justify-center ${
                          selected ? "text-white" : "border-gray-300 dark:border-slate-600"
                        }`}
                        style={
                          selected
                            ? { backgroundColor: "var(--accent)", borderColor: "var(--accent)" }
                            : undefined
                        }
                      >
                        {selected && <Check size={14} />}
                      </span>
                    </button>

                    {selected && (
                      <div className="mt-3 pt-3 border-t border-gray-200 dark:border-slate-600 flex items-center justify-between gap-3">
                        <div>
                          <p className="text-sm font-medium text-gray-800 dark:text-slate-100">
                            Guests joining
                          </p>
                          <p className="text-xs text-gray-500 dark:text-slate-400">
                            {price > 0
                              ? `${participants} × ${peso(price)} = ${peso(price * participants)}`
                              : "Included"}
                          </p>
                        </div>
                        <QuantityStepper
                          value={participants}
                          min={1}
                          max={billableGuests}
                          onChange={(v) => handleParticipantsChange(activity.id, v)}
                        />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        );

      /* ---------- 5. review & pay ---------- */
      case "review":
        return (
          <div className="flex flex-col gap-4">
            <div className="border rounded-xl p-4 sm:p-5 border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800">
              <h3 className="font-semibold text-gray-900 dark:text-slate-100 mb-3">
                Booking summary
              </h3>

              <dl className="text-sm flex flex-col gap-2 text-gray-700 dark:text-slate-200">
                <div className="flex justify-between gap-4">
                  <dt className="text-gray-500 dark:text-slate-400">Package</dt>
                  <dd className="text-right font-medium">{pkg.name}</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-gray-500 dark:text-slate-400">Check-in</dt>
                  <dd className="text-right">{fmtDateTime(form.startDate)}</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-gray-500 dark:text-slate-400">Check-out</dt>
                  <dd className="text-right">{fmtDateTime(form.endDate)}</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-gray-500 dark:text-slate-400">Guests</dt>
                  <dd className="text-right">{form.guests.map((g) => g.full_name).join(", ")}</dd>
                </div>
              </dl>

              <div className="my-4 border-t border-gray-200 dark:border-slate-700" />

              <div className="flex flex-col gap-2 text-sm text-gray-700 dark:text-slate-200">
                <div className="flex justify-between gap-4">
                  <span>
                    {pkg.name} · {peso(pkg.base_price)} × {billableGuests}
                  </span>
                  <span className="font-medium">{peso(baseTotal)}</span>
                </div>

                {form.activities.map(({ activity, participants }) => {
                  const p = effectiveParticipants(participants);
                  const price = Number(activity.extra_price || 0);
                  return (
                    <div key={activity.id} className="flex justify-between gap-4">
                      <span>
                        {activity.name}
                        {price > 0 ? ` · ${peso(price)} × ${p}` : ` · ${p} joining`}
                      </span>
                      <span className="font-medium">{price > 0 ? peso(price * p) : "Included"}</span>
                    </div>
                  );
                })}
              </div>

              <div className="mt-4 pt-3 border-t border-gray-200 dark:border-slate-700 flex justify-between items-baseline">
                <span className="font-semibold text-gray-900 dark:text-slate-100">Total</span>
                <span className="text-xl font-bold text-gray-900 dark:text-slate-100">
                  {peso(total)}
                </span>
              </div>
            </div>

            <div className="border rounded-xl p-4 sm:p-5 border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800">
              <h3 className="font-semibold text-gray-900 dark:text-slate-100 mb-3">
                Payment method
              </h3>
              <PaymentMethodSelector
                value={form.paymentMethod}
                onChange={(val) => setForm((prev) => ({ ...prev, paymentMethod: val }))}
              />
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  /* =======================
     Layout
     ======================= */
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

      <div ref={topRef} className="max-w-3xl mx-auto px-4 sm:px-6 pt-4 sm:pt-8 pb-12 sm:pb-16 scroll-mt-16">
        <div className="flex items-center justify-between gap-3 mb-4">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 text-white px-4 py-2.5 rounded-lg font-semibold hover:brightness-90 transition"
            style={{ backgroundColor: "var(--accent)" }}
          >
            <ArrowLeft size={16} />
            Return
          </button>
        </div>

        <h1
          className="text-lg sm:text-2xl font-bold text-gray-100 mb-5 rounded-lg p-2.5 text-center truncate"
          style={{ backgroundColor: "var(--accent)" }}
        >
          Book: {pkg.name}
        </h1>

        <StepIndicator steps={steps} current={stepIndex} onJump={goTo} />

        {/* Current step */}
        <div className="pb-6">
          <h2 className="hidden sm:block text-lg font-semibold text-gray-900 dark:text-slate-100 mb-3">
            {currentStep.label}
          </h2>
          {renderStep()}

          {error && (
            <p
              role="alert"
              className="mt-3 text-sm rounded-lg px-3 py-2 bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-300 border border-red-200 dark:border-red-900"
            >
              {error}
            </p>
          )}
        </div>

        {/* Sticky nav bar: total + back/next. Sticks inside this column so it
            never overlays a fixed sidebar. */}
        <div
          className="sticky bottom-0 z-30 -mx-4 sm:mx-0 bg-white/95 dark:bg-slate-800/95 backdrop-blur sm:rounded-t-xl shadow-[0_-4px_16px_rgba(0,0,0,0.08)] px-4 sm:px-5 pt-3"
          style={{
            borderTop: "3px solid var(--accent)",
            paddingBottom: "max(0.75rem, env(safe-area-inset-bottom))",
          }}
        >
          <div className="flex items-center gap-3">
            <div className="min-w-0 flex-1">
              <p className="text-xs text-gray-500 dark:text-slate-400">Total</p>
              <p className="text-lg font-bold text-gray-900 dark:text-slate-100 leading-tight truncate">
                {peso(total)}
              </p>
            </div>

            {stepIndex > 0 && (
              <button
                type="button"
                onClick={handleBack}
                disabled={submitting}
                className="flex items-center justify-center gap-1.5 h-12 px-4 rounded-lg font-semibold border border-gray-300 dark:border-slate-600 text-gray-800 dark:text-slate-100 bg-white dark:bg-slate-800 active:scale-95 transition disabled:opacity-50"
              >
                <ArrowLeft size={16} />
                <span className="hidden xs:inline sm:inline">Back</span>
              </button>
            )}

            {isLast ? (
              <button
                type="button"
                onClick={handleSubmit}
                disabled={submitting}
                className="flex items-center justify-center gap-2 h-12 px-5 sm:px-6 text-white rounded-lg font-semibold hover:brightness-90 active:scale-95 transition disabled:opacity-60"
                style={{ backgroundColor: "var(--accent)" }}
              >
                {submitting ? (
                  <Loader2 size={18} className="animate-spin" />
                ) : (
                  <CheckCircle2 size={18} />
                )}
                {submitting ? "Booking…" : "Confirm booking"}
              </button>
            ) : (
              <button
                type="button"
                onClick={handleNext}
                className="flex items-center justify-center gap-2 h-12 px-5 sm:px-6 text-white rounded-lg font-semibold hover:brightness-90 active:scale-95 transition"
                style={{ backgroundColor: "var(--accent)" }}
              >
                {currentStep.key === "activities" && form.activities.length === 0
                  ? "Skip"
                  : "Next"}
                <ArrowRight size={16} />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Guest management modal: full-screen on phones, centered card on larger screens */}
      {showGuests && (
        <div className="fixed inset-0 z-50 flex items-stretch sm:items-start justify-center bg-black/30 dark:bg-black/60 backdrop-blur-sm sm:p-4 sm:pt-20 overflow-y-auto">
          <div className="bg-gray-50 dark:bg-slate-900 sm:rounded-2xl shadow-xl w-full sm:max-w-6xl relative sm:mb-8 min-h-full sm:min-h-0">
            <button
              type="button"
              onClick={closeGuestModal}
              className="absolute top-3 right-3 z-10 h-10 w-10 flex items-center justify-center rounded-full bg-white dark:bg-slate-700 text-gray-600 dark:text-slate-200 shadow hover:bg-gray-100 dark:hover:bg-slate-600 transition"
              aria-label="Close"
            >
              <X size={18} />
            </button>
            {/* embedded: suppresses GuestManagement's own <TopBar/> */}
            <GuestManagement embedded />
          </div>
        </div>
      )}
    </div>
  );
}