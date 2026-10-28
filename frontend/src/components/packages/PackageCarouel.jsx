import { useRef, useState, useEffect, useCallback } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

import PackageCard from "../PackageCard";

export default function PackageCarousel({ packages }) {
  const scrollRef = useRef(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const updateArrows = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 4);
    setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 4);
  }, []);

  useEffect(() => {
    updateArrows();
    const el = scrollRef.current;
    if (!el) return;

    el.addEventListener("scroll", updateArrows, { passive: true });

    // ResizeObserver catches container size changes (sidebar toggles,
    // font-size zoom, etc.) that a plain window resize listener misses.
    const ro = new ResizeObserver(updateArrows);
    ro.observe(el);

    return () => {
      el.removeEventListener("scroll", updateArrows);
      ro.disconnect();
    };
  }, [updateArrows, packages]);

  const scrollByCard = (dir) => {
    const el = scrollRef.current;
    if (!el) return;
    const card = el.querySelector("[data-card]");
    const amount = card ? card.offsetWidth + 16 : 300;
    el.scrollBy({ left: dir * amount, behavior: "smooth" });
  };

  const arrowBase = `
    hidden sm:flex
    items-center justify-center
    w-8 h-8 md:w-9 md:h-9
    rounded-full
    text-white shadow-sm
    bg-[var(--accent)]
    transition-all duration-200 ease-out
    hover:bg-[color-mix(in_srgb,var(--accent)_85%,black)]
    active:bg-[color-mix(in_srgb,var(--accent)_70%,black)]
    active:scale-95
    dark:bg-[color-mix(in_srgb,var(--accent)_90%,white)]
    dark:hover:bg-[color-mix(in_srgb,var(--accent)_75%,white)]
    dark:active:bg-[color-mix(in_srgb,var(--accent)_60%,white)]
    disabled:opacity-0 disabled:pointer-events-none
  `;

  return (
    <div className="relative w-full">
      {/* Left arrow — hidden on mobile, where swipe is the natural gesture */}
      <button
        onClick={() => scrollByCard(-1)}
        disabled={!canScrollLeft}
        aria-label="Scroll left"
        className={`${arrowBase} absolute left-0 top-1/2 -translate-y-1/2 -translate-x-1/2 z-10`}
      >
        <ChevronLeft className="w-4 h-4 md:w-5 md:h-5" />
      </button>

      {/* Scroll track */}
      <div
        ref={scrollRef}
        className="
          flex gap-3 sm:gap-4
          overflow-x-auto
          scroll-smooth
          snap-x snap-mandatory
          px-1 py-2
          sm:px-8
          [scrollbar-width:none]
          [&::-webkit-scrollbar]:hidden
        "
      >
        {packages.map((pkg) => (
          <div
            key={pkg.id}
            data-card
            className="
              snap-start flex-shrink-0
              w-[78%]
              xs:w-[65%]
              sm:w-56
              md:w-64
              lg:w-72
              xl:w-80
            "
          >
            <PackageCard pkg={pkg} />
          </div>
        ))}
      </div>

      {/* Right arrow */}
      <button
        onClick={() => scrollByCard(1)}
        disabled={!canScrollRight}
        aria-label="Scroll right"
        className={`${arrowBase} absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/2 z-10`}
      >
        <ChevronRight className="w-4 h-4 md:w-5 md:h-5" />
      </button>
    </div>
  );
}