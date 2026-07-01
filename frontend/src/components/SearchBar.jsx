import React from "react";

export default function SearchBar({ search = "", setSearch = () => {}, onSearchSubmit, showButton = false }) {
  return (
    <div className="w-full px-4 sm:px-6 md:px-8 lg:px-40 max-w-full mx-auto">
      <form onSubmit={onSearchSubmit} style={{ all: 'unset', display: 'block', width: '100%' }}>
        <div className="relative transition-all duration-300 rounded-xl focus-within:shadow-lg focus-within:bg-white focus-within:scale-[1.03]">
          <input
            name="search"
            type="search"
            placeholder="Search for tours, experiences..."
            value={search || ""}
            onChange={(e) => setSearch?.(e.target.value)}
            className="block w-full py-2.5 pl-4 pr-16 text-sm border border-gray-300 rounded-xl bg-gray-100 transition-all duration-300 focus:border-blue-500 focus:bg-white"
          />
          {showButton && (
            <button
              type="submit"
              className="absolute right-1 top-1/2 -translate-y-1/2 py-2 px-3 bg-teal-600 text-white rounded-md text-sm font-medium hover:bg-orange-400 border border-gray-300"
            >
              Search
            </button>
          )}
        </div>
      </form>
    </div>
  );
}
