import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  BookOpen,
  ChevronLeft,
  ChevronRight,
  Pause,
  Play,
} from "lucide-react";
import api from "../api";
import { setIfChanged, useLiveRefresh } from "../hooks/useLiveRefresh";

const ROTATE_MS = 6500;

const CONTROL_CLASS =
  "rounded-full border border-slate-200 bg-white p-2.5 text-slate-600 transition hover:border-[var(--accent)] hover:text-[var(--accent)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300";

export default function ArticleCarousel() {
  const [articles, setArticles] = useState([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [hovering, setHovering] = useState(false);
  const [focused, setFocused] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);

  const loadArticles = useCallback(async ({ signal } = {}) => {
    try {
      const { data } = await api.get("/api/articles/", {
        signal,
        suppressGlobalApiError: true,
      });
      const published = Array.isArray(data) ? data : data.results || [];
      setIfChanged(setArticles, published);
    } catch (error) {
      if (error?.name !== "AbortError" && error?.code !== "ERR_CANCELED") {
        console.warn("Unable to load published articles:", error);
      }
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    void loadArticles({ signal: controller.signal });
    return () => controller.abort();
  }, [loadArticles]);

  useLiveRefresh(loadArticles);

  useEffect(() => {
    if (activeIndex >= articles.length) setActiveIndex(0);
  }, [activeIndex, articles.length]);

  // Respect the visitor's reduced-motion setting: no auto-rotation.
  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReducedMotion(query.matches);
    update();
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);

  const rotating =
    articles.length > 1 && !paused && !hovering && !focused && !reducedMotion;

  useEffect(() => {
    if (!rotating) return undefined;
    const interval = window.setInterval(() => {
      setActiveIndex((index) => (index + 1) % articles.length);
    }, ROTATE_MS);
    return () => window.clearInterval(interval);
  }, [articles.length, rotating, activeIndex]);

  if (articles.length === 0) return null;

  const article = articles[activeIndex];
  const previous = () =>
    setActiveIndex((index) => (index - 1 + articles.length) % articles.length);
  const next = () => setActiveIndex((index) => (index + 1) % articles.length);

  return (
    <section
      aria-label="Featured articles"
      aria-roledescription="carousel"
      className="border-t border-slate-200 px-6 py-10 dark:border-slate-800 sm:px-10 md:px-12 md:py-12 lg:px-16"
      onMouseEnter={() => setHovering(true)}
      onMouseLeave={() => setHovering(false)}
      onFocus={() => setFocused(true)}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) setFocused(false);
      }}
    >
      <div className="mb-6 flex items-center gap-4 sm:gap-5">
        <h2 className="shrink-0 text-2xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-3xl">
          Latest reads
        </h2>
        <span
          className="h-px flex-1 bg-slate-200 dark:bg-slate-800"
          aria-hidden="true"
        />

        {articles.length > 1 && (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setPaused((value) => !value)}
              aria-label={paused ? "Resume article rotation" : "Pause article rotation"}
              className={CONTROL_CLASS}
            >
              {paused ? <Play size={16} /> : <Pause size={16} />}
            </button>
            <button
              type="button"
              onClick={previous}
              aria-label="Previous article"
              className={CONTROL_CLASS}
            >
              <ChevronLeft size={18} />
            </button>
            <button
              type="button"
              onClick={next}
              aria-label="Next article"
              className={CONTROL_CLASS}
            >
              <ChevronRight size={18} />
            </button>
          </div>
        )}
      </div>

      <Link
        to={`/articles/${article.slug}`}
        aria-label={`Read article: ${article.title}`}
        aria-live={rotating ? "off" : "polite"}
        className="group block overflow-hidden rounded-2xl border border-slate-200 bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2 dark:border-slate-800 dark:bg-slate-800/40 dark:focus-visible:ring-offset-slate-900"
      >
        {/* Keyed so each article fades in instead of snapping. */}
        <div
          key={article.id}
          className="grid animate-[carouselFade_0.45s_ease-out_both] gap-5 p-4 motion-reduce:animate-none sm:p-5 lg:min-h-[24rem] lg:grid-cols-[0.9fr_1.1fr] lg:gap-8"
        >
          <div className="relative min-h-56 overflow-hidden rounded-2xl bg-slate-100 shadow-md shadow-slate-900/10 ring-1 ring-slate-900/5 dark:bg-slate-800 dark:shadow-black/30 dark:ring-white/10 sm:min-h-72 lg:min-h-0">
            {article.cover_image ? (
              <img
                src={article.cover_image}
                alt={article.cover_image_alt || ""}
                className="absolute inset-0 h-full w-full object-cover"
              />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center text-slate-300 dark:text-slate-600">
                <BookOpen size={52} strokeWidth={1.2} aria-hidden="true" />
              </div>
            )}
          </div>

          <div className="flex min-w-0 flex-col justify-center px-2 py-3 sm:px-4 lg:py-8 lg:pr-8">
            {article.published_at && (
              <time
                dateTime={article.published_at}
                className="text-sm font-medium text-slate-500 dark:text-slate-400"
              >
                {new Date(article.published_at).toLocaleDateString(undefined, {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </time>
            )}
            <h3 className="mt-3 line-clamp-3 text-balance text-2xl font-bold leading-tight tracking-tight text-slate-900 transition-colors group-hover:text-[var(--accent)] dark:text-white sm:text-3xl">
              {article.title}
            </h3>
            {article.summary && (
              <p className="mt-4 line-clamp-3 max-w-2xl text-base leading-7 text-slate-600 dark:text-slate-300">
                {article.summary}
              </p>
            )}
            <span className="mt-7 inline-flex items-center gap-2 text-sm font-bold text-[var(--accent)]">
              Read the full article
              <ArrowRight
                size={17}
                className="transition-transform group-hover:translate-x-1"
                aria-hidden="true"
              />
            </span>
          </div>
        </div>
      </Link>

      {articles.length > 1 && (
        <div
          role="group"
          aria-label="Choose article"
          className="mt-5 flex justify-center gap-1"
        >
          {articles.map((item, index) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setActiveIndex(index)}
              aria-label={`Show article ${index + 1}: ${item.title}`}
              aria-current={index === activeIndex ? "true" : undefined}
              className="group/dot rounded-full p-1.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
            >
              <span
                className={`block h-1.5 rounded-full transition-all ${
                  index === activeIndex
                    ? "w-8 bg-[var(--accent)]"
                    : "w-2 bg-slate-300 group-hover/dot:bg-slate-400 dark:bg-slate-700 dark:group-hover/dot:bg-slate-500"
                }`}
              />
            </button>
          ))}
        </div>
      )}

      <style>{`
        @keyframes carouselFade {
          from { opacity: 0; }
          to { opacity: 1; }
        }
      `}</style>
    </section>
  );
}