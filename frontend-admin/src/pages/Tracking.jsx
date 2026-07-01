import React, { useMemo, useState, useContext, useEffect } from "react";
import { AdminDataContext } from "../contexts/AdminDataContext";
import { MapContainer, TileLayer, Marker, Popup, Polyline, Tooltip, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { 
  PersonStanding, Users, Search, Navigation, 
  MapPin, X, ChevronLeft, ChevronRight, TrendingUp, Zap, Clock
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

const createGuestIcon = (guest, isHighlighted) => {
  const age = parseInt(guest.age) || 0;
  const gender = (guest.gender || "").toLowerCase();
  let bgColor = age < 18 ? "#22c55e" : age >= 60 ? "#a855f7" : "#3b82f6";
  let borderRadius = (gender === "female" || gender === "f") ? "2px 50% 50% 50%" : "50% 50% 50% 0"; 
  let symbol = (gender === "female" || gender === "f") ? "♀" : "♂";

  return L.divIcon({
    className: "custom-guest-marker",
    html: `<div style="background-color: ${bgColor}; width: 32px; height: 32px; border-radius: ${borderRadius}; transform: rotate(-45deg) ${isHighlighted ? 'scale(1.4)' : 'scale(1)'}; display: flex; align-items: center; justify-content: center; border: ${isHighlighted ? '4px solid #ff4444' : '2px solid white'}; box-shadow: 0 4px 10px rgba(0,0,0,0.3);">
        <span style="transform: rotate(45deg); color: white; font-weight: bold; font-size: 14px;">${symbol}</span>
      </div>`,
    iconSize: [32, 32], iconAnchor: [16, 32], popupAnchor: [0, -32]
  });
};

// Stable identity for "this guest, in this event" across every station check-in.
//
// Per the backend model, EventStationGuestCheck.booking_guest is a required
// (non-nullable) FK to BookingGuest, and BookingGuest is unique_together on
// (booking, guest). Since a booking belongs to exactly one event, the
// booking_guest id is already the correct, stable, globally-unique key for
// grouping a guest's check-ins across stations within an event — it does NOT
// need to be combined with booking_id.
//
// IMPORTANT: use ?? not || — booking_guest can legitimately be falsy-but-valid
// (e.g. id 0 in some numbering schemes), and `0 || x` would wrongly fall
// through to a fallback, splitting that guest's history into two "people".
// The guest_id/id fallbacks are purely defensive in case a serializer ever
// omits booking_guest; they should not normally be hit.
const getGuestKey = (gc) => `G-${gc.booking_guest ?? gc.guest_id ?? gc.id}`;

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
  const [expandedGuestId, setExpandedGuestId] = useState(null);

  const { groupedHistory, allCheckEvents, stationsList } = useMemo(() => {
    if (!adminData.event_station_guest_checks) return { groupedHistory: [], allCheckEvents: [], stationsList: [] };
    const historyMap = {};
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

      // Consolidation Key: booking_guest alone (1:1 with the tour event),
      // see getGuestKey() above for why booking_id is intentionally excluded.
      const compositeId = getGuestKey(gc);
      
      if (!historyMap[compositeId]) {
        historyMap[compositeId] = { 
          id: compositeId, 
          name: gc.full_name || `Guest ${gc.booking_guest}`, 
          age: gc.age, 
          gender: gc.gender, 
          isLocal: gc.is_local, 
          history: [] 
        };
      }
      historyMap[compositeId].history.push(eventObj);
    });

    return { 
        groupedHistory: Object.values(historyMap).map(g => ({ ...g, history: g.history.sort((a,b) => a.time - b.time)})), 
        allCheckEvents: events.sort((a,b) => b.time - a.time),
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

  // Guest-centric view: each guest (grouped by getGuestKey) with only their
  // history entries that pass the active filters, sorted by most recent
  // activity first. A guest disappears from the feed only if none of their
  // check-ins match the current filters; their station history stays
  // chronological (oldest -> newest) for the expanded timeline.
  const filteredGuestList = useMemo(() => {
    return groupedHistory
      .map((guest) => ({
        ...guest,
        history: guest.history.filter(matchesFilters)
      }))
      .filter((guest) => guest.history.length > 0)
      .sort((a, b) => b.history[b.history.length - 1].time - a.history[a.history.length - 1].time);
  }, [groupedHistory, searchQuery, selectedStation, roleFilter, activeEventFilter, dateFilter]);

  const stats = useMemo(() => {
    if (filteredEvents.length === 0) return null;
    // Use the same identity key as groupedHistory so "unique guests" matches
    // what's actually shown as unique tracked guests on the map.
    const uniqueGuests = [...new Set(filteredEvents.map(getGuestKey))];
    const totalAge = filteredEvents.reduce((acc, curr) => acc + (parseInt(curr.age) || 0), 0);
    const stationCounts = filteredEvents.reduce((acc, curr) => {
        acc[curr.station_name] = (acc[curr.station_name] || 0) + 1;
        return acc;
    }, {});
    const sortedStations = Object.entries(stationCounts).sort((a,b) => b[1] - a[1]);
    const topStation = sortedStations[0];
    const males = filteredEvents.filter(e => e.gender?.toLowerCase().startsWith('m')).length;
    const locals = filteredEvents.filter(e => e.is_local).length;

    return {
        avgAge: (totalAge / filteredEvents.length).toFixed(1),
        genderSplit: `${males}M / ${filteredEvents.length - males}F`,
        topStation: topStation ? topStation[0] : "N/A",
        activityRate: (filteredEvents.length / uniqueGuests.length).toFixed(1),
        localPercent: ((locals / filteredEvents.length) * 100).toFixed(0),
        totalChecks: filteredEvents.length
    };
  }, [filteredEvents]);

  const paginatedGuests = filteredGuestList.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  const totalPages = Math.ceil(filteredGuestList.length / pageSize);

  if (loading) return <div className="h-screen flex items-center justify-center font-black text-slate-400 animate-pulse">SYNCING DATA...</div>;

  return (
    <div className="flex flex-col min-h-screen bg-slate-50 p-4 md:p-6 overflow-x-hidden">
      <header className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 mb-6">
        <div className="flex items-center gap-4">
          <div className="bg-teal-600 p-3 rounded-2xl text-white shadow-lg"><Navigation size={28} /></div>
          <div>
            <h1 className="text-xl md:text-2xl font-black text-slate-900 tracking-tight leading-none">Guest Tracking</h1>
            <div className="flex gap-2 mt-2">
                <FilterButton active={roleFilter === "all"} onClick={() => setRoleFilter("all")} label="All" />
                <FilterButton active={roleFilter === "station_staff"} onClick={() => setRoleFilter("station_staff")} label="Staff Only" />
            </div>
          </div>
        </div>
        
        <div className="flex flex-wrap gap-2 w-full lg:w-auto">
          <select 
            className="flex-1 lg:flex-none bg-white px-4 py-2 rounded-xl shadow-sm font-bold text-xs border-none focus:ring-2 focus:ring-blue-500"
            value={selectedStation}
            onChange={(e) => {setSelectedStation(e.target.value); setCurrentPage(1); setExpandedGuestId(null);}}
          >
            <option value="all">All Stations</option>
            {stationsList.map(s => <option key={s} value={s}>{s}</option>)}
          </select>

          <select 
            className="flex-1 lg:flex-none bg-white px-4 py-2 rounded-xl shadow-sm font-bold text-xs border-none focus:ring-2 focus:ring-blue-500"
            value={activeEventFilter}
            onChange={(e) => {setActiveEventFilter(e.target.value); setCurrentPage(1); setExpandedGuestId(null);}}
          >
            <option value="all">All Events</option>
            {adminData.events?.map(ev => <option key={ev.id} value={ev.id}>{ev.package_name}</option>)}
          </select>

          <div className="relative flex-1 lg:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input type="text" placeholder="Search..." className="w-full pl-10 pr-4 py-2 bg-white rounded-xl shadow-sm outline-none focus:ring-2 focus:ring-blue-500 font-bold text-sm" value={searchQuery} onChange={(e) => {setSearchQuery(e.target.value); setCurrentPage(1);}} />
          </div>

          <div className="flex gap-1">
            <input type="text" inputMode="numeric" placeholder="YYYY" maxLength={4} className="w-16 px-2 py-2 bg-white rounded-xl shadow-sm outline-none focus:ring-2 focus:ring-blue-500 font-bold text-xs text-center" value={dateFilter.year} onChange={(e) => {setDateFilter({...dateFilter, year: e.target.value.replace(/\D/g, "")}); setCurrentPage(1);}} />
            <input type="text" inputMode="numeric" placeholder="MM" maxLength={2} className="w-12 px-2 py-2 bg-white rounded-xl shadow-sm outline-none focus:ring-2 focus:ring-blue-500 font-bold text-xs text-center" value={dateFilter.month} onChange={(e) => {setDateFilter({...dateFilter, month: e.target.value.replace(/\D/g, "")}); setCurrentPage(1);}} />
            <input type="text" inputMode="numeric" placeholder="DD" maxLength={2} className="w-12 px-2 py-2 bg-white rounded-xl shadow-sm outline-none focus:ring-2 focus:ring-blue-500 font-bold text-xs text-center" value={dateFilter.day} onChange={(e) => {setDateFilter({...dateFilter, day: e.target.value.replace(/\D/g, "")}); setCurrentPage(1);}} />
            {(dateFilter.year || dateFilter.month || dateFilter.day) && (
              <button onClick={() => {setDateFilter({year: "", month: "", day: ""}); setCurrentPage(1);}} className="px-2 bg-white rounded-xl shadow-sm text-slate-400 hover:text-slate-900" title="Clear date filter">
                <X size={14} />
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Main Grid: Responsive column-to-row layout */}
      <div className="flex flex-col lg:flex-row flex-1 gap-6 min-h-0 mb-6">
        
        {/* Map Container: Takes full width on mobile, 3/4 on desktop */}
        <div className="w-full lg:flex-[3] h-[400px] lg:h-auto bg-white rounded-[2rem] shadow-2xl overflow-hidden relative border-4 border-white z-10">
          <MapContainer center={[14.5995, 120.9842]} zoom={13} className="h-full w-full">
            <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
            <MapController targetCoords={mapTarget} />
            {groupedHistory.map((guest) => {
              const latest = guest.history[guest.history.length - 1];
              const isSearching = searchQuery.length > 1 && (guest.name.toLowerCase().includes(searchQuery.toLowerCase()));
              const ageColor = parseInt(guest.age) < 18 ? "#22c55e" : parseInt(guest.age) >= 60 ? "#a855f7" : "#3b82f6";
              
              return (
                <React.Fragment key={guest.id}>
                  <Polyline positions={guest.history.map(h => [h.lat, h.lng])} pathOptions={{ color: isSearching ? "#ff4444" : "#cbd5e1", weight: 2, dashArray: "5, 5" }} />
                  {guest.history.slice(0, -1).map((point, idx) => (
                    <Marker key={idx} position={[point.lat, point.lng]} icon={createGhostIcon(ageColor)}>
                      <Popup><div className="p-1 font-bold text-[10px]">{guest.name}<br/><span className="text-slate-400">📍 {point.station_name}</span></div></Popup>
                    </Marker>
                  ))}
                  <Marker position={[latest.lat, latest.lng]} icon={createGuestIcon(guest, isSearching)}>
                    <Tooltip direction="top">{guest.name}</Tooltip>
                    <Popup>
                      <div className="p-2">
                        <p className="font-black text-sm">{guest.name}</p>
                        <p className="text-xs text-slate-500">Last seen: {latest.station_name}</p>
                        <p className="text-[10px] mt-1">Total Checks: {guest.history.length}</p>
                        <p className="text-[10px] text-purple-600 font-bold">{eventLookup[latest.event_id]?.package_name || (latest.event_id ? `Event #${latest.event_id}` : "Unknown Event")}</p>
                      </div>
                    </Popup>
                  </Marker>
                </React.Fragment>
              );
            })}
          </MapContainer>
        </div>

        {/* Feed: Sidebar on desktop, scrollable area on mobile */}
        <div className="w-full lg:flex-1 bg-slate-900 rounded-[2rem] p-6 text-white shadow-2xl flex flex-col lg:min-w-[380px] max-h-[600px] lg:max-h-none">
          <div className="flex justify-between items-center mb-4 border-b border-white/10 pb-4">
            <h2 className="font-black text-sm uppercase tracking-widest flex items-center gap-2"><Clock size={18} className="text-blue-400" /> Guests ({filteredGuestList.length})</h2>
            <select className="bg-white/10 text-[10px] px-2 py-1 rounded font-bold" value={pageSize} onChange={(e) => {setPageSize(Number(e.target.value)); setCurrentPage(1);}}>
                <option value={5}>5</option><option value={10}>10</option><option value={20}>20</option>
            </select>
          </div>
          <div className="flex-1 overflow-y-auto space-y-3 pr-1 custom-scrollbar">
            {paginatedGuests.map((guest) => {
              const isExpanded = expandedGuestId === guest.id;
              const latest = guest.history[guest.history.length - 1];
              const eventId = latest.event_id;
              const eventInfo = eventLookup[eventId];
              const eventLabel = eventInfo?.package_name || (eventId ? `Event #${eventId}` : "Unknown Event");
              return (
                <div key={guest.id} className="bg-white/5 rounded-2xl border border-transparent hover:border-blue-500/50 transition-all overflow-hidden">
                  <button
                    onClick={() => setExpandedGuestId(isExpanded ? null : guest.id)}
                    className="w-full text-left p-4 flex items-center justify-between gap-2"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-black text-blue-400 text-sm truncate">{guest.name}</p>
                        <span className="text-[9px] font-mono bg-white/10 px-2 py-0.5 rounded text-slate-300 shrink-0">{guest.history.length} stop{guest.history.length !== 1 ? "s" : ""}</span>
                      </div>
                      <div className="mt-1 text-[10px] font-bold text-purple-300 flex items-center gap-1 truncate">
                        <Navigation size={11} className="text-purple-400 shrink-0" /> {eventLabel}{eventId ? ` (#${eventId})` : ""}
                      </div>
                      <div className="mt-1 text-[11px] font-bold text-slate-300 flex items-center gap-2">
                        <MapPin size={12} className="text-emerald-400 shrink-0" /> Last seen: {latest.station_name}
                      </div>
                      <div className="mt-1 text-[9px] font-black uppercase text-slate-500">{latest.time.toLocaleDateString()} · {latest.time.toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</div>
                    </div>
                    <ChevronRight size={16} className={`shrink-0 text-slate-400 transition-transform ${isExpanded ? "rotate-90" : ""}`} />
                  </button>

                  {isExpanded && (
                    <div className="px-4 pb-4 pt-1 space-y-1 border-t border-white/10">
                      {guest.history.map((point, idx) => (
                        <button
                          key={idx}
                          onClick={() => { setMapTarget([point.lat, point.lng]); window.scrollTo({top: 0, behavior: 'smooth'}); }}
                          className="w-full text-left flex items-center gap-3 py-2 px-2 rounded-xl hover:bg-white/10 transition-all group"
                        >
                          <div className="flex flex-col items-center shrink-0">
                            <div className={`w-2.5 h-2.5 rounded-full ${idx === guest.history.length - 1 ? "bg-blue-400" : "bg-slate-500"} group-hover:bg-blue-400`} />
                            {idx < guest.history.length - 1 && <div className="w-px flex-1 bg-white/10 mt-1" style={{minHeight: "16px"}} />}
                          </div>
                          <div className="flex-1 min-w-0 pb-1">
                            <div className="flex justify-between items-center gap-2">
                              <span className="text-[11px] font-bold text-slate-200 truncate">{point.station_name}</span>
                              <span className="text-[9px] font-mono text-slate-400 shrink-0">{point.time.toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</span>
                            </div>
                            <div className="text-[9px] opacity-60 font-black uppercase text-blue-200">👤 {point.checked_by}</div>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          <div className="flex justify-between items-center mt-4 pt-4 border-t border-white/10">
            <button disabled={currentPage === 1} onClick={() => setCurrentPage(p => p - 1)} className="p-2 bg-white/10 rounded-lg disabled:opacity-30"><ChevronLeft size={16} /></button>
            <span className="text-[10px] font-black uppercase tracking-widest">Page {currentPage} of {totalPages || 1}</span>
            <button disabled={currentPage >= totalPages} onClick={() => setCurrentPage(p => p + 1)} className="p-2 bg-white/10 rounded-lg disabled:opacity-30"><ChevronRight size={16} /></button>
          </div>
        </div>
      </div>

      {/* Stats Strip: Wraps on small screens */}
      {stats && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 bg-white rounded-3xl p-6 shadow-xl border-2 border-slate-100">
            <StatBox icon={<Users className="text-blue-500"/>} label="Demographics" value={stats.genderSplit} sub={`Avg Age: ${stats.avgAge}y`} />
            <StatBox icon={<TrendingUp className="text-emerald-500"/>} label={selectedStation === "all" ? "Top Hotspot" : "Station Activity"} value={selectedStation === "all" ? stats.topStation : `${stats.totalChecks} Checks`} sub="Activity Volume" />
            <StatBox icon={<Zap className="text-orange-500"/>} label="Engagement" value={`${stats.activityRate} pts`} sub="Avg checks/guest" />
            <StatBox icon={<PersonStanding className="text-purple-500"/>} label="Local Density" value={`${stats.localPercent}%`} sub="Based on filters" />
        </div>
      )}

    </div>
  );
};

const StatBox = ({ icon, label, value, sub }) => (
    <div className="flex items-center gap-4 p-2">
        <div className="p-3 bg-slate-50 rounded-2xl">{icon}</div>
        <div>
            <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">{label}</p>
            <p className="text-base md:text-lg font-black text-slate-900 leading-none my-1">{value}</p>
            <p className="text-[10px] font-bold text-slate-500 italic">{sub}</p>
        </div>
    </div>
)

const FilterButton = ({ active, onClick, label }) => (
    <button onClick={onClick} className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${active ? 'bg-blue-600 text-white shadow-md' : 'bg-slate-200 text-slate-500 hover:bg-slate-300'}`}>
        {label}
    </button>
);

export default Tracking;