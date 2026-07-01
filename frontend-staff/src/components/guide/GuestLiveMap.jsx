import React, { useMemo, useState } from "react";
import { MapContainer, TileLayer, Marker, Popup, Polyline } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// --- CUSTOM ICON GENERATOR ---
const createCustomIcon = (guest, isHighlighted) => {
  const age = parseInt(guest.age) || 0;
  const gender = (guest.gender || "").toLowerCase();

  let bgColor = age < 18 ? "#22c55e" : age >= 60 ? "#a855f7" : "#3b82f6";
  
  // Male = Teardrop | Female = Diamond
  let borderRadius = "50% 50% 50% 0"; 
  let symbol = "♂";

  if (gender === "female" || gender === "f") {
    borderRadius = "2px 50% 50% 50%"; 
    symbol = "♀";
  } else if (!(gender === "male" || gender === "m")) {
    borderRadius = "50%"; 
    symbol = "👤";
  }

  const borderStyle = isHighlighted ? "3px solid #ff4444" : "2px solid white";
  const scale = isHighlighted ? "scale(1.3)" : "scale(1)";

  return L.divIcon({
    className: "custom-guest-marker",
    html: `
      <div style="
        background-color: ${bgColor};
        width: 32px;
        height: 32px;
        border-radius: ${borderRadius};
        transform: rotate(-45deg) ${scale};
        display: flex;
        align-items: center;
        justify-content: center;
        border: ${borderStyle};
        box-shadow: 0 2px 6px rgba(0,0,0,0.3);
        transition: all 0.3s ease;
      ">
        <span style="transform: rotate(45deg); color: white; font-weight: bold; font-size: 14px;">${symbol}</span>
      </div>
    `,
    iconSize: [32, 32],
    iconAnchor: [16, 32],
    popupAnchor: [0, -32],
  });
};

const GuestLiveMap = ({ bookings }) => {
  const [searchQuery, setSearchQuery] = useState("");

  // --- GROUPING DATA BY GUEST ID ---
  const guestHistory = useMemo(() => {
    const historyMap = {};
    const jitterFactor = 0.00008;

    if (!bookings) return [];

    bookings.forEach((booking) => {
      booking.guests?.forEach((guest) => {
        const lat = parseFloat(guest.checked_latitude);
        const lng = parseFloat(guest.checked_longitude);

        if (!isNaN(lat) && !isNaN(lng)) {
          const gId = guest.id;
          
          if (!historyMap[gId]) {
            historyMap[gId] = {
              ...guest,
              history: []
            };
          }

          // We add jitter to the marker so they don't stack at the station
          const jitterLat = (Math.random() - 0.5) * jitterFactor;
          const jitterLng = (Math.random() - 0.5) * jitterFactor;

          historyMap[gId].history.push({
            lat: lat + jitterLat,
            lng: lng + jitterLng,
            time: new Date(guest.checked_at || Date.now())
          });
        }
      });
    });

    // Sort the history points for each guest by time
    return Object.values(historyMap).map(guest => {
      guest.history.sort((a, b) => a.time - b.time);
      return guest;
    });
  }, [bookings]);

  // --- FILTERING ---
  const filteredGuests = useMemo(() => {
    return guestHistory.filter(g => 
      g.full_name?.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [guestHistory, searchQuery]);

  const center = filteredGuests.length > 0 
    ? [filteredGuests[0].history[filteredGuests[0].history.length-1].lat, filteredGuests[0].history[filteredGuests[0].history.length-1].lng] 
    : [14.5995, 120.9842];

  return (
    <div className="relative rounded-xl overflow-hidden shadow-lg border h-[600px] w-full bg-slate-50 font-sans">
      
      {/* SEARCH BAR */}
      <div className="absolute top-4 left-1/2 -translate-x-1/2 z-[1000] w-64 md:w-80">
        <input
          type="text"
          placeholder="🔍 Search guest name..."
          className="w-full px-4 py-2.5 rounded-full border border-gray-200 shadow-2xl focus:outline-none focus:ring-2 focus:ring-blue-400 text-sm bg-white/90 backdrop-blur-md"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      <MapContainer center={center} zoom={15} style={{ height: "100%", width: "100%" }}>
        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
        
        {filteredGuests.map((guest) => {
          const latest = guest.history[guest.history.length - 1];
          const isSearching = searchQuery.length > 0;

          return (
            <React.Fragment key={guest.id}>
              {/* THE TRAILING LINE */}
              {guest.history.length > 1 && (
                <Polyline 
                  positions={guest.history.map(h => [h.lat, h.lng])}
                  pathOptions={{
                    color: isSearching ? "#ff4444" : "#94a3b8",
                    weight: isSearching ? 4 : 2,
                    dashArray: "7, 10",
                    opacity: isSearching ? 0.9 : 0.5
                  }}
                />
              )}

              {/* CURRENT POSITION MARKER */}
              <Marker 
                position={[latest.lat, latest.lng]} 
                icon={createCustomIcon(guest, isSearching)}
              >
                <Popup>
                  <div className="text-center">
                    <p className="font-bold text-slate-800 border-b pb-1 mb-1 uppercase text-[11px]">{guest.full_name}</p>
                    <p className="text-[10px] text-slate-500 m-0">Age: {guest.age} | {guest.gender}</p>
                    <p className="text-[9px] text-blue-500 mt-1 font-bold">
                      Last Check-in: {latest.time.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                    </p>
                  </div>
                </Popup>
              </Marker>
            </React.Fragment>
          );
        })}
      </MapContainer>

      {/* LEGEND */}
      <div className="absolute bottom-6 left-6 z-[1000] bg-white/95 p-3 rounded-lg shadow-xl border border-gray-200 text-[10px]">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="font-bold text-gray-400 uppercase mb-1 tracking-tighter">Age / Color</p>
            <div className="space-y-1">
              <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-[#22c55e]"></div> Child</div>
              <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-[#3b82f6]"></div> Adult</div>
              <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-[#a855f7]"></div> Senior</div>
            </div>
          </div>
          <div>
            <p className="font-bold text-gray-400 uppercase mb-1 tracking-tighter">Gender / Shape</p>
            <div className="space-y-1">
              <div className="flex items-center gap-1.5 font-mono">♂ <span className="bg-slate-100 px-1 rounded">Pin</span></div>
              <div className="flex items-center gap-1.5 font-mono">♀ <span className="bg-slate-100 px-1 rounded">Diamond</span></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GuestLiveMap;