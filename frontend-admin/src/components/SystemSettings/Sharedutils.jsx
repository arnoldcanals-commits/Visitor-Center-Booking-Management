export const InputGroup = ({ label, name, type = "text", ...props }) => (
  <div className="space-y-2">
    <label className="block text-[10px] font-black text-slate-400 uppercase ml-1 tracking-widest">{label}</label>
    {type === "textarea" ? (
      <textarea name={name} {...props} className="w-full bg-slate-50 border-0 rounded-2xl p-4 text-sm focus:ring-2 focus:ring-indigo-500 outline-none" />
    ) : type === "file" ? (
      <input name={name} type={type} {...props} className="w-full text-xs text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:bg-indigo-50 file:text-indigo-700" />
    ) : (
      <input name={name} type={type} {...props} className="w-full bg-slate-50 border-0 rounded-2xl p-4 text-sm focus:ring-2 focus:ring-indigo-500 outline-none" />
    )}
  </div>
);

export const NoDataMessage = ({ title }) => (
  <div className="py-32 text-center">
    <div className="text-slate-300 font-black text-xs uppercase tracking-[0.3em]">{title}</div>
    <p className="text-slate-400 text-sm mt-2 font-medium italic">Database record missing.</p>
  </div>
);