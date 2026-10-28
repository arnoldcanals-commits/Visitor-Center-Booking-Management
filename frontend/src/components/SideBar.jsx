import { useContext, useState, useEffect } from "react";
import { NavLink, Link } from "react-router-dom";
import { AuthContext } from "./Auth";
import api from "../api";
import {
  LayoutDashboard,
  Package,
  CalendarCheck,
  Users,
  Info,
  Plane,
  PanelLeftClose,
  PanelLeftOpen,
  BadgeCheck,
} from "lucide-react";

const NAV_ITEMS = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard },
  { to: "/booking/my/", label: "My Bookings", icon: CalendarCheck, authRequired: true },
  { to: "/guests/", label: "Guests", icon: Users, authRequired: true },
  { to: "/permit/", label: "Permit", icon: BadgeCheck, authRequired: true },
  { to: "/information", label: "Information", icon: Info },
  { to: "/travel", label: "Travel", icon: Plane },
];

export default function Sidebar() {
  const { theme, isAuthenticated } = useContext(AuthContext);
  const accent = theme?.themeColor || "#3b82f6";
  const [collapsed, setCollapsed] = useState(false);
  const [config, setConfig] = useState(null);

  const toggleSidebar = () => setCollapsed((prev) => !prev);

  useEffect(() => {
    const fetchConfig = async () => {
      try {
        const res = await api.get("/api/site-info/");
        setConfig(res.data);
      } catch (err) {
        console.error("Info config error:", err);
      }
    };
    fetchConfig();
  }, []);

  const visibleNavItems = NAV_ITEMS.filter(
    (item) => !item.authRequired || isAuthenticated
  );

  return (
    <aside
      className={`relative h-screen shrink-0 flex flex-col bg-white dark:bg-gray-900 overflow-hidden transition-[width] duration-300 ease-in-out ${
        collapsed ? "w-[68px]" : "w-64"
      }`}
    >
      {/* Accent line on the right edge */}
      <div
        className="absolute top-0 right-0 h-full w-[3px]"
        style={{
          background: `linear-gradient(to bottom, ${accent}, color-mix(in srgb, ${accent} 30%, transparent))`,
        }}
      />

      {/* Brand row: logo + name */}
      <div
        className={`h-16 flex items-center border-b border-neutral-200 dark:border-neutral-800 shrink-0 overflow-hidden transition-[padding] duration-300 ease-in-out ${
          collapsed ? "justify-center px-0" : "gap-2.5 px-4"
        }`}
      >
        <Link
          to="/"
          className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 overflow-hidden"
          style={{ backgroundColor: accent }}
        >
          <img className="h-5 w-auto" src="/VCMS.ico" alt="Logo" />
        </Link>
        {!collapsed && (
          <span className="font-semibold text-sm text-neutral-900 dark:text-neutral-100 truncate">
            {config?.website_name || "TravelCo"}
          </span>
        )}
      </div>

      {/* Toggle button row — always below the brand, own dedicated space */}
      <div className={`flex shrink-0 border-b border-neutral-200 dark:border-neutral-800 py-2 ${collapsed ? "justify-center" : "justify-end px-4"}`}>
        <button
          onClick={toggleSidebar}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          className="w-9 h-9 flex items-center justify-center rounded-lg shrink-0 text-white shadow-sm transition-transform duration-150 hover:scale-105"
          style={{ backgroundColor: accent }}
        >
          {collapsed ? (
            <PanelLeftOpen className="w-4.5 h-4.5" strokeWidth={2.25} />
          ) : (
            <PanelLeftClose className="w-4.5 h-4.5" strokeWidth={2.25} />
          )}
        </button>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-2 px-2.5 space-y-0.5">
        {visibleNavItems.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            title={collapsed ? label : undefined}
            className={({ isActive }) =>
              `flex items-center gap-3 rounded-lg px-2.5 py-2 text-sm transition-colors duration-200 ${
                collapsed ? "justify-center" : ""
              } ${
                isActive
                  ? "font-medium"
                  : "font-normal text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-gray-800"
              }`
            }
            style={({ isActive }) =>
              isActive
                ? {
                    backgroundColor: `color-mix(in srgb, ${accent} 14%, transparent)`,
                    color: accent,
                  }
                : undefined
            }
          >
            <Icon className="w-4 h-4 shrink-0" strokeWidth={2} />
            <span
              className={`truncate transition-all duration-300 ease-in-out overflow-hidden ${
                collapsed ? "w-0 opacity-0" : "w-auto opacity-100"
              }`}
            >
              {label}
            </span>
          </NavLink>
        ))}
      </nav>
    </aside>
  );
}