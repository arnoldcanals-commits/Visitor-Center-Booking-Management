import React, {
  createContext,
  useEffect,
  useState,
  useContext,
  useCallback,
  useRef,
} from "react";
import api from "../api";
import { AuthContext } from "./AuthContext";

export const StationContext = createContext();

export const StationProvider = ({ children }) => {
  const { authTokens, user } = useContext(AuthContext);

  const [station, setStation] = useState(null);
  const [stationData, setStationData] = useState({ dashboard: [] });
  const [loading, setLoading] = useState(true);

  const submittingRef = useRef(false);
  const intervalRef = useRef(null);

  // ------------------------------
  // RESET STATE (Prevents bleed)
  // ------------------------------
  const resetState = () => {
    setStation(null);
    setStationData({ dashboard: [] });
    setLoading(false);
  };

  // ------------------------------
  // LOAD STATION + DASHBOARD
  // ------------------------------
  const loadStationAndData = useCallback(async () => {
    if (!authTokens?.access || user?.role !== "station_staff") {
      resetState();
      return;
    }

    try {
      setLoading(true);

      const stationRes = await api.get("api/station/me/");
      const stationObj = stationRes.data ?? null;

      if (!stationObj) {
        resetState();
        return;
      }

      setStation(stationObj);

      const dashboardRes = await api.get("api/station/dashboard/");
      setStationData({ dashboard: dashboardRes.data });

    } catch (err) {
      console.error("Failed to load station data:", err);

      // If backend blocks access (403), wipe state
      if (err.response?.status === 403) {
        resetState();
      }

    } finally {
      setLoading(false);
    }
  }, [authTokens?.access, user?.role]);

  // ------------------------------
  // AUTO REFRESH
  // ------------------------------
  useEffect(() => {
    loadStationAndData();

    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }

    intervalRef.current = setInterval(() => {
      loadStationAndData();
    }, 60000); // 10s polling

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [loadStationAndData]);

  // ------------------------------
  // QR SCAN
  // ------------------------------
  const scanQR = async ({ code, latitude, longitude }) => {
    if (!station) {
      throw new Error("No station assigned.");
    }

    if (submittingRef.current) return;
    submittingRef.current = true;

    const payload = {
      code,
      checked_latitude:
        typeof latitude === "number"
          ? Number(latitude).toFixed(8)
          : null,
      checked_longitude:
        typeof longitude === "number"
          ? Number(longitude).toFixed(8)
          : null,
    };

    try {
      const res = await api.post("api/station/scan/", payload);
      await loadStationAndData();
      return res.data;
    } catch (err) {
      console.error("QR scan failed:", err);

      // Preserve backend message
      throw new Error(
        err.response?.data?.detail ||
        "QR scan failed."
      );
    } finally {
      submittingRef.current = false;
    }
  };

  // ------------------------------
  // SUBMIT CHECKS (Manual Batch)
  // ------------------------------
  const submitChecks = async ({
    guestCheckIds = [],
    guideCheckId = null,
    coords = null,
  }) => {
    if (!station) {
      throw new Error("No station assigned.");
    }

    if (submittingRef.current) return;
    submittingRef.current = true;

    const lat =
      typeof coords?.latitude === "number"
        ? Number(coords.latitude).toFixed(8)
        : null;

    const lng =
      typeof coords?.longitude === "number"
        ? Number(coords.longitude).toFixed(8)
        : null;

    const guestPayload = {
      checked_latitude: lat,
      checked_longitude: lng,
    };

    try {
      // Update guest checks safely
      await Promise.all(
        guestCheckIds.map((id) =>
          api.patch(`api/station/guest-check/${id}/`, guestPayload)
        )
      );

      // Update guide check safely
      if (guideCheckId) {
        await api.patch(
          `api/station/guide-check/${guideCheckId}/`,
          {
            checked_location:
              lat && lng ? `${lat},${lng}` : "",
          }
        );
      }

      await loadStationAndData();
      return true;

    } catch (err) {
      console.error("Failed to submit checks:", err);

      throw new Error(
        err.response?.data?.detail ||
        "Failed to submit checks."
      );
    } finally {
      submittingRef.current = false;
    }
  };

  const canScan =
    Boolean(station) &&
    user?.role === "station_staff" &&
    !loading;

  return (
    <StationContext.Provider
      value={{
        station,
        stationData,
        reload: loadStationAndData,
        scanQR,
        submitChecks,
        loading,
        canScan,
      }}
    >
      {children}
    </StationContext.Provider>
  );
};
