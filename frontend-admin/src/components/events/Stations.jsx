import React, { useContext, useState, useMemo } from "react";
import { AdminDataContext } from "../../contexts/AdminDataContext";
import {
  MapPin, Plus, Trash2, Edit3, Users, Search,
  MoreVertical, ChevronRight, Archive, Eye, EyeOff,
  Power, PowerOff, X, BarChart3, LayoutGrid, List as ListIcon
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import AccentBadge from "../AccentBadge";

const Stations = () => {
  const { filteredData, createItem, updateItem, deleteItem, adminData } = useContext(AdminDataContext);

  // UI State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingStation, setEditingStation] = useState(null);
  const [showArchived, setShowArchived] = useState(false);
  const [activeMenu, setActiveMenu] = useState(null); // For custom dropdowns
  const [search, setSearch] = useState("");
  const [viewMode, setViewMode] = useState('list'); // 'grid' | 'list'

  const staffMembers = (adminData.users || []).filter(u => u.role === "station_staff");

  // Filter logic based on archive status + search
  const displayedStations = useMemo(() => {
    return (filteredData.stations || []).filter(s => {
      const matchesArchive = s.is_archived === showArchived;
      const query = search.toLowerCase();
      const matchesSearch = !query || s.name?.toLowerCase().includes(query) || s.location?.toLowerCase().includes(query);
      return matchesArchive && matchesSearch;
    });
  }, [filteredData.stations, showArchived, search]);

  // Stats row: derived from the full station list, not just what's currently filtered by archive toggle
  const stats = useMemo(() => {
    const all = filteredData.stations || [];
    return {
      total: all.length,
      active: all.filter(s => s.is_active && !s.is_archived).length,
      inactive: all.filter(s => !s.is_active && !s.is_archived).length,
      archived: all.filter(s => s.is_archived).length,
      staff: all.reduce((sum, s) => sum + (s.staff_names?.length || 0), 0),
    };
  }, [filteredData.stations]);

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
    <div className="">
      {/* Header - Stacked on Mobile */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 bg-white dark:bg-slate-800 rounded-xl shadow p-4 border border-transparent dark:border-slate-700">
        <AccentBadge icon={MapPin}>Station Management</AccentBadge>

        <div className="flex items-center gap-3 flex-wrap">
         

          {/* Sliding grid/list toggle - clicking anywhere in the pill flips it */}
          <div
            onClick={() => setViewMode(v => v === 'grid' ? 'list' : 'grid')}
            className="relative flex items-center bg-gray-100 dark:bg-slate-700 rounded-xl p-1 w-[72px] cursor-pointer select-none"
            title="Toggle grid / list view"
          >
            <motion.div
              layout
              transition={{ type: 'spring', stiffness: 400, damping: 32 }}
              className="absolute top-1 bottom-1 w-8 bg-white dark:bg-slate-600 rounded-lg shadow-sm"
              style={{ left: viewMode === 'grid' ? 4 : 36 }}
            />
            <div className={`relative z-10 flex-1 flex items-center justify-center p-1.5 transition-colors ${viewMode === 'grid' ? 'text-[var(--accent,#4f46e5)]' : 'text-gray-400 dark:text-gray-500'}`}>
              <LayoutGrid size={16} />
            </div>
            <div className={`relative z-10 flex-1 flex items-center justify-center p-1.5 transition-colors ${viewMode === 'list' ? 'text-[var(--accent,#4f46e5)]' : 'text-gray-400 dark:text-gray-500'}`}>
              <ListIcon size={16} />
            </div>
          </div>

          <button
            onClick={() => setShowArchived(!showArchived)}
            className={`px-4 py-2.5 rounded-xl font-bold text-xs transition-all flex items-center justify-center gap-2 border-2
              ${showArchived ? 'bg-amber-50 dark:bg-amber-500/10 border-amber-200 dark:border-amber-500/30 text-amber-600 dark:text-amber-400' : 'bg-gray-50 dark:bg-slate-700 border-transparent text-gray-600 dark:text-gray-300'}`}
          >
            {showArchived ? <Eye size={16} /> : <Archive size={16} />}
            {showArchived ? "Show Active" : "Archived"}
          </button>

          <motion.button
            whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
            onClick={() => { setEditingStation(null); setIsModalOpen(true); }}
            className="bg-[var(--accent,#4f46e5)] hover:bg-[color-mix(in_srgb,var(--accent,#4f46e5)_85%,black)] text-white px-5 py-2.5 rounded-xl flex items-center gap-2 shadow-lg shadow-[color-mix(in_srgb,var(--accent,#4f46e5)_25%,transparent)] dark:shadow-none font-bold text-xs"
          >
            <Plus size={18} /> Add New
          </motion.button>
        </div>
      </div>

      {/* Stats row */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-700 p-4 flex flex-wrap items-center gap-3 mb-6">
        <div className="flex items-center gap-2 pr-4 mr-2 border-r border-gray-100 dark:border-slate-700">
          <BarChart3 size={16} className="text-[var(--accent,#4f46e5)]" />
          <span className="text-xs font-black uppercase text-gray-400 dark:text-gray-500">Stats</span>
        </div>

        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold bg-[color-mix(in_srgb,var(--accent,#4f46e5)_12%,white)] text-[color-mix(in_srgb,var(--accent,#4f46e5)_70%,black)] dark:bg-[color-mix(in_srgb,var(--accent,#4f46e5)_30%,black)] dark:text-[color-mix(in_srgb,var(--accent,#4f46e5)_55%,white)]">
          <MapPin size={12} /> {stats.total} Total
        </span>
        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400">
          <Power size={12} /> {stats.active} Active
        </span>
        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold bg-slate-100 text-slate-600 dark:bg-slate-700/60 dark:text-slate-400">
          <PowerOff size={12} /> {stats.inactive} Inactive
        </span>
        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400">
          <Archive size={12} /> {stats.archived} Archived
        </span>
        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold bg-violet-100 text-violet-700 dark:bg-violet-500/15 dark:text-violet-400">
          <Users size={12} /> {stats.staff} Staff Assigned
        </span>
      </div>

      {/* Search */}
      <div className="relative mb-6">
        <Search className="absolute left-4 top-3.5 text-gray-400" size={18} />
        <input
          className="w-full pl-11 pr-4 py-3 bg-white dark:bg-slate-800 dark:text-gray-100 border border-gray-100 dark:border-slate-700 rounded-2xl focus:ring-2 focus:ring-[var(--accent,#4f46e5)] outline-none placeholder:text-gray-400 text-sm font-medium shadow-sm"
          placeholder="Search stations by name or location..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* Grid Layout - 1 col on mobile, 3 on desktop */}
      {viewMode === 'grid' && (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
        <AnimatePresence mode="popLayout">
          {displayedStations.map((station) => (
            <motion.div
              layout
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              key={station.id}
              className={`relative bg-white dark:bg-slate-800 border rounded-[2rem] p-5 md:p-6 shadow-sm transition-all group 
                ${!station.is_active ? 'opacity-75 grayscale-[0.5]' : ''} 
                ${station.is_archived ? 'border-amber-200 dark:border-amber-500/30 bg-amber-50/30 dark:bg-amber-500/5' : 'border-gray-100 dark:border-slate-700'}`}
            >
              {/* Action Menu */}
              <div className="absolute top-4 right-4">
                <button
                  onClick={() => setActiveMenu(activeMenu === station.id ? null : station.id)}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-xl text-gray-400 dark:text-gray-500"
                >
                  <MoreVertical size={18} />
                </button>

                {activeMenu === station.id && (
                  <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-slate-800 border border-gray-100 dark:border-slate-700 rounded-2xl shadow-xl z-10 overflow-hidden py-1">
                    <button onClick={() => { setEditingStation(station); setIsModalOpen(true); setActiveMenu(null); }} className="w-full px-4 py-2 text-left text-xs font-bold text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-700 flex items-center gap-2">
                      <Edit3 size={14} /> Edit Station
                    </button>
                    <button onClick={() => toggleStatus(station, 'is_active')} className="w-full px-4 py-2 text-left text-xs font-bold text-[var(--accent,#4f46e5)] hover:bg-[color-mix(in_srgb,var(--accent,#4f46e5)_10%,white)] dark:hover:bg-[color-mix(in_srgb,var(--accent,#4f46e5)_20%,black)] flex items-center gap-2">
                      {station.is_active ? <PowerOff size={14} /> : <Power size={14} />}
                      {station.is_active ? 'Deactivate' : 'Activate'}
                    </button>
                    <button onClick={() => toggleStatus(station, 'is_archived')} className="w-full px-4 py-2 text-left text-xs font-bold text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-500/10 flex items-center gap-2 border-t border-gray-50 dark:border-slate-700">
                      <Archive size={14} /> {station.is_archived ? 'Restore' : 'Archive'}
                    </button>
                    <button onClick={() => confirm("Permanent delete?") && deleteItem("stations", station.id)} className="w-full px-4 py-2 text-left text-xs font-bold text-red-500 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 flex items-center gap-2">
                      <Trash2 size={14} /> Delete Permanent
                    </button>
                  </div>
                )}
              </div>

              <div className="flex items-center gap-4 mb-4">
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center 
                  ${station.is_active ? 'bg-[color-mix(in_srgb,var(--accent,#4f46e5)_12%,white)] text-[var(--accent,#4f46e5)] dark:text-[color-mix(in_srgb,var(--accent,#4f46e5)_55%,white)]   dark:bg-[color-mix(in_srgb,var(--accent,#4f46e5)_25%,black)]' : 'bg-gray-100 dark:bg-slate-700 text-gray-400 dark:text-gray-500'}`}>
                  <MapPin size={24} />
                </div>
                <div>
                  <h3 className="text-lg font-black text-gray-800 dark:text-gray-100 flex items-center gap-2">
                    {station.name}
                    {!station.is_active && <span className="text-[9px] bg-gray-200 dark:bg-slate-600 text-gray-600 dark:text-gray-300 px-2 py-0.5 rounded-full uppercase">Inactive</span>}
                  </h3>
                  <div className="flex items-center gap-1 text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-tighter">
                    <MapPin size={10} /> {station.location || "No Location"}
                  </div>
                </div>
              </div>

              <p className="text-gray-500 dark:text-gray-400 text-xs font-medium mb-4 line-clamp-2 leading-relaxed min-h-[2.5rem]">
                {station.description || "No description provided."}
              </p>

              <div className="pt-4 border-t border-gray-50 dark:border-slate-700 flex items-center justify-between">
                <div className="flex -space-x-2">
                  {station.staff_names?.slice(0, 3).map((name, i) => (
                    <div key={i} className="h-7 w-7 rounded-full ring-2 ring-white dark:ring-slate-800 bg-[color-mix(in_srgb,var(--accent,#4f46e5)_15%,white)] dark:bg-[color-mix(in_srgb,var(--accent,#4f46e5)_30%,black)] flex items-center justify-center text-[10px] font-bold text-[color-mix(in_srgb,var(--accent,#4f46e5)_75%,black)] dark:text-[color-mix(in_srgb,var(--accent,#4f46e5)_55%,white)] border border-white dark:border-slate-800 uppercase">
                      {name[0]}
                    </div>
                  ))}
                  {station.staff_names?.length > 3 && (
                    <div className="h-7 w-7 rounded-full ring-2 ring-white dark:ring-slate-800 bg-gray-50 dark:bg-slate-700 flex items-center justify-center text-[9px] font-bold text-gray-400 dark:text-gray-500 border border-white dark:border-slate-800">
                      +{station.staff_names.length - 3}
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-1 text-gray-400 dark:text-gray-500 font-bold text-[10px]">
                  <Users size={12} />
                  {station.staff_names?.length || 0} Staff
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
      )}

      {/* List Layout */}
      {viewMode === 'list' && (
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-700 divide-y divide-gray-100 dark:divide-slate-700 overflow-hidden">
        <AnimatePresence mode="popLayout">
          {displayedStations.map((station) => (
            <motion.div
              layout
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              key={station.id}
              className={`flex flex-col md:flex-row md:items-center gap-3 md:gap-6 p-4 transition-colors hover:bg-gray-50 dark:hover:bg-slate-700/40 
                ${!station.is_active ? 'opacity-75' : ''} 
                ${station.is_archived ? 'bg-amber-50/30 dark:bg-amber-500/5' : ''}`}
            >
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 
                ${station.is_active ? 'bg-[color-mix(in_srgb,var(--accent,#4f46e5)_12%,white)] text-[var(--accent,#4f46e5)] dark:text-gray-400 dark:bg-[color-mix(in_srgb,var(--accent,#4f46e5)_25%,black)]' : 'bg-gray-100 dark:bg-slate-700 text-gray-400 dark:text-gray-500'}`}>
                <MapPin size={18} />
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="font-bold text-gray-800 dark:text-gray-100 truncate">{station.name}</h3>
                  {!station.is_active && <span className="text-[9px] bg-gray-200 dark:bg-slate-600 text-gray-600 dark:text-gray-300 px-2 py-0.5 rounded-full uppercase font-black">Inactive</span>}
                  {station.is_archived && <span className="text-[9px] bg-amber-100 dark:bg-amber-500/15 text-amber-700 dark:text-amber-400 px-2 py-0.5 rounded-full uppercase font-black">Archived</span>}
                </div>
                <div className="text-xs text-gray-400 dark:text-gray-500 mt-1 flex items-center gap-3 flex-wrap">
                  <span className="flex items-center gap-1"><MapPin size={12} /> {station.location || "No Location"}</span>
                  <span className="flex items-center gap-1"><Users size={12} /> {station.staff_names?.length || 0} Staff</span>
                </div>
              </div>

              <div className="flex items-center gap-1 shrink-0 self-end md:self-auto">
                <button onClick={() => toggleStatus(station, 'is_active')} className="p-2 rounded-xl text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-700 hover:text-[var(--accent,#4f46e5)]" title={station.is_active ? "Deactivate" : "Activate"}>
                  {station.is_active ? <Power size={16} className="text-emerald-500" /> : <PowerOff size={16} />}
                </button>
                <button onClick={() => { setEditingStation(station); setIsModalOpen(true); }} className="p-2 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-xl text-gray-500 dark:text-gray-400" title="Edit">
                  <Edit3 size={16} />
                </button>
                <button onClick={() => toggleStatus(station, 'is_archived')} className="p-2 hover:bg-amber-50 dark:hover:bg-amber-500/10 rounded-xl text-amber-600 dark:text-amber-400" title={station.is_archived ? "Restore" : "Archive"}>
                  <Archive size={16} />
                </button>
                <button onClick={() => confirm("Permanent delete?") && deleteItem("stations", station.id)} className="p-2 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-xl text-red-500 dark:text-red-400" title="Delete permanently">
                  <Trash2 size={16} />
                </button>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
      )}

      {displayedStations.length === 0 && (
        <div className="text-center py-16 text-gray-400 dark:text-gray-500">
          <MapPin size={32} className="mx-auto mb-3 opacity-50" />
          <p className="text-sm font-medium">No stations match these filters.</p>
        </div>
      )}

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
              className="fixed right-0 top-0 bottom-0 z-50 w-full max-w-lg bg-white dark:bg-slate-800 md:rounded-l-[3rem] shadow-2xl flex flex-col overflow-hidden"
            >
              <div className="p-6 md:p-8 border-b border-gray-50 dark:border-slate-700 flex justify-between items-center">
                <h2 className="text-xl font-black text-gray-900 dark:text-gray-100">
                  {editingStation ? "Update Station" : "New Station"}
                </h2>
                <button onClick={() => setIsModalOpen(false)} className="p-2 bg-gray-50 dark:bg-slate-700 hover:bg-gray-100 dark:hover:bg-slate-600 rounded-2xl transition-colors text-gray-600 dark:text-gray-300">
                  <X />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="p-6 md:p-8 flex-1 overflow-y-auto space-y-5">
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <label className="text-[10px] font-black uppercase text-gray-400 dark:text-gray-500 mb-2 block ml-1">Station Name</label>
                    <input name="name" defaultValue={editingStation?.name} required className="w-full p-4 bg-gray-50 dark:bg-slate-700 dark:text-gray-100 rounded-2xl border-2 border-transparent focus:border-[var(--accent,#4f46e5)] outline-none font-bold text-sm" />
                  </div>

                  <div className="col-span-2">
                    <label className="text-[10px] font-black uppercase text-gray-400 dark:text-gray-500 mb-2 block ml-1">Location Info</label>
                    <input name="location" defaultValue={editingStation?.location} className="w-full p-4 bg-gray-50 dark:bg-slate-700 dark:text-gray-100 rounded-2xl border-2 border-transparent focus:border-[var(--accent,#4f46e5)] outline-none font-bold text-sm" />
                  </div>
                </div>

                <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-slate-700 rounded-2xl">
                  <div className="flex flex-col">
                    <span className="text-xs font-black text-gray-700 dark:text-gray-200">Set as Active</span>
                    <span className="text-[10px] text-gray-400 dark:text-gray-500 font-medium">Inactive stations won't appear in route selection</span>
                  </div>
                  <input
                    type="checkbox"
                    name="is_active"
                    defaultChecked={editingStation ? editingStation.is_active : true}
                    className="w-5 h-5 accent-[var(--accent,#4f46e5)]"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-black uppercase text-gray-400 dark:text-gray-500 mb-2 block ml-1">Assign Staff Personnel</label>
                  <select name="staff" multiple defaultValue={editingStation?.staff || []} className="w-full p-4 bg-gray-50 dark:bg-slate-700 dark:text-gray-100 rounded-2xl border-2 border-transparent focus:border-[var(--accent,#4f46e5)] outline-none font-bold text-sm h-48 scrollbar-hide">
                    {staffMembers.map(u => (
                      <option key={u.id} value={u.id} className="p-3 rounded-xl mb-1 font-bold text-gray-600 dark:text-gray-300 checked:bg-[var(--accent,#4f46e5)] checked:text-white transition-all">
                        {u.username}
                      </option>
                    ))}
                  </select>
                </div>

                <button className="w-full bg-gray-900 dark:bg-slate-700 text-white p-5 rounded-3xl font-black text-sm hover:bg-[var(--accent,#4f46e5)] transition-all shadow-xl shadow-[color-mix(in_srgb,var(--accent,#4f46e5)_20%,transparent)] dark:shadow-none flex items-center justify-center gap-2">
                  {editingStation ? <Edit3 size={18} /> : <Plus size={18} />}
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