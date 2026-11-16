import { useCallback, useEffect, useMemo, useState } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { BookOpen, Image as ImageIcon, Pencil, Plus, Trash2 } from "lucide-react";
import api from "../../api";

const ARTICLE_URL = "api/site_admin/articles/";
const EMPTY_CONTENT = { type: "doc", content: [{ type: "paragraph" }] };

const errorMessage = (error) => {
  const data = error?.response?.data;
  if (typeof data === "string") return data;
  if (data && typeof data === "object") {
    return Object.entries(data)
      .map(([field, messages]) => `${field}: ${[].concat(messages).join(" ")}`)
      .join(" · ");
  }
  return error?.message || "Something went wrong. Please try again.";
};

function ArticleEditor({ article, onSave, onCancel, busy }) {
  const [title, setTitle] = useState(article.title || "");
  const [summary, setSummary] = useState(article.summary || "");
  const [coverAlt, setCoverAlt] = useState(article.cover_image_alt || "");
  const [isActive, setIsActive] = useState(Boolean(article.is_active));
  const [coverFile, setCoverFile] = useState(null);
  const [removeCover, setRemoveCover] = useState(false);

  const editor = useEditor({
    extensions: [StarterKit],
    content: article.content || EMPTY_CONTENT,
    editorProps: {
      attributes: {
        class:
          "prose prose-sm max-w-none min-h-[260px] p-5 text-slate-700 focus:outline-none dark:prose-invert dark:text-slate-200",
      },
    },
  });

  const coverPreview = useMemo(
    () => (coverFile ? URL.createObjectURL(coverFile) : null),
    [coverFile]
  );

  useEffect(
    () => () => {
      if (coverPreview) URL.revokeObjectURL(coverPreview);
    },
    [coverPreview]
  );

  const toolbar = [
    {
      label: "B",
      title: "Bold",
      active: editor?.isActive("bold"),
      action: () => editor?.chain().focus().toggleBold().run(),
    },
    {
      label: "I",
      title: "Italic",
      active: editor?.isActive("italic"),
      action: () => editor?.chain().focus().toggleItalic().run(),
    },
    {
      label: "H2",
      title: "Heading 2",
      active: editor?.isActive("heading", { level: 2 }),
      action: () => editor?.chain().focus().toggleHeading({ level: 2 }).run(),
    },
    {
      label: "H3",
      title: "Heading 3",
      active: editor?.isActive("heading", { level: 3 }),
      action: () => editor?.chain().focus().toggleHeading({ level: 3 }).run(),
    },
    {
      label: "• List",
      title: "Bullet list",
      active: editor?.isActive("bulletList"),
      action: () => editor?.chain().focus().toggleBulletList().run(),
    },
    {
      label: "1. List",
      title: "Ordered list",
      active: editor?.isActive("orderedList"),
      action: () => editor?.chain().focus().toggleOrderedList().run(),
    },
    {
      label: "Quote",
      title: "Block quote",
      active: editor?.isActive("blockquote"),
      action: () => editor?.chain().focus().toggleBlockquote().run(),
    },
  ];

  const submit = (event) => {
    event.preventDefault();
    onSave({
      title: title.trim(),
      summary: summary.trim(),
      coverAlt: coverAlt.trim(),
      isActive,
      content: editor?.getJSON() || article.content || EMPTY_CONTENT,
      coverFile,
      removeCover: removeCover && !coverFile,
    });
  };

  return (
    <form onSubmit={submit} className="space-y-7 p-5 sm:p-8">
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_18rem]">
        <div className="space-y-5">
          <label className="block">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Article title
            </span>
            <input
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              required
              maxLength={200}
              className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-lg font-semibold text-slate-900 outline-none focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent)]/20 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
            />
          </label>

          <label className="block">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Short description
            </span>
            <textarea
              value={summary}
              onChange={(event) => setSummary(event.target.value)}
              required
              maxLength={400}
              rows={3}
              className="mt-2 w-full resize-y rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 outline-none focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent)]/20 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
            />
            <span className="mt-1 block text-right text-xs text-slate-400">
              {summary.length}/400
            </span>
          </label>

          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Article body
            </span>
            <div className="mt-2 overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900">
              <div className="flex flex-wrap gap-1 border-b border-slate-200 bg-slate-50 p-2 dark:border-slate-700 dark:bg-slate-800">
                {toolbar.map((button) => (
                  <button
                    key={button.label}
                    type="button"
                    title={button.title}
                    aria-pressed={Boolean(button.active)}
                    disabled={!editor}
                    onClick={button.action}
                    className={`rounded-lg px-2.5 py-1.5 text-xs font-semibold transition ${
                      button.active
                        ? "bg-[var(--accent)] text-white"
                        : "text-slate-600 hover:bg-slate-200 dark:text-slate-300 dark:hover:bg-slate-700"
                    }`}
                  >
                    {button.label}
                  </button>
                ))}
              </div>
              <EditorContent editor={editor} />
            </div>
          </div>
        </div>

        <aside className="space-y-4">
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-800/60">
            {coverPreview || (!removeCover && article.cover_image) ? (
              <img
                src={coverPreview || article.cover_image}
                alt={coverAlt || title}
                className="aspect-[4/3] w-full object-cover"
              />
            ) : (
              <div className="flex aspect-[4/3] items-center justify-center text-slate-300 dark:text-slate-600">
                <ImageIcon size={34} />
              </div>
            )}
            <div className="space-y-3 p-4">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Cover image (optional)
                <input
                  type="file"
                  accept="image/*"
                  onChange={(event) => {
                    setCoverFile(event.target.files?.[0] || null);
                    setRemoveCover(false);
                  }}
                  className="mt-2 block w-full text-sm font-normal normal-case tracking-normal text-slate-600 file:mr-3 file:rounded-lg file:border-0 file:bg-[var(--accent)]/10 file:px-3 file:py-2 file:text-xs file:font-bold file:text-[var(--accent)] hover:file:bg-[var(--accent)]/20 dark:text-slate-300"
                />
              </label>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Image description
                <input
                  value={coverAlt}
                  onChange={(event) => setCoverAlt(event.target.value)}
                  maxLength={200}
                  placeholder="Describe the image"
                  className="mt-2 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-normal normal-case tracking-normal text-slate-700 outline-none focus:border-[var(--accent)] dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
                />
              </label>
              {article.cover_image && (
                <label className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-300">
                  <input
                    type="checkbox"
                    checked={removeCover}
                    onChange={(event) => setRemoveCover(event.target.checked)}
                    className="rounded border-slate-300 text-[var(--accent)] focus:ring-[var(--accent)]"
                  />
                  Remove current cover image
                </label>
              )}
            </div>
          </div>

          <label className="flex items-center justify-between gap-4 rounded-2xl border border-slate-200 p-4 dark:border-slate-700">
            <span>
              <span className="block text-sm font-semibold text-slate-800 dark:text-slate-100">
                Publish article
              </span>
              <span className="mt-1 block text-xs text-slate-500 dark:text-slate-400">
                Drafts stay hidden from visitors.
              </span>
            </span>
            <input
              type="checkbox"
              checked={isActive}
              onChange={(event) => setIsActive(event.target.checked)}
              className="h-5 w-5 rounded border-slate-300 text-[var(--accent)] focus:ring-[var(--accent)]"
            />
          </label>
        </aside>
      </div>

      <div className="flex flex-wrap justify-end gap-3 border-t border-slate-100 pt-5 dark:border-slate-800">
        <button
          type="button"
          onClick={onCancel}
          disabled={busy}
          className="rounded-xl border border-slate-200 px-5 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={busy || !editor}
          className="rounded-xl bg-[var(--accent)] px-6 py-2.5 text-sm font-semibold text-white shadow-sm hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {busy ? "Saving..." : isActive ? "Save and publish" : "Save draft"}
        </button>
      </div>
    </form>
  );
}

export default function ArticleManager() {
  const [articles, setArticles] = useState([]);
  const [editing, setEditing] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const loadArticles = useCallback(async () => {
    try {
      const { data } = await api.get(ARTICLE_URL);
      setArticles(Array.isArray(data) ? data : data.results || []);
      setError("");
    } catch (requestError) {
      setError(errorMessage(requestError));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadArticles();
  }, [loadArticles]);

  const saveArticle = async (values) => {
    setBusy(true);
    setError("");

    try {
      let payload = {
        title: values.title,
        summary: values.summary,
        content: values.content,
        cover_image_alt: values.coverAlt,
        is_active: values.isActive,
      };

      if (values.coverFile) {
        const formData = new FormData();
        Object.entries(payload).forEach(([key, value]) => {
          formData.append(
            key,
            key === "content" ? JSON.stringify(value) : String(value)
          );
        });
        formData.append("cover_image", values.coverFile);
        payload = formData;
      } else if (values.removeCover) {
        payload.cover_image = null;
      }

      const url = editing.id ? `${ARTICLE_URL}${editing.id}/` : ARTICLE_URL;
      const response = editing.id
        ? await api.patch(url, payload)
        : await api.post(url, payload);
      setArticles((current) => {
        const updated = current.filter((item) => item.id !== response.data.id);
        return [response.data, ...updated];
      });
      setEditing(null);
    } catch (requestError) {
      setError(errorMessage(requestError));
    } finally {
      setBusy(false);
    }
  };

  const togglePublished = async (article) => {
    setError("");
    try {
      const { data } = await api.patch(`${ARTICLE_URL}${article.id}/`, {
        is_active: !article.is_active,
      });
      setArticles((current) =>
        current.map((item) => (item.id === data.id ? data : item))
      );
    } catch (requestError) {
      setError(errorMessage(requestError));
    }
  };

  const removeArticle = async (article) => {
    if (!window.confirm(`Remove "${article.title}" from the article list?`)) return;
    setError("");
    try {
      await api.delete(`${ARTICLE_URL}${article.id}/`);
      setArticles((current) => current.filter((item) => item.id !== article.id));
    } catch (requestError) {
      setError(errorMessage(requestError));
    }
  };

  if (loading) {
    return (
      <div className="animate-pulse p-10 text-sm font-semibold text-slate-400">
        Loading articles...
      </div>
    );
  }

  if (editing) {
    return (
      <div>
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-5 py-5 dark:border-slate-800 sm:px-8">
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">
              {editing.id ? "Edit article" : "Create article"}
            </h2>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              Write a story and choose whether it is public or a draft.
            </p>
          </div>
        </div>
        {error && (
          <p role="alert" className="mx-5 mt-5 rounded-xl bg-rose-50 p-4 text-sm text-rose-700 sm:mx-8">
            {error}
          </p>
        )}
        <ArticleEditor
          key={editing.id || "new-article"}
          article={editing}
          onSave={saveArticle}
          onCancel={() => {
            setEditing(null);
            setError("");
          }}
          busy={busy}
        />
      </div>
    );
  }

  return (
    <div className="p-5 sm:p-8">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900 dark:text-white">
            Articles
          </h2>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Published articles appear in the dashboard carousel. Drafts remain private.
          </p>
        </div>
        <button
          type="button"
          onClick={() =>
            setEditing({
              title: "",
              summary: "",
              content: EMPTY_CONTENT,
              cover_image: null,
              cover_image_alt: "",
              is_active: false,
            })
          }
          className="inline-flex items-center gap-2 rounded-xl bg-[var(--accent)] px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:brightness-95"
        >
          <Plus size={17} />
          New article
        </button>
      </div>

      {error && (
        <p role="alert" className="mb-5 rounded-xl bg-rose-50 p-4 text-sm text-rose-700">
          {error}
        </p>
      )}

      {articles.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 px-6 py-14 text-center dark:border-slate-700">
          <BookOpen className="mx-auto mb-3 text-slate-300 dark:text-slate-600" size={34} />
          <p className="font-semibold text-slate-700 dark:text-slate-200">
            No articles yet
          </p>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Create a draft, then publish it when it is ready.
          </p>
        </div>
      ) : (
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {articles.map((article) => (
            <article
              key={article.id}
              className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-800/50"
            >
              <div className="relative aspect-[16/9] bg-slate-100 dark:bg-slate-800">
                {article.cover_image ? (
                  <img
                    src={article.cover_image}
                    alt={article.cover_image_alt || ""}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full items-center justify-center text-slate-300 dark:text-slate-600">
                    <ImageIcon size={32} />
                  </div>
                )}
                <span
                  className={`absolute left-3 top-3 rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-wider ${
                    article.is_active
                      ? "bg-emerald-100 text-emerald-700"
                      : "bg-slate-900/75 text-white"
                  }`}
                >
                  {article.is_active ? "Published" : "Draft"}
                </span>
              </div>
              <div className="p-5">
                <h3 className="line-clamp-2 text-lg font-bold text-slate-900 dark:text-white">
                  {article.title}
                </h3>
                <p className="mt-2 line-clamp-3 min-h-[4.5rem] text-sm leading-6 text-slate-500 dark:text-slate-400">
                  {article.summary}
                </p>
                <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4 dark:border-slate-700">
                  <button
                    type="button"
                    onClick={() => togglePublished(article)}
                    className="text-xs font-bold text-[var(--accent)] hover:underline"
                  >
                    {article.is_active ? "Unpublish" : "Publish"}
                  </button>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => setEditing(article)}
                      aria-label={`Edit ${article.title}`}
                      className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-[var(--accent)] dark:text-slate-400 dark:hover:bg-slate-700"
                    >
                      <Pencil size={16} />
                    </button>
                    <button
                      type="button"
                      onClick={() => removeArticle(article)}
                      aria-label={`Remove ${article.title}`}
                      className="rounded-lg p-2 text-slate-500 hover:bg-rose-50 hover:text-rose-600 dark:text-slate-400 dark:hover:bg-rose-500/10"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
