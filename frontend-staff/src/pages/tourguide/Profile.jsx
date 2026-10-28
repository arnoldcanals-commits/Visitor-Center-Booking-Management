import React, { useContext, useState } from "react";
import { TourGuideDataContext } from "../../contexts/TourGuideDataContext";

export default function TourGuideProfile() {
  const { guideData, updateStatus, loading } =
    useContext(TourGuideDataContext);

  const profile = guideData?.profile;

  const [status, setStatus] = useState(profile?.status || "");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null);

  if (loading) {
    return <div className="p-6">Loading profile...</div>;
  }

  if (!profile) {
    return (
      <div className="p-6 text-red-500">
        Failed to load profile data.
      </div>
    );
  }

  // --------------------------------------------------
  // Status Update
  // --------------------------------------------------
  const handleStatusChange = async (e) => {
    const newStatus = e.target.value;
    setStatus(newStatus);
    setSaving(true);
    setMessage(null);

    const success = await updateStatus(newStatus);

    if (success) {
      setMessage("Status updated successfully.");
    } else {
      setMessage("Failed to update status.");
    }

    setSaving(false);
  };

  return (
    <div className="p-6 space-y-6 max-w-3xl">
      {/* ================= HEADER ================= */}
      <div className="bg-white dark:bg-gray-900 rounded-xl shadow p-4 border border-transparent dark:border-gray-800">
        <h1 className="text-2xl font-bold dark:text-white">My Profile</h1>
        <p className="text-gray-500">
          Tour guide account information
        </p>
      </div>

      {/* ================= PROFILE CARD ================= */}
      <div className="bg-white shadow rounded p-6 space-y-4 bg-white dark:bg-gray-900 rounded-xl shadow p-4 border border-transparent dark:border-gray-800 dark:text-white text-black">
        {/* Username */}
        <ProfileRow label="Username" value={profile.username} />

        {/* Email */}
        <ProfileRow label="Email" value={profile.email} />

        {/* Phone */}
        <ProfileRow
          label="Phone Number"
          value={profile.phone_number || "—"}
        />

        {/* Qualifications */}
        <div>
          <p className="text-sm text-gray-500 mb-1">
            Qualifications
          </p>

          {profile.qualifications?.length === 0 ? (
            <p className="text-gray-400 text-sm">
              No qualifications assigned
            </p>
          ) : (
            <ul className="list-disc list-inside text-sm">
              {profile.qualifications.map((q) => (
                <li key={q.id}>
                  <span className="font-medium">{q.name}</span>
                  {q.description && (
                    <span className="text-gray-500">
                      {" "}
                      — {q.description}
                    </span>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* ================= STATUS ================= */}
        <div>
          <label className="block text-sm text-gray-500 mb-1">
            Availability Status
          </label>

          <select
            value={status || ""}
            onChange={handleStatusChange}
            disabled={saving}
            className="border rounded py-2 w-full max-w-xs text-black dark:text-white border-[var(--accent)] dark:bg-gray-900"
          >
            <option value="available">Available</option>
            <option value="busy">Busy</option>
            <option value="on_leave">On Leave</option>
          </select>

          {message && (
            <p className="mt-2 text-sm text-teal-600">
              {message}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

// =====================================================
// Reusable Row
// =====================================================
function ProfileRow({ label, value }) {
  return (
    <div>
      <p className="text-sm text-gray-500">{label}</p>
      <p className="font-medium">{value}</p>
    </div>
  );
}
