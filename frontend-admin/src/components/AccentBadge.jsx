export default function AccentBadge({ icon: Icon, children }) {
  return (
    <div
      className="flex items-center gap-2 p-3 rounded-xl w-fit border transition-colors duration-300
        [background-color:color-mix(in_srgb,var(--accent)_8%,white)]
        [border-color:color-mix(in_srgb,var(--accent)_20%,white)]
        [color:var(--accent)]
        
        dark:[background-color:color-mix(in_srgb,var(--accent)_12%,#111827)]
        dark:[border-color:color-mix(in_srgb,var(--accent)_30%,#111827)]
        dark:[color:color-mix(in_srgb,var(--accent)_90%,#f3f4f6)]"
    >
      {Icon && <Icon size={18} />}
      <span className="text-sm font-black uppercase tracking-tight">{children}</span>
    </div>
  );
}