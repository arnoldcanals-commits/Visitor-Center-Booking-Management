import React, { createContext, useState, useEffect, useRef } from "react";
import api from "../api";
import { jwtDecode } from "jwt-decode"; // ✅ correct modern import

export const AuthContext = createContext();

const STAFF_ROLES = ["tour_guide", "staff", "station_staff", "admin"];

export const AuthProvider = ({ children }) => {
  const [authTokens, setAuthTokens] = useState(() => {
    const access = localStorage.getItem("access");
    const refresh = localStorage.getItem("refresh");
    return access && refresh ? { access, refresh } : null;
  });

  const [user, setUser] = useState(() => {
    try {
      const access = localStorage.getItem("access");
      return access ? jwtDecode(access) : null;
    } catch (err) {
      console.error("Failed to decode token:", err);
      return null;
    }
  });

  const [loading, setLoading] = useState(true);
  const isRefreshing = useRef(false);

  // ================= LOGIN =================
  const login = async (credentials) => {
    try {
      const response = await api.post("api/staff/token/", credentials);
      const data = response.data;

      // NOTE: your backend includes role in JSON response
      if (!STAFF_ROLES.includes(data.role)) {
        alert("Unauthorized account.");
        return null;
      }

      setAuthTokens({ access: data.access, refresh: data.refresh });
      setUser({ ...jwtDecode(data.access), ...data }); // attach decoded info + extra fields

      localStorage.setItem("access", data.access);
      localStorage.setItem("refresh", data.refresh);

      return data;
    } catch (err) {
      console.error("Login error:", err);
      return null;
    }
  };

  // ================= LOGOUT =================
  const logout = () => {
    setAuthTokens(null);
    setUser(null);
    localStorage.removeItem("access");
    localStorage.removeItem("refresh");
  };

  // ================= REFRESH TOKEN =================
  const refreshAccessToken = async () => {
    if (!authTokens?.refresh || isRefreshing.current) return false;

    try {
      isRefreshing.current = true;

      const response = await api.post("api/staff/token/refresh/", {
        refresh: authTokens.refresh,
      });

      const data = response.data;
      const decoded = jwtDecode(data.access);

      setAuthTokens({ ...authTokens, access: data.access });
      setUser(decoded);

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

  // ================= AUTO REFRESH =================
  useEffect(() => {
    const checkToken = async () => {
      if (!authTokens?.access) return;

      try {
        const decoded = jwtDecode(authTokens.access);
        const now = Date.now() / 1000;
        if (decoded.exp - now < 60) {
          await refreshAccessToken();
        }
      } catch {
        logout();
      }
    };

    const interval = setInterval(checkToken, 30000);

    setLoading(false);
    return () => clearInterval(interval);
  }, [authTokens]);

  const isTourGuide = user?.role === "tour_guide";
  const isBookingStaff = user?.role === "staff";
  const isStationStaff = user?.role === "station_staff";
  const isAdmin = user?.role === "admin";

  return (
    <AuthContext.Provider
      value={{
        user,
        authTokens,
        login,
        logout,
        refreshAccessToken,
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
