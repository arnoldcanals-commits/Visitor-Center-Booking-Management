import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import api from "../api";
import { AuthContext } from "./AuthContext";

export const DriverDataContext = createContext();

const POLL_INTERVAL_MS = 60000;
const EMPTY_DATA = { profile: null, trips: [] };

// Transportation.status is nullable on the backend: "no status" == Scheduled.
const isPreDeparture = (status) => !status || status === "Scheduled";

// Backend errors come back as { detail: "..." } (or DRF field errors).
const extractError = (error) => {
  const data = error?.response?.data;
  if (!data) return error?.message || "Something went wrong.";
  if (typeof data === "string") return data;
  const first = data.detail ?? Object.values(data)[0];
  return Array.isArray(first) ? first.join(" ") : String(first);
};

export const DriverDataProvider = ({ children }) => {
  const { authTokens, user } = useContext(AuthContext);
  const isDriverUser = user?.role === "driver";
  const canLoad = !!authTokens?.access && isDriverUser;

  const [driverData, setDriverData] = useState(EMPTY_DATA);
  const [loading, setLoading] = useState(true);
  const [tripDetailsCache, setTripDetailsCache] = useState({});

  // Mirror of the cache so the polling closure never reads stale state.
  const cacheRef = useRef({});

  const setCache = (next) => {
    cacheRef.current = next;
    setTripDetailsCache(next);
  };
  const storeDetail = (id, detail) => setCache({ ...cacheRef.current, [id]: detail });
  const evictDetail = (id) => {
    const { [id]: _removed, ...rest } = cacheRef.current;
    setCache(rest);
  };

  // --------------------------------------------------
  // LOAD PROFILE + ASSIGNED TRIPS
  // --------------------------------------------------
  const refreshCachedDetails = async () => {
    const ids = Object.keys(cacheRef.current);
    if (!ids.length) return;

    const results = await Promise.allSettled(
      ids.map((id) => api.get(`api/driver/trips/${id}/`))
    );

    const next = { ...cacheRef.current };
    results.forEach((result, i) => {
      if (result.status === "fulfilled") {
        next[ids[i]] = result.value.data;
      } else if (result.reason?.response?.status === 404) {
        delete next[ids[i]]; // reassigned / no longer ours
      }
    });
    setCache(next);
  };

  const loadDriverData = async ({ silent = false, refreshDetails = true } = {}) => {
    if (!canLoad) {
      setLoading(false);
      return;
    }

    if (!silent) setLoading(true);
    try {
      const [profileRes, tripsRes] = await Promise.all([
        api.get("api/driver/profile/"),
        api.get("api/driver/trips/"),
      ]);

      const data = {
        profile: profileRes.data,
        trips: tripsRes.data ?? [],
      };

      setDriverData((prev) =>
        JSON.stringify(prev) !== JSON.stringify(data) ? data : prev
      );

      if (refreshDetails) await refreshCachedDetails();
    } catch (error) {
      console.error("Failed to load driver data:", error);
    } finally {
      setLoading(false);
    }
  };

  // --------------------------------------------------
  // GET TRIP DETAIL (FULL: stops + passengers)
  // --------------------------------------------------
  const getTripDetail = async (id, forceReload = false) => {
    if (!canLoad) return null;

    if (!forceReload && cacheRef.current[id]) {
      return cacheRef.current[id];
    }

    try {
      const res = await api.get(`api/driver/trips/${id}/`);
      storeDetail(id, res.data);
      return res.data;
    } catch (error) {
      console.error(`Failed to load trip ${id}:`, error);
      return null;
    }
  };

  // --------------------------------------------------
  // ACTIONS
  // Every action resolves to { success, data?, error?, result? }.
  //  - data   : the refreshed trip detail (also written to the cache)
  //  - result : extra info from the server (bulk alight: { completed, still_reserved })
  //  - error  : a message safe to show to the driver
  // --------------------------------------------------
  const post = async (path, body = {}) => {
    if (!canLoad) {
      return { success: false, error: "You must be signed in as a driver." };
    }
    try {
      const res = await api.post(`api/driver/trips/${path}`, body);
      return { success: true, data: res.data };
    } catch (error) {
      console.error(`Driver action failed (${path}):`, error);
      // `code` lets the UI react to specific cases (e.g. "early_departure" -> ask to confirm).
      return {
        success: false,
        error: extractError(error),
        code: error?.response?.data?.code,
      };
    }
  };

  // POST an action that returns the updated trip detail, then sync caches.
  const tripAction = async (tripId, subPath, body) => {
    const outcome = await post(`${tripId}/${subPath}`, body);
    if (!outcome.success) return outcome;

    const { action_result: result, ...detail } = outcome.data;
    storeDetail(tripId, detail);
    await loadDriverData({ silent: true, refreshDetails: false });
    return { success: true, data: detail, result };
  };

  // ---- trip level ----
  const acceptTrip = (tripId) => tripAction(tripId, "accept/");

  const declineTrip = async (tripId, reason = "") => {
    const outcome = await post(`${tripId}/decline/`, { reason });
    if (!outcome.success) return outcome;

    evictDetail(tripId);
    await loadDriverData({ silent: true, refreshDetails: false });
    return { success: true };
  };

  const reportDelay = (tripId, notes) => tripAction(tripId, "delay/", { notes });

  // ---- stop level ----
  const arriveAtStop = (tripId, stopId, notes = "") =>
    tripAction(tripId, `stops/${stopId}/arrive/`, { notes });

  // confirmEarly: the driver confirmed leaving more than the allowed window before schedule.
  const departFromStop = (tripId, stopId, notes = "", confirmEarly = false) =>
    tripAction(tripId, `stops/${stopId}/depart/`, { notes, confirm_early: confirmEarly });

  // Bulk: everyone checked in who is due to get off at this stop.
  const alightAtStop = (tripId, stopId) =>
    tripAction(tripId, `stops/${stopId}/alight/`);

  // Walk-in (no reservation) boarding at the stop the vehicle is at; created already checked in.
  const addWalkInPassenger = (tripId, stopId, { name, contactNumber = "", alightingStopId = "" }) =>
    tripAction(tripId, `stops/${stopId}/walk-in/`, {
      name,
      contact_number: contactNumber,
      alighting_stop: alightingStopId, // "" = rides to the final stop
    });

  // ---- passenger level ----
  const checkInPassenger = (tripId, passengerId) =>
    tripAction(tripId, `passengers/${passengerId}/check-in/`);

  const markNoShow = (tripId, passengerId) =>
    tripAction(tripId, `passengers/${passengerId}/no-show/`);

  // Individual / unplanned early get-off at a stop the vehicle has reached.
  const alightPassenger = (tripId, passengerId, stopId, reason = "") =>
    tripAction(tripId, `passengers/${passengerId}/alight/`, {
      stop: stopId,
      reason,
    });

  // --------------------------------------------------
  // DERIVED LISTS
  // --------------------------------------------------
  const { pendingTrips, upcomingTrips, activeTrips, pastTrips } = useMemo(() => {
    const trips = driverData.trips;
    return {
      // assigned to me, waiting for me to accept
      pendingTrips: trips.filter((t) => isPreDeparture(t.status) && !t.is_accepted),
      // accepted, not yet departed
      upcomingTrips: trips.filter((t) => isPreDeparture(t.status) && t.is_accepted),
      // on the road
      activeTrips: trips.filter((t) => t.status === "Departed" || t.status === "Delayed"),
      // finished or cancelled
      pastTrips: trips.filter((t) => t.status === "Completed" || t.status === "Cancelled"),
    };
  }, [driverData.trips]);

  // --------------------------------------------------
  // INITIAL LOAD + POLLING (+ reset when signed out / not a driver)
  // --------------------------------------------------
  useEffect(() => {
    if (!canLoad) {
      setDriverData(EMPTY_DATA);
      setCache({});
      setLoading(false);
      return;
    }

    loadDriverData();
    const interval = setInterval(() => loadDriverData({ silent: true }), POLL_INTERVAL_MS);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authTokens?.access, isDriverUser]);

  return (
    <DriverDataContext.Provider
      value={{
        driverData,
        profile: driverData.profile,
        trips: driverData.trips,
        pendingTrips,
        upcomingTrips,
        activeTrips,
        pastTrips,
        tripDetailsCache,
        loading,
        reload: () => loadDriverData(),
        getTripDetail,
        acceptTrip,
        declineTrip,
        reportDelay,
        arriveAtStop,
        departFromStop,
        alightAtStop,
        addWalkInPassenger,
        checkInPassenger,
        markNoShow,
        alightPassenger,
      }}
    >
      {children}
    </DriverDataContext.Provider>
  );
};