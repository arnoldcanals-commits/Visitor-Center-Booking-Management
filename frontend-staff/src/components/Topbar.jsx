import { useLocation } from "react-router-dom";
import { useEffect, useState, useRef, useContext } from "react";
import { FiBell, FiCalendar, FiLogOut } from "react-icons/fi";

import { StaffDataContext } from "../contexts/StaffDataContext";
import { TourGuideDataContext } from "../contexts/TourGuideDataContext";
import { StationContext } from "../contexts/StationStaffDataContext";
import NotificationBell from "./Notifications";
// Big Calendar
import {
  Calendar as BigCalendar,
  dateFnsLocalizer,
} from "react-big-calendar";
import format from "date-fns/format";
import parse from "date-fns/parse";
import startOfWeek from "date-fns/startOfWeek";
import getDay from "date-fns/getDay";
import enUS from "date-fns/locale/en-US";
import "react-big-calendar/lib/css/react-big-calendar.css";

export default function TopBar() {
  const location = useLocation();

  // All contexts are safe to read
  const staffCtx = useContext(StaffDataContext);
  const guideCtx = useContext(TourGuideDataContext);
  const stationCtx = useContext(StationContext);

  /**
   * AUTO-DETECT ACTIVE ROLE
   * Priority: Staff > Station > Tour Guide
   */
  const isStaff = !!staffCtx?.staffData;
  const isStation = !!stationCtx?.stationData;
  const isGuide = !!guideCtx?.guideData;

  // Only staff & guide have notifications / bookings
  const activeData = isStaff
    ? staffCtx.staffData
    : isGuide
    ? guideCtx.guideData
    : null;

  const updateItem = isStaff
    ? staffCtx.updateItem
    : isGuide
    ? guideCtx.updateItem
    : null;

  const [pageTitle, setPageTitle] = useState("Dashboard");
  const [showNotif, setShowNotif] = useState(false);
  const [showCalendar, setShowCalendar] = useState(false);
  const [calendarDate, setCalendarDate] = useState(new Date());
  const [calendarView, setCalendarView] = useState("month");

  const notifRef = useRef(null);
  const calendarRef = useRef(null);

  const localizer = dateFnsLocalizer({
    format,
    parse,
    startOfWeek,
    getDay,
    locales: { "en-US": enUS },
  });

  // --------------------------------------------------
  // PAGE TITLE
  // --------------------------------------------------
  useEffect(() => {
    const path = location.pathname.split("/").filter(Boolean).pop();
    setPageTitle(
      path ? path.charAt(0).toUpperCase() + path.slice(1) : "Dashboard"
    );
  }, [location.pathname]);

  // --------------------------------------------------
  // STAFF / GUIDE DATA
  // --------------------------------------------------
  const notifications = activeData?.notifications || [];
  const bookings = activeData?.bookings || [];

  const unreadCount = notifications.filter((n) => !n.read).length;

  // --------------------------------------------------
  // CLICK OUTSIDE HANDLERS
  // --------------------------------------------------
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (notifRef.current && !notifRef.current.contains(e.target)) {
        setShowNotif(false);
      }
      if (calendarRef.current && !calendarRef.current.contains(e.target)) {
        setShowCalendar(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () =>
      document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // --------------------------------------------------
  // NOTIFICATION READ
  // --------------------------------------------------
  const handleNotifClick = async (notif) => {
    if (!notif.read && updateItem) {
      await updateItem("notifications", notif.id, { read: true });
    }
  };

  // --------------------------------------------------
  // CALENDAR EVENTS (STAFF & GUIDE ONLY)
  // --------------------------------------------------
  const events = bookings.map((b) => ({
    title:
      b.tour_package?.name ||
      b.tourist_name ||
      "Booking",
    start: b.check_in ? new Date(b.check_in) : new Date(),
    end: b.check_out ? new Date(b.check_out) : new Date(),
    allDay: false,
  }));

  return (
    <div className="sticky top-0 z-50 bg-white border-b border-teal-300 px-4 sm:px-6 py-2 flex items-center justify-between shadow-md">
      {/* Page Title */}
      <div className="text-lg font-semibold text-teal-600 tracking-wide">
        {pageTitle}
      </div>

      {/* Controls */}
      <div className="flex items-center space-x-3 sm:space-x-4 relative">
        {/* Calendar (STAFF & GUIDE ONLY) */}
        {(isStaff || isGuide) && (
          <div className="relative" ref={calendarRef}>
            <button
              onClick={() => setShowCalendar((v) => !v)}
              className="text-teal-600 hover:text-teal-700 p-2 rounded-full transition"
            >
              <FiCalendar size={22} />
            </button>

            {showCalendar && (
              <div className="absolute right-0 mt-2 z-50 w-[90vw] md:w-96 bg-white border border-teal-300 rounded-lg shadow-lg p-2 animate-scaleDown">
                <BigCalendar
                  localizer={localizer}
                  events={events}
                  startAccessor="start"
                  endAccessor="end"
                  date={calendarDate}
                  view={calendarView}
                  onNavigate={setCalendarDate}
                  onView={setCalendarView}
                  views={["month", "week", "day"]}
                  style={{ height: 350 }}
                  popup
                />
              </div>
            )}
          </div>
        )}

        {/* Notifications (STAFF & GUIDE ONLY) */}
        {(isStaff || isGuide) && (
          <div className="relative" ref={notifRef}>
            <button
              onClick={() => setShowNotif((v) => !v)}
              className="relative text-teal-600 hover:text-teal-700 p-2 rounded-full transition"
            >
              <FiBell size={22} />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full text-xs w-4 h-4 flex items-center justify-center">
                  {unreadCount}
                </span>
              )}
            </button>

            {showNotif && (
              <div className="absolute right-0 mt-2 w-72 sm:w-80 bg-white border border-gray-200 rounded-md shadow-lg z-50 animate-scaleDown max-h-96 overflow-y-auto">
                {notifications.length === 0 ? (
                  <div className="p-3 text-gray-500 text-sm">
                    No notifications
                  </div>
                ) : (
                  notifications.map((notif) => (
                    <div
                      key={notif.id}
                      onClick={() => handleNotifClick(notif)}
                      className={`p-3 border-b last:border-b-0 text-sm cursor-pointer ${
                        notif.read
                          ? "text-gray-400"
                          : "text-gray-700 font-medium"
                      } hover:bg-teal-50`}
                    >
                      {notif.message}
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        )}
        <NotificationBell/>
        {/* Logout */}
        <a
          href="/logout"
          className="hidden md:flex items-center text-white bg-teal-500 hover:bg-teal-600 px-3 py-1 rounded-md font-medium shadow-md"
        >
          Logout
        </a>
        <a
          href="/logout"
          className="md:hidden flex items-center text-white bg-teal-500 hover:bg-teal-600 p-2 rounded-full shadow-md"
        >
          <FiLogOut size={20} />
        </a>
      </div>

      {/* Animation */}
      <style>{`
        @keyframes scaleDown {
          0% { transform: scaleY(0); opacity: 0; }
          100% { transform: scaleY(1); opacity: 1; }
        }
        .animate-scaleDown {
          animation: scaleDown 0.2s ease-out forwards;
          transform-origin: top;
        }
      `}</style>
    </div>
  );
}
