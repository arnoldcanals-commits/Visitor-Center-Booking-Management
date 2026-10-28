// pages/Profile.jsx
import { useState, useMemo, useContext } from "react";
import TopBar from "../components/TopBar";
import BookingView from "./booking/BookingView";
import GuestManagement from "./Guests";
import ProfileView from "../components/UserInfo";
import { AuthContext } from "../components/Auth";

const TABS = [
  { key: "guests", label: "Guests" },
  { key: "bookings", label: "Bookings" },
  { key: "userinfo", label: "UserInfo" },
];

export default function Profile() {
  const [activeTab, setActiveTab] = useState("guests");
  const { user } = useContext(AuthContext);

  /* ----------------------------------------
     Time-based greeting + theme
  ---------------------------------------- */
  const greetingData = useMemo(() => {
    const hour = new Date().getHours();

    if (hour >= 5 && hour < 12) {
      return { greeting: "Good morning", pulse: "bg-[var(--accent)]" };
    }

    if (hour >= 12 && hour < 18) {
      return { greeting: "Good afternoon", pulse: "bg-[var(--accent)]" };
    }

    return { greeting: "Good evening", pulse: "bg-[var(--accent)]" };
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
    <div
      className="min-h-screen bg-gradient-to-b from-slate-50 to-teal-50/30 dark:from-gray-950 dark:to-gray-900 pb-30"
      style={{ fontFamily: "'Poppins', sans-serif" }}
    >
      <TopBar />

      <link
        href="https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;700&display=swap"
        rel="stylesheet"
      />

      <div className="max-w-6xl mx-auto p-4">
        {/* Slim Personality Header */}
        <div className="relative bg-white dark:bg-gray-900 rounded-2xl shadow dark:shadow-black/30 mb-6 overflow-hidden">
          {/* Gradient top accent */}
          <div
            className="absolute inset-x-0 top-0 h-1"
            style={{ backgroundColor: "var(--accent)" }}
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
                className="flex h-12 w-12 items-center justify-center rounded-xl text-white shadow-sm"
                style={{ backgroundColor: "var(--accent)" }}
              >
                👤
              </div>
            </div>

            {/* Greeting */}
            <div className="flex-1">
              <h1 className="text-lg font-semibold leading-tight text-gray-900 dark:text-gray-100">
                {greetingData.greeting}
                {user?.first_name && (
                  <span style={{ color: "var(--accent)" }}>, {user.first_name}</span>
                )}
              </h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Here’s what’s happening in your profile today
              </p>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-white dark:bg-gray-900 rounded-2xl shadow dark:shadow-black/30 mb-6">
          <div className="flex gap-2 p-2 overflow-x-auto">
            {TABS.map((tab) => {
              const isActive = activeTab === tab.key;

              return (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => setActiveTab(tab.key)}
                  aria-current={isActive ? "page" : undefined}
                  className={`
                    relative px-5 py-2.5 text-sm font-medium rounded-xl
                    transition-all duration-300 ease-out
                    ${
                      isActive
                        ? "shadow-sm translate-y-[-1px]"
                        : "text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"
                    }
                  `}
                  style={
                    isActive
                      ? { backgroundColor: "color-mix(in srgb, var(--accent) 12%, transparent)", color: "var(--accent)" }
                      : undefined
                  }
                >
                  {tab.label}

                  {isActive && (
                    <span
                      className="absolute inset-x-3 -bottom-1 h-0.5 rounded-full"
                      style={{ backgroundColor: "var(--accent)" }}
                    />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Tab Content */}
        <div key={activeTab} className="animate-[fadeInUp_0.35s_ease-out]">
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