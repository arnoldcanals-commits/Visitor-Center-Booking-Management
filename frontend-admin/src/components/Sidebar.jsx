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
} from "lucide-react"; // Lucide icons

const sections = [
  {
    title: "General",
    links: [
      { name: "Dashboard", to: "/dashboard", icon: Home, color: "text-teal-500" },
      { name: "Users", to: "/users", icon: Users, color: "text-indigo-500" },
    ],
  },
  {
    title: "Management",
    links: [
      { name: "Packages", to: "/packages", icon: Clipboard, color: "text-orange-500" },
      { name: "Events", to: "/events", icon: Calendar, color: "text-purple-500" },
      { name: "Bookings", to: "/bookings", icon: Ticket, color: "text-green-500" },
    
    ],
  },
  {
    title: "Tracking",
    links: [
      { name: "Guest Tracking", to: "/tracking", icon: MapPin, color: "text-teal-500" },
    ],
  },
  {
    title: "Reports",
    links: [
      { name: "Ratings", to: "/ratings", icon: Star, color: "text-yellow-500" },
      { name: "Reports", to: "/reports", icon: BarChart2, color: "text-purple-500" },
      { name: "Billing", to: "/billing", icon: CreditCard, color: "text-red-500" },
      { name: "System Settings", to: "/systemsetting", icon: Settings, color: "text-gray-700" },
    ],
  },
];

export default function Sidebar({ userName = "Admin", children }) {
  const [open, setOpen] = useState(true); // Desktop open
  const [mobileOpen, setMobileOpen] = useState(false); // Mobile sidebar
  const [mobilePos, setMobilePos] = useState({ x: 20, y: 20 });
  const [dragging, setDragging] = useState(false);
  const buttonRef = useRef(null);

  // Drag handlers for mobile circle
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
    <div className="flex h-screen font-inter bg-gray-50">
      {/* Desktop Sidebar */}
      <aside
        className={`fixed z-40 h-full bg-white border-r shadow-lg transition-all duration-300 hidden md:flex flex-col ${
          open ? "w-64" : "w-16"
        }`}
      >
        <div className="flex items-center justify-between p-4 border-b relative">
          {open && <span className="text-teal-500 font-bold text-lg">Hello {userName}</span>}

          {/* Desktop toggle */}
          <button
            onClick={() => setOpen(!open)}
            className="absolute -right-4 top-8 bg-teal-500 text-white rounded-full p-2 shadow-lg hover:scale-110 transition-transform duration-300"
          >
            <Menu className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable content */}
        <nav className="flex-1 overflow-y-auto p-2 space-y-4">
          {sections.map((section) => (
            <div key={section.title}>
              {open && (
                <h3 className="text-gray-400 uppercase text-xs font-semibold px-2 mb-2 animate-fadeIn">
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
                        `flex items-center gap-3 p-2 rounded-lg transition-all duration-300 transform hover:translate-x-1 hover:bg-gray-100 ${
                          isActive
                            ? "bg-gradient-to-r from-teal-400 to-teal-600 text-white font-semibold"
                            : "text-gray-700"
                        }`
                      }
                    >
                      <Icon className={`w-5 h-5 ${link.color} flex-shrink-0`} />
                      {open && <span className="truncate">{link.name}</span>}
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
   <aside className="fixed inset-x-0 top-16 bottom-0 z-50 bg-white shadow-lg flex flex-col p-4 overflow-y-auto animate-slideInLeft">

          <div className="flex items-center justify-between mb-6">
            <span className="text-teal-500 font-bold text-lg">Hello {userName}</span>
            <button onClick={() => setMobileOpen(false)}>
              <X className="w-6 h-6 text-gray-700" />
            </button>
          </div>

          <nav className="flex-1 space-y-4">
            {sections.map((section) => (
              <div key={section.title}>
                <h3 className="text-gray-400 uppercase text-xs font-semibold px-2 mb-2">
                  {section.title}
                </h3>
                <div className="space-y-1">
                  {section.links.map((link) => {
                    const Icon = link.icon;
                    return (
                      <NavLink
                        key={link.to}
                        to={link.to}
                        onClick={() => setMobileOpen(false)} // close on click
                        className={({ isActive }) =>
                          `flex items-center gap-3 p-2 rounded-lg transition-all duration-300 transform hover:translate-x-1 hover:bg-gray-100 ${
                            isActive
                              ? "bg-gradient-to-r from-teal-400 to-teal-600 text-white font-semibold"
                              : "text-gray-700"
                          }`
                        }
                      >
                        <Icon className={`w-5 h-5 ${link.color} flex-shrink-0`} />
                        <span className="truncate">{link.name}</span>
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
        className="md:hidden fixed z-50 p-4 bg-teal-500 text-white rounded-full shadow-lg transition-transform duration-300"
        style={{
  left: mobilePos.x,
  top: Math.max(mobilePos.y, 80),
}}

      >
        <Menu className="w-6 h-6" />
      </button>

      {/* Main content */}
     <div
  className={`flex-1 transition-all duration-300 p-4 ml-0 ${
    open ? "md:ml-64" : "md:ml-16"
  }`}
>
        {children}
      </div>
    </div>
  );
}
