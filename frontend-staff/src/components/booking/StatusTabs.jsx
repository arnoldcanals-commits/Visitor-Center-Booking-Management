
// src/components/booking/StatusTabs.jsx
export default function StatusTabs({ activeTab, setActiveTab, statusChoices, setCurrentPage }) {
  return (
    <div className="flex gap-2 mb-4">
      <button
        className={`px-3 py-1 rounded ${activeTab === "all" ? "bg-blue-600 text-white" : "bg-gray-100"}`}
        onClick={() => { setActiveTab("all"); setCurrentPage(1); }}
      >
        All
      </button>
      {statusChoices.map((s) => (
        <button
          key={s.value}
          className={`px-3 py-1 rounded ${activeTab === s.value ? "bg-blue-600 text-white" : "bg-gray-100"}`}
          onClick={() => { setActiveTab(s.value); setCurrentPage(1); }}
        >
          {s.label}
        </button>
      ))}
    </div>
  );
}
