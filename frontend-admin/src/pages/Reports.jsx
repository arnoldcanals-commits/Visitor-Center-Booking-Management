import React, { useState, useContext, useMemo } from 'react';
import { AdminDataContext } from '../contexts/AdminDataContext';
import { AdminBillingContext } from '../contexts/AdminBillingContext';
import { 
  Printer, Save, History, Archive, Trash2, Calendar, Settings2, Filter, FileSpreadsheet, FileText
} from 'lucide-react';
import "../Styles/Reports.css";

const Reports = () => {
  const { filteredData, createItem, updateItem, deleteItem } = useContext(AdminDataContext);
  const { bills } = useContext(AdminBillingContext);

  const [reportType, setReportType] = useState('booking'); 
  const [showHistory, setShowHistory] = useState(false);
  const [showArchived, setShowArchived] = useState(false);
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
  const [reportNote, setReportNote] = useState('');
  const [statusTab, setStatusTab] = useState('all');
  const [filterLevel, setFilterLevel] = useState('day'); 
  const [dateFilter, setDateFilter] = useState(''); 

  const validBills = useMemo(() => 
    bills.filter(b => ['issued', 'paid', 'verified'].includes(b.status)), [bills]);

  const bookingReport = useMemo(() => {
    return (filteredData.bookings || [])
      .map(booking => {
        const bill = validBills.find(b => b.booking === booking.id);
        if (!bill) return null; 
        return {
          ...booking,
          billRef: bill.id,
          billStatus: bill.status === 'verified' ? 'paid' : bill.status,
          total: parseFloat(bill.total_amount) || 0,
          billDate: bill.created_at.split('T')[0]
        };
      })
      .filter(b => b && (!dateFilter || b.billDate.startsWith(dateFilter)))
      .filter(b => statusTab === 'all' || b.billStatus === statusTab);
  }, [filteredData.bookings, validBills, dateFilter, statusTab]);

  const stationReport = useMemo(() => {
    const stationMap = {};
    (filteredData.event_station_guest_checks || []).forEach(check => {
      const checkDate = check.checked_at.split('T')[0];
      if (dateFilter && !checkDate.startsWith(dateFilter)) return;

      const sName = check.station_name;
      if (!stationMap[sName]) {
        stationMap[sName] = { name: sName, count: 0, male: 0, female: 0, local: 0, intl: 0, ageSum: 0 };
      }
      const s = stationMap[sName];
      s.count++;
      check.gender?.toLowerCase() === 'male' ? s.male++ : s.female++;
      check.is_local ? s.local++ : s.intl++;
      s.ageSum += (check.age || 0);
    });
    return Object.values(stationMap);
  }, [filteredData.event_station_guest_checks, dateFilter]);

  const savedReports = useMemo(() => {
    return (filteredData.reports || [])
      .filter(r => showArchived ? r.is_archived : !r.is_archived)
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  }, [filteredData.reports, showArchived]);

  const handleSaveReport = async () => {
    const dataToSave = reportType === 'booking' ? bookingReport : stationReport;
    const reportName = `${reportType.toUpperCase()} (${dateFilter || 'All Time'})`;
    const success = await createItem('reports', {
      title: reportName,
      data_snapshot: dataToSave,
      is_archived: false,
      created_at: new Date().toISOString()
    });
    if (success) alert("Audit saved to history.");
  };

  const downloadSpreadsheet = () => {
    const data = reportType === 'booking' ? bookingReport : stationReport;
    if (!data.length) return alert("No data to export");
    const headers = reportType === 'booking' 
      ? ["Date", "Ref #", "Tourist", "Status", "Revenue"]
      : ["Station", "Total Hits", "M/F Split", "L/I Split", "Avg Age"];
    const rows = data.map(item => reportType === 'booking' 
      ? [item.billDate, item.billRef, item.tourist_name, item.billStatus, item.total]
      : [item.name, item.count, `${item.male}/${item.female}`, `${item.local}/${item.intl}`, Math.round(item.ageSum / item.count)]);
    const csvContent = [headers, ...rows].map(e => e.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `Report_${reportType}_${dateFilter || 'all'}.csv`;
    link.click();
  };

  const handleFinalPrint = () => {
    setIsPrintModalOpen(false);
    setTimeout(() => window.print(), 300);
  };

  return (
    <div className="reports-page-wrapper">
      {isPrintModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[999] flex items-center justify-center p-4 no-print">
          <div className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl">
            <h2 className="text-xl font-black mb-2 text-gray-900">Prepare Document</h2>
            <textarea className="w-full border-2 border-gray-100 rounded-2xl p-4 text-sm mb-6 outline-none focus:border-purple-500" placeholder="Add audit memo..." value={reportNote} onChange={(e) => setReportNote(e.target.value)} />
            <div className="flex gap-3">
              <button onClick={() => setIsPrintModalOpen(false)} className="flex-1 py-4 text-xs font-black text-gray-400">CANCEL</button>
              <button onClick={handleFinalPrint} className="flex-1 py-4 bg-gray-900 text-white rounded-2xl text-xs font-black">OPEN PRINT</button>
            </div>
          </div>
        </div>
      )}

      <div className="reports-main-content">
        {/* Printable Header */}
        <div className="hidden print:block mb-8">
            <h1 className="text-3xl font-black uppercase">{reportType} REPORT</h1>
            <p className="text-gray-500 font-bold">Generated on: {new Date().toLocaleDateString()}</p>
            {reportNote && <div className="mt-4 p-4 bg-gray-50 border-l-4 border-gray-900 italic text-sm">Memo: {reportNote}</div>}
        </div>

        <header className="flex justify-between items-end mb-8 no-print border-b border-gray-100 pb-6">
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-2 p-3 bg-purple-50 text-purple-600 rounded-xl w-fit border border-purple-100">
               <Settings2 size={18} />
               <span className="text-sm font-black uppercase tracking-tight">Report Management</span>
            </div>
            <div className="flex bg-gray-100 p-1 rounded-xl w-fit">
               <button onClick={() => setReportType('booking')} className={`px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${reportType === 'booking' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-400'}`}>Financial</button>
               <button onClick={() => setReportType('station')} className={`px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${reportType === 'station' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-400'}`}>Stations</button>
            </div>
          </div>

          <div className="flex flex-col items-end gap-2">
            <div className="flex bg-gray-100 p-1 rounded-lg no-print">
                {['day', 'month', 'year'].map(lvl => (
                    <button key={lvl} onClick={() => { setFilterLevel(lvl); setDateFilter(''); }} className={`px-3 py-1 rounded-md text-[9px] font-black uppercase transition-all ${filterLevel === lvl ? 'bg-purple-600 text-white' : 'text-gray-400 hover:text-gray-600'}`}>{lvl}</button>
                ))}
            </div>
            <div className="flex items-center gap-3">
                <div className="relative group">
                    <Calendar size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input type={filterLevel === 'year' ? 'number' : filterLevel === 'month' ? 'month' : 'date'} className="pl-9 pr-4 py-2 border rounded-xl text-sm font-bold bg-gray-50 outline-none min-w-[160px]" value={dateFilter} onChange={e => setDateFilter(e.target.value)} />
                </div>
                <button onClick={() => setShowHistory(!showHistory)} className={`p-2.5 rounded-xl border transition-all ${showHistory ? 'bg-purple-50 border-purple-200 text-purple-600' : 'bg-white border-gray-200 text-gray-400'}`} title="History"><History size={20} /></button>
            </div>
          </div>
        </header>

        {reportType === 'booking' && (
          <div className="flex justify-between items-center mb-6 no-print">
            <div className="flex gap-2">
              {['all', 'paid', 'issued'].map(t => (
                <button key={t} onClick={() => setStatusTab(t)} className={`px-4 py-1 rounded-lg text-[10px] font-black uppercase border transition-all ${statusTab === t ? 'bg-gray-900 text-white border-gray-900' : 'bg-white text-gray-400 border-gray-100'}`}>{t}</button>
              ))}
            </div>
            <div className="flex gap-6">
               <div className="text-right"><span className="block text-[9px] font-black text-gray-400 uppercase">Realized</span><span className="text-lg font-black text-green-600 tabular-nums">${bookingReport.filter(r => r.billStatus === 'paid').reduce((s, r) => s + r.total, 0).toLocaleString()}</span></div>
               <div className="text-right"><span className="block text-[9px] font-black text-gray-400 uppercase">Receivable</span><span className="text-lg font-black text-blue-600 tabular-nums">${bookingReport.filter(r => r.billStatus === 'issued').reduce((s, r) => s + r.total, 0).toLocaleString()}</span></div>
            </div>
          </div>
        )}

        <div className="border border-gray-200 rounded-2xl overflow-hidden shadow-sm bg-white print:border-none">
          <table className="w-full text-left text-sm border-collapse">
            <thead className="bg-gray-50 text-[10px] font-black text-gray-500 uppercase border-b border-gray-200">
              {reportType === 'booking' ? (
                <tr><th className="p-4">Date</th><th className="p-4">Ref #</th><th className="p-4">Tourist</th><th className="p-4">Status</th><th className="p-4 text-right">Revenue</th></tr>
              ) : (
                <tr><th className="p-4">Station Name</th><th className="p-4">Total Hits</th><th className="p-4">Gender</th><th className="p-4">Origin</th><th className="p-4 text-right">Avg Age</th></tr>
              )}
            </thead>
            <tbody className="divide-y divide-gray-100">
              {reportType === 'booking' ? (
                <>
                  {bookingReport.map((row, i) => (
                    <tr key={i} className="hover:bg-blue-50/30">
                      <td className="p-4 text-gray-400 font-bold tabular-nums">{row.billDate}</td>
                      <td className="p-4 font-mono font-bold text-blue-600 text-xs">#{row.billRef}</td>
                      <td className="p-4 font-bold text-gray-800">{row.tourist_name}</td>
                      <td className="p-4"><span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase ${row.billStatus === 'paid' ? 'bg-green-50 text-green-600' : 'bg-blue-50 text-blue-600'}`}>{row.billStatus}</span></td>
                      <td className="p-4 text-right font-black text-gray-900 tabular-nums">${row.total.toFixed(2)}</td>
                    </tr>
                  ))}
                  <tr className="bg-gray-50 font-black border-t-2 border-gray-900">
                    <td colSpan="4" className="p-4 text-right uppercase text-[10px] text-gray-500">Subtotal:</td>
                    <td className="p-4 text-right text-lg tabular-nums">${bookingReport.reduce((s, r) => s + r.total, 0).toFixed(2)}</td>
                  </tr>
                </>
              ) : (
                stationReport.map((row, i) => (
                  <tr key={i} className="hover:bg-purple-50/30">
                    <td className="p-4 font-black text-gray-800">{row.name}</td>
                    <td className="p-4 font-bold text-purple-600">{row.count} Checks</td>
                    <td className="p-4 text-xs text-gray-500">{row.male}M / {row.female}F</td>
                    <td className="p-4 text-xs text-gray-500">{row.local}L / {row.intl}I</td>
                    <td className="p-4 text-right font-black">{Math.round(row.ageSum / row.count) || 0} yrs</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showHistory && (
        <aside className="reports-history-sidebar no-print">
          <div className="flex justify-between items-center mb-6">
            <h2 className="font-black text-[10px] uppercase text-gray-400 tracking-widest">Saved Records</h2>
            <button onClick={() => setShowArchived(!showArchived)} className="text-[10px] font-bold text-purple-600">{showArchived ? "VIEW ACTIVE" : "VIEW ARCHIVED"}</button>
          </div>
          <div className="space-y-3">
            {savedReports.map(report => (
              <div key={report.id} className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 group">
                <p className="text-xs font-bold text-gray-800 mb-2 leading-snug">{report.title}</p>
                <div className="flex justify-between items-center">
                  <span className="text-[10px] text-gray-400 font-mono">{new Date(report.created_at).toLocaleDateString()}</span>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-all">
                    <button onClick={() => updateItem('reports', report.id, { is_archived: !report.is_archived })} className="p-1.5 hover:bg-purple-50 rounded text-purple-600"><Archive size={14}/></button>
                    <button onClick={() => deleteItem('reports', report.id)} className="p-1.5 hover:bg-red-50 rounded text-red-500"><Trash2 size={14}/></button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </aside>
      )}

      {/* 4. ACTIONS */}
      <div className="fixed bottom-10 right-10 flex flex-col items-end gap-3 no-print">
          <div className="download-group download-options-container">
            <button className="bg-gray-900 text-white px-6 py-4 rounded-full shadow-2xl flex items-center gap-3 hover:scale-105 transition-all">
                <span className="text-[10px] font-black uppercase tracking-widest">Download</span>
                <Filter size={18}/>
            </button>

            <div className="download-options">
                <button 
                  onClick={downloadSpreadsheet} 
                  className="bg-white border-2 border-gray-100 text-gray-700 px-5 py-3 rounded-2xl shadow-xl hover:bg-gray-50 flex items-center gap-2 text-[10px] font-black uppercase whitespace-nowrap"
                >
                    <FileSpreadsheet size={16} className="text-green-600"/> Export Excel
                </button>
                <button 
                  onClick={() => setIsPrintModalOpen(true)} 
                  className="bg-white border-2 border-gray-100 text-gray-700 px-5 py-3 rounded-2xl shadow-xl hover:bg-gray-50 flex items-center gap-2 text-[10px] font-black uppercase whitespace-nowrap"
                >
                    <FileText size={16} className="text-blue-600"/> Export PDF
                </button>
            </div>
          </div>

          <button 
            onClick={handleSaveReport} 
            className="bg-purple-600 text-white p-5 rounded-full shadow-2xl hover:scale-110 active:scale-95 transition-all"
            title="Save Audit"
          >
            <Save size={24}/>
          </button>
      </div>
    </div>
  );
};

export default Reports;