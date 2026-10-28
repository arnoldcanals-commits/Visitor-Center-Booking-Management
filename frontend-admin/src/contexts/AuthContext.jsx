import React, { createContext, useState, useEffect, useRef, useCallback, useMemo } from "react";
import api from "../api";
import { jwtDecode } from "jwt-decode";

export const AuthContext = createContext();

const DEFAULT_ACCENT = "#8b5cf6";

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
  const isRefreshing = useRef(false);

  const applyTheme = useCallback(({ themeColor, darkMode } = {}) => {
    document.documentElement.style.setProperty("--accent", themeColor || DEFAULT_ACCENT);
    document.documentElement.classList.toggle("dark", !!darkMode);
  }, []);

  const updateDarkMode = useCallback(async (darkMode) => {
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
  }, [authTokens, applyTheme]);

  const updateThemeColor = useCallback(async (themeColor) => {
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
  }, [authTokens, applyTheme]);

  const fetchProfile = useCallback(async (tokens) => {
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
      applyTheme();
    }
  }, [applyTheme]);

  const login = useCallback(async (credentials) => {
    try {
      const response = await api.post("api/site_admin/token/", credentials);
      const data = response.data;
      const decoded = jwtDecode(data.access);

      if (!decoded.is_admin) {
        alert("Incorrect Account Credentials.");
        return false;
      }

      const tokens = { access: data.access, refresh: data.refresh };
      setAuthTokens(tokens);
      setUser(decoded);

      localStorage.setItem("access", data.access);
      localStorage.setItem("refresh", data.refresh);

      await fetchProfile(tokens);

      return true;
    } catch (err) {
      console.error("Login error:", err);
      return false;
    }
  }, [fetchProfile]);

  const logout = useCallback(() => {
    setAuthTokens(null);
    setUser(null);
    localStorage.removeItem("access");
    localStorage.removeItem("refresh");
    applyTheme();
  }, [applyTheme]);

  const refreshAccessToken = useCallback(async () => {
    if (!authTokens?.refresh || isRefreshing.current) return false;

    try {
      isRefreshing.current = true;

      const response = await api.post("api/site_admin/token/refresh/", {
        refresh: authTokens.refresh,
      });

      const data = response.data;
      const newTokens = { ...authTokens, access: data.access };
      setAuthTokens(newTokens);
      setUser((prev) => ({ ...prev, ...jwtDecode(data.access) }));

      localStorage.setItem("access", data.access);

      isRefreshing.current = false;
      return true;
    } catch (err) {
      console.error("Refresh failed:", err);
      isRefreshing.current = false;
      logout();
      return false;
    }
  }, [authTokens, logout]);

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
  }, [authTokens, refreshAccessToken, logout]);

  useEffect(() => {
    if (authTokens?.access) {
      fetchProfile(authTokens);
    } else {
      applyTheme();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const value = useMemo(
  () => ({ user, authTokens, authLoading: loading, login, logout, refreshAccessToken, fetchProfile, updateDarkMode, updateThemeColor }),
  [user, authTokens, loading, login, logout, refreshAccessToken, fetchProfile, updateDarkMode, updateThemeColor]
);

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
};