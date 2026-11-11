import { useState } from "react";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { CalendarDays, Clock } from "lucide-react";

/* =======================
   Helpers
   ======================= */
const startOfDay = (d) => {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
};

const addDays = (d, n) => {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
};

// returns a copy of `date` set to `minutes` past midnight
const withTime = (date, minutes) => {
  const x = new Date(date);
  x.setHours(Math.floor(minutes / 60), minutes % 60, 0, 0);
  return x;
};

const minutesOf = (d) => d.getHours() * 60 + d.getMinutes();

const fmtTime = (mins) => {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return `${h % 12 || 12}:${String(m).padStart(2, "0")} ${h >= 12 ? "PM" : "AM"}`;
};

const toInputValue = (mins) =>
  `${String(Math.floor(mins / 60)).padStart(2, "0")}:${String(mins % 60).padStart(2, "0")}`;

const fmtDate = (d) =>
  d.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });

// quick-pick times, in minutes past midnight
const DEFAULT_CHECK_IN_PRESETS = [8 * 60, 10 * 60, 12 * 60, 14 * 60, 16 * 60];
const DEFAULT_CHECK_OUT_PRESETS = [10 * 60, 12 * 60, 14 * 60, 16 * 60, 18 * 60];

/* =======================
   Time chooser: tap a chip, or pick "Other" for an exact time
   ======================= */
function TimeChooser({ label, day, minutes, presets, notAfter, onChange }) {
  const [custom, setCustom] = useState(false);
  const showCustom = custom || !presets.includes(minutes);

  // a time is unavailable if it is not strictly after `notAfter`
  const isDisabled = (m) => !!notAfter && withTime(day, m) <= notAfter;

  const chip =
    "min-h-[44px] px-3.5 rounded-full border text-sm font-medium whitespace-nowrap transition active:scale-95 disabled:opacity-35 disabled:active:scale-100";
  const idle =
    "border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-gray-800 dark:text-slate-100";
  const on = { backgroundColor: "var(--accent)", borderColor: "var(--accent)", color: "#fff" };

  return (
    <div>
      <div className="flex items-center gap-2 mb-2 text-sm font-medium text-gray-700 dark:text-slate-200">
        <Clock size={15} style={{ color: "var(--accent)" }} />
        {label}
      </div>

      <div className="flex flex-wrap gap-2">
        {presets.map((m) => {
          const selected = !showCustom && m === minutes;
          return (
            <button
              key={m}
              type="button"
              disabled={isDisabled(m)}
              onClick={() => {
                setCustom(false);
                onChange(m);
              }}
              aria-pressed={selected}
              className={`${chip} ${selected ? "" : idle}`}
              style={selected ? on : undefined}
            >
              {fmtTime(m)}
            </button>
          );
        })}

        <button
          type="button"
          onClick={() => setCustom(true)}
          aria-pressed={showCustom}
          className={`${chip} ${showCustom ? "" : idle}`}
          style={showCustom ? on : undefined}
        >
          Other
        </button>
      </div>

      {showCustom && (
        <div className="mt-3 flex items-center gap-3">
          {/* native time input: phones show their own wheel picker */}
          <input
            type="time"
            step={900}
            value={toInputValue(minutes)}
            onChange={(e) => {
              const [h, m] = e.target.value.split(":").map(Number);
              if (!Number.isNaN(h) && !Number.isNaN(m)) onChange(h * 60 + m);
            }}
            className="h-11 px-3 rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-gray-900 dark:text-slate-100 text-base [color-scheme:light] dark:[color-scheme:dark]"
          />
          <span className="text-sm text-gray-500 dark:text-slate-400">{fmtTime(minutes)}</span>
        </div>
      )}
    </div>
  );
}

/* =======================
   DateTimeRangePicker

   Props
   - startDate, endDate: Date objects (date + time)
   - onChange({ startDate, endDate })
   - checkInPresets / checkOutPresets: optional arrays of minutes past midnight
   ======================= */
export default function DateTimeRangePicker({
  startDate,
  endDate,
  onChange,
  checkInPresets = DEFAULT_CHECK_IN_PRESETS,
  checkOutPresets = DEFAULT_CHECK_OUT_PRESETS,
}) {
  // true after the first calendar tap, while waiting for the check-out date
  const [picking, setPicking] = useState(false);

  const today = startOfDay(new Date());
  const inMinutes = minutesOf(startDate);
  const outMinutes = minutesOf(endDate);

  const handleRange = ([s, e]) => {
    if (!s) return;
    if (!e) {
      // first tap: keep the parent in a valid state with a 1-night default
      setPicking(true);
      onChange({
        startDate: withTime(s, inMinutes),
        endDate: withTime(addDays(s, 1), outMinutes),
      });
      return;
    }
    setPicking(false);
    onChange({
      startDate: withTime(s, inMinutes),
      endDate: withTime(e, outMinutes),
    });
  };

  const invalidRange = endDate <= startDate;
  const nights = Math.max(
    0,
    Math.round((startOfDay(endDate) - startOfDay(startDate)) / 86400000)
  );

  return (
    <div className="dtp text-gray-900 dark:text-slate-100">
      <style>{`
        .dtp .react-datepicker { width: 100%; border: 0; background: transparent; font-family: inherit; color: inherit; }
        .dtp .react-datepicker__navigation-icon::before { border-color: currentColor; }
        .dtp .react-datepicker__day--outside-month { opacity: 0.45; }
        .dtp .react-datepicker__month-container { width: 100%; float: none; }
        .dtp .react-datepicker__header { background: transparent; border: 0; padding-top: 0; }
        .dtp .react-datepicker__current-month,
        .dtp .react-datepicker__day-name,
        .dtp .react-datepicker__day { color: inherit; }
        .dtp .react-datepicker__day-names,
        .dtp .react-datepicker__week { display: flex; justify-content: space-around; }
        .dtp .react-datepicker__day,
        .dtp .react-datepicker__day-name { width: 2.5rem; height: 2.5rem; line-height: 2.5rem; margin: 0; border-radius: 9999px; }
        .dtp .react-datepicker__day:hover { background: color-mix(in srgb, var(--accent) 15%, transparent); }
        .dtp .react-datepicker__day--keyboard-selected { background: transparent; }
        .dtp .react-datepicker__day--in-range,
        .dtp .react-datepicker__day--in-selecting-range { background: color-mix(in srgb, var(--accent) 20%, transparent); color: inherit; }
        .dtp .react-datepicker__day--selected,
        .dtp .react-datepicker__day--range-start,
        .dtp .react-datepicker__day--range-end { background: var(--accent); color: #fff; }
        .dtp .react-datepicker__day--disabled { opacity: 0.35; }
        .dtp .react-datepicker__navigation { top: 0.25rem; }
      `}</style>

      {/* Summary */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="rounded-lg border border-gray-200 dark:border-slate-600 bg-gray-50 dark:bg-slate-900 p-3">
          <p className="text-xs text-gray-500 dark:text-slate-400">Check-in</p>
          <p className="text-sm font-semibold">{fmtDate(startDate)}</p>
          <p className="text-xs text-gray-600 dark:text-slate-300">{fmtTime(inMinutes)}</p>
        </div>
        <div className="rounded-lg border border-gray-200 dark:border-slate-600 bg-gray-50 dark:bg-slate-900 p-3">
          <p className="text-xs text-gray-500 dark:text-slate-400">Check-out</p>
          {picking ? (
            <p className="text-sm font-semibold" style={{ color: "var(--accent)" }}>
              Pick a date
            </p>
          ) : (
            <>
              <p className="text-sm font-semibold">{fmtDate(endDate)}</p>
              <p className="text-xs text-gray-600 dark:text-slate-300">{fmtTime(outMinutes)}</p>
            </>
          )}
        </div>
      </div>

      {/* Calendar: inline, so nothing floats over it */}
      <div className="flex items-center gap-2 mb-1 text-sm text-gray-600 dark:text-slate-300">
        <CalendarDays size={15} style={{ color: "var(--accent)" }} />
        {picking
          ? "Now tap your check-out date (tap the same day for a day trip)."
          : "Tap your check-in date, then your check-out date."}
      </div>
      <DatePicker
        inline
        selectsRange
        startDate={startOfDay(startDate)}
        endDate={picking ? null : startOfDay(endDate)}
        onChange={handleRange}
        minDate={today}
      />

      {/* Times */}
      <div className="mt-4 pt-4 border-t border-gray-200 dark:border-slate-700 flex flex-col gap-5">
        <TimeChooser
          label="Check-in time"
          day={startDate}
          minutes={inMinutes}
          presets={checkInPresets}
          notAfter={new Date()}
          onChange={(m) => onChange({ startDate: withTime(startDate, m), endDate })}
        />
        <TimeChooser
          label="Check-out time"
          day={endDate}
          minutes={outMinutes}
          presets={checkOutPresets}
          notAfter={startDate}
          onChange={(m) => onChange({ startDate, endDate: withTime(endDate, m) })}
        />
      </div>

      <p
        className={`mt-4 text-sm ${
          invalidRange ? "text-red-600 dark:text-red-400" : "text-gray-600 dark:text-slate-300"
        }`}
      >
        {invalidRange
          ? "Check-out needs to be later than check-in."
          : nights === 0
          ? "Day trip, same-day check-out"
          : `${nights} ${nights === 1 ? "night" : "nights"} stay`}
      </p>
    </div>
  );
}