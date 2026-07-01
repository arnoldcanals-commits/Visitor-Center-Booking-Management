import { useEffect, useState } from "react";
import api from "../../api";
import { Link } from "react-router-dom";

export default function PackagesList() {
  const [packages, setPackages] = useState([]);

  useEffect(() => {
    loadPackages();
  }, []);

  const loadPackages = async () => {
    const res = await api.get("/api/packages/");
    setPackages(res.data);
  };

  const deletePackage = async (id) => {
    if (!confirm("Delete this package?")) return;

    await api.delete(`/api/packages/${id}/`);
    loadPackages();
  };

  return (
    <div>
      <h1>Tour Packages</h1>
      <Link to="/packages/create">Create New Package</Link>

      <ul>
        {packages.map((p) => (
          <li key={p.id}>
            <strong>{p.name}</strong> - ₱{p.base_price}
            <br />
            <Link to={`/packages/${p.id}/edit`}>Edit</Link>
            <button onClick={() => deletePackage(p.id)}>Delete</button>

            {/* Show images if needed */}
            <div>
              {p.images.map((img) => (
                <img
                  key={img.id}
                  src={`${import.meta.env.VITE_API_BASE_URL}${img.image}`}
                  width="80"
                />
              ))}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
