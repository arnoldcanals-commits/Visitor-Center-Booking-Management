import { useContext, useState, useEffect, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { AdminBillingContext } from "../contexts/AdminBillingContext";
import { 
  Search, 
  Filter, 
  Archive, 
  Eye, 
  ChevronLeft, 
  ChevronRight, 
  Calendar,
  Inbox,
  LayoutGrid
} from "lucide-react";

import BillInfoModal from "../components/billing/BillInfoModal";
import FeesPage from "../components/billing/FeesPage";
import FeesManager from "./FeesManager";
export default function Billing() {
  const { bills } = useContext(AdminBillingContext);
  const { refNumber } = useParams(); // Assumes route is /billing/:refNumber?
  const navigate = useNavigate();

  // --- States ---
  const [activeTab, setActiveTab] = useState("bills");
  const [activeBill, setActiveBill] = useState(null);
  const [showArchived, setShowArchived] = useState(false);
  
  // Filtering States
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [dateFilter, setDateFilter] = useState({ type: "all", value: "" });
  
  // Pagination States
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  // --- Logic: Handle Deep Link ---
  useEffect(() => {
    if (refNumber && bills.length > 0) {
      const bill = bills.find(b => b.reference_no === refNumber);
      if (bill) setActiveBill(bill);
    }
  }, [refNumber, bills]);

  const handleCloseModal = () => {
    setActiveBill(null);
    navigate("/billing"); // Clear the URL param when closing
  };

  // --- Logic: Processing Data ---
  const processedBills = useMemo(() => {
    let filtered = [...bills]
      // 1. Sort by newest (assuming created_at exists, otherwise id)
      .sort((a, b) => new Date(b.created_at || b.id) - new Date(a.created_at || a.id));

    // 2. Archive Toggle
    filtered = filtered.filter(b => !!b.is_archived === showArchived);

    // 3. Search Filter
    if (search) {
      filtered = filtered.filter(b => 
        b.reference_no.toLowerCase().includes(search.toLowerCase())
      );
    }

    // 4. Status Filter
    if (statusFilter !== "all") {
      filtered = filtered.filter(b => b.status === statusFilter);
    }

    // 5. Date/Month/Year Filter
    if (dateFilter.type !== "all" && dateFilter.value) {
      filtered = filtered.filter(b => {
        const d = new Date(b.created_at);
        if (dateFilter.type === "day") return d.toISOString().split('T')[0] === dateFilter.value;
        if (dateFilter.type === "month") return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}` === dateFilter.value;
        if (dateFilter.type === "year") return d.getFullYear().toString() === dateFilter.value;
        return true;
      });
    }

    return filtered;
  }, [bills, search, statusFilter, dateFilter, showArchived]);

  // Pagination Calculations
  const totalPages = Math.ceil(processedBills.length / itemsPerPage);
  const paginatedBills = processedBills.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  return (
    <div className="p-6 font-['Inter'] bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto">
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8 bg-white p-4 rounded-xl shadow">
          <div>
      <div className="flex items-center gap-2 p-3 bg-blue-50 text-blue-600 rounded-xl w-fit border border-purple-100">
               <LayoutGrid size={18} />
               <span className="text-sm font-black uppercase tracking-tight">Billing Management</span>
            </div>
          </div>
          
          <button 
            onClick={() => { setShowArchived(!showArchived); setCurrentPage(1); }}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg border transition-all ${
              showArchived ? "bg-blue-50 border-blue-200 text-blue-700" : "bg-white border-gray-200 text-gray-600 hover:bg-gray-50"
            }`}
          >
            <Archive size={18} />
            {showArchived ? "Viewing Archived" : "View Archived"}
          </button>
        </header>

        {/* ───────── Tabs ───────── */}
        <div className="flex gap-1 mb-6 bg-gray-200/50 p-1 rounded-xl w-fit">
          {["bills", "fees"].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-6 py-2 text-sm font-semibold rounded-lg transition-all ${
                activeTab === tab ? "bg-white text-black shadow-sm" : "text-gray-500 hover:text-gray-700"
              }`}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>

        {activeTab === "bills" ? (
          <div className="space-y-4">
            {/* ───────── Filters ───────── */}
            <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                <input 
                  type="text"
                  placeholder="Search Reference No..."
                  className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              
              <select 
                className="w-full py-2 border border-gray-200 rounded-lg outline-none"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="all">All Statuses</option>
                <option value="paid">Paid</option>
                <option value="pending">Pending</option>
                <option value="overdue">Overdue</option>
              </select>
              
              <div className="flex gap-2">
                <select 
                  className=" px-6 py-2 border border-gray-200 rounded-lg outline-none text-xs appearance-none"
                  onChange={(e) => setDateFilter({ ...dateFilter, type: e.target.value })}
                >
                  <option value="all">No Date Filter</option>
                  <option value="day">Day</option>
                  <option value="month">Month</option>
                  <option value="year">Year</option>
                </select>
                <input 
                  type={dateFilter.type === "year" ? "number" : dateFilter.type === "month" ? "month" : "date"}
                  disabled={dateFilter.type === "all"}
                  className=" px-2 py-2 border border-gray-200 rounded-lg outline-none disabled:bg-gray-50"
                  onChange={(e) => setDateFilter({ ...dateFilter, value: e.target.value })}
                />
              </div>

              <div className="flex items-center justify-end gap-2 text-sm text-gray-500">
                <span>Show</span>
                <select 
                  value={itemsPerPage} 
                  onChange={(e) => setItemsPerPage(Number(e.target.value))}
                  className="border rounded px-6 py-1"
                >
                  <option value={5}>5</option>
                  <option value={10}>10</option>
                  <option value={25}>25</option>
                </select>
                <span>per page</span>
              </div>
            </div>

            {/* ───────── Table ───────── */}
            <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Reference No.</th>
                    <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Date Created</th>
                    <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {paginatedBills.map((bill) => (
                    <tr key={bill.id} className="hover:bg-blue-50/30 transition-colors group">
                      <td className="px-6 py-4 font-mono text-sm font-semibold text-gray-700">
                        #{bill.reference_no}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">
                        {new Date(bill.created_at).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4">
                        <StatusBadge status={bill.status} />
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button
                          onClick={() => {
                            setActiveBill(bill);
                            navigate(`/billing/${bill.reference_no}`);
                          }}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
                        >
                          <Eye size={14} /> Details
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {paginatedBills.length === 0 && (
                <div className="py-20 flex flex-col items-center justify-center text-gray-400">
                  <Inbox size={48} className="mb-2 opacity-20" />
                  <p>No results match your criteria</p>
                </div>
              )}
            </div>

            {/* ───────── Pagination ───────── */}
            <div className="flex items-center justify-between bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
              <p className="text-sm text-gray-500">
                Showing <span className="font-medium">{(currentPage - 1) * itemsPerPage + 1}</span> to <span className="font-medium">{Math.min(currentPage * itemsPerPage, processedBills.length)}</span> of <span className="font-medium">{processedBills.length}</span> results
              </p>
              <div className="flex gap-2">
                <button 
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage(prev => prev - 1)}
                  className="p-2 border rounded-lg hover:bg-gray-50 disabled:opacity-30 transition-all"
                >
                  <ChevronLeft size={20} />
                </button>
                <button 
                  disabled={currentPage === totalPages || totalPages === 0}
                  onClick={() => setCurrentPage(prev => prev + 1)}
                  className="p-2 border rounded-lg hover:bg-gray-50 disabled:opacity-30 transition-all"
                >
                  <ChevronRight size={20} />
                </button>
              </div>
            </div>
          </div>
        ) : (
          <FeesManager />
        )}
      </div>

      {activeBill && (
        <BillInfoModal
          bill={activeBill}
          onClose={handleCloseModal}
        />
      )}
    </div>
  );
}

// Sub-component for clean status pills
function StatusBadge({ status }) {
  const styles = {
    paid: "bg-emerald-100 text-emerald-700 border-emerald-200",
    pending: "bg-amber-100 text-amber-700 border-amber-200",
    overdue: "bg-rose-100 text-rose-700 border-rose-200",
    default: "bg-gray-100 text-gray-700 border-gray-200"
  };
  
  const style = styles[status.toLowerCase()] || styles.default;
  
  return (
    <span className={`px-2.5 py-1 text-xs font-bold rounded-full border uppercase tracking-wider ${style}`}>
      {status}
    </span>
  );
}