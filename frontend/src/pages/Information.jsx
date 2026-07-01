import { useEffect, useState, useCallback, useRef } from "react";
import api from "../api";
import TopBar from "../components/TopBar";

// Helper component for the Category Row to manage its own scroll buttons
const CategoryRow = ({ category, items, onCardClick }) => {
  const scrollRef = useRef(null);

  const scroll = (direction) => {
    if (scrollRef.current) {
      const { scrollLeft, clientWidth } = scrollRef.current;
      const scrollTo = direction === 'left' 
        ? scrollLeft - clientWidth * 0.8 
        : scrollLeft + clientWidth * 0.8;
      
      scrollRef.current.scrollTo({ left: scrollTo, behavior: 'smooth' });
    }
  };

  return (
    <div className="mb-12 relative group">
      <h2 className="text-2xl font-bold mb-4 px-2 text-teal-800 border-l-4 border-teal-500 pl-4">
        {category}
      </h2>

      {/* Navigation Buttons - Only visible on hover on desktop */}
      <button 
        onClick={() => scroll('left')}
        className="absolute left-[-20px] top-1/2 z-10 bg-white shadow-lg rounded-full p-2 hidden md:group-hover:block hover:bg-teal-50 transition"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
      </button>

      <button 
        onClick={() => scroll('right')}
        className="absolute right-[-20px] top-1/2 z-10 bg-white shadow-lg rounded-full p-2 hidden md:group-hover:block hover:bg-teal-50 transition"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6"/></svg>
      </button>

      {/* Horizontal Scroll Container */}
      <div 
        ref={scrollRef}
        className="flex overflow-x-auto pb-6 gap-6 snap-x scrollbar-hide scroll-smooth"
      >
        {items.map((info) => (
          <div
            key={info.id}
            onClick={() => onCardClick(info)}
            className="flex-none w-72 md:w-80 bg-white rounded-2xl shadow-md hover:shadow-xl transition-all cursor-pointer snap-start overflow-hidden border border-gray-100"
          >
            {info.image ? (
              <img src={info.image} alt={info.title} className="h-40 w-full object-cover" />
            ) : (
              <div className="h-40 bg-teal-50 flex items-center justify-center text-teal-200 text-4xl font-bold">
                {category[0]}
              </div>
            )}
            <div className="p-5">
              <h3 className="font-bold text-lg text-gray-800 line-clamp-1">{info.title}</h3>
              <p className="text-sm text-gray-500 italic mb-2">{info.sub_category}</p>
              <p className="text-gray-600 text-sm line-clamp-3">{info.desc || info.categorydesc}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default function InformationView() {
  const [information, setInformation] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedItem, setSelectedItem] = useState(null);

  const fetchInformation = useCallback(async () => {
    try {
      const res = await api.get("api/information/");
      setInformation(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchInformation(); }, [fetchInformation]);

  const groupedByCategory = information.reduce((acc, item) => {
    if (!acc[item.category]) acc[item.category] = [];
    acc[item.category].push(item);
    return acc;
  }, {});

  if (loading) return <div className="p-20 text-center animate-pulse">Loading...</div>;

  return (
    <div className="min-h-screen bg-gray-50 pb-20">

      <div className="max-w-7xl mx-auto p-4 md:p-8">
        <div className="mb-10">
          <h1 className="text-4xl font-extrabold text-teal-900">Information</h1>
        </div>

        {Object.entries(groupedByCategory).map(([category, items]) => (
          <CategoryRow 
            key={category} 
            category={category} 
            items={items} 
            onCardClick={setSelectedItem} 
          />
        ))}
      </div>

      {/* Modal Logic remains the same as previous response */}
      {selectedItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white rounded-3xl max-w-2xl w-full max-h-[90vh] overflow-y-auto relative animate-in zoom-in-95 duration-200">
            <button onClick={() => setSelectedItem(null)} className="absolute top-4 right-4 bg-gray-100 p-2 rounded-full">✕</button>
            {selectedItem.image && <img src={selectedItem.image} className="w-full h-64 object-cover" alt="" />}
            <div className="p-8">
              <h2 className="text-3xl font-bold">{selectedItem.title}</h2>
              <p className="mt-4 text-gray-700">{selectedItem.desc || selectedItem.categorydesc}</p>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .scrollbar-hide::-webkit-scrollbar { display: none; }
        .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
    </div>
  );
}