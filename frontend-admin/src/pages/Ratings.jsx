import React, { useContext, useState, useMemo } from "react";
import { AdminDataContext } from "../contexts/AdminDataContext";
import {
  Search, Filter, Archive, CheckCircle, Palmtree, Building2, UserCircle,
  XCircle, ChevronLeft, ChevronRight, Star, User, Mail, ChevronDown, CheckSquare, Square, Eye, EyeOff,
  LayoutGrid, List as ListIcon
} from "lucide-react";
import { motion } from "framer-motion";
import AccentBadge from "../components/AccentBadge";

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
  const [viewMode, setViewMode] = useState('list'); // 'grid' | 'list'

  const TARGET_LABELS = {
    package: "Tour Package",
    guide: "Tour Guide",
    site: "Visitor Center",
  };
  const TARGET_COLORS = {
    package: "bg-emerald-600",
    site: "bg-amber-500",
    guide: "bg-[var(--accent,#4f46e5)]",
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
        className="appearance-none w-full pl-3 pr-8 py-2.5 border border-gray-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 dark:text-gray-100 text-sm font-medium focus:ring-2 focus:ring-[var(--accent,#4f46e5)] outline-none cursor-pointer transition-all"
      >
        <option value="all">{placeholder}</option>
        {options.map(opt => (
          <option key={opt.val} value={opt.val}>{opt.label}</option>
        ))}
      </select>
      <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500 pointer-events-none" size={14} />
    </div>
  );

  const TargetIcon = ({ review, sizeClass = "h-9 w-9" }) => (
    <div className={`${sizeClass} rounded-xl flex-shrink-0 overflow-hidden border border-gray-100 dark:border-slate-700 flex items-center justify-center shadow-sm bg-white dark:bg-slate-800`}>
      {review.target_type === 'guide' ? (
        review.guide_avatar ? <img src={review.guide_avatar} alt="" className="h-full w-full object-cover" />
          : <div className="h-full w-full flex items-center justify-center text-gray-400 dark:text-gray-500 bg-gray-50 dark:bg-slate-700"><User size={16} /></div>
      ) : review.target_type === 'package' ? (
        <div className="h-full w-full flex items-center justify-center text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10"><Palmtree size={18} /></div>
      ) : (
        <div className="h-full w-full flex items-center justify-center text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-500/10"><Building2 size={18} /></div>
      )}
    </div>
  );

  return (
    <div className="p-4 md:p-6 bg-gray-50 dark:bg-slate-900 min-h-screen font-sans selection:bg-[color-mix(in_srgb,var(--accent,#4f46e5)_20%,white)] text-slate-900 dark:text-slate-100 transition-colors">
      <div className="max-w-7xl mx-auto">
        <header className="mb-10 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-slate-800 rounded-xl shadow p-4 border border-transparent dark:border-slate-700">
          <div className="space-y-2">
            <AccentBadge icon={UserCircle}>Ratings Management</AccentBadge>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {reviews.length} reviews found
            </p>

            {/* Sliding grid/list toggle - clicking anywhere in the pill flips it */}
            <div
              onClick={() => setViewMode(v => v === 'grid' ? 'list' : 'grid')}
              className="relative flex items-center bg-gray-100 dark:bg-slate-700 rounded-xl p-1 w-[72px] cursor-pointer select-none"
              title="Toggle grid / list view"
            >
              <motion.div
                layout
                transition={{ type: 'spring', stiffness: 400, damping: 32 }}
                className="absolute top-1 bottom-1 w-8 bg-white dark:bg-slate-600 rounded-lg shadow-sm"
                style={{ left: viewMode === 'grid' ? 4 : 36 }}
              />
              <div className={`relative z-10 flex-1 flex items-center justify-center p-1.5 transition-colors ${viewMode === 'grid' ? 'text-[var(--accent,#4f46e5)]' : 'text-gray-400 dark:text-gray-500'}`}>
                <LayoutGrid size={16} />
              </div>
              <div className={`relative z-10 flex-1 flex items-center justify-center p-1.5 transition-colors ${viewMode === 'list' ? 'text-[var(--accent,#4f46e5)]' : 'text-gray-400 dark:text-gray-500'}`}>
                <ListIcon size={16} />
              </div>
            </div>

            <button
              onClick={() => { setViewArchived(!viewArchived); setCurrentPage(1); setSelectedIds([]); }}
              className={`flex items-center gap-2.5 px-5 py-2.5 rounded-xl font-bold text-sm transition-all shadow-sm border ${
                viewArchived
                  ? 'bg-amber-400 dark:bg-amber-500/80 border-amber-500 dark:border-amber-500 text-white hover:bg-amber-500'
                  : 'bg-white dark:bg-slate-700 border-gray-200 dark:border-slate-600 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-600'
              }`}
            >
              {viewArchived ? <EyeOff size={18} /> : <Archive size={18} />}
              <span>{viewArchived ? "Viewing Archived" : "View Archive"}</span>
              <span className={`px-2 py-0.5 rounded-lg text-[10px] ${viewArchived ? 'bg-amber-300 dark:bg-amber-400/60 text-white' : 'bg-gray-100 dark:bg-slate-600 text-gray-500 dark:text-gray-300'}`}>
                {archivedCount}
              </span>
            </button>
          </div>
        </header>

        {/* Action Bar */}
        <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl shadow-sm border border-gray-200 dark:border-slate-700 mb-6 space-y-4">
          <div className="flex flex-wrap gap-3 items-center">
            <button
              onClick={toggleSelectAll}
              className={`p-2.5 rounded-xl border transition-all flex items-center gap-2 text-sm font-bold ${selectedIds.length > 0 ? 'bg-[color-mix(in_srgb,var(--accent,#4f46e5)_10%,white)] dark:bg-[color-mix(in_srgb,var(--accent,#4f46e5)_20%,black)] border-[color-mix(in_srgb,var(--accent,#4f46e5)_25%,white)] dark:border-[color-mix(in_srgb,var(--accent,#4f46e5)_40%,black)] text-[var(--accent,#4f46e5)]' : 'bg-gray-50 dark:bg-slate-700 border-gray-200 dark:border-slate-600 text-gray-400 dark:text-gray-500 hover:bg-gray-100 dark:hover:bg-slate-600'}`}
            >
              {selectedIds.length === paginatedReviews.length && paginatedReviews.length > 0 ? <CheckSquare size={18} /> : <Square size={18} />}
              <span className="hidden sm:inline">{selectedIds.length > 0 ? `Selected (${selectedIds.length})` : 'Select All'}</span>
            </button>

            <div className="relative flex-grow lg:max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 dark:text-gray-500" />
              <input
                type="text"
                placeholder="Search reviews..."
                className="pl-10 pr-4 py-2.5 border border-gray-200 dark:border-slate-700 rounded-xl w-full bg-white dark:bg-slate-800 dark:text-gray-100 focus:ring-2 focus:ring-[var(--accent,#4f46e5)] outline-none transition-all text-sm placeholder:text-gray-400"
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
              <button disabled={selectedIds.length === 0} onClick={() => handleBulkAction('is_archived', !viewArchived)} className={`px-4 py-2 rounded-xl disabled:opacity-30 text-xs font-bold transition-all shadow-sm uppercase ${viewArchived ? 'bg-[var(--accent,#4f46e5)] hover:bg-[color-mix(in_srgb,var(--accent,#4f46e5)_85%,black)] text-white' : 'bg-gray-900 dark:bg-slate-700 hover:bg-black dark:hover:bg-slate-600 text-white'}`}>
                {viewArchived ? "Restore" : "Archive"}
              </button>
            </div>
          </div>
        </div>

        {/* Review Cards Grid */}
        {viewMode === 'grid' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {paginatedReviews.map((review) => (
            <div key={review.id} className={`group bg-white dark:bg-slate-800 border rounded-2xl overflow-hidden transition-all duration-300 relative ${review.is_archived ? 'border-amber-200 dark:border-amber-500/30 bg-amber-50/20 dark:bg-amber-500/5' : 'shadow-sm hover:shadow-xl hover:-translate-y-1 border-gray-200 dark:border-slate-700'}`}>

              {!review.is_archived && review.is_active && (
                <div className="absolute top-3 right-3 flex items-center gap-1.5 bg-emerald-50 dark:bg-emerald-500/10 px-2 py-1 rounded-full border border-emerald-100 dark:border-emerald-500/20">
                  <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="text-[9px] font-bold text-emerald-700 dark:text-emerald-400 uppercase">Live</span>
                </div>
              )}

              <div className="p-5">
                <div className="flex items-start gap-4">
                  <input
                    type="checkbox"
                    className="mt-1 h-5 w-5 rounded-md border-gray-300 dark:border-slate-600 text-[var(--accent,#4f46e5)] focus:ring-[var(--accent,#4f46e5)] cursor-pointer"
                    checked={selectedIds.includes(review.id)}
                    onChange={() => setSelectedIds(prev => prev.includes(review.id) ? prev.filter(i => i !== review.id) : [...prev, review.id])}
                  />

                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-start mb-1">
                      <div className="flex items-center gap-3">
                        {review.reviewer_avatar ? (
                          <img src={review.reviewer_avatar} alt="" className="h-10 w-10 rounded-full object-cover border-2 border-white dark:border-slate-700 shadow-sm" />
                        ) : (
                          <div className="h-10 w-10 rounded-full bg-[color-mix(in_srgb,var(--accent,#4f46e5)_15%,white)] dark:bg-[color-mix(in_srgb,var(--accent,#4f46e5)_30%,black)] flex items-center justify-center text-[var(--accent,#4f46e5)]"><User size={20}/></div>
                        )}
                        <div>
                          <h3 className="font-bold text-gray-900 dark:text-gray-100 truncate leading-tight">{review.reviewer_name}</h3>
                          <div className="flex items-center gap-1 text-[11px] text-gray-400 dark:text-gray-500"><Mail size={10}/> {review.reviewer_email}</div>
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-0.5">
                      {[...Array(5)].map((_, i) => (
                        <Star key={i} size={12} className={i < review.rating ? "fill-yellow-400 text-yellow-400" : "text-gray-200 dark:text-slate-600"} />
                      ))}
                    </div>

                    <div className="mt-4 bg-gray-50 dark:bg-slate-700/50 rounded-xl p-3 border border-gray-100 dark:border-slate-700 relative">
                      <span className={`absolute -top-2 left-3 ${TARGET_COLORS[review.target_type]} text-[9px] font-black text-white px-2 py-0.5 rounded-full uppercase tracking-tighter shadow-sm`}>
                        {TARGET_LABELS[review.target_type]}
                      </span>
                      <p className="text-sm text-gray-700 dark:text-gray-300 italic leading-relaxed">"{review.comment || 'No feedback provided.'}"</p>
                    </div>

                    <div className="mt-4 flex items-center justify-between">
                      <div className="flex items-center gap-2 min-w-0">
                        <TargetIcon review={review} />
                        <div className="text-[11px] truncate">
                          <span className="text-gray-400 dark:text-gray-500 block font-medium leading-none mb-1">Reviewing:</span>
                          <p className="font-bold text-gray-800 dark:text-gray-200 truncate max-w-[130px]">{review.package_name || review.guide_name || 'Visitor Center'}</p>
                        </div>
                      </div>

                      <div className="flex gap-1.5 opacity-0 group-hover:opacity-100 transition-all duration-200 translate-x-2 group-hover:translate-x-0">
                        <button
                          onClick={() => updateItem("reviews", review.id, { is_active: !review.is_active })}
                          className={`p-2 rounded-xl transition-colors ${review.is_active ? 'text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-500/10 hover:bg-red-100 dark:hover:bg-red-500/20' : 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 hover:bg-emerald-100 dark:hover:bg-emerald-500/20'}`}
                        >
                          {review.is_active ? <XCircle size={18} /> : <CheckCircle size={18} />}
                        </button>
                        <button
                          onClick={() => updateItem("reviews", review.id, { is_archived: !review.is_archived })}
                          className={`p-2 rounded-xl transition-colors ${review.is_archived ? 'text-[var(--accent,#4f46e5)] bg-[color-mix(in_srgb,var(--accent,#4f46e5)_10%,white)] dark:bg-[color-mix(in_srgb,var(--accent,#4f46e5)_20%,black)] hover:bg-[color-mix(in_srgb,var(--accent,#4f46e5)_18%,white)]' : 'text-gray-400 dark:text-gray-500 bg-gray-100 dark:bg-slate-700 hover:bg-gray-200 dark:hover:bg-slate-600'}`}
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
        )}

        {/* Review List */}
        {viewMode === 'list' && (
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-gray-200 dark:border-slate-700 divide-y divide-gray-100 dark:divide-slate-700 overflow-hidden">
          {paginatedReviews.map((review) => (
            <div key={review.id} className={`flex flex-col md:flex-row md:items-center gap-4 p-4 transition-colors hover:bg-gray-50 dark:hover:bg-slate-700/40 ${review.is_archived ? 'bg-amber-50/20 dark:bg-amber-500/5' : ''}`}>
              <div className="flex items-center gap-4 flex-1 min-w-0">
                <input
                  type="checkbox"
                  className="h-5 w-5 rounded-md border-gray-300 dark:border-slate-600 text-[var(--accent,#4f46e5)] focus:ring-[var(--accent,#4f46e5)] cursor-pointer shrink-0"
                  checked={selectedIds.includes(review.id)}
                  onChange={() => setSelectedIds(prev => prev.includes(review.id) ? prev.filter(i => i !== review.id) : [...prev, review.id])}
                />

                {review.reviewer_avatar ? (
                  <img src={review.reviewer_avatar} alt="" className="h-10 w-10 rounded-full object-cover border-2 border-white dark:border-slate-700 shadow-sm shrink-0" />
                ) : (
                  <div className="h-10 w-10 rounded-full bg-[color-mix(in_srgb,var(--accent,#4f46e5)_15%,white)] dark:bg-[color-mix(in_srgb,var(--accent,#4f46e5)_30%,black)] flex items-center justify-center text-[var(--accent,#4f46e5)] shrink-0"><User size={20}/></div>
                )}

                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-bold text-gray-900 dark:text-gray-100 truncate">{review.reviewer_name}</h3>
                    <span className={`${TARGET_COLORS[review.target_type]} text-[9px] font-black text-white px-2 py-0.5 rounded-full uppercase tracking-tighter shadow-sm`}>
                      {TARGET_LABELS[review.target_type]}
                    </span>
                    {!review.is_archived && review.is_active && (
                      <span className="flex items-center gap-1 bg-emerald-50 dark:bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-100 dark:border-emerald-500/20">
                        <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                        <span className="text-[9px] font-bold text-emerald-700 dark:text-emerald-400 uppercase">Live</span>
                      </span>
                    )}
                    <div className="flex gap-0.5">
                      {[...Array(5)].map((_, i) => (
                        <Star key={i} size={11} className={i < review.rating ? "fill-yellow-400 text-yellow-400" : "text-gray-200 dark:text-slate-600"} />
                      ))}
                    </div>
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 italic truncate mt-0.5">"{review.comment || 'No feedback provided.'}"</p>
                </div>
              </div>

              <div className="flex items-center gap-3 shrink-0 self-end md:self-auto">
                <div className="flex items-center gap-2 min-w-0">
                  <TargetIcon review={review} sizeClass="h-8 w-8" />
                  <p className="text-[11px] font-bold text-gray-600 dark:text-gray-300 truncate max-w-[110px] hidden lg:block">{review.package_name || review.guide_name || 'Visitor Center'}</p>
                </div>

                <button
                  onClick={() => updateItem("reviews", review.id, { is_active: !review.is_active })}
                  className={`p-2 rounded-xl transition-colors ${review.is_active ? 'text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-500/10 hover:bg-red-100 dark:hover:bg-red-500/20' : 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 hover:bg-emerald-100 dark:hover:bg-emerald-500/20'}`}
                >
                  {review.is_active ? <XCircle size={16} /> : <CheckCircle size={16} />}
                </button>
                <button
                  onClick={() => updateItem("reviews", review.id, { is_archived: !review.is_archived })}
                  className={`p-2 rounded-xl transition-colors ${review.is_archived ? 'text-[var(--accent,#4f46e5)] bg-[color-mix(in_srgb,var(--accent,#4f46e5)_10%,white)] dark:bg-[color-mix(in_srgb,var(--accent,#4f46e5)_20%,black)] hover:bg-[color-mix(in_srgb,var(--accent,#4f46e5)_18%,white)]' : 'text-gray-400 dark:text-gray-500 bg-gray-100 dark:bg-slate-700 hover:bg-gray-200 dark:hover:bg-slate-600'}`}
                >
                  {review.is_archived ? <Eye size={16} /> : <Archive size={16} />}
                </button>
              </div>
            </div>
          ))}
        </div>
        )}

        {reviews.length === 0 && (
          <div className="text-center py-20 bg-white dark:bg-slate-800 rounded-3xl border border-dashed border-gray-300 dark:border-slate-600">
            <Search className="mx-auto h-12 w-10 text-gray-200 dark:text-slate-600 mb-4" />
            <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">No {viewArchived ? 'archived' : ''} reviews found</h3>
            <p className="text-gray-500 dark:text-gray-400">Try adjusting your filters or search terms.</p>
          </div>
        )}

        <div className="mt-10 flex flex-col sm:flex-row items-center justify-between gap-4 pb-10">
          <div className="flex items-center gap-4">
            <p className="text-sm text-gray-500 dark:text-gray-400 font-medium whitespace-nowrap">
              Showing <span className="text-gray-900 dark:text-gray-100">{(currentPage - 1) * entriesPerPage + 1}</span> to <span className="text-gray-900 dark:text-gray-100">{Math.min(currentPage * entriesPerPage, reviews.length)}</span> of {reviews.length}
            </p>
            <div className="relative">
              <select value={entriesPerPage} onChange={(e) => { setEntriesPerPage(Number(e.target.value)); setCurrentPage(1); }} className="appearance-none pl-3 pr-8 py-1.5 border border-gray-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-xs font-bold text-gray-700 dark:text-gray-300 outline-none focus:ring-2 focus:ring-[var(--accent,#4f46e5)] cursor-pointer">
                {[6, 12, 24, 48].map(n => <option key={n} value={n}>Show {n}</option>)}
              </select>
              <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500 pointer-events-none" size={12} />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button disabled={currentPage === 1} onClick={() => setCurrentPage(prev => prev - 1)} className="h-10 w-10 flex items-center justify-center border border-gray-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors disabled:opacity-20 shadow-sm text-gray-700 dark:text-gray-300"><ChevronLeft size={20} /></button>
            <div className="h-10 px-4 flex items-center justify-center bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl text-sm font-bold shadow-sm text-gray-700 dark:text-gray-300">{currentPage} / {totalPages || 1}</div>
            <button disabled={currentPage === totalPages || totalPages === 0} onClick={() => setCurrentPage(prev => prev + 1)} className="h-10 w-10 flex items-center justify-center border border-gray-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors disabled:opacity-20 shadow-sm text-gray-700 dark:text-gray-300"><ChevronRight size={20} /></button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReviewManagement;