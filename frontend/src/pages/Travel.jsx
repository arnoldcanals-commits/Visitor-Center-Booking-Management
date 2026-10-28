import React, { useMemo, useState, useEffect, useRef } from "react";
import api from "../api";
import TopBar from "../components/TopBar";
import {
  Bus,
  Car,
  Ship,
  Plane,
  TramFront,
  MapPin,
  ArrowRight,
  Clock,
  Users,
  ChevronDown,
  ChevronUp,
  SlidersHorizontal,
  LayoutGrid,
  List as ListIcon,
} from "lucide-react";
import LoadingIndicator from "../components/LoadingIndicator";
const STATUS_CHOICES = ["Scheduled", "Departed", "Delayed", "Cancelled", "Completed"];

const STATUS_COLORS = {
  Scheduled: "bg-blue-100 text-blue-700",
  Departed: "bg-amber-100 text-amber-700",
  Delayed: "bg-orange-100 text-orange-700",
  Cancelled: "bg-red-100 text-red-700",
  Completed: "bg-green-100 text-green-700",
};
const accentChip = {
  backgroundColor: "color-mix(in srgb, var(--accent) 8%, transparent)",
  color: "var(--accent)",
  borderColor: "color-mix(in srgb, var(--accent) 20%, transparent)",
};
// --- Redaction helpers: never surface the underlying name once inactive ---
const renderDriver = (driver) => {
  if (!driver) return <span>—</span>;
  if (driver.is_active === false) {
    return <span className="italic text-gray-400 dark:text-gray-500">Driver removed</span>;
  }
  const fullName = `${driver.first_name || ""} ${driver.last_name || ""}`.trim();
  return <span>{fullName || driver.username || driver.email || `User #${driver.id}`}</span>;
};

const renderLocation = (location) => {
  if (!location) return <span>—</span>;
  if (location.is_active === false) {
    return <span className="italic text-gray-400 dark:text-gray-500">Location removed</span>;
  }
  return <span>{location.name}</span>;
};

const destinationLabel = (location) => {
  if (!location) return "No destination set";
  if (location.is_active === false) return "Removed destination";
  return location.name;
};

// --- Route / stop helpers ---
// `stops` arrives nested and read-only on each Transportation record now that
// pickup_location/dropoff_location no longer exist — a route is an ordered list.
const sortedStops = (item) =>
  Array.isArray(item?.stops) ? [...item.stops].sort((a, b) => a.sequence - b.sequence) : [];

const originStop = (item) => sortedStops(item)[0] || null;
const destinationStop = (item) => {
  const stops = sortedStops(item);
  return stops.length ? stops[stops.length - 1] : null;
};

const waypointCount = (item) => Math.max(sortedStops(item).length - 2, 0);

// Best available departure/arrival timestamps for display — prefer the actual
// time once it's happened, otherwise fall back to the origin/destination stop's
// expected time.
const departureInfo = (item) => {
  if (item.actual_departure_time) return { value: item.actual_departure_time, label: "Departed" };
  const origin = originStop(item);
  const expected = origin?.expected_departure || origin?.expected_arrival;
  return { value: expected, label: "Expected departure" };
};

const arrivalInfo = (item) => {
  if (item.actual_arrival_time) return { value: item.actual_arrival_time, label: "Arrived" };
  const destination = destinationStop(item);
  const expected = destination?.expected_arrival || destination?.expected_departure;
  return { value: expected, label: "Expected arrival" };
};

// --- Give the vehicle some personality ---
const getVehicleVibe = (category = "") => {
  const cat = category.toLowerCase();

  if (cat.includes("bus")) {
    return { Icon: Bus, color: "text-amber-600 bg-amber-50", tagline: "Rolling with the whole crew" };
  }
  if (cat.includes("boat") || cat.includes("ferry") || cat.includes("ship")) {
    return { Icon: Ship, color: "text-cyan-600 bg-cyan-50", tagline: "Smooth sailing ahead" };
  }
  if (cat.includes("plane") || cat.includes("flight") || cat.includes("air")) {
    return { Icon: Plane, color: "text-sky-600 bg-sky-50", tagline: "Up, up and away" };
  }
  if (cat.includes("train") || cat.includes("rail")) {
    return { Icon: TramFront, color: "text-purple-600 bg-purple-50", tagline: "On the rails, right on time" };
  }
  if (cat.includes("van") || cat.includes("shuttle")) {
    return { Icon: Bus, color: "text-emerald-600 bg-emerald-50", tagline: "Squad shuttle, engaged" };
  }
  // default: car
  return { Icon: Car, color: "text-orange-600 bg-orange-50", tagline: "Ready to hit the road" };
};

const emptyPrimaryFilters = {
  origin: "",
  destination: "",
  departure_date: "",
  status: "",
};

const emptyExtraFilters = {
  category: "",
  sub_category: "",
  title: "",
  vehicle_name: "",
  plate_number: "",
  driver: "",
  owner: "",
  affiliate: "",
};

const formatDateTime = (value) => {
  if (!value) return "—";
  return new Date(value).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const SeatBadge = ({ item }) => {
  const max = item.max_capacity ?? item.vehicle?.capacity ?? null;
  if (max === null) return null;
  const available = item.available_seats ?? Math.max(max - (item.occupied_seats ?? 0), 0);
  const full = available <= 0;
  return (
    <span
      className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium ${
        full ? "bg-red-50 text-red-700" : "bg-sky-50 text-sky-700"
      }`}
    >
      <Users size={11} /> {full ? "Full" : `${available} seat${available === 1 ? "" : "s"} left`}
    </span>
  );
};

// --- Grid card ---
function TransportationCard({ item }) {
  const { Icon, color, tagline } = getVehicleVibe(item.category);
  const origin = originStop(item);
  const destination = destinationStop(item);
  const waypoints = waypointCount(item);
  const departure = departureInfo(item);
  const arrival = arrivalInfo(item);

  return (
    <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl p-4 shadow-sm hover:shadow-md transition">
      <div className="flex items-start gap-3 mb-3">
        <div className={`shrink-0 w-11 h-11 rounded-full flex items-center justify-center ${color}`}>
          <Icon size={22} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex justify-between items-start gap-2">
            <h2 className="font-semibold text-gray-800 dark:text-gray-200 truncate">
              {item.title}
            </h2>
            {item.status && (
              <span
                className={`shrink-0 text-xs font-medium px-2 py-1 rounded-full ${
                  STATUS_COLORS[item.status] || "bg-gray-100 text-gray-700"
                }`}
              >
                {item.status}
              </span>
            )}
          </div>
          <p className="text-xs italic text-gray-400 dark:text-gray-500">"{tagline}"</p>
        </div>
      </div>

      <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">
        {item.category}
        {item.sub_category ? ` • ${item.sub_category}` : ""}
      </p>

      {item.desc && (
        <p className="text-sm text-gray-600 dark:text-gray-300 mb-3">{item.desc}</p>
      )}

      <div className="space-y-1.5 text-sm text-gray-700 dark:text-gray-300">
        <div className="flex items-center gap-2">
          <Icon size={14} className="text-gray-400 shrink-0" />
          <span>
            {item.vehicle?.vehicle_name || "No vehicle assigned"}{" "}
            {item.vehicle?.plate_number && (
              <span className="text-xs text-gray-400">({item.vehicle.plate_number})</span>
            )}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <SeatBadge item={item} />
        </div>
        <div className="flex items-center gap-2">
          <MapPin size={14} className="text-gray-400 shrink-0" />
          <span className="truncate">
            {renderLocation(origin?.location)} <ArrowRight size={10} className="inline mx-1" />{" "}
            {waypoints > 0 && (
              <span className="text-xs text-gray-400">(+{waypoints}) </span>
            )}
            {renderLocation(destination?.location)}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Clock size={14} className="text-gray-400 shrink-0" />
          <span>
            {formatDateTime(departure.value)} – {formatDateTime(arrival.value)}
          </span>
        </div>
        <div className="text-xs text-gray-400 pl-6">
          Driver: {renderDriver(item.driver)} • Owner: {item.owner || "—"}
        </div>
      </div>
    </div>
  );
}

// --- List row ---
function TransportationRow({ item }) {
  const { Icon, color } = getVehicleVibe(item.category);
  const origin = originStop(item);
  const destination = destinationStop(item);
  const waypoints = waypointCount(item);
  const departure = departureInfo(item);
  const arrival = arrivalInfo(item);

  return (
    <div className="flex items-center gap-4 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-3 shadow-sm hover:shadow-md transition">
      <div className={`shrink-0 w-9 h-9 rounded-full flex items-center justify-center ${color}`}>
        <Icon size={18} />
      </div>

      <div className="min-w-0 w-48">
        <h2 className="font-semibold text-gray-800 dark:text-gray-200 truncate">{item.title}</h2>
        <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
          {item.category}
          {item.sub_category ? ` • ${item.sub_category}` : ""}
        </p>
      </div>

      <div className="hidden sm:flex items-center gap-1 text-sm text-gray-700 dark:text-gray-300 min-w-0 flex-1">
        <span className="truncate">{renderLocation(origin?.location)}</span>
        {waypoints > 0 && <span className="text-xs text-gray-400 shrink-0">(+{waypoints})</span>}
        <ArrowRight size={12} className="shrink-0 text-gray-400" />
        <span className="truncate">{renderLocation(destination?.location)}</span>
      </div>

      <div className="hidden md:block text-sm text-gray-600 dark:text-gray-300 whitespace-nowrap">
        {formatDateTime(departure.value)} – {formatDateTime(arrival.value)}
      </div>

      <div className="hidden lg:flex items-center gap-3 text-xs text-gray-400 whitespace-nowrap">
        <span>Driver: {renderDriver(item.driver)}</span>
        <SeatBadge item={item} />
      </div>

      {item.status && (
        <span
          className={`shrink-0 text-xs font-medium px-2 py-1 rounded-full ${
            STATUS_COLORS[item.status] || "bg-gray-100 text-gray-700"
          }`}
        >
          {item.status}
        </span>
      )}
    </div>
  );
}

export default function Travel() {
  const [transportation, setTransportation] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showMoreFilters, setShowMoreFilters] = useState(false);
  const [viewMode, setViewMode] = useState("grid"); // "grid" | "list"

  // Primary (always visible) filters. `origin`/`destination` replace the old
  // pickup_location/dropoff_location text filters — they now match against
  // the route's first/last stop location name, since Transportation no longer
  // has fixed pickup/dropoff fields.
  const [primaryFilters, setPrimaryFilters] = useState(emptyPrimaryFilters);

  // Secondary (expand-to-reveal) filters
  const [extraFilters, setExtraFilters] = useState(emptyExtraFilters);

  const handlePrimaryChange = (field, value) => {
    setPrimaryFilters((prev) => ({ ...prev, [field]: value }));
  };

  const handleExtraChange = (field, value) => {
    setExtraFilters((prev) => ({ ...prev, [field]: value }));
  };

  const clearFilters = () => {
    setPrimaryFilters(emptyPrimaryFilters);
    setExtraFilters(emptyExtraFilters);
  };

  const activeExtraCount = Object.values(extraFilters).filter(Boolean).length;

  // Only `status` maps cleanly to an exact-match backend filter
  // (category/sub_category/title/vehicle__owner/vehicle__affiliate also filter
  // server-side, but exact-match only). Everything else — including the new
  // origin/destination stop search — is matched client-side below, since it
  // needs partial/substring matching that the current filterset doesn't do.
   
 const isFirstLoad = useRef(true);

useEffect(() => {
  const fetchTransportation = async () => {
    setLoading(true);
    try {
      const params = {};
      if (primaryFilters.status) params.status = primaryFilters.status;

      const delayMs = isFirstLoad.current ? 1500 : 0;
      const minDelay = new Promise((resolve) => setTimeout(resolve, delayMs));

      const [res] = await Promise.all([
        api.get("/api/transportation/", { params }),
        minDelay,
      ]);

      setTransportation(res.data);
      setError(null);
    } catch (err) {
      console.error("Transportation fetch error:", err);
      setError("Failed to load transportation data.");
    } finally {
      setLoading(false);
      isFirstLoad.current = false;
    }
  };

  const debounce = setTimeout(fetchTransportation, 300);
  return () => clearTimeout(debounce);
}, [primaryFilters.status]);

  // Client-side filtering for everything that needs substring matching
  const filteredTransportation = useMemo(() => {
    const matches = (haystack, needle) =>
      !needle || (haystack || "").toLowerCase().includes(needle.trim().toLowerCase());

    return transportation.filter((item) => {
      const origin = originStop(item)?.location;
      const destination = destinationStop(item)?.location;
      const departure = departureInfo(item).value;

      if (!matches(origin?.name, primaryFilters.origin)) return false;
      if (!matches(destination?.name, primaryFilters.destination)) return false;

      if (primaryFilters.departure_date) {
        if (!departure) return false;
        const isoDay = new Date(departure).toISOString().slice(0, 10);
        if (isoDay !== primaryFilters.departure_date) return false;
      }

      if (!matches(item.category, extraFilters.category)) return false;
      if (!matches(item.sub_category, extraFilters.sub_category)) return false;
      if (!matches(item.title, extraFilters.title)) return false;
      if (!matches(item.vehicle?.vehicle_name, extraFilters.vehicle_name)) return false;
      if (!matches(item.vehicle?.plate_number, extraFilters.plate_number)) return false;

      const driverName = item.driver
        ? `${item.driver.first_name || ""} ${item.driver.last_name || ""} ${item.driver.username || ""}`
        : "";
      if (!matches(driverName, extraFilters.driver)) return false;

      if (!matches(item.owner, extraFilters.owner)) return false;
      if (!matches(item.affiliate, extraFilters.affiliate)) return false;

      return true;
    });
  }, [transportation, primaryFilters, extraFilters]);

  // Group by destination (last stop on the route)
  const groupedByDestination = useMemo(() => {
    const groups = {};
    filteredTransportation.forEach((item) => {
      const loc = destinationStop(item)?.location;
      const key = loc?.id ?? "unknown";
      if (!groups[key]) {
        groups[key] = { label: destinationLabel(loc), items: [] };
      }
      groups[key].items.push(item);
    });
    return Object.values(groups).sort((a, b) => a.label.localeCompare(b.label));
  }, [filteredTransportation]);

  const inputClass =
    "border border-gray-300 dark:border-gray-600 bg-transparent rounded-lg px-3 py-2 text-sm text-gray-800 dark:text-gray-200 w-full";

  return (
    <div className="bg-white dark:bg-gray-900 min-h-screen">
      <TopBar />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-between mb-6 bg-white dark:bg-gray-900 rounded-xl shadow p-4 border border-transparent dark:border-slate-700">
         <div className="flex items-center gap-2 p-3 rounded-xl w-fit border" style={accentChip}>
                <Ship size={28} />
                <span className="text-sm font-black uppercase tracking-tight">Transportation</span>
              </div>
          {/* View toggle */}
          <div className="flex items-center gap-1 border border-gray-300 dark:border-gray-700 rounded-lg p-1">
            <button
              type="button"
              onClick={() => setViewMode("grid")}
              className={`flex items-center gap-1 text-sm px-2 py-1 rounded-md transition ${
                viewMode === "grid"
                  ? "text-white"
                  : "text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200"
              }`}
              style={viewMode === "grid" ? { backgroundColor: "var(--accent)" } : undefined}
            >
              <LayoutGrid size={14} />
              Grid
            </button>
            <button
              type="button"
              onClick={() => setViewMode("list")}
              className={`flex items-center gap-1 text-sm px-2 py-1 rounded-md transition ${
                viewMode === "list"
                  ? "text-white"
                  : "text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200"
              }`}
              style={viewMode === "list" ? { backgroundColor: "var(--accent)" } : undefined}
            >
              <ListIcon size={14} />
              List
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl p-4 mb-6">
          {/* Primary filters */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="flex items-center gap-2">
              <MapPin size={16} className="text-gray-400 shrink-0" />
              <input
                type="text"
                placeholder="Origin stop"
                value={primaryFilters.origin}
                onChange={(e) => handlePrimaryChange("origin", e.target.value)}
                className={inputClass}
              />
            </div>
            <div className="flex items-center gap-2">
              <ArrowRight size={16} className="text-gray-400 shrink-0" />
              <input
                type="text"
                placeholder="Destination stop"
                value={primaryFilters.destination}
                onChange={(e) => handlePrimaryChange("destination", e.target.value)}
                className={inputClass}
              />
            </div>
            <div className="flex items-center gap-2">
              <Clock size={16} className="text-gray-400 shrink-0" />
              <input
                type="date"
                value={primaryFilters.departure_date}
                onChange={(e) => handlePrimaryChange("departure_date", e.target.value)}
                className={inputClass}
              />
            </div>
            <select
              value={primaryFilters.status}
              onChange={(e) => handlePrimaryChange("status", e.target.value)}
              className={inputClass}
            >
              <option value="">All statuses</option>
              {STATUS_CHOICES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>

          {/* Toggle + clear */}
          <div className="flex items-center justify-between mt-3">
            <button
              type="button"
              onClick={() => setShowMoreFilters((v) => !v)}
              className="flex items-center gap-1 text-sm font-medium text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition"
            >
              <SlidersHorizontal size={14} />
              {showMoreFilters ? "Hide filters" : "Expand filters"}
              {activeExtraCount > 0 && !showMoreFilters && (
                <span
                  className="ml-1 text-xs rounded-full px-2 py-0.5 text-white"
                  style={{ backgroundColor: "var(--accent)" }}
                >
                  {activeExtraCount}
                </span>
              )}
              {showMoreFilters ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </button>

            <button
              type="button"
              onClick={clearFilters}
              className="text-sm font-semibold text-white rounded-lg px-3 py-1.5 transition"
              style={{ backgroundColor: "var(--accent)" }}
            >
              Clear filters
            </button>
          </div>

          {/* Secondary filters */}
          {showMoreFilters && (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
              <input
                type="text"
                placeholder="Category"
                value={extraFilters.category}
                onChange={(e) => handleExtraChange("category", e.target.value)}
                className={inputClass}
              />
              <input
                type="text"
                placeholder="Sub category"
                value={extraFilters.sub_category}
                onChange={(e) => handleExtraChange("sub_category", e.target.value)}
                className={inputClass}
              />
              <input
                type="text"
                placeholder="Title"
                value={extraFilters.title}
                onChange={(e) => handleExtraChange("title", e.target.value)}
                className={inputClass}
              />
              <input
                type="text"
                placeholder="Vehicle name"
                value={extraFilters.vehicle_name}
                onChange={(e) => handleExtraChange("vehicle_name", e.target.value)}
                className={inputClass}
              />
              <input
                type="text"
                placeholder="Plate number"
                value={extraFilters.plate_number}
                onChange={(e) => handleExtraChange("plate_number", e.target.value)}
                className={inputClass}
              />
              <input
                type="text"
                placeholder="Driver"
                value={extraFilters.driver}
                onChange={(e) => handleExtraChange("driver", e.target.value)}
                className={inputClass}
              />
              <input
                type="text"
                placeholder="Owner"
                value={extraFilters.owner}
                onChange={(e) => handleExtraChange("owner", e.target.value)}
                className={inputClass}
              />
              <input
                type="text"
                placeholder="Affiliate"
                value={extraFilters.affiliate}
                onChange={(e) => handleExtraChange("affiliate", e.target.value)}
                className={inputClass}
              />
            </div>
          )}
        </div>

        {/* Results */}
        {loading ? (
           <LoadingIndicator />
        ) : error ? (
          <div className="text-center text-red-500 py-12">{error}</div>
        ) : filteredTransportation.length === 0 ? (
          <div className="text-center text-gray-500 dark:text-gray-400 py-12">
            No transportation records found.
          </div>
        ) : (
          <div className="space-y-8">
            {groupedByDestination.map((group) => (
              <div key={group.label}>
                <h3 className="flex items-center gap-2 text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3">
                  <ArrowRight size={14} className="text-gray-400" />
                  {group.label}
                  <span className="text-xs font-normal normal-case text-gray-400">
                    ({group.items.length})
                  </span>
                </h3>

                {viewMode === "grid" ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {group.items.map((item) => (
                      <TransportationCard key={item.id} item={item} />
                    ))}
                  </div>
                ) : (
                  <div className="space-y-2">
                    {group.items.map((item) => (
                      <TransportationRow key={item.id} item={item} />
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}