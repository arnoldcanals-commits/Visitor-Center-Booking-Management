import { useEffect, useState, Component } from "react";
import api from "../api"; // ← your configured axios instance
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js";
import { Bar } from "react-chartjs-2";

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
);

// ---------------- Error Boundary ----------------
class DashboardErrorBoundary extends Component {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  render() {
    if (this.state.hasError) {
      return <div className="p-6 text-red-500">Dashboard crashed.</div>;
    }
    return this.props.children;
  }
}

// ---------------- Dashboard ----------------
function DashboardContent() {
  const [data, setData] = useState(null);

  useEffect(() => {
    api.get("/api/site_admin/dashboard-summary/")
      .then((res) => setData(res.data))
      .catch((err) => console.error("Dashboard error:", err));
  }, []);

  if (!data) {
    return <div className="p-6">Loading dashboard...</div>;
  }

  const statusChart = {
    labels: data.status_counts.map((s) => s.status),
    datasets: [
      {
        label: "Bookings by Status",
        data: data.status_counts.map((s) => s.count),
        backgroundColor: "#3B82F6",
      },
    ],
  };

  return (
    <div className="p-6 space-y-8">
      <h1 className="text-3xl font-semibold">Admin Dashboard</h1>

      {/* STAT CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        <StatCard title="Guests Today" value={data.guests_today} />
        <StatCard title="Revenue Today" value={`₱${data.revenue_today}`} />
        <StatCard title="Revenue This Month" value={`₱${data.revenue_month}`} />
        <StatCard title="Active Events" value={data.active_events} />
        <StatCard title="QR Checks Today" value={data.qr_checks_today} />
        <StatCard title="Pending Reviews" value={data.pending_reviews} />
      </div>

      {/* STATUS CHART */}
      <div className="bg-white p-6 rounded-2xl shadow">
        <h2 className="text-lg font-semibold mb-4">Booking Status Overview</h2>
        <Bar data={statusChart} />
      </div>
    </div>
  );
}

// ---------------- Reusable Card ----------------
function StatCard({ title, value }) {
  return (
    <div className="bg-white rounded-xl shadow p-6 flex flex-col items-center justify-center hover:scale-105 transition">
      <p className="text-sm text-gray-500">{title}</p>
      <p className="text-3xl font-bold mt-2">{value}</p>
    </div>
  );
}

// ---------------- Export ----------------
export default function Dashboard() {
  return (
    <DashboardErrorBoundary>
      <DashboardContent />
    </DashboardErrorBoundary>
  );
}