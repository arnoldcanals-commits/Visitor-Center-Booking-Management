import { useState } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import AuthPanel from "./AuthPanel";

export default function FloatingBookButton({ packageId }) {
  const navigate = useNavigate();
  const [authPanelOpen, setAuthPanelOpen] = useState(false);

  const handleClick = () => {
    const token = localStorage.getItem("access");
    if (token) {
      // User is logged in, go to booking
      navigate(`/booking/book/${packageId}`);
    } else {
      // User not logged in, show modal
      setAuthPanelOpen(true);
    }
  };

  return (
    <>
      {/* Desktop floating button */}
      <div className="hidden md:block">
       <motion.button
  initial={{ y: 50, opacity: 0 }}
  animate={{ y: 0, opacity: 1 }}
  className="
    fixed bottom-6 right-15 border-2 border-white
    bg-slate-900 text-white font-semibold
    px-20 py-3 rounded-full shadow-xl
    hover:bg-blue-900 transition-all
    z-50
  "
  onClick={handleClick}
>
  Book Now
</motion.button>

      </div>

      {/* Mobile sticky bottom bar */}
      <div className="md:hidden">
        <div className="
          fixed bottom-0 left-0 right-0
          bg-white border-t shadow-lg
          p-4 flex justify-center
          z-50
        ">
          <button
            onClick={handleClick}
            className="
              w-full bg-blue-600 text-white font-semibold 
              py-3 rounded-xl shadow-md active:scale-95
            "
          >
            Book Now
          </button>
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
          {/* Banner */}
          <div className="bg-yellow-100 border-l-4 border-yellow-400 text-yellow-700 p-4 mb-4 rounded-md shadow-md">
            <p className="font-semibold text-center">
              Login to create booking
            </p>
          </div>
        </AuthPanel>
      )}
    </>
  );
}
