import React, { createContext, useState, useEffect, useRef } from "react";
import api from "../api";
import { jwtDecode } from "jwt-decode";

export const AuthContext = createContext();

const STAFF_ROLES = ["tour_guide", "staff", "station_staff", "admin"];
const DEFAULT_ACCENT = "#8b5cf6";

// Returns true/false if we can determine expiry, or null if the token
// isn't a decodable JWT / has no exp claim (treat as "unknown").
const getExpiryStatus = (token) => {
  if (!token) return null;
  try {
    const { exp } = jwtDecode(token);
    if (!exp) return null;
    return exp * 1000 < Date.now();
  } catch {
    return null;
  }
};

export const AuthProvider = ({ children }) => {
  const [authTokens, setAuthTokens] = useState(null);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const isRefreshing = useRef(false);

  // ================= THEME =================
  const applyTheme = ({ themeColor, darkMode } = {}) => {
    document.documentElement.style.setProperty("--accent", themeColor || DEFAULT_ACCENT);
    document.documentElement.classList.toggle("dark", !!darkMode);
  };

  // ================= LOGOUT =================
  const logout = () => {
    setAuthTokens(null);
    setUser(null);
    localStorage.removeItem("access");
    localStorage.removeItem("refresh");
    applyTheme(); // reset to default accent/light mode
  };

  // ================= FETCH PROFILE (themeColor, darkMode, etc.) =================
  const fetchProfile = async (tokens) => {
    if (!tokens?.access) return;
    try {
      const res = await api.get("api/user/profile/", {
        headers: { Authorization: `Bearer ${tokens.access}` },
      });
      const profile = res.data;

      setUser((prev) => ({ ...prev, ...profile }));
      applyTheme(profile);
    } catch (err) {
      console.error("Failed to fetch profile:", err);
      applyTheme(); // fall back to defaults if profile fetch fails
    }
  };

  // ================= LOGIN =================
  const login = async (credentials) => {
    try {
      const response = await api.post("api/staff/token/", credentials);
      const data = response.data;

      if (!STAFF_ROLES.includes(data.role)) {
        alert("Unauthorized account.");
        return null;
      }

      const tokens = { access: data.access, refresh: data.refresh };
      setAuthTokens(tokens);
      setUser({ ...jwtDecode(data.access), ...data });

      localStorage.setItem("access", data.access);
      localStorage.setItem("refresh", data.refresh);

      await fetchProfile(tokens);

      return data;
    } catch (err) {
      console.error("Login error:", err);
      return null;
    }
  };

  // ================= REFRESH TOKEN =================
  // Accepts an explicit tokens object so it can be used during init,
  // before `authTokens` state has been set.
  const refreshAccessToken = async (tokensOverride) => {
    const tokens = tokensOverride || authTokens;
    if (!tokens?.refresh || isRefreshing.current) return false;

    try {
      isRefreshing.current = true;

      const response = await api.post("api/staff/token/refresh/", {
        refresh: tokens.refresh,
      });

      const data = response.data;
      const decoded = jwtDecode(data.access);

      const newTokens = { access: data.access, refresh: tokens.refresh };
      setAuthTokens(newTokens);
      setUser((prev) => ({ ...prev, ...decoded }));
      localStorage.setItem("access", data.access);

      isRefreshing.current = false;
      return true;
    } catch (err) {
      console.error("Token refresh failed:", err);
      isRefreshing.current = false;
      logout();
      return false;
    }
  };

  // ================= UPDATE DARK MODE =================
  const updateDarkMode = async (darkMode) => {
    try {
      const res = await api.patch(
        "api/user/profile/",
        { darkMode },
        { headers: { Authorization: `Bearer ${authTokens.access}` } }
      );
      setUser((prev) => ({ ...prev, ...res.data }));
      applyTheme(res.data);
    } catch (err) {
      console.error("Failed to update dark mode:", err);
    }
  };

  // ================= UPDATE THEME COLOR =================
  const updateThemeColor = async (themeColor) => {
    try {
      const res = await api.patch(
        "api/user/profile/",
        { themeColor },
        { headers: { Authorization: `Bearer ${authTokens.access}` } }
      );
      setUser((prev) => ({ ...prev, ...res.data }));
      applyTheme(res.data);
    } catch (err) {
      console.error("Failed to update theme color:", err);
    }
  };

  // ================= INITIAL VALIDATION (runs once on mount) =================
  useEffect(() => {
    const init = async () => {
      const access = localStorage.getItem("access");
      const refresh = localStorage.getItem("refresh");

      // A: not logged in at all
      if (!access || !refresh) {
        logout();
        setLoading(false);
        return;
      }

      const refreshExpired = getExpiryStatus(refresh);
      // B: refresh token is definitively expired -> nothing we can do, log out
      if (refreshExpired === true) {
        logout();
        setLoading(false);
        return;
      }

      const accessExpired = getExpiryStatus(access);
      const tokens = { access, refresh };

      if (accessExpired === false) {
        // Access token still valid, trust it.
        setAuthTokens(tokens);
        setUser(jwtDecode(access));
        await fetchProfile(tokens);
        setLoading(false);
        return;
      }

      // Access token expired, missing exp, or corrupt -> try to refresh.
      // If refresh itself fails (invalid/expired on the server), refreshAccessToken
      // calls logout() for us.
      const ok = await refreshAccessToken(tokens);
      if (ok) {
        await fetchProfile({ access: localStorage.getItem("access"), refresh });
      }
      setLoading(false);
    };

    init();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ================= PERIODIC REFRESH (keeps session alive while active) =================
  useEffect(() => {
    if (!authTokens?.access) return;

    const checkToken = async () => {
      const status = getExpiryStatus(authTokens.access);
      if (status === null) {
        // Corrupt/undecodable access token -> can't trust it.
        logout();
        return;
      }
      const decoded = jwtDecode(authTokens.access);
      const now = Date.now() / 1000;
      if (decoded.exp - now < 60) {
        await refreshAccessToken();
      }
    };

    const interval = setInterval(checkToken, 30000);
    return () => clearInterval(interval);
  }, [authTokens]);

  const isAuthenticated = !!user && !!authTokens?.access;

  const isTourGuide = user?.role === "tour_guide";
  const isBookingStaff = user?.role === "staff";
  const isStationStaff = user?.role === "station_staff";
  const isAdmin = user?.role === "admin";

  return (
    <AuthContext.Provider
      value={{
        user,
        authTokens,
        isAuthenticated,
        login,
        logout,
        refreshAccessToken,
        fetchProfile,
        updateDarkMode,
        updateThemeColor,
        isTourGuide,
        isBookingStaff,
        isStationStaff,
        isAdmin,
      }}
    >
      {!loading && children}
    </AuthContext.Provider>
  );
};