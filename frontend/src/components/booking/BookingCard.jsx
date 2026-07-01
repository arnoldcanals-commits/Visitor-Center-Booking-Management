import React, { useState, useEffect } from "react";
import {
  FaChevronDown,
  FaChevronUp,
  FaUsers,
  FaFilePdf,
  FaQrcode,
  FaCheckCircle,
  FaTimesCircle,
} from "react-icons/fa";

import ReviewForm from "./ReviewForm";
import api from "../../api";

export default function BookingCard({ booking, onBookingCancelled }) {
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

  const statusColors = {
    pending: "from-amber-200 to-amber-300 text-amber-800 animate-pulse",
    approved: "from-teal-200 to-teal-300 text-teal-800",
    cancelled: "from-red-200 to-red-300 text-red-800",
    completed: "from-blue-200 to-blue-300 text-blue-800",
  };

  const formatDate = (dateStr) =>
    dateStr
      ? new Date(dateStr).toLocaleDateString(undefined, {
          year: "numeric",
          month: "short",
          day: "numeric",
        })
      : "-";

  // Fetch bill using booking ID
  useEffect(() => {
    async function fetchBill() {
      if (!booking.id) return;
      try {
        const res = await api.get(`/api/user/bills/${booking.id}/`);
        setBill(res.data);
      } catch (err) {
        console.error("Failed to fetch bill", err);
      }
    }
    fetchBill();
  }, [booking.id]);

  const handleSubmitProof = async (e) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!transactionImage || !transactionNumber) {
      setError("Transaction image and number are required.");
      return;
    }

    const formData = new FormData();
    formData.append("transaction_image", transactionImage);
    formData.append("transaction_number", transactionNumber);

    try {
      setSubmitting(true);
      await api.patch(
        `/api/user/bills/${booking.id}/submit-proof/`,
        formData,
        { headers: { "Content-Type": "multipart/form-data" } }
      );
      setSuccess("✅ Payment proof submitted successfully.");

      const res = await api.get(`/api/user/bills/${booking.id}/`);
      setBill(res.data);
    } catch (err) {
      setError(
        err.response?.data?.detail || "Failed to submit payment proof."
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancelBooking = async () => {
    if (booking.status === "completed") return;

    const confirm = window.confirm("Are you sure you want to cancel this booking?");
    if (!confirm) return;

    try {
      setCancelling(true);
      await api.patch(`/api/user/bookings/${booking.id}/cancel/`);
      if (onBookingCancelled) onBookingCancelled(booking.id);
      setBill((prev) => ({ ...prev })); // Optional: force re-render
    } catch (err) {
      console.error("Failed to cancel booking", err);
      alert("Failed to cancel booking. Try again.");
    } finally {
      setCancelling(false);
    }
  };

  const eventGuide = booking.event?.assigned_guide;
  const guide = booking.assigned_guide || eventGuide;

  return (
    <div className="bg-white rounded-2xl shadow-sm p-5 mb-6 hover:shadow-lg transition-transform transform hover:-translate-y-1 relative overflow-hidden">
      {expanded && (
        <div className="absolute left-0 top-0 h-full w-1 bg-gradient-to-b from-teal-400 to-cyan-400 rounded-r-full" />
      )}

      <div
        onClick={() => setExpanded(!expanded)}
        className="flex justify-between items-center cursor-pointer"
      >
        <h2 className="text-lg font-semibold flex items-center gap-2">
          🎟️ {booking.package_name || booking.event?.package?.name}
          <span className="text-gray-500 text-sm ml-1">
            ({formatDate(booking.booking_date)})
          </span>
        </h2>

        <div className="flex items-center gap-2">
          <span
            className={`px-3 py-1 rounded-full text-xs font-medium bg-gradient-to-r ${statusColors[booking.status]}`}
          >
            {booking.status?.toUpperCase()}
          </span>
          <span className={`transition-transform duration-300 ${expanded ? "rotate-180" : ""}`}>
            <FaChevronDown />
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-4 text-sm">
        <p><strong>Check-in:</strong> {formatDate(booking.check_in)}</p>
        <p><strong>Check-out:</strong> {formatDate(booking.check_out)}</p>
        <p><strong>Total:</strong> ₱{Number(booking.billing_total || 0).toLocaleString()}</p>
      </div>

      {expanded && (
        <div className="mt-5 space-y-6 animate-[fadeInUp_0.35s_ease-out] relative z-10">
          {/* Tour Guide */}
          <div>
            <h3 className="font-semibold mb-1">Tour Guide</h3>
            {!guide ? (
              <p className="text-sm text-gray-500">No guide assigned yet.</p>
            ) : (
              <div className="text-sm space-y-1">
                <p>{guide.first_name} {guide.last_name}</p>
                {guide.phone_number && <p>{guide.phone_number}</p>}
                <p>
                  Rating: {guide.average_rating ? Number(guide.average_rating).toFixed(1) : "N/A"} ({guide.review_count ?? 0} reviews)
                </p>
              </div>
            )}
          </div>

          {/* Cancel Booking */}
          {booking.status !== "completed" && (
            <button
              onClick={handleCancelBooking}
              disabled={cancelling}
              className="bg-red-600 text-white px-4 py-2 rounded text-sm hover:bg-red-700 transition disabled:opacity-50"
            >
              {cancelling ? "Cancelling..." : "Cancel Booking"}
            </button>
          )}

          {/* Guests Button */}
          {booking.booking_guests?.length > 0 && (
            <button
              onClick={() => setShowGuests(true)}
              className="inline-flex items-center gap-2 text-teal-600 text-sm font-medium hover:scale-105 transition transform"
            >
              <FaUsers /> View Guests ({booking.booking_guests.length})
            </button>
          )}

          {/* Bill */}
          <div>
            <button
              onClick={() => setShowBill(!showBill)}
              className="flex items-center gap-2 text-sm font-medium hover:scale-105 transition transform"
            >
              <FaFilePdf /> Bill {showBill ? <FaChevronUp /> : <FaChevronDown />}
            </button>

            {showBill && (
              <div className="mt-3">
                {!bill?.bill_pdf_url ? (
                  <p className="text-sm text-gray-500">Bill not issued yet.</p>
                ) : (
                  <>
                    <iframe
                      src={bill.bill_pdf_url}
                      title="Bill PDF"
                      className="w-full h-[360px] border rounded-lg"
                    />
                    <a
                      href={bill.bill_pdf_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block mt-2 text-blue-600 text-sm underline"
                    >
                      Open / Download Bill
                    </a>
                  </>
                )}
              </div>
            )}
          </div>

          {/* Payment Proof */}
          {bill?.status === "issued" && (
            <div className="border-t pt-4 space-y-3">
              <h3 className="font-semibold">Payment Proof</h3>
              {success && (
                <div className="flex items-center gap-2 text-green-600 text-sm">
                  <FaCheckCircle /> {success}
                </div>
              )}
              <form onSubmit={handleSubmitProof} className="space-y-2">
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => setTransactionImage(e.target.files[0])}
                  className="block w-full text-sm"
                />
                <input
                  type="text"
                  placeholder="Transaction Number"
                  value={transactionNumber}
                  onChange={(e) => setTransactionNumber(e.target.value)}
                  className="w-full border rounded px-3 py-2 text-sm"
                />
                {error && <p className="text-red-600 text-sm">{error}</p>}
                <button
                  type="submit"
                  disabled={submitting}
                  className="bg-teal-600 text-white px-4 py-2 rounded text-sm disabled:opacity-50 hover:bg-teal-700 transition"
                >
                  {submitting ? "Submitting..." : "Submit / Replace Proof"}
                </button>
              </form>
            </div>
          )}

          {/* Review - always show */}
          <ReviewForm booking={booking} />
        </div>
      )}

      {/* Guests Modal */}
      {showGuests && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-4xl p-6 relative max-h-[90vh] overflow-y-auto animate-[scaleUp_0.25s_ease-out]">
            <button
              onClick={() => setShowGuests(false)}
              className="absolute top-3 right-4 text-gray-500 text-xl"
            >
              ×
            </button>

            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2 bg-gradient-to-r from-teal-400 to-cyan-400 bg-clip-text text-transparent">
              <FaQrcode /> Guest List & QR Codes
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {booking.booking_guests.map((bg) => (
                <div
                  key={bg.id}
                  className="border rounded-xl p-3 text-center hover:shadow-lg transition transform hover:-translate-y-1"
                >
                  <p className="font-medium text-sm mb-1">{bg.guest.full_name}</p>
                  {bg.qrcode?.code ? (
                    <>
                      <img
                        src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(
                          bg.qrcode.code
                        )}`}
                        alt={`QR Code for ${bg.guest.full_name}`}
                        className="mx-auto mb-2 w-36 h-36 rounded-md shadow-sm hover:scale-105 transition-transform"
                        onError={(e) =>
                          (e.currentTarget.src =
                            "https://via.placeholder.com/150?text=QR+Error")
                        }
                      />
                      <a
                        href={`https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(
                          bg.qrcode.code
                        )}`}
                        download={`QR-${bg.guest.full_name}.png`}
                        className="text-blue-600 text-xs underline"
                      >
                        Download QR
                      </a>
                    </>
                  ) : (
                    <p className="text-gray-400 text-xs">No QR code generated yet</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes scaleUp {
          from { opacity: 0; transform: scale(0.95); }
          to { opacity: 1; transform: scale(1); }
        }
      `}</style>
    </div>
  );
}
