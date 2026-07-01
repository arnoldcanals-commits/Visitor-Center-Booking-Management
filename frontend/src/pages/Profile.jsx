// pages/Profile.jsx
import { useState, useMemo, useEffect, Profiler } from "react";
import TopBar from "../components/TopBar";
import BookingView from "./booking/BookingView";
import GuestManagement from "./Guests";
import ProfileView from "./UserInfo";
import api from "../api";

const TABS = [
  { key: "guests", label: "Guests" },
  { key: "bookings", label: "Bookings" },
  { key: "userinfo", label: "UserInfo" },
];

// helper to get JWT user info
const getUserFromLocalStorage = async () => {
  const access = localStorage.getItem("access");
  if (!access) return null;
  try {
    const res = await api.get("/api/user/me/");
    return res.data;
  } catch (err) {
    console.error("Failed to fetch user:", err);
    return null;
  }
};

export default function Profile() {
  const [activeTab, setActiveTab] = useState("guests");
  const [user, setUser] = useState(null);

  // fetch user on mount
  useEffect(() => {
    getUserFromLocalStorage().then((data) => setUser(data));
  }, []);

  /* ----------------------------------------
     Time-based greeting + theme
  ---------------------------------------- */
  const greetingData = useMemo(() => {
    const hour = new Date().getHours();

    if (hour >= 5 && hour < 12) {
      return {
        greeting: "Good morning",
        gradient: "from-teal-500 to-cyan-500",
        pulse: "bg-teal-400",
      };
    }

    if (hour >= 12 && hour < 18) {
      return {
        greeting: "Good afternoon",
        gradient: "from-cyan-500 to-teal-500",
        pulse: "bg-cyan-400",
      };
    }

    return {
      greeting: "Good evening",
      gradient: "from-teal-700 to-cyan-600",
      pulse: "bg-teal-600",
    };
  }, []);

  const renderTabContent = () => {
    switch (activeTab) {
      case "guests":
        return <GuestManagement />;
      case "bookings":
        return <BookingView />;
      case "userinfo":
        return <ProfileView />;
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-teal-50/30 pb-30" style={{ fontFamily: "'Poppins', sans-serif" }}>
  <TopBar />
  
  <link
    href="https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;700&display=swap"
    rel="stylesheet"
  />


      <div className="max-w-6xl mx-auto p-4">
        {/* Slim Personality Header */}
        <div className="relative bg-white rounded-2xl shadow mb-6 overflow-hidden">
          {/* Gradient top accent */}
          <div
            className={`absolute inset-x-0 top-0 h-1 bg-gradient-to-r ${greetingData.gradient}`}
          />

          <div className="flex items-center gap-4 px-6 py-4">
            {/* Pulsing icon */}
            <div className="relative">
             <span
  className={`absolute inline-flex h-10 w-10 rounded-full ${greetingData.pulse} opacity-20`}
  style={{ animation: "slowPing 2.5s ease-in-out infinite" }}
/>

<style>{`
  @keyframes slowPing {
    0% { transform: scale(1); opacity: 0.2; }
    50% { transform: scale(1.5); opacity: 0.1; }
    100% { transform: scale(2); opacity: 0; }
  }
`}</style>

              <div
                className={`flex h-12 w-12 items-center justify-center rounded-xl
                bg-gradient-to-br ${greetingData.gradient} text-white shadow-sm`}
              >
                👤
              </div>
            </div>

            {/* Greeting */}
            <div className="flex-1">
              <h1 className="text-lg font-semibold leading-tight">
                {greetingData.greeting}
                {user?.first_name && (
                  <span className="text-teal-600">, {user.first_name}</span>
                )}
              </h1>
              <p className="text-sm text-gray-500">
                Here’s what’s happening in your profile today
              </p>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-2xl shadow mb-6">
          <div className="flex gap-2 p-2 overflow-x-auto">
            {TABS.map((tab) => {
              const isActive = activeTab === tab.key;

              return (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={`
                    relative px-5 py-2.5 text-sm font-medium rounded-xl
                    transition-all duration-300 ease-out
                    ${
                      isActive
                        ? "bg-teal-50 text-teal-700 shadow-sm translate-y-[-1px]"
                        : "text-gray-500 hover:text-teal-600 hover:bg-teal-50/60"
                    }
                  `}
                >
                  {tab.label}

                  {isActive && (
                    <span
                      className={`absolute inset-x-3 -bottom-1 h-0.5
                      bg-gradient-to-r from-teal-500 to-cyan-500 rounded-full`}
                    />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Tab Content */}
        <div
          key={activeTab}
          className="animate-[fadeInUp_0.35s_ease-out]"
        >
          {renderTabContent()}
        </div>
      </div>

      {/* Animations */}
      <style>{`
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(8px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  );
}
