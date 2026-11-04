
import { useEffect, useState } from "react";
import TopBar from "../components/TopBar";
const FALLBACK = {
  title: "Your stays and guests, all in one place",
  subtitle:
    "Review upcoming bookings, keep your guest list current and update your details without leaving this page.",
  cta_label: "",
  cta_url: "",
  images: [],
};

function Frame({ image, index, className = "" }) {
  return (
    <div
      className={`relative overflow-hidden bg-gray-100 dark:bg-gray-800 animate-[heroReveal_0.7s_ease-out_both] motion-reduce:animate-none ${className}`}
      style={{ animationDelay: `${index * 120}ms` }}
    >
      {image?.image ? (
        <img
          src={image.image}
          alt={image.alt || ""}
          loading="lazy"
          className="h-full w-full object-cover"
        />
      ) : (
        <div
          className="flex h-full w-full items-center justify-center"
          style={{
            background:
              "linear-gradient(135deg, color-mix(in srgb, var(--accent) 22%, transparent), color-mix(in srgb, var(--accent) 6%, transparent))",
            color: "var(--accent)",
          }}
          aria-hidden="true"
        >
          <svg
            width="28"
            height="28"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            opacity="0.7"
          >
            <rect x="3" y="4" width="18" height="16" rx="3" />
            <circle cx="9" cy="10" r="1.5" />
            <path d="M21 16l-5-5-8 9" />
          </svg>
        </div>
      )}
    </div>
  );
}

export default function Dashboard({ onCtaClick }) {
  const [data, setData] = useState(null);

  useEffect(() => {
    const controller = new AbortController();

    fetch("/api/dashboard/", {
      credentials: "include",
      signal: controller.signal,
    })
      .then((res) => (res.ok ? res.json() : Promise.reject(res.status)))
      .then(setData)
      .catch((err) => {
        if (err?.name !== "AbortError") setData(FALLBACK);
      });

    return () => controller.abort();
  }, []);

  const hero = data;
  const [main, topSide, bottomSide] = hero?.images ?? [];
  const showCta = hero?.cta_label && (hero.cta_url || onCtaClick);

  const ctaClass =
    "inline-flex items-center rounded-xl px-6 py-3 text-sm font-medium text-white shadow-sm transition hover:brightness-110 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[var(--accent)] dark:focus-visible:ring-offset-gray-900";

  return (
    
    <section className="relative mb-6 overflow-hidden rounded-3xl bg-white shadow dark:bg-gray-900 dark:shadow-black/30">
      {/* soft accent glow, sits behind everything */}
      <TopBar/>
      <div
        className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full blur-3xl"
        style={{ backgroundColor: "color-mix(in srgb, var(--accent) 18%, transparent)" }}
        aria-hidden="true"
      />

      <div className="relative grid items-center gap-10 px-6 py-10 md:grid-cols-[1.1fr_1fr] md:px-12 md:py-14">
        {/* Text */}
        <div className="max-w-lg">
          {hero ? (
            <>
              <h2 className="text-3xl font-semibold leading-tight tracking-tight text-gray-900 dark:text-gray-100 md:text-4xl">
                {hero.title}
              </h2>

              {hero.subtitle && (
                <p className="mt-4 text-base leading-relaxed text-gray-600 dark:text-gray-400">
                  {hero.subtitle}
                </p>
              )}

              {showCta && (
                <div className="mt-8">
                  {hero.cta_url ? (
                    <a
                      href={hero.cta_url}
                      className={ctaClass}
                      style={{ backgroundColor: "var(--accent)" }}
                    >
                      {hero.cta_label}
                    </a>
                  ) : (
                    <button
                      type="button"
                      onClick={onCtaClick}
                      className={ctaClass}
                      style={{ backgroundColor: "var(--accent)" }}
                    >
                      {hero.cta_label}
                    </button>
                  )}
                </div>
              )}
            </>
          ) : (
            <div className="animate-pulse space-y-4" aria-hidden="true">
              <div className="h-9 w-4/5 rounded-lg bg-gray-200 dark:bg-gray-800" />
              <div className="h-9 w-3/5 rounded-lg bg-gray-200 dark:bg-gray-800" />
              <div className="h-4 w-full rounded bg-gray-200 dark:bg-gray-800" />
              <div className="h-4 w-2/3 rounded bg-gray-200 dark:bg-gray-800" />
            </div>
          )}
        </div>

        {/* Image mosaic */}
        <div className="relative mx-auto w-full max-w-md md:max-w-none">
          <div className="grid grid-cols-5 grid-rows-2 gap-3 md:gap-4">
            <div className="relative col-span-3 row-span-2">
              {/* offset accent frame */}
              <div
                className="absolute inset-0 translate-x-2 translate-y-2 rounded-[2rem] border-2 opacity-70"
                style={{ borderColor: "var(--accent)" }}
                aria-hidden="true"
              />
              <Frame image={main} index={0} className="relative h-full min-h-[18rem] rounded-[2rem]" />
            </div>
            <Frame image={topSide} index={1} className="col-span-2 aspect-square rounded-2xl" />
            <Frame image={bottomSide} index={2} className="col-span-2 aspect-square rounded-full" />
          </div>
        </div>
      </div>

      <style>{`
        @keyframes heroReveal {
          from { opacity: 0; transform: scale(0.96); }
          to { opacity: 1; transform: scale(1); }
        }
      `}</style>
    </section>
  );
}

