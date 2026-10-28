import { useState } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { CalendarCheck } from "lucide-react";
import AuthPanel from "../AuthPanel";

export default function FloatingBookButton({ packageId }) {
  const navigate = useNavigate();
  const [authPanelOpen, setAuthPanelOpen] = useState(false);

  const handleClick = () => {
    const token = localStorage.getItem("access");
    if (token) {
      navigate(`/booking/book/${packageId}`);
    } else {
      setAuthPanelOpen(true);
    }
  };

  return (
    <>
      {/* Desktop floating button */}
      <div className="hidden md:block">
        <motion.button
          initial={{ y: 50, opacity: 0 }}
          animate={{
            y: 0,
            opacity: 1,
            boxShadow: [
              "0 0 0 0 color-mix(in srgb, var(--accent) 45%, transparent)",
              "0 0 0 10px color-mix(in srgb, var(--accent) 0%, transparent)",
            ],
          }}
          transition={{
            y: { duration: 0.4, ease: "easeOut" },
            opacity: { duration: 0.4, ease: "easeOut" },
            boxShadow: { duration: 2, repeat: Infinity, ease: "easeOut" },
          }}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.96 }}
          style={{ backgroundColor: "var(--accent)" }}
          className="
            fixed bottom-6 right-15 border border-white/70
            dark:border-white/20
            text-white font-semibold
            px-8 py-3 rounded-2xl shadow-lg
            flex items-center gap-2
            transition-colors duration-300
            hover:[background-color:color-mix(in_srgb,var(--accent)_85%,black)]
            active:[background-color:color-mix(in_srgb,var(--accent)_75%,black)]
            z-50
          "
          onClick={handleClick}
        >
          <CalendarCheck className="w-5 h-5" />
          Book Now
        </motion.button>
      </div>

      {/* Mobile sticky bottom bar */}
      <div className="md:hidden">
        <div
          className="
            fixed bottom-0 left-0 right-0
            bg-white dark:bg-gray-900
            border-t border-gray-200 dark:border-gray-700
            shadow-lg
            p-4 flex justify-center
            z-50
          "
        >
          <motion.button
            whileTap={{ scale: 0.95 }}
            style={{ backgroundColor: "var(--accent)" }}
            className="
              w-full text-white font-semibold
              py-3 rounded-2xl shadow-md
              flex items-center justify-center gap-2
              transition-colors duration-300
              active:[background-color:color-mix(in_srgb,var(--accent)_75%,black)]
            "
            onClick={handleClick}
          >
            <CalendarCheck className="w-5 h-5" />
            Book Now
          </motion.button>
        </div>
      </div>

      {/* AuthPanel Modal with Banner */}
      {authPanelOpen && (
        <AuthPanel
          defaultMode="login"
          closePanel={() => setAuthPanelOpen(false)}
          onLoginSuccess={() => {
            setAuthPanelOpen(false);
            navigate(`/booking/book/${packageId}`);
          }}
        >
          <div className="bg-yellow-100 dark:bg-yellow-900/30 border-l-4 border-yellow-400 dark:border-yellow-600 text-yellow-700 dark:text-yellow-300 p-4 mb-4 rounded-md shadow-md">
            <p className="font-semibold text-center">
              Login to create booking
            </p>
          </div>
        </AuthPanel>
      )}
    </>
  );
}