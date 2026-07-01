// src/pages/Dashboard.jsx
import { useContext, useMemo, useState, Component } from "react";
import { StaffDataContext } from "../contexts/StaffDataContext";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js";
import { Line, Pie } from "react-chartjs-2";
import moment from "moment";
import Calendar from "react-calendar";
import "react-calendar/dist/Calendar.css";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend
);

// ---------------- Error Boundary ----------------
class DashboardErrorBoundary extends Component {
  state = { hasError: false };

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  render() {
    if (this.state.hasError)
      return <div className="p-4 text-red-500">Something went wrong in the dashboard.</div>;
    return this.props.children;
  }
}

// ---------------- Dashboard Component ----------------
function DashboardContent() {
  const { staffData, loading } = useContext(StaffDataContext);
  const [selectedDate, setSelectedDate] = useState(new Date());

  // ---------------- Filter bookings ----------------
  const completedBookings = useMemo(
    () => (staffData?.bookings || []).filter(b => ["approved", "completed"].includes(b.status)),
    [staffData]
  );

  // ---------------- Total Guests ----------------
  const totalGuests = useMemo(
    () => completedBookings.reduce((sum, b) => sum + (b.guests?.length || 0), 0),
    [completedBookings]
  );

  // ---------------- Guest Ages ----------------
  const guestAges = useMemo(() => {
    const ages = {};
    completedBookings.forEach(b => {
      if (!b.guests || !b.guests.length) return;
      b.guests.forEach(g => {
        if (!g.age && g.age !== 0) return;
        const ageGroup =
          g.age < 18 ? "Under 18" :
          g.age <= 30 ? "18-30" :
          g.age <= 50 ? "31-50" :
          "51+";
        ages[ageGroup] = (ages[ageGroup] || 0) + 1;
      });
    });
    return ages;
  }, [completedBookings]);

  // ---------------- Total Revenue ----------------
  const totalRevenue = useMemo(() => {
    const sum = completedBookings.reduce((acc, b) => acc + (b.total_amount || 0), 0);
    return new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP" }).format(sum || 0);
  }, [completedBookings]);

  // ---------------- Bookings by Date ----------------
  const bookingsByDate = useMemo(() => {
    const map = {};
    completedBookings.forEach(b => {
      const date = moment(b.booking_date).format("YYYY-MM-DD");
      map[date] = (map[date] || 0) + (b.guests?.length || 0);
    });
    return map;
  }, [completedBookings]);

  // ---------------- Calendar Tile Content ----------------
  const tileContent = ({ date, view }) => {
    if (view === "month") {
      const formatted = moment(date).format("YYYY-MM-DD");
      const count = bookingsByDate[formatted];
      if (count) {
        return (
          <div className="mt-1 flex flex-col items-center justify-center">
            <span
              className="bg-gradient-to-r from-teal-400 to-teal-600 text-white text-xs font-semibold rounded-full px-2 py-1 shadow-md animate-pulse"
              title={`${count} guest${count > 1 ? "s" : ""}`}
            >
              {count}
            </span>
          </div>
        );
      }
    }
    return null;
  };

  // ---------------- Charts ----------------
  const ageChartData = useMemo(() => ({
    labels: Object.keys(guestAges),
    datasets: [
      {
        label: "Guests by Age Group",
        data: Object.values(guestAges),
        backgroundColor: ["#3B82F6", "#10B981", "#F59E0B", "#EF4444"],
      },
    ],
  }), [guestAges]);

  const monthlyGuestsData = useMemo(() => {
    const map = {};
    completedBookings.forEach(b => {
      const month = moment(b.booking_date).format("YYYY-MM");
      map[month] = (map[month] || 0) + (b.guests?.length || 0);
    });
    return {
      labels: Object.keys(map),
      datasets: [
        {
          label: "Guests per Month",
          data: Object.values(map),
          fill: false,
          backgroundColor: "#3B82F6",
          borderColor: "#3B82F6",
        },
      ],
    };
  }, [completedBookings]);

  if (loading) return <div className="p-4">Loading dashboard...</div>;

  return (
    <div className="p-4 space-y-6">
      <h1 className="text-2xl font-semibold">Dashboard</h1>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-xl shadow min-h-[120px] flex flex-col justify-center items-center hover:scale-105 transform transition">
          <h2 className="text-sm font-medium text-gray-500">Total Guests</h2>
          <p className="text-2xl font-bold mt-2">{totalGuests}</p>
        </div>
        <div className="bg-white p-6 rounded-xl shadow min-h-[120px] flex flex-col justify-center items-center hover:scale-105 transform transition">
          <h2 className="text-sm font-medium text-gray-500">Total Revenue</h2>
          <p className="text-2xl font-bold mt-2">{totalRevenue}</p>
        </div>
      </div>

      {/* Charts + Calendar */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Charts */}
        <div className="bg-white p-6 rounded-2xl shadow-xl col-span-1 lg:col-span-3 space-y-6">
          <div className="w-full h-64">
            <h3 className="text-lg font-medium mb-2">Guests per Month</h3>
            {monthlyGuestsData.labels.length ? <Line data={monthlyGuestsData} /> : <p className="text-gray-500 text-sm">No bookings data</p>}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="w-full h-64">
              <h3 className="text-lg font-medium mb-2">Guests by Age Group</h3>
              {ageChartData.labels.length ? <Pie data={ageChartData} /> : <p className="text-gray-500 text-sm">No age data</p>}
            </div>
          </div>
        </div>

        {/* Calendar */}
        <div className="bg-white p-6 rounded-2xl shadow-xl w-full col-span-full">
          <h3 className="text-xl font-semibold mb-4 text-teal-600">Calendar</h3>
<Calendar
  onChange={setSelectedDate}
  value={selectedDate}
  tileContent={tileContent}
  calendarType="iso8601"
  className="
    react-calendar w-full border-none font-roboto text-gray-700
    [&_.react-calendar__tile]:transition-transform [&_.react-calendar__tile]:duration-300
    [&_.react-calendar__tile--now]:bg-teal-100 [&_.react-calendar__tile--now]:text-teal-800 [&_.react-calendar__tile--now]:font-semibold
    [&_.react-calendar__tile--active]:bg-teal-500 [&_.react-calendar__tile--active]:text-white [&_.react-calendar__tile--active]:shadow-lg
    [&_.react-calendar__month-view__days__day]:flex [&_.react-calendar__month-view__days__day]:flex-col [&_.react-calendar__month-view__days__day]:items-center [&_.react-calendar__month-view__days__day]:justify-center
    [&_.react-calendar__tile]:rounded-lg [&_.react-calendar__tile]:hover:scale-105 [&_.react-calendar__tile]:hover:bg-teal-200 [&_.react-calendar__tile]:cursor-pointer
    [&_.react-calendar__navigation__label]:font-bold [&_.react-calendar__navigation__label]:text-gray-900
    [&_.react-calendar__navigation__arrow]:text-gray-500
  "
/>


        </div>
      </div>
    </div>
  );
}

// ---------------- Export with Error Boundary ----------------
export default function Dashboard() {
  return (
    <DashboardErrorBoundary>
      <DashboardContent />
    </DashboardErrorBoundary>
  );
}
