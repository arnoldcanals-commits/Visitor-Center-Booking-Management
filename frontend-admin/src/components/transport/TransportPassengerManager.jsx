import React, { useState, useEffect, useContext, useMemo } from 'react';
import api from '../../api';
import { AuthContext } from '../../contexts/AuthContext';
import {
  Users, X, Plus, Trash2, SquarePen, Save, LogOut, DoorOpen, Phone
} from "lucide-react";

const toArray = (data) => {
  if (Array.isArray(data)) return data;
  if (data && Array.isArray(data.results)) return data.results;
  return [];
};

const emptyPassengerForm = {
  name: '',
  contact_number: '',
  boarding_stop_id: '',
  alighting_stop_id: '',
  status: 'reserved',
  notes: '',
};

const STATUS_CHOICES = [
  { value: 'reserved', label: 'Reserved' },
  { value: 'checked_in', label: 'Checked In' },
  { value: 'completed', label: 'Completed' },
  { value: 'no_show', label: 'No Show' },
  { value: 'cancelled', label: 'Cancelled' },
];

const statusBadgeClass = (status) =>
  status === 'reserved' ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' :
  status === 'checked_in' ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' :
  status === 'completed' ? 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300' :
  status === 'no_show' ? 'bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' :
  'bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-400';

/**
 * Manages reserved passengers on a single Transportation trip: add/edit/remove,
 * per-passenger boarding/alighting stops (blank = full route), and turnover
 * actions (bulk "mark alighted at stop" for the driver, and a per-passenger
 * "sudden early departure").
 *
 * Props:
 * - transportation: the Transportation object (needs at least `id`, `title`, `max_capacity`)
 * - isOpen: whether the modal is visible
 * - onClose: called to dismiss the modal
 * - onPassengersChanged: optional callback, fired after any create/update/delete/
 *   turnover action, so the parent list can refetch and pick up updated occupied_seats.
 */
export default function TransportPassengerManager({ transportation, isOpen, onClose, onPassengersChanged }) {
  const { authTokens } = useContext(AuthContext);

  const [passengers, setPassengers] = useState([]);
  const [stops, setStops] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [showAddForm, setShowAddForm] = useState(false);
  const [addFormData, setAddFormData] = useState(emptyPassengerForm);

  const [editingPassengerId, setEditingPassengerId] = useState(null);
  const [editFormData, setEditFormData] = useState(emptyPassengerForm);

  const [savingId, setSavingId] = useState(null); // passenger id (or 'new') currently being saved/deleted

  // Bulk turnover controls
  const [turnoverStopId, setTurnoverStopId] = useState('');
  const [turnoverBusy, setTurnoverBusy] = useState(false);

  // Early-departure inline prompt
  const [departingPassengerId, setDepartingPassengerId] = useState(null);
  const [departStopId, setDepartStopId] = useState('');
  const [departReason, setDepartReason] = useState('');

  const authHeader = () => ({
    headers: { Authorization: `Bearer ${authTokens?.access}` },
  });

  const passengersPath = `api/admin-transport/transportation/${transportation?.id}/passengers/`;
  const stopsPath = `api/admin-transport/transportation/${transportation?.id}/stops/`;

  const sortedStops = useMemo(
    () => [...stops].sort((a, b) => a.sequence - b.sequence),
    [stops]
  );

  const activePassengers = useMemo(
    () => passengers.filter((p) => !['cancelled', 'no_show'].includes(p.status)),
    [passengers]
  );

  const maxCapacity = transportation?.max_capacity ?? transportation?.vehicle?.capacity ?? null;

  // ─────────────────────────────────────────────
  // FETCH
  // ─────────────────────────────────────────────
  const fetchPassengers = async () => {
    if (!transportation?.id) return;
    try {
      setLoading(true);
      const res = await api.get(passengersPath, authHeader());
      setPassengers(toArray(res.data));
      setError(null);
    } catch (err) {
      setError(err.response?.data?.detail || err.message);
      setPassengers([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchStops = async () => {
    if (!transportation?.id) return;
    try {
      const res = await api.get(stopsPath, authHeader());
      setStops(toArray(res.data));
    } catch (err) {
      console.error('Failed to load stops:', err);
      setStops([]);
    }
  };

  useEffect(() => {
    if (isOpen && transportation?.id && authTokens) {
      fetchPassengers();
      fetchStops();
      setShowAddForm(false);
      setEditingPassengerId(null);
      setDepartingPassengerId(null);
      setTurnoverStopId('');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, transportation?.id, authTokens]);

  const notifyChanged = () => {
    if (onPassengersChanged) onPassengersChanged();
  };

  const stopLabel = (stopId) => {
    if (!stopId) return 'Full route';
    const stop = stops.find((s) => String(s.id) === String(stopId));
    return stop ? `#${stop.sequence} — ${stop.location?.name || 'Unknown'}` : 'Full route';
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
    if (!addFormData.name.trim()) {
      alert('Please enter the passenger\'s name.');
      return;
    }
    setSavingId('new');
    try {
      await api.post(passengersPath, {
        name: addFormData.name,
        contact_number: addFormData.contact_number || null,
        boarding_stop_id: addFormData.boarding_stop_id || null,
        alighting_stop_id: addFormData.alighting_stop_id || null,
        status: addFormData.status,
        notes: addFormData.notes || null,
      }, authHeader());
      setAddFormData(emptyPassengerForm);
      setShowAddForm(false);
      await fetchPassengers();
      notifyChanged();
    } catch (err) {
      alert(err.response?.data?.detail || err.response?.data?.non_field_errors?.[0] || 'Failed to add passenger. Trip may be at full capacity for that segment.');
    } finally {
      setSavingId(null);
    }
  };

  // ─────────────────────────────────────────────
  // EDIT
  // ─────────────────────────────────────────────
  const startEdit = (passenger) => {
    setEditingPassengerId(passenger.id);
    setEditFormData({
      name: passenger.name || '',
      contact_number: passenger.contact_number || '',
      boarding_stop_id: passenger.boarding_stop?.id ?? passenger.boarding_stop ?? '',
      alighting_stop_id: passenger.alighting_stop?.id ?? passenger.alighting_stop ?? '',
      status: passenger.status || 'reserved',
      notes: passenger.notes || '',
    });
  };

  const cancelEdit = () => {
    setEditingPassengerId(null);
    setEditFormData(emptyPassengerForm);
  };

  const handleEditChange = (e) => {
    const { name, value } = e.target;
    setEditFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleEditSubmit = async (e, passengerId) => {
    e.preventDefault();
    if (!editFormData.name.trim()) {
      alert('Please enter the passenger\'s name.');
      return;
    }
    setSavingId(passengerId);
    try {
      await api.patch(`${passengersPath}${passengerId}/`, {
        name: editFormData.name,
        contact_number: editFormData.contact_number || null,
        boarding_stop_id: editFormData.boarding_stop_id || null,
        alighting_stop_id: editFormData.alighting_stop_id || null,
        status: editFormData.status,
        notes: editFormData.notes || null,
      }, authHeader());
      cancelEdit();
      await fetchPassengers();
      notifyChanged();
    } catch (err) {
      alert(err.response?.data?.detail || err.response?.data?.non_field_errors?.[0] || 'Failed to update passenger. Check the boarding/alighting range and capacity.');
    } finally {
      setSavingId(null);
    }
  };

  // ─────────────────────────────────────────────
  // DELETE
  // ─────────────────────────────────────────────
  const handleDelete = async (passenger) => {
    if (!window.confirm(`Remove ${passenger.name} from this trip's passenger list?`)) return;
    setSavingId(passenger.id);
    try {
      await api.delete(`${passengersPath}${passenger.id}/`, authHeader());
      await fetchPassengers();
      notifyChanged();
    } catch (err) {
      alert(err.response?.data?.detail || 'Failed to remove passenger.');
    } finally {
      setSavingId(null);
    }
  };

  // ─────────────────────────────────────────────
  // BULK TURNOVER — everyone alighting at the chosen stop is marked completed
  // ─────────────────────────────────────────────
  const handleMarkAlighted = async () => {
    if (!turnoverStopId) {
      alert('Select a stop first.');
      return;
    }
    setTurnoverBusy(true);
    try {
      const res = await api.post(`${passengersPath}mark-alighted/`, { stop_id: turnoverStopId }, authHeader());
      const updated = res.data?.updated ?? 0;
      await fetchPassengers();
      notifyChanged();
      if (updated === 0) {
        alert('No active passengers were scheduled to alight at that stop.');
      }
    } catch (err) {
      alert(err.response?.data?.detail || 'Failed to process turnover for that stop.');
    } finally {
      setTurnoverBusy(false);
    }
  };

  // ─────────────────────────────────────────────
  // SUDDEN EARLY DEPARTURE — a passenger leaves before their planned alighting stop
  // ─────────────────────────────────────────────
  const startDepartEarly = (passenger) => {
    setDepartingPassengerId(passenger.id);
    setDepartStopId('');
    setDepartReason('');
  };

  const cancelDepartEarly = () => {
    setDepartingPassengerId(null);
    setDepartStopId('');
    setDepartReason('');
  };

  const submitDepartEarly = async (passengerId) => {
    if (!departStopId) {
      alert('Select which stop they got off at.');
      return;
    }
    setSavingId(passengerId);
    try {
      await api.post(`${passengersPath}${passengerId}/depart-early/`, {
        stop_id: departStopId,
        reason: departReason || undefined,
      }, authHeader());
      cancelDepartEarly();
      await fetchPassengers();
      notifyChanged();
    } catch (err) {
      alert(err.response?.data?.detail || 'Failed to record early departure.');
    } finally {
      setSavingId(null);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-800 border border-transparent dark:border-gray-700 rounded-xl shadow-xl w-full max-w-3xl max-h-[90vh] overflow-y-auto p-6">

        {/* HEADER */}
        <div className="flex justify-between items-start mb-4">
          <div className="flex items-center gap-2 p-3 bg-gray-50 dark:bg-gray-900 rounded-xl w-fit border border-gray-100 dark:border-gray-700">
            <Users size={18} style={{ color: 'var(--accent)' }} />
            <div>
              <span className="text-sm font-black uppercase tracking-tight block">Passengers</span>
              <span className="text-xs text-gray-500 dark:text-gray-400">
                {transportation?.title}
                {maxCapacity !== null && (
                  <> · {activePassengers.length}/{maxCapacity} active reservations</>
                )}
              </span>
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

        {/* BULK TURNOVER CONTROL */}
        {sortedStops.length > 0 && (
          <div className="flex flex-wrap items-center gap-2 mb-4 bg-gray-50 dark:bg-gray-900 border border-gray-100 dark:border-gray-700 rounded-lg p-3">
            <DoorOpen size={16} className="text-gray-400 dark:text-gray-500 shrink-0" />
            <span className="text-xs font-semibold uppercase text-gray-500 dark:text-gray-400 shrink-0">Vehicle arrived at:</span>
            <select
              value={turnoverStopId}
              onChange={(e) => setTurnoverStopId(e.target.value)}
              className="border border-gray-200 dark:border-gray-700 rounded-lg py-1.5 px-2.5 text-sm bg-white dark:bg-gray-900 min-w-[160px]"
            >
              <option value="">— Select stop —</option>
              {sortedStops.map((stop) => (
                <option key={stop.id} value={stop.id}>#{stop.sequence} — {stop.location?.name}</option>
              ))}
            </select>
            <button
              onClick={handleMarkAlighted}
              disabled={turnoverBusy || !turnoverStopId}
              className="flex items-center gap-1.5 text-xs font-medium py-1.5 px-3 rounded-lg text-white hover:opacity-90 disabled:opacity-50 transition-all"
              style={{ backgroundColor: 'var(--accent)' }}
            >
              <LogOut size={13} /> {turnoverBusy ? 'Processing...' : 'Mark Everyone Alighted Here'}
            </button>
            <span className="text-xs text-gray-400 dark:text-gray-500 w-full">
              Frees seats for anyone scheduled to board further down the route.
            </span>
          </div>
        )}

        {/* PASSENGER LIST */}
        {loading ? (
          <div className="p-8 text-center text-gray-500 dark:text-gray-400 text-sm">Loading passengers...</div>
        ) : passengers.length === 0 ? (
          <div className="p-8 text-center text-gray-400 dark:text-gray-500">
            <Users size={28} className="mx-auto mb-2 opacity-50" />
            <p className="text-sm font-medium">No passengers reserved yet.</p>
          </div>
        ) : (
          <div className="space-y-2 mb-4">
            {passengers.map((passenger) => {
              const isEditing = editingPassengerId === passenger.id;
              const isDeparting = departingPassengerId === passenger.id;
              const isBusy = savingId === passenger.id;
              const boardingId = passenger.boarding_stop?.id ?? passenger.boarding_stop ?? '';
              const alightingId = passenger.alighting_stop?.id ?? passenger.alighting_stop ?? '';

              return (
                <div
                  key={passenger.id}
                  className="border border-gray-200 dark:border-gray-700 rounded-lg p-3 bg-gray-50 dark:bg-gray-900"
                >
                  {!isEditing ? (
                    <div className="flex items-start gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-bold text-gray-900 dark:text-gray-100">{passenger.name}</span>
                          <span className={`text-xs px-2 py-0.5 font-medium rounded-md ${statusBadgeClass(passenger.status)}`}>
                            {STATUS_CHOICES.find((s) => s.value === passenger.status)?.label || passenger.status}
                          </span>
                        </div>
                        {passenger.contact_number && (
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 flex items-center gap-1">
                            <Phone size={11} /> {passenger.contact_number}
                          </p>
                        )}
                        <p className="text-xs text-gray-600 dark:text-gray-300 mt-1.5">
                          {stopLabel(boardingId)} <span className="text-gray-400 dark:text-gray-500">→</span> {stopLabel(alightingId)}
                        </p>
                        {passenger.notes && (
                          <p className="text-xs italic text-gray-500 dark:text-gray-400 mt-1">"{passenger.notes}"</p>
                        )}

                        {/* Inline early-departure prompt */}
                        {isDeparting && (
                          <div className="mt-3 p-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg space-y-2">
                            <p className="text-xs font-semibold uppercase text-gray-500 dark:text-gray-400">Sudden Early Departure</p>
                            <select
                              value={departStopId}
                              onChange={(e) => setDepartStopId(e.target.value)}
                              className="w-full border border-gray-200 dark:border-gray-700 rounded-lg p-2 text-sm bg-white dark:bg-gray-900"
                            >
                              <option value="">— Which stop did they get off at? —</option>
                              {sortedStops.map((stop) => (
                                <option key={stop.id} value={stop.id}>#{stop.sequence} — {stop.location?.name}</option>
                              ))}
                            </select>
                            <input
                              type="text"
                              value={departReason}
                              onChange={(e) => setDepartReason(e.target.value)}
                              placeholder="Optional reason"
                              className="w-full border border-gray-200 dark:border-gray-700 rounded-lg p-2 text-sm bg-transparent dark:bg-gray-900"
                            />
                            <div className="flex justify-end gap-2">
                              <button onClick={cancelDepartEarly} className="px-3 py-1.5 text-xs font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg">
                                Cancel
                              </button>
                              <button
                                onClick={() => submitDepartEarly(passenger.id)}
                                disabled={isBusy}
                                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white rounded-lg hover:opacity-90 disabled:opacity-50"
                                style={{ backgroundColor: 'var(--accent)' }}
                              >
                                <LogOut size={13} /> {isBusy ? 'Saving...' : 'Confirm Departure'}
                              </button>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Actions */}
                      {!isDeparting && (
                        <div className="flex items-center gap-1 shrink-0">
                          {!['cancelled', 'no_show', 'completed'].includes(passenger.status) && sortedStops.length > 0 && (
                            <button
                              onClick={() => startDepartEarly(passenger)}
                              disabled={isBusy}
                              title="Sudden early departure"
                              className="text-amber-600 hover:text-amber-800 dark:text-amber-400 dark:hover:text-amber-300 p-1.5 rounded-md hover:bg-amber-50 dark:hover:bg-amber-950/20 transition-colors disabled:opacity-40"
                            >
                              <LogOut size={16} />
                            </button>
                          )}
                          <button
                            onClick={() => startEdit(passenger)}
                            disabled={isBusy}
                            title="Edit passenger"
                            className="text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200 p-1.5 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors disabled:opacity-40"
                          >
                            <SquarePen size={16} />
                          </button>
                          <button
                            onClick={() => handleDelete(passenger)}
                            disabled={isBusy}
                            title="Remove passenger"
                            className="text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 p-1.5 rounded-md hover:bg-red-50 dark:hover:bg-red-950/20 transition-colors disabled:opacity-40"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      )}
                    </div>
                  ) : (
                    // EDIT FORM (inline)
                    <form onSubmit={(e) => handleEditSubmit(e, passenger.id)} className="space-y-3">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-semibold uppercase text-gray-500 dark:text-gray-400 mb-1">Name</label>
                          <input
                            type="text"
                            name="name"
                            value={editFormData.name}
                            onChange={handleEditChange}
                            required
                            className="w-full border border-gray-200 dark:border-gray-700 rounded-lg p-2 text-sm bg-transparent dark:bg-gray-900"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-semibold uppercase text-gray-500 dark:text-gray-400 mb-1">Contact Number</label>
                          <input
                            type="text"
                            name="contact_number"
                            value={editFormData.contact_number}
                            onChange={handleEditChange}
                            className="w-full border border-gray-200 dark:border-gray-700 rounded-lg p-2 text-sm bg-transparent dark:bg-gray-900"
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-semibold uppercase text-gray-500 dark:text-gray-400 mb-1">Boarding Stop</label>
                          <select
                            name="boarding_stop_id"
                            value={editFormData.boarding_stop_id}
                            onChange={handleEditChange}
                            className="w-full border border-gray-200 dark:border-gray-700 rounded-lg p-2 text-sm bg-white dark:bg-gray-900"
                          >
                            <option value="">Full route (origin)</option>
                            {sortedStops.map((stop) => (
                              <option key={stop.id} value={stop.id}>#{stop.sequence} — {stop.location?.name}</option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="block text-xs font-semibold uppercase text-gray-500 dark:text-gray-400 mb-1">Alighting Stop</label>
                          <select
                            name="alighting_stop_id"
                            value={editFormData.alighting_stop_id}
                            onChange={handleEditChange}
                            className="w-full border border-gray-200 dark:border-gray-700 rounded-lg p-2 text-sm bg-white dark:bg-gray-900"
                          >
                            <option value="">Full route (destination)</option>
                            {sortedStops.map((stop) => (
                              <option key={stop.id} value={stop.id}>#{stop.sequence} — {stop.location?.name}</option>
                            ))}
                          </select>
                        </div>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-semibold uppercase text-gray-500 dark:text-gray-400 mb-1">Status</label>
                          <select
                            name="status"
                            value={editFormData.status}
                            onChange={handleEditChange}
                            className="w-full border border-gray-200 dark:border-gray-700 rounded-lg p-2 text-sm bg-white dark:bg-gray-900"
                          >
                            {STATUS_CHOICES.map((s) => (
                              <option key={s.value} value={s.value}>{s.label}</option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="block text-xs font-semibold uppercase text-gray-500 dark:text-gray-400 mb-1">Notes</label>
                          <input
                            type="text"
                            name="notes"
                            value={editFormData.notes}
                            onChange={handleEditChange}
                            className="w-full border border-gray-200 dark:border-gray-700 rounded-lg p-2 text-sm bg-transparent dark:bg-gray-900"
                          />
                        </div>
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
                          <Save size={13} /> {isBusy ? 'Saving...' : 'Save Passenger'}
                        </button>
                      </div>
                    </form>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* ADD PASSENGER */}
        <div className="border-t border-gray-100 dark:border-gray-700 pt-4">
          {!showAddForm ? (
            <button
              onClick={() => setShowAddForm(true)}
              className="flex items-center gap-1.5 text-sm font-medium py-2 px-4 rounded-lg text-white hover:opacity-90 transition-all"
              style={{ backgroundColor: 'var(--accent)' }}
            >
              <Plus size={15} /> Add Passenger
            </button>
          ) : (
            <form onSubmit={handleAddSubmit} className="space-y-3 bg-gray-50 dark:bg-gray-900 border border-gray-100 dark:border-gray-700 rounded-lg p-4">
              <div className="flex justify-between items-center">
                <h4 className="text-sm font-bold text-gray-900 dark:text-gray-100">New Passenger</h4>
                <button type="button" onClick={() => setShowAddForm(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
                  <X size={16} />
                </button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold uppercase text-gray-500 dark:text-gray-400 mb-1">Name</label>
                  <input
                    type="text"
                    name="name"
                    value={addFormData.name}
                    onChange={handleAddChange}
                    required
                    placeholder="Full name"
                    className="w-full border border-gray-200 dark:border-gray-700 rounded-lg p-2 text-sm bg-transparent dark:bg-gray-900"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase text-gray-500 dark:text-gray-400 mb-1">Contact Number</label>
                  <input
                    type="text"
                    name="contact_number"
                    value={addFormData.contact_number}
                    onChange={handleAddChange}
                    placeholder="Optional"
                    className="w-full border border-gray-200 dark:border-gray-700 rounded-lg p-2 text-sm bg-transparent dark:bg-gray-900"
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold uppercase text-gray-500 dark:text-gray-400 mb-1">Boarding Stop</label>
                  <select
                    name="boarding_stop_id"
                    value={addFormData.boarding_stop_id}
                    onChange={handleAddChange}
                    className="w-full border border-gray-200 dark:border-gray-700 rounded-lg p-2 text-sm bg-white dark:bg-gray-900"
                  >
                    <option value="">Full route (origin)</option>
                    {sortedStops.map((stop) => (
                      <option key={stop.id} value={stop.id}>#{stop.sequence} — {stop.location?.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase text-gray-500 dark:text-gray-400 mb-1">Alighting Stop</label>
                  <select
                    name="alighting_stop_id"
                    value={addFormData.alighting_stop_id}
                    onChange={handleAddChange}
                    className="w-full border border-gray-200 dark:border-gray-700 rounded-lg p-2 text-sm bg-white dark:bg-gray-900"
                  >
                    <option value="">Full route (destination)</option>
                    {sortedStops.map((stop) => (
                      <option key={stop.id} value={stop.id}>#{stop.sequence} — {stop.location?.name}</option>
                    ))}
                  </select>
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
                  <Plus size={13} /> {savingId === 'new' ? 'Adding...' : 'Add Passenger'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}