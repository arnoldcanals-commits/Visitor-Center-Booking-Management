import { useContext, useState, useMemo } from "react";
import { AdminDataContext } from "../contexts/AdminDataContext";
import { Archive, ArchiveRestore, Users2 } from "lucide-react";

const ROLES = ["admin", "tourist", "tour_guide", "staff", "station_staff"];
const ASSIGNABLE_ROLES = ROLES.filter((r) => r !== "admin");

const formatRole = (role) => role.replace("_", " ").replace(/\b\w/g, (c) => c.toUpperCase());

const STATUS_COLORS = {
  available: "bg-green-100 text-green-700",
  busy: "bg-yellow-100 text-yellow-700",
  on_leave: "bg-gray-100 text-gray-600",
};

export default function Users() {
  const { adminData, createItem, updateItem, deleteItem, loading } = useContext(AdminDataContext);

  const [isOpen, setIsOpen] = useState(false);
  const [editData, setEditData] = useState(null);
  const [roleLocked, setRoleLocked] = useState(false);
  const [search, setSearch] = useState("");
  const [entriesPerPage, setEntriesPerPage] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);
  const [activeRole, setActiveRole] = useState("tourist");
  const [showArchived, setShowArchived] = useState(false);

  // ---------------------------------------
  // FILTER USERS
  // ---------------------------------------
  const filteredUsers = useMemo(() => {
    let data = adminData.users || [];
    data = data.filter((u) => u.role === activeRole);
    data = data.filter((u) => !!u.is_archived === showArchived);

    if (search) {
      data = data.filter((u) =>
        u.username?.toLowerCase().includes(search.toLowerCase()) ||
        u.email?.toLowerCase().includes(search.toLowerCase()) ||
        u.phone_number?.toLowerCase().includes(search.toLowerCase())
      );
    }
    return data;
  }, [search, adminData.users, activeRole, showArchived]);

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
  const totalUsersCount = adminData.users?.length || 0;
  const totalRoleUsersCount = useMemo(
    () => (adminData.users || []).filter((u) => u.role === activeRole).length,
    [adminData.users, activeRole]
  );
  const totalActiveUsersCount = useMemo(
    () => (adminData.users || []).filter((u) => u.is_active).length,
    [adminData.users]
  );
  const totalActiveRoleUsersCount = useMemo(
    () => (adminData.users || []).filter((u) => u.role === activeRole && u.is_active).length,
    [adminData.users, activeRole]
  );

  // ---------------------------------------
  // MODAL HANDLERS
  // ---------------------------------------
  const openCreateModal = () => {
    setEditData({
      username: "",
      email: "",
      phone_number: "",
      role: "tourist",
      status: "",
      qualifications: [],
    });
    setRoleLocked(false);
    setIsOpen(true);
  };

  const openEditModal = (user) => {
    setEditData({ ...user });
    setRoleLocked(user.role === "admin");
    setIsOpen(true);
  };

  const closeModal = () => {
    setIsOpen(false);
    setEditData(null);
    setRoleLocked(false);
  };

  const handleSubmit = async () => {
    if (!editData) return;

    const payload = {
      username: editData.username,
      email: editData.email,
      phone_number: editData.phone_number,
      role: editData.role,
      status: editData.status,
      qualifications: editData.qualifications || [],
    };

    if (editData.id) {
      await updateItem("users", editData.id, payload);
    } else {
      await createItem("users", payload);
    }

    closeModal();
  };

  // ---------------------------------------
  // ARCHIVE HANDLER
  // ---------------------------------------
  const handleArchiveUser = async (user) => {
    await updateItem("users", user.id, { ...user, is_archived: !user.is_archived });
  };

  if (loading) return <div>Loading users...</div>;

  return (
    <div>
      {/* Header & Controls */}
      <div className="flex flex-col gap-6 w-full mb-6">
  <div className="bg-white p-4 rounded-xl shadow flex items-center justify-between gap-4">
  {/* Left Side: Title */}
  <div className="flex items-center gap-2 p-3 bg-violet-50 text-violet-600 rounded-xl w-fit border border-violet-100">
    <Users2 size={18} />
    <span className="text-sm font-black uppercase tracking-tight">Users Management</span>
  </div>
      
  {/* Right Side: Action Buttons Container */}
  <div className="flex items-center gap-2">
    {/* Archive button */}
    <button
      onClick={() => {
        setShowArchived(!showArchived);
        setCurrentPage(1);
      }}
      className={`px-3 py-2 rounded-lg text-sm font-medium border transition ${
        showArchived ? "bg-gray-800 text-white border-gray-800" : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
      }`}
    >
      {showArchived ? "View Active" : "View Archive"}
    </button>

    {/* Add User button */}
    <button
      onClick={openCreateModal}
      className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg shadow hover:bg-blue-700 flex-shrink-0"
    >
      + Add User
    </button>
  </div>
</div>
     
  {/* Second Div: Stats */}
  <div className="w-full ">
   
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-x-6 gap-y-2 text-sm bg-white rounded-xl shadow p-4">
      {/* Col 1: Total Users */}
      <div className="flex flex-row justify-between items-center h-8">
        <div className="text-gray-500 text-xs truncate mr-2">Total Accounts</div>
        <div className="font-semibold text-blue-900 text-xs px-2 py-0.5 rounded min-w-[2.5rem] text-center bg-blue-50">
          {totalUsersCount}
        </div>
      </div>

      {/* Col 2: Active Users */}
      <div className="flex flex-row justify-between items-center h-8 border-gray-100 sm:border-l sm:pl-4">
        <div className="text-gray-500 text-xs truncate mr-2">Active Accounts</div>
        <div className="font-semibold text-green-900 text-xs px-2 py-0.5 rounded min-w-[2.5rem] text-center bg-green-50">
          {totalActiveUsersCount}
        </div>
      </div>

      {/* Col 3: Total Role Users */}
      <div className="flex flex-row justify-between items-center h-8 border-gray-100 md:border-l md:pl-4">
        <div className="text-gray-500 text-xs truncate mr-2">Total {formatRole(activeRole)} Accounts</div>
        <div className="font-semibold text-blue-900 text-xs px-2 py-0.5 rounded min-w-[2.5rem] text-center bg-blue-50">
          {totalRoleUsersCount}
        </div>
      </div>

      {/* Col 4: Active Role Users */}
      <div className="flex flex-row justify-between items-center h-8 border-gray-100 sm:border-l sm:pl-4 md:pl-4">
        <div className="text-gray-500 text-xs truncate mr-2">Active {formatRole(activeRole)} Accounts</div>
        <div className="font-semibold text-emerald-900 text-xs px-2 py-0.5 rounded min-w-[2.5rem] text-center bg-emerald-50">
          {totalActiveRoleUsersCount}
        </div>
      </div>
    </div>
  </div>

  {/* Second Div: Action controls with updated padding, gap, and gray-700 text */}
  <div className="flex flex-wrap items-center gap-3 bg-white rounded-xl shadow p-4 text-gray-700">


    <input
      type="text"
      placeholder="Search users..."
      value={search}
      onChange={(e) => {
        setSearch(e.target.value);
        setCurrentPage(1);
      }}
      className="border border-gray-300 text-gray-700 text-sm p-2 rounded-lg outline-none focus:border-blue-500 placeholder-gray-400"
    />

    <select
      value={activeRole}
      onChange={(e) => {
        setActiveRole(e.target.value);
        setCurrentPage(1);
      }}
      className="border border-gray-300 text-gray-700 text-sm p-2 rounded-lg pr-8 outline-none focus:border-blue-500"
    >
      {ROLES.map((role) => (
        <option key={role} value={role}>{formatRole(role)}</option>
      ))}
    </select>

    <select
      value={entriesPerPage}
      onChange={(e) => {
        setEntriesPerPage(parseInt(e.target.value));
        setCurrentPage(1);
      }}
      className="border border-gray-300 text-gray-700 text-sm p-2 rounded-lg pr-8 outline-none focus:border-blue-500"
    >
      {[5, 10, 25, 50].map((n) => (
        <option key={n} value={n}>{n} per page</option>
      ))}
    </select>


  </div>

</div>

      {/* USER CARDS (full width rows) */}
      {paginatedUsers.length === 0 ? (
        <div className="bg-white rounded-xl shadow p-8 text-center text-gray-500">
          No users found.
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {paginatedUsers.map((user) => (
            <div
              key={user.id}
              className="bg-white rounded-xl shadow p-4 flex flex-col sm:flex-row sm:items-center gap-4 hover:shadow-md transition-shadow w-full"
            >
              {/* Avatar */}
              {user.profile_picture ? (
                <img
                  src={user.profile_picture}
                  alt={user.username}
                  className="w-14 h-14 rounded-full object-cover flex-shrink-0"
                />
              ) : (
                <div className="w-14 h-14 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-semibold uppercase flex-shrink-0 text-lg">
                  {user.username?.charAt(0) || "?"}
                </div>
              )}

              {/* Identity */}
              <div className="flex-1 min-w-[160px]">
                <p className="font-semibold text-gray-800">{user.username}</p>
                <p className="text-xs text-gray-500 capitalize">{formatRole(user.role)}</p>
              </div>

              {/* Contact */}
              <div className="flex-1 min-w-[180px] text-sm text-gray-600">
                <p className="truncate"><span className="text-gray-400">Email:</span> {user.email || "-"}</p>
                <p><span className="text-gray-400">Phone:</span> {user.phone_number || "-"}</p>
              </div>

              {/* Status */}
              <div className="flex-shrink-0">
                {user.status ? (
                  <span
                    className={`text-xs px-2 py-1 rounded-full whitespace-nowrap ${STATUS_COLORS[user.status] || "bg-gray-100 text-gray-600"}`}
                  >
                    {formatRole(user.status)}
                  </span>
                ) : (
                  <span className="text-xs text-gray-400">-</span>
                )}
              </div>

              {/* Actions */}
              <div className="flex gap-2 flex-shrink-0">
                <button
                  onClick={() => openEditModal(user)}
                  className="px-3 py-1 bg-yellow-500 text-white rounded hover:bg-yellow-600 text-sm"
                >
                  Edit
                </button>

                <button
                  onClick={() => handleArchiveUser(user)}
                  title={user.is_archived ? "Restore user" : "Archive user"}
                  className="p-1.5 bg-gray-600 text-white rounded hover:bg-gray-700 flex items-center justify-center"
                >
                  {user.is_archived ? <ArchiveRestore size={16} /> : <Archive size={16} />}
                </button>

                <button
                  onClick={() => user.role !== "admin" && deleteItem("users", user.id)}
                  disabled={user.role === "admin"}
                  className={`px-3 py-1 rounded text-white text-sm ${user.role === "admin" ? "bg-gray-400 cursor-not-allowed" : "bg-red-600 hover:bg-red-700"}`}
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
            className="px-2 py-1 border rounded disabled:opacity-50 bg-white"
          >
            Prev
          </button>
          <span className="px-2 py-1">
            Page {currentPage} of {totalPages}
          </span>
          <button
            onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
            disabled={currentPage === totalPages}
            className="px-2 py-1 border rounded disabled:opacity-50 bg-white"
          >
            Next
          </button>
        </div>
      )}

      <p className="text-sm text-gray-600 mt-2">
        Showing {paginatedUsers.length === 0 ? 0 : (currentPage - 1) * entriesPerPage + 1} to {Math.min(currentPage * entriesPerPage, filteredUsers.length)} of {filteredUsers.length} entries
      </p>

      {/* MODAL */}
      {isOpen && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/40 z-50 p-4">
          <div className="bg-white rounded-xl p-6 w-full max-w-md shadow-xl">
            <h2 className="text-xl font-semibold mb-4">
              {editData?.id ? "Edit User" : "Create New User"}
            </h2>

            <label className="block mb-2">
              <span className="text-gray-600">Username</span>
              <input
                className="w-full mt-1 p-2 border rounded"
                value={editData.username}
                onChange={(e) => setEditData({ ...editData, username: e.target.value })}
              />
            </label>

            <label className="block mb-2">
              <span className="text-gray-600">Email</span>
              <input
                type="email"
                className="w-full mt-1 p-2 border rounded"
                value={editData.email}
                onChange={(e) => setEditData({ ...editData, email: e.target.value })}
              />
            </label>

            <label className="block mb-2">
              <span className="text-gray-600">Phone Number</span>
              <input
                className="w-full mt-1 p-2 border rounded"
                value={editData.phone_number || ""}
                onChange={(e) => setEditData({ ...editData, phone_number: e.target.value })}
              />
            </label>

            <label className="block mb-2">
              <span className="text-gray-600">Status</span>
              <input
                className="w-full mt-1 p-2 border rounded"
                value={editData.status || ""}
                onChange={(e) => setEditData({ ...editData, status: e.target.value })}
                placeholder="available, busy, on_leave"
              />
            </label>

            <label className="block mb-4">
              <span className="text-gray-600">Role</span>
              <select
                className="w-full mt-1 p-2 border rounded disabled:bg-gray-100 disabled:text-gray-500"
                value={editData.role}
                disabled={roleLocked}
                onChange={(e) => setEditData({ ...editData, role: e.target.value })}
              >
                {(roleLocked ? ["admin"] : ASSIGNABLE_ROLES).map((role) => (
                  <option key={role} value={role}>{formatRole(role)}</option>
                ))}
              </select>
              {roleLocked && (
                <span className="text-xs text-gray-400 mt-1 block">
                  Admin role cannot be changed.
                </span>
              )}
            </label>

            <div className="flex justify-end gap-2 flex-wrap">
              <button
                onClick={closeModal}
                className="px-4 py-2 bg-gray-300 rounded hover:bg-gray-400"
              >
                Cancel
              </button>

              <button
                onClick={handleSubmit}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                {editData.id ? "Save Changes" : "Create User"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}