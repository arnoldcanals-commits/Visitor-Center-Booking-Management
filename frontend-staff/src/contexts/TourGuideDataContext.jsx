import React, { createContext, useEffect, useState, useContext } from "react";
import api from "../api";
import { AuthContext } from "./AuthContext";

export const TourGuideDataContext = createContext();

export const TourGuideDataProvider = ({ children }) => {
  const { authTokens } = useContext(AuthContext);

  const [guideData, setGuideData] = useState({
    profile: null,
    bookings: [],
    eventsSummary: [],
    reviews: [],
  });

  const [loading, setLoading] = useState(true);
  const [eventDetailsCache, setEventDetailsCache] = useState({});

  // --------------------------------------------------
  // LOAD ALL GUIDE DATA
  // --------------------------------------------------
  const loadGuideData = async () => {
    if (!authTokens?.access) {
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const [profileRes, bookingsRes, eventsRes, reviewsRes] =
        await Promise.all([
          api.get("api/guide/profile/"),
          api.get("api/guide/bookings/"),
          api.get("api/guide/events/"), // this now returns summary
          api.get("api/guide/reviews/"),
        ]);

      const data = {
        profile: profileRes.data,
        bookings: bookingsRes.data ?? [],
        eventsSummary: eventsRes.data ?? [],
        reviews: reviewsRes.data ?? [],
      };

      setGuideData((prev) =>
        JSON.stringify(prev) !== JSON.stringify(data) ? data : prev
      );
    } catch (error) {
      console.error("Failed to load tour guide data:", error);
    } finally {
      setLoading(false);
    }
  };

  // --------------------------------------------------
  // GET EVENT DETAIL (FULL)
  // --------------------------------------------------
  const getEventDetail = async (id, forceReload = false) => {
    if (!authTokens?.access) return null;

    if (!forceReload && eventDetailsCache[id]) {
      return eventDetailsCache[id];
    }

    try {
      const res = await api.get(`api/guide/events/${id}/`, {
        headers: { Authorization: `Bearer ${authTokens.access}` },
      });

      setEventDetailsCache((prev) => ({ ...prev, [id]: res.data }));
      return res.data;
    } catch (error) {
      console.error(`Failed to load event ${id}:`, error);
      return null;
    }
  };

  // --------------------------------------------------
  // UPDATE STATUS
  // --------------------------------------------------
  const updateStatus = async (status) => {
    if (!authTokens?.access) return false;

    try {
      await api.patch("api/guide/profile/status/", { status });
      await loadGuideData();
      return true;
    } catch (error) {
      console.error("Failed to update guide status:", error);
      return false;
    }
  };

  // --------------------------------------------------
  // INITIAL LOAD + POLLING
  // --------------------------------------------------
  useEffect(() => {
    loadGuideData();
    const interval = setInterval(loadGuideData, 60000); 
    return () => clearInterval(interval);
  }, [authTokens]);

  return (
    <TourGuideDataContext.Provider
      value={{
        guideData,
        reload: loadGuideData,
        updateStatus,
        loading,
        getEventDetail,
      }}
    >
      {children}
    </TourGuideDataContext.Provider>
  );
};
