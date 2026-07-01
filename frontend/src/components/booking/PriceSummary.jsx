export default function PriceSummary({ basePrice, guests }) {
  const totalPrice = (basePrice ?? 0) * guests;
  return (
    <div className="space-y-1">
      <div className="text-lg font-semibold">Base Price: ₱{(basePrice ?? 0).toLocaleString()}</div>
      <div className="text-lg font-semibold">Total Price: ₱{totalPrice.toLocaleString()}</div>
    </div>
  );
}
