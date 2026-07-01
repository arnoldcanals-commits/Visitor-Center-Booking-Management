import React, { useState, useEffect, useContext } from 'react';
import api from '../api'; // Your axios instance, not raw fetch
import { AuthContext } from '../contexts/AuthContext'; // Pull in your auth context
import VehicleManager from './Vehicle';
export default function Transport() {
  const { authTokens } = useContext(AuthContext); // Grab the JWT tokens

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [formData, setFormData] = useState({
    title: '', desc: '', category: '', sub_category: '', categorydesc: '',
    vehicle_name: '', plate_number: '', capacity: 1, driver: '',
    owner: '', affiliate: '', schedule: '', pickup_location: '',
    dropoff_location: '', status: 'Scheduled',
    is_active: true, is_archived: false
  });

  // ─────────────────────────────────────────────
  // AUTH HEADER HELPER
  // Every request needs this header so Django knows
  // who is calling and whether they're an admin.
  // ─────────────────────────────────────────────
  const authHeader = () => ({
    headers: {
      Authorization: `Bearer ${authTokens?.access}`,
    },
  });

  // ─────────────────────────────────────────────
  // READ — fetch all transport records
  // api.get() uses your axios base URL automatically,
  // so no need for the full localhost URL anymore.
  // ─────────────────────────────────────────────
  const fetchItems = async () => {
    try {
      setLoading(true);
      const res = await api.get('api/transportation/', authHeader());
      setItems(res.data.results ?? res.data); // Handles both paginated and non-paginated
      setError(null);
    } catch (err) {
      setError(err.response?.data?.detail || err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (authTokens) fetchItems(); // Only fetch if logged in
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
      const formattedSchedule = item.schedule ? item.schedule.substring(0, 16) : '';
      setFormData({ 
        ...item, 
        schedule: formattedSchedule,
        is_active: item.is_active ?? true,
        is_archived: item.is_archived ?? false
      });
    } else {
      setEditingItem(null);
      setFormData({
        title: '', desc: '', category: '', sub_category: '', categorydesc: '',
        vehicle_name: '', plate_number: '', capacity: 1, driver: '',
        owner: '', affiliate: '', schedule: '', pickup_location: '',
        dropoff_location: '', status: 'Scheduled',
        is_active: true, is_archived: false
      });
    }
    setIsModalOpen(true);
  };

  // ─────────────────────────────────────────────
  // CREATE & UPDATE
  // api.post / api.put both go through your axios
  // instance. The auth header tells Django's
  // IsAdminUser permission class to allow the request.
  // ─────────────────────────────────────────────
  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingItem) {
        await api.put(`api/transportation/${editingItem.id}/`, formData, authHeader());
      } else {
        await api.post('api/transportation/', formData, authHeader());
      }
      setIsModalOpen(false);
      fetchItems();
    } catch (err) {
      alert(err.response?.data?.detail || 'Failed to save record. Check constraints.');
    }
  };

  // ─────────────────────────────────────────────
  // DELETE
  // Same pattern — pass authHeader() as the config.
  // ─────────────────────────────────────────────
  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this transport record?')) return;
    try {
      await api.delete(`api/transportation/${id}/`, authHeader());
      fetchItems();
    } catch (err) {
      alert(err.response?.data?.detail || 'Failed to delete item');
    }
  };

  if (loading) return <div className="p-8 text-center text-gray-500">Loading schedules...</div>;
  if (error) return <div className="p-8 text-center text-red-500">Error: {error}</div>;

  return (
    <div className="p-4 max-w-7xl mx-auto font-sans text-gray-800">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">Transportation Registry</h1>
          <p className="text-sm text-gray-500">Manage transport scheduling and assets</p>
        </div>
        <button
          onClick={() => openModal()}
          className="bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-2 px-4 rounded-lg shadow-sm transition-all"
        >
          + Add Transport
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {items.map((item) => (
          <div key={item.id} className="bg-white border border-gray-100 rounded-xl shadow-sm hover:shadow-md transition-shadow p-5 flex flex-col justify-between">
            <div>
              <div className="flex justify-between items-start mb-2">
                <div className="flex items-center space-x-2">
                    {/* Status Badge */}
                    <span className={`text-xs px-2.5 py-1 font-semibold rounded-full ${
                    item.status === 'Scheduled' ? 'bg-blue-50 text-blue-700' :
                    item.status === 'Departed' ? 'bg-amber-50 text-amber-700' :
                    item.status === 'Cancelled' ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'
                    }`}>{item.status}</span>

                    {/* Green Dot Availability Badge */}
                    {item.is_active && (
                    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                        Available
                    </span>
                    )}

                    {/* Archived Badge */}
                    {item.is_archived && (
                      <span className="text-xs px-2 py-0.5 font-medium bg-gray-100 text-gray-600 rounded-md border border-gray-200">
                        Archived
                      </span>
                    )}
                </div>
                
                <span className="text-xs font-mono text-gray-400">{item.plate_number}</span>
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-1">{item.vehicle_name}</h3>
              <p className="text-xs text-indigo-600 font-medium uppercase tracking-wider mb-3">{item.category} • {item.sub_category || 'General'}</p>
              <div className="text-sm space-y-1 text-gray-600 border-t border-gray-50 pt-3">
                <p><strong>Driver:</strong> {item.driver}</p>
                <p><strong>Capacity:</strong> {item.capacity} max</p>
                <p><strong>Route:</strong> {item.pickup_location} → {item.dropoff_location}</p>
                <p><strong>Time:</strong> {new Date(item.schedule).toLocaleString()}</p>
              </div>
            </div>
            <div className="flex items-center justify-end space-x-2 border-t border-gray-50 pt-4 mt-4">
              <button onClick={() => openModal(item)} className="text-sm font-medium text-gray-600 hover:text-indigo-600 px-3 py-1.5 rounded-md hover:bg-gray-50 transition-colors">Edit</button>
              <button onClick={() => handleDelete(item.id)} className="text-sm font-medium text-red-600 hover:text-red-700 px-3 py-1.5 rounded-md hover:bg-red-50 transition-colors">Delete</button>
            </div>
          </div>
        ))}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">
              {editingItem ? 'Modify Transport Log' : 'Register New Transport Record'}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold uppercase text-gray-500 mb-1">Title / Label</label>
                  <input type="text" name="title" value={formData.title} onChange={handleChange} required className="w-full border border-gray-200 rounded-lg p-2 text-sm focus:outline-none focus:border-indigo-500" />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase text-gray-500 mb-1">Vehicle Name</label>
                  <input type="text" name="vehicle_name" value={formData.vehicle_name} onChange={handleChange} required className="w-full border border-gray-200 rounded-lg p-2 text-sm focus:outline-none focus:border-indigo-500" />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold uppercase text-gray-500 mb-1">Category</label>
                  <input type="text" name="category" value={formData.category} onChange={handleChange} required className="w-full border border-gray-200 rounded-lg p-2 text-sm focus:outline-none focus:border-indigo-500" />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase text-gray-500 mb-1">Sub Category</label>
                  <input type="text" name="sub_category" value={formData.sub_category || ''} onChange={handleChange} className="w-full border border-gray-200 rounded-lg p-2 text-sm focus:outline-none focus:border-indigo-500" />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase text-gray-500 mb-1">Plate Number</label>
                  <input type="text" name="plate_number" value={formData.plate_number} onChange={handleChange} required className="w-full border border-gray-200 rounded-lg p-2 text-sm focus:outline-none focus:border-indigo-500" />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold uppercase text-gray-500 mb-1">Pickup Location</label>
                  <input type="text" name="pickup_location" value={formData.pickup_location} onChange={handleChange} required className="w-full border border-gray-200 rounded-lg p-2 text-sm focus:outline-none focus:border-indigo-500" />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase text-gray-500 mb-1">Dropoff Location</label>
                  <input type="text" name="dropoff_location" value={formData.dropoff_location} onChange={handleChange} required className="w-full border border-gray-200 rounded-lg p-2 text-sm focus:outline-none focus:border-indigo-500" />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase text-gray-500 mb-1">Schedule Date/Time</label>
                  <input type="datetime-local" name="schedule" value={formData.schedule} onChange={handleChange} required className="w-full border border-gray-200 rounded-lg p-2 text-sm focus:outline-none focus:border-indigo-500" />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold uppercase text-gray-500 mb-1">Driver</label>
                  <input type="text" name="driver" value={formData.driver} onChange={handleChange} required className="w-full border border-gray-200 rounded-lg p-2 text-sm focus:outline-none focus:border-indigo-500" />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase text-gray-500 mb-1">Status</label>
                  <select name="status" value={formData.status} onChange={handleChange} className="w-full border border-gray-200 rounded-lg p-2 text-sm focus:outline-none focus:border-indigo-500 bg-white">
                    <option value="Scheduled">Scheduled</option>
                    <option value="Departed">Departed</option>
                    <option value="Cancelled">Cancelled</option>
                    <option value="Completed">Completed</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase text-gray-500 mb-1">Capacity (1-50)</label>
                  <input type="number" name="capacity" min="1" max="50" value={formData.capacity} onChange={handleChange} required className="w-full border border-gray-200 rounded-lg p-2 text-sm focus:outline-none focus:border-indigo-500" />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold uppercase text-gray-500 mb-1">Owner</label>
                  <input type="text" name="owner" value={formData.owner} onChange={handleChange} required className="w-full border border-gray-200 rounded-lg p-2 text-sm focus:outline-none focus:border-indigo-500" />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase text-gray-500 mb-1">Affiliate</label>
                  <input type="text" name="affiliate" value={formData.affiliate} onChange={handleChange} required className="w-full border border-gray-200 rounded-lg p-2 text-sm focus:outline-none focus:border-indigo-500" />
                </div>
                <div className="flex items-center space-x-4 pt-5">
                  <label className="flex items-center space-x-2 cursor-pointer">
                    <input type="checkbox" name="is_active" checked={formData.is_active} onChange={handleChange} className="h-4 w-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500" />
                    <span className="text-xs font-semibold uppercase text-gray-500">Active</span>
                  </label>
                  <label className="flex items-center space-x-2 cursor-pointer">
                    <input type="checkbox" name="is_archived" checked={formData.is_archived} onChange={handleChange} className="h-4 w-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500" />
                    <span className="text-xs font-semibold uppercase text-gray-500">Archived</span>
                  </label>
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase text-gray-500 mb-1">Category Description</label>
                <textarea name="categorydesc" rows="2" value={formData.categorydesc || ''} onChange={handleChange} className="w-full border border-gray-200 rounded-lg p-2 text-sm focus:outline-none focus:border-indigo-500" />
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase text-gray-500 mb-1">Description</label>
                <textarea name="desc" rows="2" value={formData.desc || ''} onChange={handleChange} className="w-full border border-gray-200 rounded-lg p-2 text-sm focus:outline-none focus:border-indigo-500" />
              </div>
              <div className="flex justify-end space-x-3 border-t border-gray-100 pt-4 mt-6">
                <button type="button" onClick={() => setIsModalOpen(false)} className="bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium py-2 px-4 rounded-lg text-sm transition-colors">Cancel</button>
                <button type="submit" className="bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-2 px-4 rounded-lg text-sm transition-all shadow-sm">
                  {editingItem ? 'Save Updates' : 'Add Item'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      <VehicleManager/>
    </div>
  );
}