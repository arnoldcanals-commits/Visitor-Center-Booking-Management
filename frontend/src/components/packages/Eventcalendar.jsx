import Calendar from "react-calendar";
import { useMemo } from "react";

// ✅ Proper local date parser
function parseLocalDate(dateStr) {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(y, m - 1, d); // local time, no UTC shift
}

export default function EventCalendar({ events }) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const futureEvents = useMemo(() => {
    return events.filter((e) => {
      const end = parseLocalDate(e.end_date);
      return end >= today;
    });
  }, [events]);

  if (!futureEvents.length) {
    return <p>No upcoming schedules.</p>;
  }

  return (
    <div className="grid gap-6 sm:grid-cols-1 md:grid-cols-2 xl:grid-cols-3">
      {futureEvents.map((e) => {
        const start = parseLocalDate(e.start_date);
        const end = parseLocalDate(e.end_date);

        const slotsLeft = e.slots_available ?? (e.slot_limit - e.slots_used);

        return (
          <div
            key={e.id}
            className="bg-white/30 backdrop-blur-lg border border-white/40 rounded-2xl shadow-md p-4"
          >
            {/* Header */}
            <div className="mb-3">
              <div className="font-semibold text-base sm:text-lg">
                {start.toDateString()} → {end.toDateString()}
              </div>

              <div className="text-xs sm:text-sm text-gray-600">
                {e.is_group_event ? "Group Event" : "Private Event"}
              </div>

              <div
                className={`mt-1 text-xs sm:text-sm font-semibold ${
                  slotsLeft > 0 ? "text-green-600" : "text-red-500"
                }`}
              >
                {slotsLeft > 0
                  ? `${slotsLeft} slots available`
                  : "Fully booked"}
              </div>
            </div>

            {/* Calendar */}
            <div className="pointer-events-none select-none">
              <Calendar
                activeStartDate={start}
                showNavigation={false}
                value={[start, end]}
                tileClassName={({ date, view }) => {
                  if (view !== "month") return;

                  // compare by date only
                  const d = new Date(
                    date.getFullYear(),
                    date.getMonth(),
                    date.getDate()
                  );

                  if (d >= start && d <= end) {
                    return "event-range";
                  }
                }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}