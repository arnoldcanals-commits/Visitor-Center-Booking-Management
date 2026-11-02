import { useState } from "react";

const PHONE_REGEX = /^\+?\d{7,15}$/;

const buildInitialForm = (user) => ({
  username: user?.username ?? "",
  email: user?.email ?? "",
  first_name: user?.first_name ?? "",
  last_name: user?.last_name ?? "",
  password: "",
  phone_number: user?.phone_number ?? "",
  role: user?.role ?? "tourist",
  status: user?.status ?? "",
  is_email_verified: !!user?.is_email_verified,
  darkMode: !!user?.darkMode,
  themeColor: user?.themeColor || "#3b82f6",
});

const inputClass =
  "w-full mt-1 p-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 outline-none focus:border-blue-500";
const labelText = "text-gray-600 dark:text-gray-400 text-sm font-medium";

// Turns DRF error responses ({field: ["msg"]} or {detail: "msg"}) into a string
const formatApiError = (err) => {
  const data = err?.response?.data;
  if (!data) return err?.message || "Failed to save user.";
  if (typeof data === "string") return data;
  if (data.detail) return data.detail;
  return Object.entries(data)
    .map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(" ") : v}`)
    .join(" | ");
};

/**
 * Props:
 * - user:          existing user object to edit, or null/undefined to create
 * - roles:         role values the dropdown may offer
 * - statusOptions: [{ value, label }]
 * - formatRole:    (value) => label
 * - roleLocked:    disables role select (e.g. admin)
 * - onSubmit:      async (payload, userId?) => void. Payload is a plain object,
 *                  or FormData when a profile picture was chosen. Throw to show an error.
 * - onClose:       () => void
 *
 * Render it conditionally ({isOpen && <UserFormModal .../>}) so the form resets each time.
 */
export default function UserFormModal({
  user = null,
  roles,
  statusOptions,
  formatRole,
  roleLocked = false,
  onSubmit,
  onClose,
}) {
  const isEdit = !!user?.id;
  const [form, setForm] = useState(() => buildInitialForm(user));
  const [pictureFile, setPictureFile] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const set = (field) => (e) =>
    setForm((f) => ({
      ...f,
      [field]: e.target.type === "checkbox" ? e.target.checked : e.target.value,
    }));

  const previewUrl = pictureFile ? URL.createObjectURL(pictureFile) : user?.profile_picture || null;

  const handleClose = () => {
    if (!saving) onClose();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    if (!form.username.trim() || !form.email.trim()) {
      setError("Username and email are required.");
      return;
    }
    if (form.phone_number && !PHONE_REGEX.test(form.phone_number)) {
      setError("Phone number must be 7-15 digits, optionally starting with +.");
      return;
    }
    if (!isEdit && !form.password) {
      setError("Password is required for new users.");
      return;
    }

    const fields = {
      username: form.username.trim(),
      email: form.email.trim(),
      first_name: form.first_name,
      last_name: form.last_name,
      phone_number: form.phone_number || null,
      role: form.role,
      status: form.status || null,
      is_email_verified: form.is_email_verified,
      darkMode: form.darkMode,
      themeColor: form.themeColor,
    };
    if (!isEdit || form.password) fields.password = form.password;

    let payload = fields;
    if (pictureFile) {
      // ImageField needs multipart. null fields are omitted (can't be sent in FormData).
      payload = new FormData();
      Object.entries(fields).forEach(([k, v]) => {
        if (v !== null && v !== undefined) payload.append(k, v);
      });
      payload.append("profile_picture", pictureFile);
    }

    setSaving(true);
    try {
      await onSubmit(payload, user?.id);
    } catch (err) {
      console.error("Failed to save user:", err);
      setError(formatApiError(err));
      setSaving(false);
    }
    // On success the parent closes (unmounts) the modal.
  };

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black/50 z-50 p-4 backdrop-blur-sm">
      <form
        onSubmit={handleSubmit}
        className="bg-white dark:bg-gray-800 rounded-xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto shadow-xl border border-transparent dark:border-gray-700"
      >
        <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-gray-100">
          {isEdit ? "Edit User" : "Create New User"}
        </h2>

        {error && (
          <div className="mb-3 bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 text-sm rounded-lg p-2 border border-red-200 dark:border-red-800">
            {error}
          </div>
        )}

        {/* Profile picture */}
        <div className="flex items-center gap-3 mb-3">
          {previewUrl ? (
            <img src={previewUrl} alt="Profile preview" className="w-14 h-14 rounded-full object-cover" />
          ) : (
            <div className="w-14 h-14 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-400 flex items-center justify-center font-semibold uppercase text-lg">
              {form.username?.charAt(0) || "?"}
            </div>
          )}
          <label className="flex-1">
            <span className={labelText}>Profile Picture</span>
            <input
              type="file"
              accept="image/*"
              onChange={(e) => setPictureFile(e.target.files?.[0] || null)}
              className="block w-full mt-1 text-sm text-gray-600 dark:text-gray-300"
            />
          </label>
        </div>

        <label className="block mb-2">
          <span className={labelText}>Username</span>
          <input className={inputClass} value={form.username} onChange={set("username")} required />
        </label>

        <div className="grid grid-cols-2 gap-2 mb-2">
          <label className="block">
            <span className={labelText}>First Name</span>
            <input className={inputClass} value={form.first_name} onChange={set("first_name")} />
          </label>
          <label className="block">
            <span className={labelText}>Last Name</span>
            <input className={inputClass} value={form.last_name} onChange={set("last_name")} />
          </label>
        </div>

        <label className="block mb-2">
          <span className={labelText}>Email</span>
          <input type="email" className={inputClass} value={form.email} onChange={set("email")} required />
        </label>

        <label className="flex items-center gap-2 mb-3 mt-1">
          <input
            type="checkbox"
            checked={form.is_email_verified}
            onChange={set("is_email_verified")}
            className="w-4 h-4 rounded border-gray-300 dark:border-gray-600 text-blue-600 focus:ring-blue-500"
          />
          <span className={labelText}>Email verified</span>
        </label>

        <label className="block mb-2">
          <span className={labelText}>
            Password{isEdit && <span className="text-gray-400 font-normal"> (leave blank to keep current)</span>}
          </span>
          <input
            type="password"
            autoComplete="new-password"
            className={inputClass}
            value={form.password}
            onChange={set("password")}
          />
        </label>

        <label className="block mb-2">
          <span className={labelText}>Phone Number</span>
          <input
            className={inputClass}
            value={form.phone_number}
            onChange={set("phone_number")}
            placeholder="+639171234567"
            maxLength={15}
          />
        </label>

        <label className="block mb-2">
          <span className={labelText}>Status</span>
          <select className={inputClass} value={form.status} onChange={set("status")}>
            {statusOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </label>

        <label className="block mb-3">
          <span className={labelText}>Role</span>
          <select
            className={`${inputClass} disabled:bg-gray-100 disabled:dark:bg-gray-600 disabled:text-gray-500`}
            value={form.role}
            disabled={roleLocked}
            onChange={set("role")}
          >
            {(roleLocked ? ["admin"] : roles).map((role) => (
              <option key={role} value={role}>
                {formatRole(role)}
              </option>
            ))}
          </select>
          {roleLocked && (
            <span className="text-xs text-gray-400 dark:text-gray-500 mt-1 block">
              Admin role cannot be changed.
            </span>
          )}
        </label>

        {/* Appearance */}
        <div className="flex items-center justify-between gap-4 mb-4">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={form.darkMode}
              onChange={set("darkMode")}
              className="w-4 h-4 rounded border-gray-300 dark:border-gray-600 text-blue-600 focus:ring-blue-500"
            />
            <span className={labelText}>Dark mode</span>
          </label>

          <label className="flex items-center gap-2">
            <span className={labelText}>Theme color</span>
            <input
              type="color"
              value={form.themeColor}
              onChange={set("themeColor")}
              className="w-9 h-8 p-0 border border-gray-300 dark:border-gray-600 rounded cursor-pointer bg-transparent"
            />
          </label>
        </div>

        <div className="flex justify-end gap-2 flex-wrap">
          <button
            type="button"
            onClick={handleClose}
            disabled={saving}
            className="px-4 py-2 bg-gray-300 text-gray-800 rounded hover:bg-gray-400 dark:bg-gray-600 dark:text-gray-200 dark:hover:bg-gray-500 disabled:opacity-60"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 disabled:opacity-60"
          >
            {saving ? "Saving..." : isEdit ? "Save Changes" : "Create User"}
          </button>
        </div>
      </form>
    </div>
  );
}