import { useState, useRef, useEffect } from "react";
import { Info, Star, CalendarDays, Images, Circle } from "lucide-react";

// Fallback icon per known tab label, so callers don't have to pass one.
const DEFAULT_ICONS = {
  Overview: Info,
  Reviews: Star,
  Itinerary: CalendarDays,
  Gallery: Images,
};

export default function AnimatedScrollableTabbedCard({ tabs }) {
  const [active, setActive] = useState(0);
  const tabRefs = useRef([]);

  const [underlineStyle, setUnderlineStyle] = useState({});

  useEffect(() => {
    if (tabRefs.current[active]) {
      const rect = tabRefs.current[active].getBoundingClientRect();
      const parentRect = tabRefs.current[0].parentNode.getBoundingClientRect();
      setUnderlineStyle({
        width: rect.width + "px",
        transform: `translateX(${rect.left - parentRect.left}px)`,
      });
    }
  }, [active, tabs]);

  return (
    <div className="max-w-5xl w-full mx-auto bg-white dark:bg-gray-900 rounded-2xl shadow dark:shadow-black/40 border border-transparent dark:border-white/10 overflow-hidden my-8">

      {/* --- Tab Headers (scrollable) --- */}
      <div className="relative overflow-x-auto scrollbar-hide">
        <div className="flex border-b border-gray-200 dark:border-white/10 relative">
          {tabs.map((tab, index) => {
            const TabIcon = tab.icon || DEFAULT_ICONS[tab.label] || Circle;
            const isActive = active === index;
            return (
              <button
                key={index}
                ref={(el) => (tabRefs.current[index] = el)}
                onClick={() => setActive(index)}
                className={`flex-1 flex items-center justify-center gap-1.5 whitespace-nowrap py-3 px-4 text-center font-medium text-sm transition-colors duration-200
                  ${
                    isActive
                      ? "text-[var(--accent)]"
                      : "text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200"
                  }`}
              >
                <TabIcon size={15} className={isActive ? "text-[var(--accent)]" : "opacity-70"} />
                {tab.label}
              </button>
            );
          })}

          {/* Animated underline */}
          <span
            className="absolute bottom-0 h-0.5 rounded-full transition-all duration-300 ease-out"
            style={{ ...underlineStyle, backgroundColor: "var(--accent)" }}
          />
        </div>
      </div>

      {/* --- Tab Body --- */}
      <div className="p-6">
        <div key={active} className="tab-fade text-black dark:text-white">
          {tabs[active]?.content}
        </div>
      </div>

      <style>{`
        .scrollbar-hide::-webkit-scrollbar { display: none; }
        .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }

        @keyframes tab-fade-in {
          from { opacity: 0; transform: translateY(4px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .tab-fade {
          animation: tab-fade-in 0.25s ease-out both;
        }
        @media (prefers-reduced-motion: reduce) {
          .tab-fade { animation: none; }
        }
      `}</style>
    </div>
  );
}