import { useEffect, useState } from "react";
import api from "../api";
import { Plus, Trash2, Pencil } from "lucide-react";

export default function FeesManager() {
  const [fees, setFees] = useState([]);
  const [loading, setLoading] = useState(true);

  const [form, setForm] = useState({
    name: "",
    description: "",
    default_amount: "",
    is_active: true,
  });

  const [editingId, setEditingId] = useState(null);

  // -------------------------
  // Fetch Fee Types
  // -------------------------
  const fetchFees = async () => {
    setLoading(true);
    try {
      const res = await api.get("api/fee-types/");
      setFees(res.data);
    } catch (err) {
      console.error("Failed to fetch fees:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFees();
  }, []);

  // -------------------------
  // Handle Input
  // -------------------------
  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;

    setForm({
      ...form,
      [name]: type === "checkbox" ? checked : value,
    });
  };

  // -------------------------
  // Create / Update
  // -------------------------
  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      if (editingId) {
        await api.put(`api/fee-types/${editingId}/`, form);
      } else {
        await api.post("api/fee-types/", form);
      }

      setForm({
        name: "",
        description: "",
        default_amount: "",
        is_active: true,
      });

      setEditingId(null);
      fetchFees();
    } catch (err) {
      console.error("Save failed:", err);
    }
  };

  // -------------------------
  // Edit
  // -------------------------
  const handleEdit = (fee) => {
    setForm({
      name: fee.name,
      description: fee.description || "",
      default_amount: fee.default_amount,
      is_active: fee.is_active,
    });

    setEditingId(fee.id);
  };

  // -------------------------
  // Delete
  // -------------------------
  const handleDelete = async (id) => {
    if (!confirm("Delete this fee?")) return;

    try {
      await api.delete(`api/fee-types/${id}/`);
      fetchFees();
    } catch (err) {
      console.error("Delete failed:", err);
    }
  };

  // -------------------------
  // UI
  // -------------------------
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-4">

      {/* FORM */}
      <div className="bg-white p-4 rounded-xl border shadow-sm">
        <h2 className="font-bold text-lg mb-3">
          {editingId ? "Edit Fee" : "Create Fee"}
        </h2>

        <form onSubmit={handleSubmit} className="space-y-3">

          <input
            name="name"
            placeholder="Fee Name"
            value={form.name}
            onChange={handleChange}
            className="w-full border p-2 rounded"
            required
          />

          <textarea
            name="description"
            placeholder="Description"
            value={form.description}
            onChange={handleChange}
            className="w-full border p-2 rounded"
          />

          <input
            name="default_amount"
            type="number"
            placeholder="Default Amount"
            value={form.default_amount}
            onChange={handleChange}
            className="w-full border p-2 rounded"
            required
          />

          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              name="is_active"
              checked={form.is_active}
              onChange={handleChange}
            />
            Active
          </label>

          <button className="w-full bg-blue-600 text-white py-2 rounded flex items-center justify-center gap-2">
            <Plus size={16} />
            {editingId ? "Update Fee" : "Add Fee"}
          </button>
        </form>
      </div>

      {/* LIST */}
      <div className="lg:col-span-2 bg-white p-4 rounded-xl border shadow-sm">
        <h2 className="font-bold text-lg mb-3">Fee Types</h2>

        {loading ? (
          <p className="text-gray-400">Loading...</p>
        ) : (
          <div className="space-y-3">
            {fees.map((fee) => (
              <div
                key={fee.id}
                className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50"
              >
                <div>
                  <p className="font-semibold">{fee.name}</p>
                  <p className="text-sm text-gray-500">
                    ₱{fee.default_amount} • {fee.is_active ? "Active" : "Inactive"}
                  </p>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => handleEdit(fee)}
                    className="p-2 hover:bg-blue-50 rounded"
                  >
                    <Pencil size={16} />
                  </button>

                  <button
                    onClick={() => handleDelete(fee.id)}
                    className="p-2 hover:bg-red-50 text-red-500 rounded"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))}

            {fees.length === 0 && (
              <p className="text-gray-400">No fees created yet.</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}