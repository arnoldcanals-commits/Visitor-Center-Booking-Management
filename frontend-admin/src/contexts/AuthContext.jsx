import React, { createContext, useState, useEffect, useRef, useCallback, useMemo } from "react";
import api from "../api";
import { jwtDecode } from "jwt-decode";
import { showGlobalMessage } from "../utils/globalMessages";
import {
  clearAuthTokens,
  getAuthToken,
  storeAuthTokens,
  updateAccessToken,
} from "../utils/authTokens";

export const AuthContext = createContext();

const DEFAULT_ACCENT = "#8b5cf6";

export const AuthProvider = ({ children }) => {
  const [authTokens, setAuthTokens] = useState(() => {
    const access = getAuthToken("access");
    const refresh = getAuthToken("refresh");
    return access && refresh ? { access, refresh } : null;
  });

  const [user, setUser] = useState(null);

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
      const { rememberMe = false, ...loginCredentials } = credentials;
      const response = await api.post("api/site_admin/token/", loginCredentials);
      const data = response.data;
      const decoded = jwtDecode(data.access);

      if (!decoded.is_admin) {
        showGlobalMessage("Incorrect Account Credentials.", "error");
        return false;
      }

      const tokens = { access: data.access, refresh: data.refresh };
      setAuthTokens(tokens);
      setUser(decoded);

      storeAuthTokens(data.access, data.refresh, rememberMe);

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
    clearAuthTokens();
    applyTheme();
  }, [applyTheme]);

  const refreshAccessToken = useCallback(async (tokensOverride) => {
    const tokens = tokensOverride || authTokens;
    if (!tokens?.refresh || isRefreshing.current) return false;

    try {
      isRefreshing.current = true;

      const response = await api.post("api/site_admin/token/refresh/", {
        refresh: tokens.refresh,
      });

      const data = response.data;
      const newTokens = { ...tokens, access: data.access };
      setAuthTokens(newTokens);
      setUser((prev) => ({ ...prev, ...jwtDecode(data.access) }));

      updateAccessToken(data.access);

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
    let active = true;
    const initializeAuth = async () => {
      if (!authTokens) {
        applyTheme();
        setLoading(false);
        return;
      }

      try {
        let tokens = authTokens;
        const decoded = jwtDecode(tokens.access);
        if (decoded.exp <= Date.now() / 1000) {
          const refreshed = await refreshAccessToken(tokens);
          if (!refreshed) return;
          tokens = { ...tokens, access: getAuthToken("access") };
        }
        setAuthTokens(tokens);
        setUser(jwtDecode(tokens.access));
        await fetchProfile(tokens);
      } catch {
        logout();
      } finally {
        if (active) setLoading(false);
      }
    };

    initializeAuth();
    return () => {
      active = false;
    };
    // Initialize only from the stored tokens; refreshAccessToken updates state itself.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!authTokens?.access) return;
    const interval = setInterval(() => {
      try {
        if (jwtDecode(authTokens.access).exp - Date.now() / 1000 < 60) {
          refreshAccessToken();
        }
      } catch {
        logout();
      }
    }, 30000);
    return () => clearInterval(interval);
  }, [authTokens, refreshAccessToken, logout]);

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