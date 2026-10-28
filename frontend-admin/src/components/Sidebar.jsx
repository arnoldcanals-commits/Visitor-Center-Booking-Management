import { useState, useRef, useEffect } from "react";
import { NavLink } from "react-router-dom";
import {
  Home,
  Users,
  Clipboard,
  Ticket,
  Calendar,
  Star,
  Settings,
  CreditCard,
  MapPin,
  BarChart2,
  Menu,
  X,
} from "lucide-react";

const sections = [
  {
    title: "General",
    links: [
      { name: "Dashboard", to: "/dashboard", icon: Home },
      { name: "Users", to: "/users", icon: Users },
    ],
  },
  {
    title: "Management",
    links: [
      { name: "Packages", to: "/packages", icon: Clipboard },
      { name: "Events", to: "/events", icon: Calendar },
      { name: "Bookings", to: "/bookings", icon: Ticket },
    ],
  },
  {
    title: "Tracking",
    links: [{ name: "Guest Tracking", to: "/tracking", icon: MapPin }],
  },
  {
    title: "Reports",
    links: [
      { name: "Ratings", to: "/ratings", icon: Star },
      { name: "Reports", to: "/reports", icon: BarChart2 },
      { name: "Billing", to: "/billing", icon: CreditCard },
      { name: "System Settings", to: "/systemsetting", icon: Settings },
    ],
  },
];

export default function Sidebar({ userName = "Admin" }) {
  const [open, setOpen] = useState(true);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [mobilePos, setMobilePos] = useState({ x: 20, y: 20 });
  const [dragging, setDragging] = useState(false);
  const buttonRef = useRef(null);

  const handleMouseMove = (e) => dragging && setMobilePos({ x: e.clientX - 25, y: e.clientY - 25 });
  const handleTouchMove = (e) => {
    if (dragging) {
      const touch = e.touches[0];
      setMobilePos({ x: touch.clientX - 25, y: touch.clientY - 25 });
    }
  };

  useEffect(() => {
    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", () => setDragging(false));
    window.addEventListener("touchmove", handleTouchMove);
    window.addEventListener("touchend", () => setDragging(false));
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", () => setDragging(false));
      window.removeEventListener("touchmove", handleTouchMove);
      window.removeEventListener("touchend", () => setDragging(false));
    };
  }, [dragging]);

  return (
    <>
      {/* Desktop Sidebar */}
      <aside
        className={`h-full bg-white dark:bg-gray-900 border-r dark:border-gray-800 shadow-lg transition-all duration-300 hidden md:flex flex-col flex-shrink-0 ${
          open ? "w-64" : "w-16"
        }`}
      >
        <div className="flex items-center p-2 border-b dark:border-gray-800 w-full">
          <button
            onClick={() => setOpen(!open)}
            className="group flex items-center justify-end w-full gap-2 p-1 rounded-lg transition-all duration-300 transform hover:translate-x-1 hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300"
          >
            {open && (
              <span className="truncate opacity-0 group-hover:opacity-100 transition-opacity duration-300 text-sm font-medium text-gray-600 dark:text-gray-400">
                Collapse
              </span>
            )}

            <div
              className={`flex items-center justify-center p-2 rounded-full transition-all duration-300 ${
                open
                  ? "bg-[var(--accent)] text-white"
                  : "text-[var(--accent)] group-hover:bg-gray-200 dark:group-hover:bg-gray-700"
              }`}
            >
              <Menu className="w-5 h-5 flex-shrink-0" />
            </div>
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto p-2 space-y-4">
          {sections.map((section) => (
            <div key={section.title}>
              {open && (
                <h3 className="text-gray-400 dark:text-gray-500 uppercase text-xs font-semibold px-2 mb-2 animate-fadeIn">
                  {section.title}
                </h3>
              )}
              <div className="space-y-1">
                {section.links.map((link) => {
                  const Icon = link.icon;
                  return (
                    <NavLink
                      key={link.to}
                      to={link.to}
                      className={({ isActive }) =>
                        `group flex items-center gap-3 p-2 rounded-lg transition-all duration-300 transform hover:translate-x-1 hover:bg-gray-100 dark:hover:bg-gray-800 ${
                          isActive
                            ? "bg-[var(--accent)] text-white font-semibold hover:text-[var(--accent)] dark:hover:text-[var(--accent)]"
                            : "text-gray-700 dark:text-gray-300"
                        }`
                      }
                    >
                      {({ isActive }) => (
                        <>
                          <Icon
                            className={`w-5 h-5 flex-shrink-0 transition-colors duration-300 ${
                              isActive ? "text-white group-hover:text-[var(--accent)]" : "text-[var(--accent)] opacity-70"
                            }`}
                          />
                          {open && <span className="truncate">{link.name}</span>}
                        </>
                      )}
                    </NavLink>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>
      </aside>

      {/* Mobile Sidebar */}
      {mobileOpen && (
        <aside className="fixed inset-x-0 top-16 bottom-0 z-50 bg-white dark:bg-gray-900 shadow-lg flex flex-col p-4 overflow-y-auto animate-slideInLeft">
          <div className="flex items-center justify-between mb-6">
            <span className="text-[var(--accent)] font-bold text-lg">Hello {userName}</span>
            <button onClick={() => setMobileOpen(false)}>
              <X className="w-6 h-6 text-gray-700 dark:text-gray-300" />
            </button>
          </div>

          <nav className="flex-1 space-y-4">
            {sections.map((section) => (
              <div key={section.title}>
                <h3 className="text-gray-400 dark:text-gray-500 uppercase text-xs font-semibold px-2 mb-2">{section.title}</h3>
                <div className="space-y-1">
                  {section.links.map((link) => {
                    const Icon = link.icon;
                    return (
                      <NavLink
                        key={link.to}
                        to={link.to}
                        onClick={() => setMobileOpen(false)}
                        className={({ isActive }) =>
                          `group flex items-center gap-3 p-2 rounded-lg transition-all duration-300 transform hover:translate-x-1 hover:bg-gray-100 dark:hover:bg-gray-800 ${
                            isActive
                              ? "bg-[var(--accent)] text-white font-semibold hover:text-[var(--accent)] dark:hover:text-[var(--accent)]"
                              : "text-gray-700 dark:text-gray-300"
                          }`
                        }
                      >
                        {({ isActive }) => (
                          <>
                            <Icon
                              className={`w-5 h-5 flex-shrink-0 transition-colors duration-300 ${
                                isActive ? "text-white group-hover:text-[var(--accent)]" : "text-[var(--accent)] opacity-70"
                              }`}
                            />
                            <span className="truncate">{link.name}</span>
                          </>
                        )}
                      </NavLink>
                    );
                  })}
                </div>
              </div>
            ))}
          </nav>
        </aside>
      )}

      {/* Mobile movable toggle */}
      <button
        ref={buttonRef}
        onMouseDown={() => setDragging(true)}
        onTouchStart={() => setDragging(true)}
        onClick={() => setMobileOpen(!mobileOpen)}
        className="md:hidden fixed z-50 p-4 bg-[var(--accent)] text-white rounded-full shadow-lg transition-transform duration-300"
        style={{
          left: mobilePos.x,
          top: Math.max(mobilePos.y, 80),
        }}
      >
        <Menu className="w-6 h-6" />
      </button>
    </>
  );
}