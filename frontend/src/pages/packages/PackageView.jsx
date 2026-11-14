import { useState, useEffect, useCallback } from "react";
import { useParams } from "react-router-dom";
import TopBar from "../../components/TopBar";
import AuthPanel from "../../components/AuthPanel";
import PackageDetailContent from "../../components/packages/PackageDetailContent";

import PackageCarousel from "../../components/packages/PackageCarouel";
import api from "../../api";
import { setIfChanged, useLiveRefresh } from "../../hooks/useLiveRefresh";

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

  const fetchPackageDetail = useCallback(async (background = false) => {
    if (!selectedPackageId) return;
    if (!background) setLoadingDetail(true);
    try {
      const res = await api.get(
        `/api/packages/${selectedPackageId}/`,
        background ? { suppressGlobalApiError: true } : undefined
      );
      setIfChanged(setPackageDetail, res.data);
    } catch (err) {
      if (!background) {
        console.error("Failed to fetch package detail:", err);
        setPackageDetail(null);
      } else {
        console.warn("Package detail live refresh failed:", err);
      }
    } finally {
      if (!background) setLoadingDetail(false);
    }
  }, [selectedPackageId]);

  useEffect(() => {
    fetchPackageDetail();
  }, [fetchPackageDetail]);

  useLiveRefresh(() => fetchPackageDetail(true), {
    enabled: !!selectedPackageId && !loadingDetail,
  });

  const fetchPackages = useCallback(async (background = false) => {
    if (!background) setLoadingPackages(true);
    try {
      const res = await api.get(
        "/api/packages/",
        background ? { suppressGlobalApiError: true } : undefined
      );
      const data = Array.isArray(res.data)
        ? res.data
        : res.data.packages || [];
      const sanitized = data.map((pkg) => ({
        ...pkg,
        images: Array.isArray(pkg.images) ? pkg.images : [],
      }));

      setIfChanged(setPackages, sanitized);
    } catch (err) {
      if (!background) {
        console.error("Failed to fetch packages:", err);
        setPackages([]);
      } else {
        console.warn("Package list live refresh failed:", err);
      }
    } finally {
      if (!background) setLoadingPackages(false);
    }
  }, []);

  useEffect(() => {
    fetchPackages();
  }, [fetchPackages]);

  useLiveRefresh(() => fetchPackages(true), { enabled: !loadingPackages });

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