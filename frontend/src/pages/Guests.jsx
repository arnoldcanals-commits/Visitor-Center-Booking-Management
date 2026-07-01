import { useEffect, useState, useCallback } from "react";
import api from "../api";

export default function GuestManagement() {
  const [guests, setGuests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [formOpen, setFormOpen] = useState(false);
  const [editingGuest, setEditingGuest] = useState(null);
  const [formData, setFormData] = useState({
    full_name: "",
    age: "",
    gender: "",
    id_number: "",
    local: false,
  });

  // =========================
  // Fetch guests
  // =========================
  const fetchGuests = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get("api/guests/");
      setGuests(res.data);
    } catch (err) {
      console.error("Failed to fetch guests:", err);
      setError("Failed to load guests. Please try again.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchGuests();
  }, [fetchGuests]);

  // =========================
  // Form handlers
  // =========================
  const openCreateForm = () => {
    setEditingGuest(null);
    setFormData({
      full_name: "",
      age: "",
      gender: "",
      id_number: "",
      local: false,
    });
    setFormOpen(true);
  };

  const openEditForm = (guest) => {
    setEditingGuest(guest);
    setFormData({
      full_name: guest.full_name,
      age: guest.age,
      gender: guest.gender,
      id_number: guest.id_number || "",
      local: guest.local,
    });
    setFormOpen(true);
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

 const handleSubmit = async (e) => {
  e.preventDefault();
  try {
    const data = new FormData();
    data.append("full_name", formData.full_name);
    data.append("age", formData.age);
    data.append("gender", formData.gender);
    data.append("local", formData.local);
    if (formData.id_document) {
      data.append("id_document", formData.id_document);
    }

    if (editingGuest) {
      await api.patch(`api/guests/${editingGuest.id}/`, data, {
        headers: { "Content-Type": "multipart/form-data" },
      });
    } else {
      await api.post("api/guests/", data, {
        headers: { "Content-Type": "multipart/form-data" },
      });
    }
    setFormOpen(false);
    fetchGuests();
  } catch (err) {
    console.error("Failed to save guest:", err);
    alert("Failed to save guest. Please check your input.");
  }
};


  const handleDelete = async (guestId) => {
    if (!window.confirm("Remove this guest from your list?")) return;
    try {
      await api.delete(`api/guests/${guestId}/`);
      fetchGuests();
    } catch (err) {
      console.error("Failed to delete guest:", err);
      alert("Failed to delete guest.");
    }
  };

  // =========================
  // States
  // =========================
  if (loading) {
    return (
      <div className="flex justify-center items-center h-40">
        <p className="text-gray-500 text-lg animate-pulse">Loading guests…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-10 text-center">
        <h2 className="text-2xl font-bold mb-2">😅 Oops!</h2>
        <p className="text-red-500 mb-4">{error}</p>
        <button
          onClick={fetchGuests}
          className="px-4 py-2 bg-teal-600 text-white rounded hover:bg-teal-700 transition"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div
      className="animate-[fadeInUp_0.35s_ease-out]"
      style={{ minHeight: "200px" }}
    >
      <div className="max-w-5xl mx-auto p-2 sm:p-4">
        {/* Header */}
        <div className="bg-white p-4 sm:p-6 rounded-2xl shadow flex justify-between items-center mb-6">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 flex items-center justify-center rounded-xl bg-gradient-to-br from-teal-500 to-cyan-500 text-white shadow-sm animate-pulse">
              🧳
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-semibold">
                My Guests
              </h1>
              <p className="text-gray-500 text-sm sm:text-base">
                Manage your saved guest list for faster bookings
              </p>
            </div>
          </div>
          <button
            onClick={openCreateForm}
            className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-lg shadow transform hover:scale-105 transition"
          >
            + Add Guest
          </button>
        </div>

        {/* Empty state */}
        {guests.length === 0 ? (
          <div className="text-center py-10">
            <h2 className="text-2xl font-bold mb-2">🤷 No guests yet</h2>
            <p className="text-gray-500 mb-4">
              Add guests to reuse them in future bookings.
            </p>
            <button
              onClick={openCreateForm}
              className="px-4 py-2 bg-teal-600 text-white rounded-lg shadow hover:bg-teal-700 transition transform hover:scale-105"
            >
              + Add Your First Guest
            </button>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {guests.map((guest) => (
              <div
                key={guest.id}
                className="bg-white rounded-2xl shadow p-4 flex flex-col transition transform hover:-translate-y-1 hover:shadow-lg"
              >
                <h3 className="text-lg font-semibold">{guest.full_name}</h3>
                <p className="text-sm text-gray-600">
                  Age: {guest.age} • {guest.gender}
                </p>
              
      {/* ID Preview */}
      {guest.id_document && (
        <div className="mt-2">
          <p className="text-xs text-gray-500 mb-1">ID Preview:</p>
          {guest.id_document.endsWith(".pdf") ? (
            <a
              href={guest.id_documentl}
              target="_blank"
              rel="noopener noreferrer"
              className="block text-blue-600 text-xs underline mb-2"
            >
              View PDF
            </a>
          ) : (
            <img
              src={guest.id_document}
              alt={`${guest.full_name} ID`}
              className="w-full h-32 object-cover rounded-md border"
            />
          )}
        </div>
      )}

      {/* Local note */}
    {/* Local note — always rendered for consistent spacing */}
<p className={`text-xs mt-2 font-medium ${guest.local ? "text-green-600" : "text-transparent"}`}>
  {guest.local ? "✅ Subject to local discount" : "Not Subject to local discount"}
</p>

                <div className="flex gap-2 mt-4">
                  <button
                    onClick={() => openEditForm(guest)}
                    className="flex-1 px-3 py-1 text-sm bg-teal-600 text-white rounded hover:bg-teal-700 transition transform hover:scale-105"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(guest.id)}
                    className="flex-1 px-3 py-1 text-sm bg-amber-400 text-white rounded hover:bg-amber-500 transition transform hover:scale-105"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal */}
      {formOpen && (
        <div className="fixed inset-0 flex items-center justify-center z-50
                  bg-black/20 backdrop-blur-sm transition">
          <form
            onSubmit={handleSubmit}
            className="bg-white rounded-2xl p-6 w-full max-w-md shadow-lg animate-[fadeInUp_0.3s_ease-out]"
          >
            <h2 className="text-xl font-bold mb-4 text-teal-600">
              {editingGuest ? "Edit Guest" : "Add Guest"}
            </h2>
           <div className="space-y-3">
  <input
    name="full_name"
    placeholder="Full name"
    value={formData.full_name}
    onChange={handleChange}
    required
    className="w-full border rounded px-3 py-2 focus:ring-2 focus:ring-teal-300 outline-none"
  />
  <input
    name="age"
    type="number"
    placeholder="Age"
    value={formData.age}
    onChange={handleChange}
    required
    className="w-full border rounded px-3 py-2 focus:ring-2 focus:ring-teal-300 outline-none"
  />
  <input
    name="gender"
    placeholder="Gender"
    value={formData.gender}
    onChange={handleChange}
    required
    className="w-full border rounded px-3 py-2 focus:ring-2 focus:ring-teal-300 outline-none"
  />

  {/* ID document upload */}
  {/* ID document upload */}
<label className="flex flex-col text-sm text-gray-700">
  Upload ID (optional)
  <input
    type="file"
    name="id_document"
    accept="image/*,.pdf"
    onChange={(e) =>
      setFormData((prev) => ({
        ...prev,
        id_document: e.target.files[0] || null,
        id_preview: e.target.files[0]
          ? URL.createObjectURL(e.target.files[0])
          : null,
      }))
    }
    className="mt-1"
  />
</label>

{/* Live preview */}
{formData.id_preview && !formData.id_preview.endsWith(".pdf") && (
  <img
    src={formData.id_preview}
    alt="ID Preview"
    className="w-full h-32 object-cover rounded-md border mt-2"
  />
)}


{formData.local && (
  <p className="text-xs text-green-600 font-medium">
    ✅ Subject to local discount
  </p>
)}

</div>

            <div className="flex justify-end gap-2 mt-6">
              <button
                type="button"
                onClick={() => setFormOpen(false)}
                className="px-4 py-2 rounded border hover:bg-gray-100 transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-teal-600 text-white rounded hover:bg-teal-700 transition transform hover:scale-105"
              >
                Save
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Animations */}
      <style>{`
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
