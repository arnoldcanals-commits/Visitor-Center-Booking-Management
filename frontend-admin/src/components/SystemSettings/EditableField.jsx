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
      <label className="block text-[10px] font-bold text-slate-400 dark:text-gray-500 uppercase tracking-widest mb-1">
        {label}
      </label>

      {/* Field */}
      {editing ? (
        type === "textarea" ? (
          <textarea
            className="w-full p-4 rounded-xl border border-[var(--accent)] focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)] outline-none transition-all bg-[var(--accent)]/10 dark:bg-slate-900 text-slate-900 dark:text-slate-100 font-medium"
            value={val}
            onChange={(e) => setVal(e.target.value)}
          />
        ) : (
          <input
            type="text"
            className="w-full p-4 rounded-xl border border-[var(--accent)] focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)] outline-none transition-all bg-[var(--accent)]/10 dark:bg-slate-900 text-slate-900 dark:text-slate-100 font-medium"
            value={val}
            onChange={(e) => setVal(e.target.value)}
          />
        )
      ) : (
        <div
          onClick={() => setEditing(true)}
          className="flex items-center justify-between cursor-pointer p-4 bg-slate-50 border border-slate-200 dark:bg-white/5 dark:border-slate-800 rounded-xl hover:border-[var(--accent)] dark:hover:border-[var(--accent)] transition-all group"
        >
          <span className="truncate text-slate-700 dark:text-slate-200 font-semibold">
            {val || "Empty"}
          </span>
          <Pencil
            size={16}
            className="text-[var(--accent)] opacity-0 group-hover:opacity-100 transition-opacity"
          />
        </div>
      )}

      {/* Action Buttons */}
      {editing && (
        <div className="flex gap-2 mt-2 justify-end">
          <button
            onClick={handleSave}
            className="flex items-center gap-1 bg-[var(--accent)] text-white px-4 py-1 rounded-full text-xs font-bold hover:brightness-90 transition-all"
          >
            <Check size={14} /> Save
          </button>
          <button
            onClick={() => {
              setVal(value);
              setEditing(false);
            }}
            className="flex items-center gap-1 bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 px-4 py-1 rounded-full text-xs font-bold hover:bg-slate-300 dark:hover:bg-slate-700 transition-all"
          >
            <X size={14} /> Cancel
          </button>
        </div>
      )}
    </div>
  );
};

export default EditableField;