import React, { useContext, useEffect, useMemo, useRef, useState } from 'react';
import api from '../api';
import { AuthContext } from '../contexts/AuthContext';
import { Printer, Loader2, AlertTriangle, Info } from 'lucide-react';

// Same import-path caveat as the other pages: adjust '../api' and '../contexts/AuthContext'
// to wherever Reports.jsx sits relative to them (it uses the same two imports as Transport.jsx).

const ORG_NAME = 'Tourism Management Office';
const API_BASE = 'api/admin-transport/reports/';

const todayStr = () => {
  const d = new Date();
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
};
const monthStartStr = () => todayStr().slice(0, 8) + '01';

const GROUP_LABELS = { day: 'Per day', week: 'Per week', month: 'Per month' };

const formatCell = (value, format) => {
  if (value === null || value === undefined || value === '') return '—';
  if (format === 'int') return Number(value).toLocaleString();
  if (format === 'dec') return Number(value).toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 });
  if (format === 'pct') return `${Number(value).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 1 })}%`;
  return String(value);
};

const inputCls =
  'border dark:border-gray-800 rounded-xl text-sm font-bold bg-gray-50 dark:bg-gray-800 dark:text-gray-100 outline-none px-3 py-2 focus:border-[var(--accent)]';
const labelCls = 'block text-[9px] font-black uppercase tracking-widest text-gray-400 dark:text-gray-500 mb-1';

const SectionTable = ({ section }) => {
  const { title, columns, rows, totals, empty } = section;
  return (
    <div className="mb-8 break-inside-avoid-page">
      {title && <h3 className="text-xs font-black uppercase tracking-widest text-gray-500 dark:text-gray-400 mb-2">{title}</h3>}
      <div className="border border-gray-200 dark:border-gray-800 rounded-2xl overflow-x-auto shadow-sm bg-white dark:bg-gray-900 print:border-none print:shadow-none print:rounded-none">
        <table className="w-full text-left text-sm border-collapse">
          <thead className="bg-gray-50 dark:bg-gray-800/60 text-[10px] font-black text-gray-500 dark:text-gray-400 uppercase border-b border-gray-200 dark:border-gray-800">
            <tr>
              {columns.map((c, i) => (
                <th key={i} className={`p-3 whitespace-nowrap ${c.align === 'right' ? 'text-right' : c.align === 'center' ? 'text-center' : ''}`}>{c.label}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
            {rows.length === 0 && (
              <tr>
                <td colSpan={columns.length} className="p-8 text-center text-xs font-bold text-gray-400 dark:text-gray-600">{empty}</td>
              </tr>
            )}
            {rows.map((row, r) => (
              <tr key={r} className="hover:bg-gray-50/60 dark:hover:bg-[var(--accent)]/5">
                {columns.map((c, i) => (
                  <td
                    key={i}
                    className={`p-3 tabular-nums ${i === 0 ? 'font-black text-gray-800 dark:text-gray-200' : 'font-bold text-gray-600 dark:text-gray-300'} ${c.align === 'right' ? 'text-right' : c.align === 'center' ? 'text-center' : ''}`}
                  >
                    {formatCell(row[i], c.format)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
          {totals && rows.length > 0 && (
            <tfoot>
              <tr className="bg-gray-50 dark:bg-gray-800/60 font-black border-t-2 border-gray-900 dark:border-gray-700">
                {columns.map((c, i) => (
                  <td key={i} className={`p-3 tabular-nums text-gray-900 dark:text-gray-50 ${c.align === 'right' ? 'text-right' : c.align === 'center' ? 'text-center' : ''}`}>
                    {formatCell(totals[i], c.format)}
                  </td>
                ))}
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </div>
  );
};

const TravelReports = () => {
  const { authTokens } = useContext(AuthContext);
  const headers = useMemo(() => ({ Authorization: `Bearer ${authTokens?.access}` }), [authTokens]);

  const [catalog, setCatalog] = useState(null); // { reports, options }
  const [catalogError, setCatalogError] = useState('');
  const [reportKey, setReportKey] = useState('');
  const [filters, setFilters] = useState({
    date_from: monthStartStr(),
    date_to: todayStr(),
    vehicle: '',
    driver: '',
    status: '',
    group: 'month',
    trip: '',
  });
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [preparedBy, setPreparedBy] = useState('');
  const requestId = useRef(0);

  // Catalog (report list + drop-down options)
  useEffect(() => {
    let alive = true;
    api
      .get(API_BASE, { headers })
      .then((res) => {
        if (!alive) return;
        setCatalog(res.data);
        setReportKey((cur) => cur || res.data.reports?.[0]?.key || '');
      })
      .catch((err) => {
        if (!alive) return;
        setCatalogError(err?.response?.data?.detail || 'Could not load the travel reports.');
      });
    return () => {
      alive = false;
    };
  }, [headers]);

  const spec = useMemo(() => catalog?.reports?.find((r) => r.key === reportKey) || null, [catalog, reportKey]);
  const has = (f) => !!spec && spec.filters.includes(f);

  const grouped = useMemo(() => {
    const out = {};
    (catalog?.reports || []).forEach((r) => {
      (out[r.group] = out[r.group] || []).push(r);
    });
    return out;
  }, [catalog]);

  // Run the report
  useEffect(() => {
    if (!spec) return;
    if (has('trip') && !filters.trip) {
      setResult(null);
      setError('');
      return;
    }
    const id = ++requestId.current;
    setLoading(true);
    setError('');
    const params = {};
    if (has('period')) {
      if (filters.date_from) params.date_from = filters.date_from;
      if (filters.date_to) params.date_to = filters.date_to;
    }
    if (has('vehicle') && filters.vehicle) params.vehicle = filters.vehicle;
    if (has('driver') && filters.driver) params.driver = filters.driver;
    if (has('status') && filters.status) params.status = filters.status;
    if (has('group')) params.group = filters.group;
    if (has('trip') && filters.trip) params.trip = filters.trip;

    api
      .get(`${API_BASE}${spec.key}/`, { headers, params })
      .then((res) => {
        if (id !== requestId.current) return;
        setResult(res.data);
      })
      .catch((err) => {
        if (id !== requestId.current) return;
        setResult(null);
        setError(err?.response?.data?.detail || 'Could not build this report.');
      })
      .finally(() => {
        if (id === requestId.current) setLoading(false);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [spec, filters, headers]);

  const setFilter = (key, value) => setFilters((f) => ({ ...f, [key]: value }));
  const periodText = has('period')
    ? `${filters.date_from || 'Start'} to ${filters.date_to || 'Today'}`
    : 'All records';

  if (catalogError) {
    return (
      <div className="p-6 rounded-2xl border border-red-200 dark:border-red-500/30 bg-red-50 dark:bg-red-500/10 text-sm font-bold text-red-600 dark:text-red-400 flex items-center gap-2">
        <AlertTriangle size={16} /> {catalogError}
      </div>
    );
  }
  if (!catalog) {
    return (
      <div className="p-10 flex justify-center text-gray-400 dark:text-gray-500">
        <Loader2 className="animate-spin" size={20} />
      </div>
    );
  }

  const options = catalog.options || {};

  return (
    <div>
      {/* Printed heading */}
      <div className="hidden print:block mb-8 border-b-4 border-gray-900 pb-4">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-2xl font-black uppercase tracking-tight">{ORG_NAME}</h1>
            <p className="text-sm font-bold text-gray-600 mt-0.5">Travel Report — {result?.title || spec?.title}</p>
          </div>
          <div className="text-right text-xs font-bold text-gray-500 leading-relaxed">
            <p>Period: {periodText}</p>
            <p>Generated: {new Date().toLocaleString()}</p>
            {preparedBy && <p>Prepared by: {preparedBy}</p>}
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="no-print mb-6 grid gap-4">
        <div className="flex flex-wrap gap-4 items-end">
          <div className="min-w-[240px] flex-1">
            <label className={labelCls}>Report</label>
            <select className={`${inputCls} w-full`} value={reportKey} onChange={(e) => { setReportKey(e.target.value); setFilter('trip', ''); }}>
              {Object.entries(grouped).map(([group, list]) => (
                <optgroup key={group} label={group}>
                  {list.map((r) => (
                    <option key={r.key} value={r.key}>{r.title}</option>
                  ))}
                </optgroup>
              ))}
            </select>
          </div>

          {has('period') && (
            <>
              <div>
                <label className={labelCls}>From</label>
                <input type="date" className={inputCls} value={filters.date_from} onChange={(e) => setFilter('date_from', e.target.value)} />
              </div>
              <div>
                <label className={labelCls}>To</label>
                <input type="date" className={inputCls} value={filters.date_to} onChange={(e) => setFilter('date_to', e.target.value)} />
              </div>
            </>
          )}

          {has('vehicle') && (
            <div>
              <label className={labelCls}>Vehicle</label>
              <select className={inputCls} value={filters.vehicle} onChange={(e) => setFilter('vehicle', e.target.value)}>
                <option value="">All vehicles</option>
                {(options.vehicles || []).map((v) => (
                  <option key={v.id} value={v.id}>{v.name}</option>
                ))}
              </select>
            </div>
          )}

          {has('driver') && (
            <div>
              <label className={labelCls}>Driver</label>
              <select className={inputCls} value={filters.driver} onChange={(e) => setFilter('driver', e.target.value)}>
                <option value="">All drivers</option>
                {(options.drivers || []).map((d) => (
                  <option key={d.id} value={d.id}>{d.name}</option>
                ))}
              </select>
            </div>
          )}

          {has('status') && (
            <div>
              <label className={labelCls}>Trip status</label>
              <select className={inputCls} value={filters.status} onChange={(e) => setFilter('status', e.target.value)}>
                <option value="">Any status</option>
                {(options.statuses || []).map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
          )}

          {has('group') && (
            <div>
              <label className={labelCls}>Group by</label>
              <select className={inputCls} value={filters.group} onChange={(e) => setFilter('group', e.target.value)}>
                {(options.groups || ['day', 'week', 'month']).map((g) => (
                  <option key={g} value={g}>{GROUP_LABELS[g] || g}</option>
                ))}
              </select>
            </div>
          )}

          {has('trip') && (
            <div>
              <label className={labelCls}>Trip</label>
              <select className={`${inputCls} max-w-[280px]`} value={filters.trip} onChange={(e) => setFilter('trip', e.target.value)}>
                <option value="">Choose a trip…</option>
                {(options.trips || []).map((t) => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>
            </div>
          )}

          <div className="flex items-end gap-2 ml-auto">
            <input
              type="text"
              className={`${inputCls} w-40`}
              placeholder="Prepared by"
              value={preparedBy}
              onChange={(e) => setPreparedBy(e.target.value)}
            />
            <button
              onClick={() => window.print()}
              disabled={!result}
              className="px-4 py-2 rounded-xl bg-gray-900 dark:bg-[var(--accent)] text-white text-xs font-black flex items-center gap-2 disabled:opacity-40"
            >
              <Printer size={14} /> PRINT
            </button>
          </div>
        </div>

        {spec?.description && (
          <p className="text-xs font-bold text-gray-400 dark:text-gray-500">{spec.description}</p>
        )}
      </div>

      {/* Body */}
      {loading && !result && (
        <div className="p-10 flex justify-center text-gray-400 dark:text-gray-500"><Loader2 className="animate-spin" size={20} /></div>
      )}

      {error && (
        <div className="p-4 mb-6 rounded-2xl border border-red-200 dark:border-red-500/30 bg-red-50 dark:bg-red-500/10 text-sm font-bold text-red-600 dark:text-red-400 flex items-center gap-2">
          <AlertTriangle size={16} /> {error}
        </div>
      )}

      {has('trip') && !filters.trip && !error && (
        <div className="p-8 text-center text-xs font-bold text-gray-400 dark:text-gray-600 border border-dashed border-gray-200 dark:border-gray-800 rounded-2xl">
          Choose a trip to see its manifest.
        </div>
      )}

      {result && (
        <div className={loading ? 'opacity-60 transition-opacity' : 'transition-opacity'}>
          <div className="mb-5">
            <h2 className="text-lg font-black text-gray-900 dark:text-gray-50">{result.title}</h2>
            {result.description && <p className="text-xs font-bold text-gray-400 dark:text-gray-500 mt-0.5">{result.description}</p>}
          </div>

          {result.meta?.length > 0 && (
            <div className="flex flex-wrap gap-x-10 gap-y-3 mb-6">
              {result.meta.map((m, i) => (
                <div key={i}>
                  <span className="block text-[9px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest">{m.label}</span>
                  <span className="text-base font-black text-gray-900 dark:text-gray-50 tabular-nums">{m.value}</span>
                </div>
              ))}
            </div>
          )}

          {result.sections.map((s, i) => (
            <SectionTable key={i} section={s} />
          ))}

          {result.notes?.length > 0 && (
            <div className="mt-2 p-4 rounded-2xl bg-gray-50 dark:bg-gray-800/50 text-xs font-bold text-gray-500 dark:text-gray-400 space-y-1">
              <p className="flex items-center gap-1.5 uppercase tracking-widest text-[9px] text-gray-400 dark:text-gray-500"><Info size={11} /> How to read this</p>
              {result.notes.map((n, i) => (
                <p key={i}>{n}</p>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="hidden print:flex justify-between mt-16 pt-6">
        <div className="text-center w-56">
          <div className="border-t border-gray-400 pt-2 text-[10px] font-bold uppercase text-gray-500">Prepared by{preparedBy ? `: ${preparedBy}` : ''}</div>
        </div>
        <div className="text-center w-56">
          <div className="border-t border-gray-400 pt-2 text-[10px] font-bold uppercase text-gray-500">Reviewed / Approved by</div>
        </div>
      </div>
    </div>
  );
};

export default TravelReports;