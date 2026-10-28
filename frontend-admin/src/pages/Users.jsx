import { useState, useEffect, useMemo, useCallback } from "react";
import api from "../api";
import { Archive, ArchiveRestore, Users2 } from "lucide-react";
import AccentBadge from "../components/AccentBadge";

const ROLES = ["admin", "tourist", "tour_guide", "staff", "station_staff", "driver", "ranger"];
const ASSIGNABLE_ROLES = ROLES.filter((r) => r !== "admin");

const STATUS_OPTIONS = [
  { value: "", label: "No status" },
  { value: "available", label: "Available" },
  { value: "busy", label: "Busy" },
  { value: "on_leave", label: "On Leave" },
];

const formatRole = (role) => role.replace("_", " ").replace(/\b\w/g, (c) => c.toUpperCase());

const STATUS_COLORS = {
  available: "bg-green-100 text-green-700",
  busy: "bg-yellow-100 text-yellow-700",
  on_leave: "bg-gray-100 text-gray-600",
};

const USERS_ENDPOINT = "api/site_admin/users/";

const emptyUserForm = {
  username: "",
  email: "",
  phone_number: "",
  role: "tourist",
  status: "",
  is_email_verified: false,
  qualifications: [],
};

export default function Users() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const [isOpen, setIsOpen] = useState(false);
  const [editData, setEditData] = useState(null);
  const [roleLocked, setRoleLocked] = useState(false);
  const [search, setSearch] = useState("");
  const [entriesPerPage, setEntriesPerPage] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);
  const [activeRole, setActiveRole] = useState("tourist");
  const [showArchived, setShowArchived] = useState(false);

  // ---------------------------------------
  // FETCH USERS
  // ---------------------------------------
  const fetchUsers = useCallback(async () => {
    try {
      const res = await api.get(USERS_ENDPOINT);
      setUsers(res.data || []);
      setError(null);
    } catch (err) {
      console.error("Failed to load users:", err);
      setError("Failed to load users.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  // ---------------------------------------
  // FILTER USERS
  // ---------------------------------------
  const filteredUsers = useMemo(() => {
    let data = users;
    data = data.filter((u) => u.role === activeRole);
    data = data.filter((u) => !!u.is_archived === showArchived);

    if (search) {
      const q = search.toLowerCase();
      data = data.filter(
        (u) =>
          u.username?.toLowerCase().includes(q) ||
          u.email?.toLowerCase().includes(q) ||
          u.phone_number?.toLowerCase().includes(q)
      );
    }
    return data;
  }, [search, users, activeRole, showArchived]);

  // ---------------------------------------
  // PAGINATE USERS
  // ---------------------------------------
  const paginatedUsers = useMemo(() => {
    const start = (currentPage - 1) * entriesPerPage;
    return filteredUsers.slice(start, start + entriesPerPage);
  }, [filteredUsers, currentPage, entriesPerPage]);

  const totalPages = Math.max(1, Math.ceil(filteredUsers.length / entriesPerPage));

  // ---------------------------------------
  // USER COUNTS (for header stats)
  // ---------------------------------------
  const totalUsersCount = users.length;
  const totalRoleUsersCount = useMemo(
    () => users.filter((u) => u.role === activeRole).length,
    [users, activeRole]
  );
  const totalActiveUsersCount = useMemo(() => users.filter((u) => u.is_active).length, [users]);
  const totalActiveRoleUsersCount = useMemo(
    () => users.filter((u) => u.role === activeRole && u.is_active).length,
    [users, activeRole]
  );

  // ---------------------------------------
  // MODAL HANDLERS
  // ---------------------------------------
  const openCreateModal = () => {
    setEditData({ ...emptyUserForm });
    setRoleLocked(false);
    setIsOpen(true);
  };

  const openEditModal = (user) => {
    setEditData({
      ...user,
      status: user.status || "",
      is_email_verified: !!user.is_email_verified,
    });
    setRoleLocked(user.role === "admin");
    setIsOpen(true);
  };

  const closeModal = () => {
    if (saving) return;
    setIsOpen(false);
    setEditData(null);
    setRoleLocked(false);
  };

  // ---------------------------------------
  // CREATE / UPDATE
  // ---------------------------------------
  const handleSubmit = async () => {
    if (!editData) return;

    const payload = {
      username: editData.username,
      email: editData.email,
      phone_number: editData.phone_number || null,
      role: editData.role,
      status: editData.status || null,
      is_email_verified: editData.is_email_verified,
    };

    setSaving(true);
    try {
      if (editData.id) {
        await api.patch(`${USERS_ENDPOINT}${editData.id}/`, payload);
      } else {
        await api.post(USERS_ENDPOINT, payload);
      }
      await fetchUsers();
      closeModal();
    } catch (err) {
      console.error("Failed to save user:", err);
      setError(err?.response?.data?.detail || "Failed to save user.");
    } finally {
      setSaving(false);
    }
  };

  // ---------------------------------------
  // ARCHIVE / RESTORE
  // ---------------------------------------
  const handleArchiveUser = async (user) => {
    try {
      await api.patch(`${USERS_ENDPOINT}${user.id}/archive/`);
      await fetchUsers();
    } catch (err) {
      console.error("Failed to archive/restore user:", err);
      setError("Failed to archive/restore user.");
    }
  };

  // ---------------------------------------
  // DELETE
  // ---------------------------------------
  const handleDeleteUser = async (user) => {
    if (user.role === "admin") return;
    if (!window.confirm(`Delete ${user.username}? This can't be undone from here.`)) return;

    try {
      await api.delete(`${USERS_ENDPOINT}${user.id}/`);
      await fetchUsers();
    } catch (err) {
      console.error("Failed to delete user:", err);
      setError(err?.response?.data?.detail || "Failed to delete user.");
    }
  };

  if (loading) return <div>Loading users...</div>;

  return (
    <div>
      {/* Header & Controls */}
      <div className="flex flex-col gap-6 w-full mb-6">
        <div className="bg-white p-4 rounded-xl shadow flex items-center justify-between gap-4 dark:bg-gray-800 border border-transparent dark:border-gray-700/50">
          <AccentBadge icon={Users2}>Users Management </AccentBadge>
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                setShowArchived(!showArchived);
                setCurrentPage(1);
              }}
              className={`px-3 py-2 rounded-lg text-sm font-medium border transition ${
                showArchived
                  ? "bg-gray-800 text-white border-gray-800 dark:bg-gray-200 dark:text-gray-900 dark:border-gray-200"
                  : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50 dark:bg-gray-700 dark:text-gray-200 dark:border-gray-600 dark:hover:bg-gray-600"
              }`}
            >
              {showArchived ? "View Active" : "View Archive"}
            </button>

            <button
              onClick={openCreateModal}
              className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg shadow hover:bg-blue-700 flex-shrink-0 dark:bg-blue-500 dark:hover:bg-blue-600"
            >
              + Add User
            </button>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 text-sm rounded-xl p-3 border border-red-200 dark:border-red-800">
            {error}
          </div>
        )}

        {/* Stats */}
        <div className="w-full">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-x-6 gap-y-2 text-sm bg-white dark:bg-gray-800 rounded-xl shadow p-4 border border-transparent dark:border-gray-700/50">
            <div className="flex flex-row justify-between items-center h-8">
              <div className="text-gray-500 dark:text-gray-400 text-xs truncate mr-2">Total Accounts</div>
              <div className="font-semibold text-blue-900 dark:text-blue-200 text-xs px-2 py-0.5 rounded min-w-[2.5rem] text-center bg-blue-50 dark:bg-blue-950/40">
                {totalUsersCount}
              </div>
            </div>

            <div className="flex flex-row justify-between items-center h-8 border-gray-100 dark:border-gray-700 sm:border-l sm:pl-4">
              <div className="text-gray-500 dark:text-gray-400 text-xs truncate mr-2">Active Accounts</div>
              <div className="font-semibold text-green-900 dark:text-green-200 text-xs px-2 py-0.5 rounded min-w-[2.5rem] text-center bg-green-50 dark:bg-green-950/40">
                {totalActiveUsersCount}
              </div>
            </div>

            <div className="flex flex-row justify-between items-center h-8 border-gray-100 dark:border-gray-700 md:border-l md:pl-4">
              <div className="text-gray-500 dark:text-gray-400 text-xs truncate mr-2">
                Total {formatRole(activeRole)} Accounts
              </div>
              <div className="font-semibold text-blue-900 dark:text-blue-200 text-xs px-2 py-0.5 rounded min-w-[2.5rem] text-center bg-blue-50 dark:bg-blue-950/40">
                {totalRoleUsersCount}
              </div>
            </div>

            <div className="flex flex-row justify-between items-center h-8 border-gray-100 dark:border-gray-700 sm:border-l sm:pl-4 md:pl-4">
              <div className="text-gray-500 dark:text-gray-400 text-xs truncate mr-2">
                Active {formatRole(activeRole)} Accounts
              </div>
              <div className="font-semibold text-emerald-900 dark:text-emerald-200 text-xs px-2 py-0.5 rounded min-w-[2.5rem] text-center bg-emerald-50 dark:bg-emerald-950/40">
                {totalActiveRoleUsersCount}
              </div>
            </div>
          </div>
        </div>

        {/* Action controls */}
        <div className="flex flex-wrap items-center gap-3 bg-white dark:bg-gray-800 rounded-xl shadow p-4 text-gray-700 dark:text-gray-200 border border-transparent dark:border-gray-700/50">
          <input
            type="text"
            placeholder="Search users..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setCurrentPage(1);
            }}
            className="border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-700 text-sm p-2 rounded-lg outline-none focus:border-blue-500 dark:focus:border-blue-400 placeholder-gray-400 dark:placeholder-gray-500"
          />

          <select
            value={activeRole}
            onChange={(e) => {
              setActiveRole(e.target.value);
              setCurrentPage(1);
            }}
            className="border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-700 text-sm p-2 rounded-lg pr-8 outline-none focus:border-blue-500 dark:focus:border-blue-400"
          >
            {ROLES.map((role) => (
              <option key={role} value={role}>
                {formatRole(role)}
              </option>
            ))}
          </select>

          <select
            value={entriesPerPage}
            onChange={(e) => {
              setEntriesPerPage(parseInt(e.target.value));
              setCurrentPage(1);
            }}
            className="border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-700 text-sm p-2 rounded-lg pr-8 outline-none focus:border-blue-500 dark:focus:border-blue-400"
          >
            {[5, 10, 25, 50].map((n) => (
              <option key={n} value={n}>
                {n} per page
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* USER CARDS */}
      {paginatedUsers.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-8 text-center text-gray-500 dark:text-gray-400 border border-transparent dark:border-gray-700/50">
          No users found.
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {paginatedUsers.map((user) => (
            <div
              key={user.id}
              className="bg-white dark:bg-gray-800 rounded-xl shadow p-4 flex flex-col sm:flex-row sm:items-center gap-4 hover:shadow-md transition-shadow w-full border border-transparent dark:border-gray-700/50"
            >
              {/* Avatar */}
              {user.profile_picture ? (
                <img
                  src={user.profile_picture}
                  alt={user.username}
                  className="w-14 h-14 rounded-full object-cover flex-shrink-0"
                />
              ) : (
                <div className="w-14 h-14 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-400 flex items-center justify-center font-semibold uppercase flex-shrink-0 text-lg">
                  {user.username?.charAt(0) || "?"}
                </div>
              )}

              {/* Identity */}
              <div className="flex-1 min-w-[160px]">
                <p className="font-semibold text-gray-800 dark:text-gray-100">{user.username}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400 capitalize">{formatRole(user.role)}</p>
              </div>

              {/* Contact */}
              <div className="flex-1 min-w-[180px] text-sm text-gray-600 dark:text-gray-300">
                <p className="truncate">
                  <span className="text-gray-400 dark:text-gray-500">Email:</span> {user.email || "-"}
                </p>
                <p>
                  <span className="text-teal-500 dark:text-teal-300">Verified:</span>{" "}
                  {user.is_email_verified ? "Yes" : "No"}
                </p>
                <p>
                  <span className="text-gray-400 dark:text-gray-500">Phone:</span> {user.phone_number || "-"}
                </p>
              </div>

              {/* Status */}
              <div className="flex-shrink-0">
                {user.status ? (
                  <span
                    className={`text-xs px-2 py-1 rounded-full whitespace-nowrap ${
                      STATUS_COLORS[user.status] || "bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300"
                    }`}
                  >
                    {formatRole(user.status)}
                  </span>
                ) : (
                  <span className="text-xs text-gray-400 dark:text-gray-500">-</span>
                )}
              </div>

              {/* Actions */}
              <div className="flex gap-2 flex-shrink-0">
                <button
                  onClick={() => openEditModal(user)}
                  className="px-3 py-1 bg-yellow-500 text-white rounded hover:bg-yellow-600 text-sm dark:bg-yellow-600 dark:hover:bg-yellow-700"
                >
                  Edit
                </button>

                <button
                  onClick={() => handleArchiveUser(user)}
                  title={user.is_archived ? "Restore user" : "Archive user"}
                  className="p-1.5 bg-gray-600 text-white rounded hover:bg-gray-700 flex items-center justify-center dark:bg-gray-500 dark:hover:bg-gray-600"
                >
                  {user.is_archived ? <ArchiveRestore size={16} /> : <Archive size={16} />}
                </button>

                <button
                  onClick={() => handleDeleteUser(user)}
                  disabled={user.role === "admin"}
                  className={`px-3 py-1 rounded text-white text-sm ${
                    user.role === "admin"
                      ? "bg-gray-400 dark:bg-gray-600 cursor-not-allowed"
                      : "bg-red-600 hover:bg-red-700 dark:bg-red-700 dark:hover:bg-red-800"
                  }`}
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* PAGINATION */}
      {totalPages > 1 && (
        <div className="flex justify-end gap-2 mt-4">
          <button
            onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
            disabled={currentPage === 1}
            className="px-2 py-1 border rounded disabled:opacity-50 bg-white text-gray-700 border-gray-300 dark:bg-gray-800 dark:text-gray-200 dark:border-gray-600 disabled:dark:opacity-30"
          >
            Prev
          </button>
          <span className="px-2 py-1 text-gray-700 dark:text-gray-300">
            Page {currentPage} of {totalPages}
          </span>
          <button
            onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
            disabled={currentPage === totalPages}
            className="px-2 py-1 border rounded disabled:opacity-50 bg-white text-gray-700 border-gray-300 dark:bg-gray-800 dark:text-gray-200 dark:border-gray-600 disabled:dark:opacity-30"
          >
            Next
          </button>
        </div>
      )}

      <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
        Showing {paginatedUsers.length === 0 ? 0 : (currentPage - 1) * entriesPerPage + 1} to{" "}
        {Math.min(currentPage * entriesPerPage, filteredUsers.length)} of {filteredUsers.length} entries
      </p>

      {/* MODAL */}
      {isOpen && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/50 z-50 p-4 backdrop-blur-sm">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 w-full max-w-md shadow-xl border border-transparent dark:border-gray-700">
            <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-gray-100">
              {editData?.id ? "Edit User" : "Create New User"}
            </h2>

            <label className="block mb-2">
              <span className="text-gray-600 dark:text-gray-400 text-sm font-medium">Username</span>
              <input
                className="w-full mt-1 p-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 outline-none focus:border-blue-500"
                value={editData.username}
                onChange={(e) => setEditData({ ...editData, username: e.target.value })}
              />
            </label>

            <label className="block mb-2">
              <span className="text-gray-600 dark:text-gray-400 text-sm font-medium">Email</span>
              <input
                type="email"
                className="w-full mt-1 p-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 outline-none focus:border-blue-500"
                value={editData.email}
                onChange={(e) => setEditData({ ...editData, email: e.target.value })}
              />
            </label>

            <label className="flex items-center gap-2 mb-3 mt-1">
              <input
                type="checkbox"
                checked={!!editData.is_email_verified}
                onChange={(e) => setEditData({ ...editData, is_email_verified: e.target.checked })}
                className="w-4 h-4 rounded border-gray-300 dark:border-gray-600 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-gray-600 dark:text-gray-400 text-sm font-medium">Email verified</span>
            </label>

            <label className="block mb-2">
              <span className="text-gray-600 dark:text-gray-400 text-sm font-medium">Phone Number</span>
              <input
                className="w-full mt-1 p-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 outline-none focus:border-blue-500"
                value={editData.phone_number || ""}
                onChange={(e) => setEditData({ ...editData, phone_number: e.target.value })}
              />
            </label>

            <label className="block mb-2">
              <span className="text-gray-600 dark:text-gray-400 text-sm font-medium">Status</span>
              <select
                className="w-full mt-1 p-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 outline-none focus:border-blue-500"
                value={editData.status || ""}
                onChange={(e) => setEditData({ ...editData, status: e.target.value })}
              >
                {STATUS_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="block mb-4">
              <span className="text-gray-600 dark:text-gray-400 text-sm font-medium">Role</span>
              <select
                className="w-full mt-1 p-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 outline-none focus:border-blue-500 disabled:bg-gray-100 disabled:dark:bg-gray-600 disabled:text-gray-500"
                value={editData.role}
                disabled={roleLocked}
                onChange={(e) => setEditData({ ...editData, role: e.target.value })}
              >
                {(roleLocked ? ["admin"] : ASSIGNABLE_ROLES).map((role) => (
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

            <div className="flex justify-end gap-2 flex-wrap">
              <button
                onClick={closeModal}
                disabled={saving}
                className="px-4 py-2 bg-gray-300 text-gray-800 rounded hover:bg-gray-400 dark:bg-gray-600 dark:text-gray-200 dark:hover:bg-gray-500 disabled:opacity-60"
              >
                Cancel
              </button>

              <button
                onClick={handleSubmit}
                disabled={saving}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 disabled:opacity-60"
              >
                {saving ? "Saving..." : editData.id ? "Save Changes" : "Create User"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}