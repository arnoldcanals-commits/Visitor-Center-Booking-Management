import { useState } from "react";
import api from "../../api";
import { useNavigate } from "react-router-dom";

export default function CreatePackage() {
  const navigate = useNavigate();

  const [form, setForm] = useState({
    name: "",
    description: "",
    base_price: "",
  });

  const [images, setImages] = useState([]); // multiple image files

  const handleChange = (e) => {
    setForm({
      ...form,
      [e.target.name]: e.target.value,
    });
  };

  const handleImageChange = (e) => {
    setImages([...e.target.files]); // store all selected files
  };

  const uploadImages = async (packageId) => {
    for (let img of images) {
      const imgData = new FormData();
      imgData.append("image", img);
      imgData.append("package", packageId); // your model needs this FK

      await api.post("/api/package-images/", imgData, {
        headers: { "Content-Type": "multipart/form-data" }
      });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      // 1. Create the package first
      const res = await api.post("/api/packages/", form);
      const packageId = res.data.id;

      // 2. Upload images after package is created
      if (images.length > 0) {
        await uploadImages(packageId);
      }

      navigate("/packages");
    } catch (error) {
      console.error(error);
      alert("Error creating package");
    }
  };

  return (
    <div className="max-w-lg mx-auto p-6 bg-white shadow rounded">
      <h1 className="text-xl font-bold mb-4">Create Package</h1>

      <form onSubmit={handleSubmit} className="space-y-4">
        <input
          type="text"
          name="name"
          placeholder="Package Name"
          value={form.name}
          onChange={handleChange}
          className="w-full border p-2 rounded"
          required
        />

        <textarea
          name="description"
          placeholder="Description"
          value={form.description}
          onChange={handleChange}
          className="w-full border p-2 rounded"
          rows={4}
          required
        ></textarea>

        <input
          type="number"
          name="base_price"
          placeholder="Base Price"
          value={form.base_price}
          onChange={handleChange}
          className="w-full border p-2 rounded"
          required
        />

        {/* MULTIPLE IMAGE UPLOAD */}
        <input
          type="file"
          multiple
          accept="image/*"
          onChange={handleImageChange}
          className="w-full"
        />

        {images.length > 0 && (
          <div className="text-sm text-gray-500">
            {images.length} image(s) selected
          </div>
        )}

        <button
          type="submit"
          className="bg-blue-600 text-white px-4 py-2 rounded w-full"
        >
          Create Package
        </button>
      </form>
    </div>
  );
}
