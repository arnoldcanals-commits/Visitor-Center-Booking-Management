import React, { useState, useEffect, useContext, useMemo } from 'react';
import api from '../api';
import { AuthContext } from '../contexts/AuthContext';
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { MapPin, Plus, Trash2, SquarePen, Search, Archive, ArchiveRestore, ChevronDown } from "lucide-react";

const LOCATION_ENDPOINT = 'api/admin-transport/location/'; // adjust to match your router

const emptyFormData = {
  name: '', latitude: '', longitude: '', address: '',
  is_active: true, is_archived: false,
};

// Default map center — used when no coordinates exist yet
const DEFAULT_CENTER = [14.35, 121.05];
const DEFAULT_ZOOM = 11;

// Custom marker icon (avoids the broken default-icon path issue with bundlers)
const pinIcon = L.divIcon({
  className: '',
  html: `<div style="
    width: 26px; height: 26px; border-radius: 50% 50% 50% 0;
    background: var(--accent, #3b82f6); transform: rotate(-45deg);
    border: 2px solid white; box-shadow: 0 1px 4px rgba(0,0,0,0.4);
  "></div>`,
  iconSize: [26, 26],
  iconAnchor: [13, 26],
});

// --- Click-to-place picker used inside the modal form ---
function LocationPicker({ latitude, longitude, onPick }) {
  useMapEvents({
    click(e) {
      onPick(e.latlng.lat, e.latlng.lng);
    },
  });

  const hasPosition = latitude !== '' && longitude !== '' && latitude != null && longitude != null;

  return hasPosition ? (
    <Marker
      position={[parseFloat(latitude), parseFloat(longitude)]}
      icon={pinIcon}
      draggable
      eventHandlers={{
        dragend: (e) => {
          const { lat, lng } = e.target.getLatLng();
          onPick(lat, lng);
        },
      }}
    />
  ) : null;
}

export default function LocationManager() {
  const { authTokens } = useContext(AuthContext);

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [formData, setFormData] = useState(emptyFormData);

  // ─────────────────────────────────────────────
  // FILTER STATE
  // ─────────────────────────────────────────────
  const [searchTerm, setSearchTerm] = useState('');
  const [showArchived, setShowArchived] = useState(false);

  // Which item's inline map is expanded (id or null)
  const [expandedId, setExpandedId] = useState(null);

  const authHeader = () => ({
    headers: { Authorization: `Bearer ${authTokens?.access}` },
  });

  const fetchItems = async () => {
    try {
      setLoading(true);
      const res = await api.get(LOCATION_ENDPOINT, authHeader());
      setItems(res.data.results ?? res.data);
      setError(null);
    } catch (err) {
      setError(err.response?.data?.detail || err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (authTokens) fetchItems();
  }, [authTokens]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
  };

  const handlePick = (lat, lng) => {
    setFormData(prev => ({
      ...prev,
      latitude: lat.toFixed(6),
      longitude: lng.toFixed(6),
    }));
  };

  const openModal = (item = null) => {
    if (item) {
      setEditingItem(item);
      setFormData({
        name: item.name || '',
        latitude: item.latitude ?? '',
        longitude: item.longitude ?? '',
        address: item.address || '',
        is_active: item.is_active ?? true,
        is_archived: item.is_archived ?? false,
      });
    } else {
      setEditingItem(null);
      setFormData(emptyFormData);
    }
    setIsModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingItem) {
        await api.put(`${LOCATION_ENDPOINT}${editingItem.id}/`, formData, authHeader());
      } else {
        await api.post(LOCATION_ENDPOINT, formData, authHeader());
      }
      setIsModalOpen(false);
      fetchItems();
    } catch (err) {
      alert(err.response?.data?.detail || 'Failed to save location. Check constraints.');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this location?')) return;
    try {
      await api.delete(`${LOCATION_ENDPOINT}${id}/`, authHeader());
      fetchItems();
    } catch (err) {
      alert(err.response?.data?.detail || 'Failed to delete location');
    }
  };

  const toggleExpanded = (id) => {
    setExpandedId((prev) => (prev === id ? null : id));
  };

  // ─────────────────────────────────────────────
  // FILTERING — search + archived visibility
  // ─────────────────────────────────────────────
  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      if (!showArchived && item.is_archived) return false;

      if (searchTerm.trim()) {
        const term = searchTerm.trim().toLowerCase();
        const haystack = [item.name, item.address].filter(Boolean).join(' ').toLowerCase();
        if (!haystack.includes(term)) return false;
      }

      return true;
    });
  }, [items, searchTerm, showArchived]);

  const archivedCount = items.filter((i) => i.is_archived).length;

  // Center/zoom for the picker map inside the modal
  const pickerCenter = formData.latitude && formData.longitude
    ? [parseFloat(formData.latitude), parseFloat(formData.longitude)]
    : DEFAULT_CENTER;
  const pickerZoom = formData.latitude && formData.longitude ? 15 : DEFAULT_ZOOM;

  if (loading) return <div className="p-8 text-center text-gray-500 dark:text-gray-400">Loading locations...</div>;
  if (error) return <div className="p-8 text-center text-red-500 dark:text-red-400">Error: {error}</div>;

  return (
    <div className=" mx-auto font-sans text-gray-800 dark:text-gray-200">
      <div className="flex justify-between items-center mb-4 bg-white dark:bg-gray-900 p-4 rounded-xl shadow border border-transparent dark:border-gray-800">
        <div className="flex items-center gap-2 p-3 bg-teal-50 text-teal-600 dark:bg-teal-950/30 dark:text-teal-400 rounded-xl w-fit border border-purple-100 dark:border-purple-950/30">
          <MapPin size={18} />
          <span className="text-sm font-black uppercase tracking-tight">Location Registry</span>
        </div>
        <button
          onClick={() => openModal()}
          style={{ backgroundColor: 'var(--accent)' }}
          className="hover:opacity-90 text-white font-medium py-2 px-4 rounded-lg shadow-sm transition-all flex items-center gap-1.5"
        >
          <Plus size={16} /> Add Location
        </button>
      </div>

      {/* Filter row */}
      <div className="bg-white dark:bg-gray-900 p-4 rounded-xl shadow mb-4 border border-transparent dark:border-gray-800">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search name or address..."
              className="w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-gray-100 rounded-lg pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[color:var(--accent)]"
            />
          </div>

          <button
            onClick={() => setShowArchived((v) => !v)}
            className={`flex items-center gap-1.5 py-2 px-3 rounded-lg text-sm font-medium border transition-colors ${
              showArchived
                ? 'text-white border-transparent'
                : 'border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'
            }`}
            style={showArchived ? { backgroundColor: 'var(--accent)' } : undefined}
          >
            {showArchived ? <ArchiveRestore size={15} /> : <Archive size={15} />}
            {showArchived ? 'Hide archived' : 'Show archived'}
            {archivedCount > 0 && (
              <span className={`ml-1 text-xs rounded-full px-1.5 ${showArchived ? 'bg-white/20' : 'bg-gray-100 dark:bg-gray-700'}`}>
                {archivedCount}
              </span>
            )}
          </button>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-900 rounded-xl shadow border border-transparent dark:border-gray-800">
        {filteredItems.length === 0 ? (
          <div className="p-10 flex flex-col items-center justify-center text-center text-gray-400 dark:text-gray-500">
            <MapPin size={32} className="mb-2 opacity-50" />
            <p className="text-sm font-medium">
              {items.length === 0 ? 'No locations yet.' : 'No locations match your filters.'}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100 dark:divide-gray-800">
            {filteredItems.map((item) => {
              const isExpanded = expandedId === item.id;
              const hasCoords = item.latitude != null && item.longitude != null && item.latitude !== '' && item.longitude !== '';

              return (
                <div key={item.id}>
                  <div
                    className="flex items-center gap-4 p-4 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
                    onClick={() => toggleExpanded(item.id)}
                  >
                    <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-teal-50 text-teal-600 dark:bg-teal-950/30 dark:text-teal-400 shrink-0">
                      <MapPin size={18} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-sm font-bold text-gray-900 dark:text-gray-100">{item.name}</h3>
                      <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                        {item.address || `${item.latitude}, ${item.longitude}`}
                      </p>
                    </div>
                    <div className="flex items-center gap-1.5 flex-wrap shrink-0">
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
                    <div className="flex items-center gap-2 shrink-0" onClick={(e) => e.stopPropagation()}>
                      <button onClick={() => openModal(item)} className="text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-[color:var(--accent)] px-3 py-1.5 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                        <SquarePen size={18} />
                      </button>
                      <button onClick={() => handleDelete(item.id)} className="text-sm font-medium text-red-600 dark:text-red-400 hover:text-red-700 px-3 py-1.5 rounded-md hover:bg-red-50 dark:hover:bg-red-950/20 transition-colors">
                        <Trash2 size={18} />
                      </button>
                    </div>
                    <ChevronDown
                      size={16}
                      className={`text-gray-400 shrink-0 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                    />
                  </div>

                  {isExpanded && (
                    <div className="px-4 pb-4">
                      {hasCoords ? (
                        <div className="rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700">
                          <MapContainer
                            center={[parseFloat(item.latitude), parseFloat(item.longitude)]}
                            zoom={15}
                            style={{ height: '260px', width: '100%' }}
                            scrollWheelZoom={false}
                          >
                            <TileLayer
                              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                            />
                            <Marker
                              position={[parseFloat(item.latitude), parseFloat(item.longitude)]}
                              icon={pinIcon}
                            />
                          </MapContainer>
                        </div>
                      ) : (
                        <p className="text-xs text-gray-400 dark:text-gray-500 italic px-1">
                          No coordinates set for this location.
                        </p>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-900 rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto p-6 border border-transparent dark:border-gray-800">
            <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-4">
              {editingItem ? 'Edit Location' : 'Add Location'}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase text-gray-500 dark:text-gray-400 mb-1">Name</label>
                <input type="text" name="name" value={formData.name} onChange={handleChange} required className="w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-gray-100 rounded-lg p-2 text-sm focus:outline-none focus:ring-1 focus:ring-[color:var(--accent)]" />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase text-gray-500 dark:text-gray-400 mb-1">
                  Pin location on map
                </label>
                <div className="rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700">
                  <MapContainer
                    center={pickerCenter}
                    zoom={pickerZoom}
                    style={{ height: '260px', width: '100%' }}
                  >
                    <TileLayer
                      attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                      url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    />
                    <LocationPicker
                      latitude={formData.latitude}
                      longitude={formData.longitude}
                      onPick={handlePick}
                    />
                  </MapContainer>
                </div>
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                  Click the map to place the pin, or drag it to adjust.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold uppercase text-gray-500 dark:text-gray-400 mb-1">Latitude</label>
                  <input type="number" step="any" name="latitude" value={formData.latitude} onChange={handleChange} required className="w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-gray-100 rounded-lg p-2 text-sm focus:outline-none focus:ring-1 focus:ring-[color:var(--accent)]" />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase text-gray-500 dark:text-gray-400 mb-1">Longitude</label>
                  <input type="number" step="any" name="longitude" value={formData.longitude} onChange={handleChange} required className="w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-gray-100 rounded-lg p-2 text-sm focus:outline-none focus:ring-1 focus:ring-[color:var(--accent)]" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase text-gray-500 dark:text-gray-400 mb-1">Address</label>
                <input type="text" name="address" value={formData.address || ''} onChange={handleChange} className="w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-gray-100 rounded-lg p-2 text-sm focus:outline-none focus:ring-1 focus:ring-[color:var(--accent)]" />
              </div>
              <div className="flex items-center space-x-4">
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input type="checkbox" name="is_active" checked={formData.is_active} onChange={handleChange} className="h-4 w-4 border-gray-300 dark:border-gray-600 rounded focus:ring-1 focus:ring-[color:var(--accent)]" style={{ color: 'var(--accent)' }} />
                  <span className="text-xs font-semibold uppercase text-gray-500 dark:text-gray-400">Active</span>
                </label>
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input type="checkbox" name="is_archived" checked={formData.is_archived} onChange={handleChange} className="h-4 w-4 border-gray-300 dark:border-gray-600 rounded focus:ring-1 focus:ring-[color:var(--accent)]" style={{ color: 'var(--accent)' }} />
                  <span className="text-xs font-semibold uppercase text-gray-500 dark:text-gray-400">Archived</span>
                </label>
              </div>

              <div className="flex justify-end space-x-3 border-t border-gray-100 dark:border-gray-800 pt-4 mt-6">
                <button type="button" onClick={() => setIsModalOpen(false)} className="bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 font-medium py-2 px-4 rounded-lg text-sm transition-colors">Cancel</button>
                <button type="submit" style={{ backgroundColor: 'var(--accent)' }} className="hover:opacity-90 text-white font-medium py-2 px-4 rounded-lg text-sm transition-all shadow-sm">
                  {editingItem ? 'Save Updates' : 'Add Location'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}