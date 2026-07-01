import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import AuthPanel from "./AuthPanel";
import SearchBar from "./SearchBar";
import api from "../api";
import NotificationBell from "./Notifications";
import UserMenu from "./usermenu";
export default function TopBar({ search: propSearch, setSearch: propSetSearch }) {
  const navigate = useNavigate();
  const location = useLocation();

  const isHome = location.pathname === "/";

  // --- State for other pages if props not passed ---
  const [internalSearch, setInternalSearch] = useState("");
  const search = isHome ? propSearch ?? "" : internalSearch;
  const setSearch = isHome ? propSetSearch ?? (() => {}) : setInternalSearch;

  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState(null);
  const [authPanelOpen, setAuthPanelOpen] = useState(false);
  const [authMode, setAuthMode] = useState("login");
  const [menuOpen, setMenuOpen] = useState(false);

  // --- Fetch current user ---
  useEffect(() => {
    const fetchUser = async () => {
      const access = localStorage.getItem("access");
      const refresh = localStorage.getItem("refresh");

      if (!access && !refresh) {
        setIsAuthenticated(false);
        return;
      }

      try {
        const res = await api.get("/api/user/me/");
        setUser(res.data);
        setIsAuthenticated(true);
      } catch (err) {
        console.error("Failed to fetch user:", err);
        setIsAuthenticated(false);
      }
    };
    fetchUser();
  }, []);

  const openAuth = (mode = "login") => {
    setAuthMode(mode);
    setAuthPanelOpen(true);
  };

  const handleLoginSuccess = async () => {
    try {
      const res = await api.get("/api/user/me/");
      setUser(res.data);
      setIsAuthenticated(true);
    } catch (err) {
      console.error(err);
    }
    setAuthPanelOpen(false);
  };

  const logout = () => {
    localStorage.removeItem("access");
    localStorage.removeItem("refresh");
    setIsAuthenticated(false);
    setUser(null);
    window.location.reload();
  };

  // --- Search submit ---
  const handleSearchSubmit = (e) => {
    e.preventDefault();
    const trimmed = (search || "").trim();

    if (isHome) return; // Home: live filtering

    // Non-home: redirect to home with query
    navigate(`/?query=${encodeURIComponent(trimmed)}`);
  };

  return (
    <header className="sticky top-0 z-50 bg-white shadow-md min-h-[64px]">
      {authPanelOpen && (
        <AuthPanel
          defaultMode={authMode}
          closePanel={() => setAuthPanelOpen(false)}
          onLoginSuccess={handleLoginSuccess}
        />
      )}

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <div className="flex items-center gap-3 flex-shrink-0">
            <a href="/">
              <img className="h-8 w-auto" src="/VCMS.ico" alt="Logo" />
            </a>
            <h1 className="text-lg font-bold text-teal-900 whitespace-nowrap">
              Sablayan Visitor Center
            </h1>
          </div>

          {/* Desktop Search */}
          <div className="hidden md:flex justify-center items-center w-full mr-1">
            <SearchBar
              search={search}
              setSearch={setSearch}
              onSearchSubmit={handleSearchSubmit}
              showButton={!isHome} // show button only outside home
            />
          </div>

          {/* Auth Buttons */}
          <div className="hidden md:flex items-center space-x-4">
            {!isAuthenticated ? (
              <>
                <button
                  onClick={() => openAuth("register")}
                  className="w-20 rounded-full font-semibold text-xs text-gray-800 hover:text-white hover:bg-teal-300 hover:scale-105 p-2 transition transform"
                >
                  Register
                </button>
                <button
                  onClick={() => openAuth("login")}
                  className="w-20 rounded-full font-semibold text-xs text-white bg-teal-600 hover:bg-teal-700 hover:scale-105 p-2 transition transform"
                >
                  Login
                </button>
              </>
            ) : (
              <>
             
            
              <NotificationBell/>
                <UserMenu user={user} logout={logout} />
            
              </>
            )}
          </div>

          {/* Mobile Hamburger */}
          <div className="md:hidden">
            <NotificationBell/>
            <button
              className="text-gray-700 hover:text-gray-900 focus:outline-none transition transform hover:scale-110"
              onClick={() => setMenuOpen(!menuOpen)}
            >
              <svg
                className="h-7 w-7"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d={
                    menuOpen
                      ? "M6 18L18 6M6 6l12 12"
                      : "M4 6h16M4 12h16M4 18h16"
                  }
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
                onClick={() => openAuth("register")}
                className="block w-full py-2 rounded-lg bg-gray-100 text-gray-800 font-semibold text-sm hover:bg-gray-200 transition"
              >
                Register
              </button>
              <button
                onClick={() => openAuth("login")}
                className="block w-full py-2 rounded-lg bg-teal-600 text-white font-semibold text-sm hover:bg-teal-700 transition"
              >
                Login
              </button>
            </>
          ) : (
            <>
            
              <a
                href="/profile/"
                className="block w-full py-2 rounded-lg bg-amber-400 text-white font-semibold text-sm hover:bg-amber-500 transition text-center"
              >
                Profile
              </a>
              <button
                onClick={logout}
                className="block w-full py-2 rounded-lg bg-teal-600 text-white font-semibold text-sm hover:bg-red-400 transition"
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
