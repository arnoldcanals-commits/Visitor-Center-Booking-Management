import { useState, useEffect, useMemo } from "react";
import { useLocation } from "react-router-dom";
import TopBar from "../components/TopBar";
import "../styles/Home.css"
import PackageList from "../components/PackageList";
import api from "../api";


export default function Home() {
  const location = useLocation();
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

  // Mobile filter toggle
  const [showMobileFilters, setShowMobileFilters] = useState(false);

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
        console.error(err);
        setPackages([]);
      } finally {
        setLoading(false);
      }
    };
    fetchPackages();
  }, []);

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
    // ✨ ADDED 'artsy-background' CLASS HERE
   <div className="min-h-screen bg-gray-50 artsy-background">
      <TopBar search={search} setSearch={setSearch} />

     

      <div className="px-6 py-4 flex flex-col lg:flex-row gap-6">
    

        {/* Packages */}
        <div className="flex-1 flex flex-col">
          <h2 className="text-xl font-semibold mb-4">
            Search results for "{search || "all"}"
          </h2>

          <div>
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