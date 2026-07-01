import { useState, useContext } from "react";
import { NavLink } from "react-router-dom";
import {
  Bars3Icon,
  HomeIcon,
  UsersIcon,
  ClipboardDocumentIcon,
  TicketIcon,
  CalendarIcon,
  StarIcon,
  UserCircleIcon,
  QrCodeIcon,
} from "@heroicons/react/24/outline";

import { StaffDataContext } from "../contexts/StaffDataContext";
import { TourGuideDataContext } from "../contexts/TourGuideDataContext";
import { StationContext } from "../contexts/StationStaffDataContext";

// ================= LINK DEFINITIONS =================
const STAFF_LINKS = [
  { name: "Dashboard", to: "dashboard", icon: HomeIcon },
  { name: "Users", to: "users", icon: UsersIcon },
  { name: "Packages", to: "packages", icon: ClipboardDocumentIcon },
  { name: "Events", to: "events", icon: CalendarIcon },
  { name: "Bookings", to: "bookings", icon: TicketIcon },
  { name: "Guests", to: "guests", icon: UsersIcon },
  { name: "Permits", to: "permits", icon: ClipboardDocumentIcon },
  { name: "QR Codes", to: "qrcodes", icon: QrCodeIcon },
  { name: "Ratings", to: "ratings", icon: StarIcon },
  { name: "Billing", to: "billing", icon: ClipboardDocumentIcon },
];

const GUIDE_LINKS = [
  { name: "Dashboard", to: "dashboard", icon: HomeIcon },
  { name: "My Bookings", to: "bookings", icon: TicketIcon },
  { name: "My Events", to: "events", icon: CalendarIcon },
  { name: "Reviews", to: "reviews", icon: StarIcon },
  { name: "Profile", to: "profile", icon: UserCircleIcon },
];

const STATION_LINKS = [
  { name: "Dashboard", to: "dashboard", icon: HomeIcon },
  // QR scanning happens INSIDE the dashboard
  { name: "Profile", to: "profile", icon: UserCircleIcon },
];

// ===================================================
// SIDEBAR
// ===================================================
export default function Sidebar({ children }) {
  const [open, setOpen] = useState(true);

  // Contexts (safe to read all)
  const staffCtx = useContext(StaffDataContext);
  const guideCtx = useContext(TourGuideDataContext);
  const stationCtx = useContext(StationContext);

  const isStaff = !!staffCtx?.staffData;
  const isGuide = !!guideCtx?.guideData;
  const isStationStaff = !!stationCtx?.stationData;

  let links = GUIDE_LINKS;
  let userName = "User";

  if (isStaff) {
    links = STAFF_LINKS;
    userName = staffCtx.staffData?.profile?.username || "Staff";
  } else if (isStationStaff) {
    links = STATION_LINKS;
    userName = "Station Staff";
  } else if (isGuide) {
    links = GUIDE_LINKS;
    userName = guideCtx.guideData?.profile?.username || "Tour Guide";
  }

  return (
    <div className="flex h-screen bg-gray-50">
      {/* ================= SIDEBAR ================= */}
      <aside
        className={`fixed z-40 h-full bg-white border-r transition-all duration-300 ${
          open ? "w-64" : "w-20"
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b relative">
          {/* Invisible placeholder for centering */}
          <span className="opacity-0 font-bold text-lg">
            Hello {userName}
          </span>

          {/* Toggle */}
          <button
            onClick={() => setOpen(!open)}
            className="absolute right-4 p-2 bg-teal-500 text-white rounded-full shadow transition-transform duration-300"
          >
            <Bars3Icon className="w-5 h-5" />
          </button>

          {/* Visible name */}
          {open && (
            <span className="text-teal-500 font-bold text-lg absolute left-4">
              Hello {userName}
            </span>
          )}
        </div>

        {/* Links */}
        <nav className="flex-1 p-2 mt-2 space-y-1">
          {links.map((link) => {
            const Icon = link.icon;
            return (
              <NavLink
                key={link.to + link.name}
                to={link.to}
                className={({ isActive }) =>
                  `flex items-center gap-3 p-2 rounded transition-colors ${
                    isActive
                      ? "bg-amber-400 text-white font-semibold"
                      : "text-gray-700 hover:bg-gray-100"
                  }`
                }
              >
                <Icon className="w-6 h-6" />
                {open && <span>{link.name}</span>}
              </NavLink>
            );
          })}
        </nav>
      </aside>

      {/* ================= MAIN CONTENT ================= */}
      <div
        className="flex-1 transition-all duration-300"
        style={{ marginLeft: open ? "16rem" : "5rem" }}
      >
        {children}
      </div>
    </div>
  );
}
