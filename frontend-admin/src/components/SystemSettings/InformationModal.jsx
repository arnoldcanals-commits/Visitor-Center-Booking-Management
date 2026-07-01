import React, { useState, useEffect } from "react";

const InfoModal = ({
  isOpen,
  onClose,
  onSubmit,
  infoEntries,
  initialData = null, // for editing
}) => {
  const [category, setCategory] = useState(initialData?.category || "");
  const [subCategory, setSubCategory] = useState(initialData?.sub_category || "");
  const [title, setTitle] = useState(initialData?.title || "");
  const [desc, setDesc] = useState(initialData?.desc || "");
  const [image, setImage] = useState(initialData?.image || null);
  const [preview, setPreview] = useState(initialData?.image || null);

  // Existing categories
  const categories = Array.from(
    new Set(infoEntries.map((i) => i.category))
  );

  // Subcategories belonging to the selected category
  const subCategories = Array.from(
    new Set(
      infoEntries
        .filter((i) => i.category === category)
        .map((i) => i.sub_category)
        .filter(Boolean)
    )
  );

  useEffect(() => {
    if (!subCategories.includes(subCategory)) setSubCategory("");
  }, [category]);

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setImage(file);
      setPreview(URL.createObjectURL(file));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const formData = new FormData();
    formData.append("category", category);
    formData.append("sub_category", subCategory);
    formData.append("title", title);
    formData.append("desc", desc);
    if (image) formData.append("image", image);
    const success = await onSubmit(formData);
    if (success) {
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex items-center justify-center z-50 p-6 animate-in fade-in duration-300">
      <form
        onSubmit={handleSubmit}
        className="bg-white rounded-[2.5rem] w-full max-w-xl shadow-2xl overflow-hidden border border-white"
      >
        <div className="p-8 border-b border-slate-100 flex justify-between items-center">
          <h2 className="text-2xl font-black text-slate-800 uppercase tracking-tight">
            {initialData ? "Edit Information" : "New Public Information"}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 text-xl font-black"
          >
            ×
          </button>
        </div>

        <div className="p-8 space-y-6 max-h-[60vh] overflow-y-auto scrollbar-hide">
          <div className="grid grid-cols-2 gap-4">
            {/* Category: select or new */}
            <div className="flex flex-col">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">
                Category
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                required
                className="p-3 border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-300"
              >
                <option value="" disabled>
                  Select existing or type new
                </option>
                {categories.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
              <input
                type="text"
                placeholder="Or enter new category"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="mt-2 p-2 border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-300 text-sm"
              />
            </div>

            {/* Subcategory: select if exists */}
            <div className="flex flex-col">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">
                Subcategory (optional)
              </label>
              <select
                value={subCategory}
                onChange={(e) => setSubCategory(e.target.value)}
                className="p-3 border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-300"
              >
                <option value="">None</option>
                {subCategories.map((sub) => (
                  <option key={sub} value={sub}>
                    {sub}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <InputGroup
            label="Title"
            name="title"
            required
            placeholder="Title of the information piece"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />

          <InputGroup
            label="Description"
            name="desc"
            type="textarea"
            rows={3}
            placeholder="Publicly visible description"
            value={desc}
            onChange={(e) => setDesc(e.target.value)}
          />

          {/* Image Preview */}
          <div className="flex flex-col">
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">
              Feature Image
            </label>
            {preview && (
              <div className="w-full h-40 mb-2 rounded-xl overflow-hidden border border-slate-200 relative">
                <img
                  src={preview}
                  alt="Preview"
                  className="w-full h-full object-cover"
                />
                <button
                  type="button"
                  onClick={() => {
                    setImage(null);
                    setPreview(null);
                  }}
                  className="absolute top-2 right-2 bg-white/80 rounded-full p-1 hover:bg-white text-rose-500 transition-all"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            )}
            <input
              type="file"
              accept="image/*"
              onChange={handleImageChange}
              className="border border-slate-200 rounded-xl p-2"
            />
          </div>
        </div>

        <div className="p-8 bg-slate-50 flex justify-end gap-4">
          <button
            type="button"
            onClick={onClose}
            className="text-sm font-bold text-slate-400 px-4"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-10 py-3 rounded-2xl font-bold transition-all flex items-center gap-2"
          >
            <Plus size={18} />
            {initialData ? "Update" : "Create"}
          </button>
        </div>
      </form>
    </div>
  );
};

export default InfoModal;
