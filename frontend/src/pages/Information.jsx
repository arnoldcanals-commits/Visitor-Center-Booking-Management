import { useEffect, useState, useCallback, useRef, useMemo } from "react";
import api from "../api";
import {
  ChevronLeft,
  ChevronRight,
  Compass,
  ImageOff,
  LayoutGrid,
  List,
  MapPin,
  X,
} from "lucide-react";
import TopBar from "../components/TopBar";
import LoadingIndicator from "../components/LoadingIndicator";
// Deterministic accent so each category keeps the same color across renders
const ACCENTS = [
  "from-teal-500 to-cyan-500",
  "from-amber-400 to-orange-500",
  "from-violet-500 to-fuchsia-500",
  "from-sky-500 to-blue-500",
  "from-rose-500 to-pink-500",
];
const accentFor = (label) => {
  let hash = 0;
  for (let i = 0; i < label.length; i++) hash = (hash * 31 + label.charCodeAt(i)) >>> 0;
  return ACCENTS[hash % ACCENTS.length];
};

const accentChip = {
  backgroundColor: "color-mix(in srgb, var(--accent) 8%, transparent)",
  color: "var(--accent)",
  borderColor: "color-mix(in srgb, var(--accent) 20%, transparent)",
};

const CardImage = ({ item, accent, className }) =>
  item.image ? (
    <img
      src={item.image}
      alt={item.title}
      className={`object-cover ${className}`}
      loading="lazy"
    />
  ) : (
    <div
      className={`flex items-center justify-center bg-gradient-to-br ${accent} text-white/90 ${className}`}
    >
      <MapPin size={28} strokeWidth={1.5} />
    </div>
  );

// Horizontally-scrolling row, used in grid mode
const CategoryRow = ({ category, items, onCardClick }) => {
  const scrollRef = useRef(null);
  const accent = accentFor(category);

  const scroll = (direction) => {
    if (!scrollRef.current) return;
    const { scrollLeft, clientWidth } = scrollRef.current;
    const scrollTo =
      direction === "left" ? scrollLeft - clientWidth * 0.8 : scrollLeft + clientWidth * 0.8;
    scrollRef.current.scrollTo({ left: scrollTo, behavior: "smooth" });
  };

  return (
    <div className="mb-12 relative group">
      <div
        className={`inline-flex items-center gap-3 mb-5 px-5 py-2.5 rounded-2xl shadow-xl bg-gradient-to-r ${accent}`}
      >
        <h2 className="text-lg font-bold text-white tracking-tight">{category}</h2>
        <span className="text-xs font-semibold text-white/80 bg-white/15 px-2 py-0.5 rounded-full">
          {items.length}
        </span>
      </div>

      <button
        onClick={() => scroll("left")}
        aria-label={`Scroll ${category} left`}
        className="absolute left-[-16px] top-1/2 z-10 bg-white dark:bg-gray-800 shadow-lg rounded-full p-2 hidden md:group-hover:flex items-center justify-center hover:bg-teal-50 dark:hover:bg-gray-700 transition text-gray-700 dark:text-gray-200"
      >
        <ChevronLeft size={20} />
      </button>
      <button
        onClick={() => scroll("right")}
        aria-label={`Scroll ${category} right`}
        className="absolute right-[-16px] top-1/2 z-10 bg-white dark:bg-gray-800 shadow-lg rounded-full p-2 hidden md:group-hover:flex items-center justify-center hover:bg-teal-50 dark:hover:bg-gray-700 transition text-gray-700 dark:text-gray-200"
      >
        <ChevronRight size={20} />
      </button>

      <div
        ref={scrollRef}
        className="flex overflow-x-auto pb-6 gap-6 snap-x scrollbar-hide scroll-smooth"
      >
        {items.map((info) => (
          <div
            key={info.id}
            onClick={() => onCardClick(info)}
            className="flex-none w-72 md:w-80 bg-white dark:bg-gray-800 rounded-2xl shadow-md hover:shadow-xl transition-all cursor-pointer snap-start overflow-hidden border border-gray-100 dark:border-gray-700 hover:-translate-y-1"
          >
            <CardImage item={info} accent={accent} className="h-40 w-full" />
            <div className="p-5">
              <h3 className="font-bold text-lg text-gray-800 dark:text-gray-100 line-clamp-1">
                {info.title}
              </h3>
              <p className="text-sm text-teal-600 dark:text-teal-400 italic mb-2">
                {info.sub_category}
              </p>
              <p className="text-gray-600 dark:text-gray-400 text-sm line-clamp-3">
                {info.desc || info.categorydesc}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// Flat list, used in list mode
const CategoryList = ({ category, items, onCardClick }) => {
  const accent = accentFor(category);
  return (
    <div className="mb-10">
     
      <div
        className={`inline-flex items-center gap-3 mb-4 px-5 py-2.5 rounded-2xl shadow-xl bg-gradient-to-r ${accent}`}
      >
        <h2 className="text-lg font-bold text-white tracking-tight">{category}</h2>
        <span className="text-xs font-semibold text-white/80 bg-white/15 px-2 py-0.5 rounded-full">
          {items.length}
        </span>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow divide-y divide-gray-100 dark:divide-gray-700 overflow-hidden">
        {items.map((info) => (
          <div
            key={info.id}
            onClick={() => onCardClick(info)}
            className="flex items-center gap-4 px-4 py-3 hover:bg-teal-50/60 dark:hover:bg-gray-700/60 transition cursor-pointer"
          >
            <CardImage item={info} accent={accent} className="h-14 w-14 rounded-xl shrink-0" />
            <div className="min-w-0 flex-1">
              <p className="font-semibold text-gray-800 dark:text-gray-100 truncate">
                {info.title}
              </p>
              <p className="text-xs text-teal-600 dark:text-teal-400 italic truncate">
                {info.sub_category}
              </p>
            </div>
            <p className="hidden sm:block text-sm text-gray-500 dark:text-gray-400 line-clamp-1 max-w-xs">
              {info.desc || info.categorydesc}
            </p>
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
  const [viewMode, setViewMode] = useState("grid"); // "grid" | "list"


  const fetchInformation = useCallback(async () => {
    try {
      const minDelay = new Promise((resolve) => setTimeout(resolve, 1000)); 
      const [res] = await Promise.all([api.get("api/information/", minDelay)]);
      setInformation(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchInformation();
  }, [fetchInformation]);

  const groupedByCategory = useMemo(
    () =>
      information.reduce((acc, item) => {
        if (!acc[item.category]) acc[item.category] = [];
        acc[item.category].push(item);
        return acc;
      }, {}),
    [information]
  );

  const categoryCount = Object.keys(groupedByCategory).length;

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <LoadingIndicator/>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 pb-20 transition-colors">
       <TopBar/>
      <div className="max-w-7xl mx-auto p-4 md:p-8">
        {/* Header */}
        <div className="mb-10 flex flex-wrap items-center justify-between gap-4 bg-white dark:bg-gray-900 rounded-xl shadow p-4 border border-transparent dark:border-slate-700">
          <div className="flex items-center gap-4">
            
            <div >
              
              <div className="flex items-center gap-2 p-3 rounded-xl w-fit border" style={accentChip}>
                <Compass size={28} />
                <span className="text-sm font-black uppercase tracking-tight">Information</span>
              </div>
              
            </div>
          </div>


          {information.length > 0 && (
            <div className="flex items-center gap-1 bg-white dark:bg-gray-800 rounded-xl shadow p-1 border border-gray-100 dark:border-gray-700 bg-white dark:bg-slate-800 rounded-xl shadow p-4 border border-transparent dark:border-slate-700">
              <button
                onClick={() => setViewMode("grid")}
                aria-label="Grid view"
                className={`p-2 rounded-lg transition ${
                  viewMode === "grid"
                    ? "bg-teal-50 dark:bg-gray-700 text-teal-700 dark:text-teal-400 shadow-sm"
                    : "text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                }`}
              >
                <LayoutGrid size={20} />
              </button>
              <button
                onClick={() => setViewMode("list")}
                aria-label="List view"
                className={`p-2 rounded-lg transition ${
                  viewMode === "list"
                    ? "bg-teal-50 dark:bg-gray-700 text-teal-700 dark:text-teal-400 shadow-sm"
                    : "text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                }`}
              >
                <List size={20} />
              </button>
            </div>
          )}
        </div>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-8">
                {information.length === 0
                  ? "Everything you need to know before you go"
                  : `${information.length} entries across ${categoryCount} categories`}
              </p>

        {/* Empty state */}
        {information.length === 0 ? (
          <div className="flex flex-col items-center justify-center text-center py-20 bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-100 dark:border-gray-700 ">
            <div className="p-4 rounded-2xl bg-teal-50 dark:bg-gray-700 text-teal-500 dark:text-teal-400 mb-4">
              <ImageOff size={32} strokeWidth={1.5} />
            </div>
            <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100 mb-1">
              Nothing published yet
            </h2>
            <p className="text-gray-500 dark:text-gray-400 max-w-sm">
              Travel tips, guides, and destination details will show up here once they're added.
            </p>
          </div>
        ) : viewMode === "grid" ? (
          Object.entries(groupedByCategory).map(([category, items]) => (
            <CategoryRow
              key={category}
              category={category}
              items={items}
              onCardClick={setSelectedItem}
            />
          ))
        ) : (
          Object.entries(groupedByCategory).map(([category, items]) => (
            <CategoryList
              key={category}
              category={category}
              items={items}
              onCardClick={setSelectedItem}
            />
          ))
        )}
      </div>

      {/* Detail modal */}
      {selectedItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto relative animate-in zoom-in-95 duration-200">
            <button
              onClick={() => setSelectedItem(null)}
              aria-label="Close"
              className="absolute top-4 right-4 bg-white/90 dark:bg-gray-900/80 p-2 rounded-full shadow hover:bg-white dark:hover:bg-gray-900 transition text-gray-700 dark:text-gray-200"
            >
              <X size={18} />
            </button>
            {selectedItem.image ? (
              <img
                src={selectedItem.image}
                className="w-full h-64 object-cover"
                alt={selectedItem.title}
              />
            ) : (
              <div
                className={`w-full h-64 flex items-center justify-center bg-gradient-to-br ${accentFor(
                  selectedItem.category
                )} text-white/90`}
              >
                <MapPin size={40} strokeWidth={1.5} />
              </div>
            )}
            <div className="p-8">
              <p className="text-xs font-semibold text-teal-600 dark:text-teal-400 uppercase tracking-wide mb-1">
                {selectedItem.sub_category || selectedItem.category}
              </p>
              <h2 className="text-3xl font-bold text-gray-900 dark:text-white">
                {selectedItem.title}
              </h2>
              <p className="mt-4 text-gray-700 dark:text-gray-300 leading-relaxed">
                {selectedItem.desc || selectedItem.categorydesc}
              </p>
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