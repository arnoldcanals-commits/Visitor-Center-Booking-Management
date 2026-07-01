import React, { useContext, useState, useMemo } from 'react';
import { 
  Calendar, Users, MapPin, Search, Filter, Trash2, Archive, Power, 
  Plus, Edit3, UserCheck, Clock, X, Save, AlertCircle, 
  CheckSquare, Square, ChevronDown, Eye, EyeOff, ChevronUp, FileText, Upload, Settings2,
  Flag // Added for station icon
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { AdminDataContext } from '../contexts/AdminDataContext';
import { format, isWithinInterval, isPast, isFuture, addDays, parseISO } from 'date-fns';

import StationManager from '../components/events/EventSation';
import Stations from '../components/events/Stations';

const Events = () => {
  const { adminData, deleteItem, updateItem, createItem, loading } = useContext(AdminDataContext);
  
  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState({ year: "", month: "", day: "", guide: "" });
  const [showArchived, setShowArchived] = useState(false);
  const [selectedIds, setSelectedIds] = useState([]);
  const [editingEvent, setEditingEvent] = useState(null);

  const years = useMemo(() => {
    const currentYear = new Date().getFullYear();
    return Array.from({ length: 5 }, (_, i) => (currentYear - 2 + i).toString());
  }, []);

  const getEventStatus = (start, end) => {
    const now = new Date();
    const startDate = parseISO(start);
    const endDate = parseISO(end || start);
    if (isWithinInterval(now, { start: startDate, end: endDate })) return { label: 'Live', color: 'bg-green-100 text-green-700' };
    if (isFuture(startDate) && isWithinInterval(startDate, { start: now, end: addDays(now, 7) })) return { label: 'Upcoming', color: 'bg-blue-100 text-blue-700' };
    if (isPast(endDate)) return { label: 'Ended', color: 'bg-gray-100 text-gray-700' };
    return { label: 'Scheduled', color: 'bg-purple-100 text-purple-700' };
  };

  const filteredEvents = useMemo(() => {
    return (adminData?.events || []).filter(event => {
      if (!showArchived && event.is_archived) return false;
      const startDate = parseISO(event.start_date);
      const matchesSearch = event.package_name?.toLowerCase().includes(search.toLowerCase());
      const matchesYear = !filters.year || startDate.getFullYear().toString() === filters.year;
      const matchesMonth = !filters.month || (startDate.getMonth() + 1).toString() === filters.month;
      const matchesGuide = !filters.guide || event.assigned_guide?.toString() === filters.guide;
      return matchesSearch && matchesYear && matchesMonth && matchesGuide;
    });
  }, [adminData?.events, search, filters, showArchived]);

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

  if (loading) return <div className="p-8 text-center animate-pulse">Loading Event Console...</div>;

  return (
    <div className="p-4 md:p-8 space-y-6 max-w-7xl mx-auto pb-32 relative">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Calendar className="text-blue-600" /> Event Console
          </h1>
          <p className="text-sm text-gray-500">
            {filteredEvents.length} events found
          </p>
        </div>
        <motion.button 
          whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
          onClick={() => setEditingEvent({ assigned_guide: "", package: "", slot_limit: 20, is_active: true })} 
          className="bg-blue-600 text-white px-5 py-2.5 rounded-xl flex items-center gap-2"
        >
          <Plus size={18} /> Create Event
        </motion.button>
      </div>

      {/* Filter Bar */}
      <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex flex-col md:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-3 text-gray-400" size={18} />
            <input 
              className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border-none rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
              placeholder="Search packages..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="flex gap-2">
            <select className="bg-gray-50 rounded-xl px-4 py-2 text-sm outline-none" onChange={(e)=>setFilters({...filters, year: e.target.value})}>
              <option value="">Year</option>
              {years.map(y => <option key={y} value={y}>{y}</option>)}
            </select>
            <button onClick={() => setFilters({year:"", month:"", day:"", guide:""})} className="p-2.5 text-gray-400 hover:text-blue-600">
              <Filter size={20}/>
            </button>
          </div>
      </div>

      {/* Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <AnimatePresence mode='popLayout'>
          {filteredEvents.map(event => {
            const status = getEventStatus(event.start_date, event.end_date);
            const guide = adminData?.users.find(u => u.id === event.assigned_guide);
            const isSelected = selectedIds.includes(event.id);
            // REQUIREMENT: Calculate station count
            const stationCount = event.event_stations?.length || 0;

            return (
              <motion.div 
                layout key={event.id}
                className={`relative bg-white rounded-3xl shadow-sm border p-6 ${isSelected ? 'ring-2 ring-blue-500' : 'border-gray-100'}`}
              >
                <div className="flex justify-between items-start mb-4">
                  <div className="flex gap-2">
                    <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase ${status.color}`}>
                        {status.label}
                    </span>
                    {/* REQUIREMENT: Display Station Count Badge */}
                    <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase bg-gray-100 text-gray-600 flex items-center gap-1">
                        <Flag size={10} /> {stationCount} Stations
                    </span>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => setEditingEvent(event)} className="p-2 hover:bg-gray-100 rounded-xl text-gray-500"><Edit3 size={16}/></button>
                  </div>
                </div>
                <h3 className="text-lg font-bold text-gray-800">{event.package_name}</h3>
                <div className="text-xs text-gray-400 mt-1 flex items-center gap-1">
                  <Clock size={14}/> {format(parseISO(event.start_date), 'PPP')}
                </div>
                <div className="mt-4 pt-4 border-t flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center text-[10px] font-bold text-blue-600">
                        {guide?.username?.charAt(0) || '?'}
                    </div>
                    <span className="text-xs font-medium text-gray-600">{guide?.username || "No Guide"}</span>
                  </div>
                  <button onClick={() => updateItem('events', event.id, { is_active: !event.is_active })} className="text-gray-400">
                    <Power size={16} className={event.is_active ? "text-green-500" : ""}/>
                  </button>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      {/* Edit Modal */}
      <AnimatePresence>
        {editingEvent && (
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center p-4 z-[100]"
          >
             <motion.div 
               initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }}
               className="bg-white rounded-[32px] w-full max-w-lg overflow-hidden shadow-2xl"
             >
                <div className="p-8 max-h-[85vh] overflow-y-auto">
                   <div className="flex justify-between items-center mb-6">
                      <h2 className="text-2xl font-black">{editingEvent.id ? 'Update Event' : 'New Schedule'}</h2>
                      <button onClick={() => setEditingEvent(null)} className="p-2 bg-gray-100 rounded-full"><X size={20}/></button>
                   </div>
                   
                   <div className="space-y-6">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="text-[10px] font-black uppercase text-gray-400 ml-1">Package</label>
                          <select 
                            value={editingEvent.package || ""}
                            className="w-full p-4 bg-gray-50 rounded-2xl border-none outline-none font-bold text-gray-700"
                            onChange={(e) => setEditingEvent({...editingEvent, package: e.target.value})}
                          >
                            <option value="">Select Package</option>
                            {adminData.packages.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                          </select>
                        </div>
                        <div>
                          <label className="text-[10px] font-black uppercase text-gray-400 ml-1">Max Slots</label>
                          <input 
                            type="number"
                            className="w-full p-4 bg-gray-50 rounded-2xl border-none outline-none font-bold text-gray-700"
                            value={editingEvent.slot_limit || 20}
                            onChange={(e) => setEditingEvent({...editingEvent, slot_limit: e.target.value})}
                          />
                        </div>
                      </div>

                      <div>
                        <label className="text-[10px] font-black uppercase text-gray-400 ml-1">Itinerary File</label>
                        <label className="mt-2 flex flex-col items-center justify-center w-full h-24 border-2 border-dashed border-gray-200 rounded-2xl cursor-pointer bg-gray-50">
                          <Upload className="w-6 h-6 text-gray-400 mb-1" />
                          <p className="text-[10px] text-gray-500 font-bold">{editingEvent.itinerary_file?.name || "Upload PDF/Doc"}</p>
                          <input type="file" className="hidden" onChange={(e) => setEditingEvent({...editingEvent, itinerary_file: e.target.files[0]})} />
                        </label>
                      </div>

                      <div>
                        <label className="text-[10px] font-black uppercase text-gray-400 ml-1">Assigned Guide</label>
                        <select 
                          value={editingEvent.assigned_guide || ""}
                          className="w-full p-4 bg-gray-50 rounded-2xl border-none outline-none font-bold text-gray-700"
                          onChange={(e) => setEditingEvent({...editingEvent, assigned_guide: e.target.value})}
                        >
                          <option value="">Unassigned</option>
                          {adminData.users
                            .filter(u => u.role === 'tour_guide')
                            .map(u => (
                              <option 
                                key={u.id} 
                                value={u.id}
                                // REQUIREMENT: Prevent assigning "busy" guides
                                disabled={u.status?.toLowerCase() === 'busy' && u.id !== editingEvent.assigned_guide}
                              >
                                {u.username} {u.status?.toLowerCase() === 'busy' ? '(Busy)' : ''}
                              </option>
                            ))
                          }
                        </select>
                      </div>

                      <div className="pt-4 border-t border-gray-100">
                        <label className="text-[10px] font-black uppercase text-gray-400 ml-1 mb-2 block">Route & Stations</label>
                        {editingEvent.id ? (
                           <StationManager eventId={editingEvent.id} />
                        ) : (
                          <div className="p-4 bg-amber-50 rounded-2xl border border-amber-100 flex items-center gap-3">
                             <AlertCircle className="text-amber-500" size={18} />
                             <p className="text-[10px] text-amber-700 font-bold">
                               Please save the event basic details first to begin managing the route stations.
                             </p>
                          </div>
                        )}
                      </div>
                   </div>

                   <button 
                    onClick={handleSaveEvent}
                    className="w-full py-4 bg-blue-600 text-white rounded-2xl font-bold mt-8 shadow-lg shadow-blue-200"
                   >
                     Save Event Details
                   </button>
                </div>
             </motion.div>
          </motion.div>
        )}
        <Stations/>
      </AnimatePresence>
    </div>
  );
};

export default Events;