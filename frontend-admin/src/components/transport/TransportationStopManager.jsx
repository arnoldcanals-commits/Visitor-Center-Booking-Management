import React, { useState, useEffect, useContext, useMemo } from 'react';

import api from '../../api';
import { AuthContext } from '../../contexts/AuthContext';

import {
  MapPin, X, Plus, Trash2, SquarePen, ArrowUp, ArrowDown,
  Clock, Save, ChevronDown, ChevronUp
} from "lucide-react";

const toArray = (data) => {
  if (Array.isArray(data)) return data;
  if (data && Array.isArray(data.results)) return data.results;
  return [];
};

const toLocalInputValue = (isoString) => {
  if (!isoString) return '';
  return isoString.substring(0, 16);
};

const emptyStopForm = {
  location_id: '',
  sequence: 0,
  expected_arrival: '',
  expected_departure: '',
  actual_arrival: '',
  actual_departure: '',
  notes: '',
};

/**
 * Manages the ordered list of stops (route) for a single Transportation trip.
 *
 * Props:
 * - transportation: the Transportation object (needs at least `id`, `title`)
 * - isOpen: whether the modal is visible
 * - onClose: called to dismiss the modal
 * - onStopsChanged: optional callback, fired after any create/update/delete/reorder,
 *   so the parent list (e.g. Transport.js) can refetch and pick up the new route
 *   summary / occupied_seats / etc.
 */
export default function TransportationStopManager({ transportation, isOpen, onClose, onStopsChanged }) {
  const { authTokens } = useContext(AuthContext);

  const [stops, setStops] = useState([]);
  const [locations, setLocations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [showAddForm, setShowAddForm] = useState(false);
  const [addFormData, setAddFormData] = useState(emptyStopForm);

  const [editingStopId, setEditingStopId] = useState(null);
  const [editFormData, setEditFormData] = useState(emptyStopForm);

  const [savingId, setSavingId] = useState(null); // stop id (or 'new') currently being saved/deleted

  const authHeader = () => ({
    headers: { Authorization: `Bearer ${authTokens?.access}` },
  });

  const basePath = `api/admin-transport/transportation/${transportation?.id}/stops/`;

  const sortedStops = useMemo(
    () => [...stops].sort((a, b) => a.sequence - b.sequence),
    [stops]
  );

  const nextSuggestedSequence = useMemo(() => {
    if (sortedStops.length === 0) return 0;
    return sortedStops[sortedStops.length - 1].sequence + 10;
  }, [sortedStops]);

  // ─────────────────────────────────────────────
  // FETCH
  // ─────────────────────────────────────────────
  const fetchStops = async () => {
    if (!transportation?.id) return;
    try {
      setLoading(true);
      const res = await api.get(basePath, authHeader());
      setStops(toArray(res.data));
      setError(null);
    } catch (err) {
      setError(err.response?.data?.detail || err.message);
      setStops([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchLocations = async () => {
    try {
      const res = await api.get('api/admin-transport/location/', authHeader());
      setLocations(toArray(res.data));
    } catch (err) {
      console.error('Failed to load locations:', err);
      setLocations([]);
    }
  };

  useEffect(() => {
    if (isOpen && transportation?.id && authTokens) {
      fetchStops();
      fetchLocations();
      setShowAddForm(false);
      setEditingStopId(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, transportation?.id, authTokens]);

  useEffect(() => {
    if (isOpen) {
      setAddFormData((prev) => ({ ...prev, sequence: nextSuggestedSequence }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, nextSuggestedSequence]);

  const notifyChanged = () => {
    if (onStopsChanged) onStopsChanged();
  };

  // ─────────────────────────────────────────────
  // CREATE
  // ─────────────────────────────────────────────
  const handleAddChange = (e) => {
    const { name, value } = e.target;
    setAddFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleAddSubmit = async (e) => {
    e.preventDefault();
    if (!addFormData.location_id) {
      alert('Please select a location for the stop.');
      return;
    }
    setSavingId('new');
    try {
      await api.post(basePath, {
        location_id: addFormData.location_id,
        sequence: Number(addFormData.sequence),
        expected_arrival: addFormData.expected_arrival || null,
        expected_departure: addFormData.expected_departure || null,
        actual_arrival: addFormData.actual_arrival || null,
        actual_departure: addFormData.actual_departure || null,
        notes: addFormData.notes || null,
      }, authHeader());
      setAddFormData({ ...emptyStopForm, sequence: nextSuggestedSequence + 10 });
      setShowAddForm(false);
      await fetchStops();
      notifyChanged();
    } catch (err) {
      alert(err.response?.data?.detail || err.response?.data?.non_field_errors?.[0] || 'Failed to add stop.');
    } finally {
      setSavingId(null);
    }
  };

  // ─────────────────────────────────────────────
  // EDIT
  // ─────────────────────────────────────────────
  const startEdit = (stop) => {
    setEditingStopId(stop.id);
    setEditFormData({
      location_id: stop.location?.id ?? '',
      sequence: stop.sequence,
      expected_arrival: toLocalInputValue(stop.expected_arrival),
      expected_departure: toLocalInputValue(stop.expected_departure),
      actual_arrival: toLocalInputValue(stop.actual_arrival),
      actual_departure: toLocalInputValue(stop.actual_departure),
      notes: stop.notes || '',
    });
  };

  const cancelEdit = () => {
    setEditingStopId(null);
    setEditFormData(emptyStopForm);
  };

  const handleEditChange = (e) => {
    const { name, value } = e.target;
    setEditFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleEditSubmit = async (e, stopId) => {
    e.preventDefault();
    if (!editFormData.location_id) {
      alert('Please select a location for the stop.');
      return;
    }
    setSavingId(stopId);
    try {
      await api.patch(`${basePath}${stopId}/`, {
        location_id: editFormData.location_id,
        sequence: Number(editFormData.sequence),
        expected_arrival: editFormData.expected_arrival || null,
        expected_departure: editFormData.expected_departure || null,
        actual_arrival: editFormData.actual_arrival || null,
        actual_departure: editFormData.actual_departure || null,
        notes: editFormData.notes || null,
      }, authHeader());
      cancelEdit();
      await fetchStops();
      notifyChanged();
    } catch (err) {
      alert(err.response?.data?.detail || err.response?.data?.non_field_errors?.[0] || 'Failed to update stop.');
    } finally {
      setSavingId(null);
    }
  };

  // ─────────────────────────────────────────────
  // DELETE
  // ─────────────────────────────────────────────
  const handleDelete = async (stop) => {
    if (!window.confirm(`Remove stop "${stop.location?.name || 'Unknown'}" (#${stop.sequence}) from this route?`)) return;
    setSavingId(stop.id);
    try {
      await api.delete(`${basePath}${stop.id}/`, authHeader());
      await fetchStops();
      notifyChanged();
    } catch (err) {
      alert(err.response?.data?.detail || 'Failed to remove stop.');
    } finally {
      setSavingId(null);
    }
  };

  // ─────────────────────────────────────────────
  // REORDER — swaps this stop's sequence with its neighbor
  // ─────────────────────────────────────────────
  const moveStop = async (stop, direction) => {
    const idx = sortedStops.findIndex((s) => s.id === stop.id);
    const neighborIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (neighborIdx < 0 || neighborIdx >= sortedStops.length) return;
    const neighbor = sortedStops[neighborIdx];

    setSavingId(stop.id);
    try {
      // Swap sequence values. Two sequential PATCHes — fine for admin-driven reordering
      // of a handful of stops; if this ever needs to be atomic, move it server-side.
      await api.patch(`${basePath}${stop.id}/`, { sequence: neighbor.sequence }, authHeader());
      await api.patch(`${basePath}${neighbor.id}/`, { sequence: stop.sequence }, authHeader());
      await fetchStops();
      notifyChanged();
    } catch (err) {
      alert(err.response?.data?.detail || 'Failed to reorder stops.');
      await fetchStops(); // resync in case one PATCH succeeded and the other failed
    } finally {
      setSavingId(null);
    }
  };

  const formatDateTime = (value) => {
    if (!value) return '—';
    const d = new Date(value);
    if (isNaN(d.getTime())) return '—';
    return d.toLocaleString(undefined, {
      month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit'
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-800 border border-transparent dark:border-gray-700 rounded-xl shadow-xl w-full max-w-3xl max-h-[90vh] overflow-y-auto p-6">

        {/* HEADER */}
        <div className="flex justify-between items-start mb-4">
          <div className="flex items-center gap-2 p-3 bg-gray-50 dark:bg-gray-900 rounded-xl w-fit border border-gray-100 dark:border-gray-700">
            <MapPin size={18} style={{ color: 'var(--accent)' }} />
            <div>
              <span className="text-sm font-black uppercase tracking-tight block">Route Stops</span>
              <span className="text-xs text-gray-500 dark:text-gray-400">{transportation?.title}</span>
            </div>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
            <X size={20} />
          </button>
        </div>

        {error && (
          <div className="mb-4 text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900 rounded-lg p-3">
            {error}
          </div>
        )}

        {/* STOP LIST */}
        {loading ? (
          <div className="p-8 text-center text-gray-500 dark:text-gray-400 text-sm">Loading stops...</div>
        ) : sortedStops.length === 0 ? (
          <div className="p-8 text-center text-gray-400 dark:text-gray-500">
            <MapPin size={28} className="mx-auto mb-2 opacity-50" />
            <p className="text-sm font-medium">No stops on this route yet.</p>
            <p className="text-xs mt-1">Add the first stop below — that becomes the origin.</p>
          </div>
        ) : (
          <div className="space-y-2 mb-4">
            {sortedStops.map((stop, idx) => {
              const isFirst = idx === 0;
              const isLast = idx === sortedStops.length - 1;
              const isEditing = editingStopId === stop.id;
              const isBusy = savingId === stop.id;

              return (
                <div
                  key={stop.id}
                  className="border border-gray-200 dark:border-gray-700 rounded-lg p-3 bg-gray-50 dark:bg-gray-900"
                >
                  {!isEditing ? (
                    <div className="flex items-start gap-3">
                      {/* Reorder controls */}
                      <div className="flex flex-col items-center gap-0.5 pt-0.5 shrink-0">
                        <button
                          onClick={() => moveStop(stop, 'up')}
                          disabled={isFirst || isBusy}
                          title="Move earlier"
                          className="p-1 rounded text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                        >
                          <ArrowUp size={14} />
                        </button>
                        <span className="text-[10px] font-mono text-gray-400 dark:text-gray-500">#{stop.sequence}</span>
                        <button
                          onClick={() => moveStop(stop, 'down')}
                          disabled={isLast || isBusy}
                          title="Move later"
                          className="p-1 rounded text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                        >
                          <ArrowDown size={14} />
                        </button>
                      </div>

                      {/* Stop details */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-bold text-gray-900 dark:text-gray-100">
                            {stop.location?.name || 'Unknown location'}
                          </span>
                          {isFirst && (
                            <span className="text-xs px-2 py-0.5 font-medium bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400 rounded-md border border-emerald-200 dark:border-emerald-800">
                              Origin
                            </span>
                          )}
                          {isLast && !isFirst && (
                            <span className="text-xs px-2 py-0.5 font-medium bg-purple-50 text-purple-700 dark:bg-purple-950/30 dark:text-purple-400 rounded-md border border-purple-200 dark:border-purple-800">
                              Destination
                            </span>
                          )}
                        </div>
                        {stop.location?.address && (
                          <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{stop.location.address}</p>
                        )}
                        <div className="flex items-center gap-4 mt-2 flex-wrap text-xs text-gray-600 dark:text-gray-300">
                          <span className="flex items-center gap-1">
                            <Clock size={12} className="text-gray-400 dark:text-gray-500" />
                            Expected: {formatDateTime(stop.expected_arrival)} → {formatDateTime(stop.expected_departure)}
                          </span>
                          {(stop.actual_arrival || stop.actual_departure) && (
                            <span className="flex items-center gap-1 text-amber-700 dark:text-amber-400">
                              <Clock size={12} />
                              Actual: {formatDateTime(stop.actual_arrival)} → {formatDateTime(stop.actual_departure)}
                            </span>
                          )}
                        </div>
                        {stop.notes && (
                          <p className="text-xs italic text-gray-500 dark:text-gray-400 mt-1">"{stop.notes}"</p>
                        )}
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          onClick={() => startEdit(stop)}
                          disabled={isBusy}
                          className="text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200 p-1.5 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors disabled:opacity-40"
                          title="Edit stop"
                        >
                          <SquarePen size={16} />
                        </button>
                        <button
                          onClick={() => handleDelete(stop)}
                          disabled={isBusy}
                          className="text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 p-1.5 rounded-md hover:bg-red-50 dark:hover:bg-red-950/20 transition-colors disabled:opacity-40"
                          title="Remove stop"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  ) : (
                    // EDIT FORM (inline)
                    <form onSubmit={(e) => handleEditSubmit(e, stop.id)} className="space-y-3">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-semibold uppercase text-gray-500 dark:text-gray-400 mb-1">Location</label>
                          <select
                            name="location_id"
                            value={editFormData.location_id}
                            onChange={handleEditChange}
                            required
                            className="w-full border border-gray-200 dark:border-gray-700 rounded-lg p-2 text-sm bg-white dark:bg-gray-900"
                          >
                            <option value="">— Select location —</option>
                            {locations.map((loc) => (
                              <option key={loc.id} value={loc.id}>{loc.name}</option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="block text-xs font-semibold uppercase text-gray-500 dark:text-gray-400 mb-1">Sequence</label>
                          <input
                            type="number"
                            name="sequence"
                            value={editFormData.sequence}
                            onChange={handleEditChange}
                            required
                            className="w-full border border-gray-200 dark:border-gray-700 rounded-lg p-2 text-sm bg-transparent dark:bg-gray-900"
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-semibold uppercase text-gray-500 dark:text-gray-400 mb-1">Expected Arrival</label>
                          <input
                            type="datetime-local"
                            name="expected_arrival"
                            value={editFormData.expected_arrival}
                            onChange={handleEditChange}
                            className="w-full border border-gray-200 dark:border-gray-700 rounded-lg p-2 text-sm bg-transparent dark:bg-gray-900"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-semibold uppercase text-gray-500 dark:text-gray-400 mb-1">Expected Departure</label>
                          <input
                            type="datetime-local"
                            name="expected_departure"
                            value={editFormData.expected_departure}
                            onChange={handleEditChange}
                            className="w-full border border-gray-200 dark:border-gray-700 rounded-lg p-2 text-sm bg-transparent dark:bg-gray-900"
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-semibold uppercase text-gray-500 dark:text-gray-400 mb-1">Actual Arrival</label>
                          <input
                            type="datetime-local"
                            name="actual_arrival"
                            value={editFormData.actual_arrival}
                            onChange={handleEditChange}
                            className="w-full border border-gray-200 dark:border-gray-700 rounded-lg p-2 text-sm bg-transparent dark:bg-gray-900"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-semibold uppercase text-gray-500 dark:text-gray-400 mb-1">Actual Departure</label>
                          <input
                            type="datetime-local"
                            name="actual_departure"
                            value={editFormData.actual_departure}
                            onChange={handleEditChange}
                            className="w-full border border-gray-200 dark:border-gray-700 rounded-lg p-2 text-sm bg-transparent dark:bg-gray-900"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="block text-xs font-semibold uppercase text-gray-500 dark:text-gray-400 mb-1">Notes</label>
                        <input
                          type="text"
                          name="notes"
                          value={editFormData.notes}
                          onChange={handleEditChange}
                          placeholder="e.g. delayed 15 min due to traffic"
                          className="w-full border border-gray-200 dark:border-gray-700 rounded-lg p-2 text-sm bg-transparent dark:bg-gray-900"
                        />
                      </div>
                      <div className="flex justify-end gap-2 pt-1">
                        <button type="button" onClick={cancelEdit} className="px-3 py-1.5 text-xs font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg">
                          Cancel
                        </button>
                        <button
                          type="submit"
                          disabled={isBusy}
                          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white rounded-lg hover:opacity-90 disabled:opacity-50"
                          style={{ backgroundColor: 'var(--accent)' }}
                        >
                          <Save size={13} /> {isBusy ? 'Saving...' : 'Save Stop'}
                        </button>
                      </div>
                    </form>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* ADD STOP */}
        <div className="border-t border-gray-100 dark:border-gray-700 pt-4">
          {!showAddForm ? (
            <button
              onClick={() => setShowAddForm(true)}
              className="flex items-center gap-1.5 text-sm font-medium py-2 px-4 rounded-lg text-white hover:opacity-90 transition-all"
              style={{ backgroundColor: 'var(--accent)' }}
            >
              <Plus size={15} /> Add Stop
            </button>
          ) : (
            <form onSubmit={handleAddSubmit} className="space-y-3 bg-gray-50 dark:bg-gray-900 border border-gray-100 dark:border-gray-700 rounded-lg p-4">
              <div className="flex justify-between items-center">
                <h4 className="text-sm font-bold text-gray-900 dark:text-gray-100">New Stop</h4>
                <button type="button" onClick={() => setShowAddForm(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
                  <X size={16} />
                </button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold uppercase text-gray-500 dark:text-gray-400 mb-1">Location</label>
                  <select
                    name="location_id"
                    value={addFormData.location_id}
                    onChange={handleAddChange}
                    required
                    className="w-full border border-gray-200 dark:border-gray-700 rounded-lg p-2 text-sm bg-white dark:bg-gray-900"
                  >
                    <option value="">— Select location —</option>
                    {locations.map((loc) => (
                      <option key={loc.id} value={loc.id}>{loc.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase text-gray-500 dark:text-gray-400 mb-1">
                    Sequence <span className="normal-case font-normal text-gray-400">(order in route)</span>
                  </label>
                  <input
                    type="number"
                    name="sequence"
                    value={addFormData.sequence}
                    onChange={handleAddChange}
                    required
                    className="w-full border border-gray-200 dark:border-gray-700 rounded-lg p-2 text-sm bg-transparent dark:bg-gray-900"
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold uppercase text-gray-500 dark:text-gray-400 mb-1">Expected Arrival</label>
                  <input
                    type="datetime-local"
                    name="expected_arrival"
                    value={addFormData.expected_arrival}
                    onChange={handleAddChange}
                    className="w-full border border-gray-200 dark:border-gray-700 rounded-lg p-2 text-sm bg-transparent dark:bg-gray-900"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase text-gray-500 dark:text-gray-400 mb-1">Expected Departure</label>
                  <input
                    type="datetime-local"
                    name="expected_departure"
                    value={addFormData.expected_departure}
                    onChange={handleAddChange}
                    className="w-full border border-gray-200 dark:border-gray-700 rounded-lg p-2 text-sm bg-transparent dark:bg-gray-900"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase text-gray-500 dark:text-gray-400 mb-1">Notes</label>
                <input
                  type="text"
                  name="notes"
                  value={addFormData.notes}
                  onChange={handleAddChange}
                  placeholder="Optional"
                  className="w-full border border-gray-200 dark:border-gray-700 rounded-lg p-2 text-sm bg-transparent dark:bg-gray-900"
                />
              </div>
              <div className="flex justify-end gap-2 pt-1">
                <button type="button" onClick={() => setShowAddForm(false)} className="px-3 py-1.5 text-xs font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg">
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingId === 'new'}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white rounded-lg hover:opacity-90 disabled:opacity-50"
                  style={{ backgroundColor: 'var(--accent)' }}
                >
                  <Plus size={13} /> {savingId === 'new' ? 'Adding...' : 'Add Stop'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}