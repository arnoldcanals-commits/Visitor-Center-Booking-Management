import React, { useState, useEffect, useRef } from "react";
import api from "../api";
import { 
  User, Phone, Mail, Shield, Camera, CheckCircle, 
  AlertCircle, Loader2, Key, Lock, X 
} from "lucide-react";

export default function ProfileView() {
  const [user, setUser] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isPassModalOpen, setIsPassModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  
  // Forms State
  const [formData, setFormData] = useState({ username: "", phone_number: "" });
  const [passData, setPassData] = useState({ old_password: "", new_password: "" });
  
  // Upload State
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [msg, setMsg] = useState({ type: "", text: "" });
  
  const fileInputRef = useRef(null);

  useEffect(() => { fetchProfile(); }, []);

  const fetchProfile = async () => {
    try {
      const res = await api.get("/api/user/profile/");
      setUser(res.data);
      setFormData({ username: res.data.username, phone_number: res.data.phone_number || "" });
    } catch (err) {
      setMsg({ type: "error", text: "Failed to load profile." });
    }
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
    setLoading(true);
    const data = new FormData();
    data.append("username", formData.username);
    data.append("phone_number", formData.phone_number);
    if (selectedFile) data.append("profile_picture", selectedFile);

    try {
      const res = await api.patch("/api/user/profile/", data);
      setUser(res.data);
      setIsEditing(false);
      setPreviewUrl(null);
      setMsg({ type: "success", text: "Profile updated successfully!" });
    } catch (err) {
      setMsg({ type: "error", text: "Update failed. Check your connection." });
    } finally { setLoading(false); }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.post("/api/user/change-pass/", passData);
      setMsg({ type: "success", text: "Password changed! Please log in again." });
      setIsPassModalOpen(false);
      setPassData({ old_password: "", new_password: "" });
    } catch (err) {
      alert("Error: " + (err.response?.data?.old_password || "Check your details"));
    } finally { setLoading(false); }
  };

  if (!user) return (
    <div className="flex flex-col items-center justify-center min-h-screen font-['Inter']">
      <Loader2 className="w-8 h-8 animate-spin text-teal-600" />
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 font-['Inter'] pb-20">
      <div className="max-w-4xl mx-auto py-12 px-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
        
        <div className="bg-white rounded-[2rem] shadow-xl shadow-gray-200/50 border border-gray-100 overflow-hidden">
          {/* Header */}
          <div className="h-40 bg-gradient-to-r from-teal-600 to-teal-900 relative">
            <div className="absolute inset-0 opacity-10 bg-[url('https://www.transparenttextures.com/patterns/graphy.png')]"></div>
          </div>
          
          <div className="px-8 pb-10">
            <div className="relative -top-16 flex flex-col md:flex-row md:items-end gap-6">
              {/* Avatar */}
              <div className="relative group h-40 w-40 flex-shrink-0">
                <div className="h-full w-full rounded-full border-[6px] border-white bg-white overflow-hidden shadow-2xl transition-transform duration-300 group-hover:scale-[1.02]">
                  <img 
                    src={previewUrl || user.profile_picture || `https://ui-avatars.com/api/?name=${user.username}&background=0D9488&color=fff`} 
                    className="h-full w-full object-cover" 
                    alt="Profile" 
                  />
                </div>
                {isEditing && (
                  <button 
                    onClick={() => fileInputRef.current.click()}
                    className="absolute inset-0 m-[6px] rounded-full bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity backdrop-blur-sm"
                  >
                    <Camera className="text-white w-8 h-8" />
                  </button>
                )}
                <input type="file" ref={fileInputRef} hidden accept="image/*" onChange={handleFileChange} />
              </div>

              <div className="flex-grow pb-4">
                <h1 className="text-4xl font-black text-gray-900 leading-tight">{user.username}</h1>
                <span className="px-3 py-1 bg-teal-50 text-teal-700 rounded-full text-[10px] font-black uppercase tracking-widest border border-teal-100 mt-2 inline-block">
                  {user.role}
                </span>
              </div>

              <div className="flex gap-2 mb-4">
                <button 
                  onClick={() => setIsPassModalOpen(true)}
                  className="p-2.5 rounded-full bg-gray-100 text-gray-600 hover:bg-teal-50 hover:text-teal-600 transition"
                  title="Security Settings"
                >
                  <Key className="w-5 h-5" />
                </button>
                <button 
                  onClick={() => { setIsEditing(!isEditing); setPreviewUrl(null); }}
                  className={`px-8 py-2.5 rounded-full font-bold text-sm transition-all ${
                    isEditing ? "bg-red-50 text-red-600 hover:bg-red-100" : "bg-teal-900 text-white hover:bg-black"
                  }`}
                >
                  {isEditing ? "Cancel" : "Edit Profile"}
                </button>
              </div>
            </div>

            {msg.text && (
              <div className={`flex items-center gap-3 p-4 rounded-2xl mb-8 animate-in zoom-in-95 ${
                msg.type === 'success' ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'
              }`}>
                {msg.type === 'success' ? <CheckCircle className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
                <p className="text-sm font-bold">{msg.text}</p>
              </div>
            )}

            <form onSubmit={handleUpdate} className="space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-2">
                  <label className="text-[11px] font-black text-gray-400 uppercase tracking-widest ml-1 flex items-center gap-2">
                    <User className="w-3 h-3"/> Username
                  </label>
                  <input 
                    disabled={!isEditing}
                    value={formData.username}
                    onChange={(e) => setFormData({...formData, username: e.target.value})}
                    className="w-full p-4 rounded-2xl border border-gray-100 bg-gray-50/50 focus:bg-white focus:ring-4 focus:ring-teal-500/10 outline-none transition disabled:opacity-60"
                  />
                </div>

                <div className="space-y-2 opacity-70">
                  <label className="text-[11px] font-black text-gray-400 uppercase tracking-widest ml-1 flex items-center gap-2">
                    <Mail className="w-3 h-3"/> Email (Private)
                  </label>
                  <div className="w-full p-4 rounded-2xl border border-gray-100 bg-gray-100 font-semibold text-gray-500">
                    {user.email}
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[11px] font-black text-gray-400 uppercase tracking-widest ml-1 flex items-center gap-2">
                    <Phone className="w-3 h-3"/> Phone Number
                  </label>
                  <input 
                    disabled={!isEditing}
                    placeholder="+63..."
                    value={formData.phone_number}
                    onChange={(e) => setFormData({...formData, phone_number: e.target.value})}
                    className="w-full p-4 rounded-2xl border border-gray-100 bg-gray-50/50 focus:bg-white focus:ring-4 focus:ring-teal-500/10 outline-none transition disabled:opacity-60"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[11px] font-black text-gray-400 uppercase tracking-widest ml-1">Account Status</label>
                  <div className="p-4 rounded-2xl bg-teal-50 border border-teal-100 flex items-center justify-between">
                    <span className="text-teal-800 font-black text-xs uppercase tracking-tight">{user.status || "ACTIVE"}</span>
                    <div className="h-2 w-2 rounded-full bg-teal-500 animate-pulse"></div>
                  </div>
                </div>
              </div>

              {isEditing && (
                <button type="submit" disabled={loading} className="w-full bg-teal-600 text-white font-black py-4 rounded-2xl hover:bg-teal-700 shadow-xl shadow-teal-600/20 transition-all flex items-center justify-center gap-2">
                  {loading ? <Loader2 className="animate-spin w-5 h-5"/> : "Save Profile"}
                </button>
              )}
            </form>
          </div>
        </div>
      </div>

      {/* --- Change Password Modal --- */}
      {isPassModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-[2rem] w-full max-w-md p-8 shadow-2xl relative animate-in zoom-in-95 duration-300">
            <button onClick={() => setIsPassModalOpen(false)} className="absolute top-6 right-6 text-gray-400 hover:text-black transition">
              <X className="w-6 h-6"/>
            </button>
            
            <div className="mb-6">
              <div className="w-12 h-12 bg-teal-50 rounded-2xl flex items-center justify-center text-teal-600 mb-4">
                <Lock className="w-6 h-6"/>
              </div>
              <h2 className="text-2xl font-black text-gray-900">Security</h2>
              <p className="text-sm text-gray-500">Ensure your account uses a long, random password.</p>
            </div>

            <form onSubmit={handleChangePassword} className="space-y-4">
              <div>
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Current Password</label>
                <input 
                  type="password"
                  required
                  onChange={(e) => setPassData({...passData, old_password: e.target.value})}
                  className="w-full p-4 rounded-2xl border border-gray-100 bg-gray-50 focus:bg-white focus:ring-4 focus:ring-teal-500/10 outline-none transition"
                />
              </div>
              <div>
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">New Password</label>
                <input 
                  type="password"
                  required
                  onChange={(e) => setPassData({...passData, new_password: e.target.value})}
                  className="w-full p-4 rounded-2xl border border-gray-100 bg-gray-50 focus:bg-white focus:ring-4 focus:ring-teal-500/10 outline-none transition"
                />
              </div>
              <button 
                type="submit" 
                disabled={loading}
                className="w-full bg-black text-white font-black py-4 rounded-2xl hover:bg-teal-700 transition-all shadow-xl shadow-black/10 mt-4 flex items-center justify-center gap-2"
              >
                {loading ? <Loader2 className="animate-spin w-5 h-5"/> : "Update Password"}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}