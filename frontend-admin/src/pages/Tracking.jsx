import React, { useMemo, useState, useContext, useEffect } from "react";
import { AdminDataContext } from "../contexts/AdminDataContext";
import { MapContainer, TileLayer, Marker, Popup, Polyline, Tooltip, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import {
  PersonStanding, Users, Search, Navigation,
  MapPin, X, ChevronLeft, ChevronRight, ArrowLeft, TrendingUp, Zap, Clock, Mars, Venus, User
} from "lucide-react";

// --- MAP CONTROL ---
const MapController = ({ targetCoords }) => {
  const map = useMap();
  useEffect(() => {
    if (targetCoords) {
      map.flyTo(targetCoords, 18, { animate: true, duration: 1.5 });
    }
  }, [targetCoords, map]);
  return null;
};

// --- MARKER ICONS ---
const createGhostIcon = (color) => L.divIcon({
  className: "ghost-marker",
  html: `<div style="background-color: ${color}; width: 12px; height: 12px; border-radius: 50%; border: 2px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3);"></div>`,
  iconSize: [12, 12], iconAnchor: [6, 6]
});

// Leaflet marker icons are raw HTML strings (they render outside React), so
// we can't drop a <Mars />/<Venus /> component in directly. This inlines a
// small lucide-style (stroke-based, rounded) SVG glyph for each symbol
// instead of the old unicode ♂ / ♀ characters.
const MARS_GLYPH = `<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M16 3h5v5"/><path d="M21 3l-6.5 6.5"/><circle cx="10" cy="14" r="6"/></svg>`;
const VENUS_GLYPH = `<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="6"/><path d="M12 14v7"/><path d="M9 18h6"/></svg>`;

const createGuestIcon = (guest, isSearching, isSelected) => {
  const age = parseInt(guest.age) || 0;
  const gender = (guest.gender || "").toLowerCase();
  const isFemale = gender === "female" || gender === "f";
  let bgColor = age < 18 ? "#22c55e" : age >= 60 ? "#a855f7" : "#3b82f6";
  let borderRadius = isFemale ? "2px 50% 50% 50%" : "50% 50% 50% 0";
  let glyph = isFemale ? VENUS_GLYPH : MARS_GLYPH;
  // Selection (actively viewing this event) gets the theme accent ring;
  // a plain search match still gets the red "found you" ring.
  const ring = isSelected ? "4px solid var(--accent)" : isSearching ? "4px solid #ff4444" : "2px solid white";
  const scale = isSelected ? 1.5 : isSearching ? 1.4 : 1;

  return L.divIcon({
    className: "custom-guest-marker",
    html: `<div style="background-color: ${bgColor}; width: 32px; height: 32px; border-radius: ${borderRadius}; transform: rotate(-45deg) scale(${scale}); display: flex; align-items: center; justify-content: center; border: ${ring}; box-shadow: 0 4px 10px rgba(0,0,0,0.3);">
        <span style="transform: rotate(45deg); display:flex;">${glyph}</span>
      </div>`,
    iconSize: [32, 32], iconAnchor: [16, 32], popupAnchor: [0, -32]
  });
};

// Stable identity for the same physical tourist across bookings/events.
//
// Guest is the canonical person record (unique per owner+name+id_number).
// BookingGuest just joins a Guest to one specific Booking, and a Booking
// belongs to at most one TourEvent — so the same person attending two
// different events will have TWO different booking_guest rows, but the
// SAME underlying Guest.id. `booking_guest` is therefore an event-scoped
// key, not a person-scoped one.
//
// We group people by `guest_id` (expected to be the flattened Guest.id from
// the serializer). If a payload is ever missing it, we fall back to
// booking_guest — that still renders correctly, it just won't merge that
// person's other events into the same card until guest_id is present.
const getPersonKey = (gc) => {
  const gid = gc.guest_id ?? gc.guest?.id;
  if (gid !== undefined && gid !== null) return `P-${gid}`;
  return `P-bg-${gc.booking_guest ?? gc.id}`;
};

const Tracking = () => {
  const { adminData, loading } = useContext(AdminDataContext);

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedStation, setSelectedStation] = useState("all");
  const [roleFilter, setRoleFilter] = useState("all");
  const [mapTarget, setMapTarget] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [dateFilter, setDateFilter] = useState({ year: "", month: "", day: "" });
  const [activeEventFilter, setActiveEventFilter] = useState("all");

  // Two-level drill-down: pick a person, then pick which of their events to
  // view. Replaces the old single expandedGuestId, which had no way to
  // separate a tourist's history by event.
  const [selectedGuestId, setSelectedGuestId] = useState(null);
  const [selectedEventId, setSelectedEventId] = useState(null);

  const { groupedHistory, allCheckEvents, stationsList } = useMemo(() => {
    if (!adminData.event_station_guest_checks) return { groupedHistory: [], allCheckEvents: [], stationsList: [] };
    const personMap = {};
    const events = [];
    const stations = new Set();

    adminData.event_station_guest_checks.forEach((gc) => {
      if (!gc.checked || !gc.checked_latitude) return;
      if (gc.station_name) stations.add(gc.station_name);

      const eventDate = new Date(gc.checked_at);
      const eventObj = {
        ...gc,
        lat: parseFloat(gc.checked_latitude),
        lng: parseFloat(gc.checked_longitude),
        time: eventDate,
        role: gc.checked_by_role || "station_staff",
        checked_by: gc.checked_by_name || gc.checked_by || "System",
        year: eventDate.getFullYear().toString(),
        month: (eventDate.getMonth() + 1).toString(),
        day: eventDate.getDate().toString()
      };
      events.push(eventObj);

      const personKey = getPersonKey(gc);
      if (!personMap[personKey]) {
        personMap[personKey] = {
          id: personKey,
          name: gc.full_name || `Guest ${gc.guest_id ?? gc.booking_guest}`,
          age: gc.age,
          gender: gc.gender,
          isLocal: gc.is_local,
          eventsMap: {}
        };
      }
      const person = personMap[personKey];
      const eventKey = eventObj.event_id ?? "unknown";
      if (!person.eventsMap[eventKey]) {
        person.eventsMap[eventKey] = { eventId: eventObj.event_id ?? null, history: [] };
      }
      person.eventsMap[eventKey].history.push(eventObj);
    });

    const groupedHistory = Object.values(personMap).map((p) => ({
      ...p,
      events: Object.values(p.eventsMap)
        .map((ev) => ({ ...ev, history: ev.history.sort((a, b) => a.time - b.time) }))
        .sort((a, b) => b.history[b.history.length - 1].time - a.history[a.history.length - 1].time)
    }));

    return {
      groupedHistory,
      allCheckEvents: events.sort((a, b) => b.time - a.time),
      stationsList: Array.from(stations)
    };
  }, [adminData]);

  const eventLookup = useMemo(() => {
    const map = {};
    (adminData.events || []).forEach((ev) => { map[ev.id] = ev; });
    return map;
  }, [adminData.events]);

  const matchesFilters = (e) => {
    const matchSearch = e.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) || e.checked_by?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchStation = selectedStation === "all" || e.station_name === selectedStation;
    const matchRole = roleFilter === "all" || e.role === roleFilter;
    const matchEvent = activeEventFilter === "all" || e.event_id?.toString() === activeEventFilter;
    const matchYear = !dateFilter.year || e.year === dateFilter.year;
    const matchMonth = !dateFilter.month || e.month === dateFilter.month;
    const matchDay = !dateFilter.day || e.day === dateFilter.day;
    return matchSearch && matchStation && matchRole && matchEvent && matchYear && matchMonth && matchDay;
  };

  const filteredEvents = useMemo(() => {
    return allCheckEvents.filter(matchesFilters);
  }, [allCheckEvents, searchQuery, selectedStation, roleFilter, activeEventFilter, dateFilter]);

  // Person -> events -> history, each level filtered down. A person survives
  // if at least one of their events still has matching check-ins; an event
  // survives if it still has matching check-ins. History stays chronological
  // (oldest -> newest) for the timeline view; events and people are sorted
  // by most recent matching activity first.
  const filteredGuestList = useMemo(() => {
    return groupedHistory
      .map((person) => {
        const events = person.events
          .map((ev) => ({ ...ev, history: ev.history.filter(matchesFilters) }))
          .filter((ev) => ev.history.length > 0)
          .sort((a, b) => b.history[b.history.length - 1].time - a.history[a.history.length - 1].time);
        return { ...person, events };
      })
      .filter((person) => person.events.length > 0)
      .sort((a, b) => b.events[0].history[b.events[0].history.length - 1].time - a.events[0].history[a.events[0].history.length - 1].time);
  }, [groupedHistory, searchQuery, selectedStation, roleFilter, activeEventFilter, dateFilter]);

  // Flat person+event "visits" for the map — each event is drawn as its own
  // trail, so two different events for the same tourist never connect.
  const allVisits = useMemo(() => {
    return groupedHistory.flatMap((person) =>
      person.events.map((ev) => ({
        personId: person.id,
        eventId: ev.eventId,
        name: person.name,
        age: person.age,
        gender: person.gender,
        history: ev.history
      }))
    );
  }, [groupedHistory]);

  const stats = useMemo(() => {
    if (filteredEvents.length === 0) return null;
    const uniquePeople = [...new Set(filteredEvents.map(getPersonKey))];
    const totalAge = filteredEvents.reduce((acc, curr) => acc + (parseInt(curr.age) || 0), 0);
    const stationCounts = filteredEvents.reduce((acc, curr) => {
      acc[curr.station_name] = (acc[curr.station_name] || 0) + 1;
      return acc;
    }, {});
    const sortedStations = Object.entries(stationCounts).sort((a, b) => b[1] - a[1]);
    const topStation = sortedStations[0];
    const males = filteredEvents.filter(e => (e.gender || "").toLowerCase().startsWith('m')).length;
    const females = filteredEvents.filter(e => (e.gender || "").toLowerCase().startsWith('f')).length;
    const unspecified = filteredEvents.length - males - females;
    const locals = filteredEvents.filter(e => e.is_local).length;

    return {
      avgAge: (totalAge / filteredEvents.length).toFixed(1),
      males, females, unspecified,
      topStation: topStation ? topStation[0] : "N/A",
      activityRate: (filteredEvents.length / uniquePeople.length).toFixed(1),
      localPercent: ((locals / filteredEvents.length) * 100).toFixed(0),
      totalChecks: filteredEvents.length
    };
  }, [filteredEvents]);

  // Drop a selection the moment it no longer matches the active filters,
  // so the feed can't get stuck showing an event/person that's been
  // filtered out from under it.
  useEffect(() => {
    if (!selectedGuestId) return;
    const person = filteredGuestList.find(p => p.id === selectedGuestId);
    if (!person) {
      setSelectedGuestId(null);
      setSelectedEventId(null);
      return;
    }
    if (selectedEventId && !person.events.some(e => e.eventId === selectedEventId)) {
      setSelectedEventId(null);
    }
  }, [filteredGuestList]);

  const paginatedGuests = filteredGuestList.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  const totalPages = Math.ceil(filteredGuestList.length / pageSize);

  const selectedPerson = selectedGuestId ? filteredGuestList.find(p => p.id === selectedGuestId) : null;
  const selectedEvent = selectedPerson && selectedEventId ? selectedPerson.events.find(e => e.eventId === selectedEventId) : null;

  const openPerson = (person) => {
    setSelectedGuestId(person.id);
    setSelectedEventId(null);
    const latest = person.events[0]?.history[person.events[0].history.length - 1];
    if (latest) { setMapTarget([latest.lat, latest.lng]); window.scrollTo({ top: 0, behavior: "smooth" }); }
  };

  const openEvent = (ev) => {
    setSelectedEventId(ev.eventId);
    const latest = ev.history[ev.history.length - 1];
    if (latest) { setMapTarget([latest.lat, latest.lng]); window.scrollTo({ top: 0, behavior: "smooth" }); }
  };

  if (loading) return <div className="h-screen flex items-center justify-center font-black text-slate-400 dark:bg-slate-950 animate-pulse">SYNCING DATA...</div>;

  return (
    <div className="flex flex-col min-h-screen bg-slate-50 dark:bg-gray-900 p-4 md:p-6 overflow-x-hidden">
      <header className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 mb-6 bg-white dark:bg-slate-900 border border-transparent dark:border-slate-800 rounded shadow p-4 rounded-xl">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 p-3 bg-[var(--accent)]/10 text-[var(--accent)] rounded-xl w-fit border border-[var(--accent)]/20">
            <Navigation size={18} />
            <span className="text-sm font-black uppercase tracking-tight">Tourist Tracking</span>
          </div>
          <div>
            <div className="flex gap-2 mt-2">
              <FilterButton active={roleFilter === "all"} onClick={() => setRoleFilter("all")} label="All" />
              <FilterButton active={roleFilter === "station_staff"} onClick={() => setRoleFilter("station_staff")} label="Staff Only" />
            </div>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 w-full lg:w-auto">
          <select
            className="flex-1 lg:flex-none bg-white dark:bg-slate-800 dark:text-slate-100 px-4 py-2 rounded-xl shadow-sm font-bold text-xs border-none focus:ring-2 focus:ring-[var(--accent)]"
            value={selectedStation}
            onChange={(e) => { setSelectedStation(e.target.value); setCurrentPage(1); }}
          >
            <option value="all">All Stations</option>
            {stationsList.map(s => <option key={s} value={s}>{s}</option>)}
          </select>

          <select
            className="flex-1 lg:flex-none bg-white dark:bg-slate-800 dark:text-slate-100 px-4 py-2 rounded-xl shadow-sm font-bold text-xs border-none focus:ring-2 focus:ring-[var(--accent)]"
            value={activeEventFilter}
            onChange={(e) => { setActiveEventFilter(e.target.value); setCurrentPage(1); }}
          >
            <option value="all">All Events</option>
            {adminData.events?.map(ev => <option key={ev.id} value={ev.id}>{ev.package_name}</option>)}
          </select>

          <div className="relative flex-1 lg:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input type="text" placeholder="Search..." className="w-full pl-10 pr-4 py-2 bg-white dark:bg-slate-800 dark:text-slate-100 rounded-xl shadow-sm outline-none focus:ring-2 focus:ring-[var(--accent)] font-bold text-sm" value={searchQuery} onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }} />
          </div>

          <div className="flex gap-1">
            <input type="text" inputMode="numeric" placeholder="YYYY" maxLength={4} className="w-16 px-2 py-2 bg-white dark:bg-slate-800 dark:text-slate-100 rounded-xl shadow-sm outline-none focus:ring-2 focus:ring-[var(--accent)] font-bold text-xs text-center" value={dateFilter.year} onChange={(e) => { setDateFilter({ ...dateFilter, year: e.target.value.replace(/\D/g, "") }); setCurrentPage(1); }} />
            <input type="text" inputMode="numeric" placeholder="MM" maxLength={2} className="w-12 px-2 py-2 bg-white dark:bg-slate-800 dark:text-slate-100 rounded-xl shadow-sm outline-none focus:ring-2 focus:ring-[var(--accent)] font-bold text-xs text-center" value={dateFilter.month} onChange={(e) => { setDateFilter({ ...dateFilter, month: e.target.value.replace(/\D/g, "") }); setCurrentPage(1); }} />
            <input type="text" inputMode="numeric" placeholder="DD" maxLength={2} className="w-12 px-2 py-2 bg-white dark:bg-slate-800 dark:text-slate-100 rounded-xl shadow-sm outline-none focus:ring-2 focus:ring-[var(--accent)] font-bold text-xs text-center" value={dateFilter.day} onChange={(e) => { setDateFilter({ ...dateFilter, day: e.target.value.replace(/\D/g, "") }); setCurrentPage(1); }} />
            {(dateFilter.year || dateFilter.month || dateFilter.day) && (
              <button onClick={() => { setDateFilter({ year: "", month: "", day: "" }); setCurrentPage(1); }} className="px-2 bg-white dark:bg-slate-800 rounded-xl shadow-sm text-slate-400 hover:text-slate-900 dark:hover:text-slate-100" title="Clear date filter">
                <X size={14} />
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Stats Strip — moved above the map/feed so the headline numbers are
          the first thing seen, not a footnote after scrolling. */}
      {stats && (
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 bg-white dark:bg-slate-900 rounded-3xl p-6 shadow-xl border-2 border-slate-100 dark:border-slate-800 mb-6">
          <StatBox icon={<PersonStanding className="text-blue-500" />} label="Avg Age" value={`${stats.avgAge}y`} sub={`${stats.totalChecks} total checks`} />
          <GenderStatBox male={stats.males} female={stats.females} unspecified={stats.unspecified} />
          <StatBox icon={<TrendingUp className="text-emerald-500" />} label={selectedStation === "all" ? "Top Hotspot" : "Station Activity"} value={selectedStation === "all" ? stats.topStation : `${stats.totalChecks} Checks`} sub="Activity Volume" />
          <StatBox icon={<Zap className="text-orange-500" />} label="Engagement" value={`${stats.activityRate} pts`} sub="Avg checks/guest" />
          <StatBox icon={<Users className="text-[var(--accent)]" />} label="Local Density" value={`${stats.localPercent}%`} sub="Based on filters" />
        </div>
      )}

      {/* Main Grid: Responsive column-to-row layout */}
      <div className="flex flex-col lg:flex-row flex-1 gap-6 min-h-0 mb-6">

        {/* Map Container */}
        <div className="w-full lg:flex-[3] h-[400px] lg:h-auto bg-white dark:bg-slate-900 rounded-[2rem] shadow-2xl overflow-hidden relative border-4 border-white dark:border-slate-800 z-10">
          <MapContainer center={[14.5995, 120.9842]} zoom={13} className="h-full w-full">
            <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
            <MapController targetCoords={mapTarget} />
            {allVisits.map((visit) => {
              const latest = visit.history[visit.history.length - 1];
              const isSearching = searchQuery.length > 1 && visit.name.toLowerCase().includes(searchQuery.toLowerCase());
              const isSelected = selectedGuestId === visit.personId && selectedEventId === visit.eventId;
              const isDimmed = selectedGuestId && !isSelected;
              const ageColor = parseInt(visit.age) < 18 ? "#22c55e" : parseInt(visit.age) >= 60 ? "#a855f7" : "#3b82f6";
              const pathColor = isSelected ? "var(--accent)" : isSearching ? "#ff4444" : "#cbd5e1";
              const eventLabel = eventLookup[visit.eventId]?.package_name || (visit.eventId ? `Event #${visit.eventId}` : "Unknown Event");

              return (
                <React.Fragment key={`${visit.personId}-${visit.eventId}`}>
                  <Polyline
                    positions={visit.history.map(h => [h.lat, h.lng])}
                    pathOptions={{ color: pathColor, weight: isSelected ? 4 : 2, dashArray: isSelected ? null : "5, 5", opacity: isDimmed ? 0.2 : 1 }}
                  />
                  {visit.history.slice(0, -1).map((point, idx) => (
                    <Marker key={idx} position={[point.lat, point.lng]} icon={createGhostIcon(ageColor)} opacity={isDimmed ? 0.25 : 1}>
                      <Popup><div className="p-1 font-bold text-[10px]">{visit.name}<br /><span className="text-slate-400 flex items-center gap-1"><MapPin size={10} /> {point.station_name}</span></div></Popup>
                    </Marker>
                  ))}
                  <Marker
                    position={[latest.lat, latest.lng]}
                    icon={createGuestIcon(visit, isSearching, isSelected)}
                    opacity={isDimmed ? 0.35 : 1}
                    eventHandlers={{ click: () => { setSelectedGuestId(visit.personId); setSelectedEventId(visit.eventId); } }}
                  >
                    <Tooltip direction="top">{visit.name} · {eventLabel}</Tooltip>
                    <Popup>
                      <div className="p-2">
                        <p className="font-black text-sm">{visit.name}</p>
                        <p className="text-xs text-slate-500">Last seen: {latest.station_name}</p>
                        <p className="text-[10px] mt-1">Total Checks: {visit.history.length}</p>
                        <p className="text-[10px] text-purple-600 font-bold">{eventLabel}</p>
                      </div>
                    </Popup>
                  </Marker>
                </React.Fragment>
              );
            })}
          </MapContainer>
        </div>

        {/* Feed: person -> events -> timeline */}
        <div className="w-full lg:flex-1 bg-slate-900 rounded-[2rem] p-6 text-white shadow-2xl flex flex-col lg:min-w-[380px] max-h-[600px] lg:max-h-none">
          <div className="flex justify-between items-center mb-4 border-b border-white/10 pb-4">
            {!selectedGuestId && (
              <>
                <h2 className="font-black text-sm uppercase tracking-widest flex items-center gap-2"><Clock size={18} className="text-[var(--accent)]" /> Guests ({filteredGuestList.length})</h2>
                <select className="bg-white/10 text-[10px] px-2 py-1 rounded font-bold" value={pageSize} onChange={(e) => { setPageSize(Number(e.target.value)); setCurrentPage(1); }}>
                  <option value={5}>5</option><option value={10}>10</option><option value={20}>20</option>
                </select>
              </>
            )}
            {selectedGuestId && !selectedEventId && selectedPerson && (
              <button onClick={() => setSelectedGuestId(null)} className="flex items-center gap-2 font-black text-sm uppercase tracking-widest">
                <ArrowLeft size={16} /> {selectedPerson.name}'s Events ({selectedPerson.events.length})
              </button>
            )}
            {selectedGuestId && selectedEventId && selectedPerson && selectedEvent && (
              <button onClick={() => setSelectedEventId(null)} className="flex items-center gap-2 font-black text-xs uppercase tracking-widest truncate">
                <ArrowLeft size={16} className="shrink-0" />
                <span className="truncate">{eventLookup[selectedEventId]?.package_name || `Event #${selectedEventId}`}</span>
              </button>
            )}
          </div>

          <div className="flex-1 overflow-y-auto space-y-3 pr-1 custom-scrollbar">
            {/* Level 1: people */}
            {!selectedGuestId && paginatedGuests.map((person) => {
              const topEvent = person.events[0];
              const latest = topEvent.history[topEvent.history.length - 1];
              const totalStops = person.events.reduce((s, ev) => s + ev.history.length, 0);
              return (
                <button key={person.id} onClick={() => openPerson(person)} className="w-full text-left p-4 bg-white/5 rounded-2xl border border-transparent hover:border-[var(--accent)]/50 transition-all flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-black text-[var(--accent)] text-sm truncate">{person.name}</p>
                      <span className="text-[9px] font-mono bg-white/10 px-2 py-0.5 rounded text-slate-300 shrink-0">{person.events.length} event{person.events.length !== 1 ? "s" : ""} · {totalStops} stop{totalStops !== 1 ? "s" : ""}</span>
                    </div>
                    <div className="mt-1 text-[10px] font-bold text-purple-300 flex items-center gap-1 truncate">
                      <Navigation size={11} className="text-purple-400 shrink-0" /> {eventLookup[topEvent.eventId]?.package_name || (topEvent.eventId ? `Event #${topEvent.eventId}` : "Unknown Event")}
                    </div>
                    <div className="mt-1 text-[11px] font-bold text-slate-300 flex items-center gap-2">
                      <MapPin size={12} className="text-emerald-400 shrink-0" /> Last seen: {latest.station_name}
                    </div>
                    <div className="mt-1 text-[9px] font-black uppercase text-slate-500">{latest.time.toLocaleDateString()} · {latest.time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                  </div>
                  <ChevronRight size={16} className="shrink-0 text-slate-400" />
                </button>
              );
            })}
            {!selectedGuestId && paginatedGuests.length === 0 && (
              <p className="text-xs font-bold text-slate-500 text-center py-8">No guests match these filters.</p>
            )}

            {/* Level 2: this person's events */}
            {selectedGuestId && !selectedEventId && selectedPerson && selectedPerson.events.map((ev) => {
              const latest = ev.history[ev.history.length - 1];
              const info = eventLookup[ev.eventId];
              return (
                <button key={ev.eventId ?? 'unknown'} onClick={() => openEvent(ev)} className="w-full text-left p-4 bg-white/5 rounded-2xl border border-transparent hover:border-[var(--accent)]/50 transition-all flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-black text-[var(--accent)] text-sm truncate">{info?.package_name || (ev.eventId ? `Event #${ev.eventId}` : "Unknown Event")}</p>
                    {info?.start_date && (
                      <p className="text-[10px] font-bold text-slate-400">{info.start_date} → {info.end_date}</p>
                    )}
                    <div className="mt-1 text-[11px] font-bold text-slate-300 flex items-center gap-2">
                      <MapPin size={12} className="text-emerald-400 shrink-0" /> Last seen: {latest.station_name}
                    </div>
                    <span className="mt-1 inline-block text-[9px] font-mono bg-white/10 px-2 py-0.5 rounded text-slate-300">{ev.history.length} stop{ev.history.length !== 1 ? "s" : ""}</span>
                  </div>
                  <ChevronRight size={16} className="shrink-0 text-slate-400" />
                </button>
              );
            })}

            {/* Level 3: timeline for the selected event only */}
            {selectedGuestId && selectedEventId && selectedEvent && selectedEvent.history.map((point, idx) => (
              <button
                key={idx}
                onClick={() => { setMapTarget([point.lat, point.lng]); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                className="w-full text-left flex items-center gap-3 py-2 px-3 rounded-xl hover:bg-white/10 transition-all group bg-white/5"
              >
                <div className="flex flex-col items-center shrink-0">
                  <div className={`w-2.5 h-2.5 rounded-full ${idx === selectedEvent.history.length - 1 ? "bg-[var(--accent)]" : "bg-slate-500"} group-hover:bg-[var(--accent)]`} />
                  {idx < selectedEvent.history.length - 1 && <div className="w-px flex-1 bg-white/10 mt-1" style={{ minHeight: "16px" }} />}
                </div>
                <div className="flex-1 min-w-0 pb-1">
                  <div className="flex justify-between items-center gap-2">
                    <span className="text-[11px] font-bold text-slate-200 truncate">{point.station_name}</span>
                    <span className="text-[9px] font-mono text-slate-400 shrink-0">{point.time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                  <div className="text-[9px] opacity-60 font-black uppercase text-[var(--accent)] flex items-center gap-1"><User size={10} /> {point.checked_by}</div>
                </div>
              </button>
            ))}
          </div>

          {!selectedGuestId && (
            <div className="flex justify-between items-center mt-4 pt-4 border-t border-white/10">
              <button disabled={currentPage === 1} onClick={() => setCurrentPage(p => p - 1)} className="p-2 bg-white/10 rounded-lg disabled:opacity-30"><ChevronLeft size={16} /></button>
              <span className="text-[10px] font-black uppercase tracking-widest">Page {currentPage} of {totalPages || 1}</span>
              <button disabled={currentPage >= totalPages} onClick={() => setCurrentPage(p => p + 1)} className="p-2 bg-white/10 rounded-lg disabled:opacity-30"><ChevronRight size={16} /></button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const StatBox = ({ icon, label, value, sub }) => (
  <div className="flex items-center gap-4 p-2">
    <div className="p-3 bg-slate-50 dark:bg-white/5 rounded-2xl">{icon}</div>
    <div className="min-w-0">
      <p className="text-[10px] font-black uppercase text-slate-400 dark:text-slate-500 tracking-widest">{label}</p>
      <p className="text-base md:text-lg font-black text-slate-900 dark:text-slate-50 leading-none my-1 truncate">{value}</p>
      <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400 italic truncate">{sub}</p>
    </div>
  </div>
);

const GenderStatBox = ({ male, female, unspecified }) => (
  <div className="flex items-center gap-4 p-2">
    <div className="p-3 bg-slate-50 dark:bg-white/5 rounded-2xl flex items-center gap-1">
      <Mars size={18} className="text-blue-500" />
      <Venus size={18} className="text-pink-500" />
    </div>
    <div className="min-w-0">
      <p className="text-[10px] font-black uppercase text-slate-400 dark:text-slate-500 tracking-widest">Gender Split</p>
      <p className="text-base md:text-lg font-black text-slate-900 dark:text-slate-50 leading-none my-1">{male}M / {female}F</p>
      <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400 italic">{unspecified > 0 ? `${unspecified} unspecified` : "All specified"}</p>
    </div>
  </div>
);

const FilterButton = ({ active, onClick, label }) => (
  <button onClick={onClick} className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${active ? 'bg-[var(--accent)] text-white shadow-md' : 'bg-slate-200 dark:bg-white/10 text-slate-500 dark:text-slate-400 hover:bg-slate-300 dark:hover:bg-white/20'}`}>
    {label}
  </button>
);

export default Tracking;