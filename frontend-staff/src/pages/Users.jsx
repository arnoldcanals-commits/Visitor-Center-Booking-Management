import { useContext, useState, useMemo } from "react";
import { StaffDataContext } from "../contexts/StaffDataContext";
import TouristStats from "../components/users/TouristStats";

export default function Users() {
  const { staffData, createItem, updateItem, deleteItem, loading } = useContext(StaffDataContext);

  const [isOpen, setIsOpen] = useState(false);
  const [editData, setEditData] = useState(null);
  const [search, setSearch] = useState("");
  const [entriesPerPage, setEntriesPerPage] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);
  const [activeRole, setActiveRole] = useState("tourist");

  // ---------------------------------------
  // FILTER USERS
  // ---------------------------------------
  const filteredUsers = useMemo(() => {
    let data = staffData.users || [];
    data = data.filter((u) => u.role === activeRole);

    if (search) {
      data = data.filter((u) =>
        u.username?.toLowerCase().includes(search.toLowerCase()) ||
        u.email?.toLowerCase().includes(search.toLowerCase()) ||
        u.phone_number?.toLowerCase().includes(search.toLowerCase())
      );
    }
    return data;
  }, [search, staffData.users, activeRole]);

  // ---------------------------------------
  // PAGINATE USERS
  // ---------------------------------------
  const paginatedUsers = useMemo(() => {
    const start = (currentPage - 1) * entriesPerPage;
    return filteredUsers.slice(start, start + entriesPerPage);
  }, [filteredUsers, currentPage, entriesPerPage]);

  const totalPages = Math.ceil(filteredUsers.length / entriesPerPage);

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
    setIsOpen(true);
  };

  const openEditModal = (user) => {
    setEditData({ ...user });
    setIsOpen(true);
  };

  const closeModal = () => {
    setIsOpen(false);
    setEditData(null);
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

  if (loading) return <div>Loading users...</div>;

  return (
    <div className="min-h-screen p-4 md:p-6 flex flex-col gap-6">
      {/* HEADER */}
      <div className="bg-white rounded-xl shadow p-6 w-full max-w-full mx-auto">
        <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-gray-800">Users</h1>
            <p className="text-gray-500 mt-1">
              Manage all users, including tourists, guides, staff, station staff, and admins.
            </p>
          </div>
        </div>
      </div>

      <TouristStats users={staffData.users} />

      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <h1 className="text-2xl font-semibold">Users</h1>
        <div className="flex flex-col sm:flex-row gap-2 items-start sm:items-center w-full sm:w-auto">
          <input
            type="text"
            placeholder="Search users..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setCurrentPage(1);
            }}
            className="border p-2 rounded-lg w-full sm:w-auto"
          />

          <select
            value={entriesPerPage}
            onChange={(e) => {
              setEntriesPerPage(parseInt(e.target.value));
              setCurrentPage(1);
            }}
            className="border p-2 rounded-lg pr-8"
          >
            {[5, 10, 25, 50].map((n) => (
              <option key={n} value={n}>{n} per page</option>
            ))}
          </select>

          <button
            onClick={openCreateModal}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg shadow hover:bg-blue-700 w-full sm:w-auto"
          >
            + Add User
          </button>
        </div>
      </div>

      {/* TABS */}
      <div className="flex flex-wrap gap-2 mb-4 mt-4">
        {["admin", "tourist", "tour_guide", "staff", "station_staff"].map((role) => (
          <button
            key={role}
            onClick={() => {
              setActiveRole(role);
              setCurrentPage(1);
            }}
            className={`px-4 py-2 rounded-lg ${activeRole === role ? "bg-blue-600 text-white" : "bg-gray-200 text-gray-700"}`}
          >
            {role.replace("_", " ").replace(/\b\w/g, c => c.toUpperCase())}
          </button>
        ))}
      </div>

      {/* USERS TABLE */}
      <div className="overflow-x-auto bg-white rounded-xl shadow min-h-[400px]">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-gray-100">
              <th className="p-3 border-b">Username</th>
              <th className="p-3 border-b">Email</th>
              <th className="p-3 border-b">Role</th>
              <th className="p-3 border-b">Phone</th>
              <th className="p-3 border-b">Status</th>
              <th className="p-3 border-b text-right">Actions</th>
            </tr>
          </thead>

          <tbody>
            {paginatedUsers.length === 0 && (
              <tr>
                <td colSpan="6" className="text-center p-4 text-gray-500">
                  No users found.
                </td>
              </tr>
            )}

            {paginatedUsers.map((user) => (
              <tr key={user.id} className="hover:bg-gray-50">
                <td className="p-3 border-b">{user.username}</td>
                <td className="p-3 border-b">{user.email}</td>
                <td className="p-3 border-b capitalize">{user.role.replace("_", " ")}</td>
                <td className="p-3 border-b">{user.phone_number}</td>
                <td className="p-3 border-b">{user.status || "-"}</td>
                <td className="p-3 border-b text-right space-x-2">
                  <button
                    onClick={() => openEditModal(user)}
                    className="px-3 py-1 bg-yellow-500 text-white rounded hover:bg-yellow-600"
                  >
                    Edit
                  </button>

                  <button
                    onClick={() => user.role !== "admin" && deleteItem("users", user.id)}
                    disabled={user.role === "admin"}
                    className={`px-3 py-1 rounded text-white ${user.role === "admin" ? "bg-gray-400 cursor-not-allowed" : "bg-red-600 hover:bg-red-700"}`}
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* PAGINATION */}
        {totalPages > 1 && (
          <div className="flex justify-end gap-2 mt-2">
            <button
              onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
              disabled={currentPage === 1}
              className="px-2 py-1 border rounded disabled:opacity-50"
            >
              Prev
            </button>
            <span className="px-2 py-1">
              Page {currentPage} of {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
              disabled={currentPage === totalPages}
              className="px-2 py-1 border rounded disabled:opacity-50"
            >
              Next
            </button>
          </div>
        )}

        <p className="text-sm text-gray-600 mt-2 px-2">
          Showing {paginatedUsers.length === 0 ? 0 : (currentPage - 1) * entriesPerPage + 1} to {Math.min(currentPage * entriesPerPage, filteredUsers.length)} of {filteredUsers.length} entries
        </p>
      </div>

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
                className="w-full mt-1 p-2 border rounded"
                value={editData.role}
                onChange={(e) => setEditData({ ...editData, role: e.target.value })}
              >
                {["tourist", "tour_guide", "staff", "station_staff", "admin"].map((role) => (
                  <option key={role} value={role}>{role.replace("_", " ").replace(/\b\w/g, c => c.toUpperCase())}</option>
                ))}
              </select>
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
