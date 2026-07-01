import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import TopBar from "../../components/TopBar";
import AuthPanel from "../../components/AuthPanel";
import PackageDetailContent from "../../components/packages/PackageDetailContent";
import PackageList from "../../components/PackageList";
import api from "../../api";

export default function PackageDetail() {
  const { id: selectedPackageId } = useParams();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authPanelOpen, setAuthPanelOpen] = useState(false);

  const [packageDetail, setPackageDetail] = useState(null);
  const [packages, setPackages] = useState([]);
  const [loadingDetail, setLoadingDetail] = useState(true);
  const [loadingPackages, setLoadingPackages] = useState(true);

  // --- Check auth once on mount
  useEffect(() => {
    const token = localStorage.getItem("access");
    setIsAuthenticated(!!token);
  }, []);

  const handleLoginSuccess = () => {
    const token = localStorage.getItem("access");
    setIsAuthenticated(!!token);
    setAuthPanelOpen(false);
  };

  // --- Fetch single package detail
  useEffect(() => {
    if (!selectedPackageId) return;

    const fetchPackageDetail = async () => {
      setLoadingDetail(true);
      try {
        const res = await api.get(`/api/packages/${selectedPackageId}/`);
        setPackageDetail(res.data);
      } catch (err) {
        console.error("Failed to fetch package detail:", err);
        setPackageDetail(null);
      } finally {
        setLoadingDetail(false);
      }
    };

    fetchPackageDetail();
  }, [selectedPackageId]);

  // --- Fetch all packages for right column
  useEffect(() => {
    const fetchPackages = async () => {
      setLoadingPackages(true);
      try {
        const res = await api.get("/api/packages/");
        const data = Array.isArray(res.data)
          ? res.data
          : res.data.packages || [];

        const sanitized = data.map((pkg) => ({
          ...pkg,
          images: Array.isArray(pkg.images) ? pkg.images : [],
        }));

        setPackages(sanitized);
      } catch (err) {
        console.error("Failed to fetch packages:", err);
        setPackages([]);
      } finally {
        setLoadingPackages(false);
      }
    };

    fetchPackages();
  }, []);

  const selectedIdNum = Number(selectedPackageId);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* --- TopBar + AuthPanel --- */}
      <TopBar openAuth={() => setAuthPanelOpen(true)} isAuthenticated={isAuthenticated} />
      {authPanelOpen && (
        <AuthPanel
          defaultMode="login"
          closePanel={() => setAuthPanelOpen(false)}
          onLoginSuccess={handleLoginSuccess}
        />
      )}

      {/* --- Main two-column layout --- */}
      <div className="px-4 sm:px-6 flex flex-col lg:flex-row gap-6 w-full">
        {/* Left column: Package detail */}
        <div className="flex-1">
          {loadingDetail ? (
            <p>Loading package details...</p>
          ) : packageDetail ? (
            <PackageDetailContent packageDetail={packageDetail} />
          ) : (
            <p>Package not found.</p>
          )}
        </div>

        {/* Right column: Package list */}
        <div className="mt-12 w-full flex justify-center lg:justify-start lg:max-w-none lg:w-80 pb-28">
          {loadingPackages ? (
            <p>Loading packages...</p>
          ) : packages.length === 0 ? (
            <p>No packages available.</p>
          ) : (
            <PackageList
              packages={packages.filter((pkg) => Number(pkg.id) !== selectedIdNum)}
            />
          )}
        </div>
      </div>
    </div>
  );
}
