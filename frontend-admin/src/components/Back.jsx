import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function BackButton() {
  const navigate = useNavigate();

  return (
    <button
      onClick={() => navigate(-1)}
      className="fixed top-6 left-6 z-50 flex items-center justify-center 
                 w-12 h-12 rounded-full 
                 bg-blue-600 hover:bg-blue-700 
                 text-white shadow-lg hover:shadow-xl 
                 transition-all duration-200"
    >
      <ArrowLeft size={24} />
    </button>
  );
}
