// components/SystemSettings/HeroManager.jsx
import { useEffect, useState, useCallback } from "react";
import { ChevronLeft, ChevronRight, ImageOff, Trash2, Upload } from "lucide-react";
// Use the SAME axios instance AdminDataContext uses (the one carrying the
// site_admin token). If that is a different file, change this import.
import api from "../../api";
import EditableField from "./EditableField";

const HERO_URL = "api/site_admin/dashboard/heroes/";
const IMAGE_URL = "api/site_admin/dashboard/images/";
const SLOT_LABELS = ["Main", "Side", "Circle"]; // the hero's three image slots

const errorText = (err) => {
  const data = err?.response?.data;
  if (!data) return err?.message || "Something went wrong";
  if (typeof data === "string") return data.slice(0, 200);
  return Object.entries(data)
    .map(([key, val]) => `${key}: ${[].concat(val).join(" ")}`)
    .join(" · ");
};

export default function HeroManager() {
  const [hero, setHero] = useState(null);
  const [images, setImages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    try {
      const res = await api.get(HERO_URL);
      const list = Array.isArray(res.data) ? res.data : res.data.results ?? [];
      // Same one the public page serves: newest active, else newest overall.
      const current = list.find((h) => h.is_active) ?? list[0] ?? null;
      setHero(current);
      setImages(current?.images ?? []);
    } catch (err) {
      setError(errorText(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const createHero = async () => {
    setBusy(true);
    setError(null);
    try {
      // Created as a draft so placeholder copy never goes live by accident.
      const res = await api.post(HERO_URL, {
        title: "Dashboard hero",
        subtitle: "",
        cta_label: "",
        cta_url: "",
        is_active: false,
      });
      setHero(res.data);
      setImages(res.data.images ?? []);
    } catch (err) {
      setError(errorText(err));
    } finally {
      setBusy(false);
    }
  };

  const patchHero = async (patch) => {
    setError(null);
    try {
      const res = await api.patch(`${HERO_URL}${hero.id}/`, patch);
      setHero(res.data);
    } catch (err) {
      setError(errorText(err));
    }
  };

  const upload = async (e) => {
    const files = Array.from(e.target.files ?? []);
    e.target.value = "";
    if (!hero || files.length === 0) return;

    setBusy(true);
    setError(null);
    try {
      for (const [i, file] of files.entries()) {
        const fd = new FormData();
        fd.append("hero", hero.id);
        fd.append("image", file);
        fd.append("order", images.length + i);
        const res = await api.post(IMAGE_URL, fd, {
          headers: { "Content-Type": "multipart/form-data" },
        });
        setImages((prev) => [...prev, res.data]);
      }
    } catch (err) {
      setError(errorText(err));
    } finally {
      setBusy(false);
    }
  };

  const removeImage = async (id) => {
    if (!window.confirm("Delete this image?")) return;
    try {
      await api.delete(`${IMAGE_URL}${id}/`);
      setImages((prev) => prev.filter((img) => img.id !== id));
    } catch (err) {
      setError(errorText(err));
    }
  };

  const moveImage = async (index, dir) => {
    const target = index + dir;
    if (target < 0 || target >= images.length) return;

    const next = [...images];
    [next[index], next[target]] = [next[target], next[index]];
    const renumbered = next.map((img, i) => ({ ...img, order: i }));
    const changed = renumbered.filter(
      (img) => img.order !== images.find((o) => o.id === img.id).order
    );

    setImages(renumbered);
    try {
      await Promise.all(
        changed.map((img) => api.patch(`${IMAGE_URL}${img.id}/`, { order: img.order }))
      );
    } catch (err) {
      setError(errorText(err));
      load();
    }
  };

  const setAlt = (id, alt) =>
    setImages((prev) => prev.map((img) => (img.id === id ? { ...img, alt } : img)));

  const saveAlt = async (img) => {
    try {
      await api.patch(`${IMAGE_URL}${img.id}/`, { alt: img.alt });
    } catch (err) {
      setError(errorText(err));
    }
  };

  if (loading) {
    return (
      <div className="p-10 animate-pulse text-xs font-black uppercase tracking-widest text-slate-300 dark:text-slate-700">
        Loading…
      </div>
    );
  }

  if (!hero) {
    return (
      <div className="py-24 text-center">
        <ImageOff size={40} className="mx-auto mb-4 text-slate-200 dark:text-slate-700" />
        <p className="mb-6 text-xs font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">
          No dashboard hero yet
        </p>
        <button
          onClick={createHero}
          disabled={busy}
          className="rounded-2xl bg-[var(--accent)] px-8 py-3 text-sm font-bold text-white shadow-lg shadow-black/5 transition-all hover:brightness-90 disabled:opacity-60"
        >
          {busy ? "Creating…" : "Create hero"}
        </button>
        {error && <p className="mt-4 text-sm font-medium text-rose-500">{error}</p>}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-16 p-10 lg:grid-cols-2">
      {/* Text content */}
      <div className="space-y-8">
        <div className="flex items-center justify-between">
          <h3 className="text-[10px] font-black uppercase italic tracking-widest text-[var(--accent)]">
            Hero Content
          </h3>

          <button
            type="button"
            role="switch"
            aria-checked={hero.is_active}
            onClick={() => patchHero({ is_active: !hero.is_active })}
            className="flex items-center gap-3 text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400"
          >
            {hero.is_active ? "Published" : "Draft"}
            <span
              className={`relative h-6 w-11 rounded-full transition-colors ${
                hero.is_active ? "bg-[var(--accent)]" : "bg-slate-300 dark:bg-slate-700"
              }`}
            >
              <span
                className={`absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${
                  hero.is_active ? "translate-x-5" : ""
                }`}
              />
            </span>
          </button>
        </div>

        <EditableField label="Title" value={hero.title} onSave={(v) => patchHero({ title: v })} />
        <EditableField
          label="Subtitle"
          type="textarea"
          value={hero.subtitle}
          onSave={(v) => patchHero({ subtitle: v })}
        />
        <EditableField
          label="Button Label"
          value={hero.cta_label}
          onSave={(v) => patchHero({ cta_label: v })}
        />
        <EditableField
          label="Button Link"
          value={hero.cta_url}
          onSave={(v) => patchHero({ cta_url: v })}
        />

        {error && <p className="text-sm font-medium text-rose-500">{error}</p>}
      </div>

      {/* Images */}
      <div className="space-y-6 rounded-[2rem] border border-slate-100 bg-slate-50/50 p-10 dark:border-slate-800 dark:bg-white/5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3 className="text-[10px] font-black uppercase italic tracking-widest text-slate-400 dark:text-gray-500">
              Hero Images
            </h3>
            <p className="mt-2 text-xs text-slate-400 dark:text-slate-500">
              First three fill the hero in order. Extras are kept but hidden.
            </p>
          </div>

          <label
            className={`flex shrink-0 items-center gap-2 rounded-xl bg-[var(--accent)]/10 px-4 py-2 text-[10px] font-black uppercase text-[var(--accent)] ${
              busy ? "cursor-not-allowed opacity-50" : "cursor-pointer hover:brightness-95"
            }`}
          >
            <Upload size={14} />
            {busy ? "Working…" : "Upload"}
            <input
              type="file"
              accept="image/*"
              multiple
              disabled={busy}
              onChange={upload}
              className="sr-only"
            />
          </label>
        </div>

        {images.length === 0 ? (
          <div className="py-12 text-center">
            <ImageOff size={32} className="mx-auto mb-3 text-slate-200 dark:text-slate-700" />
            <p className="text-xs font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">
              No images yet
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {images.map((img, i) => (
              <div
                key={img.id}
                className={`overflow-hidden rounded-2xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800/60 ${
                  i > 2 ? "opacity-60" : ""
                }`}
              >
                <div className="relative aspect-[4/3] bg-slate-100 dark:bg-slate-800">
                  <img src={img.image} alt={img.alt || ""} className="h-full w-full object-cover" />
                  <span className="absolute left-2 top-2 rounded bg-slate-900/70 px-2 py-1 text-[9px] font-black uppercase text-white">
                    {SLOT_LABELS[i] ?? "Hidden"}
                  </span>
                </div>

                <div className="space-y-3 p-3">
                  <input
                    value={img.alt}
                    onChange={(e) => setAlt(img.id, e.target.value)}
                    onBlur={() => saveAlt(img)}
                    placeholder="Alt text"
                    className="w-full rounded-xl border border-slate-200 bg-white p-2.5 text-sm outline-none focus:ring-2 focus:ring-[var(--accent)]/30 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                  />

                  <div className="flex items-center justify-between">
                    <div className="flex gap-1">
                      <button
                        type="button"
                        onClick={() => moveImage(i, -1)}
                        disabled={i === 0}
                        aria-label="Move earlier"
                        className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 disabled:opacity-30 dark:text-slate-400 dark:hover:bg-white/5"
                      >
                        <ChevronLeft size={18} />
                      </button>
                      <button
                        type="button"
                        onClick={() => moveImage(i, 1)}
                        disabled={i === images.length - 1}
                        aria-label="Move later"
                        className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 disabled:opacity-30 dark:text-slate-400 dark:hover:bg-white/5"
                      >
                        <ChevronRight size={18} />
                      </button>
                    </div>

                    <button
                      type="button"
                      onClick={() => removeImage(img.id)}
                      aria-label="Delete image"
                      className="rounded-lg p-1.5 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}