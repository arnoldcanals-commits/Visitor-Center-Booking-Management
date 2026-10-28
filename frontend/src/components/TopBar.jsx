import React, { useState, useEffect, useContext } from "react";
import { useNavigate, useLocation } from "react-router-dom";

import { Sun, Moon } from "lucide-react";
import AuthPanel from "./AuthPanel";
import SearchBar from "./SearchBar";
import api from "../api";
import NotificationBell from "./Notifications";
import UserMenu from "./usermenu";
import ProfileModal from "./UserInfo";
import { AuthContext } from "./Auth";

export default function TopBar({ search: propSearch, setSearch: propSetSearch }) {
  const navigate = useNavigate();
  const location = useLocation();

  const isHome = location.pathname === "/";

  // --- State for other pages if props not passed ---
  const [internalSearch, setInternalSearch] = useState("");
  const search = isHome ? propSearch ?? "" : internalSearch;
  const setSearch = isHome ? propSetSearch ?? (() => {}) : setInternalSearch;

  // --- Auth + theme come from context ---
  const { user, isAuthenticated, theme, updateTheme, logout, onLoginSuccess } = useContext(AuthContext);

  const [authPanelOpen, setAuthPanelOpen] = useState(false);
  const [authMode, setAuthMode] = useState("login");
  const [menuOpen, setMenuOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);

  const openAuth = (mode = "login") => {
    setAuthMode(mode);
    setAuthPanelOpen(true);
  };

  const openProfile = () => {
    setMenuOpen(false); // close the mobile menu so it isn't sitting behind the modal
    setProfileOpen(true);
  };

  const toggleDarkMode = () => {
    updateTheme({ darkMode: !theme.darkMode });
  };

  // --- Search submit ---
  const handleSearchSubmit = (e) => {
    e.preventDefault();
    const trimmed = (search || "").trim();

    if (isHome) return; // Home: live filtering

    navigate(`/?query=${encodeURIComponent(trimmed)}`);
  };

  // web info
  const [config, setConfig] = useState(null);
  useEffect(() => {
    const fetchConfig = async () => {
      try {
        const res = await api.get("/api/site-info/");
        setConfig(res.data);
      } catch (err) {
        console.error("Footer config error:", err);
      }
    };
    fetchConfig();
  }, []);

  return (
    <header className="sticky top-0 z-50 bg-white dark:bg-gray-900 shadow-md min-h-[64px] border-b border-[var(--accent)] pb-2 pt-2">
      {authPanelOpen && (
        <AuthPanel
          defaultMode={authMode}
          closePanel={() => setAuthPanelOpen(false)}
          onLoginSuccess={async () => {
            await onLoginSuccess();
            setAuthPanelOpen(false);
          }}
        />
      )}

      <ProfileModal open={profileOpen} onClose={() => setProfileOpen(false)} />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 ">
        <div className="flex justify-between items-center h-16">
          

          {/* Desktop Search */}
          <div className="hidden md:flex justify-center items-center w-full mr-1">
            <SearchBar
              search={search}
              setSearch={setSearch}
              onSearchSubmit={handleSearchSubmit}
              showButton={!isHome}
            />
          </div>

          {/* Auth Buttons */}
          <div className="hidden md:flex items-center space-x-4">
            {/* Dark mode slide toggle */}
{isAuthenticated && (
  <button
    type="button"
    role="switch"
    aria-checked={theme.darkMode}
    aria-label="Toggle dark mode"
    onClick={toggleDarkMode}
    className="relative inline-flex items-center h-8 w-16 rounded-full transition-colors duration-300"
    style={{ backgroundColor: theme.darkMode ? "var(--accent)" : "#d1d5db" }}
  >
    <span
      className="inline-flex items-center justify-center h-6 w-6 rounded-full bg-white shadow-md transform transition-transform duration-300"
      style={{ transform: theme.darkMode ? "translateX(34px)" : "translateX(4px)" }}
    >
      {theme.darkMode ? (
        <Moon size={14} className="text-gray-700" />
      ) : (
        <Sun size={14} className="text-amber-500" />
      )}
    </span>
  </button>
)}

            {!isAuthenticated ? (
              <>
                <button
                  type="button"
                  onClick={() => openAuth("register")}
                  className="w-20 rounded-full font-semibold text-xs text-gray-800 dark:text-gray-200 hover:text-white hover:scale-105 p-2 transition transform hover:[background-color:var(--accent)]"
                >
                  Register
                </button>
                <button
                  type="button"
                  onClick={() => openAuth("login")}
                  className="w-20 rounded-full font-semibold text-xs text-white hover:scale-105 p-2 transition transform"
                  style={{ backgroundColor: "var(--accent)" }}
                >
                  Login
                </button>
              </>
            ) : (
              <>
                <NotificationBell />
                <UserMenu user={user} logout={logout} onOpenProfile={openProfile} />
              </>
            )}
          </div>

          {/* Mobile Hamburger */}
<div className="md:hidden flex items-center gap-2 ml-auto">
            {isAuthenticated && (
  <button
    type="button"
    role="switch"
    aria-checked={theme.darkMode}
    aria-label="Toggle dark mode"
    onClick={toggleDarkMode}
    className="relative inline-flex items-center h-7 w-14 rounded-full transition-colors duration-300"
    style={{ backgroundColor: theme.darkMode ? "var(--accent)" : "#d1d5db" }}
  >
    <span
      className="inline-flex items-center justify-center h-5 w-6 rounded-full bg-white shadow-md transform transition-transform duration-300"
      style={{ transform: theme.darkMode ? "translateX(30px)" : "translateX(3px)" }}
    >
      {theme.darkMode ? (
        <Moon size={12} className="text-gray-700" />
      ) : (
        <Sun size={12} className="text-amber-500" />
      )}
    </span>
  </button>
)}

            <NotificationBell />
            <button
              type="button"
              aria-label="Toggle menu"
              aria-expanded={menuOpen}
              className="text-gray-700 dark:text-gray-200 hover:text-gray-900 focus:outline-none transition transform hover:scale-110"
              onClick={() => setMenuOpen(!menuOpen)}
            >
              <svg className="h-7 w-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d={menuOpen ? "M6 18L18 6M6 6l12 12" : "M4 6h16M4 12h16M4 18h16"}
                />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      {menuOpen && (
        <div className="md:hidden px-4 pb-4 space-y-3 transition-all duration-200 ease-out">
          <SearchBar
            search={search}
            setSearch={setSearch}
            onSearchSubmit={handleSearchSubmit}
            showButton={!isHome}
          />
          {!isAuthenticated ? (
            <>
              <button
                type="button"
                onClick={() => openAuth("register")}
                className="block w-full py-2 rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200 font-semibold text-sm hover:bg-gray-200 dark:hover:bg-gray-700 transition"
              >
                Register
              </button>
              <button
                type="button"
                onClick={() => openAuth("login")}
                className="block w-full py-2 rounded-lg text-white font-semibold text-sm transition"
                style={{ backgroundColor: "var(--accent)" }}
              >
                Login
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={openProfile}
                className="block w-full py-2 rounded-lg bg-amber-400 text-white font-semibold text-sm hover:bg-amber-500 transition text-center"
              >
                Profile
              </button>
              <button
                type="button"
                onClick={logout}
                className="block w-full py-2 rounded-lg text-white font-semibold text-sm hover:bg-red-400 transition"
                style={{ backgroundColor: "var(--accent)" }}
              >
                Logout
              </button>
            </>
          )}
        </div>
      )}

      
    </header>
  );
}