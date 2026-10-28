import React, { useContext, useState, useMemo } from 'react';
import {
  Calendar, Users, MapPin, Search, Filter, Trash2, Archive, ArchiveRestore, Power,
  Plus, Edit3, UserCheck, Clock, X, Save, AlertCircle,
  CheckSquare, Square, ChevronDown, ChevronUp, Eye, EyeOff, FileText, Upload, Settings2,
  Flag, LayoutGrid, List as ListIcon, BarChart3
} from 'lucide-react';
import AccentBadge from '../components/AccentBadge';
import { motion, AnimatePresence } from 'framer-motion';
import { AdminDataContext } from '../contexts/AdminDataContext';
import { format, isWithinInterval, isPast, isFuture, addDays, parseISO } from 'date-fns';

import StationManager from '../components/events/EventSation';
import Stations from '../components/events/Stations';

// Central status token map so every status pill shares one palette in light + dark
const STATUS_STYLES = {
  Live: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400',
  Upcoming: 'bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-400',
  Ended: 'bg-slate-100 text-slate-600 dark:bg-slate-700/60 dark:text-slate-400',
  Scheduled: 'bg-violet-100 text-violet-700 dark:bg-violet-500/15 dark:text-violet-400',
};

const MONTHS = [
  { value: '1', label: 'January' }, { value: '2', label: 'February' }, { value: '3', label: 'March' },
  { value: '4', label: 'April' }, { value: '5', label: 'May' }, { value: '6', label: 'June' },
  { value: '7', label: 'July' }, { value: '8', label: 'August' }, { value: '9', label: 'September' },
  { value: '10', label: 'October' }, { value: '11', label: 'November' }, { value: '12', label: 'December' },
];

const TIME_BLOCKS = [
  { value: 'morning', label: 'Morning (before 12pm)' },
  { value: 'afternoon', label: 'Afternoon (12–5pm)' },
  { value: 'evening', label: 'Evening (after 5pm)' },
];

const getTimeBlock = (date) => {
  const h = date.getHours();
  if (h < 12) return 'morning';
  if (h < 17) return 'afternoon';
  return 'evening';
};

const getStationName = (es) => es?.station?.name || es?.name || es?.station_name || 'Unnamed Station';

const Events = () => {
  const { adminData, deleteItem, updateItem, createItem, loading } = useContext(AdminDataContext);

  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState({ year: "", month: "", day: "", time: "", guide: "", station: "" });
  const [showArchived, setShowArchived] = useState(false);
  const [showArchivedPackages, setShowArchivedPackages] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [viewMode, setViewMode] = useState('list'); // 'grid' | 'list'
  const [selectedIds, setSelectedIds] = useState([]);
  const [editingEvent, setEditingEvent] = useState(null);
  const [showAllStations, setShowAllStations] = useState(false);

  const STATION_BADGE_LIMIT = 6;

  const years = useMemo(() => {
    const currentYear = new Date().getFullYear();
    return Array.from({ length: 5 }, (_, i) => (currentYear - 2 + i).toString());
  }, []);

  const days = useMemo(() => Array.from({ length: 31 }, (_, i) => (i + 1).toString()), []);

  const stationOptions = useMemo(() => {
    const names = new Set();
    (adminData?.events || []).forEach(ev => (ev.event_stations || []).forEach(es => names.add(getStationName(es))));
    return Array.from(names).sort();
  }, [adminData?.events]);

  const getEventStatus = (start, end) => {
    const now = new Date();
    const startDate = parseISO(start);
    const endDate = parseISO(end || start);
    if (isWithinInterval(now, { start: startDate, end: endDate })) return { label: 'Live', color: STATUS_STYLES.Live };
    if (isFuture(startDate) && isWithinInterval(startDate, { start: now, end: addDays(now, 7) })) return { label: 'Upcoming', color: STATUS_STYLES.Upcoming };
    if (isPast(endDate)) return { label: 'Ended', color: STATUS_STYLES.Ended };
    return { label: 'Scheduled', color: STATUS_STYLES.Scheduled };
  };

  const filteredEvents = useMemo(() => {
    return (adminData?.events || []).filter(event => {
      if (!showArchived && event.is_archived) return false;
      const startDate = parseISO(event.start_date);
      const matchesSearch = event.package_name?.toLowerCase().includes(search.toLowerCase());
      const matchesYear = !filters.year || startDate.getFullYear().toString() === filters.year;
      const matchesMonth = !filters.month || (startDate.getMonth() + 1).toString() === filters.month;
      const matchesDay = !filters.day || startDate.getDate().toString() === filters.day;
      const matchesTime = !filters.time || getTimeBlock(startDate) === filters.time;
      const matchesGuide = !filters.guide || event.assigned_guide?.toString() === filters.guide;
      const matchesStation = !filters.station || (event.event_stations || []).some(es => getStationName(es) === filters.station);
      return matchesSearch && matchesYear && matchesMonth && matchesDay && matchesTime && matchesGuide && matchesStation;
    });
  }, [adminData?.events, search, filters, showArchived]);

  // Stats row: status breakdown + events per station, derived from whatever is currently filtered
  const statusCounts = useMemo(() => {
    const counts = {};
    filteredEvents.forEach(ev => {
      const label = getEventStatus(ev.start_date, ev.end_date).label;
      counts[label] = (counts[label] || 0) + 1;
    });
    return counts;
  }, [filteredEvents]);

  const stationCounts = useMemo(() => {
    const counts = {};
    filteredEvents.forEach(ev => {
      (ev.event_stations || []).forEach(es => {
        const name = getStationName(es);
        counts[name] = (counts[name] || 0) + 1;
      });
    });
    return Object.entries(counts).sort((a, b) => b[1] - a[1]);
  }, [filteredEvents]);

  const clearFilters = () => setFilters({ year: "", month: "", day: "", time: "", guide: "", station: "" });

  const toggleSelect = (id) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const handleToggleArchive = async (event) => {
    try {
      await updateItem('events', event.id, { is_archived: !event.is_archived });
    } catch (error) {
      console.error("Failed to update archive state:", error);
    }
  };

  const handleBulkArchive = async (archive = true) => {
    try {
      await Promise.all(selectedIds.map(id => updateItem('events', id, { is_archived: archive })));
      setSelectedIds([]);
    } catch (error) {
      console.error("Failed bulk archive:", error);
    }
  };

  const handleBulkDelete = async () => {
    try {
      await Promise.all(selectedIds.map(id => deleteItem('events', id)));
      setSelectedIds([]);
    } catch (error) {
      console.error("Failed bulk delete:", error);
    }
  };

  const handleSaveEvent = async () => {
    const formData = new FormData();
    formData.append('package', editingEvent.package);
    formData.append('slot_limit', editingEvent.slot_limit);
    formData.append('start_date', editingEvent.start_date);
    formData.append('is_active', editingEvent.is_active);

    if (editingEvent.assigned_guide) formData.append('assigned_guide', editingEvent.assigned_guide);
    if (editingEvent.itinerary_file instanceof File) formData.append('itinerary_file', editingEvent.itinerary_file);

    try {
      if (editingEvent.id) {
        await updateItem('events', editingEvent.id, formData);
      } else {
        await createItem('events', formData);
      }
      setEditingEvent(null);
    } catch (error) {
      console.error("Failed to save event:", error);
    }
  };

  if (loading) return <div className="p-8 text-center animate-pulse text-gray-600 dark:text-gray-300">Loading Event Console...</div>;

  const visiblePackages = (adminData?.packages || []).filter(p => showArchivedPackages || !p.is_archived || p.id === editingEvent?.package);

  return (
    <div className="p-4 md:p-8 space-y-6 max-w-7xl mx-auto pb-32 relative bg-gray-50 dark:bg-gray-900 min-h-screen transition-colors">

      {/* Header row */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-slate-800 rounded-xl shadow p-4 border border-transparent dark:border-slate-700">
        <AccentBadge icon={Calendar}>Event Management</AccentBadge>
        <div className="flex items-center gap-3">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {filteredEvents.length} events found
          </p>
          <div className="flex items-center bg-gray-100 dark:bg-slate-700 rounded-xl p-1">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-1.5 rounded-lg transition-colors ${viewMode === 'grid' ? 'bg-white dark:bg-slate-600 text-[var(--accent,#4f46e5)] shadow-sm' : 'text-gray-400 dark:text-gray-400'}`}
              title="Grid view"
            >
              <LayoutGrid size={16} />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-1.5 rounded-lg transition-colors ${viewMode === 'list' ? 'bg-white dark:bg-slate-600 text-[var(--accent,#4f46e5)] shadow-sm' : 'text-gray-400 dark:text-gray-400'}`}
              title="List view"
            >
              <ListIcon size={16} />
            </button>
          </div>
          <motion.button
            whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
            onClick={() => setEditingEvent({ assigned_guide: "", package: "", slot_limit: 20, is_active: true })}
            className="bg-[var(--accent,#4f46e5)] hover:bg-[color-mix(in_srgb,var(--accent,#4f46e5)_85%,black)] text-white px-5 py-2.5 rounded-xl flex items-center gap-2 shadow-lg shadow-[color-mix(in_srgb,var(--accent,#4f46e5)_25%,transparent)] dark:shadow-none"
          >
            <Plus size={18} /> Create Event
          </motion.button>
        </div>
      </div>

      {/* Stats row */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-700 p-4 flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2 pr-4 mr-2 border-r border-gray-100 dark:border-slate-700">
          <BarChart3 size={16} className="text-[var(--accent,#4f46e5)]" />
          <span className="text-xs font-black uppercase text-gray-400 dark:text-gray-500">Stats</span>
        </div>

        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold bg-[color-mix(in_srgb,var(--accent,#4f46e5)_12%,white)] text-[color-mix(in_srgb,var(--accent,#4f46e5)_70%,black)] dark:bg-[color-mix(in_srgb,var(--accent,#4f46e5)_30%,black)] dark:text-[color-mix(in_srgb,var(--accent,#4f46e5)_55%,white)]">
          <Calendar size={12} /> {filteredEvents.length} Found
        </span>

        {Object.entries(statusCounts).map(([label, count]) => (
          <span key={label} className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold ${STATUS_STYLES[label] || STATUS_STYLES.Ended}`}>
            {label}: {count}
          </span>
        ))}

        {stationCounts.length > 0 && (
          <div className="flex items-center gap-2 ml-2 pl-4 border-l border-gray-100 dark:border-slate-700 flex-wrap">
            <span className="text-[10px] font-black uppercase text-gray-400 dark:text-gray-500 flex items-center gap-1">
              <Flag size={12} /> Per station
            </span>
            {(showAllStations ? stationCounts : stationCounts.slice(0, STATION_BADGE_LIMIT)).map(([name, count]) => (
              <span key={name} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold bg-[color-mix(in_srgb,#f59e0b_12%,white)] text-amber-700 dark:bg-[color-mix(in_srgb,#f59e0b_22%,black)] dark:text-amber-400">
                {name}: {count}
              </span>
            ))}
            {stationCounts.length > STATION_BADGE_LIMIT && (
              <button
                onClick={() => setShowAllStations(s => !s)}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-bold text-[var(--accent,#4f46e5)] bg-[color-mix(in_srgb,var(--accent,#4f46e5)_10%,white)] dark:bg-[color-mix(in_srgb,var(--accent,#4f46e5)_22%,black)] hover:bg-[color-mix(in_srgb,var(--accent,#4f46e5)_18%,white)]"
              >
                {showAllStations ? (
                  <>Show less <ChevronUp size={12} /></>
                ) : (
                  <>+{stationCounts.length - STATION_BADGE_LIMIT} more <ChevronDown size={12} /></>
                )}
              </button>
            )}
          </div>
        )}
      </div>

      {/* Filter Bar */}
      <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-700 flex flex-col gap-4">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-3 text-gray-400" size={18} />
            <input
              className="w-full pl-10 pr-4 py-2.5 bg-gray-50 dark:bg-slate-700 dark:text-gray-100 border-none rounded-xl focus:ring-2 focus:ring-[var(--accent,#4f46e5)] outline-none placeholder:text-gray-400"
              placeholder="Search packages..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="flex gap-2 items-center flex-wrap">
            <button
              onClick={() => setShowArchived(s => !s)}
              className={`p-2.5 rounded-xl transition-colors ${showArchived ? 'bg-[color-mix(in_srgb,#f43f5e_12%,white)] text-rose-600 dark:bg-[color-mix(in_srgb,#f43f5e_25%,black)] dark:text-rose-400' : 'text-gray-400 hover:text-[var(--accent,#4f46e5)] dark:text-gray-500'}`}
              title={showArchived ? "Hide archived events" : "Show archived events"}
            >
              {showArchived ? <Eye size={20} /> : <EyeOff size={20} />}
            </button>
            <button
              onClick={() => setShowFilters(s => !s)}
              className="p-2.5 rounded-xl text-gray-400 hover:text-[var(--accent,#4f46e5)] dark:text-gray-500 flex items-center gap-1"
              title="Advanced filters"
            >
              <Settings2 size={20} />
              {showFilters ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </button>
            <button onClick={clearFilters} className="p-2.5 text-gray-400 hover:text-[var(--accent,#4f46e5)] dark:text-gray-500">
              <Filter size={20} />
            </button>
          </div>
        </div>

        <AnimatePresence>
          {showFilters && (
            <motion.div
              initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2 pt-2 border-t border-gray-100 dark:border-slate-700">
                <select
                  className="bg-gray-50 dark:bg-slate-700 dark:text-gray-100 rounded-xl px-3 py-2 text-sm outline-none"
                  value={filters.year}
                  onChange={(e) => setFilters({ ...filters, year: e.target.value })}
                >
                  <option value="">Year</option>
                  {years.map(y => <option key={y} value={y}>{y}</option>)}
                </select>
                <select
                  className="bg-gray-50 dark:bg-slate-700 dark:text-gray-100 rounded-xl px-3 py-2 text-sm outline-none"
                  value={filters.month}
                  onChange={(e) => setFilters({ ...filters, month: e.target.value })}
                >
                  <option value="">Month</option>
                  {MONTHS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
                </select>
                <select
                  className="bg-gray-50 dark:bg-slate-700 dark:text-gray-100 rounded-xl px-3 py-2 text-sm outline-none"
                  value={filters.day}
                  onChange={(e) => setFilters({ ...filters, day: e.target.value })}
                >
                  <option value="">Day</option>
                  {days.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
                <select
                  className="bg-gray-50 dark:bg-slate-700 dark:text-gray-100 rounded-xl px-3 py-2 text-sm outline-none"
                  value={filters.time}
                  onChange={(e) => setFilters({ ...filters, time: e.target.value })}
                >
                  <option value="">Time</option>
                  {TIME_BLOCKS.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
                <select
                  className="bg-gray-50 dark:bg-slate-700 dark:text-gray-100 rounded-xl px-3 py-2 text-sm outline-none"
                  value={filters.guide}
                  onChange={(e) => setFilters({ ...filters, guide: e.target.value })}
                >
                  <option value="">Guide</option>
                  {(adminData?.users || []).filter(u => u.role === 'tour_guide').map(u => (
                    <option key={u.id} value={u.id}>{u.username}</option>
                  ))}
                </select>
                <select
                  className="bg-gray-50 dark:bg-slate-700 dark:text-gray-100 rounded-xl px-3 py-2 text-sm outline-none"
                  value={filters.station}
                  onChange={(e) => setFilters({ ...filters, station: e.target.value })}
                >
                  <option value="">Station</option>
                  {stationOptions.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Bulk action bar */}
      <AnimatePresence>
        {selectedIds.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
            className="flex items-center justify-between bg-[color-mix(in_srgb,var(--accent,#4f46e5)_8%,white)] dark:bg-[color-mix(in_srgb,var(--accent,#4f46e5)_20%,black)] border border-[color-mix(in_srgb,var(--accent,#4f46e5)_20%,white)] dark:border-[color-mix(in_srgb,var(--accent,#4f46e5)_35%,black)] rounded-2xl px-4 py-3"
          >
            <span className="text-sm font-bold text-[color-mix(in_srgb,var(--accent,#4f46e5)_70%,black)] dark:text-[color-mix(in_srgb,var(--accent,#4f46e5)_55%,white)]">{selectedIds.length} selected</span>
            <div className="flex gap-2">
              <button onClick={() => handleBulkArchive(true)} className="flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-lg bg-white dark:bg-slate-800 text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-slate-700">
                <Archive size={14} /> Archive
              </button>
              <button onClick={() => handleBulkArchive(false)} className="flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-lg bg-white dark:bg-slate-800 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-slate-700">
                <ArchiveRestore size={14} /> Restore
              </button>
              <button onClick={handleBulkDelete} className="flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-lg bg-white dark:bg-slate-800 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-slate-700">
                <Trash2 size={14} /> Delete
              </button>
              <button onClick={() => setSelectedIds([])} className="flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
                <X size={14} /> Clear
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Grid view */}
      {viewMode === 'grid' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <AnimatePresence mode='popLayout'>
            {filteredEvents.map(event => {
              const status = getEventStatus(event.start_date, event.end_date);
              const guide = adminData?.users.find(u => u.id === event.assigned_guide);
              const isSelected = selectedIds.includes(event.id);
              const stationCount = event.event_stations?.length || 0;

              return (
                <motion.div
                  layout key={event.id}
                  className={`relative bg-white dark:bg-slate-800 rounded-3xl shadow-sm border p-6 transition-colors ${isSelected ? 'ring-2 ring-[var(--accent,#4f46e5)] border-transparent' : 'border-gray-100 dark:border-slate-700'} ${event.is_archived ? 'opacity-60' : ''}`}
                >
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex gap-2 flex-wrap">
                      <button onClick={() => toggleSelect(event.id)} className="text-gray-300 dark:text-gray-500 hover:text-[var(--accent,#4f46e5)] mt-0.5">
                        {isSelected ? <CheckSquare size={16} /> : <Square size={16} />}
                      </button>
                      <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase ${status.color}`}>
                        {status.label}
                      </span>
                      <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase bg-[color-mix(in_srgb,#f59e0b_12%,white)] text-amber-700 dark:bg-[color-mix(in_srgb,#f59e0b_22%,black)] dark:text-amber-400 flex items-center gap-1">
                        <Flag size={10} /> {stationCount} Stations
                      </span>
                      {event.is_archived && (
                        <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase bg-rose-100 text-rose-600 dark:bg-rose-500/15 dark:text-rose-400">
                          Archived
                        </span>
                      )}
                    </div>
                    <div className="flex gap-1">
                      <button onClick={() => setEditingEvent(event)} className="p-2 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-xl text-gray-500 dark:text-gray-400"><Edit3 size={16} /></button>
                      <button onClick={() => handleToggleArchive(event)} className="p-2 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-xl text-gray-500 dark:text-gray-400" title={event.is_archived ? "Restore" : "Archive"}>
                        {event.is_archived ? <ArchiveRestore size={16} /> : <Archive size={16} />}
                      </button>
                    </div>
                  </div>
                  <h3 className="text-lg font-bold text-gray-800 dark:text-gray-100">{event.package_name}</h3>
                  <div className="text-xs text-gray-400 dark:text-gray-500 mt-1 flex items-center gap-1">
                    <Clock size={14} /> {format(parseISO(event.start_date), 'PPPp')}
                  </div>
                  {event.itinerary_file && (
                    <div className="text-[10px] text-gray-400 dark:text-gray-500 mt-1 flex items-center gap-1">
                      <FileText size={12} /> Itinerary attached
                    </div>
                  )}
                  <div className="mt-4 pt-4 border-t border-gray-100 dark:border-slate-700 flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-[color-mix(in_srgb,var(--accent,#4f46e5)_15%,white)] dark:bg-[color-mix(in_srgb,var(--accent,#4f46e5)_30%,black)] flex items-center justify-center text-[10px] font-bold text-[color-mix(in_srgb,var(--accent,#4f46e5)_75%,black)] dark:text-[color-mix(in_srgb,var(--accent,#4f46e5)_55%,white)]">
                        {guide?.username?.charAt(0) || '?'}
                      </div>
                      <span className="text-xs font-medium text-gray-600 dark:text-gray-300 flex items-center gap-1">
                        {guide?.username || "No Guide"} {guide && <UserCheck size={12} className="text-emerald-500" />}
                      </span>
                    </div>
                    <button onClick={() => updateItem('events', event.id, { is_active: !event.is_active })} className="text-gray-400">
                      <Power size={16} className={event.is_active ? "text-emerald-500" : ""} />
                    </button>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}

      {/* List view */}
      {viewMode === 'list' && (
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-700 divide-y divide-gray-100 dark:divide-slate-700 overflow-hidden">
          <AnimatePresence mode='popLayout'>
            {filteredEvents.map(event => {
              const status = getEventStatus(event.start_date, event.end_date);
              const guide = adminData?.users.find(u => u.id === event.assigned_guide);
              const isSelected = selectedIds.includes(event.id);
              const stationCount = event.event_stations?.length || 0;

              return (
                <motion.div
                  layout key={event.id}
                  className={`flex flex-col md:flex-row md:items-center gap-3 md:gap-6 p-4 transition-colors ${isSelected ? 'bg-[color-mix(in_srgb,var(--accent,#4f46e5)_6%,white)] dark:bg-[color-mix(in_srgb,var(--accent,#4f46e5)_15%,black)]' : 'hover:bg-gray-50 dark:hover:bg-slate-700/40'} ${event.is_archived ? 'opacity-60' : ''}`}
                >
                  <button onClick={() => toggleSelect(event.id)} className="text-gray-300 dark:text-gray-500 hover:text-[var(--accent,#4f46e5)] shrink-0">
                    {isSelected ? <CheckSquare size={16} /> : <Square size={16} />}
                  </button>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-bold text-gray-800 dark:text-gray-100 truncate">{event.package_name}</h3>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${status.color}`}>{status.label}</span>
                      {event.is_archived && <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-rose-100 text-rose-600 dark:bg-rose-500/15 dark:text-rose-400">Archived</span>}
                    </div>
                    <div className="text-xs text-gray-400 dark:text-gray-500 mt-1 flex items-center gap-3 flex-wrap">
                      <span className="flex items-center gap-1"><Clock size={12} /> {format(parseISO(event.start_date), 'PPPp')}</span>
                      <span className="flex items-center gap-1"><Flag size={12} /> {stationCount} Stations</span>
                      <span className="flex items-center gap-1"><Users size={12} /> {guide?.username || "No Guide"}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0 self-end md:self-auto">
                    <button onClick={() => updateItem('events', event.id, { is_active: !event.is_active })} className="text-gray-400 p-2">
                      <Power size={16} className={event.is_active ? "text-emerald-500" : ""} />
                    </button>
                    <button onClick={() => setEditingEvent(event)} className="p-2 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-xl text-gray-500 dark:text-gray-400"><Edit3 size={16} /></button>
                    <button onClick={() => handleToggleArchive(event)} className="p-2 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-xl text-gray-500 dark:text-gray-400" title={event.is_archived ? "Restore" : "Archive"}>
                      {event.is_archived ? <ArchiveRestore size={16} /> : <Archive size={16} />}
                    </button>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}

      {filteredEvents.length === 0 && (
        <div className="text-center py-16 text-gray-400 dark:text-gray-500">
          <Calendar size={32} className="mx-auto mb-3 opacity-50" />
          <p className="text-sm font-medium">No events match these filters.</p>
        </div>
      )}

      {/* Edit Modal */}
      <AnimatePresence>
        {editingEvent && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center p-4 z-[100]"
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }}
              className="bg-white dark:bg-slate-800 rounded-[32px] w-full max-w-lg overflow-hidden shadow-2xl"
            >
              <div className="p-8 max-h-[85vh] overflow-y-auto">
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-2xl font-black text-gray-800 dark:text-gray-100">{editingEvent.id ? 'Update Event' : 'New Schedule'}</h2>
                  <button onClick={() => setEditingEvent(null)} className="p-2 bg-gray-100 dark:bg-slate-700 rounded-full text-gray-600 dark:text-gray-300"><X size={20} /></button>
                </div>

                <div className="space-y-6">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <div className="flex items-center justify-between ml-1 mb-1">
                        <label className="text-[10px] font-black uppercase text-gray-400 dark:text-gray-500">Package</label>
                        <button
                          type="button"
                          onClick={() => setShowArchivedPackages(s => !s)}
                          className="text-[10px] font-bold text-[var(--accent,#4f46e5)] flex items-center gap-1"
                        >
                          {showArchivedPackages ? <Eye size={10} /> : <EyeOff size={10} />} Archived
                        </button>
                      </div>
                      <select
                        value={editingEvent.package || ""}
                        className="w-full p-4 bg-gray-50 dark:bg-slate-700 dark:text-gray-100 rounded-2xl border-none outline-none font-bold"
                        onChange={(e) => setEditingEvent({ ...editingEvent, package: e.target.value })}
                      >
                        <option value="">Select Package</option>
                        {visiblePackages.map(p => (
                          <option key={p.id} value={p.id}>{p.name}{p.is_archived ? ' (Archived)' : ''}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="text-[10px] font-black uppercase text-gray-400 dark:text-gray-500 ml-1">Max Slots</label>
                      <input
                        type="number"
                        className="w-full p-4 bg-gray-50 dark:bg-slate-700 dark:text-gray-100 rounded-2xl border-none outline-none font-bold"
                        value={editingEvent.slot_limit || 20}
                        onChange={(e) => setEditingEvent({ ...editingEvent, slot_limit: e.target.value })}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-[10px] font-black uppercase text-gray-400 dark:text-gray-500 ml-1">Itinerary File</label>
                    <label className="mt-2 flex flex-col items-center justify-center w-full h-24 border-2 border-dashed border-gray-200 dark:border-slate-600 rounded-2xl cursor-pointer bg-gray-50 dark:bg-slate-700">
                      <Upload className="w-6 h-6 text-gray-400 mb-1" />
                      <p className="text-[10px] text-gray-500 dark:text-gray-400 font-bold">{editingEvent.itinerary_file?.name || "Upload PDF/Doc"}</p>
                      <input type="file" className="hidden" onChange={(e) => setEditingEvent({ ...editingEvent, itinerary_file: e.target.files[0] })} />
                    </label>
                  </div>

                  <div>
                    <label className="text-[10px] font-black uppercase text-gray-400 dark:text-gray-500 ml-1">Assigned Guide</label>
                    <select
                      value={editingEvent.assigned_guide || ""}
                      className="w-full p-4 bg-gray-50 dark:bg-slate-700 dark:text-gray-100 rounded-2xl border-none outline-none font-bold"
                      onChange={(e) => setEditingEvent({ ...editingEvent, assigned_guide: e.target.value })}
                    >
                      <option value="">Unassigned</option>
                      {adminData.users
                        .filter(u => u.role === 'tour_guide')
                        .map(u => (
                          <option
                            key={u.id}
                            value={u.id}
                            disabled={u.status?.toLowerCase() === 'busy' && u.id !== editingEvent.assigned_guide}
                          >
                            {u.username} {u.status?.toLowerCase() === 'busy' ? '(Busy)' : ''}
                          </option>
                        ))
                      }
                    </select>
                  </div>

                  {editingEvent.id && (
                    <div className="flex items-center justify-between p-3 rounded-2xl bg-gray-50 dark:bg-slate-700">
                      <span className="text-[10px] font-black uppercase text-gray-400 dark:text-gray-500">Archived</span>
                      <button
                        type="button"
                        onClick={() => setEditingEvent({ ...editingEvent, is_archived: !editingEvent.is_archived })}
                        className={`flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-lg ${editingEvent.is_archived ? 'bg-rose-100 text-rose-600 dark:bg-rose-500/15 dark:text-rose-400' : 'bg-white dark:bg-slate-800 text-gray-500 dark:text-gray-400'}`}
                      >
                        {editingEvent.is_archived ? <ArchiveRestore size={14} /> : <Archive size={14} />}
                        {editingEvent.is_archived ? 'Restore on save' : 'Archive on save'}
                      </button>
                    </div>
                  )}

                  <div className="pt-4 border-t border-gray-100 dark:border-slate-700">
                    <label className="text-[10px] font-black uppercase text-gray-400 dark:text-gray-500 ml-1 mb-2 block">Route & Stations</label>
                    {editingEvent.id ? (
                      <StationManager eventId={editingEvent.id} />
                    ) : (
                      <div className="p-4 bg-amber-50 dark:bg-amber-500/10 rounded-2xl border border-amber-100 dark:border-amber-500/20 flex items-center gap-3">
                        <AlertCircle className="text-amber-500" size={18} />
                        <p className="text-[10px] text-amber-700 dark:text-amber-400 font-bold">
                          Please save the event basic details first to begin managing the route stations.
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                <button
                  onClick={handleSaveEvent}
                  className="w-full py-4 bg-[var(--accent,#4f46e5)] hover:bg-[color-mix(in_srgb,var(--accent,#4f46e5)_85%,black)] text-white rounded-2xl font-bold mt-8 shadow-lg shadow-[color-mix(in_srgb,var(--accent,#4f46e5)_25%,transparent)] dark:shadow-none flex items-center justify-center gap-2"
                >
                  <Save size={18} /> Save Event Details
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
        <Stations />
      </AnimatePresence>
    </div>
  );
};

export default Events;