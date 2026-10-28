// src/pages/PermitPage.jsx
import React, { useContext, useEffect, useState, useCallback, useRef } from "react";
import {
  Users,
  CheckCircle2,
  Circle,
  ShieldCheck,
  Loader2,
  CreditCard,
  FileSignature,
  Download,
  AlertCircle,
  RefreshCw,
  Plus,
  Clock,
} from "lucide-react";
import api from "../api";
import { AuthContext } from "../components/Auth";
import TopBar from "../components/TopBar";
const STATUS_LABELS = {
  pending_payment: "Awaiting payment",
  paid: "Paid — generating permit",
  generated: "Ready to sign",
  signed: "Signed",
};

const ACTIVE_STATUSES = ["pending_payment", "paid", "generated"];
const STATUS_STEPS = ["pending_payment", "paid", "generated", "signed"];

export default function PermitPage() {
  const { user } = useContext(AuthContext);

  const [guests, setGuests] = useState([]);
  const [myPermits, setMyPermits] = useState([]);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);

  const [permit, setPermit] = useState(null); // the one currently being viewed/created
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState(null);
  const [showCreateForm, setShowCreateForm] = useState(false);

  const [actionLoading, setActionLoading] = useState(null);
  const pollRef = useRef(null);

  // --- Load guests + existing permits together ---
  const loadAll = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const [guestsRes, permitsRes] = await Promise.all([
        api.get("/api/guests/"),
        api.get("/api/permits/mine/"),
      ]);
      setGuests(guestsRes.data);
      setMyPermits(permitsRes.data);
    } catch (err) {
      setLoadError("Couldn't load your data. Try refreshing.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  // guests currently tied up in an active permit — can't be selected again
  const busyGuestIds = new Set(
    myPermits
      .filter((p) => ACTIVE_STATUSES.includes(p.status))
      .flatMap((p) => p.guests.map((g) => g.id))
  );

  const activePermits = myPermits.filter((p) => ACTIVE_STATUSES.includes(p.status));
  const pastPermits = myPermits.filter((p) => !ACTIVE_STATUSES.includes(p.status));

  const toggleGuest = (id) => {
    if (busyGuestIds.has(id)) return; // guard at the UI level too
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const createPermit = async () => {
    if (selectedIds.size === 0) return;
    setCreating(true);
    setCreateError(null);
    try {
      const { data } = await api.post("/api/permits/", {
        guest_ids: Array.from(selectedIds),
      });
      setPermit(data);
      setShowCreateForm(false);
      setSelectedIds(new Set());
      setMyPermits((prev) => [data, ...prev]);
    } catch (err) {
      if (err?.response?.status === 409) {
        const names = err.response.data.conflicting_guests?.join(", ");
        setCreateError(`${names} already ${names?.includes(",") ? "have" : "has"} an active permit.`);
      } else {
        setCreateError(err?.response?.data?.error || "Couldn't create the permit. Try again.");
      }
    } finally {
      setCreating(false);
    }
  };

  const refreshPermit = useCallback(async () => {
    if (!permit) return;
    try {
      const { data } = await api.get(`/api/permits/${permit.id}/`);
      setPermit(data);
      setMyPermits((prev) => prev.map((p) => (p.id === data.id ? data : p)));
    } catch {
      // silent — next poll retries
    }
  }, [permit]);

  useEffect(() => {
    if (!permit) return;
    if (permit.status === "paid") {
      pollRef.current = setInterval(refreshPermit, 3000);
      return () => clearInterval(pollRef.current);
    }
    return () => clearInterval(pollRef.current);
  }, [permit, refreshPermit]);

  const markPaid = async () => {
    setActionLoading("pay");
    try {
      const { data } = await api.post(`/api/permits/${permit.id}/pay/`, {
        payment_reference: `OR-${Date.now()}`,
      });
      setPermit(data);
      setMyPermits((prev) => prev.map((p) => (p.id === data.id ? data : p)));
    } catch (err) {
      setCreateError(err?.response?.data?.error || "Payment update failed.");
    } finally {
      setActionLoading(null);
    }
  };

  const markSigned = async () => {
    const signedBy = window.prompt("Name of the signing head:");
    if (!signedBy) return;
    setActionLoading("sign");
    try {
      const { data } = await api.post(`/api/permits/${permit.id}/sign/`, {
        signed_by: signedBy,
      });
      setPermit(data);
      setMyPermits((prev) => prev.map((p) => (p.id === data.id ? data : p)));
    } catch (err) {
      setCreateError(err?.response?.data?.error || "Signing failed.");
    } finally {
      setActionLoading(null);
    }
  };

  const currentStepIndex = permit ? STATUS_STEPS.indexOf(permit.status) : -1;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white dark:bg-neutral-950">
        <Loader2 size={20} className="animate-spin text-neutral-400" />
      </div>
    );
  }

  return (
    <div>
            <TopBar/>
    <div className="min-h-screen bg-white dark:bg-gray-900 text-neutral-900 dark:text-neutral-100 px-6 py-10">

      <div className="mx-auto max-w-2xl">
        <header className="mb-8 flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Your permits</h1>
            <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
              Track existing requests or start a new one.
            </p>
          </div>
          {!showCreateForm && !permit && (
            <button
              type="button"
              onClick={() => setShowCreateForm(true)}
              className="flex items-center gap-1.5 rounded-lg bg-[var(--accent)] px-3 py-2 text-xs font-medium text-white hover:opacity-90"
            >
              <Plus size={14} />
              New permit
            </button>
          )}
        </header>

        {loadError && (
          <div className="mb-4 flex items-center gap-2 rounded-lg border border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-950/40 px-4 py-3 text-sm text-red-700 dark:text-red-300">
            <AlertCircle size={16} />
            {loadError}
          </div>
        )}

        {/* Viewing a single permit's live status */}
        {permit && (
          <section className="mb-8">
            <div className="mb-4 rounded-xl border border-neutral-200 dark:border-neutral-800 p-5">
              <div className="flex items-center justify-between mb-4">
                <span className="text-sm font-medium">Permit #{permit.id}</span>
                <span className="text-xs px-2 py-1 rounded-full bg-[var(--accent)]/10 text-[var(--accent)] font-medium">
                  {STATUS_LABELS[permit.status]}
                </span>
              </div>

              <div className="flex items-center gap-1 mb-5">
                {STATUS_STEPS.map((step) => (
                  <div
                    key={step}
                    className={`h-1.5 flex-1 rounded-full transition-colors ${
                      STATUS_STEPS.indexOf(step) <= currentStepIndex
                        ? "bg-[var(--accent)]"
                        : "bg-neutral-200 dark:bg-neutral-800"
                    }`}
                  />
                ))}
              </div>

              <ul className="text-sm text-neutral-600 dark:text-neutral-300 space-y-1 mb-4">
                {permit.guests.map((g) => (
                  <li key={g.id}>
                    {g.full_name} · {g.age} yrs · {g.gender}
                  </li>
                ))}
              </ul>

              {permit.fee_amount && (
                <p className="text-sm text-neutral-500 dark:text-neutral-400 mb-1">
                  Fee: ₱{permit.fee_amount}
                </p>
              )}
            </div>

            {permit.status === "pending_payment" && (
              <p className="text-sm text-neutral-500 dark:text-neutral-400 text-center py-2">
                Please pay at the counter to continue.
              </p>
            )}
            {permit.status === "paid" && (
              <div className="flex items-center justify-center gap-2 text-sm text-neutral-500 dark:text-neutral-400 py-2">
                <Loader2 size={16} className="animate-spin" />
                Generating your permit…
              </div>
            )}

            {user?.is_staff && permit.status === "pending_payment" && (
              <button
                type="button"
                onClick={markPaid}
                disabled={actionLoading === "pay"}
                className="w-full flex items-center justify-center gap-2 rounded-lg bg-[var(--accent)] px-4 py-3 text-sm font-medium text-white disabled:opacity-40 hover:opacity-90"
              >
                {actionLoading === "pay" ? <Loader2 size={16} className="animate-spin" /> : <CreditCard size={16} />}
                Mark as paid
              </button>
            )}

            {user?.is_staff && permit.status === "generated" && (
              <button
                type="button"
                onClick={markSigned}
                disabled={actionLoading === "sign"}
                className="w-full flex items-center justify-center gap-2 rounded-lg bg-[var(--accent)] px-4 py-3 text-sm font-medium text-white disabled:opacity-40 hover:opacity-90"
              >
                {actionLoading === "sign" ? <Loader2 size={16} className="animate-spin" /> : <FileSignature size={16} />}
                Confirm signed on site
              </button>
            )}

            {permit.generated_pdf && (
              
             <a   href={permit.generated_pdf}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-3 flex items-center justify-center gap-2 rounded-lg border border-neutral-200 dark:border-neutral-800 px-4 py-3 text-sm font-medium hover:border-neutral-300 dark:hover:border-neutral-700"
              >
                <Download size={16} />
                View permit PDF
              </a>
            )}

            <button
              type="button"
              onClick={() => setPermit(null)}
              className="w-full mt-4 flex items-center justify-center gap-2 text-xs text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300"
            >
              <RefreshCw size={12} />
              Back to all permits
            </button>
          </section>
        )}

        {/* Creation form */}
        {!permit && showCreateForm && (
          <section className="mb-8">
            <div className="mb-3 flex items-center gap-2 text-sm font-medium text-neutral-600 dark:text-neutral-300">
              <Users size={16} />
              <span>Select guests</span>
            </div>

            <ul className="space-y-2 mb-4">
              {guests.map((g) => {
                const selected = selectedIds.has(g.id);
                const busy = busyGuestIds.has(g.id);
                return (
                  <li key={g.id}>
                    <button
                      type="button"
                      onClick={() => toggleGuest(g.id)}
                      disabled={busy}
                      className={`w-full flex items-center gap-3 rounded-lg border px-4 py-3 text-left transition-colors
                        ${busy ? "opacity-40 cursor-not-allowed border-neutral-200 dark:border-neutral-800" : ""}
                        ${
                          !busy && selected
                            ? "border-[var(--accent)] bg-[var(--accent)]/5"
                            : "border-neutral-200 dark:border-neutral-800 hover:border-neutral-300 dark:hover:border-neutral-700"
                        }`}
                    >
                      {selected ? (
                        <CheckCircle2 size={18} className="text-[var(--accent)] shrink-0" />
                      ) : (
                        <Circle size={18} className="text-neutral-300 dark:text-neutral-600 shrink-0" />
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium truncate">{g.full_name}</p>
                        <p className="text-xs text-neutral-500 dark:text-neutral-400">
                          {g.age} yrs · {g.gender}
                          {busy && " · already has an active permit"}
                        </p>
                      </div>
                      {g.local && !busy && (
                        <span className="flex items-center gap-1 text-xs text-emerald-600 dark:text-emerald-400 shrink-0">
                          <ShieldCheck size={14} />
                          Verified
                        </span>
                      )}
                    </button>
                  </li>
                );
              })}
            </ul>

            {createError && (
              <div className="mb-4 flex items-center gap-2 rounded-lg border border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-950/40 px-4 py-3 text-sm text-red-700 dark:text-red-300">
                <AlertCircle size={16} />
                {createError}
              </div>
            )}

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => {
                  setShowCreateForm(false);
                  setSelectedIds(new Set());
                  setCreateError(null);
                }}
                className="rounded-lg border border-neutral-200 dark:border-neutral-800 px-4 py-3 text-sm font-medium hover:border-neutral-300 dark:hover:border-neutral-700"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={createPermit}
                disabled={selectedIds.size === 0 || creating}
                className="flex-1 flex items-center justify-center gap-2 rounded-lg bg-[var(--accent)] px-4 py-3 text-sm font-medium text-white disabled:opacity-40 hover:opacity-90"
              >
                {creating ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    Creating…
                  </>
                ) : (
                  `Request permit${selectedIds.size > 0 ? ` for ${selectedIds.size}` : ""}`
                )}
              </button>
            </div>
          </section>
        )}

        {/* List of existing permits */}
        {!permit && !showCreateForm && (
          <>
            {activePermits.length > 0 && (
              <section className="mb-6">
                <h2 className="text-xs font-medium uppercase tracking-wide text-neutral-400 mb-2">
                  In progress
                </h2>
                <ul className="space-y-2">
                  {activePermits.map((p) => (
                    <li key={p.id}>
                      <button
                        type="button"
                        onClick={() => setPermit(p)}
                        className="w-full flex items-center justify-between rounded-lg border border-neutral-200 dark:border-neutral-800 px-4 py-3 text-left hover:border-neutral-300 dark:hover:border-neutral-700"
                      >
                        <div>
                          <p className="text-sm font-medium">Permit #{p.id}</p>
                          <p className="text-xs text-neutral-500 dark:text-neutral-400">
                            {p.guests.map((g) => g.full_name).join(", ")}
                          </p>
                        </div>
                        <span className="flex items-center gap-1 text-xs text-[var(--accent)]">
                          <Clock size={12} />
                          {STATUS_LABELS[p.status]}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {pastPermits.length > 0 && (
              <section>
                <h2 className="text-xs font-medium uppercase tracking-wide text-neutral-400 mb-2">
                  Past permits
                </h2>
                <ul className="space-y-2">
                  {pastPermits.map((p) => (
                    <li key={p.id}>
                      <button
                        type="button"
                        onClick={() => setPermit(p)}
                        className="w-full flex items-center justify-between rounded-lg border border-neutral-200 dark:border-neutral-800 px-4 py-3 text-left hover:border-neutral-300 dark:hover:border-neutral-700"
                      >
                        <div>
                          <p className="text-sm font-medium">Permit #{p.id}</p>
                          <p className="text-xs text-neutral-500 dark:text-neutral-400">
                            {p.guests.map((g) => g.full_name).join(", ")}
                          </p>
                        </div>
                        <span className="flex items-center gap-1 text-xs text-emerald-600 dark:text-emerald-400">
                          <CheckCircle2 size={12} />
                          {STATUS_LABELS[p.status]}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {activePermits.length === 0 && pastPermits.length === 0 && (
              <div className="rounded-lg border border-dashed border-neutral-300 dark:border-neutral-700 px-4 py-12 text-center text-sm text-neutral-500">
                No permits yet. Start your first one above.
              </div>
            )}
          </>
        )}
      </div>
    </div>
    </div>
  );
}