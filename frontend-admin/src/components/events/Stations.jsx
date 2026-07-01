import React, { useContext, useState, useMemo } from "react";
import { AdminDataContext } from "../../contexts/AdminDataContext";
import { 
  MapPin, Plus, Trash2, Edit3, Users, Search, 
  MoreVertical, ChevronRight, Archive, Eye, EyeOff,
  Power, PowerOff, X
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const Stations = () => {
  const { filteredData, createItem, updateItem, deleteItem, adminData } = useContext(AdminDataContext);
  
  // UI State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingStation, setEditingStation] = useState(null);
  const [showArchived, setShowArchived] = useState(false);
  const [activeMenu, setActiveMenu] = useState(null); // For custom dropdowns

  const staffMembers = (adminData.users || []).filter(u => u.role === "station_staff");

  // Filter logic based on archive status
  const displayedStations = useMemo(() => {
    return (filteredData.stations || []).filter(s => s.is_archived === showArchived);
  }, [filteredData.stations, showArchived]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const data = {
      name: formData.get("name"),
      description: formData.get("description"),
      location: formData.get("location"),
      is_active: formData.get("is_active") === "on",
      staff: Array.from(formData.getAll("staff")).map(id => parseInt(id)),
    };

    const success = editingStation 
      ? await updateItem("stations", editingStation.id, data)
      : await createItem("stations", data);

    if (success) {
      setIsModalOpen(false);
      setEditingStation(null);
    }
  };

  const toggleStatus = async (station, field) => {
    const newVal = !station[field];
    await updateItem("stations", station.id, { [field]: newVal });
    setActiveMenu(null);
  };

  return (
    <div className="p-4 md:p-6 pb-32 max-w-7xl mx-auto">
      {/* Header - Stacked on Mobile */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl md:text-3xl font-black text-gray-900 tracking-tight">Stations</h1>
          <p className="text-gray-500 font-medium text-xs md:text-sm">
            {showArchived ? "Viewing archived locations" : "Manage active checkpoints"}
          </p>
        </div>
        
        <div className="flex gap-2">
          <button 
            onClick={() => setShowArchived(!showArchived)}
            className={`flex-1 md:flex-none px-4 py-3 rounded-2xl font-bold text-xs transition-all flex items-center justify-center gap-2 border-2 
              ${showArchived ? 'bg-amber-50 border-amber-200 text-amber-600' : 'bg-gray-50 border-transparent text-gray-600'}`}
          >
            {showArchived ? <Eye size={16}/> : <Archive size={16}/>}
            {showArchived ? "Show Active" : "Archived"}
          </button>
          
          <button 
            onClick={() => { setEditingStation(null); setIsModalOpen(true); }}
            className="flex-1 md:flex-none bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-2xl font-bold text-xs transition-all shadow-lg shadow-blue-200 flex items-center justify-center gap-2"
          >
            <Plus size={18} /> Add New
          </button>
        </div>
      </div>

      {/* Grid Layout - 1 col on mobile, 3 on desktop */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
        <AnimatePresence mode="popLayout">
          {displayedStations.map((station) => (
            <motion.div 
              layout
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              key={station.id}
              className={`relative bg-white border rounded-[2rem] p-5 md:p-6 shadow-sm transition-all group 
                ${!station.is_active ? 'opacity-75 grayscale-[0.5]' : ''} 
                ${station.is_archived ? 'border-amber-200 bg-amber-50/30' : 'border-gray-100'}`}
            >
              {/* Action Menu */}
              <div className="absolute top-4 right-4">
                <button 
                  onClick={() => setActiveMenu(activeMenu === station.id ? null : station.id)}
                  className="p-2 hover:bg-gray-100 rounded-xl text-gray-400"
                >
                  <MoreVertical size={18} />
                </button>
                
                {activeMenu === station.id && (
                  <div className="absolute right-0 mt-2 w-48 bg-white border border-gray-100 rounded-2xl shadow-xl z-10 overflow-hidden py-1">
                    <button onClick={() => { setEditingStation(station); setIsModalOpen(true); setActiveMenu(null); }} className="w-full px-4 py-2 text-left text-xs font-bold text-gray-600 hover:bg-gray-50 flex items-center gap-2">
                      <Edit3 size={14}/> Edit Station
                    </button>
                    <button onClick={() => toggleStatus(station, 'is_active')} className="w-full px-4 py-2 text-left text-xs font-bold text-blue-600 hover:bg-blue-50 flex items-center gap-2">
                      {station.is_active ? <PowerOff size={14}/> : <Power size={14}/>} 
                      {station.is_active ? 'Deactivate' : 'Activate'}
                    </button>
                    <button onClick={() => toggleStatus(station, 'is_archived')} className="w-full px-4 py-2 text-left text-xs font-bold text-amber-600 hover:bg-amber-50 flex items-center gap-2 border-t border-gray-50">
                      <Archive size={14}/> {station.is_archived ? 'Restore' : 'Archive'}
                    </button>
                    <button onClick={() => confirm("Permanent delete?") && deleteItem("stations", station.id)} className="w-full px-4 py-2 text-left text-xs font-bold text-red-500 hover:bg-red-50 flex items-center gap-2">
                      <Trash2 size={14}/> Delete Permanent
                    </button>
                  </div>
                )}
              </div>

              <div className="flex items-center gap-4 mb-4">
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center 
                  ${station.is_active ? 'bg-blue-50 text-blue-600' : 'bg-gray-100 text-gray-400'}`}>
                  <MapPin size={24} />
                </div>
                <div>
                  <h3 className="text-lg font-black text-gray-800 flex items-center gap-2">
                    {station.name}
                    {!station.is_active && <span className="text-[9px] bg-gray-200 px-2 py-0.5 rounded-full uppercase">Inactive</span>}
                  </h3>
                  <div className="flex items-center gap-1 text-[10px] font-bold text-gray-400 uppercase tracking-tighter">
                    <MapPin size={10} /> {station.location || "No Location"}
                  </div>
                </div>
              </div>

              <p className="text-gray-500 text-xs font-medium mb-4 line-clamp-2 leading-relaxed min-h-[2.5rem]">
                {station.description || "No description provided."}
              </p>

              <div className="pt-4 border-t border-gray-50 flex items-center justify-between">
                <div className="flex -space-x-2">
                  {station.staff_names?.slice(0, 3).map((name, i) => (
                    <div key={i} className="h-7 w-7 rounded-full ring-2 ring-white bg-blue-100 flex items-center justify-center text-[10px] font-bold text-blue-600 border border-white uppercase">
                      {name[0]}
                    </div>
                  ))}
                  {station.staff_names?.length > 3 && (
                    <div className="h-7 w-7 rounded-full ring-2 ring-white bg-gray-50 flex items-center justify-center text-[9px] font-bold text-gray-400 border border-white">
                      +{station.staff_names.length - 3}
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-1 text-gray-400 font-bold text-[10px]">
                  <Users size={12} />
                  {station.staff_names?.length || 0} Staff
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Responsive Slide-over / Bottom Sheet */}
      <AnimatePresence>
        {isModalOpen && (
          <>
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setIsModalOpen(false)}
              className="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ x: "100%" }} 
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              className="fixed right-0 top-0 bottom-0 z-50 w-full max-w-lg bg-white md:rounded-l-[3rem] shadow-2xl flex flex-col overflow-hidden"
            >
              <div className="p-6 md:p-8 border-b border-gray-50 flex justify-between items-center">
                <h2 className="text-xl font-black text-gray-900">
                  {editingStation ? "Update Station" : "New Station"}
                </h2>
                <button onClick={() => setIsModalOpen(false)} className="p-2 bg-gray-50 hover:bg-gray-100 rounded-2xl transition-colors">
                  <X />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="p-6 md:p-8 flex-1 overflow-y-auto space-y-5">
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <label className="text-[10px] font-black uppercase text-gray-400 mb-2 block ml-1">Station Name</label>
                    <input name="name" defaultValue={editingStation?.name} required className="w-full p-4 bg-gray-50 rounded-2xl border-2 border-transparent focus:border-blue-500 outline-none font-bold text-sm" />
                  </div>
                  
                  <div className="col-span-2">
                    <label className="text-[10px] font-black uppercase text-gray-400 mb-2 block ml-1">Location Info</label>
                    <input name="location" defaultValue={editingStation?.location} className="w-full p-4 bg-gray-50 rounded-2xl border-2 border-transparent focus:border-blue-500 outline-none font-bold text-sm" />
                  </div>
                </div>

                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl">
                  <div className="flex flex-col">
                    <span className="text-xs font-black text-gray-700">Set as Active</span>
                    <span className="text-[10px] text-gray-400 font-medium">Inactive stations won't appear in route selection</span>
                  </div>
                  <input 
                    type="checkbox" 
                    name="is_active" 
                    defaultChecked={editingStation ? editingStation.is_active : true}
                    className="w-5 h-5 accent-blue-600" 
                  />
                </div>

                <div>
                  <label className="text-[10px] font-black uppercase text-gray-400 mb-2 block ml-1">Assign Staff Personnel</label>
                  <select name="staff" multiple defaultValue={editingStation?.staff || []} className="w-full p-4 bg-gray-50 rounded-2xl border-2 border-transparent focus:border-blue-500 outline-none font-bold text-sm h-48 scrollbar-hide">
                    {staffMembers.map(u => (
                      <option key={u.id} value={u.id} className="p-3 rounded-xl mb-1 font-bold text-gray-600 checked:bg-blue-600 checked:text-white transition-all">
                        {u.username}
                      </option>
                    ))}
                  </select>
                </div>

                <button className="w-full bg-gray-900 text-white p-5 rounded-3xl font-black text-sm hover:bg-blue-600 transition-all shadow-xl shadow-blue-100 flex items-center justify-center gap-2">
                  {editingStation ? <Edit3 size={18}/> : <Plus size={18}/>}
                  {editingStation ? "Apply Changes" : "Save Station"}
                </button>
              </form>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Stations;