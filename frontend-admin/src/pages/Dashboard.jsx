import { useEffect, useState, useContext, Component } from "react";
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
import { AuthContext } from "../contexts/AuthContext";
import WelcomeTransition from "../components/WelcomeAnimation";
import useWelcomeOnLogin from "../hooks/Usewelcomeonlogin";

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
      return <div className="p-6 text-red-500 dark:text-red-400">Dashboard crashed.</div>;
    }
    return this.props.children;
  }
}

// ---------------- Dashboard ----------------
function DashboardContent() {
  const { user } = useContext(AuthContext);
  const [showWelcome, dismissWelcome] = useWelcomeOnLogin();
  const [data, setData] = useState(null);

  useEffect(() => {
    api.get("/api/site_admin/dashboard-summary/")
      .then((res) => setData(res.data))
      .catch((err) => console.error("Dashboard error:", err));
  }, []);

  // Rendered above the loading state too, so it's on screen immediately
  // on arrival rather than waiting for the data fetch to resolve first.
  const welcomeOverlay = showWelcome && (
   <WelcomeTransition name={user?.username} onFinished={dismissWelcome} duration={4000} />
  );

  if (!data) {
    return (
      <>
        {welcomeOverlay}
        <div className="p-6 text-gray-700 dark:text-gray-300">Loading dashboard...</div>
      </>
    );
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

  // Dynamically update chart scales for dark mode compatibility
  const isDark = document.documentElement.classList.contains("dark");
  const chartOptions = {
    responsive: true,
    plugins: {
      legend: {
        labels: {
          color: isDark ? "#9CA3AF" : "#4B5563",
        },
      },
    },
    scales: {
      x: {
        grid: {
          color: isDark ? "rgba(75, 85, 99, 0.3)" : "rgba(229, 231, 235, 1)",
        },
        ticks: {
          color: isDark ? "#9CA3AF" : "#4B5563",
        },
      },
      y: {
        grid: {
          color: isDark ? "rgba(75, 85, 99, 0.3)" : "rgba(229, 231, 235, 1)",
        },
        ticks: {
          color: isDark ? "#9CA3AF" : "#4B5563",
        },
      },
    },
  };

  const stats = [
    { title: "Guests Today", value: data.guests_today },
    { title: "Revenue Today", value: `₱${data.revenue_today}` },
    { title: "Revenue This Month", value: `₱${data.revenue_month}` },
    { title: "Active Events", value: data.active_events },
    { title: "QR Checks Today", value: data.qr_checks_today },
    { title: "Pending Reviews", value: data.pending_reviews },
  ];

  return (
    <>
      {welcomeOverlay}
      <div className="p-6 space-y-8 bg-gray-50 dark:bg-gray-900 text-gray-850 dark:text-gray-100 min-h-screen transition-colors duration-300">
        <h1 className="text-3xl font-semibold text-gray-900 dark:text-gray-100">Admin Dashboard</h1>

        {/* HONEYCOMB STAT CELLS */}
        <HoneycombGrid stats={stats} />

        {/* STATUS CHART */}
        <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow border border-transparent dark:border-gray-700/50">
          <h2 className="text-lg font-semibold mb-4 text-gray-900 dark:text-gray-100">Booking Status Overview</h2>
          <Bar data={statusChart} options={chartOptions} />
        </div>
      </div>
    </>
  );
}

// ---------------- Honeycomb Grid ----------------
// Pointy-top hexagons tessellated in offset rows using Tailwind's
// arbitrary clip-path utility. Rows alternate a horizontal shift and
// pull upward slightly so each hex nestles into the row above it.
// Offsets are scaled to match the current hex size (123 x 142px).
function HoneycombGrid({ stats }) {
  const rows = [];
  for (let i = 0; i < stats.length; i += 3) {
    rows.push(stats.slice(i, i + 3));
  }

  return (
    <div className="flex flex-col items-center gap-0">
      {rows.map((row, i) => (
        <div
          key={i}
          className={[
            "flex flex-wrap justify-center gap-3",
            i > 0 ? "sm:-mt-[64px] sm:translate-x-[73px]" : "",
            i > 0 ? "mt-2 sm:mt-0" : "",
          ].join(" ")}
        >
          {row.map((s) => (
            <HexCard key={s.title} title={s.title} value={s.value} />
          ))}
        </div>
      ))}
    </div>
  );
}

// ---------------- Hex Cell ----------------
// Rendered as a hollow frame: an outer hexagon filled with a flat
// (non-gradient) accent color acts as the "stroke", and an inner
// hexagon inset by a couple pixels is filled with the page/card
// background, leaving just a thin accent-colored outline.
function HexCard({ title, value }) {
  const hexClip =
    "polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)";

  return (
    <div
      className="relative w-[123px] h-[142px] shrink-0 hover:scale-105 transition-transform duration-300 cursor-default"
      style={{
        clipPath: hexClip,
        backgroundColor: "var(--accent)",
      }}
    >
      <div
        className="absolute inset-[2px] flex items-center justify-center bg-white dark:bg-gray-800"
        style={{ clipPath: hexClip }}
      >
        <div className="flex flex-col items-center justify-center px-4 text-center">
          <p className="text-[10px] font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
            {title}
          </p>
          <p className="text-lg font-bold mt-1 text-gray-900 dark:text-gray-100">
            {value}
          </p>
        </div>
      </div>
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