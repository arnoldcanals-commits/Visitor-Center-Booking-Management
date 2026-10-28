import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import TopBar from "../../components/TopBar";
import AuthPanel from "../../components/AuthPanel";
import PackageDetailContent from "../../components/packages/PackageDetailContent";

import PackageCarousel from "../../components/packages/PackageCarouel";
import api from "../../api";

export default function PackageDetail() {
  const { id: selectedPackageId } = useParams();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authPanelOpen, setAuthPanelOpen] = useState(false);

  const [packageDetail, setPackageDetail] = useState(null);
  const [packages, setPackages] = useState([]);
  const [loadingDetail, setLoadingDetail] = useState(true);
  const [loadingPackages, setLoadingPackages] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("access");
    setIsAuthenticated(!!token);
  }, []);

  const handleLoginSuccess = () => {
    const token = localStorage.getItem("access");
    setIsAuthenticated(!!token);
    setAuthPanelOpen(false);
  };

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
  const otherPackages = packages.filter((pkg) => Number(pkg.id) !== selectedIdNum);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <TopBar openAuth={() => setAuthPanelOpen(true)} isAuthenticated={isAuthenticated} />
      {authPanelOpen && (
        <AuthPanel
          defaultMode="login"
          closePanel={() => setAuthPanelOpen(false)}
          onLoginSuccess={handleLoginSuccess}
        />
      )}

      {/* --- Stacked layout: detail on top, carousel pinned below --- */}
      <div className="flex flex-col w-full bg-white dark:bg-gray-900">
        {/* Detail content */}
        <div className="px-4 sm:px-6 pt-6">
          {loadingDetail ? (
            <p>Loading package details...</p>
          ) : packageDetail ? (
            <PackageDetailContent packageDetail={packageDetail} />
          ) : (
            <p>Package not found.</p>
          )}
        </div>

        {/* Carousel section */}
        <div className="mt-10 pb-16 px-4 sm:px-6">
          <h2 className="text-lg font-semibold mb-3 dark:text-white">
            You might also like
          </h2>
          {loadingPackages ? (
            <p>Loading packages...</p>
          ) : otherPackages.length === 0 ? (
            <p>No packages available.</p>
          ) : (
            <PackageCarousel packages={otherPackages} />
          )}
        </div>
      </div>
    </div>
  );
}