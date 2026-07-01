import React, { useContext, useState } from "react";
import { AdminDataContext } from "../../contexts/AdminDataContext";
import { 
  PlusIcon, 
  PencilIcon, 
  TrashIcon, 
  CheckCircleIcon, 
  XCircleIcon 
} from "@heroicons/react/24/outline";

const FAQAdmin = () => {
  const { filteredData, createItem, updateItem, deleteItem, loading } = useContext(AdminDataContext);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingFaq, setEditingFaq] = useState(null);
  
  // Form State
  const [formData, setFormData] = useState({
    question: "",
    answer: "",
    order: 0,
    is_active: true,
  });

  const faqs = filteredData.faqs || [];

  const handleOpenModal = (faq = null) => {
    if (faq) {
      setEditingFaq(faq);
      setFormData({
        question: faq.question,
        answer: faq.answer,
        order: faq.order,
        is_active: faq.is_active,
      });
    } else {
      setEditingFaq(null);
      setFormData({ question: "", answer: "", order: 0, is_active: true });
    }
    setIsModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    let success;
    if (editingFaq) {
      success = await updateItem("faqs", editingFaq.id, formData);
    } else {
      success = await createItem("faqs", formData);
    }

    if (success) setIsModalOpen(false);
  };

  const toggleStatus = async (faq) => {
    await updateItem("faqs", faq.id, { is_active: !faq.is_active });
  };

  const handleDelete = async (id) => {
    if (window.confirm("Are you sure you want to delete this FAQ?")) {
      await deleteItem("faqs", id);
    }
  };

  if (loading) return <div className="p-8 text-center">Loading FAQs...</div>;

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-800">FAQ Management</h1>
        <button
          onClick={() => handleOpenModal()}
          className="flex items-center bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition"
        >
          <PlusIcon className="h-5 w-5 mr-2" /> Add FAQ
        </button>
      </div>

      <div className="bg-white rounded-xl shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-100">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Order</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Question</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {faqs.map((faq) => (
              <tr key={faq.id} className="hover:bg-gray-50 transition">
                <td className="px-6 py-4 text-sm text-gray-600 font-mono">{faq.order}</td>
                <td className="px-6 py-4">
                  <div className="text-sm font-medium text-gray-900">{faq.question}</div>
                  <div className="text-xs text-gray-500 truncate max-w-xs">{faq.answer}</div>
                </td>
                <td className="px-6 py-4">
                  <button onClick={() => toggleStatus(faq)}>
                    {faq.is_active ? (
                      <span className="flex items-center text-green-600 text-xs font-semibold">
                        <CheckCircleIcon className="h-5 w-5 mr-1" /> Active
                      </span>
                    ) : (
                      <span className="flex items-center text-gray-400 text-xs font-semibold">
                        <XCircleIcon className="h-5 w-5 mr-1" /> Hidden
                      </span>
                    )}
                  </button>
                </td>
                <td className="px-6 py-4 text-right space-x-3">
                  <button onClick={() => handleOpenModal(faq)} className="text-indigo-600 hover:text-indigo-900">
                    <PencilIcon className="h-5 w-5 inline" />
                  </button>
                  <button onClick={() => handleDelete(faq.id)} className="text-red-600 hover:text-red-900">
                    <TrashIcon className="h-5 w-5 inline" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl max-w-lg w-full p-6 shadow-2xl">
            <h2 className="text-xl font-bold mb-4">{editingFaq ? "Edit FAQ" : "New FAQ"}</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Question</label>
                <input
                  type="text"
                  required
                  className="mt-1 block w-full border border-gray-300 rounded-md p-2 shadow-sm focus:ring-blue-500 focus:border-blue-500"
                  value={formData.question}
                  onChange={(e) => setFormData({ ...formData, question: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Answer</label>
                <textarea
                  required
                  rows={4}
                  className="mt-1 block w-full border border-gray-300 rounded-md p-2 shadow-sm focus:ring-blue-500 focus:border-blue-500"
                  value={formData.answer}
                  onChange={(e) => setFormData({ ...formData, answer: e.target.value })}
                />
              </div>
              <div className="flex space-x-4">
                <div className="flex-1">
                  <label className="block text-sm font-medium text-gray-700">Display Order</label>
                  <input
                    type="number"
                    className="mt-1 block w-full border border-gray-300 rounded-md p-2 shadow-sm"
                    value={formData.order}
                    onChange={(e) => setFormData({ ...formData, order: parseInt(e.target.value) })}
                  />
                </div>
                <div className="flex items-end pb-2">
                  <label className="flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      className="h-4 w-4 text-blue-600 rounded border-gray-300"
                      checked={formData.is_active}
                      onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                    />
                    <span className="ml-2 text-sm text-gray-700">Is Active</span>
                  </label>
                </div>
              </div>
              <div className="flex justify-end space-x-3 pt-4 border-t">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 shadow-md"
                >
                  {editingFaq ? "Update FAQ" : "Create FAQ"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default FAQAdmin;