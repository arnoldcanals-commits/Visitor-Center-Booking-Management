import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { ArrowLeft } from "lucide-react";
import api from "../api";
import TopBar from "../components/TopBar";
import { setIfChanged, useLiveRefresh } from "../hooks/useLiveRefresh";

function ArticleBody({ content }) {
  const editor = useEditor({
    extensions: [StarterKit],
    content,
    editable: false,
    editorProps: {
      attributes: {
        class:
          "prose prose-lg max-w-none text-slate-700 dark:prose-invert dark:text-slate-300 prose-headings:tracking-tight prose-a:text-[var(--accent)] prose-img:rounded-2xl",
      },
    },
  }, [content]);

  return <EditorContent editor={editor} />;
}

// Collects plain text from either an HTML string or TipTap/ProseMirror JSON.
function extractText(content) {
  if (!content) return "";
  if (typeof content === "string") return content.replace(/<[^>]*>/g, " ");
  if (typeof content === "object") {
    const own = typeof content.text === "string" ? content.text : "";
    const children = Array.isArray(content.content)
      ? content.content.map(extractText).join(" ")
      : "";
    return `${own} ${children}`;
  }
  return "";
}

function readingTime(content) {
  const words = extractText(content).split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(words / 220));
}

export default function ArticleDetail() {
  const { slug } = useParams();
  const [article, setArticle] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchArticle = useCallback(async ({ background = false, signal } = {}) => {
    if (!background) {
      setLoading(true);
      setArticle(null);
      setError("");
    }

    try {
      const { data } = await api.get(
        `/api/articles/${encodeURIComponent(slug)}/`,
        {
          signal,
          suppressGlobalApiError: true,
        }
      );
      setIfChanged(setArticle, data);
      setError("");
    } catch (requestError) {
      if (requestError.name === "AbortError" || requestError.code === "ERR_CANCELED") {
        return;
      }
      if (background && requestError.response?.status !== 404) {
        console.warn("Unable to refresh article:", requestError);
        return;
      }

      setArticle(null);
      setError(
        requestError.response?.status === 404
          ? "This article is unavailable or is no longer published."
          : "Unable to load this article. Please try again."
      );
    } finally {
      if (!background) setLoading(false);
    }
  }, [slug]);

  useEffect(() => {
    const controller = new AbortController();
    void fetchArticle({ signal: controller.signal });
    return () => controller.abort();
  }, [fetchArticle]);

  useLiveRefresh(
    () => fetchArticle({ background: true }),
    { enabled: Boolean(slug) }
  );

  const minutes = useMemo(
    () => (article ? readingTime(article.content) : 0),
    [article]
  );

  return (
    <div className="min-h-full">
      <TopBar />
      <main className="mx-auto max-w-7xl px-5 pb-24 pt-8 sm:px-8 sm:pt-12">
        <Link
          to="/dashboard"
          className="inline-flex items-center gap-2 text-sm font-semibold text-slate-500 transition hover:text-[var(--accent)] dark:text-slate-400"
        >
          <ArrowLeft size={17} aria-hidden="true" />
          Back to dashboard
        </Link>

        {loading ? (
          <div className="mt-12 animate-pulse" aria-label="Loading article">
            <div className="mx-auto max-w-3xl space-y-5">
              <div className="h-4 w-40 rounded bg-slate-200 dark:bg-slate-800" />
              <div className="h-12 w-4/5 rounded-lg bg-slate-200 dark:bg-slate-800" />
              <div className="h-5 w-2/3 rounded bg-slate-200 dark:bg-slate-800" />
            </div>
            <div className="mt-10 aspect-[16/8] rounded-2xl bg-slate-200 dark:bg-slate-800" />
            <div className="mx-auto mt-12 max-w-3xl space-y-3">
              <div className="h-4 w-full rounded bg-slate-200 dark:bg-slate-800" />
              <div className="h-4 w-11/12 rounded bg-slate-200 dark:bg-slate-800" />
              <div className="h-4 w-10/12 rounded bg-slate-200 dark:bg-slate-800" />
            </div>
          </div>
        ) : error ? (
          <section className="mt-8 rounded-3xl border border-slate-200 bg-white p-8 dark:border-slate-700 dark:bg-slate-900">
            <h1 className="text-xl font-bold text-slate-900 dark:text-white">
              Article not available
            </h1>
            <p role="alert" className="mt-2 text-sm text-slate-600 dark:text-slate-300">
              {error}
            </p>
            <Link
              to="/dashboard"
              className="mt-5 inline-flex rounded-xl bg-[var(--accent)] px-4 py-2.5 text-sm font-semibold text-white hover:brightness-95"
            >
              Return to dashboard
            </Link>
          </section>
        ) : article ? (
          <article className="mt-8 rounded-3xl border-b-[3px] border-r-[3px] border-[var(--accent)] bg-white px-6 py-10 shadow-[7px_7px_0_0_color-mix(in_srgb,var(--accent)_22%,transparent),0_30px_60px_-20px_color-mix(in_srgb,var(--accent)_30%,transparent)] dark:bg-slate-900 dark:shadow-[7px_7px_0_0_color-mix(in_srgb,var(--accent)_14%,transparent),0_24px_48px_-24px_rgba(0,0,0,0.6)] sm:mt-10 sm:px-12 sm:py-14">
            {/* 1. Title block: meta, title, summary */}
            <header className="mx-auto max-w-3xl">
              <div className="mb-5 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm font-semibold text-[var(--accent)]">
                <span>Visitor Center Article</span>
                {article.published_at && (
                  <>
                    <span aria-hidden="true" className="text-slate-300 dark:text-slate-600">
                      •
                    </span>
                    <time
                      dateTime={article.published_at}
                      className="font-medium text-slate-500 dark:text-slate-400"
                    >
                      {new Date(article.published_at).toLocaleDateString(undefined, {
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                      })}
                    </time>
                  </>
                )}
                {minutes > 0 && (
                  <>
                    <span aria-hidden="true" className="text-slate-300 dark:text-slate-600">
                      •
                    </span>
                    <span className="font-medium text-slate-500 dark:text-slate-400">
                      {minutes} min read
                    </span>
                  </>
                )}
              </div>

              <h1 className="text-balance text-4xl font-bold leading-[1.1] tracking-tight text-slate-950 dark:text-white sm:text-5xl lg:text-6xl">
                {article.title}
              </h1>

              {article.summary && (
                <p className="mt-6 text-xl leading-9 text-slate-500 dark:text-slate-400">
                  {article.summary}
                </p>
              )}
            </header>

            {/* 2. Image: wider than the text column, with its own frame */}
            {article.cover_image && (
              <figure className="mt-10 sm:mt-14">
                <img
                  src={article.cover_image}
                  // Caption below carries the description, so avoid reading it twice.
                  alt={article.cover_image_alt ? "" : "Article cover"}
                  className="max-h-[34rem] w-full rounded-2xl object-cover shadow-lg shadow-slate-900/10 ring-1 ring-slate-900/5 dark:shadow-black/30 dark:ring-white/10"
                />
                {article.cover_image_alt && (
                  <figcaption className="mx-auto mt-4 max-w-3xl text-center text-sm text-slate-500 dark:text-slate-400">
                    {article.cover_image_alt}
                  </figcaption>
                )}
              </figure>
            )}

            {/* 3. Body: constrained reading width */}
            <div className="mx-auto mt-12 max-w-3xl border-t border-slate-200 pt-10 dark:border-slate-800 sm:mt-16 sm:pt-12">
              <ArticleBody content={article.content} />
            </div>
          </article>
        ) : null}
      </main>
    </div>
  );
}