import React, { useState, useEffect, useContext, useMemo } from 'react';
import api from '../api'; // Your axios instance
import { AuthContext } from '../contexts/AuthContext'; // Pull in your auth context
import { Link } from 'react-router-dom';
import {
  Car, Search, LayoutGrid, List, ChevronLeft, ChevronRight, SlidersHorizontal, Trash2, SquarePen, MapPinned
} from "lucide-react";

// NOTE: adjust these to match your actual router registration for the admin viewsets
const VEHICLE_ENDPOINT = 'api/admin-transport/vehicle/';
const DRIVER_ENDPOINT = 'api/admin-transport/driver/';

const emptyFormData = {
  title: '', desc: '', category: '', sub_category: '', categorydesc: '',
  vehicle_name: '', plate_number: '', capacity: 1, driver_id: '',
  owner: '', affiliate: '', status: 'available',
  is_active: true, is_archived: false,
};

// --- Never surface a removed/deactivated driver's real name ---
const driverLabel = (driver) => {
  if (!driver) return '—';
  if (driver.is_active === false) return 'Driver removed';
  const fullName = `${driver.first_name || ''} ${driver.last_name || ''}`.trim();
  return fullName || driver.username || driver.email || `User #${driver.id}`;
};

export default function VehicleManager() {
  const { authTokens } = useContext(AuthContext); // Grab the JWT tokens

  const [items, setItems] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [formData, setFormData] = useState(emptyFormData);

  // ─────────────────────────────────────────────
  // FILTER / VIEW / PAGINATION STATE
  // ─────────────────────────────────────────────
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [viewMode, setViewMode] = useState('list');  // list | grid
  const [currentPage, setCurrentPage] = useState(1);
  const [entriesPerPage, setEntriesPerPage] = useState(10);

  // ─────────────────────────────────────────────
  // AUTH HEADER HELPER
  // ─────────────────────────────────────────────
  const authHeader = () => ({
    headers: {
      Authorization: `Bearer ${authTokens?.access}`,
    },
  });

  // ─────────────────────────────────────────────
  // READ — fetch all vehicle records
  // ─────────────────────────────────────────────
  const fetchItems = async () => {
    try {
      setLoading(true);
      const res = await api.get(VEHICLE_ENDPOINT, authHeader());
      setItems(res.data.results ?? res.data); // Handles both paginated and non-paginated
      setError(null);
    } catch (err) {
      setError(err.response?.data?.detail || err.message);
    } finally {
      setLoading(false);
    }
  };

  // ─────────────────────────────────────────────
  // READ — fetch drivers for the assignment dropdown
  // ─────────────────────────────────────────────
  const fetchDrivers = async () => {
    try {
      const res = await api.get(DRIVER_ENDPOINT, authHeader());
      setDrivers(res.data.results ?? res.data);
    } catch (err) {
      console.error('Failed to load drivers:', err);
    }
  };

  useEffect(() => {
    if (authTokens) {
      fetchItems();
      fetchDrivers();
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
        vehicle_name: item.vehicle_name || '',
        plate_number: item.plate_number || '',
        capacity: item.capacity ?? 1,
        driver_id: item.driver?.id ?? '',
        owner: item.owner || '',
        affiliate: item.affiliate || '',
        status: item.status || 'available',
        is_active: item.is_active ?? true,
        is_archived: item.is_archived ?? false,
      });
    } else {
      setEditingItem(null);
      setFormData(emptyFormData);
    }
    setIsModalOpen(true);
  };

  // ─────────────────────────────────────────────
  // CREATE & UPDATE
  // ─────────────────────────────────────────────
  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      // driver_id must be null (not '') when unassigned, since the FK allows null
      const payload = {
        ...formData,
        driver_id: formData.driver_id === '' ? null : formData.driver_id,
      };
      if (editingItem) {
        await api.put(`${VEHICLE_ENDPOINT}${editingItem.id}/`, payload, authHeader());
      } else {
        await api.post(VEHICLE_ENDPOINT, payload, authHeader());
      }
      setIsModalOpen(false);
      fetchItems();
    } catch (err) {
      alert(err.response?.data?.detail || 'Failed to save record. Check constraints.');
    }
  };

  // ─────────────────────────────────────────────
  // DELETE
  // ─────────────────────────────────────────────
  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this vehicle record?')) return;
    try {
      await api.delete(`${VEHICLE_ENDPOINT}${id}/`, authHeader());
      fetchItems();
    } catch (err) {
      alert(err.response?.data?.detail || 'Failed to delete item');
    }
  };

  // ─────────────────────────────────────────────
  // FILTERING
  // Search across title/vehicle/driver/plate/owner,
  // plus a status filter.
  // ─────────────────────────────────────────────
  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      if (searchTerm.trim()) {
        const term = searchTerm.trim().toLowerCase();
        const haystack = [
          item.title, item.vehicle_name, driverLabel(item.driver), item.plate_number,
          item.category, item.sub_category, item.owner, item.affiliate
        ].filter(Boolean).join(' ').toLowerCase();
        if (!haystack.includes(term)) return false;
      }

      if (statusFilter !== 'All' && item.status !== statusFilter) return false;

      return true;
    });
  }, [items, searchTerm, statusFilter]);

  // Reset to page 1 whenever filters or page size change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, statusFilter, entriesPerPage]);

  const totalPages = Math.max(1, Math.ceil(filteredItems.length / entriesPerPage));
  const safePage = Math.min(currentPage, totalPages);
  const pageStart = (safePage - 1) * entriesPerPage;
  const pagedItems = filteredItems.slice(pageStart, pageStart + entriesPerPage);

  const hasActiveFilters = searchTerm.trim() !== '' || statusFilter !== 'All';

  const clearFilters = () => {
    setSearchTerm('');
    setStatusFilter('All');
  };

  const statusBadgeClass = (status) =>
    status === 'available' ? 'bg-green-50 text-green-700 dark:bg-green-950/40 dark:text-green-400' :
    status === 'on_trip' ? 'bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400' : 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400';

  const statusLabel = (status) =>
    status === 'on_trip' ? 'On Trip' : status === 'available' ? 'Available' : 'Maintenance';

  if (loading) return <div className="p-8 text-center text-gray-500 dark:text-gray-400">Loading fleet metrics...</div>;
  if (error) return <div className="p-8 text-center text-red-500 dark:text-red-400">Error: {error}</div>;

  return (
    <div className="max-w-7xl mx-auto font-sans text-gray-800 dark:text-gray-200">
      {/* Header Controls */}
      <div className="flex justify-between items-center mb-4 bg-white dark:bg-gray-900 p-4 rounded-xl shadow border border-transparent dark:border-gray-800">
        <div className="flex items-center gap-2 p-3 bg-teal-50 text-teal-600 dark:bg-teal-950/30 dark:text-teal-400 rounded-xl w-fit border border-purple-100 dark:border-purple-950/30">
          <Car size={18} />
          <span className="text-sm font-black uppercase tracking-tight">Vehicle Registry</span>
        </div>
        <div className="flex items-center gap-2">
    
          <button
            onClick={() => openModal()}
            style={{ backgroundColor: 'var(--accent)' }}
            className="hover:opacity-90 text-white font-medium py-2 px-4 rounded-lg shadow-sm transition-all"
          >
            + Add Vehicle
          </button>
        </div>
      </div>

      {/* Filter Row */}
      <div className="bg-white dark:bg-gray-900 p-4 rounded-xl shadow mb-4 border border-transparent dark:border-gray-800">
        <div className="flex flex-wrap items-center gap-3">
          {/* Search */}
          <div className="relative flex-1 min-w-[200px]">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search title, vehicle, driver, plate, owner..."
              className="w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-gray-100 rounded-lg pl-9 pr-3 py-2 text-sm focus:outline-none focus:border-[image:none] focus:ring-1 focus:ring-[color:var(--accent)]"
            />
          </div>

          {/* Status filter */}
          <div className="flex items-center gap-1.5 px-5">
            <SlidersHorizontal size={14} className="text-gray-400 dark:text-gray-500" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="border border-gray-200 dark:border-gray-700 rounded-lg py-2 px-6 text-sm focus:outline-none focus:ring-1 focus:ring-[color:var(--accent)] bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
            >
              <option value="All">All statuses</option>
              <option value="available">Available</option>
              <option value="on_trip">On Trip</option>
              <option value="Maintenance">Maintenance</option>
            </select>
          </div>

          {hasActiveFilters && (
            <button
              onClick={clearFilters}
              className="flex items-center gap-1 text-xs font-medium text-gray-500 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400 py-2 px-2.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/20 transition-colors"
            >
              Clear
            </button>
          )}

          <div className="flex-1" />

          {/* View toggle */}
          <div className="flex items-center border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
            <button
              onClick={() => setViewMode('list')}
              style={viewMode === 'list' ? { backgroundColor: 'var(--accent)' } : {}}
              className={`flex items-center gap-1.5 py-2 px-3 text-sm font-medium transition-colors ${
                viewMode === 'list' ? 'text-white' : 'bg-white dark:bg-gray-800 text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700/50'
              }`}
            >
              <List size={15} /> List
            </button>
            <button
              onClick={() => setViewMode('grid')}
              style={viewMode === 'grid' ? { backgroundColor: 'var(--accent)' } : {}}
              className={`flex items-center gap-1.5 py-2 px-3 text-sm font-medium transition-colors border-l border-gray-200 dark:border-gray-700 ${
                viewMode === 'grid' ? 'text-white' : 'bg-white dark:bg-gray-800 text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700/50'
              }`}
            >
              <LayoutGrid size={15} /> Grid
            </button>
          </div>
        </div>
      </div>

      {/* RESULTS AREA — fixed height so pagination/entry count doesn't cause page bounce */}
      <div className="bg-white dark:bg-gray-900 rounded-xl shadow mb-4 border border-transparent dark:border-gray-800">
        <div className="h-[600px] overflow-y-auto p-5 bg-gray-50 dark:bg-gray-900/40 rounded-t-xl">
          {pagedItems.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center text-gray-400 dark:text-gray-500">
              <Car size={32} className="mb-2 opacity-50" />
              <p className="text-sm font-medium">No vehicle records match your filters.</p>
              {hasActiveFilters && (
                <button onClick={clearFilters} style={{ color: 'var(--accent)' }} className="mt-2 text-xs font-medium hover:opacity-80">
                  Clear filters
                </button>
              )}
            </div>
          ) : viewMode === 'grid' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {pagedItems.map((item) => (
                <div key={item.id} className="bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-xl shadow-sm hover:shadow-md transition-shadow p-5 flex flex-col justify-between">
                  <div>
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex items-center space-x-2 flex-wrap gap-y-1">
                        <span className={`text-xs px-2.5 py-1 font-semibold rounded-full ${statusBadgeClass(item.status)}`}>{statusLabel(item.status)}</span>
                        {item.is_active && (
                          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-900/50">
                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                            Active
                          </span>
                        )}
                        {item.is_archived && (
                          <span className="text-xs px-2 py-0.5 font-medium bg-gray-100 text-gray-600 rounded-md border border-gray-200 dark:bg-gray-700 dark:text-gray-400 dark:border-gray-600">Archived</span>
                        )}
                      </div>
                      <span className="text-xs font-mono text-gray-400 dark:text-gray-500">{item.plate_number}</span>
                    </div>

                    <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-1">{item.vehicle_name}</h3>
                    <p style={{ color: 'var(--accent)' }} className="text-xs font-medium uppercase tracking-wider mb-3">{item.category} • {item.sub_category || 'General'}</p>

                    <div className="text-sm space-y-1 text-gray-600 dark:text-gray-400 border-t border-gray-50 dark:border-gray-700/50 pt-3">
                      <p><strong className="dark:text-gray-300">Assigned Driver:</strong> {driverLabel(item.driver)}</p>
                      <p><strong className="dark:text-gray-300">Capacity Threshold:</strong> {item.capacity} seats max</p>
                      <p><strong className="dark:text-gray-300">Owner:</strong> {item.owner}</p>
                      <p><strong className="dark:text-gray-300">Affiliate:</strong> {item.affiliate}</p>
                    </div>
                  </div>

                  <div className="flex items-center justify-end space-x-2 border-t border-gray-50 dark:border-gray-700/50 pt-4 mt-4">
                    <button onClick={() => openModal(item)} className="text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-[color:var(--accent)] dark:hover:text-[color:var(--accent)] px-3 py-1.5 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">Edit</button>
                    <button onClick={() => handleDelete(item.id)} className="text-sm font-medium text-red-600 dark:text-red-400 hover:text-red-700 px-3 py-1.5 rounded-md hover:bg-red-50 dark:hover:bg-red-950/20 transition-colors">Delete</button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-3">
              {pagedItems.map((item) => (
                <div key={item.id} className="bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-xl shadow-sm p-4 flex flex-wrap md:flex-nowrap items-center gap-4 hover:shadow-md transition-shadow">
                  <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-teal-50 text-teal-600 dark:bg-teal-950/30 dark:text-teal-400 shrink-0">
                    <Car size={18} />
                  </div>
                  <div className="min-w-[160px]">
                    <h3 className="text-sm font-bold text-gray-900 dark:text-gray-100">{item.vehicle_name}</h3>
                    <p className="text-xs text-gray-400 dark:text-gray-500 font-mono">{item.plate_number}</p>
                  </div>
                  <div className="flex items-center gap-1.5 flex-wrap min-w-[140px]">
                    <span className={`text-xs px-2.5 py-1 font-semibold rounded-full ${statusBadgeClass(item.status)}`}>{statusLabel(item.status)}</span>
                    {item.is_active && (
                      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-900/50">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                        Active
                      </span>
                    )}
                    {item.is_archived && (
                      <span className="text-xs px-2 py-0.5 font-medium bg-gray-100 text-gray-600 rounded-md border border-gray-200 dark:bg-gray-700 dark:text-gray-400 dark:border-gray-600">Archived</span>
                    )}
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 min-w-[130px]">
                    <p style={{ color: 'var(--accent)' }} className="font-medium uppercase tracking-wider">{item.category} • {item.sub_category || 'General'}</p>
                    <p className="text-gray-600 dark:text-gray-400 mt-0.5">Driver: {driverLabel(item.driver)}</p>
                  </div>
                  <div className="text-xs text-gray-600 dark:text-gray-400 flex-1 min-w-[160px]">
                    Owner: {item.owner} • Affiliate: {item.affiliate}
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 min-w-[110px]">
                    Capacity: {item.capacity} seats
                  </div>
                  <div className="flex items-center gap-2 ml-auto shrink-0">
                    <button onClick={() => openModal(item)} className="text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-[color:var(--accent)] dark:hover:text-[color:var(--accent)] px-3 py-1.5 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                      <SquarePen size={20}/>
                    </button>
                    <button onClick={() => handleDelete(item.id)} className="text-sm font-medium text-red-600 dark:text-red-400 hover:text-red-700 px-3 py-1.5 rounded-md hover:bg-red-50 dark:hover:bg-red-950/20 transition-colors">
                      <Trash2 size={20}/>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* PAGINATION FOOTER */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-gray-100 dark:border-gray-800 px-5 py-3">
          <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
            <span>
              {filteredItems.length === 0
                ? 'Showing 0 of 0'
                : `Showing ${pageStart + 1}–${Math.min(pageStart + entriesPerPage, filteredItems.length)} of ${filteredItems.length}`}
            </span>
            <select
              value={entriesPerPage}
              onChange={(e) => setEntriesPerPage(Number(e.target.value))}
              className="border border-gray-200 dark:border-gray-700 rounded-lg py-1 px-2 text-xs focus:outline-none focus:ring-1 focus:ring-[color:var(--accent)] bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 px-6"
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
              className="p-1.5 rounded-md border border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeft size={15} />
            </button>
            <span className="text-xs text-gray-600 dark:text-gray-400 px-2">
              Page {safePage} of {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={safePage === totalPages}
              className="p-1.5 rounded-md border border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronRight size={15} />
            </button>
          </div>
        </div>
      </div>

      {/* Unified Input Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-900 rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6 border border-transparent dark:border-gray-800">
            <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-4">
              {editingItem ? 'Modify Asset Profile' : 'Register Core Fleet Asset'}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold uppercase text-gray-500 dark:text-gray-400 mb-1">Asset Title / Tag</label>
                  <input type="text" name="title" value={formData.title} onChange={handleChange} required className="w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-gray-100 rounded-lg p-2 text-sm focus:outline-none focus:ring-1 focus:ring-[color:var(--accent)]" />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase text-gray-500 dark:text-gray-400 mb-1">Vehicle Model / Name</label>
                  <input type="text" name="vehicle_name" value={formData.vehicle_name} onChange={handleChange} required className="w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-gray-100 rounded-lg p-2 text-sm focus:outline-none focus:ring-1 focus:ring-[color:var(--accent)]" />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold uppercase text-gray-500 dark:text-gray-400 mb-1">Category</label>
                  <input type="text" name="category" value={formData.category} onChange={handleChange} required className="w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-gray-100 rounded-lg p-2 text-sm focus:outline-none focus:ring-1 focus:ring-[color:var(--accent)]" />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase text-gray-500 dark:text-gray-400 mb-1">Sub Category</label>
                  <input type="text" name="sub_category" value={formData.sub_category || ''} onChange={handleChange} className="w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-gray-100 rounded-lg p-2 text-sm focus:outline-none focus:ring-1 focus:ring-[color:var(--accent)]" />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase text-gray-500 dark:text-gray-400 mb-1">Plate Number</label>
                  <input type="text" name="plate_number" value={formData.plate_number} onChange={handleChange} required className="w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-gray-100 rounded-lg p-2 text-sm focus:outline-none focus:ring-1 focus:ring-[color:var(--accent)]" />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold uppercase text-gray-500 dark:text-gray-400 mb-1">Driver</label>
                  <select
                    name="driver_id"
                    value={formData.driver_id}
                    onChange={handleChange}
                    className="w-full border border-gray-200 dark:border-gray-700 rounded-lg p-2 text-sm focus:outline-none focus:ring-1 focus:ring-[color:var(--accent)] bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                  >
                    <option value="">Unassigned</option>
                    {drivers.map((d) => (
                      <option key={d.id} value={d.id}>{driverLabel(d)}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase text-gray-500 dark:text-gray-400 mb-1">Operational Status</label>
                  <select name="status" value={formData.status} onChange={handleChange} className="w-full border border-gray-200 dark:border-gray-700 rounded-lg p-2 text-sm focus:outline-none focus:ring-1 focus:ring-[color:var(--accent)] bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100">
                    <option value="available">Available</option>
                    <option value="on_trip">On Trip</option>
                    <option value="Maintenance">Maintenance</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase text-gray-500 dark:text-gray-400 mb-1">Capacity Limits (1-50)</label>
                  <input type="number" name="capacity" min="1" max="50" value={formData.capacity} onChange={handleChange} required className="w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-gray-100 rounded-lg p-2 text-sm focus:outline-none focus:ring-1 focus:ring-[color:var(--accent)]" />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold uppercase text-gray-500 dark:text-gray-400 mb-1">Legal Owner</label>
                  <input type="text" name="owner" value={formData.owner} onChange={handleChange} required className="w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-gray-100 rounded-lg p-2 text-sm focus:outline-none focus:ring-1 focus:ring-[color:var(--accent)]" />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase text-gray-500 dark:text-gray-400 mb-1">Affiliate Branch</label>
                  <input type="text" name="affiliate" value={formData.affiliate} onChange={handleChange} required className="w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-gray-100 rounded-lg p-2 text-sm focus:outline-none focus:ring-1 focus:ring-[color:var(--accent)]" />
                </div>
                <div className="flex items-center space-x-4 pt-5">
                  <label className="flex items-center space-x-2 cursor-pointer">
                    <input type="checkbox" name="is_active" checked={formData.is_active} onChange={handleChange} className="h-4 w-4 border-gray-300 dark:border-gray-600 rounded focus:ring-1 focus:ring-[color:var(--accent)]" style={{ color: 'var(--accent)' }} />
                    <span className="text-xs font-semibold uppercase text-gray-500 dark:text-gray-400">Active</span>
                  </label>
                  <label className="flex items-center space-x-2 cursor-pointer">
                    <input type="checkbox" name="is_archived" checked={formData.is_archived} onChange={handleChange} className="h-4 w-4 border-gray-300 dark:border-gray-600 rounded focus:ring-1 focus:ring-[color:var(--accent)]" style={{ color: 'var(--accent)' }} />
                    <span className="text-xs font-semibold uppercase text-gray-500 dark:text-gray-400">Archived</span>
                  </label>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase text-gray-500 dark:text-gray-400 mb-1">Category Classification Info</label>
                <textarea name="categorydesc" rows="2" value={formData.categorydesc || ''} onChange={handleChange} className="w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-gray-100 rounded-lg p-2 text-sm focus:outline-none focus:ring-1 focus:ring-[color:var(--accent)]" />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase text-gray-500 dark:text-gray-400 mb-1">General Notes / Details</label>
                <textarea name="desc" rows="2" value={formData.desc || ''} onChange={handleChange} className="w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-gray-100 rounded-lg p-2 text-sm focus:outline-none focus:ring-1 focus:ring-[color:var(--accent)]" />
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end space-x-3 border-t border-gray-100 dark:border-gray-800 pt-4 mt-6">
                <button type="button" onClick={() => setIsModalOpen(false)} className="bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 font-medium py-2 px-4 rounded-lg text-sm transition-colors">Cancel</button>
                <button type="submit" style={{ backgroundColor: 'var(--accent)' }} className="hover:opacity-90 text-white font-medium py-2 px-4 rounded-lg text-sm transition-all shadow-sm">
                  {editingItem ? 'Save Updates' : 'Add Vehicle'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}