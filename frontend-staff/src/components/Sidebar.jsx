import { useState, useContext } from "react";
import { NavLink } from "react-router-dom";
import {
  Menu,
  Home,
  Users,
  ClipboardList,
  Ticket,
  Calendar,
  Star,
  UserCircle,
  QrCode,
  ChevronDown,
} from "lucide-react";

import { StaffDataContext } from "../contexts/StaffDataContext";
import { TourGuideDataContext } from "../contexts/TourGuideDataContext";
import { StationContext } from "../contexts/StationStaffDataContext";
import { AuthContext } from "../contexts/AuthContext";

// ================= LINK DEFINITIONS (grouped into categories) =================
const STAFF_CATEGORIES = [
  {
    name: "Overview",
    links: [{ name: "Dashboard", to: "dashboard", icon: Home }],
  },
  {
    name: "Management",
    links: [
      { name: "Users", to: "users", icon: Users },
      { name: "Packages", to: "packages", icon: ClipboardList },
      { name: "Events", to: "events", icon: Calendar },
      { name: "Bookings", to: "bookings", icon: Ticket },
      { name: "Guests", to: "guests", icon: Users },
      { name: "Permits", to: "permits", icon: ClipboardList },
    ],
  },
  {
    name: "Tools",
    links: [
      { name: "QR Codes", to: "qrcodes", icon: QrCode },
      { name: "Ratings", to: "ratings", icon: Star },
      { name: "Billing", to: "billing", icon: ClipboardList },
    ],
  },
];

const GUIDE_CATEGORIES = [
  {
    name: "Overview",
    links: [{ name: "Dashboard", to: "dashboard", icon: Home }],
  },
  {
    name: "My Work",
    links: [
      { name: "My Bookings", to: "bookings", icon: Ticket },
      { name: "My Events", to: "events", icon: Calendar },
      { name: "Reviews", to: "reviews", icon: Star },
    ],
  },
  {
    name: "Account",
    links: [{ name: "Profile", to: "profile", icon: UserCircle }],
  },
];

const STATION_CATEGORIES = [
  {
    name: "Overview",
    links: [{ name: "Dashboard", to: "dashboard", icon: Home }],
  },
  {
    name: "Account",
    links: [{ name: "Profile", to: "profile", icon: UserCircle }],
  },
];

// ===================================================
// SIDEBAR
// ===================================================
export default function Sidebar({ children }) {
  const [open, setOpen] = useState(true);

  // Contexts
  const staffCtx = useContext(StaffDataContext);
  const guideCtx = useContext(TourGuideDataContext);
  const stationCtx = useContext(StationContext);
  const { user } = useContext(AuthContext);

  const isStaff = !!staffCtx?.staffData;
  const isGuide = !!guideCtx?.guideData;
  const isStationStaff = !!stationCtx?.stationData;

  let categories = GUIDE_CATEGORIES;
  if (isStaff) categories = STAFF_CATEGORIES;
  else if (isStationStaff) categories = STATION_CATEGORIES;
  else if (isGuide) categories = GUIDE_CATEGORIES;

  // user comes from AuthContext (decoded JWT + merged profile fields)
  const userName =
    user?.username || user?.first_name || user?.name || user?.email ||
    (isStaff ? "Staff" : isStationStaff ? "Station Staff" : isGuide ? "Tour Guide" : "User");

  // Track expanded/collapsed state per category, default all open
  const [expanded, setExpanded] = useState(() =>
    Object.fromEntries(categories.map((c) => [c.name, true]))
  );

  const toggleCategory = (name) => {
    setExpanded((prev) => ({ ...prev, [name]: !prev[name] }));
  };

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-gray-950">
      {/* ================= SIDEBAR ================= */}
      <aside
        className={`fixed z-40 h-full bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 transition-all duration-300 ease-in-out ${
          open ? "w-64" : "w-20"
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-800 relative h-[64px]">
          {/* Invisible placeholder for centering */}
          <span className="opacity-0 font-bold text-lg">Hello {userName}</span>

          {/* Toggle */}
          <button
            onClick={() => setOpen(!open)}
            aria-label="Toggle sidebar"
            className="absolute right-4 p-2 bg-[var(--accent)] text-white rounded-full shadow transition-transform duration-300 hover:scale-110 active:scale-95"
          >
            <Menu className="w-5 h-5" />
          </button>

          {/* Visible name */}
          <span
            className={`text-[var(--accent)] font-bold text-lg absolute left-4 transition-opacity duration-200 whitespace-nowrap overflow-hidden ${
              open ? "opacity-100" : "opacity-0 pointer-events-none"
            }`}
          >
            Hello {userName}
          </span>
        </div>

        {/* Categories */}
        <nav className="flex-1 p-2 mt-2 space-y-1 overflow-y-auto h-[calc(100%-64px)]">
          {categories.map((category) => {
            const isOpen = expanded[category.name];
            return (
              <div key={category.name} className="mb-1">
                {/* Category header */}
                <button
                  onClick={() => toggleCategory(category.name)}
                  className={`w-full flex items-center justify-between px-2 py-2 rounded text-xs font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500 hover:text-[var(--accent)] transition-colors duration-200 ${
                    !open && "justify-center"
                  }`}
                >
                  {open && <span>{category.name}</span>}
                  {open && (
                    <ChevronDown
                      className={`w-4 h-4 transition-transform duration-300 ${
                        isOpen ? "rotate-180" : "rotate-0"
                      }`}
                    />
                  )}
                </button>

                {/* Category links */}
                <div
                  className={`grid transition-all duration-300 ease-in-out ${
                    isOpen || !open
                      ? "grid-rows-[1fr] opacity-100"
                      : "grid-rows-[0fr] opacity-0"
                  }`}
                >
                  <div className="overflow-hidden">
                    <div className="space-y-1 py-1">
                      {category.links.map((link) => {
                        const Icon = link.icon;
                        return (
                          <NavLink
                            key={link.to + link.name}
                            to={link.to}
                            className={({ isActive }) =>
                              `flex items-center gap-3 p-2 rounded-md transition-all duration-200 ${
                                isActive
                                  ? "bg-[var(--accent)] text-white font-semibold shadow-sm"
                                  : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 hover:translate-x-0.5"
                              } ${!open && "justify-center"}`
                            }
                          >
                            <Icon className="w-5 h-5 shrink-0" />
                            {open && (
                              <span className="animate-fadeIn">{link.name}</span>
                            )}
                          </NavLink>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </nav>
      </aside>

      {/* ================= MAIN CONTENT ================= */}
      <div
        className="flex-1 transition-all duration-300 ease-in-out"
        style={{ marginLeft: open ? "16rem" : "5rem" }}
      >
        {children}
      </div>

      <style>{`
        @keyframes fadeIn {
          0% { opacity: 0; transform: translateX(-4px); }
          100% { opacity: 1; transform: translateX(0); }
        }
        .animate-fadeIn {
          animation: fadeIn 0.2s ease-out forwards;
        }
      `}</style>
    </div>
  );
}