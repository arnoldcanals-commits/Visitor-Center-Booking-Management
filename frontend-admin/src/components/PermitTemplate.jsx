import React, { useContext, useEffect, useState, useRef } from "react";
import {
  FileText,
  CheckCircle2,
  Upload,
  Loader2,
  AlertCircle,
  Download,
} from "lucide-react";
import api from "../api";
import { AuthContext } from "../contexts/AuthContext";
import { toAbsoluteUrl } from "../utils/url";

export default function AdminTemplatePage() {
  const { user, authTokens } = useContext(AuthContext);

  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [activatingId, setActivatingId] = useState(null);

  const [newName, setNewName] = useState("");
  const [newFile, setNewFile] = useState(null);
  const fileInputRef = useRef(null);

  const authHeaders = { headers: { Authorization: `Bearer ${authTokens?.access}` } };

  const loadTemplates = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get("api/permit-templates/", authHeaders);
      setTemplates(res.data);
    } catch (err) {
      setError("Couldn't load templates.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTemplates();
  }, []);

  const uploadTemplate = async () => {
    if (!newName || !newFile) return;
    setUploading(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.append("name", newName);
      formData.append("file", newFile);

      await api.post("api/permit-templates/", formData, {
        headers: {
          Authorization: `Bearer ${authTokens?.access}`,
          "Content-Type": "multipart/form-data",
        },
      });

      setNewName("");
      setNewFile(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
      await loadTemplates();
    } catch (err) {
      setError(err?.response?.data?.error || "Upload failed.");
    } finally {
      setUploading(false);
    }
  };

  const activateTemplate = async (id) => {
    setActivatingId(id);
    try {
      await api.post(`api/permit-templates/${id}/activate/`, {}, authHeaders);
      await loadTemplates();
    } catch (err) {
      setError(err?.response?.data?.error || "Couldn't activate template.");
    } finally {
      setActivatingId(null);
    }
  };

  if (!user?.is_admin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white dark:bg-gray-900 text-neutral-500 dark:text-neutral-400">
        You don't have access to this page.
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white dark:bg-gray-900 text-neutral-900 dark:text-neutral-100 px-6 py-10">
      <div className="mx-auto max-w-2xl">
        <header className="mb-8">
          <h1 className="text-2xl font-semibold tracking-tight flex items-center gap-2">
            <FileText size={22} className="text-[var(--accent)]" />
            Permit templates
          </h1>
          <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
            Upload a new .docx template and mark one active. Only the active template is used for new permits.
          </p>
        </header>

        {/* Upload form */}
        <section className="mb-8 rounded-xl border border-neutral-200 dark:border-neutral-800 p-4">
          <div className="flex flex-col gap-3">
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Template name (e.g. Standard Permit 2026)"
              className="rounded-lg border border-neutral-200 dark:border-neutral-800 bg-transparent px-3 py-2 text-sm placeholder:text-neutral-400"
            />
            <input
              ref={fileInputRef}
              type="file"
              accept=".docx"
              onChange={(e) => setNewFile(e.target.files?.[0] || null)}
              className="text-sm text-neutral-500 dark:text-neutral-400 file:mr-3 file:rounded-lg file:border-0 file:bg-neutral-100 dark:file:bg-neutral-800 file:px-3 file:py-1.5 file:text-xs file:font-medium file:text-neutral-700 dark:file:text-neutral-200"
            />
            <button
              type="button"
              onClick={uploadTemplate}
              disabled={!newName || !newFile || uploading}
              className="flex items-center justify-center gap-2 rounded-lg bg-[var(--accent)] px-4 py-2.5 text-sm font-medium text-white disabled:opacity-40 hover:opacity-90"
            >
              {uploading ? (
                <>
                  <Loader2 size={15} className="animate-spin" />
                  Uploading…
                </>
              ) : (
                <>
                  <Upload size={15} />
                  Upload template
                </>
              )}
            </button>
          </div>
        </section>

        {error && (
          <div className="mb-4 flex items-center gap-2 rounded-lg border border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-950/40 px-4 py-3 text-sm text-red-700 dark:text-red-300">
            <AlertCircle size={16} />
            {error}
          </div>
        )}

        {loading && (
          <div className="flex items-center gap-2 py-8 justify-center text-neutral-400">
            <Loader2 size={18} className="animate-spin" />
            <span className="text-sm">Loading…</span>
          </div>
        )}

        {!loading && templates.length === 0 && (
          <div className="rounded-lg border border-dashed border-neutral-300 dark:border-neutral-700 px-4 py-10 text-center text-sm text-neutral-500">
            No templates uploaded yet.
          </div>
        )}

        <ul className="space-y-2">
          {templates.map((t) => (
            <li
              key={t.id}
              className={`flex items-center justify-between rounded-lg border px-4 py-3 ${
                t.is_active
                  ? "border-[var(--accent)] bg-[var(--accent)]/5"
                  : "border-neutral-200 dark:border-neutral-800"
              }`}
            >
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium truncate">{t.name}</p>
                <p className="text-xs text-neutral-500 dark:text-neutral-400">
                  {new Date(t.created_at).toLocaleDateString()}
                </p>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                
                <a  href={toAbsoluteUrl(t.file)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-xs text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300"
                >
                  <Download size={13} />
                </a>

                {t.is_active ? (
                  <span className="flex items-center gap-1 text-xs font-medium text-[var(--accent)]">
                    <CheckCircle2 size={14} />
                    Active
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={() => activateTemplate(t.id)}
                    disabled={activatingId === t.id}
                    className="rounded-lg border border-neutral-200 dark:border-neutral-800 px-2.5 py-1 text-xs font-medium hover:border-neutral-300 dark:hover:border-neutral-700 disabled:opacity-40"
                  >
                    {activatingId === t.id ? (
                      <Loader2 size={12} className="animate-spin" />
                    ) : (
                      "Activate"
                    )}
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}