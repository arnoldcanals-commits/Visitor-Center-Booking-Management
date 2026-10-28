import { useEffect, useState, useContext, useRef } from "react";
import { User, Mail, Phone, Camera, Save, Loader2, X, Key, Lock, CheckCircle, AlertCircle, Pencil } from "lucide-react";
import api from "../api";
import { AuthContext } from "../contexts/AuthContext";

const PROFILE_URL = "api/user/profile/";
const CHANGE_PASS_URL = "api/user/change-pass/";

export default function Profile({ onClose }) {
  const { authTokens, updateThemeColor } = useContext(AuthContext);
  const fileInputRef = useRef();
  const popoverRef = useRef(null);
  
  const [profile, setProfile] = useState(null);
  const [isPassModalOpen, setIsPassModalOpen] = useState(false);

  const [form, setForm] = useState({ username: "", email: "", phone_number: "", themeColor: "#8b5cf6" });
  const [passData, setPassData] = useState({ old_password: "", new_password: "" });
  const [pictureFile, setPictureFile] = useState(null);
  const [picturePreview, setPicturePreview] = useState(null);

  // Per-field edit locks (colors are intentionally excluded — never locked)
  const [fieldEdit, setFieldEdit] = useState({ username: false, phone_number: false });
  const [openPopoverField, setOpenPopoverField] = useState(null); // "username" | "phone_number" | null

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [passSaving, setPassSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const authHeader = { Authorization: `Bearer ${authTokens?.access}` };

  // READ — fetch profile on mount
  useEffect(() => {
    const fetchProfile = async () => {
      setLoading(true);
      setError("");
      try {
        const res = await api.get(PROFILE_URL, { headers: authHeader });
        const data = res.data;
        setProfile(data);
        setForm({
          username: data.username || "",
          email: data.email || "",
          phone_number: data.phone_number || "",
          themeColor: data.themeColor || "#8b5cf6",
        });
      } catch (err) {
        setError(err.response?.data?.detail || "Could not load profile.");
      } finally {
        setLoading(false);
      }
    };

    if (authTokens?.access) fetchProfile();
  }, [authTokens?.access]);

  // Close popover on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target)) {
        setOpenPopoverField(null);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleFieldClick = (field) => {
    if (fieldEdit[field]) return; // already unlocked, do nothing
    setOpenPopoverField(field);
  };

  const confirmFieldEdit = (field) => {
    setFieldEdit((prev) => ({ ...prev, [field]: true }));
    setOpenPopoverField(null);
  };

  const handlePictureSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPictureFile(file);
    setPicturePreview(URL.createObjectURL(file));
  };

  // UPDATE — PATCH profile fields (and picture, if changed)
  // UPDATE — PATCH profile fields (and picture, if changed)
  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    setSuccess("");

    try {
      let res;

      if (pictureFile) {
        const body = new FormData();
        body.append("username", form.username);
        body.append("phone_number", form.phone_number);
        
        body.append("profile_picture", pictureFile);

        res = await api.patch(PROFILE_URL, body, { headers: authHeader });
      } else {
        res = await api.patch(
          PROFILE_URL,
          { username: form.username, phone_number: form.phone_number },
          { headers: authHeader }
        );
      }

      setProfile(res.data);
      setPictureFile(null);
      setPicturePreview(null);
      setFieldEdit({ username: false, phone_number: false }); // re-lock fields
      setSuccess("Profile updated!");
    } catch (err) {
      setError(err.response?.data?.detail || "Something went wrong.");
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    setPassSaving(true);
    setError("");
    try {
      await api.post(CHANGE_PASS_URL, passData, { headers: authHeader });
      setSuccess("Password changed! Please log in again.");
      setIsPassModalOpen(false);
      setPassData({ old_password: "", new_password: "" });
    } catch (err) {
      setError(err.response?.data?.old_password || "Could not change password. Check your details.");
    } finally {
      setPassSaving(false);
    }
  };

  const displayPicture =
    picturePreview ||
    profile?.profile_picture ||
    `https://ui-avatars.com/api/?name=${encodeURIComponent(form.username || "Admin")}&background=8b7cd8&color=fff`;

  const swatches = ["#8b6fcb", "#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#ec4899"];

  // Small reusable popover asking to confirm edit
  const EditPopover = ({ field, label }) => (
    <div
      ref={popoverRef}
      className="absolute z-20 top-full mt-1 left-0 bg-white border rounded-lg shadow-lg p-3 w-48"
      style={{ borderColor: "var(--accent)" }}
    >
      <p className="text-xs text-gray-600 mb-2">Edit {label.toLowerCase()}?</p>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => confirmFieldEdit(field)}
          className="flex-1 text-xs text-white px-2 py-1.5 rounded-md font-medium"
          style={{ backgroundColor: "var(--accent)" }}
        >
          Edit
        </button>
        <button
          type="button"
          onClick={() => setOpenPopoverField(null)}
          className="flex-1 text-xs text-gray-500 bg-gray-100 hover:bg-gray-200 px-2 py-1.5 rounded-md font-medium"
        >
          Cancel
        </button>
      </div>
    </div>
  );

  return (
    <div
      className="fixed inset-0 z-[100] flex items-start justify-center bg-black/30 px-4 pt-24 pb-8 overflow-y-auto"
      onClick={onClose}
     
    >
      <div
        className="w-full max-w-md bg-white border rounded-2xl shadow-xl p-6 animate-fadeIn"
        style={{ borderColor: "var(--accent)" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-xl font-semibold" style={{ color: "var(--accent)" }}>
            Profile
          </h1>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 hover:bg-gray-100 p-1.5 rounded-full transition"
          >
            <X size={18} />
          </button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-48">
            <Loader2 className="animate-spin" size={32} style={{ color: "var(--accent)" }} />
          </div>
        ) : (
          <>
            {error && (
              <div className="flex items-center gap-2 mb-4 text-sm text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2">
                <AlertCircle size={14} />
                {error}
              </div>
            )}
            {success && (
              <div
                className="flex items-center gap-2 mb-4 text-sm rounded-md px-3 py-2 border"
                style={{
                  color: "var(--accent)",
                  backgroundColor: "color-mix(in srgb, var(--accent) 10%, white)",
                  borderColor: "color-mix(in srgb, var(--accent) 30%, white)",
                }}
              >
                <CheckCircle size={14} />
                {success}
              </div>
            )}

            <form onSubmit={handleSave} className="space-y-5">
              {/* Picture */}
              <div className="flex items-center gap-4">
                <div className="relative">
                  <img
                    src={displayPicture}
                    alt="Profile"
                    className="w-20 h-20 rounded-full object-cover border-2"
                    style={{ borderColor: "var(--accent)" }}
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="absolute -bottom-1 -right-1 text-white p-1.5 rounded-full shadow transition"
                    style={{ backgroundColor: "var(--accent)" }}
                  >
                    <Camera size={14} />
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handlePictureSelect}
                    className="hidden"
                  />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-700">{form.username || "Admin"}</p>
                  {profile?.role && (
                    <span
                      className="inline-block mt-1 px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wide border"
                      style={{
                        color: "var(--accent)",
                        backgroundColor: "color-mix(in srgb, var(--accent) 8%, white)",
                        borderColor: "color-mix(in srgb, var(--accent) 25%, white)",
                      }}
                    >
                      {profile.role}
                    </span>
                  )}
                </div>
              </div>

              {/* Username */}
              <div className="relative">
                <label className="text-sm font-medium text-gray-600 flex items-center gap-1 mb-1">
                  <User size={14} /> Username
                  {fieldEdit.username && (
                    <span
                      className="ml-1 text-[10px] font-semibold px-1.5 py-0.5 rounded-full flex items-center gap-1"
                      style={{ color: "var(--accent)", backgroundColor: "color-mix(in srgb, var(--accent) 10%, white)" }}
                    >
                      <Pencil size={9} /> editing
                    </span>
                  )}
                </label>
                <input
                  type="text"
                  name="username"
                  readOnly={!fieldEdit.username}
                  value={form.username}
                  onChange={handleChange}
                  onClick={() => handleFieldClick("username")}
                  className={`w-full border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 transition ${
                    fieldEdit.username ? "border-gray-300 bg-white cursor-text" : "border-gray-200 bg-gray-50 cursor-pointer"
                  }`}
                  style={{ "--tw-ring-color": "var(--accent)" }}
                />
                {openPopoverField === "username" && <EditPopover field="username" label="Username" />}
              </div>

              {/* Phone */}
              <div className="relative">
                <label className="text-sm font-medium text-gray-600 flex items-center gap-1 mb-1">
                  <Phone size={14} /> Phone Number
                  {fieldEdit.phone_number && (
                    <span
                      className="ml-1 text-[10px] font-semibold px-1.5 py-0.5 rounded-full flex items-center gap-1"
                      style={{ color: "var(--accent)", backgroundColor: "color-mix(in srgb, var(--accent) 10%, white)" }}
                    >
                      <Pencil size={9} /> editing
                    </span>
                  )}
                </label>
                <input
                  type="text"
                  name="phone_number"
                  readOnly={!fieldEdit.phone_number}
                  placeholder="+63..."
                  value={form.phone_number}
                  onChange={handleChange}
                  onClick={() => handleFieldClick("phone_number")}
                  className={`w-full border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 transition ${
                    fieldEdit.phone_number ? "border-gray-300 bg-white cursor-text" : "border-gray-200 bg-gray-50 cursor-pointer"
                  }`}
                  style={{ "--tw-ring-color": "var(--accent)" }}
                />
                {openPopoverField === "phone_number" && <EditPopover field="phone_number" label="Phone number" />}
              </div>

              {/* Email (read-only, no popover — email is never editable here) */}
              <div>
                <label className="text-sm font-medium text-gray-600 flex items-center gap-1 mb-1">
                  <Mail size={14} /> Email
                </label>
                <div className="w-full border border-gray-200 rounded-md px-3 py-2 text-sm bg-gray-50 text-gray-500">
                  {form.email}
                </div>
              </div>

              {/* Theme color — never locked, applies instantly */}
<div>
  <label className="text-sm font-medium text-gray-600 mb-2 flex items-center gap-2">
    Theme color
    <span
      className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-semibold"
      style={{ color: "var(--accent)", backgroundColor: "color-mix(in srgb, var(--accent) 12%, white)" }}
    >
      <span className="w-2 h-2 rounded-full" style={{ backgroundColor: "var(--accent)" }} />
      {form.themeColor}
    </span>
  </label>
  <div className="flex items-center gap-2">
    {swatches.map((color) => {
      const selected = form.themeColor.toLowerCase() === color.toLowerCase();
      return (
        <button
          key={color}
          type="button"
          onClick={() => {
            setForm({ ...form, themeColor: color }); // keep local form in sync for the badge/preview
            updateThemeColor(color); // fire immediately
          }}
          style={{ backgroundColor: color }}
          className="relative w-8 h-8 rounded-full transition hover:scale-110"
        >
          {selected && (
            <span className="absolute -top-1.5 -right-1.5 bg-white rounded-full shadow">
              <CheckCircle size={16} style={{ color }} fill="white" />
            </span>
          )}
        </button>
      );
    })}
    <label className="relative w-8 h-8 rounded-full cursor-pointer border-2 border-dashed border-gray-300 flex items-center justify-center overflow-hidden">
      <input
        type="color"
        value={form.themeColor}
        onChange={(e) => {
          setForm({ ...form, themeColor: e.target.value });
          updateThemeColor(e.target.value);
        }}
        className="absolute inset-0 opacity-0 cursor-pointer"
      />
      <span className="text-[9px] text-gray-400 font-medium">custom</span>
    </label>
  </div>
</div>

              <div className="flex items-center justify-between pt-2">
                <button
                  type="submit"
                  disabled={saving}
                  className="flex items-center gap-2 disabled:opacity-60 text-white px-4 py-2 rounded-md text-sm font-medium transition"
                  style={{ backgroundColor: "var(--accent)" }}
                >
                  {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                  {saving ? "Saving..." : "Save changes"}
                </button>

                <button
                  type="button"
                  onClick={() => setIsPassModalOpen(true)}
                  className="flex items-center gap-2 text-gray-500 text-sm font-medium transition"
                  onMouseEnter={(e) => (e.currentTarget.style.color = "var(--accent)")}
                  onMouseLeave={(e) => (e.currentTarget.style.color = "")}
                >
                  <Key size={16} />
                  Change password
                </button>
              </div>
            </form>
          </>
        )}

        {/* Change Password modal */}
        {isPassModalOpen && (
          <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-[110]" onClick={() => setIsPassModalOpen(false)}>
            <div className="bg-white rounded-lg shadow-lg p-6 w-80" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center"
                    style={{ backgroundColor: "color-mix(in srgb, var(--accent) 10%, white)", color: "var(--accent)" }}
                  >
                    <Lock size={14} />
                  </div>
                  <h2 className="text-sm font-semibold text-gray-800">Change password</h2>
                </div>
                <button onClick={() => setIsPassModalOpen(false)}>
                  <X size={16} className="text-gray-400 hover:text-gray-600" />
                </button>
              </div>

              <form onSubmit={handleChangePassword} className="space-y-3">
                <div>
                  <label className="text-xs font-medium text-gray-500 mb-1 block">Current password</label>
                  <input
                    type="password"
                    required
                    value={passData.old_password}
                    onChange={(e) => setPassData({ ...passData, old_password: e.target.value })}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2"
                    style={{ "--tw-ring-color": "var(--accent)" }}
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500 mb-1 block">New password</label>
                  <input
                    type="password"
                    required
                    value={passData.new_password}
                    onChange={(e) => setPassData({ ...passData, new_password: e.target.value })}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2"
                    style={{ "--tw-ring-color": "var(--accent)" }}
                  />
                </div>
                <button
                  type="submit"
                  disabled={passSaving}
                  className="w-full flex items-center justify-center gap-2 disabled:opacity-60 text-white px-3 py-2 rounded-md text-sm font-medium transition mt-2"
                  style={{ backgroundColor: "var(--accent)" }}
                >
                  {passSaving ? <Loader2 size={16} className="animate-spin" /> : "Update password"}
                </button>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}