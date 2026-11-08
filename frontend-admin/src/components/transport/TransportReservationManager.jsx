import React, { useCallback, useContext, useEffect, useMemo, useState } from 'react';
import api from '../../api';
import { AuthContext } from '../../contexts/AuthContext';
import { X, Check, Ban, ArrowRight, Users, FileText, Ticket } from 'lucide-react';

const TABS = [
  { key: 'pending', label: 'Pending' },
  { key: 'approved', label: 'Approved' },
  { key: 'rejected', label: 'Rejected' },
  { key: 'all', label: 'All' },
];

const EMPTY_TEXT = {
  pending: 'No pending requests for this trip.',
  approved: 'No approved requests yet.',
  rejected: 'No rejected requests.',
  all: 'No reservation requests for this trip yet.',
};

const STATUS_BADGE = {
  pending: 'bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  approved: 'bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  rejected: 'bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-400',
};

const errorText = (err, fallback) => {
  const data = err?.response?.data;
  if (typeof data?.detail === 'string') return data.detail;
  if (typeof data === 'string') return data;
  return fallback;
};

const formatWhen = (value) => {
  if (!value) return '';
  const d = new Date(value);
  if (isNaN(d.getTime())) return '';
  return d.toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
};

export default function TransportReservationManager({ transportation, isOpen, onClose, onChanged }) {
  const { authTokens } = useContext(AuthContext);

  const [reservations, setReservations] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState(null);
  const [tab, setTab] = useState('pending');

  const [busyId, setBusyId] = useState(null);
  const [cardErrors, setCardErrors] = useState({});
  const [rejectingId, setRejectingId] = useState(null);
  const [rejectReason, setRejectReason] = useState('');

  const tripId = transportation?.id;

  const authHeader = useCallback(
    () => ({ headers: { Authorization: `Bearer ${authTokens?.access}` } }),
    [authTokens]
  );

  const load = useCallback(
    async (silent = false) => {
      if (!tripId) return;
      if (!silent) setLoading(true);
      try {
        const res = await api.get('api/admin-transport/reservations/', {
          params: { transportation: tripId },
          ...authHeader(),
        });
        setReservations(Array.isArray(res.data) ? res.data : []);
        setLoadError(null);
      } catch (err) {
        setLoadError(errorText(err, 'Failed to load reservation requests.'));
      } finally {
        setLoading(false);
      }
    },
    [tripId, authHeader]
  );

  // Fresh start each time the manager opens (or switches to another trip)
  useEffect(() => {
    if (!isOpen || !tripId) return;
    setReservations([]);
    setTab('pending');
    setCardErrors({});
    setRejectingId(null);
    setRejectReason('');
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, tripId]);

  const counts = useMemo(() => {
    const c = { pending: 0, approved: 0, rejected: 0, all: reservations.length };
    reservations.forEach((r) => {
      if (c[r.status] !== undefined) c[r.status] += 1;
    });
    return c;
  }, [reservations]);

  const visible = useMemo(
    () => (tab === 'all' ? reservations : reservations.filter((r) => r.status === tab)),
    [reservations, tab]
  );

  const runAction = async (reservation, kind, body) => {
    if (busyId) return;
    setBusyId(reservation.id);
    setCardErrors((prev) => ({ ...prev, [reservation.id]: null }));
    try {
      await api.post(
        `api/admin-transport/reservations/${reservation.id}/${kind}/`,
        body || {},
        authHeader()
      );
      setRejectingId(null);
      setRejectReason('');
      await load(true);
      onChanged?.();
    } catch (err) {
      setCardErrors((prev) => ({
        ...prev,
        [reservation.id]: errorText(
          err,
          kind === 'approve' ? 'Failed to approve this request.' : 'Failed to reject this request.'
        ),
      }));
    } finally {
      setBusyId(null);
    }
  };

  if (!isOpen || !transportation) return null;

  const max = transportation.max_capacity ?? transportation.vehicle?.capacity ?? null;
  const occupied = transportation.occupied_seats ?? 0;
  const closedTrip = transportation.status === 'Cancelled' || transportation.status === 'Completed';

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-800 border border-transparent dark:border-gray-700 rounded-xl shadow-xl w-full max-w-3xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-start justify-between gap-3 p-5 border-b border-gray-100 dark:border-gray-700">
          <div className="min-w-0">
            <div className="flex items-center gap-2 text-gray-900 dark:text-gray-100">
              <Ticket size={18} style={{ color: 'var(--accent)' }} />
              <h2 className="text-lg font-bold">Reservation Requests</h2>
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
              {transportation.title}
              {transportation.vehicle?.vehicle_name ? ` • ${transportation.vehicle.vehicle_name}` : ''}
            </p>
            {max !== null && (
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                Seats in use (peak): {occupied}/{max}
              </p>
            )}
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
          >
            <X size={20} />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex flex-wrap gap-1 px-5 pt-3">
          {TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`text-sm font-medium px-3 py-1.5 rounded-lg transition-colors ${
                tab === t.key
                  ? 'text-white'
                  : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
              }`}
              style={tab === t.key ? { backgroundColor: 'var(--accent)' } : undefined}
            >
              {t.label} ({counts[t.key]})
            </button>
          ))}
        </div>

        {/* Body */}
        <div className="p-5 overflow-y-auto space-y-3 flex-1">
          {closedTrip && (
            <p className="text-xs rounded-lg px-3 py-2 bg-gray-50 dark:bg-gray-900 text-gray-500 dark:text-gray-400">
              This trip is {transportation.status?.toLowerCase()}, so new requests can't be approved.
            </p>
          )}

          {loading ? (
            <p className="text-center text-sm text-gray-400 py-10">Loading requests...</p>
          ) : loadError ? (
            <div className="text-center py-10 space-y-2">
              <p className="text-sm text-red-500 dark:text-red-400">{loadError}</p>
              <button
                onClick={() => load()}
                className="text-sm font-medium px-3 py-1.5 rounded-lg text-white"
                style={{ backgroundColor: 'var(--accent)' }}
              >
                Retry
              </button>
            </div>
          ) : visible.length === 0 ? (
            <p className="text-center text-sm text-gray-400 dark:text-gray-500 py-10">{EMPTY_TEXT[tab]}</p>
          ) : (
            visible.map((r) => {
              const busy = busyId === r.id;
              const isPending = r.status === 'pending';
              return (
                <div
                  key={r.id}
                  className="border border-gray-200 dark:border-gray-700 rounded-xl p-4 space-y-3 bg-white dark:bg-gray-900"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">
                        {r.requester?.name}
                      </p>
                      {r.requester?.email && (
                        <p className="text-xs text-gray-400 dark:text-gray-500 truncate">{r.requester.email}</p>
                      )}
                    </div>
                    <span
                      className={`shrink-0 text-xs px-2.5 py-1 font-semibold rounded-full capitalize ${
                        STATUS_BADGE[r.status] || 'bg-gray-100 text-gray-600'
                      }`}
                    >
                      {r.status}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                    <span>{r.boarding_stop_name || '—'}</span>
                    <ArrowRight size={14} className="text-gray-400 shrink-0" />
                    <span>{r.alighting_stop_name || '—'}</span>
                  </div>

                  <div className="space-y-1.5">
                    <p className="flex items-center gap-1 text-xs font-semibold uppercase text-gray-500 dark:text-gray-400">
                      <Users size={12} /> {r.guests.length} guest{r.guests.length === 1 ? '' : 's'}
                    </p>
                    <ul className="space-y-1.5">
                      {r.guests.map((g) => (
                        <li
                          key={g.id}
                          className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm rounded-lg px-3 py-2 bg-gray-50 dark:bg-gray-800"
                        >
                          <span className="font-medium text-gray-800 dark:text-gray-200">{g.full_name}</span>
                          <span className="text-xs text-gray-500 dark:text-gray-400">
                            {g.age} • {g.gender}
                          </span>
                          {g.local && (
                            <span
                              className="text-xs px-2 py-0.5 rounded-full text-white"
                              style={{ backgroundColor: 'var(--accent)' }}
                            >
                              Local
                            </span>
                          )}
                          {g.id_number && (
                            <span className="text-xs font-mono text-gray-500 dark:text-gray-400">
                              ID: {g.id_number}
                            </span>
                          )}
                          {g.id_document ? (
                            <a
                              href={g.id_document}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 text-xs hover:underline"
                              style={{ color: 'var(--accent)' }}
                            >
                              <FileText size={12} /> View ID
                            </a>
                          ) : (
                            <span className="text-xs text-gray-400 dark:text-gray-500">No ID file</span>
                          )}
                        </li>
                      ))}
                    </ul>
                  </div>

                  {r.notes && (
                    <p className="text-xs italic text-gray-500 dark:text-gray-400">"{r.notes}"</p>
                  )}

                  {r.status === 'approved' && (
                    <p className="text-xs text-green-700 dark:text-green-400">
                      Added to the passenger list
                      {r.reviewed_by_name ? ` by ${r.reviewed_by_name}` : ''}
                      {r.reviewed_at ? ` • ${formatWhen(r.reviewed_at)}` : ''}.
                    </p>
                  )}
                  {r.status === 'rejected' && (
                    <p className="text-xs text-red-600 dark:text-red-400">
                      Rejected{r.reviewed_by_name ? ` by ${r.reviewed_by_name}` : ''}
                      {r.reviewed_at ? ` • ${formatWhen(r.reviewed_at)}` : ''}
                      {r.rejection_reason ? `: ${r.rejection_reason}` : '.'}
                    </p>
                  )}

                  {cardErrors[r.id] && (
                    <p className="text-sm rounded-lg px-3 py-2 bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-300">
                      {cardErrors[r.id]}
                    </p>
                  )}

                  {isPending && rejectingId === r.id && (
                    <div className="space-y-2">
                      <textarea
                        rows={2}
                        maxLength={300}
                        value={rejectReason}
                        onChange={(e) => setRejectReason(e.target.value)}
                        placeholder="Reason (optional) — saved with the request"
                        className="w-full border border-gray-200 dark:border-gray-700 rounded-lg p-2 text-sm focus:outline-none bg-transparent dark:bg-gray-900 text-gray-800 dark:text-gray-200"
                      />
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => {
                            setRejectingId(null);
                            setRejectReason('');
                          }}
                          disabled={busy}
                          className="px-3 py-1.5 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg disabled:opacity-50"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={() => runAction(r, 'reject', { reason: rejectReason.trim() })}
                          disabled={busy}
                          className="px-3 py-1.5 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg disabled:opacity-50"
                        >
                          {busy ? 'Rejecting...' : 'Confirm reject'}
                        </button>
                      </div>
                    </div>
                  )}

                  {isPending && rejectingId !== r.id && (
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => {
                          setRejectingId(r.id);
                          setRejectReason('');
                          setCardErrors((prev) => ({ ...prev, [r.id]: null }));
                        }}
                        disabled={busyId !== null}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/20 rounded-lg disabled:opacity-50"
                      >
                        <Ban size={14} /> Reject
                      </button>
                      <button
                        onClick={() => runAction(r, 'approve')}
                        disabled={busyId !== null || closedTrip}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-white rounded-lg hover:opacity-90 disabled:opacity-50"
                        style={{ backgroundColor: 'var(--accent)' }}
                      >
                        <Check size={14} /> {busy ? 'Approving...' : 'Approve & add to trip'}
                      </button>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}