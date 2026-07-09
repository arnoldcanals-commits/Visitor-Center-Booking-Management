import { useLocation } from "react-router-dom";
import { useEffect, useState, useRef, useContext, useMemo } from "react";
import { Bell, Calendar as CalendarIcon, LogOut, ChevronDown, User } from "lucide-react";
import { AdminDataContext } from "../contexts/AdminDataContext";
import { AuthContext } from "../contexts/AuthContext"; // Import AuthContext

import NotificationBell from "./Notifications";
import Profile from "./Profile";
import api from "../api";
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
  const { user, authTokens } = useContext(AuthContext); // user = decoded JWT (minimal), fullProfile = fetched from backend

  const [pageTitle, setPageTitle] = useState("Dashboard");
  const [showNotif, setShowNotif] = useState(false);
  const [showCalendar, setShowCalendar] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [calendarDate, setCalendarDate] = useState(new Date());
  const [calendarView, setCalendarView] = useState("month");
  const [fullProfile, setFullProfile] = useState(null);

  const notifRef = useRef();
  const calendarRef = useRef();
  const profileRef = useRef();

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
  const myNotifications = useMemo(() => {
    if (!user || !adminData.notifications) return [];
    const currentUserId = user.user_id || user.id || user.sub;
    return adminData.notifications.filter((n) => {
      return Number(n.user) === Number(currentUserId);
    });
  }, [adminData.notifications, user]);
  const unreadCount = myNotifications.filter((n) => !n.is_read).length;

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (notifRef.current && !notifRef.current.contains(event.target)) setShowNotif(false);
      if (calendarRef.current && !calendarRef.current.contains(event.target)) setShowCalendar(false);
      if (profileRef.current && !profileRef.current.contains(event.target)) setShowProfileMenu(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Fetch the full user record from the backend — the JWT only carries minimal
  // claims (user_id, is_admin, exp...), not things like profile_picture.
  useEffect(() => {
    if (!authTokens?.access) return;

    api
      .get("api/user/profile/", {
        headers: { Authorization: `Bearer ${authTokens.access}` },
      })
      .then((res) => setFullProfile(res.data))
      .catch((err) => console.error("Failed to fetch profile:", err));
  }, [authTokens?.access]);

  const handleNotifClick = async (notif) => {
    if (!notif.is_read) {
      await updateItem("notifications", notif.id, { is_read: true });
    }
  };

  const events = (adminData.bookings || []).map((b) => ({
    title: b.tourist_name || "Booking",
    start: b.check_in ? new Date(b.check_in) : new Date(),
    end: b.check_out ? new Date(b.check_out) : new Date(),
    allDay: false,
  }));

  // Prefer the fetched profile (has profile_picture); fall back to the decoded JWT
  const username =
    fullProfile?.username || fullProfile?.first_name || user?.username || user?.name || user?.email || "Admin";
  const profilePicture =
    fullProfile?.profile_picture ||
    `https://ui-avatars.com/api/?name=${encodeURIComponent(username)}&background=0d9488&color=fff`;

  return (
    <div className="sticky top-0 z-50 bg-white border-b border-violet-300 px-4 sm:px-6 py-3 flex items-center justify-between shadow-md">
      <div className="text-lg font-semibold text-violet-600 tracking-wide">{pageTitle}</div>

      <div className="flex items-center space-x-3 sm:space-x-4 relative">
        {/* Calendar */}
        <div className="relative" ref={calendarRef}>
          <button
            onClick={() => setShowCalendar(!showCalendar)}
            className="text-violet-600 hover:text-violet-700 p-2 rounded-full transition transform hover:scale-110"
          >
            <CalendarIcon size={22} />
          </button>
          {showCalendar && (
            <div className="absolute right-0 mt-2 z-50 w-[90vw] md:w-96 bg-white border border-violet-300 rounded-lg shadow-lg p-2 animate-scaleDown">
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

        <NotificationBell />

        {/* Profile */}
        <div className="relative" ref={profileRef}>
          <button
            onClick={() => setShowProfileMenu(!showProfileMenu)}
            className="flex items-center gap-1 rounded-full transition transform hover:scale-105"
          >
            <img
              src={profilePicture}
              alt={username}
              className="w-11 h-11 rounded-full object-cover border-2 border-[#8B6FCB]"
            />
            <ChevronDown
              size={16}
              className={`text-[#8B6FCB] transition-transform ${showProfileMenu ? "rotate-180" : ""}`}
            />
          </button>

          {showProfileMenu && (
            <div className="absolute right-0 mt-2 z-50 w-48 bg-white border border-[#8B6FCB] rounded-lg shadow-lg py-1 animate-scaleDown">
              <div className="px-4 py-2 border-b border-gray-100">
                <p className="text-sm font-medium text-gray-700 truncate">{username}</p>
              </div>

              <button
                onClick={() => {
                  setShowProfileMenu(false);
                  setShowProfileModal(true);
                }}
                className="w-full flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-violet-50 hover:text-violet-600 transition"
              >
                <User size={16} />
                Profile
              </button>

              <a
                href="/logout"
                className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-violet-50 hover:text-violet-600 transition"
              >
                <LogOut size={16} />
                Sign out
              </a>
            </div>
          )}
        </div>
      </div>

      {showProfileModal && (
        <Profile
          onClose={() => {
            setShowProfileModal(false);
            // refresh topbar avatar/username in case they were just changed
            if (authTokens?.access) {
              api
                .get("api/user/profile/", { headers: { Authorization: `Bearer ${authTokens.access}` } })
                .then((res) => setFullProfile(res.data))
                .catch(() => {});
            }
          }}
        />
      )}

      <style>{`
        @keyframes fadeIn {
          0% { opacity: 0; transform: translateY(-8px); }
          100% { opacity: 1; transform: translateY(0); }
        }
        .animate-fadeIn {
          animation: fadeIn 0.15s ease-out forwards;
        }
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