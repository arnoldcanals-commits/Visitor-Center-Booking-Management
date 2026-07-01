import { useLocation, useNavigate } from "react-router-dom";
import { useEffect, useState, useMemo } from "react";
import TopBar from "../components/TopBar";
import FiltersSidebar from "../components/FiltersSidebar";
import PackageList from "../components/PackageList";
import api from "../api";

export default function SearchPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const queryParam = new URLSearchParams(location.search).get("query") || "";

  const [search, setSearch] = useState(queryParam);
  const [packages, setPackages] = useState([]);
  const [loading, setLoading] = useState(true);

  const [filters, setFilters] = useState({
    minPrice: "",
    maxPrice: "",
    location: "",
    startDate: null,
    endDate: null,
  });

  // Fetch all packages (same as Home)
  useEffect(() => {
    const fetchPackages = async () => {
      try {
        setLoading(true);
        const res = await api.get("/api/home/");
        const pkgArray =
          Array.isArray(res.data)
            ? res.data
            : Array.isArray(res.data.packages)
            ? res.data.packages
            : [];
        setPackages(pkgArray);
      } catch (err) {
        console.error("Package fetch error:", err);
        setPackages([]);
      } finally {
        setLoading(false);
      }
    };

    fetchPackages();
  }, []);

  // Update URL on search submit
  const handleSearchSubmit = (e) => {
    e.preventDefault();
    navigate(`/search?query=${encodeURIComponent(search.trim())}`);
  };

  // Filter packages by search + filters
  const filteredPackages = useMemo(() => {
    return packages.filter((pkg) => {
      const matchesSearch =
        !search ||
        pkg.name.toLowerCase().includes(search.toLowerCase()) ||
        pkg.description.toLowerCase().includes(search.toLowerCase());

      const matchesLocation =
        !filters.location ||
        pkg.location?.toLowerCase().includes(filters.location.toLowerCase());

      const matchesMinPrice =
        !filters.minPrice || pkg.base_price >= Number(filters.minPrice);

      const matchesMaxPrice =
        !filters.maxPrice || pkg.base_price <= Number(filters.maxPrice);

      return matchesSearch && matchesLocation && matchesMinPrice && matchesMaxPrice;
    });
  }, [packages, search, filters]);

  return (
    <div className="min-h-screen bg-gray-50">
      <TopBar search={search} setSearch={setSearch} />

      <div className="px-6 py-4 flex gap-6">
        {/* LEFT — Sidebar */}
        <div className="w-64 shrink-0">
          <FiltersSidebar filters={filters} setFilters={setFilters} />
        </div>

        {/* RIGHT — Packages */}
        <div className="flex-1 flex flex-col">
          <h2 className="text-xl font-semibold mb-4">
            {search ? `Search results for "${search}"` : "All Packages"}
          </h2>

          <div className="mt-4">
            {loading ? (
              <p>Loading packages...</p>
            ) : filteredPackages.length === 0 ? (
              <p>No results found.</p>
            ) : (
              <PackageList packages={filteredPackages} />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
