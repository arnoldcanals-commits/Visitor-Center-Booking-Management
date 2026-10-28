import React, { useState, useEffect, useContext } from "react";
import {
  ChevronDown,
  ChevronUp,
  Users,
  FileText,
  QrCode,
  CheckCircle2,
  Download,
  Loader2,
  X,
  Ban,
  Lock,
  MapPin,
  Star,
  Clock,
} from "lucide-react";
import ReviewForm from "./ReviewForm";
import ConfirmModal from "../ConfirmModal";
import api from "../../api";
import { AuthContext } from "../Auth";
const STATUS_STYLES = {
  pending:
    "bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-400",
  approved:
    "bg-[color-mix(in_srgb,var(--accent)_15%,transparent)] text-[var(--accent)]",
  cancelled: "bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-400",
  completed:
    "bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-400",
};

export default function BookingCard({ booking, onCancel }) {
  const { isAuthenticated } = useContext(AuthContext);

  const [expanded, setExpanded] = useState(false);
  const [showGuests, setShowGuests] = useState(false);
  const [showBill, setShowBill] = useState(false);

  const [bill, setBill] = useState(null);
  const [transactionImage, setTransactionImage] = useState(null);
  const [transactionNumber, setTransactionNumber] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [cancelling, setCancelling] = useState(false);
  const [rescinding, setRescinding] = useState(false);
  // Drives which confirmation modal (if any) is showing:
  // "cancel-1" | "cancel-2" | "rescind" | null
  const [confirmStep, setConfirmStep] = useState(null);
  // Single-button informational modal, replacing window.alert.
  const [notice, setNotice] = useState(null);

  const formatDate = (dateStr) =>
    dateStr
      ? new Date(dateStr).toLocaleDateString(undefined, {
          year: "numeric",
          month: "short",
          day: "numeric",
        })
      : "—";

  useEffect(() => {
    if (!isAuthenticated || !booking.id) return;
    async function fetchBill() {
      try {
        const res = await api.get(`/api/user/bills/${booking.id}/`);
        setBill(res.data);
      } catch (err) {
        console.error("Failed to fetch bill", err);
      }
    }
    fetchBill();
  }, [booking.id, isAuthenticated]);

  const handleSubmitProof = async (e) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!isAuthenticated) {
      setError("Please log in to submit payment proof.");
      return;
    }
    if (!transactionImage || !transactionNumber) {
      setError("Transaction image and number are required.");
      return;
    }

    const formData = new FormData();
    formData.append("transaction_image", transactionImage);
    formData.append("transaction_number", transactionNumber);

    try {
      setSubmitting(true);
      await api.patch(`/api/user/bills/${booking.id}/submit-proof/`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setSuccess("Payment proof submitted.");
      const res = await api.get(`/api/user/bills/${booking.id}/`);
      setBill(res.data);
    } catch (err) {
      setError(err.response?.data?.detail || "Failed to submit payment proof.");
    } finally {
      setSubmitting(false);
    }
  };

  // Cancellation is now a *request*: we flip `requested_cancellation` to true
  // rather than changing the booking's status directly. Staff act on the
  // request from their side. Two confirmation modals are shown in sequence
  // before sending the request, and the request can be rescinded afterward
  // (see handleRescindCancellation below) to avoid accidental cancellations.
  const openCancelFlow = () => {
    if (!isAuthenticated) return;
    if (["completed", "cancelled"].includes(booking.status)) return;
    if (booking.requested_cancellation) return;
    setConfirmStep("cancel-1");
  };

  const submitCancelRequest = async () => {
    setConfirmStep(null);
    try {
      setCancelling(true);
      await api.patch(`/api/booking/my/${booking.id}/`, {
        requested_cancellation: true,
      });
      onCancel?.(booking.id);
    } catch (err) {
      console.error("Failed to request cancellation", err);
      setNotice(
        err.response?.data?.detail ||
          "Failed to request cancellation. Try again."
      );
    } finally {
      setCancelling(false);
    }
  };

  // Lets the tourist undo a cancellation request before staff act on it.
  const openRescindFlow = () => {
    if (!isAuthenticated) return;
    if (!booking.requested_cancellation) return;
    setConfirmStep("rescind");
  };

  const submitRescind = async () => {
    setConfirmStep(null);
    try {
      setRescinding(true);
      await api.patch(`/api/booking/my/${booking.id}/`, {
        requested_cancellation: false,
      });
      onCancel?.(booking.id);
    } catch (err) {
      console.error("Failed to rescind cancellation request", err);
      setNotice(
        err.response?.data?.detail ||
          "Failed to rescind cancellation request. Try again."
      );
    } finally {
      setRescinding(false);
    }
  };

  const guide = booking.assigned_guide || booking.event?.assigned_guide;

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl shadow-sm p-5 mb-5">
      {/* Header */}
      <button
        onClick={() => setExpanded((v) => !v)}
        className="w-full flex items-center justify-between gap-3 text-left"
      >
        <div className="min-w-0 space-y-1.5">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-[color-mix(in_srgb,var(--accent)_15%,transparent)] text-[var(--accent)] max-w-full truncate">
            {booking.package_name || booking.event?.package?.name}
          </span>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {formatDate(booking.booking_date)}
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {booking.requested_cancellation && (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400">
              <Clock size={12} /> Cancellation requested
            </span>
          )}
          <span
            className={`px-2.5 py-1 rounded-full text-xs font-medium ${STATUS_STYLES[booking.status] || ""}`}
          >
            {booking.status?.toUpperCase()}
          </span>
          <ChevronDown
            size={18}
            className={`text-slate-400 transition-transform ${expanded ? "rotate-180" : ""}`}
          />
        </div>
      </button>

      {/* Summary strip */}
      <div className="grid grid-cols-3 gap-3 mt-4 pt-4 border-t border-slate-100 dark:border-slate-800 text-sm">
        <div>
          <p className="text-slate-400 dark:text-slate-500 text-xs mb-1">Check-in</p>
          <span className="inline-block px-2.5 py-1 rounded-full text-xs font-medium bg-teal-100 text-teal-700 dark:bg-teal-500/15 dark:text-teal-400">
            {formatDate(booking.check_in)}
          </span>
        </div>
        <div>
          <p className="text-slate-400 dark:text-slate-500 text-xs mb-1">Check-out</p>
          <span className="inline-block px-2.5 py-1 rounded-full text-xs font-medium bg-violet-100 text-violet-700 dark:bg-violet-500/15 dark:text-violet-400">
            {formatDate(booking.check_out)}
          </span>
        </div>
        <div>
          <p className="text-slate-400 dark:text-slate-500 text-xs mb-1">Total</p>
          <p className="font-semibold text-slate-900 dark:text-slate-100">
            ₱{Number(booking.billing_total || 0).toLocaleString()}
          </p>
        </div>
      </div>

      {expanded && (
        <div className="mt-5 space-y-5">
          {!isAuthenticated && (
            <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/60 rounded-lg px-3 py-2">
              <Lock size={14} />
              Log in to manage this booking, view your bill, or submit payment proof.
            </div>
          )}

          {/* Tour guide */}
          <div>
            <h3 className="text-sm font-medium text-slate-900 dark:text-slate-100 mb-2">
              Tour guide
            </h3>
            {!guide ? (
              <p className="text-sm text-slate-400 dark:text-slate-500">No guide assigned yet.</p>
            ) : (
              <div className="flex items-center gap-3 text-sm">
                <div className="h-9 w-9 rounded-full bg-[var(--accent)]/10 text-[var(--accent)] flex items-center justify-center font-medium">
                  {guide.first_name?.[0]}
                  {guide.last_name?.[0]}
                </div>
                <div>
                  <p className="text-slate-800 dark:text-slate-200">
                    {guide.first_name} {guide.last_name}
                  </p>
                  <div className="flex items-center gap-2 mt-1">
                    {guide.phone_number && (
                      <span className="text-slate-400 dark:text-slate-500 text-xs">
                        {guide.phone_number}
                      </span>
                    )}
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400">
                      <Star size={11} className="fill-current" />
                      {guide.average_rating ? Number(guide.average_rating).toFixed(1) : "N/A"} (
                      {guide.review_count ?? 0})
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex flex-wrap items-center gap-2">
            {booking.booking_guests?.length > 0 && (
              <button
                onClick={() => setShowGuests(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition"
              >
                <Users size={15} /> Guests ({booking.booking_guests.length})
              </button>
            )}

            <button
              onClick={() => setShowBill((v) => !v)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition"
            >
              <FileText size={15} /> Bill
              {showBill ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </button>

            {isAuthenticated &&
              booking.status !== "completed" &&
              booking.status !== "cancelled" &&
              booking.status !== "rejected" &&
              (booking.requested_cancellation ? (
                <button
                  onClick={openRescindFlow}
                  disabled={rescinding}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition disabled:opacity-50 ml-auto text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-500/10 hover:bg-amber-100 dark:hover:bg-amber-500/20"
                >
                  {rescinding ? (
                    <Loader2 size={15} className="animate-spin" />
                  ) : (
                    <Clock size={15} />
                  )}
                  {rescinding ? "Rescinding…" : "Cancellation requested — Rescind"}
                </button>
              ) : (
                <button
                  onClick={openCancelFlow}
                  disabled={cancelling}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition disabled:opacity-50 ml-auto text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-500/10 hover:bg-red-100 dark:hover:bg-red-500/20"
                >
                  {cancelling ? (
                    <Loader2 size={15} className="animate-spin" />
                  ) : (
                    <Ban size={15} />
                  )}
                  {cancelling ? "Requesting…" : "Cancel booking"}
                </button>
              ))}
          </div>

          {/* Bill panel */}
          {showBill && (
            <div>
              {!bill?.bill_pdf_url ? (
                <p className="text-sm text-slate-400 dark:text-slate-500">Bill not issued yet.</p>
              ) : (
                <div>
                  <iframe
                    src={bill.bill_pdf_url}
                    title="Bill PDF"
                    className="w-full h-[340px] border border-slate-200 dark:border-slate-800 rounded-lg"
                  />
                  <a
                    href={bill.bill_pdf_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 mt-2 text-sm text-[var(--accent)] hover:underline"
                  >
                    <Download size={14} /> Open / download bill
                  </a>
                </div>
              )}
            </div>
          )}

          {/* Payment proof */}
          {isAuthenticated && bill?.status === "issued" && (
            <div className="border-t border-slate-100 dark:border-slate-800 pt-4 space-y-3">
              <h3 className="text-sm font-medium text-slate-900 dark:text-slate-100">
                Payment proof
              </h3>

              {success && (
                <div className="flex items-center gap-2 text-sm text-emerald-600 dark:text-emerald-400">
                  <CheckCircle2 size={15} /> {success}
                </div>
              )}
              {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}

              <form onSubmit={handleSubmitProof} className="space-y-2">
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => setTransactionImage(e.target.files[0])}
                  className="block w-full text-sm text-slate-500 dark:text-slate-400 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-slate-100 dark:file:bg-slate-800 file:text-slate-700 dark:file:text-slate-200"
                />
                <input
                  type="text"
                  placeholder="Transaction number"
                  value={transactionNumber}
                  onChange={(e) => setTransactionNumber(e.target.value)}
                  className="w-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
                />
                <button
                  type="submit"
                  disabled={submitting}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium text-white bg-[var(--accent)] hover:opacity-90 transition disabled:opacity-50"
                >
                  {submitting && <Loader2 size={15} className="animate-spin" />}
                  {submitting ? "Submitting…" : "Submit / replace proof"}
                </button>
              </form>
            </div>
          )}

          {isAuthenticated && <ReviewForm booking={booking} />}
        </div>
      )}

      {/* Guests modal */}
      {showGuests && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-3xl p-6 relative max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setShowGuests(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
            >
              <X size={20} />
            </button>

            <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100 mb-4 flex items-center gap-2">
              <QrCode size={18} className="text-[var(--accent)]" />
              Guest list & QR codes
            </h3>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              {booking.booking_guests.map((bg) => (
                <div
                  key={bg.id}
                  className="border border-slate-100 dark:border-slate-800 rounded-xl p-3 text-center"
                >
                  <p className="font-medium text-sm text-slate-800 dark:text-slate-200 mb-2 truncate">
                    {bg.guest.full_name}
                  </p>
                  {bg.qrcode?.code ? (
                    <>
                      <img
                        src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(bg.qrcode.code)}`}
                        alt={`QR code for ${bg.guest.full_name}`}
                        className="mx-auto mb-2 w-32 h-32 rounded-md"
                        onError={(e) =>
                          (e.currentTarget.src = "https://via.placeholder.com/150?text=QR+Error")
                        }
                      />
                      <a
                        href={`https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(bg.qrcode.code)}`}
                        download={`QR-${bg.guest.full_name}.png`}
                        className="inline-flex items-center gap-1 text-[var(--accent)] text-xs hover:underline"
                      >
                        <Download size={12} /> Download
                      </a>
                    </>
                  ) : (
                    <p className="text-slate-400 dark:text-slate-500 text-xs">No QR code yet</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Cancellation confirm modals */}
      <ConfirmModal
        open={confirmStep === "cancel-1"}
        title="Cancel this booking?"
        message="Are you sure you want to cancel this booking?"
        confirmText="Continue"
        cancelText="Keep booking"
        onCancel={() => setConfirmStep(null)}
        onConfirm={() => setConfirmStep("cancel-2")}
        danger
      />
      <ConfirmModal
        open={confirmStep === "cancel-2"}
        title="Confirm cancellation request"
        message="This will submit a cancellation request for this booking. Once confirmed, it cannot be undone from here — you'll only be able to rescind the request itself, not this confirmation."
        confirmText="Request cancellation"
        cancelText="Go back"
        onCancel={() => setConfirmStep(null)}
        onConfirm={submitCancelRequest}
        danger
      />
      <ConfirmModal
        open={confirmStep === "rescind"}
        title="Rescind cancellation request?"
        message="This booking will remain active as before."
        confirmText="Rescind request"
        cancelText="Keep request"
        onCancel={() => setConfirmStep(null)}
        onConfirm={submitRescind}
      />

      {/* Error / info notice modal, replacing window.alert */}
      <ConfirmModal
        open={!!notice}
        title="Something went wrong"
        message={notice}
        confirmText="OK"
        onConfirm={() => setNotice(null)}
        singleButton
        danger
      />
    </div>
  );
}