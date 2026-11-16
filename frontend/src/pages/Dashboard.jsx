import { useCallback, useEffect, useState } from "react";
import TopBar from "../components/TopBar";
import ArticleCarousel from "../components/ArticleCarousel";
import { setIfChanged, useLiveRefresh } from "../hooks/useLiveRefresh";

const FALLBACK = {
  title: "Your stays and guests, all in one place",
  subtitle:
    "Review upcoming bookings, keep your guest list current and update your details without leaving this page.",
  cta_label: "",
  cta_url: "",
  images: [],
};

const CTA_CLASS =
  "inline-flex items-center justify-center gap-2 rounded-xl px-6 py-3.5 text-sm font-semibold text-white shadow-md shadow-slate-900/10 transition duration-200 hover:-translate-y-0.5 hover:brightness-110 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[var(--accent)] dark:focus-visible:ring-offset-slate-900";

function Cta({ label, url, onClick }) {
  const content = (
    <>
      {label}
      <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
        <path
          fillRule="evenodd"
          d="M3 10a.75.75 0 0 1 .75-.75h10.69L10.22 5.03a.75.75 0 1 1 1.06-1.06l5.5 5.5a.75.75 0 0 1 0 1.06l-5.5 5.5a.75.75 0 1 1-1.06-1.06l4.22-4.22H3.75A.75.75 0 0 1 3 10Z"
          clipRule="evenodd"
        />
      </svg>
    </>
  );

  return url ? (
    <a href={url} className={CTA_CLASS} style={{ backgroundColor: "var(--accent)" }}>
      {content}
    </a>
  ) : (
    <button
      type="button"
      onClick={onClick}
      className={CTA_CLASS}
      style={{ backgroundColor: "var(--accent)" }}
    >
      {content}
    </button>
  );
}

/* Tropical blotches that sit behind the hero image.
   Organic border-radius shapes: lagoon, coral, palm leaf, mango. */
function TropicalBlotches() {
  return (
    <div className="pointer-events-none absolute inset-0" aria-hidden="true">
      <div className="absolute -left-5 -top-6 h-3/4 w-3/4 -rotate-6 rounded-[58%_42%_63%_37%/46%_55%_45%_54%] bg-teal-300/70 dark:bg-teal-400/25 sm:-left-8 sm:-top-8" />
      <div className="absolute -bottom-6 -right-4 h-2/3 w-2/3 rotate-6 rounded-[42%_58%_35%_65%/60%_40%_60%_40%] bg-orange-300/80 dark:bg-orange-400/25 sm:-bottom-10 sm:-right-6" />
      <div className="absolute -right-2 -top-8 h-24 w-24 rotate-12 rounded-[100%_0_100%_0] bg-emerald-400/70 dark:bg-emerald-500/25 sm:-right-4 sm:-top-10 sm:h-32 sm:w-32" />
      <div className="absolute -bottom-5 left-4 h-14 w-14 rounded-full bg-amber-300 dark:bg-amber-400/30 sm:left-8 sm:h-[4.5rem] sm:w-[4.5rem]" />
    </div>
  );
}

function HeroImage({ image }) {
  return (
    <div className="relative aspect-[4/3] w-full animate-[heroReveal_0.7s_ease-out_both] overflow-hidden rounded-[2rem] bg-white shadow-xl shadow-slate-900/15 ring-1 ring-slate-900/5 motion-reduce:animate-none dark:bg-slate-800 dark:shadow-black/40 dark:ring-white/10">
      {image?.image ? (
        <img
          src={image.image}
          alt={image.alt || ""}
          className="h-full w-full object-cover"
        />
      ) : (
        <div className="flex h-full w-full items-center justify-center text-slate-300 dark:text-slate-600">
          <svg
            className="h-14 w-14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
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

  const fetchDashboard = useCallback(async ({ background = false, signal } = {}) => {
    try {
      const response = await fetch("/api/dashboard/", {
        credentials: "include",
        signal,
      });
      if (!response.ok) throw new Error(`Dashboard request failed (${response.status}).`);
      setIfChanged(setData, await response.json());
    } catch (err) {
      if (err?.name === "AbortError") return;
      if (!background) setIfChanged(setData, FALLBACK);
      else console.warn("Dashboard live refresh failed:", err);
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    fetchDashboard({ signal: controller.signal });
    return () => controller.abort();
  }, [fetchDashboard]);

  useLiveRefresh(() => fetchDashboard({ background: true }), { enabled: data !== null });

  const hero = data;
  const [main] = hero?.images ?? [];
  const showCta = hero?.cta_label && (hero.cta_url || onCtaClick);

  return (
    <>
      <TopBar />

      <section className="mb-12 mt-6 overflow-hidden rounded-3xl border-b-[3px] border-r-[3px] border-[var(--accent)] bg-white shadow-[7px_7px_0_0_color-mix(in_srgb,var(--accent)_22%,transparent),0_30px_60px_-20px_color-mix(in_srgb,var(--accent)_30%,transparent)] dark:bg-slate-900 dark:shadow-[7px_7px_0_0_color-mix(in_srgb,var(--accent)_14%,transparent),0_24px_48px_-24px_rgba(0,0,0,0.6)]">
        <div className="grid items-center gap-14 px-6 py-12 sm:px-10 md:px-12 md:py-16 lg:grid-cols-2 lg:gap-16 lg:px-16">
          <div className="max-w-xl">
            <p className="text-sm font-semibold text-[var(--accent)]">Visitor Center</p>

            {hero ? (
              <>
                <h1 className="mt-4 text-balance text-4xl font-bold leading-[1.08] tracking-tight text-slate-950 dark:text-white sm:text-5xl xl:text-6xl">
                  {hero.title}
                </h1>

                {hero.subtitle && (
                  <p className="mt-5 text-base leading-7 text-slate-600 dark:text-slate-300 sm:text-lg sm:leading-8">
                    {hero.subtitle}
                  </p>
                )}

                {showCta && (
                  <div className="mt-8">
                    <Cta label={hero.cta_label} url={hero.cta_url} onClick={onCtaClick} />
                  </div>
                )}
              </>
            ) : (
              <div className="mt-6 animate-pulse space-y-4" aria-hidden="true">
                <div className="h-12 w-4/5 rounded-lg bg-slate-200 dark:bg-slate-800" />
                <div className="h-12 w-3/5 rounded-lg bg-slate-200 dark:bg-slate-800" />
                <div className="mt-6 h-4 w-full rounded bg-slate-200 dark:bg-slate-800" />
                <div className="h-4 w-2/3 rounded bg-slate-200 dark:bg-slate-800" />
                <div className="mt-7 h-12 w-40 rounded-xl bg-slate-200 dark:bg-slate-800" />
              </div>
            )}
          </div>

          <div className="relative mx-auto w-full max-w-xl lg:max-w-none">
            <TropicalBlotches />
            <HeroImage image={main} />
          </div>
        </div>

        <ArticleCarousel />
      </section>

      <style>{`
        @keyframes heroReveal {
          from { opacity: 0; transform: scale(0.96); }
          to { opacity: 1; transform: scale(1); }
        }
      `}</style>
    </>
  );
}