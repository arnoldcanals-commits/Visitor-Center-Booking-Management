import { useEffect, useState } from "react";
import api from "../api";
import { Plus, Trash2, Pencil, Archive, ArchiveRestore, X } from "lucide-react";

const emptyForm = {
  name: "",
  description: "",
  default_amount: "",
  is_active: true,
};

export default function FeesManager() {
  const [fees, setFees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showArchived, setShowArchived] = useState(false);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [saving, setSaving] = useState(false);

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

  const visibleFees = fees.filter((fee) =>
    showArchived ? fee.is_archived : !fee.is_archived
  );

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
  // Modal open/close helpers
  // -------------------------
  const openCreateModal = () => {
    setForm(emptyForm);
    setEditingId(null);
    setIsModalOpen(true);
  };

  const openEditModal = (fee) => {
    setForm({
      name: fee.name,
      description: fee.description || "",
      default_amount: fee.default_amount,
      is_active: fee.is_active,
    });
    setEditingId(fee.id);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingId(null);
    setForm(emptyForm);
  };

  // -------------------------
  // Create / Update
  // -------------------------
  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);

    try {
      if (editingId) {
        await api.put(`api/fee-types/${editingId}/`, form);
      } else {
        await api.post("api/fee-types/", form);
      }

      closeModal();
      fetchFees();
    } catch (err) {
      console.error("Save failed:", err);
    } finally {
      setSaving(false);
    }
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
  // Archive / Restore
  // -------------------------
  const handleArchiveToggle = async (fee) => {
    try {
      await api.patch(`api/fee-types/${fee.id}/`, { is_archived: !fee.is_archived });
      fetchFees();
    } catch (err) {
      console.error("Archive toggle failed:", err);
    }
  };

  // -------------------------
  // UI
  // -------------------------
  return (
    <div className="mt-4">
      {/* HEADER ROW */}
      <div className="flex items-center justify-between bg-white dark:bg-gray-800 dark:text-gray-50 dark:border-gray-900 border rounded-xl px-4 py-3 shadow-sm mb-4">
        <h2 className="font-bold text-lg">
          {showArchived ? "Viewing Archive" : "Fee Types"}
        </h2>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowArchived((prev) => !prev)}
            className="px-3 py-2 rounded-lg border text-sm font-medium dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition"
          >
            {showArchived ? "Viewing Archive" : "View Archive"}
          </button>

          {!showArchived && (
            <button
              onClick={openCreateModal}
              className="bg-[var(--accent)] text-white px-3 py-2 rounded-lg text-sm font-medium flex items-center gap-2 hover:opacity-90 transition"
            >
              <Plus size={16} />
              Add Fee
            </button>
          )}
        </div>
      </div>

      {/* LIST */}
      <div className="bg-white p-4 rounded-xl border shadow-sm dark:bg-gray-800 dark:text-gray-50 dark:border-gray-900">
        {loading ? (
          <p className="text-gray-400">Loading...</p>
        ) : (
          <div className="space-y-3">
            {visibleFees.map((fee) => (
              <div
                key={fee.id}
                className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-900 dark:border-gray-700"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-semibold">{fee.name}</p>
                    <span
                      className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                        fee.is_active
                          ? "bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-400"
                          : "bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300"
                      }`}
                    >
                      {fee.is_active ? "Active" : "Inactive"}
                    </span>
                  </div>
                  <p className="text-sm text-[var(--accent)]">
                    ₱{fee.default_amount}
                  </p>
                </div>

                <div className="flex gap-2">
                  {!showArchived && (
                    <button
                      onClick={() => openEditModal(fee)}
                      className="p-2 hover:bg-blue-50 dark:hover:bg-blue-500 rounded"
                      title="Edit"
                    >
                      <Pencil size={16} />
                    </button>
                  )}

                  <button
                    onClick={() => handleArchiveToggle(fee)}
                    className="p-2 hover:bg-yellow-50 dark:hover:bg-yellow-500/20 text-yellow-600 dark:text-yellow-400 rounded"
                    title={fee.is_archived ? "Restore" : "Archive"}
                  >
                    {fee.is_archived ? (
                      <ArchiveRestore size={16} />
                    ) : (
                      <Archive size={16} />
                    )}
                  </button>

                  <button
                    onClick={() => handleDelete(fee.id)}
                    className="p-2 hover:bg-red-50 dark:hover:bg-white text-red-500 rounded"
                    title="Delete"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))}

            {visibleFees.length === 0 && (
              <p className="text-gray-400">
                {showArchived ? "No archived fees." : "No fees created yet."}
              </p>
            )}
          </div>
        )}
      </div>

      {/* EDIT / CREATE MODAL */}
      {isModalOpen && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          onClick={closeModal}
        >
          <div
            className="bg-white dark:bg-gray-800 dark:text-gray-50 dark:border-gray-900 border rounded-xl shadow-xl w-full max-w-md p-5"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-bold text-lg">
                {editingId ? "Edit Fee" : "Create Fee"}
              </h2>
              <button
                onClick={closeModal}
                className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-3">
              <input
                name="name"
                placeholder="Fee Name"
                value={form.name}
                onChange={handleChange}
                className="w-full border p-2 rounded dark:bg-gray-700 dark:text-gray-50 dark:border-gray-600"
                required
              />

              <textarea
                name="description"
                placeholder="Description"
                value={form.description}
                onChange={handleChange}
                className="w-full border p-2 rounded dark:bg-gray-700 dark:text-gray-50 dark:border-gray-600"
              />

              <input
                name="default_amount"
                type="number"
                placeholder="Default Amount"
                value={form.default_amount}
                onChange={handleChange}
                className="w-full border p-2 rounded dark:bg-gray-700 dark:text-gray-50 dark:border-gray-600"
                required
              />

              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  name="is_active"
                  checked={form.is_active}
                  onChange={handleChange}
                  className="bg-[var(--accent)]"
                />
                Active
              </label>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={closeModal}
                  className="w-full border py-2 rounded dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="w-full bg-[var(--accent)] text-white py-2 rounded flex items-center justify-center gap-2 disabled:opacity-60"
                >
                  <Plus size={16} />
                  {saving ? "Saving..." : editingId ? "Update Fee" : "Add Fee"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}