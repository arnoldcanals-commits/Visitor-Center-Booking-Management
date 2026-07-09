import React, { useState, useContext, useRef } from 'react';
import { AdminDataContext } from '../contexts/AdminDataContext';
import { 
  Plus, Edit2, Archive, Eye, EyeOff, Package, Search,
  Image as ImageIcon, X, ArchiveRestore, Maximize2, 
  CheckCircle2, Star, Info, FileText, Tag, DollarSign, Calendar
} from 'lucide-react';


import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'

// Put this component outside of Packages
const RichTextEditor = ({ value, onChange }) => {
  const editor = useEditor({
    extensions: [StarterKit],
    content: value,
    onUpdate: ({ editor }) => onChange(editor.getHTML()),
  })

  return (
    <div className="w-full border-2 border-slate-100 bg-slate-50 rounded-xl overflow-hidden focus-within:border-indigo-500 transition-all">
      {/* Toolbar */}
      <div className="flex gap-1 p-2 border-b-2 border-slate-100 bg-white">
        {[
          { label: 'B', action: () => editor.chain().focus().toggleBold().run(), active: editor?.isActive('bold') },
          { label: 'I', action: () => editor.chain().focus().toggleItalic().run(), active: editor?.isActive('italic') },
          { label: 'H2', action: () => editor.chain().focus().toggleHeading({ level: 2 }).run(), active: editor?.isActive('heading', { level: 2 }) },
          { label: 'H3', action: () => editor.chain().focus().toggleHeading({ level: 3 }).run(), active: editor?.isActive('heading', { level: 3 }) },
          { label: '• List', action: () => editor.chain().focus().toggleBulletList().run(), active: editor?.isActive('bulletList') },
          { label: '1. List', action: () => editor.chain().focus().toggleOrderedList().run(), active: editor?.isActive('orderedList') },
        ].map(btn => (
          <button
            key={btn.label}
            type="button"
            onClick={btn.action}
            className={`px-2.5 py-1 rounded-lg text-xs font-black transition-all ${btn.active ? 'bg-indigo-600 text-white' : 'text-slate-500 hover:bg-slate-100'}`}
          >
            {btn.label}
          </button>
        ))}
      </div>
      <EditorContent 
        editor={editor} 
        className="prose prose-sm max-w-none p-4 min-h-[180px] focus:outline-none text-slate-700"
      />
    </div>
  )
}

const Packages = () => {
  const { adminData, createItem, updateItem, deleteItem, loading } = useContext(AdminDataContext);
  const [showArchived, setShowArchived] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [galleryPackage, setGalleryPackage] = useState(null);
  const [editingPackage, setEditingPackage] = useState(null);
  const [localSearch, setLocalSearch] = useState("");

  const [formData, setFormData] = useState({
    name: '', short_description: '', digest: '', 
    description: '', base_price: '', requires_permit: false,
    is_active: true, is_archived: false
  });
  const [selectedImages, setSelectedImages] = useState([]);

  // Long-press-to-show-tooltip support (mobile has no hover state)
  const [activeTooltip, setActiveTooltip] = useState(null);
  const longPressTimer = useRef(null);
  const LONG_PRESS_MS = 450;

  const handleTouchStart = (key) => {
    clearTimeout(longPressTimer.current);
    longPressTimer.current = setTimeout(() => setActiveTooltip(key), LONG_PRESS_MS);
  };
  const handleTouchEnd = () => {
    clearTimeout(longPressTimer.current);
    setActiveTooltip(null);
  };

  // Filter Logic
  const packages = adminData.packages || [];
  const filtered = packages.filter(p => 
    p.is_archived === showArchived && 
    (p.name.toLowerCase().includes(localSearch.toLowerCase()) || 
     p.digest.toLowerCase().includes(localSearch.toLowerCase()))
  );

  const handleOpenModal = (pkg = null) => {
    if (pkg) {
      setEditingPackage(pkg);
      setFormData({ ...pkg });
    } else {
      setEditingPackage(null);
      setFormData({ name: '', short_description: '', digest: '', description: '', base_price: '', requires_permit: false, is_active: true, is_archived: false });
    }
    setSelectedImages([]);
    setIsModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const data = new FormData();
    Object.keys(formData).forEach(key => { if (formData[key] !== null) data.append(key, formData[key]); });
    selectedImages.forEach(file => data.append('uploaded_images', file));
    const success = editingPackage ? await updateItem('packages', editingPackage.id, data) : await createItem('packages', data);
    if (success) setIsModalOpen(false);
  };

  const setMainImage = async (packageId, imageId) => {
    await updateItem('package_images', imageId, { is_main: true });
    setGalleryPackage(prev => prev ? {
      ...prev,
      images: prev.images.map(img => ({ ...img, is_main: img.id === imageId }))
    } : prev);
  };

  const removeImage = async (imageId) => {
    if (!window.confirm('Remove this photo? This cannot be undone.')) return;
    const success = await deleteItem('package_images', imageId);
    if (success) {
      setGalleryPackage(prev => prev ? {
        ...prev,
        images: prev.images.filter(img => img.id !== imageId)
      } : prev);
    }
  };

  // Tooltip Component - shows on hover (desktop) via the /btn named group,
  // or when forced open via `show` (mobile long-press)
  const Tooltip = ({ text, show }) => (
    <span className={`absolute -top-10 left-1/2 -translate-x-1/2 px-2.5 py-1 bg-slate-900 text-white text-[10px] font-bold rounded-md transition-all duration-200 pointer-events-none z-50 whitespace-nowrap shadow-xl group-hover/btn:opacity-100 group-hover/btn:scale-100 ${show ? 'opacity-100 scale-100' : 'opacity-0 scale-90'}`}>
      {text}
      <span className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-slate-900"></span>
    </span>
  );

  if (loading) return <div className="p-10 text-center animate-pulse font-black text-slate-400 font-['Inter']">LOADING INVENTORY...</div>;

  return (
    <div className="p-6 bg-slate-50 min-h-screen font-['Inter']">
      <div className="max-w-7xl mx-auto">
        
        {/* Header & Search */}
        <header className="mb-10 space-y-6">
          <div className="space-y-2">
      
              <div className="flex items-center gap-2 p-3 bg-indigo-50 text-indigo-600 rounded-xl w-fit border border-purple-100">
               <Package size={18} />
               <span className="text-sm font-black uppercase tracking-tight">Tour Package Management</span>
            </div>
          </div>

          {/* Action Toolbar - White Panel Style */}
          <div className="flex flex-col md:flex-row items-center justify-between gap-4 p-3 bg-white rounded-2xl border border-slate-200 shadow-sm">
            <div className="relative w-full md:w-72 group">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
              <input 
                type="text" 
                placeholder="Search packages..." 
                className="w-full bg-slate-50 border border-slate-100 rounded-xl py-2 pl-10 pr-4 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all text-sm font-semibold text-slate-700"
                value={localSearch}
                onChange={(e) => setLocalSearch(e.target.value)}
              />
            </div>

            <div className="flex items-center gap-3 w-full md:w-auto">
              <button 
                onClick={() => setShowArchived(!showArchived)}
                className={`flex-1 md:flex-none flex items-center justify-center gap-2.5 px-5 py-2 rounded-xl font-bold text-sm transition-all border ${
                  showArchived 
                    ? 'bg-amber-400 border-amber-500 text-white hover:bg-amber-500' 
                    : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                {showArchived ? <Eye size={18} /> : <Archive size={18} />}
                <span>{showArchived ? "Viewing Archived" : "View Archive"}</span>
              </button>

              <button 
                onClick={() => handleOpenModal()} 
                className="flex-1 md:flex-none flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2 rounded-xl shadow-md font-bold text-sm transition-all active:scale-95"
              >
                <Plus size={18} />
                <span>Add Package</span>
              </button>
            </div>
          </div>
        </header>

        {/* Grid View */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map((pkg) => {
            const mainImg = pkg.images?.find(i => i.is_main) || pkg.images?.[0];
            return (
              <div key={pkg.id} className="bg-white rounded-[2rem] shadow-sm border border-slate-200 overflow-hidden flex flex-col group hover:shadow-xl transition-all duration-300">
                {/* Cropped Image Area */}
                <div className="h-48 min-h-[12rem] bg-slate-100 relative overflow-hidden">
                  {mainImg ? (
                    <img src={mainImg.image} alt={pkg.name} className="w-full h-full object-cover min-w-full min-h-full transition-transform duration-700 group-hover:scale-105" />
                  ) : (
                    <div className="flex items-center justify-center h-full text-slate-300"><ImageIcon size={40} /></div>
                  )}
                  
                  <div className="absolute top-4 left-4">
                    <span className={`px-3 py-1 rounded-lg text-[9px] uppercase font-black tracking-widest shadow-lg backdrop-blur-md ${pkg.is_active ? 'bg-emerald-500/90 text-white' : 'bg-slate-600/90 text-white'}`}>
                      {pkg.is_active ? 'Online' : 'Draft'}
                    </span>
                  </div>
                </div>
                
                <div className="p-6 flex-grow flex flex-col">
                  <div className="flex justify-between items-start mb-1">
                    <h3 className="font-black text-xl text-slate-800 line-clamp-1 group-hover:text-indigo-600 transition-colors">{pkg.name}</h3>
                    <div className="flex items-center text-indigo-600 font-black text-lg">
                      <span className="text-xs mr-0.5">₱</span>{pkg.base_price}
                    </div>
                  </div>
                  
                  <p className="text-slate-400 text-[10px] font-bold mb-3 flex items-center gap-1.5 uppercase">
                    <Calendar size={12} /> {new Date(pkg.created_at || Date.now()).toLocaleDateString()}
                  </p>

                  <p className="text-slate-500 text-xs font-medium line-clamp-2 mb-5 leading-relaxed">"{pkg.digest}"</p>
                  
                  <div className="mt-auto pt-5 border-t border-slate-50 flex items-center justify-between">
                    <div className="flex gap-1.5">
                      <div 
                        className="relative group/btn"
                        onTouchStart={() => handleTouchStart(`${pkg.id}-edit`)}
                        onTouchEnd={handleTouchEnd}
                        onTouchCancel={handleTouchEnd}
                      >
                        <button onClick={() => handleOpenModal(pkg)} className="p-2.5 bg-slate-50 hover:bg-indigo-600 hover:text-white text-slate-500 rounded-xl transition-all">
                          <Edit2 size={16} />
                        </button>
                        <Tooltip text="Edit" show={activeTooltip === `${pkg.id}-edit`} />
                      </div>

                      <div 
                        className="relative group/btn"
                        onTouchStart={() => handleTouchStart(`${pkg.id}-gallery`)}
                        onTouchEnd={handleTouchEnd}
                        onTouchCancel={handleTouchEnd}
                      >
                        <button onClick={() => setGalleryPackage(pkg)} className="p-2.5 bg-slate-50 hover:bg-indigo-600 hover:text-white text-slate-500 rounded-xl transition-all">
                          <Maximize2 size={16} />
                        </button>
                        <Tooltip text="Gallery" show={activeTooltip === `${pkg.id}-gallery`} />
                      </div>

                      <div 
                        className="relative group/btn"
                        onTouchStart={() => handleTouchStart(`${pkg.id}-archive`)}
                        onTouchEnd={handleTouchEnd}
                        onTouchCancel={handleTouchEnd}
                      >
                        <button 
                          onClick={() => updateItem('packages', pkg.id, { is_archived: !pkg.is_archived })} 
                          className={`p-2.5 rounded-xl transition-all ${pkg.is_archived ? 'bg-emerald-50 text-emerald-600 hover:bg-emerald-600 hover:text-white' : 'bg-slate-50 text-amber-600 hover:bg-amber-600 hover:text-white'}`}
                        >
                          {pkg.is_archived ? <ArchiveRestore size={16} /> : <Archive size={16} />}
                        </button>
                        <Tooltip text={pkg.is_archived ? "Restore" : "Archive"} show={activeTooltip === `${pkg.id}-archive`} />
                      </div>
                    </div>

                    <button 
                      onClick={() => updateItem('packages', pkg.id, { is_active: !pkg.is_active })}
                      className={`flex items-center gap-2 px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-tight transition-all shadow-sm ${pkg.is_active ? 'bg-rose-50 text-rose-600 hover:bg-rose-600 hover:text-white' : 'bg-emerald-50 text-emerald-600 hover:bg-emerald-600 hover:text-white'}`}
                    >
                      {pkg.is_active ? <EyeOff size={12}/> : <Eye size={12}/>}
                      {pkg.is_active ? 'Offline' : 'Go Live'}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Gallery Modal */}
        {galleryPackage && (
          <div className="fixed inset-0 bg-slate-950/90 flex items-center justify-center z-[70] p-6 backdrop-blur-md animate-in fade-in duration-300">
            <div className="bg-white rounded-[2.5rem] w-full max-w-5xl overflow-hidden shadow-2xl">
              <div className="p-6 border-b flex justify-between items-center bg-slate-50/50">
                <div>
                  <h2 className="font-black text-2xl text-slate-900 tracking-tight">Media Assets</h2>
                  <p className="text-slate-500 font-bold uppercase text-[9px] tracking-widest mt-1">{galleryPackage.name}</p>
                </div>
                <button onClick={() => setGalleryPackage(null)} className="p-2 hover:bg-slate-200 rounded-full transition-colors"><X size={20}/></button>
              </div>
              <div className="p-8 grid grid-cols-2 md:grid-cols-4 gap-4 max-h-[60vh] overflow-y-auto">
                {galleryPackage.images?.map((img) => (
                  <div 
                    key={img.id} 
                    className={`group/img relative aspect-square min-w-[110px] min-h-[110px] rounded-2xl overflow-hidden border-2 transition-all ${img.is_main ? 'border-indigo-500 scale-105 z-10' : 'border-slate-100 hover:border-indigo-200'}`}
                    onTouchStart={() => handleTouchStart(`${img.id}-remove`)}
                    onTouchEnd={handleTouchEnd}
                    onTouchCancel={handleTouchEnd}
                  >
                    <img src={img.image} className="w-full h-full object-cover min-w-full min-h-full" alt="Gallery" />

                    {/* Remove photo */}
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); removeImage(img.id); }}
                      className={`absolute top-2 left-2 z-30 p-1.5 bg-rose-600/90 hover:bg-rose-700 text-white rounded-full shadow-lg transition-opacity opacity-0 group-hover/img:opacity-100 ${activeTooltip === `${img.id}-remove` ? 'opacity-100' : ''}`}
                      title="Remove photo"
                    >
                      <X size={12} />
                    </button>

                    {img.is_main ? (
                      <div className="absolute top-2 right-2 bg-indigo-600 text-white px-2 py-0.5 rounded-md flex items-center gap-1 text-[8px] font-black shadow-xl z-20">
                        <Star size={10} fill="white" /> MAIN
                      </div>
                    ) : (
                      <button onClick={() => setMainImage(galleryPackage.id, img.id)} className="absolute inset-0 z-10 bg-indigo-600/80 flex flex-col items-center justify-center opacity-0 group-hover/img:opacity-100 transition-opacity">
                        <CheckCircle2 size={24} className="text-white mb-1" />
                        <span className="text-white font-black text-[8px] tracking-widest uppercase">Set Cover</span>
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Form Modal */}
        {isModalOpen && (
          <div className="fixed inset-0 bg-slate-900/60 flex items-center justify-center z-[60] p-4 backdrop-blur-md">
             <div className="bg-white rounded-[2.5rem] w-full max-w-4xl max-h-[90vh] overflow-y-auto shadow-2xl animate-in zoom-in-95 duration-300">
                <form onSubmit={handleSubmit}>
                    <div className="p-8 border-b flex justify-between items-center sticky top-0 bg-white/90 backdrop-blur-md z-10">
                        <div>
                            <h2 className="text-2xl font-black text-slate-900 tracking-tight">{editingPackage ? 'Update Package' : 'New Collection'}</h2>
                            <p className="text-slate-500 text-sm font-medium">Define your tour parameters and pricing.</p>
                        </div>
                        <button type="button" onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-slate-100 rounded-full transition-all"><X size={20}/></button>
                    </div>
                    
                    <div className="p-8 space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="md:col-span-2">
                                <label className="flex items-center gap-2 text-[10px] font-black uppercase text-slate-400 mb-2 tracking-widest"><Tag size={12}/> Package Name</label>
                                <input type="text" required className="w-full border-2 border-slate-100 bg-slate-50 rounded-xl p-4 focus:border-indigo-500 outline-none transition-all font-bold text-slate-800" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
                            </div>
                            
                            <div className="md:col-span-2">
                                <label className="flex items-center gap-2 text-[10px] font-black uppercase text-slate-400 mb-2 tracking-widest"><Info size={12}/> Short Description</label>
                                <input type="text" className="w-full border-2 border-slate-100 bg-slate-50 rounded-xl p-4 focus:border-indigo-500 outline-none transition-all font-semibold" placeholder="Appears in snippets..." value={formData.short_description} onChange={e => setFormData({...formData, short_description: e.target.value})} />
                            </div>
                            <div className="md:col-span-2">
                              <label className="flex items-center gap-2 text-[10px] font-black uppercase text-slate-400 mb-2 tracking-widest">
                                <FileText size={12}/> Full Description
                              </label>
                              <RichTextEditor
                                value={formData.description}
                                onChange={val => setFormData({...formData, description: val})}
                              />
                            </div>
                            <div className="md:col-span-2">
                                <label className="flex items-center gap-2 text-[10px] font-black uppercase text-slate-400 mb-2 tracking-widest"><FileText size={12}/> Digest</label>
                                <textarea rows="2" className="w-full border-2 border-slate-100 bg-slate-50 rounded-xl p-4 focus:border-indigo-500 outline-none transition-all font-medium" value={formData.digest} onChange={e => setFormData({...formData, digest: e.target.value})} />
                            </div>

                            <div>
                                <label className="flex items-center gap-2 text-[10px] font-black uppercase text-slate-400 mb-2 tracking-widest"><DollarSign size={12}/> Base Price (PHP)</label>
                                <input type="number" required className="w-full border-2 border-slate-100 bg-slate-50 rounded-xl p-4 focus:border-indigo-500 outline-none transition-all font-black text-indigo-600 text-xl" value={formData.base_price} onChange={e => setFormData({...formData, base_price: e.target.value})} />
                            </div>

                            <div className="flex items-center gap-4 px-5 bg-slate-50 rounded-xl border-2 border-slate-100">
                                <input type="checkbox" id="permit" className="w-5 h-5 rounded-md accent-indigo-600" checked={formData.requires_permit} onChange={e => setFormData({...formData, requires_permit: e.target.checked})} />
                                <label htmlFor="permit" className="text-xs font-black text-slate-700 cursor-pointer uppercase">Requires Permit</label>
                            </div>
                        </div>

                        <div>
                            <label className="flex items-center gap-2 text-[10px] font-black uppercase text-slate-400 mb-2 tracking-widest"><ImageIcon size={12}/> Media Upload</label>
                            <div className="border-4 border-dashed border-slate-100 rounded-3xl p-8 text-center hover:border-indigo-300 hover:bg-indigo-50/30 transition-all cursor-pointer relative group/upload">
                                <input type="file" multiple accept="image/*" className="absolute inset-0 opacity-0 cursor-pointer" onChange={e => setSelectedImages(Array.from(e.target.files))} />
                                <div className="bg-white w-12 h-12 rounded-xl shadow-md flex items-center justify-center mx-auto mb-3 group-hover/upload:scale-110 transition-transform">
                                  <Plus className="text-indigo-600 w-6 h-6" />
                                </div>
                                <p className="text-base font-black text-slate-700">Add Gallery Images</p>
                                <p className="text-[10px] text-slate-400 font-bold mt-1 uppercase">Multiple files supported</p>
                                {selectedImages.length > 0 && (
                                  <div className="mt-4 flex flex-wrap gap-2 justify-center">
                                    {selectedImages.map((f, i) => <span key={i} className="bg-indigo-600 text-white text-[8px] px-3 py-1 rounded-full font-black shadow-lg uppercase">{f.name}</span>)}
                                  </div>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="p-8 border-t bg-slate-50 flex justify-end gap-4">
                        <button type="button" onClick={() => setIsModalOpen(false)} className="px-6 py-3 text-slate-400 font-black uppercase text-xs tracking-widest hover:text-slate-800 transition-colors">Cancel</button>
                        <button type="submit" className="px-10 py-3 bg-slate-900 text-white rounded-xl font-black uppercase text-xs tracking-widest hover:bg-indigo-600 shadow-xl transition-all active:scale-95">
                          {editingPackage ? 'Update' : 'Publish'}
                        </button>
                    </div>
                </form>
             </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Packages;