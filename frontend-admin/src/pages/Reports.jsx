import React, { useState, useContext, useMemo } from 'react';
import { AdminDataContext } from '../contexts/AdminDataContext';
import { AdminBillingContext } from '../contexts/AdminBillingContext';
import {
  Printer, Save, History, Archive, Trash2, Calendar, Settings2, Filter, FileSpreadsheet, FileText
} from 'lucide-react';
import "../Styles/Reports.css";
import AccentBadge from '../components/AccentBadge';

// Set this to your organization's display name — it appears on the printed
// letterhead. Pull from config/context instead of a constant if you have one.
const ORG_NAME = 'Tourism Management Office';

// Safely pull the YYYY-MM-DD portion out of an ISO timestamp without throwing
// if the value is missing.
const safeDatePart = (isoString) => {
  if (!isoString || typeof isoString !== 'string') return '';
  return isoString.split('T')[0];
};

// Escapes a single CSV field: wraps in quotes and doubles any internal quotes
// whenever the value contains a comma, quote, or newline.
const csvEscape = (value) => {
  const str = value === null || value === undefined ? '' : String(value);
  if (/[",\n]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
};

const money = (n) => (n || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const describePeriod = (filterLevel, dateFilter) => {
  if (!dateFilter) return 'All Time';
  if (filterLevel === 'year') return dateFilter;
  if (filterLevel === 'month') {
    const [y, m] = dateFilter.split('-');
    if (!y || !m) return dateFilter;
    return new Date(Number(y), Number(m) - 1, 1).toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
  }
  return new Date(dateFilter + 'T00:00:00').toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });
};

const Reports = () => {
  const { filteredData, createItem, updateItem, deleteItem } = useContext(AdminDataContext);
  const { bills } = useContext(AdminBillingContext);

  const [reportType, setReportType] = useState('booking');
  const [showHistory, setShowHistory] = useState(false);
  const [showArchived, setShowArchived] = useState(false);
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
  const [reportNote, setReportNote] = useState('');
  const [preparedBy, setPreparedBy] = useState('');
  const [includeSummaryOnPrint, setIncludeSummaryOnPrint] = useState(true);
  const [statusTab, setStatusTab] = useState('all');
  const [filterLevel, setFilterLevel] = useState('day');
  const [dateFilter, setDateFilter] = useState('');
  const [isExporting, setIsExporting] = useState(false);

  const validBills = useMemo(() =>
    bills.filter(b => ['issued', 'paid', 'verified'].includes(b.status)), [bills]);

  // Filtered by date ONLY. This is the source of truth for the summary
  // totals so switching the status tab doesn't hide revenue from the totals.
  const dateFilteredBookings = useMemo(() => {
    return (filteredData.bookings || [])
      .map(booking => {
        const bill = validBills.find(b => b.booking === booking.id);
        if (!bill) return null;
        return {
          ...booking,
          billRef: bill.id,
          billStatus: bill.status === 'verified' ? 'paid' : bill.status,
          total: parseFloat(bill.total_amount) || 0,
          billDate: safeDatePart(bill.created_at)
        };
      })
      .filter(b => b && (!dateFilter || (b.billDate && b.billDate.startsWith(dateFilter))));
  }, [filteredData.bookings, validBills, dateFilter]);

  // Additionally filtered by the active status tab. Used for the table rows
  // and the subtotal row underneath them, NOT for the summary totals above.
  const bookingReport = useMemo(() => {
    return dateFilteredBookings.filter(b => statusTab === 'all' || b.billStatus === statusTab);
  }, [dateFilteredBookings, statusTab]);

  const stationReport = useMemo(() => {
    const stationMap = {};
    (filteredData.event_station_guest_checks || []).forEach(check => {
      const checkDate = safeDatePart(check.checked_at);
      if (dateFilter && !checkDate.startsWith(dateFilter)) return;

      const sName = check.station_name || 'Unknown Station';
      if (!stationMap[sName]) {
        stationMap[sName] = {
          name: sName, count: 0, male: 0, female: 0, genderUnspecified: 0,
          local: 0, intl: 0, originUnspecified: 0, ageSum: 0
        };
      }
      const s = stationMap[sName];
      s.count++;

      const gender = check.gender?.toLowerCase();
      if (gender === 'male') s.male++;
      else if (gender === 'female') s.female++;
      else s.genderUnspecified++;

      if (check.is_local === true) s.local++;
      else if (check.is_local === false) s.intl++;
      else s.originUnspecified++;

      s.ageSum += (check.age || 0);
    });
    return Object.values(stationMap);
  }, [filteredData.event_station_guest_checks, dateFilter]);

  const stationTotals = useMemo(() => stationReport.reduce((acc, s) => ({
    count: acc.count + s.count,
    male: acc.male + s.male,
    female: acc.female + s.female,
    genderUnspecified: acc.genderUnspecified + s.genderUnspecified,
    local: acc.local + s.local,
    intl: acc.intl + s.intl,
    originUnspecified: acc.originUnspecified + s.originUnspecified,
    ageSum: acc.ageSum + s.ageSum,
  }), { count: 0, male: 0, female: 0, genderUnspecified: 0, local: 0, intl: 0, originUnspecified: 0, ageSum: 0 }), [stationReport]);

  const savedReports = useMemo(() => {
    return (filteredData.reports || [])
      .filter(r => showArchived ? r.is_archived : !r.is_archived)
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  }, [filteredData.reports, showArchived]);

  const handleSaveReport = async () => {
    const dataToSave = reportType === 'booking' ? bookingReport : stationReport;
    const reportName = `${reportType.toUpperCase()} (${dateFilter || 'All Time'})`;
    try {
      const success = await createItem('reports', {
        title: reportName,
        data_snapshot: dataToSave,
        is_archived: false,
        created_at: new Date().toISOString()
      });
      if (success) {
        alert("Audit saved to history.");
      } else {
        alert("Could not save the report. Please try again.");
      }
    } catch (err) {
      console.error('Failed to save report:', err);
      alert("Could not save the report. Please try again.");
    }
  };

  // Exports a CSV that mirrors what's on screen: header rows describing the
  // report, the data table, and (for bookings) the same summary totals shown
  // in the UI — so the file is a complete, standalone record, not just rows.
  const downloadSpreadsheet = () => {
    const data = reportType === 'booking' ? bookingReport : stationReport;
    if (!data.length) return alert("No data to export");
    setIsExporting(true);
    try {
      const period = describePeriod(filterLevel, dateFilter);
      const generatedAt = new Date().toLocaleString();
      const metaRows = [
        [ORG_NAME],
        [`${reportType === 'booking' ? 'Financial' : 'Station'} Report — ${period}`],
        [`Generated: ${generatedAt}`],
        [],
      ];

      const headers = reportType === 'booking'
        ? ["Date", "Ref #", "Tourist", "Status", "Revenue"]
        : ["Station", "Total Hits", "Male", "Female", "Unspecified Gender", "Local", "International", "Unspecified Origin", "Avg Age"];

      const rows = data.map(item => reportType === 'booking'
        ? [item.billDate, item.billRef, item.tourist_name, item.billStatus, item.total.toFixed(2)]
        : [item.name, item.count, item.male, item.female, item.genderUnspecified, item.local, item.intl, item.originUnspecified, item.count ? Math.round(item.ageSum / item.count) : 0]);

      const summaryRows = [];
      if (reportType === 'booking') {
        const subtotal = bookingReport.reduce((s, r) => s + r.total, 0);
        summaryRows.push(
          [],
          ['Subtotal (current view)', subtotal.toFixed(2)],
          ['Realized (paid, all statuses)', realizedTotal.toFixed(2)],
          ['Receivable (issued, all statuses)', receivableTotal.toFixed(2)],
        );
      } else {
        summaryRows.push(
          [],
          ['Total', stationTotals.count, stationTotals.male, stationTotals.female, stationTotals.genderUnspecified, stationTotals.local, stationTotals.intl, stationTotals.originUnspecified, stationTotals.count ? Math.round(stationTotals.ageSum / stationTotals.count) : 0],
        );
      }

      const csvContent = [...metaRows, headers, ...rows, ...summaryRows]
        .map(row => row.map(csvEscape).join(","))
        .join("\n");

      // Prepend a UTF-8 BOM so Excel renders special characters correctly.
      const blob = new Blob(["\uFEFF" + csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      const stamp = new Date().toISOString().slice(0, 10);
      link.href = url;
      link.download = `Report_${reportType}_${dateFilter || 'all'}_${stamp}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } finally {
      setIsExporting(false);
    }
  };

  const handleFinalPrint = () => {
    setIsPrintModalOpen(false);
    setTimeout(() => window.print(), 300);
  };

  const realizedTotal = dateFilteredBookings
    .filter(r => r.billStatus === 'paid')
    .reduce((s, r) => s + r.total, 0);
  const receivableTotal = dateFilteredBookings
    .filter(r => r.billStatus === 'issued')
    .reduce((s, r) => s + r.total, 0);

  const period = describePeriod(filterLevel, dateFilter);

  return (
    <div className="reports-page-wrapper dark:bg-gray-900 print:!bg-white " >
      {/* Print-only rules: keep the printed page light and ink-friendly
          regardless of on-screen theme, preserve colored status badges,
          and stop table rows from splitting across a page break. */}
      <style>{`
        @media print {
          @page { margin: 16mm 14mm; }
          * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
          .reports-print-page, .reports-print-page * { color: #111827 !important; background: #ffffff !important; }
          .reports-print-page .status-badge-paid { background: #ecfdf5 !important; color: #059669 !important; }
          .reports-print-page .status-badge-issued { background: #eff6ff !important; color: #2563eb !important; }
          table { break-inside: auto; }
          tr { break-inside: avoid; break-after: auto; }
          thead { display: table-header-group; }
          tfoot { display: table-footer-group; }
        }
      `}</style>

      {isPrintModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[999] flex items-center justify-center p-4 no-print">
          <div className="bg-white dark:bg-gray-900 rounded-3xl p-8 max-w-md w-full shadow-2xl">
            <h2 className="text-xl font-black mb-1 text-gray-900 dark:text-gray-50">Prepare Document</h2>
            <p className="text-xs font-bold text-gray-400 dark:text-gray-500 mb-6">{reportType === 'booking' ? 'Financial' : 'Station'} Report · {period}</p>

            <label className="block text-[10px] font-black uppercase tracking-widest text-gray-400 dark:text-gray-500 mb-2">Prepared by</label>
            <input
              type="text"
              className="w-full border-2 border-gray-100 dark:border-gray-800 dark:bg-gray-800 dark:text-gray-100 rounded-2xl p-3 text-sm mb-4 outline-none focus:border-[var(--accent)]"
              placeholder="Your name"
              value={preparedBy}
              onChange={(e) => setPreparedBy(e.target.value)}
            />

            <label className="block text-[10px] font-black uppercase tracking-widest text-gray-400 dark:text-gray-500 mb-2">Audit memo</label>
            <textarea
              className="w-full border-2 border-gray-100 dark:border-gray-800 dark:bg-gray-800 dark:text-gray-100 rounded-2xl p-4 text-sm mb-4 outline-none focus:border-[var(--accent)]"
              placeholder="Add audit memo..."
              value={reportNote}
              onChange={(e) => setReportNote(e.target.value)}
            />

            <label className="flex items-center gap-2 mb-6 text-xs font-bold text-gray-600 dark:text-gray-300">
              <input type="checkbox" checked={includeSummaryOnPrint} onChange={(e) => setIncludeSummaryOnPrint(e.target.checked)} className="accent-[var(--accent)]" />
              Include revenue summary on printout
            </label>

            <div className="flex gap-3">
              <button onClick={() => setIsPrintModalOpen(false)} className="flex-1 py-4 text-xs font-black text-gray-400 dark:text-gray-500">CANCEL</button>
              <button onClick={handleFinalPrint} className="flex-1 py-4 bg-gray-900 dark:bg-[var(--accent)] text-white rounded-2xl text-xs font-black flex items-center justify-center gap-2">
                <Printer size={14} /> OPEN PRINT
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="reports-main-content reports-print-page dark:bg-gray-900">
        {/* Printable Letterhead */}
        <div className="hidden print:block mb-8 border-b-4 border-gray-900 pb-4 dark:bg-gray-900">
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-2xl font-black uppercase tracking-tight">{ORG_NAME}</h1>
              <p className="text-sm font-bold text-gray-600 mt-0.5">{reportType === 'booking' ? 'Financial Audit Report' : 'Station Activity Report'}</p>
            </div>
            <div className="text-right text-xs font-bold text-gray-500 leading-relaxed">
              <p>Period: {period}</p>
              <p>Generated: {new Date().toLocaleString()}</p>
              {preparedBy && <p>Prepared by: {preparedBy}</p>}
            </div>
          </div>
          {reportNote && (
            <div className="mt-4 p-4 bg-gray-50 border-l-4 border-gray-900 italic text-sm">Memo: {reportNote}</div>
          )}
        </div>

        {/* Printable summary (mirrors the on-screen totals so the figures
            that matter most for an audit aren't screen-only) */}
        {reportType === 'booking' && includeSummaryOnPrint && (
          <div className="hidden print:flex justify-end gap-10 mb-6 dark:bg-gray-900">
            <div className="text-right"><span className="block text-[9px] font-black text-gray-500 uppercase">Realized</span><span className="text-base font-black tabular-nums">${money(realizedTotal)}</span></div>
            <div className="text-right"><span className="block text-[9px] font-black text-gray-500 uppercase">Receivable</span><span className="text-base font-black tabular-nums">${money(receivableTotal)}</span></div>
          </div>
        )}

        <header className="dark:bg-gray-900 flex justify-between items-end mb-8 no-print border-b border-gray-100 dark:border-gray-800 pb-6">
          <div className="flex flex-col gap-4 dark:bg-gray-900">
            <AccentBadge icon={Settings2}>Reports </AccentBadge>
            <div className="flex bg-gray-100 dark:bg-gray-800 p-1 rounded-xl w-fit">
              <button onClick={() => setReportType('booking')} className={`px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${reportType === 'booking' ? 'bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-50 shadow-sm' : 'text-gray-400 dark:text-gray-500'}`}>Financial</button>
              <button onClick={() => setReportType('station')} className={`px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${reportType === 'station' ? 'bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-50 shadow-sm' : 'text-gray-400 dark:text-gray-500'}`}>Stations</button>
            </div>
          </div>

          <div className="flex flex-col items-end gap-2">
            <div className="flex bg-gray-100 dark:bg-gray-800 p-1 rounded-lg no-print">
              {['day', 'month', 'year'].map(lvl => (
                <button key={lvl} onClick={() => { setFilterLevel(lvl); setDateFilter(''); }} className={`px-3 py-1 rounded-md text-[9px] font-black uppercase transition-all ${filterLevel === lvl ? 'bg-[var(--accent)] text-white' : 'text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300'}`}>{lvl}</button>
              ))}
            </div>
            <div className="flex items-center gap-3">
              <div className="relative group">
                <Calendar size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500" />
                <input type={filterLevel === 'year' ? 'number' : filterLevel === 'month' ? 'month' : 'date'} className="pl-9 pr-4 py-2 border dark:border-gray-800 rounded-xl text-sm font-bold bg-gray-50 dark:bg-gray-800 dark:text-gray-100 outline-none min-w-[160px] focus:border-[var(--accent)]" value={dateFilter} onChange={e => setDateFilter(e.target.value)} />
              </div>
              <button onClick={() => setShowHistory(!showHistory)} className={`p-2.5 rounded-xl border transition-all ${showHistory ? 'bg-[var(--accent)]/10 border-[var(--accent)]/30 text-[var(--accent)]' : 'bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800 text-gray-400 dark:text-gray-500'}`} title="History"><History size={20} /></button>
            </div>
          </div>
        </header>

        {reportType === 'booking' && (
          <div className="flex justify-between items-center mb-6 no-print">
            <div className="flex gap-2">
              {['all', 'paid', 'issued'].map(t => (
                <button key={t} onClick={() => setStatusTab(t)} className={`px-4 py-1 rounded-lg text-[10px] font-black uppercase border transition-all ${statusTab === t ? 'bg-gray-900 dark:bg-[var(--accent)] text-white border-gray-900 dark:border-[var(--accent)]' : 'bg-white dark:bg-gray-900 text-gray-400 dark:text-gray-500 border-gray-100 dark:border-gray-800'}`}>{t}</button>
              ))}
            </div>
            <div className="flex gap-6">
              <div className="text-right"><span className="block text-[9px] font-black text-gray-400 dark:text-gray-500 uppercase">Realized</span><span className="text-lg font-black text-green-600 dark:text-green-400 tabular-nums">${money(realizedTotal)}</span></div>
              <div className="text-right"><span className="block text-[9px] font-black text-gray-400 dark:text-gray-500 uppercase">Receivable</span><span className="text-lg font-black text-blue-600 dark:text-blue-400 tabular-nums">${money(receivableTotal)}</span></div>
            </div>
          </div>
        )}

        <div className="border border-gray-200 dark:border-gray-800 rounded-2xl overflow-hidden shadow-sm bg-white dark:bg-gray-900 print:border-none print:shadow-none print:rounded-none">
          <table className="w-full text-left text-sm border-collapse">
            <thead className="bg-gray-50 dark:bg-gray-800/60 text-[10px] font-black text-gray-500 dark:text-gray-400 uppercase border-b border-gray-200 dark:border-gray-800">
              {reportType === 'booking' ? (
                <tr><th className="p-4">Date</th><th className="p-4">Ref #</th><th className="p-4">Tourist</th><th className="p-4">Status</th><th className="p-4 text-right">Revenue</th></tr>
              ) : (
                <tr><th className="p-4">Station Name</th><th className="p-4">Total Hits</th><th className="p-4">Gender</th><th className="p-4">Origin</th><th className="p-4 text-right">Avg Age</th></tr>
              )}
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {reportType === 'booking' ? (
                <>
                  {bookingReport.length === 0 && (
                    <tr><td colSpan="5" className="p-8 text-center text-xs font-bold text-gray-400 dark:text-gray-600">No bookings match this filter.</td></tr>
                  )}
                  {bookingReport.map((row) => (
                    <tr key={row.billRef ?? `${row.id}-${row.billDate}`} className="hover:bg-blue-50/30 dark:hover:bg-blue-500/5">
                      <td className="p-4 text-gray-400 dark:text-gray-500 font-bold tabular-nums">{row.billDate}</td>
                      <td className="p-4 font-mono font-bold text-[var(--accent)] text-xs">#{row.billRef}</td>
                      <td className="p-4 font-bold text-gray-800 dark:text-gray-200">{row.tourist_name}</td>
                      <td className="p-4">
                        <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase ${row.billStatus === 'paid' ? 'status-badge-paid bg-green-50 text-green-600 dark:bg-green-500/10 dark:text-green-400' : 'status-badge-issued bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400'}`}>{row.billStatus}</span>
                      </td>
                      <td className="p-4 text-right font-black text-gray-900 dark:text-gray-100 tabular-nums">${row.total.toFixed(2)}</td>
                    </tr>
                  ))}
                </>
              ) : (
                <>
                  {stationReport.length === 0 && (
                    <tr><td colSpan="5" className="p-8 text-center text-xs font-bold text-gray-400 dark:text-gray-600">No station activity in this period.</td></tr>
                  )}
                  {stationReport.map((row) => (
                    <tr key={row.name} className="hover:bg-purple-50/30 dark:hover:bg-[var(--accent)]/5">
                      <td className="p-4 font-black text-gray-800 dark:text-gray-200">{row.name}</td>
                      <td className="p-4 font-bold text-[var(--accent)]">{row.count} Checks</td>
                      <td className="p-4 text-xs text-gray-500 dark:text-gray-400">
                        {row.male}M / {row.female}F
                        {row.genderUnspecified > 0 && <span className="text-gray-300 dark:text-gray-600"> ({row.genderUnspecified} unspecified)</span>}
                      </td>
                      <td className="p-4 text-xs text-gray-500 dark:text-gray-400">
                        {row.local}L / {row.intl}I
                        {row.originUnspecified > 0 && <span className="text-gray-300 dark:text-gray-600"> ({row.originUnspecified} unspecified)</span>}
                      </td>
                      <td className="p-4 text-right font-black dark:text-gray-100">{row.count ? Math.round(row.ageSum / row.count) : 0} yrs</td>
                    </tr>
                  ))}
                </>
              )}
            </tbody>
            {reportType === 'booking' && bookingReport.length > 0 && (
              <tfoot>
                <tr className="bg-gray-50 dark:bg-gray-800/60 font-black border-t-2 border-gray-900 dark:border-gray-700">
                  <td colSpan="4" className="p-4 text-right uppercase text-[10px] text-gray-500 dark:text-gray-400">Subtotal ({statusTab}):</td>
                  <td className="p-4 text-right text-lg tabular-nums dark:text-gray-50">${bookingReport.reduce((s, r) => s + r.total, 0).toFixed(2)}</td>
                </tr>
              </tfoot>
            )}
            {reportType === 'station' && stationReport.length > 0 && (
              <tfoot>
                <tr className="bg-gray-50 dark:bg-gray-800/60 font-black border-t-2 border-gray-900 dark:border-gray-700">
                  <td className="p-4 text-[10px] uppercase text-gray-500 dark:text-gray-400">Total</td>
                  <td className="p-4 text-[var(--accent)]">{stationTotals.count} Checks</td>
                  <td className="p-4 text-xs text-gray-500 dark:text-gray-400">{stationTotals.male}M / {stationTotals.female}F</td>
                  <td className="p-4 text-xs text-gray-500 dark:text-gray-400">{stationTotals.local}L / {stationTotals.intl}I</td>
                  <td className="p-4 text-right dark:text-gray-50">{stationTotals.count ? Math.round(stationTotals.ageSum / stationTotals.count) : 0} yrs</td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>

        {/* Printable sign-off block for a "professional" paper trail */}
        <div className="hidden print:flex justify-between mt-16 pt-6">
          <div className="text-center w-56">
            <div className="border-t border-gray-400 pt-2 text-[10px] font-bold uppercase text-gray-500">Prepared by{preparedBy ? `: ${preparedBy}` : ''}</div>
          </div>
          <div className="text-center w-56">
            <div className="border-t border-gray-400 pt-2 text-[10px] font-bold uppercase text-gray-500">Reviewed / Approved by</div>
          </div>
        </div>
      </div>

      {showHistory && (
        <aside className="reports-history-sidebar no-print dark:bg-gray-900 dark:border-gray-800">
          <div className="flex justify-between items-center mb-6">
            <h2 className="font-black text-[10px] uppercase text-gray-400 dark:text-gray-500 tracking-widest">Saved Records</h2>
            <button onClick={() => setShowArchived(!showArchived)} className="text-[10px] font-bold text-[var(--accent)]">{showArchived ? "VIEW ACTIVE" : "VIEW ARCHIVED"}</button>
          </div>
          <div className="space-y-3">
            {savedReports.length === 0 && (
              <p className="text-xs font-bold text-gray-400 dark:text-gray-600">No {showArchived ? 'archived' : 'saved'} reports yet.</p>
            )}
            {savedReports.map(report => (
              <div key={report.id} className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 group">
                <p className="text-xs font-bold text-gray-800 dark:text-gray-200 mb-2 leading-snug">{report.title}</p>
                <div className="flex justify-between items-center">
                  <span className="text-[10px] text-gray-400 dark:text-gray-500 font-mono">{new Date(report.created_at).toLocaleDateString()}</span>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-all">
                    <button onClick={() => updateItem('reports', report.id, { is_archived: !report.is_archived })} className="p-1.5 hover:bg-[var(--accent)]/10 rounded text-[var(--accent)]"><Archive size={14} /></button>
                    <button onClick={() => deleteItem('reports', report.id)} className="p-1.5 hover:bg-red-50 dark:hover:bg-red-500/10 rounded text-red-500"><Trash2 size={14} /></button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </aside>
      )}

      {/* Actions */}
      <div className="fixed bottom-10 right-10 flex flex-col items-end gap-3 no-print">
        <div className="download-group download-options-container">
          <button className="bg-gray-900 dark:bg-gray-800 text-white px-6 py-4 rounded-full shadow-2xl flex items-center gap-3 hover:scale-105 transition-all">
            <span className="text-[10px] font-black uppercase tracking-widest">Download</span>
            <Filter size={18} />
          </button>

          <div className="download-options">
            <button
              onClick={downloadSpreadsheet}
              disabled={isExporting}
              className="bg-white dark:bg-gray-900 border-2 border-gray-100 dark:border-gray-800 text-gray-700 dark:text-gray-200 px-5 py-3 rounded-2xl shadow-xl hover:bg-gray-50 dark:hover:bg-gray-800 flex items-center gap-2 text-[10px] font-black uppercase whitespace-nowrap disabled:opacity-50"
            >
              <FileSpreadsheet size={16} className="text-green-600 dark:text-green-400" /> Export CSV
            </button>
            <button
              onClick={() => setIsPrintModalOpen(true)}
              className="bg-white dark:bg-gray-900 border-2 border-gray-100 dark:border-gray-800 text-gray-700 dark:text-gray-200 px-5 py-3 rounded-2xl shadow-xl hover:bg-gray-50 dark:hover:bg-gray-800 flex items-center gap-2 text-[10px] font-black uppercase whitespace-nowrap"
            >
              <FileText size={16} className="text-blue-600 dark:text-blue-400" /> Print / PDF
            </button>
          </div>
        </div>

        <button
          onClick={handleSaveReport}
          className="bg-[var(--accent)] text-white p-5 rounded-full shadow-2xl hover:scale-110 active:scale-95 transition-all"
          title="Save Audit"
        >
          <Save size={24} />
        </button>
      </div>
    </div>
  );
};

export default Reports;