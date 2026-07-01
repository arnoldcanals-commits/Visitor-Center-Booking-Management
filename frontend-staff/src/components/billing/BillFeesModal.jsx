// src/components/billing/BillFeesModal.jsx
import { useState, useContext, useEffect } from "react";
import { StaffBillingContext } from "../../contexts/StaffBillingContext";

export default function BillFeesModal({ bill, feeItem = null, onClose }) {
  const { createFee, updateFee, deleteFee, fees } = useContext(StaffBillingContext);

  // ----------------------------
  // State
  // ----------------------------
  const [feeTypeId, setFeeTypeId] = useState(feeItem?.fee_type?.id?.toString() || "");
  const [guestId, setGuestId] = useState(feeItem?.guest?.id?.toString() || "");
  const [description, setDescription] = useState(feeItem?.description || "");
  const [baseAmount, setBaseAmount] = useState(feeItem?.base_amount || 0);
  const [discount, setDiscount] = useState(feeItem?.discount_amount || 0);

  const finalAmount = Math.max(baseAmount - discount, 0);

  // ----------------------------
  // Autofill description & base_amount when FeeType changes
  // ----------------------------
  useEffect(() => {
    if (feeTypeId) {
      const selected = fees.find((f) => String(f.id) === String(feeTypeId));
      if (selected) {
        setDescription(selected.name);
        setBaseAmount(Number(selected.default_amount));
        setDiscount(0);
      }
    } else if (!feeItem) {
      // Reset for custom fee
      setDescription("");
      setBaseAmount(0);
      setDiscount(0);
    }
  }, [feeTypeId, fees, feeItem]);

  // ----------------------------
  // Initialize FeeType when editing and fees load asynchronously
  // ----------------------------
  useEffect(() => {
    if (feeItem?.fee_type && fees.length > 0) {
      setFeeTypeId(String(feeItem.fee_type.id));
    }
  }, [feeItem, fees]);

  // ----------------------------
  // Handlers
  // ----------------------------
  const handleSave = async () => {
    const payload = {
      bill: bill.id,
      item_type: "fee",
      fee_type: feeTypeId || null,
      guest: guestId || null,
      description,
      base_amount: baseAmount,
      discount_amount: discount,
    };

    let success = false;
    if (feeItem) {
      success = await updateFee(feeItem.id, payload);
    } else {
      success = await createFee(payload);
    }

    if (success) onClose();
  };

  const handleDelete = async () => {
    if (feeItem && window.confirm("Remove this fee from the bill?")) {
      await deleteFee(feeItem.id);
      onClose();
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
              onChange={(e) => setFeeTypeId(e.target.value)}
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

          {/* Guest */}
          <label className="text-sm font-medium">Attach to Guest (optional)</label>
          <select
            value={guestId}
            onChange={(e) => setGuestId(e.target.value)}
            className="border p-2 rounded"
          >
            <option value="">None (General Fee)</option>
            {bill.booking?.guests?.map((g) => (
              <option key={g.id} value={String(g.id)}>
                {g.full_name}
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

          {/* Actions */}
          <div className="flex justify-between gap-2 mt-4">
            {feeItem && (
              <button
                onClick={handleDelete}
                className="bg-red-600 text-white px-3 py-1 rounded w-1/3"
              >
                Delete
              </button>
            )}
            <button
              onClick={handleSave}
              className="bg-blue-600 text-white px-3 py-1 rounded flex-1"
            >
              Save
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
