// src/components/billing/BillFeesModal.jsx
import { useState, useContext } from "react";
import api from "../../api";
import { AdminDataContext } from "../../contexts/AdminDataContext";

export default function BillFeesModal({ bill, feeItem = null, onClose }) {
  const { adminData, reload } = useContext(AdminDataContext);
  const fees = adminData?.fee_types ?? [];

  // ----------------------------
  // State
  // ----------------------------
  const [feeTypeId, setFeeTypeId] = useState(
    String(feeItem?.fee_type?.id ?? feeItem?.fee_type ?? "")
  );
  const [bookingGuestId, setBookingGuestId] = useState(
    String(feeItem?.booking_guest ?? "")
  );
  const [description, setDescription] = useState(feeItem?.description || "");
  const [baseAmount, setBaseAmount] = useState(feeItem?.base_amount || 0);
  const [discount, setDiscount] = useState(feeItem?.discount_amount || 0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const finalAmount = Math.max(baseAmount - discount, 0);
  const bookingGuests = bill.booking_guests ?? [];

  // ----------------------------
  // Handlers
  // ----------------------------
  const handleSave = async () => {
    const payload = {
      bill: bill.id,
      item_type: "fee",
      fee_type: feeTypeId || null,
      booking_guest: bookingGuestId || null,
      description,
      base_amount: Number(baseAmount),
      discount_amount: Number(discount),
    };

    setSaving(true);
    setError("");
    try {
      if (feeItem) {
        await api.put(`api/site_admin/bill-items/${feeItem.id}/`, payload);
      } else {
        await api.post("api/site_admin/bill-items/", payload);
      }
      await reload();
      onClose();
    } catch (err) {
      console.error("Failed to save bill fee:", err.response?.data || err);
      setError(err.response?.data?.detail || "Failed to save fee.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!feeItem || !window.confirm("Remove this fee from the bill?")) return;

    setSaving(true);
    setError("");
    try {
      await api.delete(`api/site_admin/bill-items/${feeItem.id}/`);
      await reload();
      onClose();
    } catch (err) {
      console.error("Failed to delete bill fee:", err.response?.data || err);
      setError(err.response?.data?.detail || "Failed to remove fee.");
    } finally {
      setSaving(false);
    }
  };

  const isReadOnly = Boolean(feeTypeId); // read-only if a FeeType is selected

  // ----------------------------
  // Render
  // ----------------------------
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6 relative">
        {/* Header */}
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold">
            {feeItem ? "Edit Fee" : "Add Fee"}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 font-bold text-xl"
          >
            ×
          </button>
        </div>

        {/* Form */}
        <div className="flex flex-col gap-3">
          {/* Fee Type */}
          <label className="text-sm font-medium">Fee Type</label>
          {fees.length === 0 ? (
            <div className="text-gray-400 text-sm">Loading fee types...</div>
          ) : (
            <select
              value={feeTypeId}
              onChange={(e) => {
                const nextFeeTypeId = e.target.value;
                setFeeTypeId(nextFeeTypeId);
                const selected = fees.find((f) => String(f.id) === nextFeeTypeId);
                if (selected) {
                  setDescription(selected.name);
                  setBaseAmount(Number(selected.default_amount));
                  setDiscount(0);
                } else if (!feeItem) {
                  setDescription("");
                  setBaseAmount(0);
                  setDiscount(0);
                }
              }}
              className="border p-2 rounded"
            >
              <option value="">Custom / No Type</option>
              {fees.map((f) => (
                <option key={f.id} value={String(f.id)}>
                  {f.name} (₱{f.default_amount})
                </option>
              ))}
            </select>
          )}

          <label className="text-sm font-medium">Attach to Guest (optional)</label>
          <select
            value={bookingGuestId}
            onChange={(e) => setBookingGuestId(e.target.value)}
            className="border p-2 rounded"
          >
            <option value="">None (Bill-wide fee)</option>
            {bookingGuests.map((guest) => (
              <option key={guest.id} value={String(guest.id)}>
                {guest.full_name}
              </option>
            ))}
          </select>

          {/* Description */}
          <label className="text-sm font-medium">Description</label>
          <input
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="border p-2 rounded"
            readOnly={isReadOnly}
          />

          {/* Base Amount */}
          <label className="text-sm font-medium">Base Amount</label>
          <input
            type="number"
            value={baseAmount}
            onChange={(e) => setBaseAmount(Number(e.target.value))}
            className="border p-2 rounded"
            readOnly={isReadOnly}
          />

          {/* Discount */}
          <label className="text-sm font-medium">Discount</label>
          <input
            type="number"
            value={discount}
            onChange={(e) => setDiscount(Number(e.target.value))}
            className="border p-2 rounded"
          />

          {/* Final Amount */}
          <div className="text-right font-semibold">Final: ₱{finalAmount}</div>

          {error && (
            <p role="alert" className="text-sm text-red-600">
              {error}
            </p>
          )}

          {/* Actions */}
          <div className="flex justify-between gap-2 mt-4">
            {feeItem && (
              <button
                onClick={handleDelete}
                className="bg-red-600 text-white px-3 py-1 rounded w-1/3"
                disabled={saving}
              >
                Delete
              </button>
            )}
            <button
              onClick={handleSave}
              className="bg-blue-600 text-white px-3 py-1 rounded flex-1"
              disabled={saving}
            >
              {saving ? "Saving..." : "Save"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
