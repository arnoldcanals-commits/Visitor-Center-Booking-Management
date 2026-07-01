import React, { useEffect, useState, useContext } from "react";
import { useParams, Link } from "react-router-dom";
import { TourGuideDataContext } from "../../contexts/TourGuideDataContext";
import { AuthContext } from "../../contexts/AuthContext";
import { FaCheckCircle, FaTimesCircle } from "react-icons/fa";
import { GoogleMap, Marker, useJsApiLoader } from "@react-google-maps/api";
import GuestLiveMap from "../../components/guide/GuestLiveMap";
// ================= MODAL COMPONENT =================
const Modal = ({ onClose, title, children }) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
    <div className="bg-gray-100 rounded-xl w-full max-w-md p-6 space-y-4 relative shadow-xl">
      <button
        onClick={onClose}
        className="absolute top-3 right-3 text-gray-500 hover:text-gray-700 text-xl font-bold"
      >
        ×
      </button>
      <h2 className="text-xl font-semibold text-teal-600">{title}</h2>
      <div>{children}</div>
    </div>
  </div>
);

// ================= MAIN COMPONENT =================
export default function TourGuideEventDetail() {
  const { id } = useParams();
  const { getEventDetail } = useContext(TourGuideDataContext);

  const [eventDetail, setEventDetail] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedGuest, setSelectedGuest] = useState(null);

  const GOOGLE_MAPS_KEY = "<YOUR_GOOGLE_MAPS_API_KEY>";
  const { isLoaded: mapsLoaded } = useJsApiLoader({ googleMapsApiKey: GOOGLE_MAPS_KEY });

  useEffect(() => {
    const fetchEvent = async () => {
      setLoading(true);
      const data = await getEventDetail(id);
      setEventDetail(data);
      setLoading(false);
    };
    fetchEvent();
  }, [id, getEventDetail]);

  if (loading) return <div className="p-6 text-gray-600">Loading event details...</div>;
  if (!eventDetail) return <div className="p-6 text-red-500">Event not found or failed to load.</div>;

  const {
    package_name,
    start_date,
    end_date,
    slot_limit,
    slots_used,
    total_bookings,
    bookings,
    stations_progress,
    itinerary_file,
  } = eventDetail;

  const isFull = slots_used >= slot_limit;

  // Compute total guests for progress calculation
  const totalGuests = bookings.reduce((sum, b) => sum + b.guests.length, 0);

  return (
    <div className="p-6 space-y-6 bg-gray-50 min-h-screen">
      {/* ================= HEADER ================= */}
      <div className="space-y-2">
        <h1 className="text-3xl font-bold text-teal-600">{package_name}</h1>
        <p className="text-gray-600">
          {start_date} → {end_date} | Slots: {slots_used}/{slot_limit} | Bookings: {total_bookings}
        </p>
        <span
          className={`inline-block px-3 py-1 text-sm rounded-full font-medium ${
            isFull ? "bg-amber-600 text-white" : "bg-teal-600 text-white"
          }`}
        >
          {isFull ? "Full" : "Slots Available"}
        </span>
        {itinerary_file && (
          <div className="mt-2">
            <a
              href={itinerary_file}
              target="_blank"
              rel="noopener noreferrer"
              className="text-teal-600 underline text-sm hover:text-teal-800"
            >
              View Itinerary
            </a>
          </div>
        )}
      </div>

        {/* ================= LIVE MAP VIEW ================= */}
    <div className="space-y-3">
      <h2 className="text-2xl font-semibold text-teal-700 flex items-center gap-2">
        <span className="relative flex h-3 w-3">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-teal-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-3 w-3 bg-teal-500"></span>
        </span>
        Live Guest Locations
      </h2>
      <GuestLiveMap bookings={bookings} mapsLoaded={mapsLoaded} />
    </div>
      {/* ================= BOOKINGS & GUEST CHECKS ================= */}
      <div>
        <h2 className="text-2xl font-semibold mb-3 text-white bg-gray-700 rounded px-2">Guests Tracking</h2>
        {bookings.length === 0 ? (
          <p className="text-gray-500">No bookings yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full bg-gray-100 rounded shadow divide-y divide-gray-200">
              <thead className="bg-gray-200">
                <tr>
                  <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">Guest</th>
                  {stations_progress.map((s) => (
                    <th key={s.station_id} className="px-4 py-2 text-center text-sm font-medium text-gray-700">
                      {s.station_name}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-300">
                {bookings.map((b) =>
                  b.guests.map((g) => (
                    <tr key={g.id} className="hover:bg-gray-50 cursor-pointer">
                      <td className="px-4 py-2" onClick={() => setSelectedGuest(g)}>
                        <span className="text-teal-600 font-medium hover:underline">
                          {g.full_name} ({g.gender}) ({g.age}) 
                        </span>
                        {g.local && (
                          <span className="ml-2 px-2 py-1 rounded-full bg-amber-600 text-white text-xs">
                            Local
                          </span>
                        )}
                      </td>

                      {stations_progress.map((s) => {
                        const guestCheck = s.guest_checks?.find((c) => c.guest_id === g.id);
                        const isChecked = guestCheck?.checked;
                        const checkedBy = guestCheck?.checked_by_name;
                        const checkedAt = guestCheck?.checked_at;

                        return (
                          <td key={s.station_id} className="px-4 py-2 text-center">
                            {isChecked ? (
                              <div className="flex flex-col items-center">
                                <span className="px-2 py-1 rounded-full bg-green-600 text-white text-xs flex items-center gap-1">
                                  <FaCheckCircle /> Checked
                                </span>
                                {checkedAt && (
                                  <span className="text-xs text-gray-700">
                                    {new Date(checkedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                                  </span>
                                )}
                                {checkedBy && <span className="text-xs text-gray-500">{checkedBy}</span>}
                              </div>
                            ) : (
                              <span className="px-2 py-1 rounded-full bg-red-600 text-white text-xs flex items-center gap-1">
                                <FaTimesCircle /> Pending
                              </span>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ================= MODAL & MAP ================= */}
      {selectedGuest && (
        <Modal onClose={() => setSelectedGuest(null)} title={selectedGuest.full_name}>
          <div className="space-y-2 text-gray-700">
            <p>Age: {selectedGuest.age}</p>
            <p>ID: {selectedGuest.id_number}</p>
            <p>Created: {new Date(selectedGuest.created_at).toLocaleString()}</p>

            {mapsLoaded && selectedGuest.latitude && selectedGuest.longitude && (
              <div className="mt-2 rounded-xl overflow-hidden shadow">
                <GoogleMap
                  mapContainerStyle={{ width: "100%", height: "250px" }}
                  center={{ lat: selectedGuest.latitude, lng: selectedGuest.longitude }}
                  zoom={15}
                >
                  <Marker position={{ lat: selectedGuest.latitude, lng: selectedGuest.longitude }} />
                </GoogleMap>
              </div>
            )}
          </div>
        </Modal>
      )}

      {/* ================= STATION PROGRESS BARS ================= */}
      {stations_progress.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-2xl font-semibold text-teal-700">Station Progress</h2>
          {stations_progress.map((station) => {
            const checkedGuests = bookings.reduce((sum, b) => {
              return (
                sum +
                b.guests.reduce((gSum, g) => {
                  const guestCheck = station.guest_checks?.find(c => c.guest_id === g.id);
                  return gSum + (guestCheck?.checked ? 1 : 0);
                }, 0)
              );
            }, 0);

            const percent = totalGuests > 0 ? Math.round((checkedGuests / totalGuests) * 100) : 0;

            let bgColor = "bg-gray-300";
            if (station.status === "partial") bgColor = "bg-amber-600";
            else if (station.status === "MIA") bgColor = "bg-red-600";
            else if (station.status === "complete") bgColor = "bg-teal-600";

            return (
              <div key={station.station_id} className="space-y-1">
                <div className="flex justify-between text-sm text-gray-700 font-medium">
                  <span>{station.station_name}</span>
                  <span className="px-2 py-1 rounded-full bg-gray-700 text-white text-xs">{percent}%</span>
                </div>
                <div className="w-full bg-gray-200 h-4 rounded-full overflow-hidden">
                  <div
                    className={`${bgColor} h-4 rounded-full transition-all duration-500`}
                    style={{ width: `${percent}%` }}
                  />
                </div>
                {station.guide_check_status?.checked && (
                  <span className="px-2 py-1 rounded-full bg-teal-600 text-white text-xs">
                    Guide confirmed by {station.guide_check_status.checked_by_name} at{" "}
                    {new Date(station.guide_check_status.checked_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ================= BACK ================= */}
      <div className="mt-6">
        <Link
          to="/tour-guide/events"
          className="text-teal-600 underline hover:text-teal-800 text-sm"
        >
          ← Back to Events
        </Link>
      </div>
    </div>
  );
}
