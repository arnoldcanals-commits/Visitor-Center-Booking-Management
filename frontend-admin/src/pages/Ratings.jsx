import React, { useContext, useState, useMemo } from "react";
import { AdminDataContext } from "../contexts/AdminDataContext";
import { 
  Search, Filter, Archive, CheckCircle, Palmtree, Building2, UserCircle,
  XCircle, ChevronLeft, ChevronRight, Star, User, Mail, ChevronDown, CheckSquare, Square, Eye, EyeOff
} from "lucide-react";

const ReviewManagement = () => {
  const { adminData, updateItem } = useContext(AdminDataContext);
  
  // State
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [starFilter, setStarFilter] = useState("all");
  const [monthFilter, setMonthFilter] = useState("all");
  const [yearFilter, setYearFilter] = useState("all");
  const [selectedIds, setSelectedIds] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [entriesPerPage, setEntriesPerPage] = useState(12);
  const [viewArchived, setViewArchived] = useState(false);

  const TARGET_LABELS = {
    package: "Tour Package",
    guide: "Tour Guide",
    site: "Visitor Center",
  };
const TARGET_COLORS = {
  package: "bg-emerald-600",
  site: "bg-amber-500",
  guide: "bg-blue-600",
};
  // Calculate archived count for the badge
  const archivedCount = useMemo(() => {
    return (adminData.reviews || []).filter(r => r.is_archived).length;
  }, [adminData.reviews]);

  const filterOptions = useMemo(() => {
    const years = new Set();
    (adminData.reviews || []).forEach(r => {
      if (r.created_at) years.add(new Date(r.created_at).getFullYear());
    });
    return {
      years: Array.from(years).sort((a, b) => b - a),
      months: [
        "January", "February", "March", "April", "May", "June",
        "July", "August", "September", "October", "November", "December"
      ]
    };
  }, [adminData.reviews]);

  const reviews = useMemo(() => {
    return (adminData.reviews || []).filter((item) => {
      const date = new Date(item.created_at);
      const searchString = `${item.reviewer_name} ${item.reviewer_email} ${item.comment} ${item.package_name || ''} ${item.guide_name || ''}`.toLowerCase();
      
      const matchesSearch = searchString.includes(search.toLowerCase());
      const matchesType = typeFilter === "all" || item.target_type === typeFilter;
      const matchesStars = starFilter === "all" || item.rating === parseInt(starFilter);
      const matchesMonth = monthFilter === "all" || date.getMonth() === parseInt(monthFilter);
      const matchesYear = yearFilter === "all" || date.getFullYear() === parseInt(yearFilter);
      const matchesArchiveStatus = !!item.is_archived === viewArchived;
      
      return matchesSearch && matchesType && matchesStars && matchesMonth && matchesYear && matchesArchiveStatus;
    });
  }, [adminData.reviews, search, typeFilter, starFilter, monthFilter, yearFilter, viewArchived]);

  const totalPages = Math.ceil(reviews.length / entriesPerPage);
  const paginatedReviews = reviews.slice((currentPage - 1) * entriesPerPage, currentPage * entriesPerPage);

  const handleBulkAction = async (field, value) => {
    const promises = selectedIds.map(id => updateItem("reviews", id, { [field]: value }));
    await Promise.all(promises);
    setSelectedIds([]);
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === paginatedReviews.length && paginatedReviews.length > 0) {
      setSelectedIds([]);
    } else {
      setSelectedIds(paginatedReviews.map(r => r.id));
    }
  };

  const CustomSelect = ({ value, onChange, options, placeholder, width = "w-auto" }) => (
    <div className={`relative ${width}`}>
      <select 
        value={value} 
        onChange={(e) => { onChange(e.target.value); setCurrentPage(1); }}
        className="appearance-none w-full pl-3 pr-8 py-2.5 border border-gray-200 rounded-xl bg-white text-sm font-medium focus:ring-2 focus:ring-blue-500 outline-none cursor-pointer transition-all"
      >
        <option value="all">{placeholder}</option>
        {options.map(opt => (
          <option key={opt.val} value={opt.val}>{opt.label}</option>
        ))}
      </select>
      <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={14} />
    </div>
  );

  return (
    <div className="p-4 md:p-6 bg-gray-50 min-h-screen font-sans selection:bg-blue-100 text-slate-900">
      <div className="max-w-7xl mx-auto">
        <header className="mb-10 flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2 p-3 bg-amber-50 text-yellow-600 rounded-xl w-fit border border-purple-100">
               <UserCircle size={18} />
               <span className="text-sm font-black uppercase tracking-tight">Ratings Management</span>
            </div>
          </div>

          <button 
            onClick={() => { setViewArchived(!viewArchived); setCurrentPage(1); setSelectedIds([]); }}
            className={`flex items-center gap-2.5 px-5 py-2.5 rounded-xl font-bold text-sm transition-all shadow-sm border ${
                viewArchived 
                ? 'bg-amber-400 border-amber-500 text-white hover:bg-amber-500' 
                : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
            }`}
          >
            {viewArchived ? <EyeOff size={18} /> : <Archive size={18} />}
            <span>{viewArchived ? "Viewing Archived" : "View Archive"}</span>
            <span className={`px-2 py-0.5 rounded-lg text-[10px] ${viewArchived ? 'bg-amber-300 text-white' : 'bg-gray-100 text-gray-500'}`}>
                {archivedCount}
            </span>
          </button>
        </header>

        {/* Action Bar */}
        <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-200 mb-6 space-y-4">
          <div className="flex flex-wrap gap-3 items-center">
            <button 
                onClick={toggleSelectAll}
                className={`p-2.5 rounded-xl border transition-all flex items-center gap-2 text-sm font-bold ${selectedIds.length > 0 ? 'bg-blue-50 border-blue-200 text-blue-600' : 'bg-gray-50 border-gray-200 text-gray-400 hover:bg-gray-100'}`}
            >
                {selectedIds.length === paginatedReviews.length && paginatedReviews.length > 0 ? <CheckSquare size={18} /> : <Square size={18} />}
                <span className="hidden sm:inline">{selectedIds.length > 0 ? `Selected (${selectedIds.length})` : 'Select All'}</span>
            </button>

            <div className="relative flex-grow lg:max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search reviews..."
                className="pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl w-full focus:ring-2 focus:ring-blue-500 outline-none transition-all text-sm"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

            <div className="flex flex-wrap gap-2">
              <CustomSelect value={typeFilter} onChange={setTypeFilter} placeholder="All Categories" options={[{val: 'package', label: 'Packages'}, {val: 'guide', label: 'Guides'}, {val: 'site', label: 'Visitor Center'}]} />
              <CustomSelect value={starFilter} onChange={setStarFilter} placeholder="Rating: All" options={[5,4,3,2,1].map(n => ({val: n, label: `${n} Stars`}))} />
              <CustomSelect value={monthFilter} onChange={setMonthFilter} placeholder="All Months" options={filterOptions.months.map((m, i) => ({val: i, label: m}))} />
              <CustomSelect value={yearFilter} onChange={setYearFilter} placeholder="All Years" options={filterOptions.years.map(y => ({val: y, label: y}))} />
            </div>

            <div className="ml-auto flex gap-2">
              <button disabled={selectedIds.length === 0} onClick={() => handleBulkAction('is_active', true)} className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl disabled:opacity-30 text-xs font-bold transition-all shadow-sm">
                APPROVE
              </button>
              <button disabled={selectedIds.length === 0} onClick={() => handleBulkAction('is_active', false)} className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl disabled:opacity-30 text-xs font-bold transition-all shadow-sm">
                DEACTIVATE
              </button>
              <button disabled={selectedIds.length === 0} onClick={() => handleBulkAction('is_archived', !viewArchived)} className={`px-4 py-2 rounded-xl disabled:opacity-30 text-xs font-bold transition-all shadow-sm uppercase ${viewArchived ? 'bg-blue-600 hover:bg-blue-700 text-white' : 'bg-gray-900 hover:bg-black text-white'}`}>
                {viewArchived ? "Restore" : "Archive"}
              </button>
            </div>
          </div>
        </div>

        {/* Review Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {paginatedReviews.map((review) => (
            <div key={review.id} className={`group bg-white border rounded-2xl overflow-hidden transition-all duration-300 relative ${review.is_archived ? 'border-amber-200 bg-amber-50/20' : 'shadow-sm hover:shadow-xl hover:-translate-y-1 border-gray-200'}`}>
              
              {!review.is_archived && review.is_active && (
                <div className="absolute top-3 right-3 flex items-center gap-1.5 bg-emerald-50 px-2 py-1 rounded-full border border-emerald-100">
                  <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="text-[9px] font-bold text-emerald-700 uppercase">Live</span>
                </div>
              )}

              <div className="p-5">
                <div className="flex items-start gap-4">
                  <input 
                    type="checkbox"
                    className="mt-1 h-5 w-5 rounded-md border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                    checked={selectedIds.includes(review.id)}
                    onChange={() => setSelectedIds(prev => prev.includes(review.id) ? prev.filter(i => i !== review.id) : [...prev, review.id])}
                  />
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-start mb-1">
                      <div className="flex items-center gap-3">
                        {review.reviewer_avatar ? (
                          <img src={review.reviewer_avatar} alt="" className="h-10 w-10 rounded-full object-cover border-2 border-white shadow-sm" />
                        ) : (
                          <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600"><User size={20}/></div>
                        )}
                        <div>
                          <h3 className="font-bold text-gray-900 truncate leading-tight">{review.reviewer_name}</h3>
                          <div className="flex items-center gap-1 text-[11px] text-gray-400"><Mail size={10}/> {review.reviewer_email}</div>
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-0.5">
                      {[...Array(5)].map((_, i) => (
                        <Star key={i} size={12} className={i < review.rating ? "fill-yellow-400 text-yellow-400" : "text-gray-200"} />
                      ))}
                    </div>

                    <div className="mt-4 bg-gray-50 rounded-xl p-3 border border-gray-100 relative">
                      <span className={`absolute -top-2 left-3 ${TARGET_COLORS[review.target_type]} text-[9px] font-black text-white px-2 py-0.5 rounded-full uppercase tracking-tighter shadow-sm`}>
  {TARGET_LABELS[review.target_type]}
</span>
                      <p className="text-sm text-gray-700 italic leading-relaxed">"{review.comment || 'No feedback provided.'}"</p>
                    </div>
                      
                    <div className="mt-4 flex items-center justify-between">
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="h-9 w-9 rounded-xl flex-shrink-0 overflow-hidden border border-gray-100 flex items-center justify-center shadow-sm bg-white">
                          {review.target_type === 'guide' ? (
                            review.guide_avatar ? <img src={review.guide_avatar} alt="" className="h-full w-full object-cover" /> 
                            : <div className="h-full w-full flex items-center justify-center text-gray-400 bg-gray-50"><User size={16} /></div>
                          ) : review.target_type === 'package' ? (
                            <div className="h-full w-full flex items-center justify-center text-emerald-600 bg-emerald-50"><Palmtree size={18} /></div>
                          ) : (
                            <div className="h-full w-full flex items-center justify-center text-amber-600 bg-amber-50"><Building2 size={18} /></div>
                          )}
                        </div>
                        <div className="text-[11px] truncate">
                          <span className="text-gray-400 block font-medium leading-none mb-1">Reviewing:</span>
                          <p className="font-bold text-gray-800 truncate max-w-[130px]">{review.package_name || review.guide_name || 'Visitor Center'}</p>
                        </div>
                      </div>

                      <div className="flex gap-1.5 opacity-0 group-hover:opacity-100 transition-all duration-200 translate-x-2 group-hover:translate-x-0">
                        <button 
                          onClick={() => updateItem("reviews", review.id, { is_active: !review.is_active })} 
                          className={`p-2 rounded-xl transition-colors ${review.is_active ? 'text-red-600 bg-red-50 hover:bg-red-100' : 'text-emerald-600 bg-emerald-50 hover:bg-emerald-100'}`}
                        >
                          {review.is_active ? <XCircle size={18} /> : <CheckCircle size={18} />}
                        </button>
                        <button 
                          onClick={() => updateItem("reviews", review.id, { is_archived: !review.is_archived })} 
                          className={`p-2 rounded-xl transition-colors ${review.is_archived ? 'text-blue-600 bg-blue-50 hover:bg-blue-100' : 'text-gray-400 bg-gray-100 hover:bg-gray-200'}`}
                        >
                          {review.is_archived ? <Eye size={18} /> : <Archive size={18} />}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {reviews.length === 0 && (
          <div className="text-center py-20 bg-white rounded-3xl border border-dashed border-gray-300">
            <Search className="mx-auto h-12 w-10 text-gray-200 mb-4" />
            <h3 className="text-lg font-bold text-gray-900">No {viewArchived ? 'archived' : ''} reviews found</h3>
            <p className="text-gray-500">Try adjusting your filters or search terms.</p>
          </div>
        )}

        <div className="mt-10 flex flex-col sm:flex-row items-center justify-between gap-4 pb-10">
          <div className="flex items-center gap-4">
            <p className="text-sm text-gray-500 font-medium whitespace-nowrap">
              Showing <span className="text-gray-900">{(currentPage - 1) * entriesPerPage + 1}</span> to <span className="text-gray-900">{Math.min(currentPage * entriesPerPage, reviews.length)}</span> of {reviews.length}
            </p>
            <div className="relative">
              <select value={entriesPerPage} onChange={(e) => { setEntriesPerPage(Number(e.target.value)); setCurrentPage(1); }} className="appearance-none pl-3 pr-8 py-1.5 border border-gray-200 rounded-lg bg-white text-xs font-bold text-gray-700 outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer">
                {[6, 12, 24, 48].map(n => <option key={n} value={n}>Show {n}</option>)}
              </select>
              <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={12} />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button disabled={currentPage === 1} onClick={() => setCurrentPage(prev => prev - 1)} className="h-10 w-10 flex items-center justify-center border border-gray-200 rounded-xl hover:bg-white transition-colors disabled:opacity-20 shadow-sm"><ChevronLeft size={20} /></button>
            <div className="h-10 px-4 flex items-center justify-center bg-white border border-gray-200 rounded-xl text-sm font-bold shadow-sm">{currentPage} / {totalPages || 1}</div>
            <button disabled={currentPage === totalPages || totalPages === 0} onClick={() => setCurrentPage(prev => prev + 1)} className="h-10 w-10 flex items-center justify-center border border-gray-200 rounded-xl hover:bg-white transition-colors disabled:opacity-20 shadow-sm"><ChevronRight size={20} /></button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReviewManagement;