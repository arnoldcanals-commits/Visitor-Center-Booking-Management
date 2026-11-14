import React, { createContext, useState, useEffect } from "react";
import api from "../api";

export const AuthContext = createContext();

const DEFAULT_ACCENT = "#3b82f6";

const applyTheme = ({ themeColor, darkMode } = {}) => {
  document.documentElement.style.setProperty("--accent", themeColor || DEFAULT_ACCENT);
  document.documentElement.classList.toggle("dark", !!darkMode);
};

export default function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(
    !!localStorage.getItem("access")
  );
  const [theme, setTheme] = useState({ darkMode: false, themeColor: DEFAULT_ACCENT });
  const [loading, setLoading] = useState(true);

  // --- Fetch user (auth) ---
  const fetchUser = async () => {
    const access = localStorage.getItem("access");
    if (!access) {
      setIsAuthenticated(false);
      setUser(null);
      return;
    }
    try {
      const { data } = await api.get("/api/user/me/");
      setUser(data);
      setIsAuthenticated(true);
    } catch (err) {
      setIsAuthenticated(false);
      setUser(null);
    }
  };

  // --- Fetch profile (theme prefs) ---
  const fetchTheme = async () => {
    const access = localStorage.getItem("access");
    if (!access) {
      applyTheme(); // not logged in — defaults
      return;
    }
    try {
      const { data } = await api.get("/api/user/profile/");
      setTheme(data);
      applyTheme(data);
    } catch (err) {
      applyTheme(); // fail silently, fall back to defaults
    }
  };

  // --- Load everything on mount ---
  useEffect(() => {
    const init = async () => {
      await Promise.all([fetchUser(), fetchTheme()]);
      setLoading(false);
    };
    init();
  }, []);

  // --- Update theme (e.g. from a settings toggle) ---
  const updateTheme = async (partial) => {
    try {
      const { data } = await api.patch("/api/user/profile/", partial);
      setTheme(data);
      applyTheme(data);
    } catch (err) {
      console.error("Failed to update theme:", err);
    }
  };

  // --- Login success hook (called by AuthPanel) ---
  const onLoginSuccess = async () => {
    await Promise.all([fetchUser(), fetchTheme()]);
  };

  // --- Logout ---
  const logout = () => {
    localStorage.removeItem("access");
    localStorage.removeItem("refresh");
    setUser(null);
    setIsAuthenticated(false);
    setTheme({ darkMode: false, themeColor: DEFAULT_ACCENT });
    applyTheme(); // reset to defaults
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated,
        theme,
        updateTheme,
        onLoginSuccess,
        logout,
      }}
    >
      {!loading && children}
    </AuthContext.Provider>
  );
}