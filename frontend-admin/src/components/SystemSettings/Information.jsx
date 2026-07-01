import React, { useContext, useState } from "react";
import { AdminDataContext } from "../../contexts/AdminDataContext";

import { InputGroup, NoDataMessage } from "./Sharedutils";
export default function InfoSettings() {
  const { adminData, createItem, deleteItem } = useContext(AdminDataContext);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const infoEntries = adminData?.information || [];

  const handleCreateInfo = async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const success = await createItem("information", formData);
    if (success) {
      setIsModalOpen(false);
      e.target.reset();
    }
  };

  return (
    <div>
      <div className="p-8 border-b border-slate-50 flex justify-between items-center bg-slate-50/30">
        <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest">Public Information CMS</h3>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2 rounded-xl font-black text-xs transition-all"
        >
          + Add Entry
        </button>
      </div>

      <div className="divide-y divide-slate-100">
        {infoEntries.length > 0 ? infoEntries.map((info) => (
          <div key={info.id} className="p-8 flex gap-8 hover:bg-slate-50/50 transition-colors group">
            <div className="w-24 h-24 bg-slate-100 rounded-2xl overflow-hidden flex-shrink-0 border border-slate-200">
              {info.image ? (
                <img src={info.image} className="w-full h-full object-cover" alt="" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-slate-300 font-black text-xs">NO_IMG</div>
              )}
            </div>
            <div className="flex-1">
              <div className="flex justify-between items-start">
                <div>
                  <span className="text-[10px] font-black text-indigo-600 uppercase tracking-widest">{info.category}</span>
                  <h4 className="text-xl font-bold text-slate-800 mt-1">{info.title}</h4>
                </div>
                <button onClick={() => deleteItem("information", info.id)} className="text-rose-400 opacity-0 group-hover:opacity-100 transition-opacity text-[10px] font-black uppercase">Remove</button>
              </div>
              <p className="text-slate-500 text-sm mt-2 line-clamp-2 leading-relaxed">{info.desc}</p>
            </div>
          </div>
        )) : <NoDataMessage title="No Public Information Found" />}
      </div>

      {isModalOpen && (
        <InfoModal onClose={() => setIsModalOpen(false)} onSubmit={handleCreateInfo} />
      )}
    </div>
  );
}

// Sub-modal to keep the main component clean
function InfoModal({ onClose, onSubmit }) {
  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex items-center justify-center z-50 p-6">
      <form onSubmit={onSubmit} className="bg-white rounded-[2.5rem] w-full max-w-xl shadow-2xl border border-white">
        <div className="p-8 border-b border-slate-100 flex justify-between items-center">
          <h2 className="text-2xl font-black text-slate-800 uppercase tracking-tight">New Info Entry</h2>
          <button type="button" onClick={onClose} className="text-slate-400 text-2xl">×</button>
        </div>
        <div className="p-8 space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <InputGroup label="Category" name="category" required />
            <InputGroup label="Sub Category" name="sub_category" />
          </div>
          <InputGroup label="Title" name="title" required />
          <InputGroup label="Description" name="desc" type="textarea" rows={3} />
          <InputGroup label="Feature Image" name="image" type="file" accept="image/*" />
        </div>
        <div className="p-8 bg-slate-50 flex justify-end gap-4">
          <button type="button" onClick={onClose} className="text-sm font-bold text-slate-400">Cancel</button>
          <button type="submit" className="bg-indigo-600 text-white px-10 py-3 rounded-2xl font-black">Publish</button>
        </div>
      </form>
    </div>
  );
}