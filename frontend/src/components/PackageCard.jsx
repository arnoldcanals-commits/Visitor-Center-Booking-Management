import { useNavigate } from "react-router-dom";
import { useRef, useState } from "react";
import { Star, ArrowRight, MapPin } from "lucide-react";
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
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;

    const rotateY = ((x - centerX) / centerX) * 8;
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
        rounded-[1.75rem]
        overflow-hidden
        shadow-[0_8px_30px_rgba(0,0,0,0.08)]
        bg-white/20 dark:bg-gray-900/80 dark:text-white text-black
        backdrop-blur-lg
        border border-white/30 dark:border-white/10
        transition-all duration-300 ease-out
        hover:shadow-[0_20px_45px_rgba(0,0,0,0.16)]
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

      {/* Image */}
      <div className="w-full aspect-[4/3] overflow-hidden flex-shrink-0 relative">
        <img
          src={imageUrl}
          alt={pkg.name}
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
        />
        {/* Rating pill floating on image, softer than inline text */}
        <div
          className="
            absolute top-3 right-3
            flex items-center gap-1
            px-2.5 py-1
            rounded-full
            text-xs font-medium
            bg-white/70 dark:bg-black/50
            backdrop-blur-md
            shadow-sm
          "
        >
          <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
          {pkg.average_rating}
        </div>
      </div>

      {/* Content */}
      <div className="p-4 relative flex flex-col flex-1">
        <h3 className="text-lg font-semibold line-clamp-1">{pkg.name}</h3>

        <p className="flex items-start gap-1.5 text-gray-600 dark:text-gray-300 text-sm mt-1 line-clamp-2 min-h-[2.5rem]">
          <MapPin className="w-3.5 h-3.5 mt-0.5 flex-shrink-0 opacity-60" />
          {pkg.short_description}
        </p>

        <div className="flex items-center justify-between mt-4 pt-2 flex-1 items-end">
          <span className="text-xl font-bold">₱{pkg.base_price}</span>

          <button
            className="
              group/btn
              flex items-center gap-1.5
              px-3.5 py-1.5
              rounded-xl
              text-sm font-medium text-white
              bg-[var(--accent)]
              shadow-sm
              transition-all duration-200 ease-out
              hover:bg-[color-mix(in_srgb,var(--accent)_85%,black)]
              active:bg-[color-mix(in_srgb,var(--accent)_70%,black)]
              active:scale-[0.97]
              dark:bg-[color-mix(in_srgb,var(--accent)_90%,white)]
              dark:hover:bg-[color-mix(in_srgb,var(--accent)_75%,white)]
              dark:active:bg-[color-mix(in_srgb,var(--accent)_60%,white)]
            "
            onClick={() => navigate(`/packages/${pkg.id}`)}
          >
            View Package
            <ArrowRight className="w-3.5 h-3.5 transition-transform duration-200 group-hover/btn:translate-x-0.5" />
          </button>
        </div>
      </div>
    </div>
  );
}