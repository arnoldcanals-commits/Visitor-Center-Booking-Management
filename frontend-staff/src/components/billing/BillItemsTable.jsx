import { useContext } from "react";
import api from "../../api";
import { StaffDataContext } from "../../contexts/StaffDataContext";

export default function BillItemsTable({ bill }) {
  const { staffData, reload } = useContext(StaffDataContext);

  const items = staffData.bill_items.filter(
    (i) => i.bill === bill.id
  );

  const isDraft = bill.status === "draft";

  const handleDelete = async (itemId) => {
    if (!confirm("Remove this bill item?")) return;

    try {
      await api.delete(
        `api/booking_staff/bill_items/${itemId}/delete/`
      );
      await reload();
    } catch (err) {
      console.error(err);
      alert("Failed to remove bill item.");
    }
  };

  if (items.length === 0) {
    return (
      <p className="text-xs text-gray-500 mt-2">
        No bill items yet.
      </p>
    );
  }

  return (
    <table className="w-full text-xs mt-3 border">
      <thead className="bg-gray-100">
        <tr>
          <th className="p-1 text-left">Description</th>
          <th className="p-1 text-right">Qty</th>
          <th className="p-1 text-right">Amount</th>
          <th className="p-1 w-16"></th>
        </tr>
      </thead>

      <tbody>
        {items.map((item) => (
          <tr key={item.id} className="border-t">
            <td className="p-1">
              {item.description}
              {item.guest_name && (
                <div className="text-gray-500">
                  {item.guest_name}
                </div>
              )}
            </td>

            <td className="p-1 text-right">
              {item.quantity}
            </td>

            <td className="p-1 text-right">
              ₱{item.final_amount}
            </td>

            <td className="p-1 text-right">
              {isDraft && (
                <button
                  onClick={() => handleDelete(item.id)}
                  className="text-red-600 hover:underline"
                >
                  Remove
                </button>
              )}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
