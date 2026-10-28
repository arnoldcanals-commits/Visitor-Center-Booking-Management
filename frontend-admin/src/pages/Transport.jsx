import React, { useState, useEffect, useContext, useMemo } from 'react';
import api from '../api'; // Your axios instance, not raw fetch
import TransportationStopManager from '../components/transport/TransportationStopManager';
import TransportPassengerManager from '../components/transport/TransportPassengerManager';
import { MapPin } from "lucide-react";
import { AuthContext } from '../contexts/AuthContext'; // Pull in your auth context
import VehicleManager from './Vehicle';
import LocationManager from './Location';
import {
  Car, Search, LayoutGrid, List, ChevronLeft, ChevronRight,
  Calendar, X, SlidersHorizontal, SquarePen, Trash2, Archive, ArchiveRestore,
  Power, PowerOff, Eye, EyeOff, Users
} from "lucide-react";

// Converts a Date to the "yyyy-MM-ddTHH:mm" format datetime-local inputs expect,
// in the browser's local timezone (so `min` comparisons line up with what's typed).
const toLocalInputValue = (date) => {
  const offsetMs = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - offsetMs).toISOString().slice(0, 16);
};

// Normalizes an API response into an array no matter what shape it comes back in
// (plain array, DRF-paginated {results: [...]}, or an unexpected error/object payload).
// Prevents "items.filter is not a function" style crashes downstream.
const toArray = (data) => {
  if (Array.isArray(data)) return data;
  if (data && Array.isArray(data.results)) return data.results;
  return [];
};

// owner/affiliate/max_capacity are no longer editable — they're derived server-side
// from the assigned Vehicle. schedule/start_time/end_time/pickup_location/dropoff_location
// no longer exist on Transportation — routes are now made of ordered `stops`, managed
// separately (see the trip's Stops/Passengers screen).
const emptyFormData = {
  title: '', desc: '', category: '', sub_category: '', categorydesc: '',
  vehicle_id: '', driver_id: '',
  notes: '', actual_departure_time: '', actual_arrival_time: '',
  status: 'Scheduled',
  is_active: true, is_archived: false
};

export default function Transport() {
  const { authTokens } = useContext(AuthContext); // Grab the JWT tokens

  const [items, setItems] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [stopsManagerItem, setStopsManagerItem] = useState(null); 
  const [passengersManagerItem, setPassengersManagerItem] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [formData, setFormData] = useState(emptyFormData);

  // ─────────────────────────────────────────────
  // FILTER / VIEW / PAGINATION / SELECTION STATE
  // ─────────────────────────────────────────────
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [dateMode, setDateMode] = useState('any'); // any | day | month | year
  const [dateDay, setDateDay] = useState('');       // yyyy-mm-dd (used when dateMode === 'day')
  const [dateMonth, setDateMonth] = useState('');    // 1-12
  const [dateYear, setDateYear] = useState('');      // yyyy
  const [viewMode, setViewMode] = useState('list');  // list | grid
  const [currentPage, setCurrentPage] = useState(1);
  const [entriesPerPage, setEntriesPerPage] = useState(10);
  const [selectedIds, setSelectedIds] = useState([]);
  const [showArchived, setShowArchived] = useState(false);

  // ─────────────────────────────────────────────
  // AUTH HEADER HELPER
  // ─────────────────────────────────────────────
  const authHeader = () => ({
    headers: {
      Authorization: `Bearer ${authTokens?.access}`,
    },
  });

  // ─────────────────────────────────────────────
  // DRIVER DISPLAY HELPER
  // ─────────────────────────────────────────────
  const driverLabel = (driver) => {
    if (!driver) return '—';
    const fullName = `${driver.first_name || ''} ${driver.last_name || ''}`.trim();
    return fullName || driver.username || driver.email || `User #${driver.id}`;
  };

  // ─────────────────────────────────────────────
  // ROUTE / STOP HELPERS
  // stops come back nested and read-only on the Transportation payload
  // ─────────────────────────────────────────────
  const sortedStops = (item) =>
    Array.isArray(item?.stops) ? [...item.stops].sort((a, b) => a.sequence - b.sequence) : [];

  const originStop = (item) => sortedStops(item)[0] || null;
  const destinationStop = (item) => {
    const stops = sortedStops(item);
    return stops.length ? stops[stops.length - 1] : null;
  };

  const routeLabel = (item) => {
    const stops = sortedStops(item);
    if (stops.length === 0) return 'No stops set';
    if (stops.length === 1) return stops[0].location?.name || '—';
    const first = stops[0].location?.name || '—';
    const last = stops[stops.length - 1].location?.name || '—';
    const waypoints = stops.length - 2;
    return waypoints > 0 ? `${first} → (+${waypoints}) → ${last}` : `${first} → ${last}`;
  };

  // Best available "when does this trip start" timestamp, for date filtering/display —
  // prefers the actual departure once it happens, falls back to the origin stop's
  // expected departure/arrival.
  const tripTimestamp = (item) => {
    if (item.actual_departure_time) return item.actual_departure_time;
    const origin = originStop(item);
    return origin?.expected_departure || origin?.expected_arrival || null;
  };

  // ─────────────────────────────────────────────
  // READ — fetch transport records + lookup lists
  // ─────────────────────────────────────────────
  const fetchItems = async () => {
    try {
      setLoading(true);
      const res = await api.get('api/admin-transport/transportation/', authHeader());
      setItems(toArray(res.data));
      setError(null);
    } catch (err) {
      setError(err.response?.data?.detail || err.message);
      setItems([]); // don't leave stale/bad data around on error
    } finally {
      setLoading(false);
    }
  };

  const fetchLookups = async () => {
    try {
      const [vehicleRes, driverRes] = await Promise.all([
        api.get('api/admin-transport/vehicle/', authHeader()),
        api.get('api/admin-transport/driver/', authHeader()),
      ]);
      setVehicles(toArray(vehicleRes.data));
      setDrivers(toArray(driverRes.data));
    } catch (err) {
      console.error('Failed to load lookup lists (vehicles/drivers):', err);
      setVehicles([]);
      setDrivers([]);
    }
  };

  useEffect(() => {
    if (authTokens) {
      fetchItems();
      fetchLookups();
    }
  }, [authTokens]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const openModal = (item = null) => {
    if (item) {
      setEditingItem(item);
      setFormData({
        title: item.title || '',
        desc: item.desc || '',
        category: item.category || '',
        sub_category: item.sub_category || '',
        categorydesc: item.categorydesc || '',
        vehicle_id: item.vehicle?.id ?? '',
        driver_id: item.driver?.id ?? '',
        notes: item.notes || '',
        actual_departure_time: item.actual_departure_time ? item.actual_departure_time.substring(0, 16) : '',
        actual_arrival_time: item.actual_arrival_time ? item.actual_arrival_time.substring(0, 16) : '',
        status: item.status || 'Scheduled',
        is_active: item.is_active ?? true,
        is_archived: item.is_archived ?? false,
      });
    } else {
      setEditingItem(null);
      setFormData(emptyFormData);
    }
    setIsModalOpen(true);
  };

  // Vehicle currently selected in the form — used to preview owner/affiliate/capacity,
  // since those now live on Vehicle and are read-only on Transportation.
  const selectedVehicle = useMemo(
    () => vehicles.find((v) => String(v.id) === String(formData.vehicle_id)) || null,
    [vehicles, formData.vehicle_id]
  );

  // ─────────────────────────────────────────────
  // CREATE & UPDATE
  // ─────────────────────────────────────────────
  const handleSubmit = async (e) => {
    e.preventDefault();

    const departed = formData.actual_departure_time ? new Date(formData.actual_departure_time) : null;
    const arrived = formData.actual_arrival_time ? new Date(formData.actual_arrival_time) : null;

    if (departed && arrived && arrived < departed) {
      alert('Actual arrival time can\'t be before the actual departure time.');
      return;
    }

    const payload = {
      title: formData.title,
      desc: formData.desc,
      category: formData.category,
      sub_category: formData.sub_category,
      categorydesc: formData.categorydesc,
      notes: formData.notes,
      actual_departure_time: formData.actual_departure_time || null,
      actual_arrival_time: formData.actual_arrival_time || null,
      status: formData.status,
      is_active: formData.is_active,
      is_archived: formData.is_archived,
      vehicle_id: formData.vehicle_id || null,
      driver_id: formData.driver_id || null,
    };

    try {
      if (editingItem) {
        await api.put(`api/admin-transport/transportation/${editingItem.id}/`, payload, authHeader());
      } else {
        await api.post('api/admin-transport/transportation/', payload, authHeader());
      }
      setIsModalOpen(false);
      fetchItems();
    } catch (err) {
      alert(err.response?.data?.detail || 'Failed to save record. Check constraints.');
    }
  };

  // ─────────────────────────────────────────────
  // DEACTIVATE (soft delete)
  // ─────────────────────────────────────────────
  const handleDeactivate = async (item) => {
    if (!window.confirm('Deactivate this transport record? It will be hidden from active use but not deleted.')) return;
    try {
      await api.put(`api/admin-transport/transportation/${item.id}/`, {
        vehicle_id: item.vehicle?.id ?? null,
        driver_id: item.driver?.id ?? null,
        title: item.title,
        desc: item.desc,
        category: item.category,
        sub_category: item.sub_category,
        categorydesc: item.categorydesc,
        notes: item.notes,
        actual_departure_time: item.actual_departure_time || null,
        actual_arrival_time: item.actual_arrival_time || null,
        status: item.status,
        is_archived: item.is_archived,
        is_active: false,
      }, authHeader());
      fetchItems();
    } catch (err) {
      alert(err.response?.data?.detail || 'Failed to update record');
    }
  };

  // ─────────────────────────────────────────────
  // BULK ACTIONS
  // ─────────────────────────────────────────────
  const bulkUpdate = async (patch) => {
    if (selectedIds.length === 0) return;
    try {
      await Promise.all(
        selectedIds.map((id) => {
          const item = items.find((i) => i.id === id);
          if (!item) return Promise.resolve();
          return api.put(`api/admin-transport/transportation/${id}/`, {
            vehicle_id: item.vehicle?.id ?? null,
            driver_id: item.driver?.id ?? null,
            title: item.title,
            desc: item.desc,
            category: item.category,
            sub_category: item.sub_category,
            categorydesc: item.categorydesc,
            notes: item.notes,
            actual_departure_time: item.actual_departure_time || null,
            actual_arrival_time: item.actual_arrival_time || null,
            status: item.status,
            is_active: item.is_active,
            is_archived: item.is_archived,
            ...patch,
          }, authHeader());
        })
      );
      setSelectedIds([]);
      fetchItems();
    } catch (err) {
      alert('Failed to update the selected records.');
    }
  };

  // ─────────────────────────────────────────────
  // SELECTION HELPERS
  // ─────────────────────────────────────────────
  const toggleSelect = (id) => {
    setSelectedIds((prev) => prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]);
  };

  // ─────────────────────────────────────────────
  // FILTERING
  // ─────────────────────────────────────────────
  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      if (!showArchived && item.is_archived) return false;

      if (searchTerm.trim()) {
        const term = searchTerm.trim().toLowerCase();
        const haystack = [
          item.title,
          item.vehicle?.vehicle_name,
          item.vehicle?.plate_number,
          driverLabel(item.driver),
          item.category,
          item.sub_category,
          item.owner,
          item.affiliate,
          originStop(item)?.location?.name,
          destinationStop(item)?.location?.name,
        ].filter(Boolean).join(' ').toLowerCase();
        if (!haystack.includes(term)) return false;
      }

      if (statusFilter !== 'All' && item.status !== statusFilter) return false;

      if (dateMode !== 'any') {
        const ts = tripTimestamp(item);
        if (!ts) return false;
        const d = new Date(ts);
        if (isNaN(d.getTime())) return false;

        if (dateMode === 'day' && dateDay) {
          const isoDay = d.toISOString().slice(0, 10);
          if (isoDay !== dateDay) return false;
        }
        if (dateMode === 'month') {
          if (dateMonth && (d.getMonth() + 1) !== Number(dateMonth)) return false;
          if (dateYear && d.getFullYear() !== Number(dateYear)) return false;
          if (!dateMonth && !dateYear) return false;
        }
        if (dateMode === 'year' && dateYear) {
          if (d.getFullYear() !== Number(dateYear)) return false;
        }
      }

      return true;
    });
  }, [items, searchTerm, statusFilter, dateMode, dateDay, dateMonth, dateYear, showArchived]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, statusFilter, dateMode, dateDay, dateMonth, dateYear, entriesPerPage, showArchived]);

  const totalPages = Math.max(1, Math.ceil(filteredItems.length / entriesPerPage));
  const safePage = Math.min(currentPage, totalPages);
  const pageStart = (safePage - 1) * entriesPerPage;
  const pagedItems = filteredItems.slice(pageStart, pageStart + entriesPerPage);

  const pagedIds = pagedItems.map((i) => i.id);
  const allPagedSelected = pagedIds.length > 0 && pagedIds.every((id) => selectedIds.includes(id));

  const toggleSelectAll = () => {
    if (allPagedSelected) {
      setSelectedIds((prev) => prev.filter((id) => !pagedIds.includes(id)));
    } else {
      setSelectedIds((prev) => Array.from(new Set([...prev, ...pagedIds])));
    }
  };

  const hasActiveFilters = searchTerm.trim() !== '' || statusFilter !== 'All' || dateMode !== 'any';

  const clearFilters = () => {
    setSearchTerm('');
    setStatusFilter('All');
    setDateMode('any');
    setDateDay('');
    setDateMonth('');
    setDateYear('');
  };

  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  const statusBadgeClass = (status) =>
    status === 'Scheduled' ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' :
    status === 'Departed' ? 'bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' :
    status === 'Delayed' ? 'bg-orange-50 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400' :
    status === 'Cancelled' ? 'bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-400' :
    'bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-400';

  const formatTime = (value) => {
    if (!value) return '—';
    const d = new Date(value);
    if (isNaN(d.getTime())) return '—';
    return d.toLocaleString(undefined, {
      month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit'
    });
  };

  const TimeRangeBadges = ({ departure, arrival }) => (
    <div className="flex items-center gap-1.5 flex-wrap">
      <span className="text-xs px-2.5 py-1 font-semibold rounded-full bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
        {formatTime(departure)}
      </span>
      <span className="text-xs font-medium text-gray-400 dark:text-gray-500">to</span>
      <span className="text-xs px-2.5 py-1 font-semibold rounded-full bg-purple-50 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400">
        {formatTime(arrival)}
      </span>
    </div>
  );

  const SeatBadge = ({ item }) => {
    const max = item.max_capacity ?? item.vehicle?.capacity ?? null;
    if (max === null) return null;
    const occupied = item.occupied_seats ?? 0;
    return (
      <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-md font-medium bg-sky-50 text-sky-700 border border-sky-200 dark:bg-sky-950/30 dark:text-sky-400 dark:border-sky-800">
        <Users size={12} /> {occupied}/{max}
      </span>
    );
  };

  if (loading) return <div className="p-8 text-center text-gray-500 dark:text-gray-400">Loading schedules...</div>;
  if (error) return <div className="p-8 text-center text-red-500 dark:text-red-400">Error: {error}</div>;

  return (
    <div className="p-4 max-w-7xl mx-auto font-sans text-gray-800 dark:text-gray-100 transition-colors duration-200">

      {/* ROW 1 — HEADER */}
      <div className="flex justify-between items-center mb-4 bg-white dark:bg-gray-800 p-4 rounded-xl shadow border border-transparent dark:border-gray-700">
        <div className="flex items-center gap-2 p-3 bg-gray-50 dark:bg-gray-900 rounded-xl w-fit border border-gray-100 dark:border-gray-700">
          <Car size={18} style={{ color: 'var(--accent)' }} />
          <span className="text-sm font-black uppercase tracking-tight">Transportation Registry</span>
        </div>
        <button
          onClick={() => setShowArchived((v) => !v)}
          className={`flex items-center gap-1.5 text-sm font-medium py-2 px-4 rounded-lg transition-colors ${
            showArchived
              ? 'bg-gray-800 text-white dark:bg-gray-100 dark:text-gray-900'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600'
          }`}
        >
          {showArchived ? <EyeOff size={15} /> : <Eye size={15} />}
          {showArchived ? 'Hide Archived' : 'Show Archived'}
        </button>
      </div>

      {/* ROW 2 — BULK CONTROL BUTTONS */}
      <div className="flex flex-wrap items-center gap-3 mb-4 bg-white dark:bg-gray-800 p-4 rounded-xl shadow border border-transparent dark:border-gray-700">
        <button
          onClick={() => openModal()}
          className="text-white font-medium py-2 px-4 rounded-lg shadow-sm transition-all hover:opacity-90"
          style={{ backgroundColor: 'var(--accent)' }}
        >
          + Add Transport
        </button>

        <label className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 cursor-pointer select-none pl-2">
          <input
            type="checkbox"
            checked={allPagedSelected}
            onChange={toggleSelectAll}
            className="h-4 w-4 border-gray-300 rounded dark:bg-gray-900 dark:border-gray-600"
            style={{ '--tw-ring-color': 'var(--accent)', accentColor: 'var(--accent)' }}
          />
          Select all {pagedItems.length > 0 ? `(${pagedItems.length})` : ''}
        </label>

        {selectedIds.length > 0 && (
          <>
            <span className="text-xs font-medium text-gray-400 dark:text-gray-500">{selectedIds.length} selected</span>
            <button onClick={() => bulkUpdate({ is_active: true })} className="flex items-center gap-1.5 text-sm font-medium text-emerald-700 bg-emerald-50 hover:bg-emerald-100 dark:text-emerald-400 dark:bg-emerald-950/30 dark:hover:bg-emerald-950/60 py-2 px-3 rounded-lg transition-colors">
              <Power size={14} /> Activate
            </button>
            <button onClick={() => bulkUpdate({ is_active: false })} className="flex items-center gap-1.5 text-sm font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 dark:text-gray-400 dark:bg-gray-700 dark:hover:bg-gray-600 py-2 px-3 rounded-lg transition-colors">
              <PowerOff size={14} /> Deactivate
            </button>
            <button onClick={() => bulkUpdate({ is_archived: true })} className="flex items-center gap-1.5 text-sm font-medium text-amber-700 bg-amber-50 hover:bg-amber-100 dark:text-amber-400 dark:bg-amber-950/30 dark:hover:bg-amber-950/60 py-2 px-3 rounded-lg transition-colors">
              <Archive size={14} /> Archive
            </button>
            <button onClick={() => bulkUpdate({ is_archived: false })} className="flex items-center gap-1.5 text-sm font-medium text-indigo-700 bg-indigo-50 hover:bg-indigo-100 dark:text-indigo-400 dark:bg-indigo-950/30 dark:hover:bg-indigo-950/60 py-2 px-3 rounded-lg transition-colors">
              <ArchiveRestore size={14} /> Unarchive
            </button>
            <button onClick={() => setSelectedIds([])} className="flex items-center gap-1 text-xs font-medium text-gray-500 hover:text-red-600 dark:text-gray-400 dark:hover:text-red-400 py-2 px-2.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/20 transition-colors">
              <X size={14} /> Clear selection
            </button>
          </>
        )}
      </div>

      {/* ROW 3 — REGULAR FILTERS */}
      <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow mb-4 border border-transparent dark:border-gray-700">
        <div className="flex flex-wrap items-center gap-3">
          {/* Search Input */}
          <div className="relative flex-1 min-w-[200px]">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search title, vehicle, driver, plate, owner..."
              className="w-full border border-gray-200 dark:border-gray-700 rounded-lg pl-9 pr-3 py-2 text-sm focus:outline-none bg-transparent"
              style={{ '--tw-ring-color': 'var(--accent)' }}
            />
          </div>

          {/* Status Select */}
          <div className="flex items-center gap-1.5">
            <SlidersHorizontal size={14} className="text-gray-400 dark:text-gray-500" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="border border-gray-200 dark:border-gray-700 rounded-lg py-2 px-4 text-sm focus:outline-none bg-white dark:bg-gray-900"
            >
              <option value="All">All statuses</option>
              <option value="Scheduled">Scheduled</option>
              <option value="Departed">Departed</option>
              <option value="Delayed">Delayed</option>
              <option value="Cancelled">Cancelled</option>
              <option value="Completed">Completed</option>
            </select>
          </div>

          {/* Date Range Selector Option Type */}
          <div className="flex items-center gap-1.5">
            <Calendar size={14} className="text-gray-400 dark:text-gray-500" />
            <select
              value={dateMode}
              onChange={(e) => {
                setDateMode(e.target.value);
                setDateDay(''); setDateMonth(''); setDateYear('');
              }}
              className="border border-gray-200 dark:border-gray-700 rounded-lg py-2 px-2.5 text-sm focus:outline-none bg-white dark:bg-gray-900"
            >
              <option value="any">Any date</option>
              <option value="day">Specific day</option>
              <option value="month">Month / year</option>
              <option value="year">Year only</option>
            </select>
          </div>

          {/* Contextual Date Input Adjustments */}
          {dateMode === 'day' && (
            <input
              type="date"
              value={dateDay}
              onChange={(e) => setDateDay(e.target.value)}
              className="border border-gray-200 dark:border-gray-700 rounded-lg py-2 px-2.5 text-sm focus:outline-none bg-white dark:bg-gray-900"
            />
          )}
          {dateMode === 'month' && (
            <>
              <select
                value={dateMonth}
                onChange={(e) => setDateMonth(e.target.value)}
                className="border border-gray-200 dark:border-gray-700 rounded-lg py-2 px-2.5 text-sm focus:outline-none bg-white dark:bg-gray-900"
              >
                <option value="">Month</option>
                {monthNames.map((m, i) => (
                  <option key={m} value={i + 1}>{m}</option>
                ))}
              </select>
              <input
                type="number"
                placeholder="Year"
                value={dateYear}
                onChange={(e) => setDateYear(e.target.value)}
                className="w-24 border border-gray-200 dark:border-gray-700 rounded-lg py-2 px-2.5 text-sm focus:outline-none bg-white dark:bg-gray-900"
              />
            </>
          )}
          {dateMode === 'year' && (
            <input
              type="number"
              placeholder="Year"
              value={dateYear}
              onChange={(e) => setDateYear(e.target.value)}
              className="w-24 border border-gray-200 dark:border-gray-700 rounded-lg py-2 px-2.5 text-sm focus:outline-none bg-white dark:bg-gray-900"
            />
          )}

          {hasActiveFilters && (
            <button
              onClick={clearFilters}
              className="flex items-center gap-1 text-xs font-medium text-gray-500 hover:text-red-600 dark:text-gray-400 dark:hover:text-red-400 py-2 px-2.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/20 transition-colors"
            >
              <X size={14} /> Clear
            </button>
          )}

          <div className="flex-1" />

          {/* View list/grid config toggles */}
          <div className="flex items-center border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
            <button
              onClick={() => setViewMode('list')}
              className={`flex items-center gap-1.5 py-2 px-3 text-sm font-medium transition-colors ${
                viewMode === 'list'
                  ? 'text-white'
                  : 'bg-white text-gray-500 hover:bg-gray-50 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700'
              }`}
              style={viewMode === 'list' ? { backgroundColor: 'var(--accent)' } : {}}
            >
              <List size={15} /> List
            </button>
            <button
              onClick={() => setViewMode('grid')}
              className={`flex items-center gap-1.5 py-2 px-3 text-sm font-medium transition-colors border-l border-gray-200 dark:border-gray-700 ${
                viewMode === 'grid'
                  ? 'text-white'
                  : 'bg-white text-gray-500 hover:bg-gray-50 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700'
              }`}
              style={viewMode === 'grid' ? { backgroundColor: 'var(--accent)' } : {}}
            >
              <LayoutGrid size={15} /> Grid
            </button>
          </div>
        </div>
      </div>

      {/* RESULTS MAIN WRAPPER CONTAINER */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow mb-4 border border-transparent dark:border-gray-700">
        <div className="h-[600px] overflow-y-auto p-5 bg-gray-50 dark:bg-gray-900 rounded-t-xl">
          {pagedItems.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center text-gray-400 dark:text-gray-500">
              <Car size={32} className="mb-2 opacity-50" />
              <p className="text-sm font-medium">No transport records match your filters.</p>
              {hasActiveFilters && (
                <button onClick={clearFilters} className="mt-2 text-xs font-medium hover:opacity-80" style={{ color: 'var(--accent)' }}>
                  Clear filters
                </button>
              )}
            </div>
          ) : viewMode === 'grid' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {pagedItems.map((item) => (
                <div key={item.id} className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow hover:shadow-md transition-shadow p-5 flex flex-col justify-between">
                  <div>
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex items-center space-x-2 flex-wrap gap-y-1">
                        <input
                          type="checkbox"
                          checked={selectedIds.includes(item.id)}
                          onChange={() => toggleSelect(item.id)}
                          className="h-4 w-4 rounded dark:bg-gray-900 dark:border-gray-600 mr-1"
                          style={{ accentColor: 'var(--accent)' }}
                        />
                        <span className={`text-xs px-2.5 py-1 font-semibold rounded-full ${statusBadgeClass(item.status)}`}>{item.status}</span>
                        <SeatBadge item={item} />
                        {item.is_active && (
                          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-800">
                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                            Available
                          </span>
                        )}
                        {item.is_archived && (
                          <span className="text-xs px-2 py-0.5 font-medium bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400 rounded-md border border-gray-200 dark:border-gray-600">Archived</span>
                        )}
                      </div>
                      <span className="text-xs font-mono text-gray-400 dark:text-gray-500">{item.vehicle?.plate_number || '—'}</span>
                    </div>
                    <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-1">{item.vehicle?.vehicle_name || 'No vehicle assigned'}</h3>
                    <p className="text-xs font-medium uppercase tracking-wider mb-3" style={{ color: 'var(--accent)' }}>{item.category} • {item.sub_category || 'General'}</p>
                    <div className="text-sm space-y-2 text-gray-600 dark:text-gray-300 border-t border-gray-50 dark:border-gray-700 pt-3">
                      <p><strong>Driver:</strong> {driverLabel(item.driver)}</p>
                      <p><strong>Owner:</strong> {item.owner || '—'} {item.affiliate ? `(${item.affiliate})` : ''}</p>
                      <p><strong>Route:</strong> {routeLabel(item)}</p>
                      {item.notes && <p className="italic text-xs text-gray-500 dark:text-gray-400">"{item.notes}"</p>}
                      <div>
                        <strong className="block mb-1">Actual Departure / Arrival:</strong>
                        <TimeRangeBadges departure={item.actual_departure_time} arrival={item.actual_arrival_time} />
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center justify-end space-x-2 border-t border-gray-50 dark:border-gray-700 pt-4 mt-4">
                    <button onClick={() => openModal(item)} className="text-sm font-medium text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-200 px-3 py-1.5 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">Edit</button>
                       <button onClick={() => setStopsManagerItem(item)} className="text-sm font-medium text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-200 px-3 py-1.5 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">Route</button>
                       <button onClick={() => setPassengersManagerItem(item)} className="text-sm font-medium text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-200 px-3 py-1.5 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">Passengers</button>
                    <button onClick={() => handleDeactivate(item)} className="text-sm font-medium text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 px-3 py-1.5 rounded-md hover:bg-red-50 dark:hover:bg-red-950/20 transition-colors">Deactivate</button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-3">
              {pagedItems.map((item) => (
                <div key={item.id} className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4 flex flex-wrap md:flex-nowrap items-center gap-4 shadow hover:shadow-sm transition-shadow">
                  <input
                    type="checkbox"
                    checked={selectedIds.includes(item.id)}
                    onChange={() => toggleSelect(item.id)}
                    className="h-4 w-4 rounded dark:bg-gray-900 dark:border-gray-600 shrink-0"
                    style={{ accentColor: 'var(--accent)' }}
                  />
                  <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 shrink-0">
                    <Car size={18} />
                  </div>
                  <div className="min-w-[160px]">
                    <h3 className="text-sm font-bold text-gray-900 dark:text-gray-100">{item.vehicle?.vehicle_name || 'No vehicle'}</h3>
                    <p className="text-xs text-gray-400 dark:text-gray-500 font-mono">{item.vehicle?.plate_number || '—'}</p>
                  </div>
                  <div className="flex items-center gap-1.5 flex-wrap min-w-[160px]">
                    <span className={`text-xs px-2.5 py-1 font-semibold rounded-full ${statusBadgeClass(item.status)}`}>{item.status}</span>
                    <SeatBadge item={item} />
                    {item.is_active && (
                      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-800">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                        Available
                      </span>
                    )}
                    {item.is_archived && (
                      <span className="text-xs px-2 py-0.5 font-medium bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400 rounded-md border border-gray-200 dark:border-gray-600">Archived</span>
                    )}
                  </div>
                  <div className="text-xs min-w-[150px]">
                    <p className="font-medium uppercase tracking-wider" style={{ color: 'var(--accent)' }}>{item.category} • {item.sub_category || 'General'}</p>
                    <p className="text-gray-600 dark:text-gray-400 mt-0.5">Driver: {driverLabel(item.driver)}</p>
                    <p className="text-gray-400 dark:text-gray-500 mt-0.5">{item.owner || '—'}</p>
                  </div>
                  <div className="text-xs text-gray-600 dark:text-gray-300 flex-1 min-w-[160px]">
                    {routeLabel(item)}
                  </div>
                  <div className="min-w-[210px]">
                    <TimeRangeBadges departure={item.actual_departure_time} arrival={item.actual_arrival_time} />
                  </div>
                  <button onClick={() => setStopsManagerItem(item)} title="Manage Route Stops" className="text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200 p-1.5 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
    <MapPin size={18}/>
  </button>
                  <div className="flex items-center gap-2 ml-auto shrink-0">
                    <button onClick={() => openModal(item)} title="Edit" className="text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200 p-1.5 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                      <SquarePen size={18}/>
                    </button>
                   <button onClick={() => setPassengersManagerItem(item)} title="Manage Passengers" className="text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200 p-1.5 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
    <Users size={18}/>
  </button>
                    <button onClick={() => handleDeactivate(item)} title="Deactivate" className="text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 p-1.5 rounded-md hover:bg-red-50 dark:hover:bg-red-950/20 transition-colors">
                      <Trash2 size={18}/>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* PAGINATION FOOTER */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-gray-100 dark:border-gray-700 px-5 py-3">
          <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
            <span>
              {filteredItems.length === 0
                ? 'Showing 0 of 0'
                : `Showing ${pageStart + 1}–${Math.min(pageStart + entriesPerPage, filteredItems.length)} of ${filteredItems.length}`}
            </span>
            <select
              value={entriesPerPage}
              onChange={(e) => setEntriesPerPage(Number(e.target.value))}
              className="border border-gray-200 dark:border-gray-700 rounded-lg py-1 px-2 text-xs focus:outline-none bg-white dark:bg-gray-900"
            >
              {[5, 10, 25, 50].map((n) => (
                <option key={n} value={n}>{n} / page</option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={safePage === 1}
              className="p-1.5 rounded-md border border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeft size={15} />
            </button>
            <span className="text-xs text-gray-600 dark:text-gray-400 px-2">
              Page {safePage} of {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={safePage === totalPages}
              className="p-1.5 rounded-md border border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronRight size={15} />
            </button>
          </div>
        </div>
      </div>

      {/* MODAL CONFIGURATION */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 border border-transparent dark:border-gray-700 rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">
                {editingItem ? 'Modify Transport Log' : 'Register New Transport Record'}
              </h2>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold uppercase text-gray-500 dark:text-gray-400 mb-1">Title / Label</label>
                  <input type="text" name="title" value={formData.title} onChange={handleChange} required className="w-full border border-gray-200 dark:border-gray-700 rounded-lg p-2 text-sm focus:outline-none bg-transparent dark:bg-gray-900" style={{ '--tw-ring-color': 'var(--accent)' }} />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase text-gray-500 dark:text-gray-400 mb-1">Vehicle</label>
                  <select name="vehicle_id" value={formData.vehicle_id} onChange={handleChange} className="w-full border border-gray-200 dark:border-gray-700 rounded-lg p-2 text-sm focus:outline-none bg-white dark:bg-gray-900">
                    <option value="">— Select vehicle —</option>
                    {vehicles.map((v) => (
                      <option key={v.id} value={v.id}>{v.vehicle_name} ({v.plate_number})</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Owner / affiliate / capacity — read-only, sourced from the selected vehicle.
                  These are no longer stored on Transportation; pick a vehicle to see them. */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-gray-50 dark:bg-gray-900 border border-gray-100 dark:border-gray-700 rounded-lg p-3">
                <div>
                  <label className="block text-xs font-semibold uppercase text-gray-500 dark:text-gray-400 mb-1">Owner</label>
                  <p className="text-sm text-gray-700 dark:text-gray-300">{selectedVehicle?.owner || '—'}</p>
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase text-gray-500 dark:text-gray-400 mb-1">Affiliate</label>
                  <p className="text-sm text-gray-700 dark:text-gray-300">{selectedVehicle?.affiliate || '—'}</p>
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase text-gray-500 dark:text-gray-400 mb-1">Max Capacity</label>
                  <p className="text-sm text-gray-700 dark:text-gray-300">{selectedVehicle?.capacity ?? '—'}</p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold uppercase text-gray-500 dark:text-gray-400 mb-1">Category</label>
                  <input type="text" name="category" value={formData.category} onChange={handleChange} required className="w-full border border-gray-200 dark:border-gray-700 rounded-lg p-2 text-sm focus:outline-none bg-transparent dark:bg-gray-900" style={{ '--tw-ring-color': 'var(--accent)' }} />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase text-gray-500 dark:text-gray-400 mb-1">Sub Category</label>
                  <input type="text" name="sub_category" value={formData.sub_category || ''} onChange={handleChange} className="w-full border border-gray-200 dark:border-gray-700 rounded-lg p-2 text-sm focus:outline-none bg-transparent dark:bg-gray-900" style={{ '--tw-ring-color': 'var(--accent)' }} />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase text-gray-500 dark:text-gray-400 mb-1">Driver</label>
                  <select name="driver_id" value={formData.driver_id} onChange={handleChange} className="w-full border border-gray-200 dark:border-gray-700 rounded-lg p-2 text-sm focus:outline-none bg-white dark:bg-gray-900">
                    <option value="">— Unassigned —</option>
                    {drivers.map((d) => (
                      <option key={d.id} value={d.id}>{driverLabel(d)}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase text-gray-500 dark:text-gray-400 mb-1">Notes</label>
                <textarea name="notes" value={formData.notes} onChange={handleChange} rows={2} placeholder="e.g. cause of delay, other remarks..." className="w-full border border-gray-200 dark:border-gray-700 rounded-lg p-2 text-sm focus:outline-none bg-transparent dark:bg-gray-900" style={{ '--tw-ring-color': 'var(--accent)' }} />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold uppercase text-gray-500 dark:text-gray-400 mb-1">Actual Departure</label>
                  <input type="datetime-local" name="actual_departure_time" value={formData.actual_departure_time} onChange={handleChange} className="w-full border border-gray-200 dark:border-gray-700 rounded-lg p-2 text-sm focus:outline-none bg-transparent dark:bg-gray-900" style={{ '--tw-ring-color': 'var(--accent)' }} />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase text-gray-500 dark:text-gray-400 mb-1">Actual Arrival</label>
                  <input type="datetime-local" name="actual_arrival_time" value={formData.actual_arrival_time} onChange={handleChange} className="w-full border border-gray-200 dark:border-gray-700 rounded-lg p-2 text-sm focus:outline-none bg-transparent dark:bg-gray-900" style={{ '--tw-ring-color': 'var(--accent)' }} />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase text-gray-500 dark:text-gray-400 mb-1">Status</label>
                  <select name="status" value={formData.status} onChange={handleChange} className="w-full border border-gray-200 dark:border-gray-700 rounded-lg p-2 text-sm focus:outline-none bg-white dark:bg-gray-900">
                    <option value="Scheduled">Scheduled</option>
                    <option value="Departed">Departed</option>
                    <option value="Delayed">Delayed</option>
                    <option value="Cancelled">Cancelled</option>
                    <option value="Completed">Completed</option>
                  </select>
                </div>
              </div>

              {/* Route stops are ordered and managed on their own screen — the route can have
                  any number of stops, so they don't fit a fixed pickup/dropoff pair here. */}
              {editingItem && (
                <div>
                  <label className="block text-xs font-semibold uppercase text-gray-500 dark:text-gray-400 mb-1">Route</label>
                  <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-3 bg-gray-50 dark:bg-gray-900">
                    {sortedStops(editingItem).length === 0 ? (
                      <p className="text-sm text-gray-500 dark:text-gray-400">No stops added yet. Manage stops from the trip's Stops screen.</p>
                    ) : (
                      <ol className="text-sm text-gray-700 dark:text-gray-300 space-y-1">
                        {sortedStops(editingItem).map((stop) => (
                          <li key={stop.id}>
                            <span className="font-mono text-xs text-gray-400 dark:text-gray-500 mr-2">#{stop.sequence}</span>
                            {stop.location?.name || 'Unknown location'}
                          </li>
                        ))}
                      </ol>
                    )}
                  </div>
                </div>
              )}

              <div className="flex items-center gap-6 pt-2">
                <label className="flex items-center gap-2 text-sm font-medium cursor-pointer select-none">
                  <input type="checkbox" name="is_active" checked={formData.is_active} onChange={handleChange} className="h-4 w-4 rounded" style={{ accentColor: 'var(--accent)' }} />
                  Active Registry Record
                </label>
                <label className="flex items-center gap-2 text-sm font-medium cursor-pointer select-none">
                  <input type="checkbox" name="is_archived" checked={formData.is_archived} onChange={handleChange} className="h-4 w-4 rounded" style={{ accentColor: 'var(--accent)' }} />
                  Archived / Hidden
                </label>
              </div>

              <div className="flex justify-end gap-2 border-t dark:border-gray-700 pt-4 mt-6">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg">Cancel</button>
                <button type="submit" className="px-4 py-2 text-sm font-medium text-white rounded-lg hover:opacity-90" style={{ backgroundColor: 'var(--accent)' }}>Save Changes</button>
              </div>
            </form>
          </div>
          
        </div>
      )}
      <TransportationStopManager
  transportation={stopsManagerItem}
  isOpen={!!stopsManagerItem}
  onClose={() => setStopsManagerItem(null)}
  onStopsChanged={fetchItems}
/>

   <TransportPassengerManager
        transportation={passengersManagerItem}
        isOpen={!!passengersManagerItem}
        onClose={() => setPassengersManagerItem(null)}
        onPassengersChanged={fetchItems}
      />
  <VehicleManager/>
  <LocationManager/>
    </div>
  );
}