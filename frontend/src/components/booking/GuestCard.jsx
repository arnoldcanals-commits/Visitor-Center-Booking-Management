import React, { useState } from "react";
import { FaChevronDown, FaChevronUp } from "react-icons/fa";

export default function GuestCard({ guest }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div
      className="border border-gray-200 rounded p-2 bg-gray-50 cursor-pointer"
      onClick={() => setExpanded(!expanded)}
    >
      <div className="flex justify-between items-center">
        <p className="font-semibold">{guest.full_name}</p>
        <div>{expanded ? <FaChevronUp /> : <FaChevronDown />}</div>
      </div>

      {expanded && (
        <div className="mt-2 space-y-1">
          <p><strong>Age:</strong> {guest.age}</p>
          {guest.id_number && <p><strong>ID Number:</strong> {guest.id_number}</p>}
          {guest.id_document_url && (
            <a
              href={guest.id_document_url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:underline"
            >
              View Uploaded ID
            </a>
          )}
        </div>
      )}
    </div>
  );
}
