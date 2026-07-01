import { useState } from "react";
import { DateRange } from "react-date-range";
import "react-date-range/dist/styles.css";
import "react-date-range/dist/theme/default.css";

export default function FiltersSidebar({ filters, setFilters }) {
  const [isDateModalOpen, setIsDateModalOpen] = useState(false);

  const handlePriceChange = (e) => {
    const { name, value } = e.target;
    setFilters((prev) => ({ ...prev, [name]: value }));
  };

  const handleLocationChange = (e) => {
    setFilters((prev) => ({ ...prev, location: e.target.value }));
  };

  const handleDateChange = (selection) => {
    setFilters((prev) => ({
      ...prev,
      startDate: selection.startDate,
      endDate: selection.endDate,
    }));
  };

  const formatDate = (date) =>
    date ? date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "";

  return (
    <div className="w-full bg-white rounded-lg shadow p-4 max-h-[80vh] overflow-y-auto">
      {/* Location */}
      <div className="mb-4">
        <label className="block text-sm font-medium mb-1">Location</label>
        <input
          type="text"
          name="location"
          value={filters.location}
          onChange={handleLocationChange}
          placeholder="Enter location"
          className="w-full border rounded-lg p-2 text-sm"
        />
      </div>

      {/* Price Range */}
      <div className="mb-4">
        <label className="block text-sm font-medium mb-1">Price Range (₱)</label>
        <div className="flex gap-2">
          <input
            type="number"
            name="minPrice"
            value={filters.minPrice}
            onChange={handlePriceChange}
            placeholder="Min"
            className="w-1/2 border rounded-lg p-2 text-sm"
          />
          <input
            type="number"
            name="maxPrice"
            value={filters.maxPrice}
            onChange={handlePriceChange}
            placeholder="Max"
            className="w-1/2 border rounded-lg p-2 text-sm"
          />
        </div>
      </div>

      {/* Dates */}
      <div className="mb-4">
        <label className="block text-sm font-medium mb-1">Dates</label>
        <button
          className="w-full text-left border rounded-lg p-2 text-sm bg-gray-50 hover:bg-gray-100"
          onClick={() => setIsDateModalOpen(true)}
        >
          {filters.startDate && filters.endDate
            ? `${formatDate(filters.startDate)} - ${formatDate(filters.endDate)}`
            : "Select dates"}
        </button>
      </div>

      {/* Date Modal */}
      {isDateModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-start p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-lg shadow-lg w-full max-w-md p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold">Select Dates</h2>
              <button
                className="text-gray-600 hover:text-gray-900 font-bold text-xl"
                onClick={() => setIsDateModalOpen(false)}
              >
                &times;
              </button>
            </div>

            <DateRange
              editableDateInputs
              onChange={(item) => handleDateChange(item.selection)}
              moveRangeOnFirstSelection={false}
              ranges={[
                {
                  startDate: filters.startDate || new Date(),
                  endDate: filters.endDate || new Date(),
                  key: "selection",
                },
              ]}
              minDate={new Date()}
              className="rounded-lg w-full"
            />

            <button
              className="w-full mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              onClick={() => setIsDateModalOpen(false)}
            >
              Apply Dates
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
