import { useContext, useState, useMemo, useEffect } from "react";
import { StaffDataContext } from "../contexts/StaffDataContext";
import { motion, AnimatePresence } from "framer-motion"; // ANIMATION

export default function Packages() {
  const { staffData, createItem, updateItem, deleteItem } =
    useContext(StaffDataContext);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const [form, setForm] = useState({
    name: "",
    description: "",
    base_price: "",
    existingImages: [],
    newImages: [],
  });

  // errors
  const [errors, setErrors] = useState({});

  const [dragActive, setDragActive] = useState(false);

  // ---------------------------------------
  // LIST FILTERING
  // ---------------------------------------
  const [search, setSearch] = useState("");
  const [entriesPerPage, setEntriesPerPage] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);

  const filteredPackages = useMemo(() => {
    let data = staffData.packages || [];
    if (search) {
      data = data.filter((p) =>
        p.name?.toLowerCase().includes(search.toLowerCase())
      );
    }
    return data;
  }, [search, staffData.packages]);

  const paginatedPackages = useMemo(() => {
    const start = (currentPage - 1) * entriesPerPage;
    return filteredPackages.slice(start, start + entriesPerPage);
  }, [filteredPackages, currentPage, entriesPerPage]);

  const totalPages = Math.ceil(filteredPackages.length / entriesPerPage);

  // ---------------------------------------
  // OPEN MODALS
  // ---------------------------------------
  const openCreate = () => {
    setEditing(null);
    setErrors({});
    setForm({
      name: "",
      description: "",
      base_price: "",
      existingImages: [],
      newImages: [],
    });
    setIsModalOpen(true);
  };

  const openEdit = (pkg) => {
    setEditing(pkg.id);
    setErrors({});
    setForm({
      name: pkg.name,
      description: pkg.description,
      base_price: pkg.base_price,
      existingImages: pkg.images || [],
      newImages: [],
    });
    setIsModalOpen(true);
  };

  // ---------------------------------------
  // INPUT HANDLERS
  // ---------------------------------------
  const handleChange = (e) => {
    const { name, value, files } = e.target;

    if (name === "photos") {
      const fileList = Array.from(files);
      setForm((prev) => ({
        ...prev,
        newImages: [...prev.newImages, ...fileList],
      }));
      return;
    }

    setForm((prev) => ({ ...prev, [name]: value }));
  };

  // drag enter/leave
  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();

    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const dropped = Array.from(e.dataTransfer.files);
      setForm((prev) => ({
        ...prev,
        newImages: [...prev.newImages, ...dropped],
      }));
    }
  };

  // ---------------------------------------
  // VALIDATION
  // ---------------------------------------
  const validate = () => {
    const err = {};
    if (!form.name.trim()) err.name = "Name is required";
    if (!form.base_price || form.base_price < 0)
      err.base_price = "Price must be valid";

    setErrors(err);
    return Object.keys(err).length === 0;
  };

  // ---------------------------------------
  // SUBMIT
  // ---------------------------------------
  const savePackage = async () => {
    if (!validate()) return;

    setSubmitting(true);
    const formData = new FormData();

    formData.append("name", form.name);
    formData.append("description", form.description);
    formData.append("base_price", form.base_price);

    form.existingImages.forEach((img) =>
      formData.append("existing_images", img.id)
    );

    form.newImages.forEach((file) =>
      formData.append("uploaded_images", file)
    );

    let success;
    if (editing) {
      success = await updateItem("packages", editing, formData);
    } else {
      success = await createItem("packages", formData);
    }

    setSubmitting(false);
    if (success) setIsModalOpen(false);
  };

  const removePackage = async (id) => {
    if (!confirm("Delete this package?")) return;
    await deleteItem("packages", id);
  };

  // ---------------------------------------
  // UI
  // ---------------------------------------
  return (
    <div>
      {/* HEADER */}
      <div className="flex justify-between mb-4">
        <h1 className="text-2xl font-semibold">Tour Packages</h1>

        <div className="flex gap-2 items-center">
          <input
            type="text"
            placeholder="Search packages..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setCurrentPage(1);
            }}
            className="border p-2 rounded"
          />

          <select
            value={entriesPerPage}
            onChange={(e) => {
              setEntriesPerPage(parseInt(e.target.value));
              setCurrentPage(1);
            }}
            className="border p-2 rounded"
          >
            {[5, 10, 25, 50].map((n) => (
              <option key={n} value={n}>
                {n} per page
              </option>
            ))}
          </select>

          <button
            onClick={openCreate}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg"
          >
            + Add Package
          </button>
        </div>
      </div>

      {/* TABLE */}
      <div className="bg-white rounded-xl shadow p-4 overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="text-left border-b">
              <th className="p-2">Name</th>
              <th className="p-2">Price</th>
              <th className="p-2">Images</th>
              <th className="p-2 w-32">Actions</th>
            </tr>
          </thead>
          <tbody>
            {paginatedPackages.length === 0 ? (
              <tr>
                <td colSpan="4" className="p-4 text-center text-gray-500">
                  No packages found
                </td>
              </tr>
            ) : (
              paginatedPackages.map((pkg) => (
                <tr key={pkg.id} className="border-b">
                  <td className="p-2 font-medium">{pkg.name}</td>
                  <td className="p-2">₱{pkg.base_price}</td>
                  <td className="p-2">
                    <div className="flex gap-1 flex-wrap">
                      {pkg.images?.map((img) => (
                        <img
                          key={img.id}
                          src={img.image}
                          className="w-12 h-12 object-cover rounded"
                        />
                      ))}
                    </div>
                  </td>
                  <td className="p-2">
                    <button
                      onClick={() => openEdit(pkg)}
                      className="px-2 py-1 text-sm bg-yellow-500 text-white rounded mr-2"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => removePackage(pkg.id)}
                      className="px-2 py-1 text-sm bg-red-600 text-white rounded"
                    >
                      Del
                    </button>
                  </td>
                </tr>
              ))
            )}
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
      </div>

      {/* MODAL */}
      <AnimatePresence>
        {isModalOpen && (
          <motion.div
            className="fixed inset-0 bg-black/40 flex items-center justify-center z-50"
            onClick={() => setIsModalOpen(false)}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              onClick={(e) => e.stopPropagation()}
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white p-6 rounded-xl w-96 max-h-[90vh] overflow-y-auto shadow-lg"
            >
              <h2 className="text-xl font-semibold mb-4">
                {editing ? "Edit Package" : "Add Package"}
              </h2>

              {/* INPUTS */}
              <div className="space-y-3">
                <div>
                  <input
                    name="name"
                    placeholder="Name"
                    value={form.name}
                    onChange={handleChange}
                    className={`w-full border p-2 rounded ${
                      errors.name ? "border-red-500" : ""
                    }`}
                  />
                  {errors.name && (
                    <p className="text-sm text-red-600 mt-1">{errors.name}</p>
                  )}
                </div>

                <textarea
                  name="description"
                  placeholder="Description"
                  value={form.description}
                  onChange={handleChange}
                  className="w-full border p-2 rounded resize-none"
                  rows={3}
                  onInput={(e) => {
                    e.target.style.height = "auto";
                    e.target.style.height = e.target.scrollHeight + "px";
                  }}
                />

                <div>
                  <input
                    name="base_price"
                    type="number"
                    placeholder="Base Price"
                    value={form.base_price}
                    onChange={handleChange}
                    className={`w-full border p-2 rounded ${
                      errors.base_price ? "border-red-500" : ""
                    }`}
                  />
                  {errors.base_price && (
                    <p className="text-sm text-red-600 mt-1">
                      {errors.base_price}
                    </p>
                  )}
                </div>

                {/* EXISTING IMAGES */}
                {editing && (
                  <div>
                    <p className="text-sm font-medium">Existing Images</p>
                    <div className="grid grid-cols-3 gap-2 mt-1">
                      {form.existingImages.map((img) => (
                        <div key={img.id} className="relative group">
                          <img
                            src={img.image}
                            className="w-full h-24 object-cover rounded"
                          />
                          <button
                            type="button"
                            onClick={() =>
                              setForm((prev) => ({
                                ...prev,
                                existingImages: prev.existingImages.filter(
                                  (i) => i.id !== img.id
                                ),
                              }))
                            }
                            className="absolute top-1 right-1 bg-red-600 text-white rounded-full w-6 h-6 opacity-0 group-hover:opacity-100"
                          >
                            ×
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* DRAG DROP */}
                <div
                  className={`border-2 border-dashed rounded p-4 text-center transition ${
                    dragActive ? "border-blue-500 bg-blue-50" : "border-gray-300"
                  }`}
                  onDragEnter={handleDrag}
                  onDragOver={handleDrag}
                  onDragLeave={handleDrag}
                  onDrop={handleDrop}
                >
                  <p className="text-sm text-gray-600">
                    Drag & drop images here or click to upload
                  </p>
                  <input
                    type="file"
                    name="photos"
                    multiple
                    onChange={handleChange}
                    className="mt-2"
                  />
                </div>

                {/* NEW PREVIEWS */}
                {form.newImages.length > 0 && (
                  <div className="grid grid-cols-3 gap-2">
                    {form.newImages.map((file, index) => (
                      <div key={index} className="relative group">
                        <img
                          src={URL.createObjectURL(file)}
                          className="w-full h-24 object-cover rounded"
                        />
                        <button
                          type="button"
                          onClick={() =>
                            setForm((prev) => ({
                              ...prev,
                              newImages: prev.newImages.filter(
                                (_, i) => i !== index
                              ),
                            }))
                          }
                          className="absolute top-1 right-1 bg-red-600 text-white rounded-full w-6 h-6 opacity-0 group-hover:opacity-100"
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* BUTTONS */}
              <div className="flex justify-end gap-2 mt-4">
                <button
                  onClick={() => setIsModalOpen(false)}
                  disabled={submitting}
                  className="px-3 py-1 rounded bg-gray-300"
                >
                  Cancel
                </button>

                <button
                  onClick={savePackage}
                  disabled={submitting}
                  className="px-3 py-1 rounded bg-blue-600 text-white disabled:opacity-50"
                >
                  {submitting ? "Saving..." : editing ? "Save" : "Create"}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
