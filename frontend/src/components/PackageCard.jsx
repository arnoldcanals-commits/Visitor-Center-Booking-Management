import { useNavigate } from "react-router-dom";
import { useRef, useState } from "react";
import "../styles/Home.css";

export default function PackageCard({ pkg }) {
  const navigate = useNavigate();
  const cardRef = useRef(null);
  const [style, setStyle] = useState({});

  const imageUrl = pkg.images?.length
    ? `${import.meta.env.VITE_API_URL}${pkg.images[0].image}`
    : "https://via.placeholder.com/300x200";

  const handleMouseMove = (e) => {
    const card = cardRef.current;
    const rect = card.getBoundingClientRect();
    const x = e.clientX - rect.left; // cursor X within card
    const y = e.clientY - rect.top;  // cursor Y within card
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;

    const rotateY = ((x - centerX) / centerX) * 8; // tilt max 8deg
    const rotateX = ((centerY - y) / centerY) * 8;

    setStyle({
      transform: `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg)`,
    });
  };

  const handleMouseLeave = () => {
    setStyle({
      transform: `perspective(1000px) rotateX(0deg) rotateY(0deg)`,
    });
  };

  return (
    <div
      ref={cardRef}
      className="
        relative
        w-full
        h-full
        flex
        flex-col
        rounded-2xl
        overflow-hidden
        shadow-md
        bg-white/20
        backdrop-blur-lg
        border border-white/30
        transition-transform duration-300
        hover:shadow-xl
        group
      "
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      style={style}
    >
      {/* Glass shine overlay */}
      <div
        className="
          pointer-events-none
          absolute
          inset-0
          -translate-x-full
          bg-gradient-to-r
          from-transparent
          via-white/40
          to-transparent
          skew-x-[-20deg]
          transition-transform
          duration-700
          group-hover:translate-x-full
        "
      />

      {/* Image — fixed aspect ratio box, crops any source size consistently.
          aspect-[4/3] scales with card width but keeps ratio locked so
          the image block is always the same shape regardless of the
          original picture's dimensions. */}
      <div className="w-full aspect-[4/3] overflow-hidden flex-shrink-0">
        <img
          src={imageUrl}
          alt={pkg.name}
          className="w-full h-full object-cover"
        />
      </div>

      {/* Content — flex-1 makes this fill remaining card height,
          and justify-between pins price/button to the bottom
          regardless of how long the title/description are. */}
      <div className="p-4 relative flex flex-col flex-1">
        <h3 className="text-lg font-semibold line-clamp-1">
          {pkg.name} ★{pkg.average_rating}
        </h3>
        <p className="text-gray-600 text-sm mt-1 line-clamp-2 min-h-[2.5rem]">
          {pkg.short_description}
        </p>

        <div className="flex items-center justify-between mt-4 pt-2 flex-1 items-end">
          <span className="text-xl font-bold">₱{pkg.base_price}</span>

          <button
            className="px-3 py-1.5 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 transition-colors duration-200"
            onClick={() => navigate(`/packages/${pkg.id}`)}
          >
            View Package
          </button>
        </div>
      </div>
    </div>
  );
}