import { useContext, useEffect, useMemo, useState } from "react";
import { AuthContext } from "../../contexts/AuthContext";
import { DriverDataContext } from "../../contexts/DriverDataContext";
import {
  FiAlertTriangle,
  FiArrowRight,
  FiCheckCircle,
  FiChevronLeft,
  FiChevronRight,
  FiClock,
  FiInbox,
  FiLogOut,
  FiMapPin,
  FiNavigation,
  FiPhone,
  FiRefreshCw,
  FiTruck,
  FiUserCheck,
  FiUserPlus,
  FiUserX,
  FiUsers,
  FiXCircle,
} from "react-icons/fi";

// ======================================================================
// Helpers
// ======================================================================
const softAccent = { backgroundColor: "color-mix(in srgb, var(--accent) 12%, transparent)" };
const accentBorder = { borderColor: "var(--accent)" };

// Transportation.status is nullable on the backend: "no status" == Scheduled.
const isPre = (status) => !status || status === "Scheduled";

const fmtTime = (iso) =>
  iso ? new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "—";
const fmtDay = (iso) =>
  iso ? new Date(iso).toLocaleDateString([], { month: "short", day: "numeric" }) : "";
const fmtWhen = (iso) => (iso ? `${fmtDay(iso)}, ${fmtTime(iso)}` : "No schedule");

// Must match EARLY_DEPARTURE_WINDOW on the server (60 min). Departing a stop earlier
// than this before its planned departure needs the driver's confirmation.
const EARLY_WINDOW_MS = 60 * 60 * 1000;

// When the early window opens for a stop (null = no planned time, never restricted).
const earliestDeparture = (stop) =>
  stop?.expected_departure
    ? new Date(new Date(stop.expected_departure).getTime() - EARLY_WINDOW_MS)
    : null;

const isEarlyDeparture = (stop) => {
  const earliest = earliestDeparture(stop);
  return !!earliest && Date.now() < earliest.getTime();
};

const BTN = "px-4 py-2.5 rounded-xl text-sm font-bold flex items-center justify-center gap-2 disabled:opacity-50";
const BTN_PRIMARY = `${BTN} bg-[var(--accent)] text-white`;
const BTN_OUTLINE = `${BTN} border-2 border-gray-200 dark:border-gray-700 text-gray-700 dark:text-white bg-white dark:bg-gray-900`;
const CARD = "bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl";

const TABS = [
  { key: "pending", label: "New", empty: "No trips waiting for your response." },
  { key: "active", label: "Active", empty: "No trip in progress." },
  { key: "upcoming", label: "Upcoming", empty: "No upcoming trips." },
  { key: "past", label: "History", empty: "No past trips yet." },
];

const PASSENGER_FILTERS = [
  { key: "all", label: "All" },
  { key: "waiting", label: "Waiting" },
  { key: "onboard", label: "On board" },
  { key: "done", label: "Done" },
];

const passengerGroup = (status) => {
  if (status === "reserved") return "waiting";
  if (status === "checked_in") return "onboard";
  return "done"; // completed, no_show, cancelled
};

// ======================================================================
// Small presentational pieces
// ======================================================================
function Chip({ children }) {
  return (
    <span
      className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full text-[var(--accent)]"
      style={softAccent}
    >
      {children}
    </span>
  );
}

function StatusBadge({ status }) {
  const label = status || "Scheduled";
  if (label === "Departed") {
    return (
      <span className="text-xs font-bold px-2.5 py-1 rounded-full text-[var(--accent)]" style={softAccent}>
        Departed
      </span>
    );
  }
  const styles = {
    Scheduled: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300",
    Delayed: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
    Completed: "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300",
    Cancelled: "bg-red-100 text-red-600 dark:bg-red-900/40 dark:text-red-300",
  };
  return (
    <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${styles[label] || styles.Scheduled}`}>
      {label}
    </span>
  );
}

function PassengerBadge({ status }) {
  const map = {
    reserved: ["Waiting", "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300"],
    checked_in: ["On board", "bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300"],
    completed: ["Dropped off", "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300"],
    no_show: ["No-show", "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300"],
    cancelled: ["Cancelled", "bg-red-100 text-red-600 dark:bg-red-900/40 dark:text-red-300"],
  };
  const [label, cls] = map[status] || [status, map.reserved[1]];
  return <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${cls}`}>{label}</span>;
}

function TimeCell({ label, planned, actual }) {
  const late = planned && actual && new Date(actual) > new Date(planned);
  return (
    <div className="text-xs">
      <span className="text-gray-400">{label}</span>{" "}
      <span className="text-gray-500 dark:text-gray-400">{fmtTime(planned)}</span>
      {actual && (
        <span
          className={`ml-1 font-semibold ${
            late ? "text-amber-500" : "text-green-600 dark:text-green-400"
          }`}
        >
          → {fmtTime(actual)}
        </span>
      )}
    </div>
  );
}

// ======================================================================
// Trip card (list item)
// ======================================================================
function TripCard({ trip, onOpen }) {
  const needsResponse = isPre(trip.status) && !trip.is_accepted;
  return (
    <li>
      <button
        onClick={onOpen}
        className={`${CARD} w-full text-left p-5 shadow-sm space-y-3 active:scale-[0.99] transition`}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="font-black text-gray-800 dark:text-white truncate">{trip.title}</div>
            <div className="text-xs text-gray-400">{fmtWhen(trip.origin?.expected_departure)}</div>
          </div>
          <div className="flex flex-col items-end gap-1 shrink-0">
            <StatusBadge status={trip.status} />
            {needsResponse && (
              <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300">
                Needs response
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-200">
          <FiMapPin className="text-[var(--accent)] shrink-0" size={14} />
          <span className="truncate">{trip.origin?.location_name || "—"}</span>
          <FiArrowRight className="shrink-0 text-gray-400" size={14} />
          <span className="truncate">{trip.destination?.location_name || "—"}</span>
        </div>

        <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
          <span className="flex items-center gap-3">
            <span className="flex items-center gap-1">
              <FiUsers size={13} /> {trip.passenger_count}/{trip.max_capacity}
            </span>
            {trip.vehicle && (
              <span className="flex items-center gap-1">
                <FiTruck size={13} /> {trip.vehicle.plate_number}
              </span>
            )}
          </span>
          <FiChevronRight size={18} className="text-gray-300 dark:text-gray-600" />
        </div>
      </button>
    </li>
  );
}

// ======================================================================
// Stop card (timeline item)
// ======================================================================
function StopCard({
  stop,
  index,
  stops,
  isCurrent,
  open,
  canAlight,
  onArrive,
  onDepart,
  onDropAll,
  onWalkIn,
}) {
  const isLast = index === stops.length - 1;
  const prev = stops[index - 1];

  // Mirrors the server rules so the driver only sees actions that will work.
  const canArrive = open && !stop.actual_arrival && (index === 0 || !!prev?.actual_departure);
  const canDepart =
    open && !stop.is_destination && !stop.actual_departure && (index === 0 || !!stop.actual_arrival);
  const dueOff = stop.alighting.expected - stop.alighting.completed;
  const canDrop = canAlight && !!stop.actual_arrival && dueOff > 0;
  // Same rule as the server: the stop the vehicle is at now (origin counts before departure).
  const canWalkIn =
    open && isCurrent && !stop.is_destination && (index === 0 || !!stop.actual_arrival);

  const filled = stop.state !== "upcoming";

  return (
    <div className="flex gap-3">
      <div className="flex flex-col items-center pt-1.5">
        <span
          className={`w-3.5 h-3.5 rounded-full border-2 shrink-0 ${
            filled ? "" : "border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900"
          }`}
          style={filled ? { backgroundColor: "var(--accent)", borderColor: "var(--accent)" } : undefined}
        />
        {!isLast && <span className="w-0.5 flex-1 mt-1 bg-gray-200 dark:bg-gray-700" />}
      </div>

      <div
        className={`${CARD} flex-1 mb-4 p-4 space-y-3`}
        style={isCurrent ? accentBorder : undefined}
      >
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="font-bold text-gray-800 dark:text-white">{stop.location?.name}</div>
            {stop.location?.address && (
              <div className="text-xs text-gray-400 truncate">{stop.location.address}</div>
            )}
          </div>
          <div className="flex gap-1 shrink-0">
            {stop.is_origin && <Chip>Origin</Chip>}
            {stop.is_destination && <Chip>Final</Chip>}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-x-4 gap-y-1">
          <TimeCell label="Arrive" planned={stop.expected_arrival} actual={stop.actual_arrival} />
          {!stop.is_destination && (
            <TimeCell label="Depart" planned={stop.expected_departure} actual={stop.actual_departure} />
          )}
        </div>

        <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500 dark:text-gray-400">
          <span>
            Boarding {stop.boarding.checked_in}/{stop.boarding.expected}
          </span>
          <span>
            Getting off {stop.alighting.completed}/{stop.alighting.expected}
          </span>
          {!stop.is_destination && <span>Seats used after: {stop.planned_occupancy}</span>}
        </div>

        {stop.notes && (
          <div className="text-xs text-amber-600 dark:text-amber-400">{stop.notes}</div>
        )}

        {canDepart && isEarlyDeparture(stop) && (
          <div className="text-xs text-amber-600 dark:text-amber-400">
            Scheduled {fmtTime(stop.expected_departure)}. Departing before{" "}
            {fmtTime(earliestDeparture(stop))} asks for confirmation.
          </div>
        )}

        {(canArrive || canDepart || canDrop || canWalkIn) && (
          <div className="flex flex-wrap gap-2">
            {canArrive && (
              <button onClick={onArrive} className={BTN_PRIMARY}>
                <FiMapPin size={16} /> Arrived
              </button>
            )}
            {canWalkIn && (
              <button onClick={onWalkIn} className={BTN_OUTLINE}>
                <FiUserPlus size={16} /> Add walk-in
              </button>
            )}
            {canDrop && (
              <button onClick={onDropAll} className={BTN_PRIMARY}>
                <FiLogOut size={16} /> Drop off ({dueOff})
              </button>
            )}
            {canDepart && (
              <button onClick={onDepart} className={BTN_OUTLINE}>
                <FiNavigation size={16} /> Depart
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ======================================================================
// Passenger row
// ======================================================================
function PassengerRow({ p, open, canAlight, onCheckIn, onNoShow, onAlight }) {
  return (
    <div className={`${CARD} p-4 space-y-2`}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="font-bold text-gray-800 dark:text-white truncate">{p.name}</div>
          <div className="text-xs text-gray-400 flex items-center gap-1 flex-wrap">
            <span>{p.boarding_stop_name || "Origin"}</span>
            <FiArrowRight size={10} />
            <span>{p.alighting_stop_name || "Final stop"}</span>
          </div>
        </div>
        <PassengerBadge status={p.status} />
      </div>

      {p.contact_number && (
        <a
          href={`tel:${p.contact_number}`}
          className="inline-flex items-center gap-1 text-xs text-[var(--accent)]"
        >
          <FiPhone size={12} /> {p.contact_number}
        </a>
      )}
      {p.notes && <div className="text-xs text-gray-500 dark:text-gray-400">{p.notes}</div>}

      {p.status === "reserved" && open && (
        <div className="flex gap-2 pt-1">
          <button onClick={onCheckIn} className={BTN_PRIMARY}>
            <FiUserCheck size={16} /> Check in
          </button>
          <button onClick={onNoShow} className={BTN_OUTLINE}>
            <FiUserX size={16} /> No-show
          </button>
        </div>
      )}
      {p.status === "checked_in" && canAlight && (
        <div className="pt-1">
          <button onClick={onAlight} className={BTN_OUTLINE}>
            <FiLogOut size={16} /> Get off…
          </button>
        </div>
      )}
    </div>
  );
}

// ======================================================================
// Generic confirm / input dialog
// ======================================================================
function Dialog({ dialog, onClose }) {
  const [value, setValue] = useState("");

  useEffect(() => {
    setValue("");
  }, [dialog]);

  if (!dialog) return null;

  const input = dialog.input;
  const disabled = !!input?.required && !value.trim();

  const confirm = async () => {
    await dialog.onConfirm(value.trim());
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center bg-black/60 p-0 sm:p-4">
      <div className="bg-white dark:bg-gray-900 dark:text-white rounded-t-3xl sm:rounded-3xl w-full max-w-md p-6 space-y-4">
        <h3 className="text-xl font-black flex items-center gap-2">
          {dialog.tone === "danger" && <FiAlertTriangle className="text-red-500" />}
          {dialog.title}
        </h3>
        {dialog.message && (
          <p className="text-sm text-gray-600 dark:text-gray-300">{dialog.message}</p>
        )}
        {input && (
          <div className="space-y-1">
            <label className="text-xs font-bold text-gray-500 dark:text-gray-400">{input.label}</label>
            <textarea
              rows={3}
              maxLength={input.maxLength}
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder={input.placeholder}
              className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-3 text-sm outline-none"
            />
          </div>
        )}
        <div className="flex flex-col gap-2">
          <button
            onClick={confirm}
            disabled={disabled}
            className={`w-full text-white font-bold py-4 rounded-2xl disabled:opacity-50 ${
              dialog.tone === "danger" ? "bg-red-500" : "bg-[var(--accent)]"
            }`}
          >
            {dialog.confirmLabel || "Confirm"}
          </button>
          <button
            onClick={onClose}
            className="w-full bg-gray-100 dark:bg-gray-800 py-3 rounded-2xl font-bold"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

// ======================================================================
// "Get off" picker for a single passenger
// ======================================================================
function AlightModal({ trip, passenger, onClose, onConfirm }) {
  // Only stops the vehicle has reached, after boarding and not past the planned stop.
  const eligible = (trip.stops || []).filter(
    (s) =>
      s.actual_arrival &&
      (passenger.boarding_sequence == null || s.sequence > passenger.boarding_sequence) &&
      (passenger.alighting_sequence == null || s.sequence <= passenger.alighting_sequence)
  );

  const [stopId, setStopId] = useState(
    eligible.length ? String(eligible[eligible.length - 1].id) : ""
  );
  const [reason, setReason] = useState("");

  return (
    <div className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center bg-black/60 p-0 sm:p-4">
      <div className="bg-white dark:bg-gray-900 dark:text-white rounded-t-3xl sm:rounded-3xl w-full max-w-md p-6 space-y-4">
        <h3 className="text-xl font-black">{passenger.name} gets off</h3>

        {eligible.length === 0 ? (
          <p className="text-sm text-gray-600 dark:text-gray-300">
            No reached stop is available for this passenger yet. Mark arrival at their stop first.
          </p>
        ) : (
          <>
            <div className="space-y-1">
              <label className="text-xs font-bold text-gray-500 dark:text-gray-400">Stop</label>
              <select
                value={stopId}
                onChange={(e) => setStopId(e.target.value)}
                className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-3 text-sm"
              >
                {eligible.map((s) => (
                  <option key={s.id} value={String(s.id)}>
                    {s.location?.name}
                    {s.id === passenger.alighting_stop ? " (planned)" : ""}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-gray-500 dark:text-gray-400">
                Reason (optional)
              </label>
              <input
                value={reason}
                maxLength={100}
                onChange={(e) => setReason(e.target.value)}
                placeholder="e.g. got off early"
                className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-3 text-sm outline-none"
              />
            </div>
          </>
        )}

        <div className="flex flex-col gap-2">
          <button
            onClick={() => onConfirm(stopId, reason.trim())}
            disabled={!stopId || eligible.length === 0}
            className="w-full bg-[var(--accent)] text-white font-bold py-4 rounded-2xl disabled:opacity-50"
          >
            Confirm
          </button>
          <button
            onClick={onClose}
            className="w-full bg-gray-100 dark:bg-gray-800 py-3 rounded-2xl font-bold"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

// ======================================================================
// Walk-in passenger form (boards at the stop the vehicle is at now)
// ======================================================================
function WalkInModal({ trip, stop, onClose, onConfirm }) {
  const stops = trip.stops || [];
  // Drop-off choices: stops after this one. Blank = rides to the final stop.
  const finalStop = stops[stops.length - 1];
  const middleStops = stops.filter((s) => s.sequence > stop.sequence && !s.is_destination);

  const [name, setName] = useState("");
  const [contact, setContact] = useState("");
  const [alightingStopId, setAlightingStopId] = useState("");

  const inputCls =
    "w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-3 text-sm outline-none";

  return (
    <div className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center bg-black/60 p-0 sm:p-4">
      <div className="bg-white dark:bg-gray-900 dark:text-white rounded-t-3xl sm:rounded-3xl w-full max-w-md p-6 space-y-4">
        <div>
          <h3 className="text-xl font-black">Add walk-in</h3>
          <p className="text-xs text-gray-400">
            Boarding at {stop.location?.name}. They'll be added as checked in.
          </p>
        </div>

        <div className="space-y-1">
          <label className="text-xs font-bold text-gray-500 dark:text-gray-400">Name</label>
          <input
            value={name}
            maxLength={200}
            onChange={(e) => setName(e.target.value)}
            placeholder="Passenger name"
            className={inputCls}
          />
        </div>

        <div className="space-y-1">
          <label className="text-xs font-bold text-gray-500 dark:text-gray-400">
            Phone (optional)
          </label>
          <input
            value={contact}
            maxLength={50}
            inputMode="tel"
            onChange={(e) => setContact(e.target.value)}
            placeholder="e.g. 09xx xxx xxxx"
            className={inputCls}
          />
        </div>

        <div className="space-y-1">
          <label className="text-xs font-bold text-gray-500 dark:text-gray-400">Drop-off</label>
          <select
            value={alightingStopId}
            onChange={(e) => setAlightingStopId(e.target.value)}
            className={inputCls}
          >
            <option value="">Final stop{finalStop ? ` – ${finalStop.location?.name}` : ""}</option>
            {middleStops.map((s) => (
              <option key={s.id} value={String(s.id)}>
                {s.location?.name}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-2">
          <button
            onClick={() =>
              onConfirm({ name: name.trim(), contactNumber: contact.trim(), alightingStopId })
            }
            disabled={!name.trim()}
            className="w-full bg-[var(--accent)] text-white font-bold py-4 rounded-2xl disabled:opacity-50"
          >
            Add &amp; check in
          </button>
          <button
            onClick={onClose}
            className="w-full bg-gray-100 dark:bg-gray-800 py-3 rounded-2xl font-bold"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

// ======================================================================
// Page
// ======================================================================
export default function DriverDashboard() {
  const { user } = useContext(AuthContext);
  const {
    profile,
    pendingTrips,
    upcomingTrips,
    activeTrips,
    pastTrips,
    tripDetailsCache,
    loading,
    reload,
    getTripDetail,
    acceptTrip,
    declineTrip,
    reportDelay,
    arriveAtStop,
    departFromStop,
    alightAtStop,
    addWalkInPassenger,
    checkInPassenger,
    markNoShow,
    alightPassenger,
  } = useContext(DriverDataContext);

  const [tab, setTab] = useState(null);
  const [selectedTripId, setSelectedTripId] = useState(null);
  const [sheetLoading, setSheetLoading] = useState(false);
  const [pFilter, setPFilter] = useState("all");
  const [toast, setToast] = useState(null);
  const [busy, setBusy] = useState(false);
  const [dialog, setDialog] = useState(null);
  const [alightFor, setAlightFor] = useState(null);
  const [walkInFor, setWalkInFor] = useState(null); // the stop a walk-in is boarding at

  const tripsByTab = useMemo(
    () => ({
      pending: pendingTrips,
      active: activeTrips,
      upcoming: upcomingTrips,
      past: [...pastTrips].reverse(), // newest first
    }),
    [pendingTrips, activeTrips, upcomingTrips, pastTrips]
  );

  // Toast auto-dismiss
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 3500);
    return () => clearTimeout(timer);
  }, [toast]);

  // Pick the most useful tab once data has loaded
  useEffect(() => {
    if (loading || tab) return;
    const first = ["active", "pending", "upcoming"].find((k) => tripsByTab[k].length > 0);
    setTab(first || "upcoming");
  }, [loading, tab, tripsByTab]);

  // Lock page scroll behind the trip view
  useEffect(() => {
    if (selectedTripId === null) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [selectedTripId]);

  if (user?.role !== "driver") {
    return <div className="p-10 text-center">Access Restricted</div>;
  }

  // ---------------- derived state for the open trip ----------------
  const currentTab = tab || "upcoming";
  const listTrips = tripsByTab[currentTab] || [];

  const trip = selectedTripId !== null ? tripDetailsCache?.[selectedTripId] : null;
  const accepted = !!trip?.is_accepted;
  const open = !!trip && accepted && trip.status !== "Completed" && trip.status !== "Cancelled";
  const canAlight = !!trip && accepted && trip.status !== "Cancelled";
  const stops = trip?.stops ?? [];
  const passengers = trip?.passengers ?? [];
  const currentStopIndex = open ? stops.findIndex((s) => !s.actual_departure) : -1;

  const passengerCounts = passengers.reduce(
    (acc, p) => {
      acc.all += 1;
      acc[passengerGroup(p.status)] += 1;
      return acc;
    },
    { all: 0, waiting: 0, onboard: 0, done: 0 }
  );
  const visiblePassengers = passengers.filter(
    (p) => pFilter === "all" || passengerGroup(p.status) === pFilter
  );

  const driverName =
    [profile?.first_name, profile?.last_name].filter(Boolean).join(" ") ||
    profile?.username ||
    user?.username ||
    "Driver";
  const vehicleLine = (profile?.vehicles || [])
    .map((v) => `${v.vehicle_name} (${v.plate_number})`)
    .join(" · ");

  // ---------------- actions ----------------
  const toastOk = (message) => setToast({ type: "success", message });

  // One action at a time; shows a spinner and a toast with the server's message on failure.
  const run = async (fn, successMessage) => {
    if (busy) return null;
    setBusy(true);
    try {
      const out = await fn();
      if (out?.success) {
        if (successMessage) {
          toastOk(typeof successMessage === "function" ? successMessage(out) : successMessage);
        }
      } else if (out?.code !== "early_departure") {
        // (early_departure is handled by the caller with a confirmation dialog, not a toast)
        setToast({ type: "error", message: out?.error || "Action failed." });
      }
      return out;
    } finally {
      setBusy(false);
    }
  };

  const openTrip = async (id) => {
    setSelectedTripId(id);
    setPFilter("all");
    setSheetLoading(!tripDetailsCache?.[id]);
    const detail = await getTripDetail(id, true);
    setSheetLoading(false);
    if (!detail && !tripDetailsCache?.[id]) {
      setSelectedTripId(null);
      setToast({ type: "error", message: "Couldn't load this trip." });
    }
  };

  const handleAccept = () => run(() => acceptTrip(trip.id), "Trip accepted");

  const handleDecline = () =>
    setDialog({
      title: "Decline this trip?",
      message: "It will be taken off your list so it can be reassigned.",
      confirmLabel: "Decline trip",
      tone: "danger",
      input: { label: "Reason (optional)", placeholder: "e.g. vehicle unavailable", maxLength: 300 },
      onConfirm: async (reason) => {
        const out = await run(() => declineTrip(trip.id, reason), "Trip declined");
        if (out?.success) setSelectedTripId(null);
      },
    });

  const handleDelay = () =>
    setDialog({
      title: "Report a delay",
      message: "The trip is marked Delayed until you depart from a stop again.",
      confirmLabel: "Report delay",
      input: {
        label: "What's causing the delay?",
        placeholder: "e.g. heavy traffic",
        required: true,
        maxLength: 500,
      },
      onConfirm: (notes) => run(() => reportDelay(trip.id, notes), "Delay reported"),
    });

  const handleArrive = (stop) => {
    const go = () =>
      run(() => arriveAtStop(trip.id, stop.id), `Arrived at ${stop.location?.name}`);
    if (stop.is_destination) {
      setDialog({
        title: "Arrived at the final stop?",
        message: "This marks the trip as completed.",
        confirmLabel: "Complete trip",
        onConfirm: go,
      });
    } else {
      go();
    }
  };

  const earlyMessage = (stop) =>
    `It's earlier than planned: scheduled ${fmtTime(stop.expected_departure)}, normally open from ${fmtTime(
      earliestDeparture(stop)
    )}.`;

  const handleDepart = (stop) => {
    const go = async (confirmEarly) => {
      const out = await run(
        () => departFromStop(trip.id, stop.id, "", confirmEarly),
        `Departed ${stop.location?.name}`
      );
      // The server's clock said "too early" even though this device's clock didn't:
      // ask the driver to confirm, then retry. (Deferred so the dialog that triggered
      // this call can finish closing first.)
      if (out && !out.success && out.code === "early_departure") {
        setTimeout(
          () =>
            setDialog({
              title: "Depart early?",
              message: earlyMessage(stop),
              confirmLabel: "Depart anyway",
              onConfirm: () => go(true),
            }),
          0
        );
      }
      return out;
    };

    const early = isEarlyDeparture(stop);
    const waiting = stop.boarding.expected - stop.boarding.checked_in;
    const due = stop.alighting.expected - stop.alighting.completed;

    if (early || waiting > 0 || due > 0) {
      const parts = [];
      if (early) parts.push(earlyMessage(stop));
      if (waiting > 0) parts.push(`${waiting} passenger(s) due to board here haven't checked in.`);
      if (due > 0) parts.push(`${due} passenger(s) due to get off here haven't been dropped off.`);
      setDialog({
        title: "Depart anyway?",
        message: parts.join(" "),
        confirmLabel: "Depart",
        onConfirm: () => go(early),
      });
    } else {
      go(false);
    }
  };

  const handleDropAll = (stop) =>
    setDialog({
      title: `Drop off at ${stop.location?.name}?`,
      message:
        "Everyone checked in who is due to get off here will be marked as dropped off. Passengers who never checked in are left as they are.",
      confirmLabel: "Drop off",
      onConfirm: () =>
        run(
          () => alightAtStop(trip.id, stop.id),
          (out) => {
            const done = out.result?.completed ?? 0;
            const left = out.result?.still_reserved ?? 0;
            return `${done} dropped off${left ? ` · ${left} never checked in` : ""}`;
          }
        ),
    });

  const handleWalkInConfirm = async ({ name, contactNumber, alightingStopId }) => {
    const stop = walkInFor;
    const out = await run(
      () => addWalkInPassenger(trip.id, stop.id, { name, contactNumber, alightingStopId }),
      `${name} added and checked in`
    );
    if (out?.success) setWalkInFor(null);
  };

  const handleCheckIn = (p) =>
    run(() => checkInPassenger(trip.id, p.id), `${p.name} checked in`);

  const handleNoShow = (p) =>
    setDialog({
      title: `Mark ${p.name} as no-show?`,
      message: "Their seat is released for the rest of the route.",
      confirmLabel: "Mark no-show",
      tone: "danger",
      onConfirm: () => run(() => markNoShow(trip.id, p.id), `${p.name} marked no-show`),
    });

  const handleAlightConfirm = async (stopId, reason) => {
    const p = alightFor;
    const out = await run(
      () => alightPassenger(trip.id, p.id, stopId, reason),
      `${p.name} dropped off`
    );
    if (out?.success) setAlightFor(null);
  };

  // ======================================================================
  // Render
  // ======================================================================
  return (
    <div className="min-h-screen bg-gray-50/50 pt-12 pb-10 px-4 dark:bg-gray-900">
      <div className="max-w-xl mx-auto space-y-6">
        {/* Driver info */}
        <div
          className={`${CARD} p-5 shadow-sm flex items-center justify-between gap-3 text-black dark:text-white`}
        >
          <div className="min-w-0">
            <p className="text-[10px] uppercase text-[var(--accent)] font-bold">Driver</p>
            <h1 className="text-xl font-black truncate">{driverName}</h1>
            {vehicleLine && <p className="text-xs text-gray-400 truncate">{vehicleLine}</p>}
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <button
              onClick={() => reload()}
              aria-label="Refresh"
              className="text-gray-400 hover:text-[var(--accent)]"
            >
              <FiRefreshCw size={18} className={loading ? "animate-spin" : ""} />
            </button>
            <FiTruck className="text-[var(--accent)]" size={24} />
          </div>
        </div>

        {/* Tabs */}
        <div className="grid grid-cols-4 gap-1 p-1 rounded-2xl bg-gray-100 dark:bg-gray-800">
          {TABS.map((t) => {
            const count = tripsByTab[t.key].length;
            const selected = currentTab === t.key;
            return (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={`py-2.5 rounded-xl text-sm font-bold flex items-center justify-center gap-1 ${
                  selected
                    ? "bg-white dark:bg-gray-900 shadow-sm text-[var(--accent)]"
                    : "text-gray-500 dark:text-gray-400"
                }`}
              >
                {t.label}
                {count > 0 && (
                  <span
                    className={`text-[10px] px-1.5 rounded-full ${
                      t.key === "pending" && !selected
                        ? "bg-amber-500 text-white"
                        : "text-[var(--accent)]"
                    }`}
                    style={t.key === "pending" && !selected ? undefined : softAccent}
                  >
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Trip list */}
        {loading && !tab ? (
          <div className="p-10 text-center text-gray-400">Loading...</div>
        ) : listTrips.length === 0 ? (
          <div className={`${CARD} p-10 text-center text-gray-400 flex flex-col items-center gap-2`}>
            <FiInbox size={28} />
            {TABS.find((t) => t.key === currentTab)?.empty}
          </div>
        ) : (
          <ul className="space-y-3">
            {listTrips.map((t) => (
              <TripCard key={t.id} trip={t} onOpen={() => openTrip(t.id)} />
            ))}
          </ul>
        )}
      </div>

      {/* ============ Trip view (full screen) ============ */}
      {selectedTripId !== null && (
        <div className="fixed inset-0 z-[100] overflow-y-auto bg-gray-50 dark:bg-gray-900 text-gray-800 dark:text-white">
          <div className="sticky top-0 z-10 bg-white/90 dark:bg-gray-900/90 backdrop-blur border-b border-gray-200 dark:border-gray-800">
            <div className="max-w-xl mx-auto px-4 py-3 flex items-center gap-3">
              <button
                onClick={() => setSelectedTripId(null)}
                aria-label="Back"
                className="p-2 -ml-2 rounded-full text-[var(--accent)]"
              >
                <FiChevronLeft size={24} />
              </button>
              <div className="min-w-0 flex-1">
                <div className="font-black truncate">{trip?.title || "Trip"}</div>
              </div>
              {trip && <StatusBadge status={trip.status} />}
            </div>
          </div>

          <div className="max-w-xl mx-auto px-4 py-5 space-y-6">
            {sheetLoading && !trip && (
              <div className="p-10 text-center text-gray-400">Loading...</div>
            )}

            {!sheetLoading && !trip && (
              <div className={`${CARD} p-10 text-center text-gray-400`}>
                This trip is no longer available.
              </div>
            )}

            {trip && (
              <>
                {/* Summary */}
                <div className={`${CARD} p-5 space-y-4 shadow-sm`}>
                  <div className="flex items-center gap-2 text-sm">
                    <FiMapPin className="text-[var(--accent)] shrink-0" size={16} />
                    <span className="font-bold truncate">{trip.origin?.location_name || "—"}</span>
                    <FiArrowRight className="shrink-0 text-gray-400" size={14} />
                    <span className="font-bold truncate">{trip.destination?.location_name || "—"}</span>
                  </div>

                  <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400 flex-wrap">
                    <span className="flex items-center gap-1">
                      <FiClock size={13} /> {fmtWhen(trip.origin?.expected_departure)}
                    </span>
                    {trip.vehicle && (
                      <span className="flex items-center gap-1">
                        <FiTruck size={13} /> {trip.vehicle.vehicle_name} · {trip.vehicle.plate_number}
                      </span>
                    )}
                  </div>

                  <div className="space-y-1">
                    <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400">
                      <span>Peak seats used</span>
                      <span className="font-bold">
                        {trip.occupied_seats}/{trip.max_capacity}
                      </span>
                    </div>
                    <div className="h-2 rounded-full bg-gray-100 dark:bg-gray-800 overflow-hidden">
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${
                            trip.max_capacity
                              ? Math.min(100, (trip.occupied_seats / trip.max_capacity) * 100)
                              : 0
                          }%`,
                          backgroundColor: "var(--accent)",
                        }}
                      />
                    </div>
                  </div>

                  {trip.desc && (
                    <p className="text-sm text-gray-600 dark:text-gray-300">{trip.desc}</p>
                  )}
                  {trip.notes && (
                    <p className="text-xs whitespace-pre-line text-amber-600 dark:text-amber-400">
                      {trip.notes}
                    </p>
                  )}
                </div>

                {/* Trip-level actions */}
                {trip.status === "Cancelled" && (
                  <div className="rounded-2xl p-4 text-sm font-bold flex items-center gap-2 bg-red-50 text-red-600 dark:bg-red-900/30 dark:text-red-300">
                    <FiXCircle size={18} /> This trip was cancelled.
                  </div>
                )}

                {trip.status === "Completed" && (
                  <div className="rounded-2xl p-4 text-sm font-bold flex items-center gap-2 bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-300">
                    <FiCheckCircle size={18} /> Trip completed
                    {trip.actual_arrival_time ? ` at ${fmtTime(trip.actual_arrival_time)}` : ""}
                  </div>
                )}

                {isPre(trip.status) && !accepted && (
                  <div className={`${CARD} p-5 space-y-3 shadow-sm`}>
                    <p className="text-sm text-gray-600 dark:text-gray-300">
                      This trip is assigned to you. Accept it to start check-ins and stop updates.
                    </p>
                    <div className="grid grid-cols-2 gap-2">
                      <button onClick={handleAccept} className={BTN_PRIMARY}>
                        Accept
                      </button>
                      <button onClick={handleDecline} className={BTN_OUTLINE}>
                        Decline
                      </button>
                    </div>
                  </div>
                )}

                {open && (
                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={handleDelay}
                      className={`${BTN} border-2 border-amber-300 dark:border-amber-700 text-amber-700 dark:text-amber-300`}
                    >
                      <FiAlertTriangle size={16} /> Report delay
                    </button>
                    {isPre(trip.status) && (
                      <button onClick={handleDecline} className={BTN_OUTLINE}>
                        Decline trip
                      </button>
                    )}
                  </div>
                )}

                {/* Stops */}
                <section className="space-y-3">
                  <h2 className="font-black text-lg">Route</h2>
                  {stops.length === 0 ? (
                    <div className={`${CARD} p-6 text-center text-gray-400 text-sm`}>
                      No stops on this trip yet.
                    </div>
                  ) : (
                    <div>
                      {stops.map((stop, i) => (
                        <StopCard
                          key={stop.id}
                          stop={stop}
                          index={i}
                          stops={stops}
                          isCurrent={i === currentStopIndex}
                          open={open}
                          canAlight={canAlight}
                          onArrive={() => handleArrive(stop)}
                          onDepart={() => handleDepart(stop)}
                          onDropAll={() => handleDropAll(stop)}
                          onWalkIn={() => setWalkInFor(stop)}
                        />
                      ))}
                    </div>
                  )}
                </section>

                {/* Passengers */}
                <section className="space-y-3">
                  <h2 className="font-black text-lg">Passengers</h2>

                  <div className="grid grid-cols-4 gap-1 p-1 rounded-2xl bg-gray-100 dark:bg-gray-800">
                    {PASSENGER_FILTERS.map((f) => (
                      <button
                        key={f.key}
                        onClick={() => setPFilter(f.key)}
                        className={`py-2 rounded-xl text-xs font-bold ${
                          pFilter === f.key
                            ? "bg-white dark:bg-gray-900 shadow-sm text-[var(--accent)]"
                            : "text-gray-500 dark:text-gray-400"
                        }`}
                      >
                        {f.label} ({passengerCounts[f.key]})
                      </button>
                    ))}
                  </div>

                  {visiblePassengers.length === 0 ? (
                    <div className={`${CARD} p-6 text-center text-gray-400 text-sm`}>
                      No passengers here.
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {visiblePassengers.map((p) => (
                        <PassengerRow
                          key={p.id}
                          p={p}
                          open={open}
                          canAlight={canAlight}
                          onCheckIn={() => handleCheckIn(p)}
                          onNoShow={() => handleNoShow(p)}
                          onAlight={() => setAlightFor(p)}
                        />
                      ))}
                    </div>
                  )}
                </section>
              </>
            )}
          </div>
        </div>
      )}

      {/* ============ Overlays ============ */}
      <Dialog dialog={dialog} onClose={() => setDialog(null)} />

      {alightFor && trip && (
        <AlightModal
          trip={trip}
          passenger={alightFor}
          onClose={() => setAlightFor(null)}
          onConfirm={handleAlightConfirm}
        />
      )}

      {walkInFor && trip && (
        <WalkInModal
          trip={trip}
          stop={walkInFor}
          onClose={() => setWalkInFor(null)}
          onConfirm={handleWalkInConfirm}
        />
      )}

      {busy && (
        <div className="fixed inset-0 bg-white/40 dark:bg-black/40 backdrop-blur-[2px] z-[250] flex items-center justify-center">
          <div
            className="animate-spin rounded-full h-8 w-8 border-2 border-gray-300 dark:border-gray-600"
            style={{ borderTopColor: "var(--accent)" }}
          />
        </div>
      )}

      {toast && (
        <div
          className={`fixed top-6 left-1/2 -translate-x-1/2 z-[300] px-6 py-3 rounded-full shadow-lg text-white font-medium max-w-[90vw] text-center ${
            toast.type === "success" ? "bg-[var(--accent)]" : "bg-red-500"
          }`}
        >
          {toast.message}
        </div>
      )}
    </div>
  );
}