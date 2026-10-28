import React, { useContext, useState, useMemo, useRef } from "react";
import { AdminDataContext } from "../contexts/AdminDataContext";
import {
  Settings,
  Globe,
  HelpCircle,
  Info,
  Database,
  Activity,
  Plus,
  Trash2,
  Pencil,
  Image,
  Search,
  ChevronLeft,
  ChevronRight
} from "lucide-react";
import EditableField from "../components/SystemSettings/EditableField";
import AccentBadge from "../components/AccentBadge";

const LONG_PRESS_MS = 500;

export default function SystemSettings() {
  const { adminData, updateItem, createItem, deleteItem, loading } =
    useContext(AdminDataContext);

  // UI States
  const [activeTab, setActiveTab] = useState("branding");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);

  // Long-press action sheet: { item, collection, title, subtitle }
  const [actionSheet, setActionSheet] = useState(null);

  // Hybrid Dropdown States
  const [isNewCategory, setIsNewCategory] = useState(false);
  const [isNewSubCategory, setIsNewSubCategory] = useState(false);

  // Search & Pagination States
  const [searchTerm, setSearchTerm] = useState("");
  const [searchAudit, setSearchAudit] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  const siteConfigs = adminData?.site_configuration || [];
  const faqs = adminData?.faqs || [];
  const systemSettings = adminData?.system_settings || [];
  const infoEntries = adminData?.information || [];
  const auditLogs = adminData?.audit_logs || [];

  // --- Helpers ---

  const categories = useMemo(() => {
    const cats = infoEntries.map(item => item.category).filter(Boolean);
    return [...new Set(cats)];
  }, [infoEntries]);

  const subCategories = useMemo(() => {
    const subs = infoEntries.map(item => item.sub_category).filter(Boolean);
    return [...new Set(subs)];
  }, [infoEntries]);

  const filteredInfo = useMemo(() => {
    return [...infoEntries]
      .sort((a, b) => a.category.localeCompare(b.category) || a.title.localeCompare(b.title))
      .filter(item =>
        item.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.category?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.sub_category?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.desc?.toLowerCase().includes(searchTerm.toLowerCase())
      );
  }, [infoEntries, searchTerm]);

  const filteredAudits = useMemo(() => {
    return auditLogs.filter(log =>
      log.action?.toLowerCase().includes(searchAudit.toLowerCase()) ||
      log.content_type?.toLowerCase().includes(searchAudit.toLowerCase()) ||
      JSON.stringify(log.changes || "").toLowerCase().includes(searchAudit.toLowerCase())
    );
  }, [auditLogs, searchAudit]);

  const paginate = (data) => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return data.slice(startIndex, startIndex + itemsPerPage);
  };

  const totalPages = (data) => Math.ceil(data.length / itemsPerPage);

  // --- Handlers ---

  const handleCreateFAQ = async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const data = {
      question: formData.get("question"),
      answer: formData.get("answer"),
      order: parseInt(formData.get("order") || "0"),
      is_active: true,
    };
    const success = await createItem("faqs", data);
    if (success) { setIsModalOpen(false); e.target.reset(); }
  };

  const handleCreateInfo = async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);

    // Process Hybrid Category
    const category = isNewCategory ? formData.get("new_category") : formData.get("category");
    formData.set("category", category);
    formData.delete("new_category");

    // Process Hybrid Subcategory
    const sub_category = isNewSubCategory ? formData.get("new_sub_category") : formData.get("sub_category");
    formData.set("sub_category", sub_category);
    formData.delete("new_sub_category");

    const success = await createItem("information", formData);
    if (success) {
      setIsModalOpen(false);
      setIsNewCategory(false);
      setIsNewSubCategory(false);
      e.target.reset();
    }
  };

  const handleUpdateItem = async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const id = editingItem.id;
    const collection = editingItem.collection;

    let payload;

    if (collection === "information") {
      // 1. Process Category
      const category = isNewCategory ? formData.get("new_category") : formData.get("category");
      formData.set("category", category);
      formData.delete("new_category");

      // 2. Process Sub-category
      const sub_category = isNewSubCategory ? formData.get("new_sub_category") : formData.get("sub_category");
      formData.set("sub_category", sub_category);
      formData.delete("new_sub_category");

      // 3. Image Fix
      const imageFile = formData.get("image");
      if (imageFile instanceof File && imageFile.size === 0) {
        formData.delete("image");
      }
      payload = formData;
    } else {
      payload = Object.fromEntries(formData.entries());
    }

    const success = await updateItem(collection, id, payload);
    if (success) {
      setIsEditModalOpen(false);
      setEditingItem(null);
      setIsNewCategory(false);
      setIsNewSubCategory(false);
    }
  };

  const openEditModal = (item, collection) => {
    setEditingItem({ ...item, collection });
    setIsEditModalOpen(true);
    setIsNewCategory(false);
    setIsNewSubCategory(false);
  };

  // Long-press action sheet handlers
  const openActionSheet = (item, collection, title, subtitle) => {
    setActionSheet({ item, collection, title, subtitle });
  };

  const handleSheetEdit = () => {
    if (!actionSheet) return;
    openEditModal(actionSheet.item, actionSheet.collection);
    setActionSheet(null);
  };

  const handleSheetDelete = () => {
    if (!actionSheet) return;
    deleteItem(actionSheet.collection, actionSheet.item.id);
    setActionSheet(null);
  };

  if (loading) return (
    <div className="flex items-center justify-center min-h-[400px] dark:bg-slate-950">
      <div className="animate-pulse font-black text-slate-300 dark:text-slate-700 tracking-[0.5em]">SYSTEM_LOADING...</div>
    </div>
  );

  return (
    <div className="container mx-auto p-8 max-w-7xl animate-in fade-in duration-500 relative">
      <div className="absolute inset-0 -z-10 bg-gradient-to-br from-slate-50 via-white to-[var(--accent)]/5 dark:from-slate-950 dark:via-slate-950 dark:to-[var(--accent)]/10" />

      {/* HEADER — badge/title on the left, contextual action on the right,
          both in one row instead of two disconnected blocks. */}
      <header className="p-4 rounded-xl shadow bg-white dark:bg-gray-800 mb-10 flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
        <div className="space-y-2">
          <AccentBadge icon={Settings}>System Settings</AccentBadge>
          
        </div>

        {(activeTab === "faq" || activeTab === "info") && (
          <button onClick={() => setIsModalOpen(true)} className="flex items-center gap-2 bg-[var(--accent)] hover:brightness-90 text-white px-6 py-3 rounded-2xl font-bold text-sm transition-all shadow-lg shadow-black/5">
            <Plus size={18} /> New {activeTab === "faq" ? "FAQ" : "Information"}
          </button>
        )}
      </header>

      {/* NAVIGATION TABS */}
      <nav className="flex gap-10 border-b border-slate-200 dark:border-slate-800 mb-8 overflow-x-auto scrollbar-hide">
        {[
          { id: "branding", label: "Site Identity", icon: Globe },
          { id: "faq", label: "FAQs", icon: HelpCircle },
          { id: "info", label: "Public Info", icon: Info },
          { id: "logic", label: "Variables", icon: Database },
          { id: "audit", label: "Audit Log", icon: Activity },
        ].map((tab) => (
          <button key={tab.id} onClick={() => { setActiveTab(tab.id); setCurrentPage(1); }} className={`pb-4 text-xs font-black uppercase tracking-widest transition-all relative flex items-center gap-2 whitespace-nowrap ${activeTab === tab.id ? "text-[var(--accent)]" : "text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300"}`}>
            <tab.icon size={16} /> {tab.label}
            {activeTab === tab.id && <div className="absolute bottom-0 left-0 w-full h-1 bg-[var(--accent)] rounded-t-full" />}
          </button>
        ))}
      </nav>

      {/* SEARCH SUB-BAR */}
      {(activeTab === "info" || activeTab === "audit") && (
        <div className="mb-6 flex justify-end">
          <div className="relative w-full max-w-md">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500" size={18} />
            <input
              type="text"
              placeholder={activeTab === "info" ? "Search items..." : "Search logs..."}
              value={activeTab === "info" ? searchTerm : searchAudit}
              onChange={(e) => {
                activeTab === "info" ? setSearchTerm(e.target.value) : setSearchAudit(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full pl-12 pr-4 py-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl focus:ring-2 focus:ring-[var(--accent)]/20 outline-none font-medium text-slate-600 dark:text-slate-200 placeholder:text-slate-400 dark:placeholder:text-slate-500"
            />
          </div>
        </div>
      )}

      {/* MAIN CONTAINER */}
      <div className="bg-white/90 dark:bg-slate-900/90 backdrop-blur-sm rounded-[2.5rem] shadow-xl border border-slate-200/60 dark:border-slate-800 min-h-[500px] flex flex-col overflow-hidden">

        <div className="flex-1">
          {activeTab === "branding" && (
            <div className="p-10 grid grid-cols-1 lg:grid-cols-2 gap-16">
              <div className="space-y-8">
                <h3 className="text-[10px] font-black text-[var(--accent)] uppercase tracking-widest italic">Website Displayed Information</h3>
                <EditableField label="Website Name" value={siteConfigs[0]?.website_name} onSave={(v) => updateItem("site_configuration", siteConfigs[0].id, { website_name: v })} />
                <EditableField label="Contact Email" value={siteConfigs[0]?.contact_email} onSave={(v) => updateItem("site_configuration", siteConfigs[0].id, { contact_email: v })} />
                <EditableField label="About Us" type="textarea" value={siteConfigs[0]?.about_us} onSave={(v) => updateItem("site_configuration", siteConfigs[0].id, { about_us: v })} />
              </div>
              <div className="space-y-8 bg-slate-50/50 dark:bg-white/5 p-10 rounded-[2rem] border border-slate-100 dark:border-slate-800">
                <h3 className="text-[10px] font-black text-slate-400 dark:text-gray-500 uppercase tracking-widest italic">Social Media</h3>
                <EditableField label="Twitter" value={siteConfigs[0]?.twitter_url} onSave={(v) => updateItem("site_configuration", siteConfigs[0].id, { twitter_url: v })} />
                <EditableField label="Facebook" value={siteConfigs[0]?.facebook_url} onSave={(v) => updateItem("site_configuration", siteConfigs[0].id, { facebook_url: v })} />
                <EditableField label="Instagram" value={siteConfigs[0]?.instagram_url} onSave={(v) => updateItem("site_configuration", siteConfigs[0].id, { instagram_url: v })} />
                <EditableField label="Youtube" value={siteConfigs[0]?.youtube_url} onSave={(v) => updateItem("site_configuration", siteConfigs[0].id, { youtube_url: v })} />
                <EditableField label="Tiktok" value={siteConfigs[0]?.tiktok_url} onSave={(v) => updateItem("site_configuration", siteConfigs[0].id, { tiktok_url: v })} />
              </div>
            </div>
          )}

          {activeTab === "faq" && (
            <div className="p-8 grid grid-cols-1 md:grid-cols-2 gap-6">
              {faqs.length > 0 ? faqs.map((f) => (
                <LongPressable
                  key={f.id}
                  onLongPress={() => openActionSheet(f, "faqs", f.question, "FAQ Entry")}
                  className="p-6 rounded-3xl bg-white dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 relative shadow-sm select-none cursor-pointer active:bg-slate-50 dark:active:bg-white/5 transition-colors"
                >
                  <div className="flex justify-between items-start mb-2">
                    <span className="text-[9px] font-black bg-slate-100 dark:bg-slate-700 px-2 py-1 rounded text-slate-500 dark:text-slate-300 uppercase">Order {f.order}</span>
                  </div>
                  <h4 className="font-bold text-slate-800 dark:text-slate-100">Q: {f.question}</h4>
                  <p className="text-slate-500 dark:text-slate-400 text-sm mt-2">A: {f.answer}</p>
                </LongPressable>
              )) : <NoDataMessage title="No FAQs Found" />}
            </div>
          )}

          {activeTab === "info" && (
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredInfo.length > 0 ? paginate(filteredInfo).map((info) => (
                <LongPressable
                  key={info.id}
                  onLongPress={() => openActionSheet(info, "information", info.title, info.category)}
                  className="p-8 flex gap-8 hover:bg-slate-50/50 dark:hover:bg-white/5 active:bg-slate-50 dark:active:bg-white/10 transition-colors select-none cursor-pointer"
                >
                  <div className="w-24 h-24 bg-slate-100 dark:bg-slate-800 rounded-2xl overflow-hidden flex-shrink-0 border border-slate-200 dark:border-slate-700">
                    {info.image ? <img src={info.image} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-slate-300 dark:text-slate-600"><Image size={28} /></div>}
                  </div>
                  <div className="flex-1">
                    <div className="flex gap-2 items-center mb-1">
                      <span className="text-[10px] font-black text-[var(--accent)] uppercase tracking-widest">{info.category}</span>
                      {info.sub_category && <span className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">• {info.sub_category}</span>}
                    </div>
                    <h4 className="text-xl font-bold text-slate-800 dark:text-slate-100">{info.title}</h4>
                    <p className="text-slate-500 dark:text-slate-400 text-sm mt-2 line-clamp-2">{info.desc}</p>
                  </div>
                </LongPressable>
              )) : <NoDataMessage title="No Results Found" />}
            </div>
          )}

          {activeTab === "logic" && (
            <table className="w-full text-left">
              <thead className="bg-slate-50 dark:bg-slate-800/60 border-b dark:border-slate-700">
                <tr className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">
                  <th className="px-10 py-5">Key</th>
                  <th className="px-10 py-5">Value</th>
                  <th className="px-10 py-5 text-right">Modified</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
                {systemSettings.map((s) => (
                  <tr key={s.id} className="group hover:bg-[var(--accent)]/5 dark:hover:bg-[var(--accent)]/10">
                    <td className="px-10 py-5 font-mono text-sm font-bold text-[var(--accent)] uppercase">{s.key}</td>
                    <td className="px-10 py-5">
                      <button onClick={() => openEditModal(s, "system_settings")} className="text-slate-600 dark:text-slate-300 flex items-center gap-2">
                        {s.value} <Pencil size={12} className="opacity-0 group-hover:opacity-100" />
                      </button>
                    </td>
                    <td className="px-10 py-5 text-right font-mono text-[10px] text-slate-400 dark:text-slate-500">{new Date(s.updated_at).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {activeTab === "audit" && (
            <div className="overflow-x-auto">
              <table className="w-full text-left font-mono text-[11px]">
                <thead className="bg-slate-50 dark:bg-slate-800/60 border-b dark:border-slate-700 text-slate-400 dark:text-slate-500">
                  <tr className="uppercase font-black">
                    <th className="px-10 py-4">Action</th>
                    <th className="px-10 py-4">Target</th>
                    <th className="px-10 py-4">Meta</th>
                    <th className="px-10 py-4 text-right">Time</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
                  {filteredAudits.length > 0 ? paginate(filteredAudits).map((log) => (
                    <tr key={log.id} className="hover:bg-slate-50 dark:hover:bg-white/5">
                      <td className="px-10 py-4">
                        <span className={`px-2 py-1 rounded uppercase font-black text-[9px] ${log.action === "created" ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400" : "bg-amber-100 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400"}`}>{log.action}</span>
                      </td>
                      <td className="px-10 py-4 font-bold uppercase text-slate-700 dark:text-slate-300">{log.content_type} <span className="text-slate-300 dark:text-slate-600">#{log.object_id}</span></td>
                      <td className="px-10 py-4 text-slate-500 dark:text-slate-400 max-w-xs truncate">{log.changes ? JSON.stringify(log.changes) : "---"}</td>
                      <td className="px-10 py-4 text-right text-slate-400 dark:text-slate-500">{new Date(log.created_at).toLocaleString()}</td>
                    </tr>
                  )) : <NoDataMessage title="No Logs Found" />}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* PAGINATION FOOTER */}
        {(activeTab === "info" || activeTab === "audit") && (
          <div className="p-6 bg-slate-50/80 dark:bg-slate-800/60 border-t dark:border-slate-700 flex items-center justify-between">
            <p className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">
              Page {currentPage} of {totalPages(activeTab === "info" ? filteredInfo : filteredAudits) || 1}
            </p>
            <div className="flex gap-2">
              <button disabled={currentPage === 1} onClick={() => setCurrentPage(p => p - 1)} className="p-2 rounded-xl bg-white dark:bg-slate-800 border dark:border-slate-700 text-slate-600 dark:text-slate-300 disabled:opacity-30"><ChevronLeft size={20} /></button>
              <button disabled={currentPage >= totalPages(activeTab === "info" ? filteredInfo : filteredAudits)} onClick={() => setCurrentPage(p => p + 1)} className="p-2 rounded-xl bg-white dark:bg-slate-800 border dark:border-slate-700 text-slate-600 dark:text-slate-300 disabled:opacity-30"><ChevronRight size={20} /></button>
            </div>
          </div>
        )}
      </div>

      {/* LONG-PRESS ACTION SHEET */}
      {actionSheet && (
        <EntryActionSheet
          title={actionSheet.title}
          subtitle={actionSheet.subtitle}
          onEdit={handleSheetEdit}
          onDelete={handleSheetDelete}
          onClose={() => setActionSheet(null)}
        />
      )}

      {/* CREATE MODAL */}
      {isModalOpen && (
        <ModalWrapper title={activeTab === "faq" ? "New FAQ" : "New Information"} onClose={() => { setIsModalOpen(false); setIsNewCategory(false); setIsNewSubCategory(false); }}>
          <form onSubmit={activeTab === "faq" ? handleCreateFAQ : handleCreateInfo}>
            <div className="p-8 space-y-6 max-h-[60vh] overflow-y-auto">
              {activeTab === "faq" ? (
                <>
                  <InputGroup label="Question" name="question" required />
                  <InputGroup label="Answer" name="answer" type="textarea" rows={4} required />
                  <InputGroup label="Sort Order" name="order" type="number" defaultValue="0" />
                </>
              ) : (
                <>
                  {/* Category Hybrid Select */}
                  <div className="flex flex-col gap-2">
                    <label className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase">Category</label>
                    {!isNewCategory ? (
                      <div className="flex gap-2">
                        <select name="category" className="flex-1 p-3 border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 dark:text-slate-100 text-sm font-medium">
                          <option value="">Select Existing...</option>
                          {categories.map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                        <button type="button" onClick={() => setIsNewCategory(true)} className="px-4 text-[10px] font-black bg-[var(--accent)]/10 text-[var(--accent)] rounded-xl uppercase">New</button>
                      </div>
                    ) : (
                      <div className="flex gap-2 animate-in slide-in-from-right-2">
                        <input name="new_category" placeholder="Enter new category name..." className="flex-1 p-3 border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 dark:text-slate-100" autoFocus required />
                        <button type="button" onClick={() => setIsNewCategory(false)} className="px-4 text-[10px] font-black bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-300 rounded-xl uppercase">Cancel</button>
                      </div>
                    )}
                  </div>

                  {/* Sub-category Hybrid Select */}
                  <div className="flex flex-col gap-2">
                    <label className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase">Sub Category</label>
                    {!isNewSubCategory ? (
                      <div className="flex gap-2">
                        <select name="sub_category" className="flex-1 p-3 border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 dark:text-slate-100 text-sm font-medium">
                          <option value="">Select Existing...</option>
                          {subCategories.map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                        <button type="button" onClick={() => setIsNewSubCategory(true)} className="px-4 text-[10px] font-black bg-[var(--accent)]/10 text-[var(--accent)] rounded-xl uppercase">New</button>
                      </div>
                    ) : (
                      <div className="flex gap-2 animate-in slide-in-from-right-2">
                        <input name="new_sub_category" placeholder="Enter new sub category..." className="flex-1 p-3 border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 dark:text-slate-100" autoFocus />
                        <button type="button" onClick={() => setIsNewSubCategory(false)} className="px-4 text-[10px] font-black bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-300 rounded-xl uppercase">Cancel</button>
                      </div>
                    )}
                  </div>

                  <InputGroup label="Title" name="title" required />
                  <InputGroup label="Description" name="desc" type="textarea" />
                  <InputGroup label="Feature Image" name="image" type="file" accept="image/*" />
                </>
              )}
            </div>
            <ModalFooter onCancel={() => setIsModalOpen(false)} submitText="Create" />
          </form>
        </ModalWrapper>
      )}

      {/* EDIT MODAL */}
      {isEditModalOpen && editingItem && (
        <ModalWrapper title={`Edit Record`} onClose={() => { setIsEditModalOpen(false); setIsNewCategory(false); setIsNewSubCategory(false); }}>
          <form onSubmit={handleUpdateItem}>
            <div className="p-8 space-y-6 max-h-[60vh] overflow-y-auto">
              {editingItem.collection === "faqs" && (
                <>
                  <InputGroup label="Question" name="question" defaultValue={editingItem.question} required />
                  <InputGroup label="Answer" name="answer" type="textarea" rows={4} defaultValue={editingItem.answer} required />
                  <InputGroup label="Order" name="order" type="number" defaultValue={editingItem.order} />
                </>
              )}
              {editingItem.collection === "information" && (
                <>
                  {/* Edit Category Hybrid */}
                  <div className="flex flex-col gap-2">
                    <label className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase">Category</label>
                    {!isNewCategory ? (
                      <div className="flex gap-2">
                        <select name="category" defaultValue={editingItem.category} className="flex-1 p-3 border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 dark:text-slate-100 text-sm font-medium">
                          {categories.map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                        <button type="button" onClick={() => setIsNewCategory(true)} className="px-4 text-[10px] font-black bg-[var(--accent)]/10 text-[var(--accent)] rounded-xl uppercase">New</button>
                      </div>
                    ) : (
                      <div className="flex gap-2">
                        <input name="new_category" placeholder="New category name..." className="flex-1 p-3 border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 dark:text-slate-100" autoFocus required />
                        <button type="button" onClick={() => setIsNewCategory(false)} className="px-4 text-[10px] font-black bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-300 rounded-xl uppercase">Cancel</button>
                      </div>
                    )}
                  </div>

                  {/* Edit Sub-category Hybrid */}
                  <div className="flex flex-col gap-2">
                    <label className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase">Sub Category</label>
                    {!isNewSubCategory ? (
                      <div className="flex gap-2">
                        <select name="sub_category" defaultValue={editingItem.sub_category} className="flex-1 p-3 border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 dark:text-slate-100 text-sm font-medium">
                          <option value="">None</option>
                          {subCategories.map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                        <button type="button" onClick={() => setIsNewSubCategory(true)} className="px-4 text-[10px] font-black bg-[var(--accent)]/10 text-[var(--accent)] rounded-xl uppercase">New</button>
                      </div>
                    ) : (
                      <div className="flex gap-2">
                        <input name="new_sub_category" placeholder="New sub category..." className="flex-1 p-3 border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 dark:text-slate-100" autoFocus />
                        <button type="button" onClick={() => setIsNewSubCategory(false)} className="px-4 text-[10px] font-black bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-300 rounded-xl uppercase">Cancel</button>
                      </div>
                    )}
                  </div>

                  <InputGroup label="Title" name="title" defaultValue={editingItem.title} required />
                  <InputGroup label="Description" name="desc" type="textarea" defaultValue={editingItem.desc} />

                  <div className="space-y-3">
                    <label className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase">Feature Image</label>
                    {editingItem.image && (
                      <div className="flex items-center gap-4 p-3 bg-slate-50 dark:bg-white/5 rounded-xl border border-dashed border-slate-300 dark:border-slate-700">
                        <img src={editingItem.image} className="w-12 h-12 rounded-lg object-cover" />
                        <span className="text-xs font-bold text-slate-400 dark:text-slate-500">Keep current or upload new</span>
                      </div>
                    )}
                    <input type="file" name="image" accept="image/*" className="w-full text-xs text-slate-500 dark:text-slate-400" />
                  </div>
                </>
              )}
              {editingItem.collection === "system_settings" && (
                <InputGroup label={`Value for ${editingItem.key}`} name="value" defaultValue={editingItem.value} required />
              )}
            </div>
            <ModalFooter onCancel={() => setIsEditModalOpen(false)} submitText="Update" />
          </form>
        </ModalWrapper>
      )}
    </div>
  );
}

// --- Helpers Components ---

// Attach press-and-hold detection (mouse + touch) to any block-level element.
// Fires onLongPress after LONG_PRESS_MS and cancels cleanly on early
// release/leave so a normal tap/click never triggers it. Built as its own
// component (not a hook) so it's safe to use inside .map() — hooks can't be
// called per-iteration of a loop, but a component instance per item is fine.
const LongPressable = ({ onLongPress, className, children }) => {
  const timerRef = useRef(null);

  const start = () => {
    timerRef.current = setTimeout(onLongPress, LONG_PRESS_MS);
  };
  const clear = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  };

  return (
    <div
      className={className}
      onMouseDown={start}
      onMouseUp={clear}
      onMouseLeave={clear}
      onTouchStart={start}
      onTouchEnd={clear}
      onTouchCancel={clear}
      onContextMenu={(e) => e.preventDefault()}
    >
      {children}
    </div>
  );
};

// Bottom-sheet-style Edit/Delete picker triggered by a long press. Tapping
// the dimmed backdrop closes it without taking any action; tapping inside
// the sheet itself does not propagate to the backdrop's close handler.
const EntryActionSheet = ({ title, subtitle, onEdit, onDelete, onClose }) => (
  <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-end sm:items-center justify-center z-[60] p-4" onClick={onClose}>
    <div className="bg-white dark:bg-slate-900 rounded-3xl w-full max-w-sm shadow-2xl overflow-hidden" onClick={(e) => e.stopPropagation()}>
      <div className="p-6 border-b border-slate-100 dark:border-slate-800">
        <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1">{subtitle}</p>
        <h3 className="font-bold text-slate-800 dark:text-slate-100 line-clamp-2">{title}</h3>
      </div>
      <button onClick={onEdit} className="w-full flex items-center gap-3 px-6 py-4 text-sm font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-white/5 transition-colors">
        <Pencil size={16} className="text-[var(--accent)]" /> Edit
      </button>
      <button onClick={onDelete} className="w-full flex items-center gap-3 px-6 py-4 text-sm font-bold text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10 transition-colors border-t border-slate-100 dark:border-slate-800">
        <Trash2 size={16} /> Delete
      </button>
      <button onClick={onClose} className="w-full px-6 py-4 text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest border-t border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-white/5 transition-colors">
        Cancel
      </button>
    </div>
  </div>
);

const ModalWrapper = ({ children, title, onClose }) => (
  <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex items-center justify-center z-50 p-6" onClick={onClose}>
    <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] w-full max-w-xl shadow-2xl overflow-hidden" onClick={(e) => e.stopPropagation()}>
      <div className="p-8 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
        <h2 className="text-2xl font-black text-slate-800 dark:text-slate-100 uppercase tracking-tight">{title}</h2>
        <button onClick={onClose} className="text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 text-3xl transition-colors">&times;</button>
      </div>
      {children}
    </div>
  </div>
);

const ModalFooter = ({ onCancel, submitText }) => (
  <div className="p-8 bg-slate-50 dark:bg-slate-800/60 flex justify-end gap-4">
    <button type="button" onClick={onCancel} className="text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Cancel</button>
    <button type="submit" className="bg-[var(--accent)] hover:brightness-90 text-white px-8 py-3 rounded-2xl font-bold shadow-lg shadow-black/5 transition-all">{submitText}</button>
  </div>
);

const NoDataMessage = ({ title }) => (
  <div className="py-24 text-center">
    <Database size={40} className="mx-auto text-slate-200 dark:text-slate-700 mb-4" />
    <div className="text-slate-400 dark:text-slate-500 font-bold uppercase tracking-widest text-xs">{title}</div>
  </div>
);

const InputGroup = ({ label, name, type = "text", rows = 1, required, defaultValue, placeholder }) => (
  <div className="flex flex-col">
    <label className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase mb-2">{label}</label>
    {type === "textarea" ? (
      <textarea name={name} rows={rows} required={required} defaultValue={defaultValue} placeholder={placeholder} className="p-3 border border-slate-200 dark:border-slate-700 rounded-xl resize-none outline-none focus:ring-2 focus:ring-[var(--accent)]/30 bg-white dark:bg-slate-800 dark:text-slate-100 text-sm" />
    ) : (
      <input type={type} name={name} required={required} defaultValue={defaultValue} placeholder={placeholder} className="p-3 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-[var(--accent)]/30 bg-white dark:bg-slate-800 dark:text-slate-100 text-sm" />
    )}
  </div>
);