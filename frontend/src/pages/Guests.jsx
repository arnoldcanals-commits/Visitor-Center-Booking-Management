import { useEffect, useState, useCallback, useMemo } from "react";
import api from "../api";
import {LayoutGrid,List, UserRoundPen} from "lucide-react"
const GENDER_OPTIONS = ["Male", "Female", "Other"];
const PAGE_SIZE_OPTIONS = [6, 12, 24];

export default function GuestManagement() {
  const [guests, setGuests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // view + pagination
  const [viewMode, setViewMode] = useState("list"); // "grid" | "list"
  const [pageSize, setPageSize] = useState(6);
  const [currentPage, setCurrentPage] = useState(1);

  // create/edit modal
  const [formOpen, setFormOpen] = useState(false);
  const [editingGuest, setEditingGuest] = useState(null);
  const [genderChoice, setGenderChoice] = useState("Male"); // dropdown selection
  const [formData, setFormData] = useState({
    full_name: "",
    age: "",
    gender: "",
    id_number: "",
    local: false,
    id_document: null,
    id_preview: null,
  });
  const [formErrors, setFormErrors] = useState({});

  // view-only modal (list view "view id" / details)
  const [viewingGuest, setViewingGuest] = useState(null);

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

  // Keep current page in range if guest count / page size changes
  const totalPages = Math.max(1, Math.ceil(guests.length / pageSize));
  useEffect(() => {
    if (currentPage > totalPages) setCurrentPage(totalPages);
  }, [totalPages, currentPage]);

  const paginatedGuests = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return guests.slice(start, start + pageSize);
  }, [guests, currentPage, pageSize]);

  const emptySlots = Math.max(0, pageSize - paginatedGuests.length);

  // =========================
  // Form handlers
  // =========================
  const resetFormState = () => {
    setFormData({
      full_name: "",
      age: "",
      gender: "",
      id_number: "",
      local: false,
      id_document: null,
      id_preview: null,
    });
    setGenderChoice("Male");
    setFormErrors({});
  };

  const openCreateForm = () => {
    setEditingGuest(null);
    resetFormState();
    setFormOpen(true);
  };

  const openEditForm = (guest) => {
    setEditingGuest(guest);
    const knownGender = GENDER_OPTIONS.includes(guest.gender) ? guest.gender : "Other";
    setGenderChoice(knownGender);
    setFormData({
      full_name: guest.full_name,
      age: guest.age,
      gender: guest.gender,
      id_number: guest.id_number || "",
      local: guest.local,
      id_document: null,
      id_preview: null,
    });
    setFormErrors({});
    setFormOpen(true);
  };

  const openViewModal = (guest) => {
    setViewingGuest(guest);
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handleGenderSelectChange = (e) => {
    const value = e.target.value;
    setGenderChoice(value);
    if (value === "Other") {
      // clear so the person types their own value
      setFormData((prev) => ({ ...prev, gender: "" }));
    } else {
      setFormData((prev) => ({ ...prev, gender: value }));
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0] || null;
    setFormData((prev) => ({
      ...prev,
      id_document: file,
      id_preview: file ? URL.createObjectURL(file) : null,
    }));
  };

  const validateForm = () => {
    const errors = {};
    if (!formData.full_name || !formData.full_name.trim()) {
      errors.full_name = "Name can't be blank.";
    }
    const ageNum = Number(formData.age);
    if (formData.age === "" || Number.isNaN(ageNum) || ageNum < 1) {
      errors.age = "Age must be 1 or older.";
    }
    if (!formData.gender || !formData.gender.trim()) {
      errors.gender = "Gender is required.";
    }
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    try {
      const data = new FormData();
      data.append("full_name", formData.full_name.trim());
      data.append("age", formData.age);
      data.append("gender", formData.gender.trim());
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
  // Small shared bits
  // =========================
  const LocalBadge = ({ local }) => (
    <div className="h-6 flex items-center">
      {local && (
        <span className="mt-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold text-white bg-teal-500 shadow-sm">
          Local discount Eligible
        </span>
      )}
    </div>
  );

  const IdDocumentPreview = ({ guest, liveFile }) => {
    // liveFile: { url, isPdf } for a freshly-chosen file in the form
    if (liveFile) {
      return liveFile.isPdf ? (
        <p className="text-xs text-gray-500 mt-2">PDF selected — preview unavailable until saved.</p>
      ) : (
        <img
          src={liveFile.url}
          alt="ID preview"
          className="w-full h-40 object-cover rounded-md border mt-2"
        />
      );
    }
    if (!guest?.id_document) {
      return <p className="text-xs text-gray-400 mt-2">No ID document on file.</p>;
    }
    const isPdf = guest.id_document.toLowerCase().endsWith(".pdf");
    return isPdf ? (
      <a
        href={guest.id_document}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-block text-teal-600 text-sm underline mt-2"
      >
        View PDF
      </a>
    ) : (
      <img
        src={guest.id_document}
        alt={`${guest.full_name} ID`}
        className="w-full h-40 object-cover rounded-md border mt-2"
      />
    );
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
    <div className="animate-[fadeInUp_0.35s_ease-out]" style={{ minHeight: "200px" }}>
      <div className="max-w-5xl mx-auto p-2 sm:p-4">
        {/* Header */}
        <div className="bg-white p-4 sm:p-6 rounded-2xl shadow flex flex-wrap gap-4 justify-between items-center mb-6">
          <div className="flex items-center gap-3">
            
            <div className="flex items-center gap-2 p-3 bg-teal-50 text-teal-600 rounded-xl w-fit border border-teal-100">
             <UserRoundPen size={28}/>
            
    <span className="text-sm font-black uppercase tracking-tight">Guest Management</span>
  </div>
          </div>
          <button
            onClick={openCreateForm}
            className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-lg shadow transform hover:scale-105 transition"
          >
            + Add Guest
          </button>
        </div>

        {/* Controls: view toggle + page size */}
        {guests.length > 0 && (
          <div className="bg-white p-3 rounded-2xl shadow flex flex-wrap items-center justify-between gap-3 mb-4">
            <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
              <button
                onClick={() => setViewMode("grid")}
                className={`px-3 py-1.5 text-sm rounded-md transition ${
                  viewMode === "grid"
                    ? "bg-white shadow text-teal-700 font-medium"
                    : "text-gray-500 hover:text-gray-700"
                }`}
              >
                <LayoutGrid size={28}/>
              </button>
              <button
                onClick={() => setViewMode("list")}
                className={`px-3 py-1.5 text-sm rounded-md transition ${
                  viewMode === "list"
                    ? "bg-white shadow text-teal-700 font-medium"
                    : "text-gray-500 hover:text-gray-700"
                }`}
              >
                <List size={28}/>
              </button>
            </div>

            <label className="flex items-center gap-2 text-sm text-gray-600">
              Per page
              <select
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value));
                  setCurrentPage(1);
                }}
                className="border rounded px-6 py-1 text-sm focus:ring-2 focus:ring-teal-300 outline-none"
              >
                {PAGE_SIZE_OPTIONS.map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>
            </label>
          </div>
        )}

        {/* Empty state */}
        {guests.length === 0 ? (
          <div className="text-center py-10">
            <h2 className="text-2xl font-bold mb-2">🤷 No guests yet</h2>
            <p className="text-gray-500 mb-4">Add guests to reuse them in future bookings.</p>
            <button
              onClick={openCreateForm}
              className="px-4 py-2 bg-teal-600 text-white rounded-lg shadow hover:bg-teal-700 transition transform hover:scale-105"
            >
              + Add Your First Guest
            </button>
          </div>
        ) : viewMode === "grid" ? (
          // =========================
          // GRID VIEW
          // =========================
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 auto-rows-fr">
            {paginatedGuests.map((guest) => (
              <div
                key={guest.id}
                className="bg-white rounded-2xl shadow p-4 flex flex-col transition transform hover:-translate-y-1 hover:shadow-lg"
              >
                <h3 className="text-lg font-semibold">{guest.full_name}</h3>
                <p className="text-sm text-gray-600">
                  Age: {guest.age} • {guest.gender}
                </p>

                {guest.id_document && (
                  <div className="mt-2">
                    <p className="text-xs text-gray-500 mb-1">ID Preview:</p>
                    <IdDocumentPreview guest={guest} />
                  </div>
                )}

                <LocalBadge local={guest.local} />

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

            {/* invisible placeholders so page height stays consistent */}
            {Array.from({ length: emptySlots }).map((_, i) => (
              <div key={`grid-spacer-${i}`} className="invisible rounded-2xl p-4" aria-hidden="true">
                <div className="h-full" />
              </div>
            ))}
          </div>
        ) : (
          // =========================
          // LIST VIEW (full width)
          // =========================
          <div className="bg-white rounded-2xl shadow divide-y overflow-hidden w-full">
            {paginatedGuests.map((guest) => (
              <div
                key={guest.id}
                className="flex flex-wrap sm:flex-nowrap items-center gap-3 px-4 py-3 h-auto sm:h-16 hover:bg-gray-50 transition"
              >
                <div className="flex-1 min-w-[140px]">
                  <p className="font-semibold truncate">{guest.full_name}</p>
                  <p className="text-xs text-gray-500">
                    Age {guest.age} • {guest.gender}
                  </p>
                </div>

                <div className="w-40 shrink-0">
                  <LocalBadge local={guest.local} />
                </div>

                <div className="flex gap-2 shrink-0">
                  <button
                    onClick={() => openViewModal(guest)}
                    className="px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition"
                  >
                    View ID
                  </button>
                  <button
                    onClick={() => openEditForm(guest)}
                    className="px-3 py-1 text-sm bg-teal-600 text-white rounded hover:bg-teal-700 transition"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(guest.id)}
                    className="px-3 py-1 text-sm bg-amber-400 text-white rounded hover:bg-amber-500 transition"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}

            {/* spacer rows so the list height stays consistent across pages */}
            {Array.from({ length: emptySlots }).map((_, i) => (
              <div key={`list-spacer-${i}`} className="h-16" aria-hidden="true" />
            ))}
          </div>
        )}

        {/* Pagination */}
        {guests.length > pageSize && (
          <div className="flex items-center justify-center gap-3 mt-6">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="px-3 py-1.5 text-sm rounded border disabled:opacity-40 disabled:cursor-not-allowed hover:bg-gray-100 transition"
            >
              Prev
            </button>
            <span className="text-sm text-gray-600">
              Page {currentPage} of {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="px-3 py-1.5 text-sm rounded border disabled:opacity-40 disabled:cursor-not-allowed hover:bg-gray-100 transition"
            >
              Next
            </button>
          </div>
        )}
      </div>

      {/* View-only modal (list view "View ID") */}
      {viewingGuest && (
        <div className="fixed inset-0 flex items-center justify-center z-50 bg-black/20 backdrop-blur-sm transition">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-lg animate-[fadeInUp_0.3s_ease-out]">
            <h2 className="text-xl font-bold mb-4 text-teal-600">{viewingGuest.full_name}</h2>
            <div className="space-y-2 text-sm text-gray-700">
              <p>Age: {viewingGuest.age}</p>
              <p>Gender: {viewingGuest.gender}</p>
              <LocalBadge local={viewingGuest.local} />
            </div>
            <div className="mt-3">
              <p className="text-xs text-gray-500 mb-1">ID Document:</p>
              <IdDocumentPreview guest={viewingGuest} />
            </div>
            <div className="flex justify-end gap-2 mt-6">
              <button
                onClick={() => setViewingGuest(null)}
                className="px-4 py-2 rounded border hover:bg-gray-100 transition"
              >
                Close
              </button>
              <button
                onClick={() => {
                  const g = viewingGuest;
                  setViewingGuest(null);
                  openEditForm(g);
                }}
                className="px-4 py-2 bg-teal-600 text-white rounded hover:bg-teal-700 transition"
              >
                Edit
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create/Edit modal */}
      {formOpen && (
        <div className="fixed inset-0 flex items-center justify-center z-50 bg-black/20 backdrop-blur-sm transition">
          <form
            onSubmit={handleSubmit}
            noValidate
            className="bg-white rounded-2xl p-6 w-full max-w-md shadow-lg animate-[fadeInUp_0.3s_ease-out] max-h-[90vh] overflow-y-auto"
          >
            <h2 className="text-xl font-bold mb-4 text-teal-600">
              {editingGuest ? "Edit Guest" : "Add Guest"}
            </h2>
            <div className="space-y-3">
              <div>
                <input
                  name="full_name"
                  placeholder="Full name"
                  value={formData.full_name}
                  onChange={handleChange}
                  className={`w-full border rounded px-3 py-2 focus:ring-2 focus:ring-teal-300 outline-none ${
                    formErrors.full_name ? "border-red-400" : ""
                  }`}
                />
                {formErrors.full_name && (
                  <p className="text-xs text-red-500 mt-1">{formErrors.full_name}</p>
                )}
              </div>

              <div>
                <input
                  name="age"
                  type="number"
                  min="1"
                  placeholder="Age"
                  value={formData.age}
                  onChange={handleChange}
                  className={`w-full border rounded px-3 py-2 focus:ring-2 focus:ring-teal-300 outline-none ${
                    formErrors.age ? "border-red-400" : ""
                  }`}
                />
                {formErrors.age && <p className="text-xs text-red-500 mt-1">{formErrors.age}</p>}
              </div>

              <div>
                <select
                  value={genderChoice}
                  onChange={handleGenderSelectChange}
                  className="w-full border rounded px-3 py-2 focus:ring-2 focus:ring-teal-300 outline-none"
                >
                  {GENDER_OPTIONS.map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                </select>
                {genderChoice === "Other" && (
                  <input
                    name="gender"
                    placeholder="Please specify"
                    value={formData.gender}
                    onChange={handleChange}
                    className={`w-full border rounded px-3 py-2 mt-2 focus:ring-2 focus:ring-teal-300 outline-none ${
                      formErrors.gender ? "border-red-400" : ""
                    }`}
                  />
                )}
                {formErrors.gender && (
                  <p className="text-xs text-red-500 mt-1">{formErrors.gender}</p>
                )}
              </div>

              {/* Current ID (when editing) */}
              {editingGuest && (
                <div>
                  <p className="text-xs text-gray-500 mb-1">Current ID on file:</p>
                  <IdDocumentPreview guest={editingGuest} />
                </div>
              )}

              {/* ID document upload */}
              <label className="flex flex-col text-sm text-gray-700">
                {editingGuest ? "Replace ID (optional)" : "Upload ID (optional)"}
                <input
                  type="file"
                  name="id_document"
                  accept="image/*,.pdf"
                  onChange={handleFileChange}
                  className="mt-1"
                />
              </label>

              {formData.id_preview && (
                <IdDocumentPreview
                  liveFile={{
                    url: formData.id_preview,
                    isPdf: formData.id_document?.type === "application/pdf",
                  }}
                />
              )}

              
              <LocalBadge local={formData.local} />
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