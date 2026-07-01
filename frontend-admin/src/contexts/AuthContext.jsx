import React, { createContext, useState, useEffect, useRef } from "react";
import api from "../api";
import { jwtDecode } from "jwt-decode";

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [authTokens, setAuthTokens] = useState(() => {
    const access = localStorage.getItem("access");
    const refresh = localStorage.getItem("refresh");
    return access && refresh ? { access, refresh } : null;
  });

  const [user, setUser] = useState(() => {
    try {
      if (localStorage.getItem("access")) {
        return jwtDecode(localStorage.getItem("access"));
      }
    } catch (e) {
      return null;
    }
    return null;
  });

  const [loading, setLoading] = useState(true);

  // Prevent multiple refresh attempts
  const isRefreshing = useRef(false);

  // --------------------------
  // LOGIN
  // --------------------------
  const login = async (credentials) => {
    try {
      const response = await api.post("api/site_admin/token/", credentials);
      const data = response.data;

      const decoded = jwtDecode(data.access);

      if (!decoded.is_admin) {
        alert("Incorrect Account Credentials.");
        return false;
      }

      setAuthTokens({ access: data.access, refresh: data.refresh });
      setUser(decoded);

      localStorage.setItem("access", data.access);
      localStorage.setItem("refresh", data.refresh);

      return true;
    } catch (err) {
      console.error("Login error:", err);
      return false;
    }
  };

  // --------------------------
  // LOGOUT
  // --------------------------
  const logout = () => {
    setAuthTokens(null);
    setUser(null);
    localStorage.removeItem("access");
    localStorage.removeItem("refresh");
  };

  // --------------------------
  // REFRESH TOKEN
  // --------------------------
  const refreshAccessToken = async () => {
    if (!authTokens?.refresh || isRefreshing.current) return false;

    try {
      isRefreshing.current = true;

      const response = await api.post("api/site_admin/token/refresh/", {
        refresh: authTokens.refresh,
      });

      const data = response.data;

      const newTokens = { ...authTokens, access: data.access };
      setAuthTokens(newTokens);
      setUser(jwtDecode(data.access));

      localStorage.setItem("access", data.access);

      isRefreshing.current = false;
      return true;
    } catch (err) {
      console.error("Refresh failed:", err);
      isRefreshing.current = false;
      logout();
      return false;
    }
  };

  // --------------------------
  // AUTO REFRESH LOOP
  // --------------------------
  useEffect(() => {
    const interval = setInterval(() => {
      if (!authTokens) return;

      try {
        const decoded = jwtDecode(authTokens.access);
        const now = Date.now() / 1000;

        if (decoded.exp - now < 60) {
          refreshAccessToken();
        }
      } catch (e) {
        logout();
      }
    }, 30000);

    setLoading(false);
    return () => clearInterval(interval);
  }, [authTokens]);

  return (
    <AuthContext.Provider
      value={{ user, authTokens, login, logout, refreshAccessToken }}
    >
      {!loading && children}
    </AuthContext.Provider>
  );
};
