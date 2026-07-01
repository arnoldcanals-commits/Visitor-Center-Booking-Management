// src/components/billing/FeesModal.jsx
import { useContext, useState } from "react";
import { StaffBillingContext } from "../../contexts/StaffBillingContext";

export default function FeesModal({ onClose }) {
  const { fees, createFee, updateFee, deleteFee } =
    useContext(StaffBillingContext);

  const emptyForm = {
    name: "",
    description: "",
    amount: "",
    fee_type: "fixed",
  };

  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);

  function resetForm() {
    setForm(emptyForm);
    setEditingId(null);
  }

  async function handleSubmit(e) {
    e.preventDefault();

    const payload = {
      ...form,
      amount: Number(form.amount),
    };

    if (editingId) {
      await updateFee(editingId, payload);
    } else {
      await createFee(payload);
    }

    resetForm();
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white w-full max-w-4xl rounded-xl shadow-lg p-6">
        {/* Header */}
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">💵 Fee Management</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-black">
            ✕
          </button>
        </div>

        {/* Form */}
        <form
          onSubmit={handleSubmit}
          className="grid grid-cols-4 gap-2 mb-6"
        >
          <input
            className="border rounded px-2 py-1"
            placeholder="Fee name"
            value={form.name}
            onChange={(e) =>
              setForm({ ...form, name: e.target.value })
            }
            required
          />

          <input
            className="border rounded px-2 py-1"
            placeholder="Description"
            value={form.description}
            onChange={(e) =>
              setForm({ ...form, description: e.target.value })
            }
          />

          <input
            type="number"
            step="0.01"
            className="border rounded px-2 py-1"
            placeholder="Amount"
            value={form.amount}
            onChange={(e) =>
              setForm({ ...form, amount: e.target.value })
            }
            required
          />

          <select
            className="border rounded px-2 py-1"
            value={form.fee_type}
            onChange={(e) =>
              setForm({ ...form, fee_type: e.target.value })
            }
          >
            <option value="fixed">Fixed</option>
            <option value="per_person">Per Person</option>
            <option value="per_booking">Per Booking</option>
          </select>

          <div className="col-span-4 flex gap-2">
            <button
              type="submit"
              className="bg-black text-white px-4 py-1 rounded text-sm"
            >
              {editingId ? "Update Fee" : "Add Fee"}
            </button>

            {editingId && (
              <button
                type="button"
                onClick={resetForm}
                className="text-sm text-gray-500"
              >
                Cancel
              </button>
            )}
          </div>
        </form>

        {/* Table */}
        <table className="min-w-full text-sm">
          <thead>
            <tr className="border-b bg-gray-100">
              <th className="p-2 text-left">Name</th>
              <th className="p-2">Description</th>
              <th className="p-2">Amount</th>
              <th className="p-2">Type</th>
              <th className="p-2 w-32">Actions</th>
            </tr>
          </thead>

          <tbody>
            {fees.map((fee) => (
              <tr key={fee.id} className="border-b">
                <td className="p-2 font-medium">{fee.name}</td>
                <td className="p-2 text-xs">{fee.description || "—"}</td>
                <td className="p-2">₱{fee.amount}</td>
                <td className="p-2 text-xs uppercase">
                  {fee.fee_type.replace("_", " ")}
                </td>
                <td className="p-2 space-x-2">
                  <button
                    onClick={() => {
                      setEditingId(fee.id);
                      setForm({
                        name: fee.name,
                        description: fee.description,
                        amount: fee.amount,
                        fee_type: fee.fee_type,
                      });
                    }}
                    className="text-xs text-blue-600"
                  >
                    Edit
                  </button>

                  <button
                    onClick={() => {
                      if (
                        confirm(
                          "Are you sure you want to delete this fee?"
                        )
                      ) {
                        deleteFee(fee.id);
                      }
                    }}
                    className="text-xs text-red-600"
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}

            {fees.length === 0 && (
              <tr>
                <td
                  colSpan={5}
                  className="p-4 text-center text-gray-500"
                >
                  No fees configured.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
