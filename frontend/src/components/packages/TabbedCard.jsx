import { useState, useRef, useEffect } from "react";

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
    <div className="max-w-5xl w-full mx-auto bg-white rounded-2xl shadow overflow-hidden my-8">
      
      {/* --- Tab Headers (scrollable) --- */}
      <div className="relative overflow-x-auto scrollbar-hide">
        <div className="flex border-b border-gray-200 relative">
          {tabs.map((tab, index) => (
            <button
              key={index}
              ref={(el) => (tabRefs.current[index] = el)}
              onClick={() => setActive(index)}
              className={`flex-1 whitespace-nowrap py-3 px-4 text-center font-medium text-sm 
                ${active === index ? "text-blue-600" : "text-gray-600 hover:text-gray-800"}`}
            >
              {tab.label}
            </button>
          ))}

          {/* Animated underline */}
          <span
            className="absolute bottom-0 h-1 bg-blue-600 transition-all duration-300 ease-out"
            style={underlineStyle}
          />
        </div>
      </div>

      {/* --- Tab Body --- */}
      <div className="p-6">
        {tabs[active]?.content}
      </div>
    </div>
  );
}
