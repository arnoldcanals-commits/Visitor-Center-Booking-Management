import { useEffect, useMemo, useState } from "react";
import api from "../../api";
import { X, Users, ArrowRight, Check } from "lucide-react";

const accentSoft = {
  backgroundColor: "color-mix(in srgb, var(--accent) 8%, transparent)",
  color: "var(--accent)",
  borderColor: "color-mix(in srgb, var(--accent) 20%, transparent)",
};

const stopName = (stop) =>
  stop?.location?.is_active === false ? "Removed stop" : stop?.location?.name || "—";

// Turn a DRF error body into one readable message.
const errorMessage = (error, fallback) => {
  if (error?.response?.status === 401) return "Please sign in to request a reservation.";
  const data = error?.response?.data;
  if (!data) return fallback;
  if (typeof data === "string") return data;
  const flat = Object.values(data).flat().map(String);
  return flat.length ? flat.join(" ") : fallback;
};

export default function ReservationRequestModal({ item, onClose, onSubmitted }) {
  const [guests, setGuests] = useState([]);
  const [loadingGuests, setLoadingGuests] = useState(true);
  const [guestsError, setGuestsError] = useState(null);

  const [selected, setSelected] = useState([]); // guest ids
  const [boardingId, setBoardingId] = useState("");
  const [alightingId, setAlightingId] = useState("");
  const [notes, setNotes] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [done, setDone] = useState(false);

  // ---------------- route / stop choices ----------------
  const stops = useMemo(
    () => [...(item.stops || [])].sort((a, b) => a.sequence - b.sequence),
    [item.stops]
  );
  // Only offer pickers when every stop has an id (otherwise the request covers the whole route).
  const canPickStops = stops.length >= 2 && stops.every((s) => s.id != null);

  // Pickup: any stop except the last that the vehicle hasn't already left
  const pickupOptions = canPickStops
    ? stops.slice(0, -1).filter((s) => !s.actual_departure)
    : [];
  const boardingStop =
    pickupOptions.find((s) => String(s.id) === String(boardingId)) || pickupOptions[0] || null;

  // Drop-off: any stop after the pickup (default: the final stop)
  const dropOptions = boardingStop ? stops.filter((s) => s.sequence > boardingStop.sequence) : [];
  const alightingStop =
    dropOptions.find((s) => String(s.id) === String(alightingId)) ||
    dropOptions[dropOptions.length - 1] ||
    null;

  // ---------------- saved guests ----------------
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await api.get("/api/transport-reservations/guests/");
        if (!cancelled) setGuests(res.data || []);
      } catch (err) {
        if (!cancelled) setGuestsError(errorMessage(err, "Couldn't load your saved guests."));
      } finally {
        if (!cancelled) setLoadingGuests(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const toggleGuest = (id) =>
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  const submit = async () => {
    if (submitting || selected.length === 0) return;
    setSubmitting(true);
    setError(null);
    try {
      const payload = { transportation: item.id, guests: selected };
      if (canPickStops && boardingStop && alightingStop) {
        payload.boarding_stop = boardingStop.id;
        payload.alighting_stop = alightingStop.id;
      }
      if (notes.trim()) payload.notes = notes.trim();

      const res = await api.post("/api/transport-reservations/", payload);
      setDone(true);
      onSubmitted?.(res.data);
    } catch (err) {
      setError(errorMessage(err, "Couldn't send your request. Please try again."));
    } finally {
      setSubmitting(false);
    }
  };

  const inputClass =
    "border border-gray-300 dark:border-gray-600 bg-transparent rounded-lg px-3 py-2 text-sm text-gray-800 dark:text-gray-200 w-full";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto p-6 space-y-5">
        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="text-lg font-bold text-gray-800 dark:text-gray-100">
              Request a reservation
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 truncate">{item.title}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="p-1 text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
          >
            <X size={20} />
          </button>
        </div>

        {done ? (
          <div className="text-center py-6 space-y-3">
            <div
              className="mx-auto w-12 h-12 rounded-full flex items-center justify-center border"
              style={accentSoft}
            >
              <Check size={24} />
            </div>
            <p className="font-semibold text-gray-800 dark:text-gray-100">Request sent</p>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              An admin will review it. Once approved, your guests are added to this trip.
            </p>
            <button
              type="button"
              onClick={onClose}
              className="text-sm font-semibold text-white rounded-lg px-4 py-2"
              style={{ backgroundColor: "var(--accent)" }}
            >
              Done
            </button>
          </div>
        ) : (
          <>
            {/* Route */}
            {canPickStops && boardingStop && alightingStop ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-gray-500 dark:text-gray-400">
                    Pickup
                  </label>
                  <select
                    value={String(boardingStop.id)}
                    onChange={(e) => setBoardingId(e.target.value)}
                    className={inputClass}
                  >
                    {pickupOptions.map((s) => (
                      <option key={s.id} value={String(s.id)}>
                        {stopName(s)}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-gray-500 dark:text-gray-400">
                    Drop-off
                  </label>
                  <select
                    value={String(alightingStop.id)}
                    onChange={(e) => setAlightingId(e.target.value)}
                    className={inputClass}
                  >
                    {dropOptions.map((s) => (
                      <option key={s.id} value={String(s.id)}>
                        {stopName(s)}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            ) : (
              stops.length >= 2 && (
                <div className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                  <span>{stopName(stops[0])}</span>
                  <ArrowRight size={14} className="text-gray-400" />
                  <span>{stopName(stops[stops.length - 1])}</span>
                </div>
              )
            )}

            {/* Guests */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-1 text-sm font-semibold text-gray-700 dark:text-gray-300">
                  <Users size={14} /> Who's coming?
                </label>
                {selected.length > 0 && (
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    {selected.length} selected
                  </span>
                )}
              </div>

              {loadingGuests ? (
                <p className="text-sm text-gray-400 py-4 text-center">Loading your guests...</p>
              ) : guestsError ? (
                <p className="text-sm text-red-500 py-4 text-center">{guestsError}</p>
              ) : guests.length === 0 ? (
                <div className="text-center py-5 border border-dashed border-gray-300 dark:border-gray-700 rounded-lg space-y-3">
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    You don't have any saved guests yet.
                  </p>
                  <a
                    href="/guests/"
                    className="inline-block text-sm font-semibold text-white rounded-lg px-4 py-2 hover:opacity-90"
                    style={{ backgroundColor: "var(--accent)" }}
                  >
                    Create guest
                  </a>
                </div>
              ) : (
                <ul className="space-y-2 max-h-56 overflow-y-auto">
                  {guests.map((g) => (
                    <li key={g.id}>
                      <label className="flex items-center gap-3 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={selected.includes(g.id)}
                          onChange={() => toggleGuest(g.id)}
                          className="w-4 h-4"
                          style={{ accentColor: "var(--accent)" }}
                        />
                        <span className="flex-1 min-w-0">
                          <span className="block text-sm font-medium text-gray-800 dark:text-gray-200 truncate">
                            {g.full_name}
                          </span>
                          <span className="block text-xs text-gray-400">
                            {g.age} • {g.gender}
                            {g.local ? " • Local" : ""}
                          </span>
                        </span>
                      </label>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* Notes */}
            <div className="space-y-1">
              <label className="text-xs font-semibold text-gray-500 dark:text-gray-400">
                Notes (optional)
              </label>
              <textarea
                rows={2}
                maxLength={300}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Anything the admin should know"
                className={inputClass}
              />
            </div>

            {error && <p className="text-sm text-red-500">{error}</p>}

            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={onClose}
                className="text-sm font-semibold rounded-lg px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={submit}
                disabled={submitting || selected.length === 0}
                className="text-sm font-semibold text-white rounded-lg px-4 py-2 disabled:opacity-50"
                style={{ backgroundColor: "var(--accent)" }}
              >
                {submitting ? "Sending..." : "Send request"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}