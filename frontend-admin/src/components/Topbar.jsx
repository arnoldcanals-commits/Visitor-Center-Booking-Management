import { useLocation } from "react-router-dom";
import { useEffect, useState, useRef, useContext, useMemo } from "react";
import { FiBell, FiCalendar, FiLogOut } from "react-icons/fi";
import { AdminDataContext } from "../contexts/AdminDataContext";
import { AuthContext } from "../contexts/AuthContext"; // Import AuthContext

// Big Calendar Imports
import { Calendar as BigCalendar, dateFnsLocalizer } from "react-big-calendar";
import format from "date-fns/format";
import parse from "date-fns/parse";
import startOfWeek from "date-fns/startOfWeek";
import getDay from "date-fns/getDay";
import enUS from "date-fns/locale/en-US";
import "react-big-calendar/lib/css/react-big-calendar.css";

export default function TopBar() {
  const location = useLocation();
  const { adminData, updateItem } = useContext(AdminDataContext);
  const { user } = useContext(AuthContext); // user contains decoded JWT data

  const [pageTitle, setPageTitle] = useState("Dashboard");
  const [showNotif, setShowNotif] = useState(false);
  const [showCalendar, setShowCalendar] = useState(false);
  const [calendarDate, setCalendarDate] = useState(new Date());
  const [calendarView, setCalendarView] = useState("month");

  const notifRef = useRef();
  const calendarRef = useRef();

  const localizer = dateFnsLocalizer({
    format,
    parse,
    startOfWeek,
    getDay,
    locales: { "en-US": enUS },
  });

  useEffect(() => {
    const path = location.pathname.split("/").filter(Boolean).pop();
    setPageTitle(path ? path.charAt(0).toUpperCase() + path.slice(1) : "Dashboard");
  }, [location.pathname]);

  // ✨ FILTER LOGIC: Matches notification.user (ID) with the decoded user.user_id
// Inside your TopBar component
const myNotifications = useMemo(() => {
  // 1. Safety check for data
  if (!user || !adminData.notifications) return [];

  // 2. Identify the current Admin's ID from the JWT
  // SimpleJWT usually uses 'user_id'. Use 'id' or 'sub' as fallbacks.
  const currentUserId = user.user_id || user.id || user.sub;

  // 3. Filter notifications
  return adminData.notifications.filter((n) => {
    // We cast both to Number to prevent "1" !== 1 mismatches
    return Number(n.user) === Number(currentUserId);
  });
}, [adminData.notifications, user]);
  const unreadCount = myNotifications.filter((n) => !n.is_read).length;

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (notifRef.current && !notifRef.current.contains(event.target)) setShowNotif(false);
      if (calendarRef.current && !calendarRef.current.contains(event.target)) setShowCalendar(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleNotifClick = async (notif) => {
    if (!notif.is_read) {
      // updateItem handles the API call and local state sync via AdminDataContext
      await updateItem("notifications", notif.id, { is_read: true });
    }
  };

  const events = (adminData.bookings || []).map((b) => ({
    title: b.tourist_name || "Booking",
    start: b.check_in ? new Date(b.check_in) : new Date(),
    end: b.check_out ? new Date(b.check_out) : new Date(),
    allDay: false,
  }));

  return (
    <div className="sticky top-0 z-50 bg-white border-b border-teal-300 px-4 sm:px-6 py-2 flex items-center justify-between shadow-md">
      <div className="text-lg font-semibold text-teal-600 tracking-wide">{pageTitle}</div>

      <div className="flex items-center space-x-3 sm:space-x-4 relative">
        {/* Calendar */}
        <div className="relative" ref={calendarRef}>
          <button onClick={() => setShowCalendar(!showCalendar)} className="text-teal-600 hover:text-teal-700 p-2 rounded-full transition transform hover:scale-110">
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
              />
            </div>
          )}
        </div>

        {/* Notifications */}
        <div className="relative" ref={notifRef}>
          <button onClick={() => setShowNotif(!showNotif)} className="relative text-teal-600 hover:text-teal-700 p-2 rounded-full transition transform hover:scale-110">
            <FiBell size={22} />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full text-[10px] w-4 h-4 flex items-center justify-center">
                {unreadCount}
              </span>
            )}
          </button>
          {showNotif && (
            <div className="absolute right-0 mt-2 w-72 sm:w-80 bg-white border border-gray-200 rounded-md shadow-lg z-50 animate-scaleDown max-h-96 overflow-y-auto">
              <div className="p-2 border-b bg-teal-50 text-teal-700 font-bold text-xs uppercase tracking-wider">
                Notifications ({unreadCount} unread)
              </div>
              {myNotifications.length === 0 ? (
                <div className="p-4 text-center text-gray-400 text-sm italic">No notifications for you.</div>
              ) : (
                myNotifications.map((notif) => (
                  <div
                    key={notif.id}
                    onClick={() => handleNotifClick(notif)}
                    className={`p-3 border-b last:border-b-0 text-sm cursor-pointer transition ${
                      notif.is_read ? "text-gray-400 opacity-75" : "text-gray-700 font-semibold bg-white"
                    } hover:bg-teal-50`}
                  >
                    <div className="flex justify-between items-start mb-1">
                       <span className={`text-[10px] px-1.5 py-0.5 rounded ${notif.is_read ? 'bg-gray-100' : 'bg-teal-100 text-teal-700'}`}>
                         {notif.notification_type}
                       </span>
                    </div>
                    {notif.message}
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        {/* Logout */}
        <a href="/logout" className="hidden md:flex items-center text-white bg-teal-500 hover:bg-teal-600 px-3 py-1 rounded-md font-medium shadow-md transition transform hover:scale-105">
          Logout
        </a>
        <a href="/logout" className="md:hidden flex items-center text-white bg-teal-500 hover:bg-teal-600 p-2 rounded-full shadow-md">
          <FiLogOut size={20} />
        </a>
      </div>

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