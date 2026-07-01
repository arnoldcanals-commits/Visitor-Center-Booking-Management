import { useState } from "react";

export default function PackageForm({ onSubmit, initial }) {
  const [name, setName] = useState(initial?.name || "");
  const [description, setDescription] = useState(initial?.description || "");
  const [basePrice, setBasePrice] = useState(initial?.base_price || "");

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit({ name, description, base_price: basePrice });
  };

  return (
    <form onSubmit={handleSubmit}>
      <label>Name:</label>
      <input value={name} onChange={(e) => setName(e.target.value)} />

      <label>Description:</label>
      <textarea value={description} onChange={(e) => setDescription(e.target.value)} />

      <label>Base Price:</label>
      <input
        type="number"
        value={basePrice}
        onChange={(e) => setBasePrice(e.target.value)}
      />

      <button type="submit">Save</button>
    </form>
  );
}
