import { useMemo, useState } from "react";
import dayjs from "dayjs";
import { LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer } from "recharts";
import { motion, AnimatePresence } from "framer-motion";

export default function TouristStats({ users = [] }) {
  const now = dayjs();
  const [expanded, setExpanded] = useState(true); // toggle state

  // ----------------------------------------
  // Calculate totals
  // ----------------------------------------
  const stats = useMemo(() => {
    const tourists = users.filter((u) => u.role === "tourist");

    const createdThisMonth = tourists.filter(u =>
      dayjs(u.date_joined).isSame(now, "month")
    ).length;

    const createdThisYear = tourists.filter(u =>
      dayjs(u.date_joined).isSame(now, "year")
    ).length;

    return { createdThisMonth, createdThisYear };
  }, [users]);

  // ----------------------------------------
  // Prepare line chart data
  // ----------------------------------------
  const chartData = useMemo(() => {
    const months = Array.from({ length: 12 }, (_, i) => dayjs().month(i));
    const tourists = users.filter((u) => u.role === "tourist");

    return months.map((m) => {
      const monthStr = m.format("MMM");
      const created = tourists.filter(u => dayjs(u.date_joined).month() === m.month()).length;
      return { month: monthStr, created };
    });
  }, [users]);

  return (
    <div className="mb-6">
      {/* Totals */}
      <div className="flex gap-4 mb-4">
        <div className="p-4 bg-white rounded-xl shadow flex-1">
          <h3 className="text-gray-500 text-sm">Tourists Created This Month</h3>
          <p className="text-2xl font-bold">{stats.createdThisMonth}</p>
        </div>
        <div className="p-4 bg-white rounded-xl shadow flex-1">
          <h3 className="text-gray-500 text-sm">Tourists Created This Year</h3>
          <p className="text-2xl font-bold">{stats.createdThisYear}</p>
        </div>
      </div>

      {/* Line Chart with toggle */}
      <div className="p-4 bg-white rounded-xl shadow w-full mb-3">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-gray-600">Tourist Growth This Year</h3>
          <button
            onClick={() => setExpanded(prev => !prev)}
            className="text-blue-600 hover:text-blue-800 font-medium"
          >
            {expanded ? "Minimize" : "Expand"}
          </button>
        </div>

        <AnimatePresence initial={false}>
          {expanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 256, opacity: 1 }} // height = h-64 ~ 16rem = 256px
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.4 }}
            >
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis allowDecimals={false} />
                  <Tooltip />
                  <Line type="monotone" dataKey="created" stroke="#1D4ED8" name="Tourists Created" />
                </LineChart>
              </ResponsiveContainer>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
