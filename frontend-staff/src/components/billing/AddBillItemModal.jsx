import { useEffect, useState, useContext } from "react";
import api from "../../api";
import { StaffDataContext } from "../../contexts/StaffDataContext";

export default function AddBillItemModal({ bill, item = null, onClose }) {
  const { reload } = useContext(StaffDataContext);

  const [guests, setGuests] = useState([]);
  const [feeTypes, setFeeTypes] = useState([]);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const [form, setForm] = useState({
    guest: item?.guest ?? "",
    fee_type: item?.fee_type ?? "",
    quantity: item?.quantity ?? 1,
    notes: item?.notes ?? "",
  });

  // ----------------------------------------
  // Load Guests + FeeTypes
  // ----------------------------------------
  useEffect(() => {
    let mounted = true;

    const loadData = async () => {
      try {
        const [guestRes, feeRes] = await Promise.all([
          api.get("api/booking_staff/guests/"),
          api.get("api/booking_staff/fee_types/"),
        ]);

        if (!mounted) return;

        setGuests(guestRes.data ?? []);
        setFeeTypes(
          (feeRes.data ?? []).filter((f) => f.is_active)
        );
      } catch (err) {
        console.error(err);
        if (mounted) {
          setError("Failed to load form data.");
        }
      }
    };

    loadData();
    return () => {
      mounted = false;
    };
  }, []);

  const selectedFee = feeTypes.find(
    (f) => f.id === Number(form.fee_type)
  );

  // ----------------------------------------
  // Submit Bill Item
  // ----------------------------------------
  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError(null);

    try {
      const endpoint = item
        ? `api/booking_staff/bill_items/${item.id}/update/`
        : "api/booking_staff/bill_items/";

      const method = item ? "put" : "post";

      await api[method](endpoint, {
        bill: bill.id,
        guest: form.guest || null,
        fee_type: form.fee_type,
        quantity: form.quantity,
        notes: form.notes,
      });

      await reload();
      onClose();
    } catch (err) {
      console.error(err);
      setError(
        err.response?.data?.detail ||
          "Failed to save bill item."
      );
    } finally {
      setSaving(false);
    }
  };

  // ----------------------------------------
  // UI
  // ----------------------------------------
  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-lg w-full max-w-md p-4">
        <h2 className="text-lg font-semibold mb-2">
          {item ? "Edit Bill Item" : "Add Bill Item"}
        </h2>

        <p className="text-xs text-gray-500 mb-4">
          Bill: <strong>{bill.reference_no}</strong>
        </p>

        {error && (
          <div className="bg-red-100 text-red-700 text-xs p-2 rounded mb-3">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3">
          {/* Guest */}
          <div>
            <label className="block text-xs font-medium mb-1">
              Guest (optional)
            </label>
            <select
              className="w-full border rounded px-2 py-1 text-sm"
              value={form.guest}
              onChange={(e) =>
                setForm({ ...form, guest: e.target.value })
              }
            >
              <option value="">— None —</option>
              {guests.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.full_name || `Guest #${g.id}`}
                </option>
              ))}
            </select>
          </div>

          {/* Fee Type */}
          <div>
            <label className="block text-xs font-medium mb-1">
              Fee Type <span className="text-red-500">*</span>
            </label>
            <select
              className="w-full border rounded px-2 py-1 text-sm"
              required
              value={form.fee_type}
              onChange={(e) =>
                setForm({ ...form, fee_type: e.target.value })
              }
            >
              <option value="">Select fee</option>
              {feeTypes.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.name}
                </option>
              ))}
            </select>

            {selectedFee && (
              <div className="text-xs text-gray-600">
                Default Amount: ₱{selectedFee.default_amount}
              </div>
            )}
          </div>

          {/* Quantity */}
          <div>
            <label className="block text-xs font-medium mb-1">
              Quantity
            </label>
            <input
              type="number"
              min="1"
              className="w-full border rounded px-2 py-1 text-sm"
              value={form.quantity}
              onChange={(e) =>
                setForm({
                  ...form,
                  quantity: Number(e.target.value),
                })
              }
            />
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-medium mb-1">
              Notes
            </label>
            <textarea
              className="w-full border rounded px-2 py-1 text-sm"
              rows={2}
              placeholder="Optional"
              value={form.notes}
              onChange={(e) =>
                setForm({ ...form, notes: e.target.value })
              }
            />
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1 text-sm rounded bg-gray-200 hover:bg-gray-300"
              disabled={saving}
            >
              Cancel
            </button>

            <button
              type="submit"
              className="px-3 py-1 text-sm rounded bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
              disabled={saving}
            >
              {saving
                ? "Saving…"
                : item
                ? "Update Item"
                : "Add Item"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
