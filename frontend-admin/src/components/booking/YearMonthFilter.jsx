export default function YearMonthFilter({ year, month, setYear, setMonth, setCurrentPage }) {
  const years = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i);
  const months = [
    { value: "", label: "All Months" },
    { value: 1, label: "Jan" },
    { value: 2, label: "Feb" },
    { value: 3, label: "Mar" },
    { value: 4, label: "Apr" },
    { value: 5, label: "May" },
    { value: 6, label: "Jun" },
    { value: 7, label: "Jul" },
    { value: 8, label: "Aug" },
    { value: 9, label: "Sep" },
    { value: 10, label: "Oct" },
    { value: 11, label: "Nov" },
    { value: 12, label: "Dec" },
  ];

  return (
    <div className=" flex gap-2 ">
      <select
        value={year}
        onChange={(e) => { setYear(e.target.value); setCurrentPage(1); }}
        className="border p-2 px-8 rounded border border-gray-300 text-gray-700 text-sm p-2 rounded-lg outline-none focus:border-blue-500 placeholder-gray-400"
      >
        <option value="">All Years</option>
        {years.map((y) => <option key={y} value={y}>{y}</option>)}
      </select>
  
      <select
        value={month}
        onChange={(e) => { setMonth(e.target.value); setCurrentPage(1); }}
        className="border p-2 px-8 rounded border border-gray-300 text-gray-700 text-sm p-2 rounded-lg outline-none focus:border-blue-500 placeholder-gray-400"
      >
        {months.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
      </select>
    </div>
  );
}
