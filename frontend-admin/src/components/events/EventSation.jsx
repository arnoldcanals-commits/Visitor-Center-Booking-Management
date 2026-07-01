import React, { useContext, useMemo } from 'react';
import { AdminDataContext } from '../../contexts/AdminDataContext';
import { 
  GripVertical, 
  Plus, 
  X, 
  MapPin, 
  ChevronUp, 
  ChevronDown, 
  Navigation 
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const StationManager = ({ eventId }) => {
  const { adminData, updateItem } = useContext(AdminDataContext);

  // 1. Find the specific event and its current stations
  const event = useMemo(() => 
    adminData.events.find(e => e.id === eventId), 
    [adminData.events, eventId]
  );

  // 2. Get the list of all available stations from global state
  const allAvailableStations = adminData.stations || [];

  // 3. Current stations attached to this event (sorted by order)
  const currentEventStations = useMemo(() => {
    return [...(event?.event_stations || [])].sort((a, b) => a.order - b.order);
  }, [event]);

  // Helper to trigger the update on the backend
  const syncStations = async (newStationList) => {
    // Format data for AdminTourEventSerializer: [{'station': id, 'order': 1}, ...]
    const formattedStations = newStationList.map((s, index) => ({
      station: s.station, // The ID
      order: index + 1
    }));

    await updateItem('events', eventId, { 
      event_stations: formattedStations 
    });
  };

  const addStation = (stationId) => {
    if (!stationId) return;
    const newList = [...currentEventStations, { station: parseInt(stationId) }];
    syncStations(newList);
  };

  const removeStation = (index) => {
    const newList = currentEventStations.filter((_, i) => i !== index);
    syncStations(newList);
  };

  const moveStation = (index, direction) => {
    const newList = [...currentEventStations];
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= newList.length) return;
    
    [newList[index], newList[targetIndex]] = [newList[targetIndex], newList[index]];
    syncStations(newList);
  };

  return (
    <div className="space-y-4">
      {/* Station List */}
      <div className="space-y-2">
        <AnimatePresence mode="popLayout">
          {currentEventStations.map((es, index) => (
            <motion.div
              key={`${es.station}-${index}`}
              layout
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 10 }}
              className="flex items-center gap-3 p-3 bg-white border border-gray-200 rounded-2xl shadow-sm"
            >
              <div className="flex flex-col text-gray-400">
                <button 
                  onClick={() => moveStation(index, -1)} 
                  disabled={index === 0}
                  className="hover:text-blue-600 disabled:opacity-20"
                >
                  <ChevronUp size={14} />
                </button>
                <button 
                  onClick={() => moveStation(index, 1)} 
                  disabled={index === currentEventStations.length - 1}
                  className="hover:text-blue-600 disabled:opacity-20"
                >
                  <ChevronDown size={14} />
                </button>
              </div>

              <div className="w-8 h-8 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center font-black text-xs border border-blue-100">
                {index + 1}
              </div>

              <div className="flex-1">
                <p className="text-sm font-bold text-gray-700">
                  {es.station_name || allAvailableStations.find(s => s.id === es.station)?.name || "Unknown Station"}
                </p>
              </div>

              <button 
                onClick={() => removeStation(index)}
                className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-colors"
              >
                <X size={16} />
              </button>
            </motion.div>
          ))}
        </AnimatePresence>

        {currentEventStations.length === 0 && (
          <div className="py-8 border-2 border-dashed border-gray-100 rounded-3xl flex flex-col items-center justify-center text-gray-400">
            <Navigation size={32} className="mb-2 opacity-20" />
            <p className="text-xs font-medium">No stations added to this route</p>
          </div>
        )}
      </div>

      {/* Add Station Selector */}
      <div className="relative">
        <select
          className="w-full p-4 bg-gray-50 border-2 border-transparent focus:border-blue-500 rounded-2xl outline-none font-bold text-xs text-gray-600 appearance-none transition-all cursor-pointer"
          onChange={(e) => {
            addStation(e.target.value);
            e.target.value = "";
          }}
          value=""
        >
          <option value="" disabled>+ Add Station to Route</option>
          {allAvailableStations
            .filter(s => !currentEventStations.some(es => es.station === s.id))
            .map(s => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))
          }
        </select>
        <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
          <Plus size={18} />
        </div>
      </div>
    </div>
  );
};

export default StationManager;