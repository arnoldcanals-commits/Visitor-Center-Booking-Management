// src/pages/AdminPermitPage.jsx
import React, { useContext, useEffect, useState, useCallback, useRef } from "react";
import {
  ClipboardList,
  CreditCard,
  FileSignature,
  Loader2,
  AlertCircle,
  RefreshCw,
  Download,
  Filter,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import AdminTemplatePage from "../components/PermitTemplate";
import api from "../api";
import { AuthContext } from "../contexts/AuthContext";
import { toAbsoluteUrl } from "../utils/url";
const TABS = [
  { key: "pending_payment", label: "Awaiting payment" },
  { key: "paid", label: "Processing" },
  { key: "generated", label: "Ready to sign" },
  { key: "signed", label: "Signed" },
];

const PAGE_SIZE_OPTIONS = [10, 25, 50];

export default function AdminPermitPage() {
  const { user, authTokens } = useContext(AuthContext);

  const [tab, setTab] = useState("pending_payment");
  const [permits, setPermits] = useState([]);
  const [count, setCount] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [actionLoadingId, setActionLoadingId] = useState(null);

  const pollRef = useRef(null);

  const authHeaders = { headers: { Authorization: `Bearer ${authTokens?.access}` } };

  const loadPermits = useCallback(
    async (opts = {}) => {
      const silent = opts.silent;
      if (!silent) setLoading(true);
      setError(null);
      try {
        const res = await api.get(
          `api/permits/admin/?status=${tab}&page=${page}&page_size=${pageSize}`,
          authHeaders
        );
        setPermits(res.data.results);
        setCount(res.data.count);
      } catch (err) {
        setError("Couldn't load permits.");
      } finally {
        if (!silent) setLoading(false);
      }
    },
    [tab, page, pageSize, authTokens]
  );

  useEffect(() => {
    setPage(1); // reset to page 1 whenever the tab changes
  }, [tab]);

  useEffect(() => {
    loadPermits();
  }, [loadPermits]);

  // Auto-poll the "Processing" tab so items move themselves to "Ready to sign"
  // without the admin needing to manually refresh or watch something vanish.
  useEffect(() => {
    if (tab !== "paid") {
      clearInterval(pollRef.current);
      return;
    }
    pollRef.current = setInterval(() => loadPermits({ silent: true }), 4000);
    return () => clearInterval(pollRef.current);
  }, [tab, loadPermits]);

  const totalPages = Math.max(1, Math.ceil(count / pageSize));

  const markPaid = async (id) => {
    setActionLoadingId(id);
    try {
      await api.post(
        `api/permits/${id}/pay/`,
        { payment_reference: `OR-${Date.now()}` },
        authHeaders
      );
      // don't just yank it from the list into nowhere — reload so it
      // correctly reappears under "Processing"
      await loadPermits({ silent: true });
    } catch (err) {
      setError(err?.response?.data?.error || "Failed to mark as paid.");
    } finally {
      setActionLoadingId(null);
    }
  };

  const markSigned = async (id) => {
    const signedBy = window.prompt("Name of the signing head:");
    if (!signedBy) return;
    setActionLoadingId(id);
    try {
      await api.post(`api/permits/${id}/sign/`, { signed_by: signedBy }, authHeaders);
      await loadPermits({ silent: true });
    } catch (err) {
      setError(err?.response?.data?.error || "Failed to confirm signature.");
    } finally {
      setActionLoadingId(null);
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
      <div className="mx-auto max-w-3xl">
        <header className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight flex items-center gap-2">
              <ClipboardList size={22} className="text-[var(--accent)]" />
              Permit queue
            </h1>
            <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
              Payments and signatures handled on site.
            </p>
          </div>
          <button
            type="button"
            onClick={() => loadPermits()}
            className="flex items-center gap-1.5 text-xs text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300"
          >
            <RefreshCw size={13} className={loading ? "animate-spin" : ""} />
            Refresh
          </button>
        </header>

        {/* Tabs */}
        <div className="mb-4 flex items-center gap-1 border-b border-neutral-200 dark:border-neutral-800">
          {TABS.map((t) => (
            <button
              key={t.key}
              type="button"
              onClick={() => setTab(t.key)}
              className={`px-3 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
                tab === t.key
                  ? "border-[var(--accent)] text-[var(--accent)]"
                  : "border-transparent text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Page size control */}
        <div className="mb-4 flex items-center justify-between text-xs text-neutral-500 dark:text-neutral-400">
          <span>{count} total</span>
          <div className="flex items-center gap-1.5">
            <span>Show</span>
            <select
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                setPage(1);
              }}
              className="rounded border border-neutral-200 dark:border-neutral-800 bg-transparent px-2 py-1 text-xs"
            >
              {PAGE_SIZE_OPTIONS.map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </div>
        </div>

        {error && (
          <div className="mb-4 flex items-center gap-2 rounded-lg border border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-950/40 px-4 py-3 text-sm text-red-700 dark:text-red-300">
            <AlertCircle size={16} />
            {error}
          </div>
        )}

        {loading && (
          <div className="flex items-center gap-2 py-12 justify-center text-neutral-400">
            <Loader2 size={18} className="animate-spin" />
            <span className="text-sm">Loading…</span>
          </div>
        )}

        {!loading && permits.length === 0 && (
          <div className="rounded-lg border border-dashed border-neutral-300 dark:border-neutral-700 px-4 py-12 text-center text-sm text-neutral-500">
            <Filter size={18} className="mx-auto mb-2 text-neutral-300 dark:text-neutral-700" />
            Nothing here right now.
          </div>
        )}

        <ul className="space-y-3 mb-4">
          {permits.map((p) => (
            <li
              key={p.id}
              className="rounded-xl border border-neutral-200 dark:border-neutral-800 p-4"
            >
              <div className="flex items-start justify-between mb-2">
                <div>
                  <p className="text-sm font-medium">Permit #{p.id}</p>
                  <p className="text-xs text-neutral-500 dark:text-neutral-400">
                    {p.guests.map((g) => g.full_name).join(", ")}
                  </p>
                </div>
                {p.fee_amount && (
                  <span className="text-sm font-medium text-neutral-600 dark:text-neutral-300">
                    ₱{p.fee_amount}
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2 mt-3">
                {p.status === "pending_payment" && (
                  <button
                    type="button"
                    onClick={() => markPaid(p.id)}
                    disabled={actionLoadingId === p.id}
                    className="flex items-center gap-1.5 rounded-lg bg-[var(--accent)] px-3 py-1.5 text-xs font-medium text-white disabled:opacity-40 hover:opacity-90"
                  >
                    {actionLoadingId === p.id ? (
                      <Loader2 size={13} className="animate-spin" />
                    ) : (
                      <CreditCard size={13} />
                    )}
                    Mark as paid
                  </button>
                )}

                {p.status === "paid" && (
                  <div className="flex items-center gap-1.5 text-xs text-neutral-500 dark:text-neutral-400">
                    <Loader2 size={13} className="animate-spin" />
                    Generating PDF…
                  </div>
                )}

                {p.status === "generated" && (
                  <>
                    {p.generated_pdf && (
                      
                      <a     href={toAbsoluteUrl(p.generated_pdf)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1.5 rounded-lg border border-neutral-200 dark:border-neutral-800 px-3 py-1.5 text-xs font-medium hover:border-neutral-300 dark:hover:border-neutral-700"
                      >
                        <Download size={13} />
                        View PDF
                      </a>
                    )}
                    <button
                      type="button"
                      onClick={() => markSigned(p.id)}
                      disabled={actionLoadingId === p.id}
                      className="flex items-center gap-1.5 rounded-lg bg-[var(--accent)] px-3 py-1.5 text-xs font-medium text-white disabled:opacity-40 hover:opacity-90"
                    >
                      {actionLoadingId === p.id ? (
                        <Loader2 size={13} className="animate-spin" />
                      ) : (
                        <FileSignature size={13} />
                      )}
                      Confirm signed
                    </button>
                  </>
                )}

                {p.status === "signed" && p.generated_pdf && (
                  
                  <a  href={p.generated_pdf}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 rounded-lg border border-neutral-200 dark:border-neutral-800 px-3 py-1.5 text-xs font-medium hover:border-neutral-300 dark:hover:border-neutral-700"
                  >
                    <Download size={13} />
                    View signed permit
                  </a>
                )}
              </div>
            </li>
          ))}
        </ul>

        {/* Pagination controls */}
        {count > pageSize && (
          <div className="flex items-center justify-between text-xs text-neutral-500 dark:text-neutral-400">
            <button
              type="button"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="flex items-center gap-1 disabled:opacity-30"
            >
              <ChevronLeft size={14} />
              Prev
            </button>
            <span>
              Page {page} of {totalPages}
            </span>
            <button
              type="button"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="flex items-center gap-1 disabled:opacity-30"
            >
              Next
              <ChevronRight size={14} />
            </button>
          </div>
        )}
      </div>
      <AdminTemplatePage/>
    </div>
  );
}