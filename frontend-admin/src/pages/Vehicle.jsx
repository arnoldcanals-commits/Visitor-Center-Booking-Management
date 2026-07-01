import React, { useState, useEffect, useContext } from 'react';
import api from '../api'; // Your axios instance
import { AuthContext } from '../contexts/AuthContext'; // Pull in your auth context

export default function VehicleManager() {
  const { authTokens } = useContext(AuthContext); // Grab the JWT tokens

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [formData, setFormData] = useState({
    title: '', desc: '', category: '', sub_category: '', categorydesc: '',
    vehicle_name: '', plate_number: '', capacity: 1, driver: '',
    owner: '', affiliate: '', status: 'available',
    is_active: true, is_archived: false
  });

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
      const res = await api.get('api/vehicle/', authHeader());
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
      setFormData({ 
        ...item, 
        is_active: item.is_active ?? true,
        is_archived: item.is_archived ?? false
      });
    } else {
      setEditingItem(null);
      setFormData({
        title: '', desc: '', category: '', sub_category: '', categorydesc: '',
        vehicle_name: '', plate_number: '', capacity: 1, driver: '',
        owner: '', affiliate: '', status: 'available',
        is_active: true, is_archived: false
      });
    }
    setIsModalOpen(true);
  };

  // ─────────────────────────────────────────────
  // CREATE & UPDATE
  // ─────────────────────────────────────────────
  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingItem) {
        await api.put(`api/vehicle/${editingItem.id}/`, formData, authHeader());
      } else {
        await api.post('api/vehicle/', formData, authHeader());
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
      await api.delete(`api/vehicle/${id}/`, authHeader());
      fetchItems();
    } catch (err) {
      alert(err.response?.data?.detail || 'Failed to delete item');
    }
  };

  if (loading) return <div className="p-8 text-center text-gray-500">Loading fleet metrics...</div>;
  if (error) return <div className="p-8 text-center text-red-500">Error: {error}</div>;

  return (
    <div className="p-4 max-w-7xl mx-auto font-sans text-gray-800">
      {/* Header Controls */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">Fleet Registry</h1>
          <p className="text-sm text-gray-500">Manage operational physical vehicle assets</p>
        </div>
        <button
          onClick={() => openModal()}
          className="bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-2 px-4 rounded-lg shadow-sm transition-all"
        >
          + Add Vehicle
        </button>
      </div>

      {/* Grid Dashboard Display */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {items.map((item) => (
          <div key={item.id} className="bg-white border border-gray-100 rounded-xl shadow-sm hover:shadow-md transition-shadow p-5 flex flex-col justify-between">
            <div>
              <div className="flex justify-between items-start mb-2">
                <div className="flex items-center space-x-2">
                    {/* Status Badges matched to model choices */}
                    <span className={`text-xs px-2.5 py-1 font-semibold rounded-full ${
                      item.status === 'available' ? 'bg-green-50 text-green-700' :
                      item.status === 'on_trip' ? 'bg-blue-50 text-blue-700' : 'bg-amber-50 text-amber-700'
                    }`}>{item.status === 'on_trip' ? 'On Trip' : item.status === 'available' ? 'Available' : 'Maintenance'}</span>

                    {/* Active/Pulse State */}
                    {item.is_active && (
                    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                        Active
                    </span>
                    )}

                    {/* Archive Flag */}
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
                <p><strong>Assigned Driver:</strong> {item.driver}</p>
                <p><strong>Capacity Threshold:</strong> {item.capacity} seats max</p>
                <p><strong>Owner:</strong> {item.owner}</p>
                <p><strong>Affiliate:</strong> {item.affiliate}</p>
              </div>
            </div>

            <div className="flex items-center justify-end space-x-2 border-t border-gray-50 pt-4 mt-4">
              <button onClick={() => openModal(item)} className="text-sm font-medium text-gray-600 hover:text-indigo-600 px-3 py-1.5 rounded-md hover:bg-gray-50 transition-colors">Edit</button>
              <button onClick={() => handleDelete(item.id)} className="text-sm font-medium text-red-600 hover:text-red-700 px-3 py-1.5 rounded-md hover:bg-red-50 transition-colors">Delete</button>
            </div>
          </div>
        ))}
      </div>

      {/* Unified Input Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">
              {editingItem ? 'Modify Asset Profile' : 'Register Core Fleet Asset'}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold uppercase text-gray-500 mb-1">Asset Title / Tag</label>
                  <input type="text" name="title" value={formData.title} onChange={handleChange} required className="w-full border border-gray-200 rounded-lg p-2 text-sm focus:outline-none focus:border-indigo-500" />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase text-gray-500 mb-1">Vehicle Model / Name</label>
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
                  <label className="block text-xs font-semibold uppercase text-gray-500 mb-1">Driver</label>
                  <input type="text" name="driver" value={formData.driver} onChange={handleChange} required className="w-full border border-gray-200 rounded-lg p-2 text-sm focus:outline-none focus:border-indigo-500" />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase text-gray-500 mb-1">Operational Status</label>
                  <select name="status" value={formData.status} onChange={handleChange} className="w-full border border-gray-200 rounded-lg p-2 text-sm focus:outline-none focus:border-indigo-500 bg-white">
                    <option value="available">Available</option>
                    <option value="on_trip">On Trip</option>
                    <option value="Maintenance">Maintenance</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase text-gray-500 mb-1">Capacity Limits (1-50)</label>
                  <input type="number" name="capacity" min="1" max="50" value={formData.capacity} onChange={handleChange} required className="w-full border border-gray-200 rounded-lg p-2 text-sm focus:outline-none focus:border-indigo-500" />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold uppercase text-gray-500 mb-1">Legal Owner</label>
                  <input type="text" name="owner" value={formData.owner} onChange={handleChange} required className="w-full border border-gray-200 rounded-lg p-2 text-sm focus:outline-none focus:border-indigo-500" />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase text-gray-500 mb-1">Affiliate Branch</label>
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
                <label className="block text-xs font-semibold uppercase text-gray-500 mb-1">Category Classification Info</label>
                <textarea name="categorydesc" rows="2" value={formData.categorydesc || ''} onChange={handleChange} className="w-full border border-gray-200 rounded-lg p-2 text-sm focus:outline-none focus:border-indigo-500" />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase text-gray-500 mb-1">General Notes / Details</label>
                <textarea name="desc" rows="2" value={formData.desc || ''} onChange={handleChange} className="w-full border border-gray-200 rounded-lg p-2 text-sm focus:outline-none focus:border-indigo-500" />
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end space-x-3 border-t border-gray-100 pt-4 mt-6">
                <button type="button" onClick={() => setIsModalOpen(false)} className="bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium py-2 px-4 rounded-lg text-sm transition-colors">Cancel</button>
                <button type="submit" className="bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-2 px-4 rounded-lg text-sm transition-all shadow-sm">
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