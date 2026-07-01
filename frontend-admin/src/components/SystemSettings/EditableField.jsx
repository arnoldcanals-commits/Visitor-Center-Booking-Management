import { useState } from "react";
import { Pencil, Check, X } from "lucide-react";

const EditableField = ({ label, value, type = "text", onSave }) => {
  const [editing, setEditing] = useState(false);
  const [val, setVal] = useState(value);

  const handleSave = () => {
    if (val !== value) onSave(val);
    setEditing(false);
  };

  return (
    <div className="relative group">
      {/* Label */}
      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">
        {label}
      </label>

      {/* Field */}
      {editing ? (
        type === "textarea" ? (
          <textarea
            className="w-full p-4 rounded-xl border border-indigo-200 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-200 outline-none transition-all bg-indigo-50 text-slate-900 font-medium"
            value={val}
            onChange={(e) => setVal(e.target.value)}
          />
        ) : (
          <input
            type="text"
            className="w-full p-4 rounded-xl border border-indigo-200 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-200 outline-none transition-all bg-indigo-50 text-slate-900 font-medium"
            value={val}
            onChange={(e) => setVal(e.target.value)}
          />
        )
      ) : (
        <div
          onClick={() => setEditing(true)}
          className="flex items-center justify-between cursor-pointer p-4 bg-slate-50 border border-slate-200 rounded-xl hover:border-indigo-300 transition-all group"
        >
          <span className="truncate text-slate-700 font-semibold">
            {val || "Empty"}
          </span>
          <Pencil
            size={16}
            className="text-indigo-400 opacity-0 group-hover:opacity-100 transition-opacity"
          />
        </div>
      )}

      {/* Action Buttons */}
      {editing && (
        <div className="flex gap-2 mt-2 justify-end">
          <button
            onClick={handleSave}
            className="flex items-center gap-1 bg-indigo-600 text-white px-4 py-1 rounded-full text-xs font-bold hover:bg-indigo-700 transition-all"
          >
            <Check size={14} /> Save
          </button>
          <button
            onClick={() => {
              setVal(value);
              setEditing(false);
            }}
            className="flex items-center gap-1 bg-slate-200 text-slate-700 px-4 py-1 rounded-full text-xs font-bold hover:bg-slate-300 transition-all"
          >
            <X size={14} /> Cancel
          </button>
        </div>
      )}
    </div>
  );
};

export default EditableField;
