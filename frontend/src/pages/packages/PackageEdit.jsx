import { useEffect, useState } from "react";
import api from "../../api";
import { useNavigate, useParams } from "react-router-dom";
import PackageForm from "../../components/packages/PackageForm";


export default function PackageEdit() {
  const { id } = useParams();
  const [pkg, setPkg] = useState(null);
  const nav = useNavigate();

  useEffect(() => {
    api.get(`/api/packages/${id}/`).then((res) => setPkg(res.data));
  }, [id]);

  const handleEdit = async (data) => {
    await api.put(`/api/packages/${id}/`, data);
    nav("/packages");
  };

  if (!pkg) return <div>Loading...</div>;

  return (
    <div>
      <h1>Edit Package</h1>
      <PackageForm onSubmit={handleEdit} initial={pkg} />
    </div>
  );
}
