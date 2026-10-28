import React, { useState, useEffect, useRef, useContext } from "react";
import api from "../api";

import { AuthContext } from "./Auth";
import {
  User, Phone, Mail, Camera, CheckCircle,
  AlertCircle, Loader2, Lock, Pencil, Save, ChevronDown, X
} from "lucide-react";

const PROFILE_URL = "/api/user/profile/";
const CHANGE_PASS_URL = "/api/user/change-pass/";

export default function ProfileModal({ open, onClose }) {
  const { theme, updateTheme } = useContext(AuthContext);

  const [user, setUser] = useState(null);
  const [isPassOpen, setIsPassOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [passSaving, setPassSaving] = useState(false);

  const [form, setForm] = useState({ username: "", phone_number: "" });
  const [passData, setPassData] = useState({ old_password: "", new_password: "" });

  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [msg, setMsg] = useState({ type: "", text: "" });

  const [fieldEdit, setFieldEdit] = useState({ username: false, phone_number: false });
  const [openPopoverField, setOpenPopoverField] = useState(null);

  // ---- modal open/close choreography ----
  const [mounted, setMounted] = useState(false);
  const [closing, setClosing] = useState(false);
  const [closeSpin, setCloseSpin] = useState(false);

  const fileInputRef = useRef(null);
  const popoverRef = useRef(null);
  const panelRef = useRef(null);

  const swatches = ["#8b6fcb", "#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#ec4899"];

  useEffect(() => {
    if (open) {
      setUser(null);
      setMsg({ type: "", text: "" });
      fetchProfile();
      const id = requestAnimationFrame(() => setMounted(true));
      return () => cancelAnimationFrame(id);
    } else {
      setMounted(false);
      setClosing(false);
      setCloseSpin(false);
    }
  }, [open]);

  const fetchProfile = async () => {
    try {
      const res = await api.get(PROFILE_URL);
      setUser(res.data);
      setForm({ username: res.data.username, phone_number: res.data.phone_number || "" });
    } catch (err) {
      setMsg({ type: "error", text: "Failed to load profile." });
    }
  };

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target)) {
        setOpenPopoverField(null);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (!open) return;
    const handleKey = (e) => {
      if (e.key === "Escape") requestClose();
    };
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // lock background scroll while open
  useEffect(() => {
    if (open) {
      const prev = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => { document.body.style.overflow = prev; };
    }
  }, [open]);

  const CLOSE_MS = 280;

  const requestClose = () => {
    if (closing) return;
    setMounted(false);
    setClosing(true);
    setTimeout(() => {
      onClose?.();
    }, CLOSE_MS);
  };

  const handleXClick = () => {
    if (closing) return;
    setCloseSpin(true);
    requestClose();
  };

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) requestClose();
  };

  const handleFieldClick = (field) => {
    if (fieldEdit[field]) return;
    setOpenPopoverField(field);
  };

  const confirmFieldEdit = (field) => {
    setFieldEdit((prev) => ({ ...prev, [field]: true }));
    setOpenPopoverField(null);
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setSelectedFile(file);
      setPreviewUrl(URL.createObjectURL(file));
    }
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    setSaving(true);
    setMsg({ type: "", text: "" });

    const data = new FormData();
    data.append("username", form.username);
    data.append("phone_number", form.phone_number);
    if (selectedFile) data.append("profile_picture", selectedFile);

    try {
      const res = await api.patch(PROFILE_URL, data);
      setUser(res.data);
      setPreviewUrl(null);
      setSelectedFile(null);
      setFieldEdit({ username: false, phone_number: false });
      setMsg({ type: "success", text: "Profile updated successfully!" });
    } catch (err) {
      setMsg({ type: "error", text: "Update failed. Check your connection." });
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    setPassSaving(true);
    try {
      await api.post(CHANGE_PASS_URL, passData);
      setMsg({ type: "success", text: "Password changed! Please log in again." });
      setIsPassOpen(false);
      setPassData({ old_password: "", new_password: "" });
    } catch (err) {
      setMsg({ type: "error", text: err.response?.data?.old_password || "Check your details." });
    } finally {
      setPassSaving(false);
    }
  };

  if (!open) return null;

  const EditPopover = ({ field, label }) => (
    <div
      ref={popoverRef}
      className="absolute z-20 top-full mt-1 left-0 bg-white dark:bg-gray-800 border rounded-lg shadow-lg p-3 w-48 animate-in fade-in zoom-in-95 duration-150"
      style={{ borderColor: "var(--accent)" }}
    >
      <p className="text-xs text-gray-600 dark:text-gray-300 mb-2">Edit {label.toLowerCase()}?</p>
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
          className="flex-1 text-xs text-gray-500 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 px-2 py-1.5 rounded-md font-medium"
        >
          Cancel
        </button>
      </div>
    </div>
  );

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center"
      onMouseDown={handleBackdropClick}
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-gray-900/50 backdrop-blur-sm transition-opacity duration-300 ease-out"
        style={{ opacity: mounted ? 1 : 0 }}
      />

      {/* Panel */}
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label="Profile settings"
        className="relative w-full sm:max-w-2xl bg-white dark:bg-gray-900 rounded-t-[2rem] sm:rounded-[2rem] shadow-2xl shadow-black/30 max-h-[92vh] sm:max-h-[88vh] overflow-y-auto transition-all ease-out"
        style={{
          transitionDuration: "300ms",
          transform: mounted ? "translateY(0) scale(1)" : "translateY(24px) scale(0.97)",
          opacity: mounted ? 1 : 0,
        }}
        onMouseDown={(e) => e.stopPropagation()}
      >
        {/* mobile grab handle */}
        <div className="sm:hidden flex justify-center pt-3 pb-1 sticky top-0 bg-white dark:bg-gray-900 z-10">
          <div className="h-1.5 w-10 rounded-full bg-gray-200 dark:bg-gray-700" />
        </div>

        {/* Close button */}
        <button
          type="button"
          onClick={handleXClick}
          aria-label="Close profile"
          className="absolute top-4 right-4 z-20 w-9 h-9 rounded-full flex items-center justify-center bg-white/90 dark:bg-gray-800/90 shadow-md border border-gray-100 dark:border-gray-700 transition-all duration-300 ease-in hover:bg-gray-50 dark:hover:bg-gray-700"
          style={{
            transform: closeSpin ? "scale(0) rotate(180deg)" : "scale(1) rotate(0deg)",
            opacity: closeSpin ? 0 : 1,
          }}
        >
          <X className="w-4 h-4 text-gray-600 dark:text-gray-300" />
        </button>

        {!user ? (
          <div className="flex flex-col items-center justify-center py-24">
            <Loader2 className="w-8 h-8 animate-spin" style={{ color: "var(--accent)" }} />
          </div>
        ) : (
          <div className="pb-8 sm:pb-10">
            {/* Header banner */}
            <div className="h-32 sm:h-40 relative rounded-t-none sm:rounded-t-[2rem] overflow-hidden" style={{ backgroundColor: "var(--accent)" }}>
              <div className="absolute inset-0 opacity-10 bg-[url('https://www.transparenttextures.com/patterns/graphy.png')]" />
            </div>

            <div className="px-5 sm:px-8">
              <div className="relative -top-12 sm:-top-16 flex flex-col sm:flex-row sm:items-end gap-4 sm:gap-6">
                {/* Avatar */}
                <div className="relative group h-28 w-28 sm:h-40 sm:w-40 flex-shrink-0">
                  <div className="h-full w-full rounded-full border-[5px] sm:border-[6px] border-white dark:border-gray-900 bg-white dark:bg-gray-800 overflow-hidden shadow-2xl transition-transform duration-300 group-hover:scale-[1.02]">
                    <img
                      src={previewUrl || user.profile_picture || `https://ui-avatars.com/api/?name=${user.username}&background=8b6fcb&color=fff`}
                      className="h-full w-full object-cover"
                      alt="Profile"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current.click()}
                    className="absolute inset-0 m-[5px] sm:m-[6px] rounded-full bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 active:opacity-100 transition-opacity backdrop-blur-sm"
                  >
                    <Camera className="text-white w-6 h-6 sm:w-8 sm:h-8" />
                  </button>
                  <input type="file" ref={fileInputRef} hidden accept="image/*" onChange={handleFileChange} />
                </div>

                <div className="flex-grow pb-2 sm:pb-4">
                  <h1 className="text-2xl sm:text-4xl font-black text-gray-900 dark:text-gray-100 leading-tight">{user.username}</h1>
                  <span
                    className="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border mt-2 inline-block"
                    style={{
                      color: "var(--accent)",
                      backgroundColor: "color-mix(in srgb, var(--accent) 8%, transparent)",
                      borderColor: "color-mix(in srgb, var(--accent) 25%, transparent)",
                    }}
                  >
                    {user.role}
                  </span>
                </div>
              </div>

              {msg.text && (
                <div className={`flex items-center gap-3 p-4 rounded-2xl mb-6 sm:mb-8 animate-in zoom-in-95 ${
                  msg.type === "success"
                    ? "bg-green-50 dark:bg-green-950 text-green-800 dark:text-green-300"
                    : "bg-red-50 dark:bg-red-950 text-red-800 dark:text-red-300"
                }`}>
                  {msg.type === "success" ? <CheckCircle className="w-5 h-5 flex-shrink-0" /> : <AlertCircle className="w-5 h-5 flex-shrink-0" />}
                  <p className="text-sm font-bold">{msg.text}</p>
                </div>
              )}

              <form onSubmit={handleUpdate} className="space-y-6 sm:space-y-8">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 sm:gap-8">
                  {/* Username — edit-locked */}
                  <div className="relative space-y-2">
                    <label className="text-[11px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest ml-1 flex items-center gap-2">
                      <User className="w-3 h-3" /> Username
                      {fieldEdit.username && (
                        <span
                          className="ml-1 text-[9px] font-semibold px-1.5 py-0.5 rounded-full flex items-center gap-1 normal-case tracking-normal"
                          style={{ color: "var(--accent)", backgroundColor: "color-mix(in srgb, var(--accent) 10%, transparent)" }}
                        >
                          <Pencil size={9} /> editing
                        </span>
                      )}
                    </label>
                    <input
                      readOnly={!fieldEdit.username}
                      value={form.username}
                      onClick={() => handleFieldClick("username")}
                      onChange={(e) => setForm({ ...form, username: e.target.value })}
                      className={`w-full p-4 rounded-2xl border outline-none transition ${
                        fieldEdit.username
                          ? "border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 cursor-text"
                          : "border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/50 cursor-pointer"
                      }`}
                    />
                    {openPopoverField === "username" && <EditPopover field="username" label="Username" />}
                  </div>

                  <div className="space-y-2 opacity-70">
                    <label className="text-[11px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest ml-1 flex items-center gap-2">
                      <Mail className="w-3 h-3" /> Email (Private)
                    </label>
                    <div className="w-full p-4 rounded-2xl border border-gray-100 dark:border-gray-800 bg-gray-100 dark:bg-gray-800 font-semibold text-gray-500 dark:text-gray-400 truncate">
                      {user.email}
                    </div>
                  </div>

                  {/* Phone — edit-locked */}
                  <div className="relative space-y-2">
                    <label className="text-[11px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest ml-1 flex items-center gap-2">
                      <Phone className="w-3 h-3" /> Phone Number
                      {fieldEdit.phone_number && (
                        <span
                          className="ml-1 text-[9px] font-semibold px-1.5 py-0.5 rounded-full flex items-center gap-1 normal-case tracking-normal"
                          style={{ color: "var(--accent)", backgroundColor: "color-mix(in srgb, var(--accent) 10%, transparent)" }}
                        >
                          <Pencil size={9} /> editing
                        </span>
                      )}
                    </label>
                    <input
                      readOnly={!fieldEdit.phone_number}
                      placeholder="+63..."
                      value={form.phone_number}
                      onClick={() => handleFieldClick("phone_number")}
                      onChange={(e) => setForm({ ...form, phone_number: e.target.value })}
                      className={`w-full p-4 rounded-2xl border outline-none transition ${
                        fieldEdit.phone_number
                          ? "border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 cursor-text"
                          : "border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/50 cursor-pointer"
                      }`}
                    />
                    {openPopoverField === "phone_number" && <EditPopover field="phone_number" label="Phone number" />}
                  </div>

                  <div className="space-y-2">
                    <label className="text-[11px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest ml-1">Account Status</label>
                    <div
                      className="p-4 rounded-2xl border flex items-center justify-between"
                      style={{
                        backgroundColor: "color-mix(in srgb, var(--accent) 8%, transparent)",
                        borderColor: "color-mix(in srgb, var(--accent) 20%, transparent)",
                      }}
                    >
                      <span className="font-black text-xs uppercase tracking-tight" style={{ color: "var(--accent)" }}>
                        {user.status || "ACTIVE"}
                      </span>
                      <div className="h-2 w-2 rounded-full animate-pulse" style={{ backgroundColor: "var(--accent)" }} />
                    </div>
                    <label className="text-[11px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest ml-1">Verification Status</label>
                    <div
                      className="p-4 rounded-2xl border flex items-center justify-between"
                      style={{
                        backgroundColor: "color-mix(in srgb, var(--accent) 8%, transparent)",
                        borderColor: "color-mix(in srgb, var(--accent) 20%, transparent)",
                      }}
                    >
                      <span className="font-black text-xs uppercase tracking-tight" style={{ color: "var(--accent)" }}>
                        Status: {user.is_email_verified ? <span>Verified User</span> : <span>Unverified Account</span>}
                      </span>
                      <div className="h-2 w-2 rounded-full animate-pulse" style={{ backgroundColor: "var(--accent)" }} />
                    </div>
                  </div>
                </div>

                {/* Theme color picker */}
                <div>
                  <label className="text-[11px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest ml-1 mb-2 flex items-center gap-2">
                    Theme color
                    <span
                      className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-semibold normal-case tracking-normal"
                      style={{ color: "var(--accent)", backgroundColor: "color-mix(in srgb, var(--accent) 12%, transparent)" }}
                    >
                      <span className="w-2 h-2 rounded-full" style={{ backgroundColor: "var(--accent)" }} />
                      {theme.themeColor}
                    </span>
                  </label>
                  <div className="flex items-center gap-2 mt-2 flex-wrap">
                    {swatches.map((color) => {
                      const selected = theme.themeColor?.toLowerCase() === color.toLowerCase();
                      return (
                        <button
                          key={color}
                          type="button"
                          onClick={() => updateTheme({ themeColor: color })}
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
                    <label className="relative w-8 h-8 rounded-full cursor-pointer border-2 border-dashed border-gray-300 dark:border-gray-600 flex items-center justify-center overflow-hidden">
                      <input
                        type="color"
                        value={theme.themeColor}
                        onChange={(e) => updateTheme({ themeColor: e.target.value })}
                        className="absolute inset-0 opacity-0 cursor-pointer"
                      />
                      <span className="text-[9px] text-gray-400 font-medium">custom</span>
                    </label>
                  </div>
                </div>

                {(fieldEdit.username || fieldEdit.phone_number || selectedFile) && (
                  <button
                    type="submit"
                    disabled={saving}
                    className="w-full text-white font-black py-4 rounded-2xl transition-all flex items-center justify-center gap-2 animate-in fade-in slide-in-from-bottom-2 duration-200"
                    style={{ backgroundColor: "var(--accent)" }}
                  >
                    {saving ? <Loader2 className="animate-spin w-5 h-5" /> : <><Save size={18} /> Save Profile</>}
                  </button>
                )}
              </form>

              {/* Change password — inline expandable */}
              <div className="mt-8 border-t border-gray-100 dark:border-gray-800 pt-6">
                <button
                  type="button"
                  onClick={() => setIsPassOpen((prev) => !prev)}
                  className="w-full flex items-center justify-between text-left group"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="w-9 h-9 rounded-xl flex items-center justify-center"
                      style={{ backgroundColor: "color-mix(in srgb, var(--accent) 10%, transparent)", color: "var(--accent)" }}
                    >
                      <Lock className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-sm font-black text-gray-900 dark:text-gray-100">Change password</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">Update your account security</p>
                    </div>
                  </div>
                  <ChevronDown
                    className={`w-5 h-5 text-gray-400 transition-transform duration-300 ${isPassOpen ? "rotate-180" : ""}`}
                  />
                </button>

                <div
                  className={`grid transition-all duration-300 ease-out ${
                    isPassOpen ? "grid-rows-[1fr] opacity-100 mt-5" : "grid-rows-[0fr] opacity-0"
                  }`}
                >
                  <div className="overflow-hidden">
                    <form onSubmit={handleChangePassword} className="space-y-4 pb-2">
                      <div>
                        <label className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest ml-1">Current Password</label>
                        <input
                          type="password"
                          required
                          value={passData.old_password}
                          onChange={(e) => setPassData({ ...passData, old_password: e.target.value })}
                          className="w-full p-4 rounded-2xl border border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 outline-none transition text-gray-900 dark:text-gray-100"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest ml-1">New Password</label>
                        <input
                          type="password"
                          required
                          value={passData.new_password}
                          onChange={(e) => setPassData({ ...passData, new_password: e.target.value })}
                          className="w-full p-4 rounded-2xl border border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 outline-none transition text-gray-900 dark:text-gray-100"
                        />
                      </div>
                      <button
                        type="submit"
                        disabled={passSaving}
                        className="w-full bg-black dark:bg-gray-700 text-white font-black py-4 rounded-2xl transition-all flex items-center justify-center gap-2"
                      >
                        {passSaving ? <Loader2 className="animate-spin w-5 h-5" /> : "Update Password"}
                      </button>
                    </form>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}