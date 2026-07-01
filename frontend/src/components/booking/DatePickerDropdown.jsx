import { useState, useRef, useEffect } from "react";
import { DateRange } from "react-date-range";
import "react-date-range/dist/styles.css";
import "react-date-range/dist/theme/default.css";

export default function DatePickerModal({ form, setForm }) {
  const [showCalendar, setShowCalendar] = useState(false);
  const [animate, setAnimate] = useState(false);
  const ref = useRef();

  // Trigger animation when modal opens
  useEffect(() => {
    if (showCalendar) {
      setTimeout(() => setAnimate(true), 10);
    } else {
      setAnimate(false);
    }
  }, [showCalendar]);

  // Close modal on outside click or Esc
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setShowCalendar(false);
    };

    const handleEsc = (e) => {
      if (e.key === "Escape") setShowCalendar(false);
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEsc);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEsc);
    };
  }, []);

  const { startDate, endDate } = form.dateRange[0];

  const formatDate = (date) =>
    date.toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
    });

  // Update selected dates without closing modal
  const handleSelect = (item) => {
    setForm({ ...form, dateRange: [item.selection] });
  };

  return (
    <div className="space-y-1">
      <label className="font-medium">Select Dates</label>
      <button
        type="button"
        onClick={() => setShowCalendar(true)}
        className="w-full border rounded-lg p-2 text-left flex justify-between items-center focus:outline-none"
      >
        <span className="flex gap-2">
          <span className="bg-green-100 px-2 py-1 rounded font-medium transition-transform duration-150 hover:scale-105 hover:bg-green-200">
            From {formatDate(startDate)}
          </span>
          <span className="bg-orange-100 px-2 py-1 rounded font-medium transition-transform duration-150 hover:scale-105 hover:bg-orange-200">
            to {formatDate(endDate)}
          </span>
        </span>
        <span>📅</span>
      </button>

      {showCalendar && (
        <div
          className={`fixed inset-0 bg-black/50 flex items-center justify-center z-50 transition-opacity duration-300 ${
            animate ? "opacity-100" : "opacity-0"
          }`}
        >
          <div
            ref={ref}
            className={`bg-white p-4 rounded-lg shadow-lg transform transition-all duration-300 ${
              animate ? "scale-100" : "scale-95"
            }`}
            style={{ outline: "none" }}
          >
            <DateRange
              editableDateInputs={false}
              onChange={handleSelect}
              moveRangeOnFirstSelection={false}
              ranges={form.dateRange}
              minDate={new Date()}
              className="rounded-lg"
            />

            {/* Done button */}
            <div className="mt-4 flex justify-end">
              <button
                type="button"
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                onClick={() => setShowCalendar(false)}
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Inline style to remove focus outlines */}
      <style>
        {`
          .rdrDateDisplayItem input {
            outline: none !important;
            box-shadow: none !important;
          }
        `}
      </style>
    </div>
  );
}
