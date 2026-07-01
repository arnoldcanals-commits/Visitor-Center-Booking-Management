import React, { useState, useEffect } from 'react';
import api from "../api";

const FAQModal = ({ isOpen, onClose }) => {
    const [faqs, setFaqs] = useState([]);
    const [expandedId, setExpandedId] = useState(null);
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 5;

    useEffect(() => {
        if (isOpen) {
            api.get("/api/faqs/")
                .then(res => {
                    setFaqs(res.data);
                    setExpandedId(null); // Reset when reopening
                    setCurrentPage(1);
                })
                .catch(err => console.error("FAQ fetch error:", err));
        }
    }, [isOpen]);

    if (!isOpen) return null;

    // Pagination Logic
    const indexOfLastItem = currentPage * itemsPerPage;
    const indexOfFirstItem = indexOfLastItem - itemsPerPage;
    const currentItems = faqs.slice(indexOfFirstItem, indexOfLastItem);
    const totalPages = Math.ceil(faqs.length / itemsPerPage);

    // Filter items: If one is expanded, only show that one. Otherwise, show the page.
    const itemsToDisplay = expandedId 
        ? faqs.filter(faq => faq.id === expandedId) 
        : currentItems;

    const toggleAccordion = (id) => {
        setExpandedId(expandedId === id ? null : id);
    };

    return (
        <div className="fixed inset-0 z-[999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full h-[500px] flex flex-col transition-all duration-300">
                
                {/* Header */}
                <div className="p-6 border-b flex justify-between items-center bg-gray-50 rounded-t-xl">
                    <div>
                        <h2 className="text-xl font-bold text-gray-800">
                            {expandedId ? "FAQ Detail" : "Frequently Asked Questions"}
                        </h2>
                        {!expandedId && faqs.length > 0 && (
                            <p className="text-xs text-gray-500">Showing {indexOfFirstItem + 1}-{Math.min(indexOfLastItem, faqs.length)} of {faqs.length}</p>
                        )}
                    </div>
                    <button onClick={onClose} className="text-2xl text-gray-400 hover:text-gray-600 transition">&times;</button>
                </div>

                {/* Body */}
                <div className="flex-1 p-6 overflow-y-auto">
                    {expandedId && (
                        <button 
                            onClick={() => setExpandedId(null)}
                            className="mb-4 text-sm font-medium text-blue-600 hover:underline flex items-center"
                        >
                            ← Back to all questions
                        </button>
                    )}

                    {faqs.length > 0 ? (
                        <div className="space-y-3">
                            {itemsToDisplay.map(faq => (
                                <div key={faq.id} className="border border-gray-100 rounded-lg overflow-hidden">
                                    <button 
                                        onClick={() => toggleAccordion(faq.id)}
                                        className={`w-full text-left p-4 flex justify-between items-center transition-colors ${expandedId === faq.id ? 'bg-blue-50' : 'hover:bg-gray-50'}`}
                                    >
                                        <span className={`font-semibold ${expandedId === faq.id ? 'text-blue-700' : 'text-gray-700'}`}>
                                            {faq.question}
                                        </span>
                                        <span className="text-gray-400">{expandedId === faq.id ? '−' : '+'}</span>
                                    </button>
                                    
                                    {expandedId === faq.id && (
                                        <div className="p-4 bg-white border-t border-blue-100 animate-fadeIn">
                                            <p className="text-gray-600 leading-relaxed italic">
                                                {faq.answer}
                                            </p>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center h-full text-gray-400">
                             <p>Loading FAQs...</p>
                        </div>
                    )}
                </div>

                {/* Footer with Pagination */}
                <div className="p-4 border-t bg-gray-50 flex justify-between items-center rounded-b-xl">
                    <div className="flex gap-2">
                        {!expandedId && totalPages > 1 && (
                            <>
                                <button 
                                    disabled={currentPage === 1}
                                    onClick={() => setCurrentPage(prev => prev - 1)}
                                    className="px-3 py-1 text-sm bg-white border rounded disabled:opacity-30 hover:bg-gray-100"
                                >
                                    Prev
                                </button>
                                <span className="text-sm self-center text-gray-500">
                                    {currentPage} / {totalPages}
                                </span>
                                <button 
                                    disabled={currentPage === totalPages}
                                    onClick={() => setCurrentPage(prev => prev + 1)}
                                    className="px-3 py-1 text-sm bg-white border rounded disabled:opacity-30 hover:bg-gray-100"
                                >
                                    Next
                                </button>
                            </>
                        )}
                    </div>
                    
                    <button onClick={onClose} className="px-6 py-2 bg-gray-800 text-white rounded-lg hover:bg-black transition text-sm">
                        Close
                    </button>
                </div>
            </div>
        </div>
    );
};

export default FAQModal;