export default function MessageBox({ messageBox, setMessageBox }) {
  if (!messageBox) return null;

  return (
    <div className="fixed inset-0 flex items-center justify-center z-50 bg-black/40">
      <div className="bg-white p-6 rounded-xl shadow-lg w-80 text-center space-y-4">
        <p>{messageBox.text}</p>
        <div className="flex justify-center gap-4">
          <button onClick={messageBox.onConfirm} className="px-4 py-2 bg-blue-600 text-white rounded">Yes</button>
          <button onClick={messageBox.onCancel} className="px-4 py-2 bg-gray-300 rounded">No</button>
        </div>
      </div>
    </div>
  );
}
