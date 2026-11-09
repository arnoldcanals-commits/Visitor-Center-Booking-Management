import { useEffect, useState, useCallback, useMemo, useRef } from "react";
import api from "../api";
import { ACCESS_TOKEN } from "../constants";
import {
  LayoutGrid,
  List,
  UserRoundPen,
  LockKeyhole,
  X,
  ShieldCheck,
  CheckSquare,
  Trash2,
} from "lucide-react";
import LoadingIndicator from "../components/LoadingIndicator";
import TopBar from "../components/TopBar";

const GENDER_OPTIONS = ["Male", "Female", "Other"];
const PAGE_SIZE_OPTIONS = [6, 12, 24];
const MAX_ID_FILE_MB = 10;

const EMPTY_FORM = {
  full_name: "",
  age: "",
  gender: "Male", // matches the dropdown's default so "Male" is a real value immediately
  id_number: "",
  local: false,
  id_document: null,
  id_preview: null,
};

// Shared accent-tinted "chip" style, matches the pattern used in TopBar/ProfileModal
const accentChip = {
  backgroundColor: "color-mix(in srgb, var(--accent) 8%, transparent)",
  color: "var(--accent)",
  borderColor: "color-mix(in srgb, var(--accent) 20%, transparent)",
};

const isLoggedIn = () => {
  const token = localStorage.getItem(ACCESS_TOKEN);
  return !!token && token !== "null" && token !== "undefined";
};

// =========================
// Small shared bits (defined outside the component so they aren't
// re-created on every render, which caused image flicker)
// =========================
const LocalBadge = ({ local }) => (
  <div className="h-6 flex items-center">
    {local && (
      <span
        className="mt-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold text-white shadow-sm"
        style={{ backgroundColor: "var(--accent)" }}
      >
        Local discount Eligible
      </span>
    )}
  </div>
);

const IdDocumentPreview = ({ guest, liveFile }) => {
  if (liveFile) {
    return liveFile.isPdf ? (
      <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
        PDF selected — preview unavailable until saved.
      </p>
    ) : (
      <img
        src={liveFile.url}
        alt="ID preview"
        className="w-full h-40 object-cover rounded-md border border-gray-200 dark:border-gray-700 mt-2"
      />
    );
  }
  if (!guest?.id_document) {
    return <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">No ID document on file.</p>;
  }
  const isPdf = guest.id_document.toLowerCase().endsWith(".pdf");
  return isPdf ? (
    <a
      href={guest.id_document}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-block text-sm underline mt-2"
      style={{ color: "var(--accent)" }}
    >
      View PDF
    </a>
  ) : (
    <img
      src={guest.id_document}
      alt={`${guest.full_name} ID`}
      className="w-full h-40 object-cover rounded-md border border-gray-200 dark:border-gray-700 mt-2"
    />
  );
};

const SelectBox = ({ checked, onChange, label }) => (
  <input
    type="checkbox"
    checked={checked}
    onChange={onChange}
    onClick={(e) => e.stopPropagation()}
    aria-label={label}
    className="w-5 h-5 shrink-0 cursor-pointer rounded"
    style={{ accentColor: "var(--accent)" }}
  />
);

/**
 * @param {boolean} embedded - true when rendered inside a modal (e.g. ProfileModal's
 *   panel, or any other floating container). Suppresses <TopBar/> and the page-level
 *   max-width/centering, since the parent modal already provides that chrome.
 * @param {() => void} [onClose] - optional; when provided while embedded, shows a
 *   close (X) button in the header.
 */
export default function GuestManagement({ embedded = false, onClose } = {}) {
  const [guests, setGuests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [authed, setAuthed] = useState(isLoggedIn());

  // view + pagination
  const [viewMode, setViewMode] = useState("list"); // "grid" | "list"
  const [pageSize, setPageSize] = useState(6);
  const [currentPage, setCurrentPage] = useState(1);

  // batch selection
  const [selectMode, setSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState(() => new Set());
  const [deleting, setDeleting] = useState(false);
  const deletingRef = useRef(false);

  // create/edit modal
  const [formOpen, setFormOpen] = useState(false);
  const [editingGuest, setEditingGuest] = useState(null);
  const [genderChoice, setGenderChoice] = useState("Male"); // dropdown selection
  const [formData, setFormData] = useState(EMPTY_FORM);
  const [formErrors, setFormErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const submittingRef = useRef(false);

  // view-only modal (list view "view id" / details)
  const [viewingGuest, setViewingGuest] = useState(null);

  // =========================
  // Fetch guests
  // =========================
  const fetchGuests = useCallback(async () => {
    if (!isLoggedIn()) {
      setAuthed(false);
      setLoading(false);
      return;
    }
    setAuthed(true);
    setLoading(true);
    setError(null);

    const minDelay = new Promise((resolve) => setTimeout(resolve, 1000)); // 1 second minimum

    try {
      const [res] = await Promise.all([api.get("api/guests/"), minDelay]);
      setGuests(res.data);
      // drop any selected ids that no longer exist
      setSelectedIds((prev) => {
        const valid = new Set(res.data.map((g) => g.id));
        const next = new Set([...prev].filter((id) => valid.has(id)));
        return next.size === prev.size ? prev : next;
      });
    } catch (err) {
      console.error("Failed to fetch guests:", err);
      if (err.response?.status === 401) {
        setAuthed(false);
      } else {
        setError("Failed to load guests. Please try again.");
      }
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
  // Selection handlers
  // =========================
  const toggleSelected = (id) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const pageIds = paginatedGuests.map((g) => g.id);
  const allOnPageSelected = pageIds.length > 0 && pageIds.every((id) => selectedIds.has(id));

  const toggleSelectPage = () => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (allOnPageSelected) pageIds.forEach((id) => next.delete(id));
      else pageIds.forEach((id) => next.add(id));
      return next;
    });
  };

  const exitSelectMode = () => {
    setSelectMode(false);
    setSelectedIds(new Set());
  };

  // =========================
  // Form handlers
  // =========================
  const resetFormState = () => {
    setFormData(EMPTY_FORM);
    setGenderChoice("Male");
    setFormErrors({});
  };

  const closeForm = () => {
    if (formData.id_preview) URL.revokeObjectURL(formData.id_preview);
    setFormOpen(false);
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
      setFormData((prev) => ({ ...prev, gender: "" }));
    } else {
      setFormData((prev) => ({ ...prev, gender: value }));
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0] || null;

    if (file) {
      const okType = file.type.startsWith("image/") || file.type === "application/pdf";
      if (!okType) {
        setFormErrors((p) => ({ ...p, id_document: "Only image or PDF files are allowed." }));
        e.target.value = "";
        return;
      }
      if (file.size > MAX_ID_FILE_MB * 1024 * 1024) {
        setFormErrors((p) => ({ ...p, id_document: `File is too large (max ${MAX_ID_FILE_MB}MB).` }));
        e.target.value = "";
        return;
      }
    }

    if (formData.id_preview) URL.revokeObjectURL(formData.id_preview); // avoid memory leak
    setFormErrors((p) => {
      const { id_document, ...rest } = p;
      return rest;
    });
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
    // ID required: a new file, or an existing one when editing
    if (!formData.id_document && !editingGuest?.id_document) {
      errors.id_document = "An ID document is required.";
    }
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (submittingRef.current) return; // blocks double-clicks instantly
    if (!validateForm()) return;

    submittingRef.current = true;
    setSubmitting(true);

    try {
      const data = new FormData();
      data.append("full_name", formData.full_name.trim());
      data.append("age", formData.age);
      data.append("gender", formData.gender.trim());
      data.append("local", formData.local);
      if (formData.id_document) {
        data.append("id_document", formData.id_document);
      }

      const config = {
        headers: { "Content-Type": "multipart/form-data" },
        maxBodyLength: Infinity, // no client-side cap on request size
        maxContentLength: Infinity,
        timeout: 120000, // allow slow uploads (2 min)
      };

      if (editingGuest) {
        await api.patch(`api/guests/${editingGuest.id}/`, data, config);
      } else {
        await api.post("api/guests/", data, config);
      }
      closeForm();
      fetchGuests();
    } catch (err) {
      console.error("Failed to save guest:", err);
      if (err.response?.status === 413) {
        alert("The file is too large for the server. Please use a smaller file.");
      } else {
        alert("Failed to save guest. Please check your input.");
      }
    } finally {
      submittingRef.current = false;
      setSubmitting(false);
    }
  };

  // =========================
  // Delete handlers
  // =========================
  const handleDelete = async (guestId) => {
    if (deletingRef.current) return;
    if (!window.confirm("Remove this guest from your list?")) return;

    deletingRef.current = true;
    setDeleting(true);
    try {
      await api.delete(`api/guests/${guestId}/`);
      fetchGuests();
    } catch (err) {
      console.error("Failed to delete guest:", err);
      alert("Failed to delete guest.");
    } finally {
      deletingRef.current = false;
      setDeleting(false);
    }
  };

  const handleBatchDelete = async () => {
    if (deletingRef.current || selectedIds.size === 0) return;
    const ids = [...selectedIds];
    const noun = ids.length === 1 ? "guest" : "guests";
    if (!window.confirm(`Remove ${ids.length} selected ${noun} from your list? This can't be undone.`)) return;

    deletingRef.current = true;
    setDeleting(true);
    try {
      // one failure shouldn't stop the rest
      const results = await Promise.allSettled(ids.map((id) => api.delete(`api/guests/${id}/`)));
      const failedIds = ids.filter((_, i) => results[i].status === "rejected");

      if (failedIds.length > 0) {
        console.error("Some deletions failed:", failedIds);
        alert(`${ids.length - failedIds.length} removed, ${failedIds.length} failed. The failed ones are still selected so you can retry.`);
        setSelectedIds(new Set(failedIds));
      } else {
        exitSelectMode();
      }
      fetchGuests();
    } finally {
      deletingRef.current = false;
      setDeleting(false);
    }
  };

  // =========================
  // States — this is the part BELOW the header (title/Add Guest
  // button render immediately further down, independent of these states).
  // =========================
  let body;

  if (loading) {
    body = (
      <div className="flex justify-center items-center h-40">
        <LoadingIndicator />
      </div>
    );
  } else if (!authed) {
    body = (
      <div className="flex flex-col items-center justify-center py-10 text-center">
        <div className="flex items-center justify-center w-14 h-14 rounded-full mb-3" style={accentChip}>
          <LockKeyhole size={26} />
        </div>
        <h2 className="text-2xl font-bold mb-2 text-gray-900 dark:text-gray-100">Login required</h2>
        <p className="text-gray-500 dark:text-gray-400 mb-4">Login to view your guest information.</p>
        <a
          href="/login"
          className="px-4 py-2 text-white rounded hover:brightness-90 transition"
          style={{ backgroundColor: "var(--accent)" }}
        >
          Log in
        </a>
      </div>
    );
  } else if (error) {
    body = (
      <div className="flex flex-col items-center justify-center py-10 text-center">
        <h2 className="text-2xl font-bold mb-2 text-gray-900 dark:text-gray-100">😅 Oops!</h2>
        <p className="text-red-500 dark:text-red-400 mb-4">{error}</p>
        <button
          onClick={fetchGuests}
          className="px-4 py-2 text-white rounded hover:brightness-90 transition"
          style={{ backgroundColor: "var(--accent)" }}
        >
          Retry
        </button>
      </div>
    );
  } else {
    body = (
      <>
        {/* Controls: view toggle + select + page size */}
        {guests.length > 0 && (
          <div className="bg-white dark:bg-gray-800 border border-transparent dark:border-gray-700 p-3 rounded-2xl shadow dark:shadow-black/30 flex flex-wrap items-center justify-between gap-3 mb-4">
            <div className="flex items-center gap-3 flex-wrap">
              <div className="flex items-center gap-1 bg-gray-100 dark:bg-gray-900 rounded-lg p-1">
                <button
                  onClick={() => setViewMode("grid")}
                  aria-label="Grid view"
                  className={`px-3 py-1.5 text-sm rounded-md transition ${
                    viewMode === "grid"
                      ? "bg-white dark:bg-gray-700 shadow font-medium"
                      : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
                  }`}
                  style={viewMode === "grid" ? { color: "var(--accent)" } : undefined}
                >
                  <LayoutGrid size={28} />
                </button>
                <button
                  onClick={() => setViewMode("list")}
                  aria-label="List view"
                  className={`px-3 py-1.5 text-sm rounded-md transition ${
                    viewMode === "list"
                      ? "bg-white dark:bg-gray-700 shadow font-medium"
                      : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
                  }`}
                  style={viewMode === "list" ? { color: "var(--accent)" } : undefined}
                >
                  <List size={28} />
                </button>
              </div>

              <button
                onClick={() => (selectMode ? exitSelectMode() : setSelectMode(true))}
                className="flex items-center gap-1.5 px-3 py-2 text-sm rounded-lg border transition hover:brightness-95"
                style={selectMode ? accentChip : undefined}
              >
                {selectMode ? (
                  <>
                    <X size={16} /> Cancel
                  </>
                ) : (
                  <span className="flex items-center gap-1.5 text-gray-700 dark:text-gray-200">
                    <CheckSquare size={16} /> Select
                  </span>
                )}
              </button>
            </div>

            <label className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
              Per page
              <select
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value));
                  setCurrentPage(1);
                }}
                className="border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 rounded px-6 py-1 text-sm focus:ring-2 focus:ring-[var(--accent)]/30 outline-none"
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

        {/* Batch action bar */}
        {selectMode && guests.length > 0 && (
          <div
            className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-2xl border mb-4"
            style={accentChip}
          >
            <label className="flex items-center gap-2 text-sm font-medium cursor-pointer">
              <SelectBox
                checked={allOnPageSelected}
                onChange={toggleSelectPage}
                label="Select all guests on this page"
              />
              Select all on this page
              <span className="font-normal opacity-80">({selectedIds.size} selected)</span>
            </label>
            <button
              onClick={handleBatchDelete}
              disabled={selectedIds.size === 0 || deleting}
              className="flex items-center gap-1.5 px-4 py-2 text-sm text-white bg-amber-500 rounded-lg shadow hover:bg-amber-600 transition disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Trash2 size={16} />
              {deleting ? "Deleting..." : `Delete selected (${selectedIds.size})`}
            </button>
          </div>
        )}

        {/* Empty state */}
        {guests.length === 0 ? (
          <div className="text-center py-10">
            <h2 className="text-2xl font-bold mb-2 text-gray-900 dark:text-gray-100">🤷 No guests yet</h2>
            <p className="text-gray-500 dark:text-gray-400 mb-4">Add guests to reuse them in future bookings.</p>
            <button
              onClick={openCreateForm}
              className="px-4 py-2 text-white rounded-lg shadow hover:brightness-90 transition transform hover:scale-105"
              style={{ backgroundColor: "var(--accent)" }}
            >
              + Add Your First Guest
            </button>
          </div>
        ) : viewMode === "grid" ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 auto-rows-fr">
            {paginatedGuests.map((guest) => {
              const isSelected = selectedIds.has(guest.id);
              return (
                <div
                  key={guest.id}
                  onClick={selectMode ? () => toggleSelected(guest.id) : undefined}
                  className={`bg-white dark:bg-gray-800 border rounded-2xl shadow dark:shadow-black/30 p-4 flex flex-col transition transform hover:-translate-y-1 hover:shadow-lg ${
                    selectMode ? "cursor-pointer" : ""
                  } ${isSelected ? "" : "border-transparent dark:border-gray-700"}`}
                  style={isSelected ? { borderColor: "var(--accent)" } : undefined}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 truncate">
                        {guest.full_name}
                      </h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        Age: {guest.age} • {guest.gender}
                      </p>
                    </div>
                    {selectMode && (
                      <SelectBox
                        checked={isSelected}
                        onChange={() => toggleSelected(guest.id)}
                        label={`Select ${guest.full_name}`}
                      />
                    )}
                  </div>

                  {guest.id_document && (
                    <div className="mt-2">
                      <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">ID Preview:</p>
                      <IdDocumentPreview guest={guest} />
                    </div>
                  )}

                  <LocalBadge local={guest.local} />

                  {!selectMode && (
                    <div className="flex gap-2 mt-4">
                      <button
                        onClick={() => openEditForm(guest)}
                        className="flex-1 px-3 py-1 text-sm text-white rounded hover:brightness-90 transition transform hover:scale-105"
                        style={{ backgroundColor: "var(--accent)" }}
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(guest.id)}
                        disabled={deleting}
                        className="flex-1 px-3 py-1 text-sm bg-amber-400 text-white rounded hover:bg-amber-500 transition transform hover:scale-105 disabled:opacity-50"
                      >
                        Delete
                      </button>
                    </div>
                  )}
                </div>
              );
            })}

            {Array.from({ length: emptySlots }).map((_, i) => (
              <div key={`grid-spacer-${i}`} className="invisible rounded-2xl p-4" aria-hidden="true">
                <div className="h-full" />
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-white dark:bg-gray-800 border border-transparent dark:border-gray-700 rounded-2xl shadow dark:shadow-black/30 divide-y divide-gray-100 dark:divide-gray-700 overflow-hidden w-full">
            {paginatedGuests.map((guest) => {
              const isSelected = selectedIds.has(guest.id);
              return (
                <div
                  key={guest.id}
                  onClick={selectMode ? () => toggleSelected(guest.id) : undefined}
                  className={`flex flex-wrap sm:flex-nowrap items-center gap-3 px-4 py-3 h-auto sm:h-16 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition ${
                    selectMode ? "cursor-pointer" : ""
                  }`}
                  style={
                    isSelected
                      ? { backgroundColor: "color-mix(in srgb, var(--accent) 8%, transparent)" }
                      : undefined
                  }
                >
                  {selectMode && (
                    <SelectBox
                      checked={isSelected}
                      onChange={() => toggleSelected(guest.id)}
                      label={`Select ${guest.full_name}`}
                    />
                  )}

                  <div className="flex-1 min-w-[140px]">
                    <p className="font-semibold truncate text-gray-900 dark:text-gray-100">{guest.full_name}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      Age {guest.age} • {guest.gender}
                    </p>
                  </div>

                  <div className="w-40 shrink-0">
                    <LocalBadge local={guest.local} />
                  </div>

                  {!selectMode && (
                    <div className="flex gap-2 shrink-0">
                      <button
                        onClick={() => openViewModal(guest)}
                        className="px-3 py-1 text-sm bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 rounded hover:bg-gray-200 dark:hover:bg-gray-600 transition"
                      >
                        View ID
                      </button>
                      <button
                        onClick={() => openEditForm(guest)}
                        className="px-3 py-1 text-sm text-white rounded hover:brightness-90 transition"
                        style={{ backgroundColor: "var(--accent)" }}
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(guest.id)}
                        disabled={deleting}
                        className="px-3 py-1 text-sm bg-amber-400 text-white rounded hover:bg-amber-500 transition disabled:opacity-50"
                      >
                        Delete
                      </button>
                    </div>
                  )}
                </div>
              );
            })}

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
              className="px-3 py-1.5 text-sm rounded border border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-200 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-gray-100 dark:hover:bg-gray-700 transition"
            >
              Prev
            </button>
            <span className="text-sm text-gray-600 dark:text-gray-400">
              Page {currentPage} of {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="px-3 py-1.5 text-sm rounded border border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-200 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-gray-100 dark:hover:bg-gray-700 transition"
            >
              Next
            </button>
          </div>
        )}
      </>
    );
  }

  return (
    <div className="min-h-[700px] bg-white dark:bg-gray-900">
      {!embedded && <TopBar />}
      <div className="animate-[fadeInUp_0.35s_ease-out]" style={{ minHeight: embedded ? "auto" : "200px" }}>
        <div className={embedded ? "w-full p-1 sm:p-2" : "max-w-5xl mx-auto p-2 sm:p-4"}>
          {/* Header — renders immediately with the TopBar, no fetch wait */}
          <div className="bg-white dark:bg-gray-800 p-4 sm:p-6 rounded-2xl shadow dark:shadow-black/30 border border-transparent dark:border-gray-700 flex flex-wrap gap-4 justify-between items-center mb-6">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 p-3 rounded-xl w-fit border" style={accentChip}>
                <UserRoundPen size={28} />
                <span className="text-sm font-black uppercase tracking-tight">Guest Management</span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {authed && (
                <button
                  onClick={openCreateForm}
                  className="px-4 py-2 text-white rounded-lg shadow transform hover:scale-105 hover:brightness-90 transition"
                  style={{ backgroundColor: "var(--accent)" }}
                >
                  + Add Guest
                </button>
              )}
              {embedded && onClose && (
                <button
                  onClick={onClose}
                  aria-label="Close"
                  className="w-9 h-9 flex items-center justify-center rounded-full bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 transition"
                >
                  <X size={18} />
                </button>
              )}
            </div>
          </div>

          {/* Body — reacts to loading / auth / error */}
          {body}
        </div>

        {/* View-only modal (list view "View ID") */}
        {viewingGuest && (
          <div className="fixed inset-0 flex items-center justify-center z-50 bg-black/20 dark:bg-gray-900 backdrop-blur-sm transition">
            <div className="bg-white dark:bg-gray-900 border border-transparent dark:border-gray-700 rounded-2xl p-6 w-full max-w-md shadow-lg animate-[fadeInUp_0.3s_ease-out]">
              <h2 className="text-xl font-bold mb-4" style={{ color: "var(--accent)" }}>
                {viewingGuest.full_name}
              </h2>
              <div className="space-y-2 text-sm text-gray-700 dark:text-gray-300">
                <p>Age: {viewingGuest.age}</p>
                <p>Gender: {viewingGuest.gender}</p>
                <LocalBadge local={viewingGuest.local} />
              </div>
              <div className="mt-3">
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">ID Document:</p>
                <IdDocumentPreview guest={viewingGuest} />
              </div>
              <div className="flex justify-end gap-2 mt-6">
                <button
                  onClick={() => setViewingGuest(null)}
                  className="px-4 py-2 rounded border border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 transition"
                >
                  Close
                </button>
                <button
                  onClick={() => {
                    const g = viewingGuest;
                    setViewingGuest(null);
                    openEditForm(g);
                  }}
                  className="px-4 py-2 text-white rounded hover:brightness-90 transition"
                  style={{ backgroundColor: "var(--accent)" }}
                >
                  Edit
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Create/Edit modal */}
        {formOpen && (
          <div className="fixed inset-0 flex items-center justify-center z-50 bg-black/20 dark:bg-gray-900 backdrop-blur-sm transition">
            <form
              onSubmit={handleSubmit}
              noValidate
              className="bg-white dark:bg-gray-800 border border-transparent dark:border-gray-700 rounded-2xl p-6 w-full max-w-md shadow-lg animate-[fadeInUp_0.3s_ease-out] max-h-[90vh] overflow-y-auto"
            >
              <h2 className="text-xl font-bold mb-4" style={{ color: "var(--accent)" }}>
                {editingGuest ? "Edit Guest" : "Add Guest"}
              </h2>
              <div className="space-y-3">
                <div>
                  <input
                    name="full_name"
                    placeholder="Full name"
                    value={formData.full_name}
                    onChange={handleChange}
                    className={`w-full border rounded px-3 py-2 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-[var(--accent)]/30 outline-none ${
                      formErrors.full_name ? "border-red-400" : "border-gray-200 dark:border-gray-600"
                    }`}
                  />
                  {formErrors.full_name && (
                    <p className="text-xs text-red-500 dark:text-red-400 mt-1">{formErrors.full_name}</p>
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
                    className={`w-full border rounded px-3 py-2 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-[var(--accent)]/30 outline-none ${
                      formErrors.age ? "border-red-400" : "border-gray-200 dark:border-gray-600"
                    }`}
                  />
                  {formErrors.age && <p className="text-xs text-red-500 dark:text-red-400 mt-1">{formErrors.age}</p>}
                </div>

                <div>
                  <select
                    value={genderChoice}
                    onChange={handleGenderSelectChange}
                    className="w-full border border-gray-200 dark:border-gray-600 rounded px-3 py-2 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-[var(--accent)]/30 outline-none"
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
                      className={`w-full border rounded px-3 py-2 mt-2 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-[var(--accent)]/30 outline-none ${
                        formErrors.gender ? "border-red-400" : "border-gray-200 dark:border-gray-600"
                      }`}
                    />
                  )}
                  {formErrors.gender && (
                    <p className="text-xs text-red-500 dark:text-red-400 mt-1">{formErrors.gender}</p>
                  )}
                </div>

                {editingGuest && (
                  <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Current ID on file:</p>
                    <IdDocumentPreview guest={editingGuest} />
                  </div>
                )}

                {/* Data privacy notice */}
                <div
                  className="flex items-start gap-2 p-3 rounded-lg border text-xs leading-relaxed"
                  style={accentChip}
                >
                  <ShieldCheck size={16} className="shrink-0 mt-0.5" />
                  <p>
                    <span className="font-semibold">Your privacy matters.</span> Your guests' personal
                    information and ID documents are used only to verify identity and confirm discount
                    eligibility for your bookings. They are stored securely, are not shared with third
                    parties, and can be deleted by removing the guest from your list.
                  </p>
                </div>

                <label className="flex flex-col text-sm text-gray-700 dark:text-gray-300">
                  <span>
                    {editingGuest ? "Replace ID" : "Upload ID"} <span className="text-red-500">*</span>
                  </span>
                  <input
                    type="file"
                    name="id_document"
                    accept="image/*,.pdf"
                    onChange={handleFileChange}
                    className="mt-1 text-gray-700 dark:text-gray-300"
                  />
                  <span className="text-xs text-gray-400 mt-1">Images or PDF, up to {MAX_ID_FILE_MB}MB.</span>
                  {formErrors.id_document && (
                    <p className="text-xs text-red-500 dark:text-red-400 mt-1">{formErrors.id_document}</p>
                  )}
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
                  onClick={closeForm}
                  disabled={submitting}
                  className="px-4 py-2 rounded border border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 transition disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 text-white rounded hover:brightness-90 transition transform hover:scale-105 disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:scale-100"
                  style={{ backgroundColor: "var(--accent)" }}
                >
                  {submitting ? "Saving..." : "Save"}
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
    </div>
  );
}