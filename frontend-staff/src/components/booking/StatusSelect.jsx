export default function StatusSelect({ value, onChange, statusChoices, statusColors }) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="px-4 pr-4 py-1 rounded border-none outline-none"
      style={{
        backgroundColor: statusColors[value]?.split(" ")[0]?.replace("bg-", "") || "#ccc",
        color: "white",
      }}
    >
      {statusChoices.map((s) => (
        <option key={s.value} value={s.value}>{s.label}</option>
      ))}
    </select>
  );
}
