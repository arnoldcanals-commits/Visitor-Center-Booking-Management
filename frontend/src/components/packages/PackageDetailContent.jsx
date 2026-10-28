import { useState } from "react";
import TabbedCard from "./TabbedCard";
import FloatingBookButton from "./FloatingBookButton";
import Reviews from "./Reviews";
import "react-calendar/dist/Calendar.css";
// Lightbox imports
import Lightbox from "yet-another-react-lightbox";
import "yet-another-react-lightbox/styles.css";
import EventCalendar from "./Eventcalendar";
import {
  Palmtree,
  Star,
  Users,
  ChevronLeft,
  ChevronRight,
  Maximize2,
  CalendarClock,
  CheckCircle2,
  XCircle,
  ImageOff,
} from "lucide-react";

export default function PackageDetailContent({ packageDetail }) {
  const [current, setCurrent] = useState(0); // carousel index
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);
  const [eventPage, setEventPage] = useState(0);
  const [imagePage, setImagePage] = useState(0);
  const [reviewPage, setReviewPage] = useState(0);

  const PER_PAGE = 6;
  const serverURL = import.meta.env.VITE_API_URL;

  if (!packageDetail) return <p className="text-gray-500 dark:text-gray-400">Package not found.</p>;

  const images = packageDetail.images?.length
    ? packageDetail.images.map((img) =>
        img.image.startsWith("http") ? img.image : `${serverURL}${img.image}`
      )
    : ["https://placehold.co/800x500?text=No+Image"];

  const nextSlide = () =>
    setCurrent((prev) => (prev + 1) % images.length);

  const prevSlide = () =>
    setCurrent((prev) => (prev - 1 + images.length) % images.length);

  // --- Compute which images sit in each "slot" around the current one:
  // offset -1 = peek left, 0 = center/main, 1 & 2 = peeks receding right.
  // Dedupes when there are fewer than 4 images so nothing repeats itself.
  const getRelativeIndex = (offset) =>
    ((current + offset) % images.length + images.length) % images.length;

  const slotOffsets = [-1, 0, 1, 2];
  const seenIdx = new Set();
  const visibleSlides =
    images.length > 1
      ? slotOffsets
          .map((offset) => ({ offset, index: getRelativeIndex(offset) }))
          .filter(({ index }) => {
            if (seenIdx.has(index)) return false;
            seenIdx.add(index);
            return true;
          })
      : [{ offset: 0, index: 0 }];

  // Layout per slot: left position (%), width/height (%), opacity, stacking order.
  const slotLayout = {
    "-1": { left: "8%", width: "26%", height: "76%", opacity: 0.55, z: 10 },
    "0": { left: "50%", width: "56%", height: "100%", opacity: 1, z: 20 },
    "1": { left: "80%", width: "28%", height: "76%", opacity: 0.6, z: 10 },
    "2": { left: "99%", width: "22%", height: "62%", opacity: 0.35, z: 5 },
  };

  const tabs = [
    {
      label: "Overview",
      content: (
        <div>
          <p className="text-gray-700 dark:text-gray-300">{packageDetail.digest}</p>
          <div
            className="prose dark:prose-invert prose-headings:text-[var(--accent)] max-w-none mt-3"
            dangerouslySetInnerHTML={{ __html: packageDetail.description }}
          />
        </div>
      ),
    },
    {
      label: "Reviews",
      content: (
        <Reviews
          packageId={packageDetail.id}
          page={reviewPage}
          perPage={PER_PAGE}
          setPage={setReviewPage}
        />
      ),
    },
    {
      label: "Itinerary",
      content: packageDetail.events?.length ? (
        <>
          <div className="grid gap-6 sm:grid-cols-1 md:grid-cols-2 xl:grid-cols-3">
            {packageDetail.events
              .slice(eventPage * PER_PAGE, (eventPage + 1) * PER_PAGE)
              .map((e, i) => {
                const parse = (str) => {
                  const [y, m, d] = str.split("-").map(Number);
                  return new Date(y, m - 1, d);
                };

                const start = parse(e.start_date);
                const end = parse(e.end_date);
                const slotsLeft = e.slot_limit - e.slots_used;

                const year = start.getFullYear();
                const month = start.getMonth();
                const firstDayOfMonth = new Date(year, month, 1).getDay();
                const daysInMonth = new Date(year, month + 1, 0).getDate();

                const days = [];
                for (let i = 0; i < firstDayOfMonth; i++) days.push(null);
                for (let d = 1; d <= daysInMonth; d++) {
                  const current = new Date(year, month, d);
                  const inRange = current >= start && current <= end;
                  days.push({ d, inRange });
                }

                return (
                  <div
                    key={e.id}
                    style={{ animationDelay: `${i * 60}ms` }}
                    className="card-in bg-white/60 dark:bg-white/[0.04] backdrop-blur-lg border border-black/5 dark:border-white/10 rounded-2xl shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-300 p-4"
                  >
                    <div className="mb-3">
                      <div className="flex items-center gap-2 font-semibold text-gray-900 dark:text-gray-100">
                        <CalendarClock size={16} className="text-[var(--accent)] shrink-0" />
                        <span>
                          {start.toDateString()} → {end.toDateString()}
                        </span>
                      </div>
                      <div className="mt-1 flex items-center gap-1.5 text-sm text-gray-600 dark:text-gray-400">
                        <Users size={14} />
                        {e.is_group_event ? "Group Event" : "Private Event"}
                      </div>
                      <div
                        className={`mt-1 flex items-center gap-1.5 text-sm font-semibold ${
                          slotsLeft > 0
                            ? "text-[var(--accent)]"
                            : "text-red-500 dark:text-red-400"
                        }`}
                      >
                        {slotsLeft > 0 ? (
                          <CheckCircle2 size={14} />
                        ) : (
                          <XCircle size={14} />
                        )}
                        {slotsLeft > 0
                          ? `${slotsLeft} slots available`
                          : "Fully booked"}
                      </div>
                    </div>

                    <div className="grid grid-cols-7 gap-1 text-center text-xs">
                      {["S", "M", "T", "W", "T", "F", "S"].map((d, idx) => (
                        <div
                          key={`${d}-${idx}`}
                          className="font-semibold text-gray-400 dark:text-gray-500"
                        >
                          {d}
                        </div>
                      ))}

                      {days.map((day, idx) => {
                        if (!day) return <div key={idx}></div>;

                        const current = new Date(year, month, day.d);
                        const isStart =
                          current.getTime() === start.getTime();
                        const isEnd =
                          current.getTime() === end.getTime();
                        const isSingleDay = isStart && isEnd;

                        let rangeStyle = "";
                        let rangeVars = {};
                        if (day.inRange) {
                          rangeVars = { backgroundColor: "var(--accent)" };
                          if (isSingleDay) {
                            rangeStyle = "text-white rounded-md";
                          } else if (isStart) {
                            rangeStyle = "text-white rounded-l-md";
                          } else if (isEnd) {
                            rangeStyle = "text-white rounded-r-md";
                          } else {
                            rangeStyle = "text-white";
                          }
                        }

                        return (
                          <div
                            key={idx}
                            style={rangeVars}
                            className={`py-1 font-semibold ${rangeStyle} ${
                              !day.inRange
                                ? "text-gray-600 dark:text-gray-400"
                                : ""
                            }`}
                          >
                            {day.d}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
          </div>

          {packageDetail.events.length > PER_PAGE && (
            <div className="flex justify-center items-center gap-3 mt-6">
              <button
                onClick={() => setEventPage((p) => Math.max(p - 1, 0))}
                disabled={eventPage === 0}
                className="flex items-center gap-1 px-3 py-1.5 rounded-full bg-white/50 dark:bg-white/5 border border-black/5 dark:border-white/10 text-sm font-medium text-gray-700 dark:text-gray-300 hover:border-[var(--accent)] hover:text-[var(--accent)] disabled:opacity-40 disabled:hover:border-black/5 disabled:hover:text-gray-700 transition-colors"
              >
                <ChevronLeft size={15} /> Prev
              </button>
              <button
                onClick={() =>
                  setEventPage((p) =>
                    (p + 1) * PER_PAGE < packageDetail.events.length
                      ? p + 1
                      : p
                  )
                }
                disabled={
                  (eventPage + 1) * PER_PAGE >=
                  packageDetail.events.length
                }
                className="flex items-center gap-1 px-3 py-1.5 rounded-full bg-white/50 dark:bg-white/5 border border-black/5 dark:border-white/10 text-sm font-medium text-gray-700 dark:text-gray-300 hover:border-[var(--accent)] hover:text-[var(--accent)] disabled:opacity-40 disabled:hover:border-black/5 disabled:hover:text-gray-700 transition-colors"
              >
                Next <ChevronRight size={15} />
              </button>
            </div>
          )}
        </>
      ) : (
        <p className="text-gray-500 dark:text-gray-400">No scheduled events.</p>
      ),
    },
    {
      label: "Gallery",
      content: images.length ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {images.map((url, idx) => (
            <div
              key={idx}
              style={{ animationDelay: `${idx * 40}ms` }}
              className="card-in group relative w-full h-32 overflow-hidden rounded-xl cursor-pointer"
              onClick={() => {
                setLightboxIndex(idx);
                setLightboxOpen(true);
              }}
            >
              <img
                src={url}
                alt="Package"
                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
              />
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors duration-300 flex items-center justify-center">
                <Maximize2
                  size={20}
                  className="text-white opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="flex items-center gap-2 text-gray-500 dark:text-gray-400">
          <ImageOff size={16} /> No images available.
        </p>
      ),
    },
  ];

  const accentChip = {
  backgroundColor: "color-mix(in srgb, var(--accent) 8%, transparent)",
  color: "var(--accent)",
  borderColor: "color-mix(in srgb, var(--accent) 20%, transparent)",
};

  return (
    <div className="mt-12 px-8 sm:px-12 lg:px-16 flex flex-col max-w-7xl w-full bg-white dark:bg-gray-900  ">
      {/* --- Glass wrapper --- */}
      <div className="card-in relative rounded-2xl overflow-hidden shadow-md dark:shadow-black/40 bg-white/20 dark:bg-white/[0.03] backdrop-blur-lg border border-white/30 dark:border-white/10 group transition-shadow duration-300 hover:shadow-xl">

        {/* --- Header: Name + Rating + Price --- */}
        <div className="p-6 border-t-3 border-t-[var(--accent)]">
  <div className="flex items-center gap-2 p-3 rounded-xl w-fit border" style={accentChip}>
                <Palmtree size={28} />
                <span className="text-sm font-black uppercase tracking-tight">{packageDetail.name}</span>
              </div>

          <div className="mt-2 mb-6 flex items-center gap-6 flex-wrap">
            <div className="flex items-center gap-1 text-sm text-gray-600 dark:text-gray-400">
              <Star size={15} className="fill-[var(--accent)] text-[var(--accent)]" />
              {packageDetail.average_rating}
            </div>

            <div className="flex items-center gap-1.5 text-sm text-gray-600 dark:text-gray-400">
              <Users size={15} />
              {packageDetail.booking_count || 0} bookings
            </div>

            <div className="text-xl font-semibold ml-auto text-[var(--accent)]">
              ₱{packageDetail.base_price}
            </div>
          </div>

          <p className="text-gray-700 dark:text-gray-300">
            {packageDetail.short_description}
          </p>
        </div>

        {/* --- CAROUSEL: 1 peek left, main center, 2 peeks right --- */}
        <div className="relative w-full h-72 sm:h-96 overflow-hidden">
          <div className="relative w-full h-full">
            {visibleSlides.map(({ offset, index }) => {
              const s = slotLayout[offset];
              const isCenter = offset === 0;

              return (
                <div
                  key={index}
                  onClick={() =>
                    isCenter
                      ? (setLightboxIndex(index), setLightboxOpen(true))
                      : setCurrent(index)
                  }
                  className={`
                    absolute top-1/2 rounded-2xl overflow-hidden cursor-pointer
                    transition-all duration-500 ease-out
                    ${isCenter ? "shadow-xl" : "shadow-md hover:opacity-80"}
                    ${offset === 2 ? "hidden sm:block" : ""}
                  `}
                  style={{
                    left: s.left,
                    width: s.width,
                    height: s.height,
                    opacity: s.opacity,
                    zIndex: s.z,
                    transform: "translate(-50%, -50%)",
                  }}
                >
                  <img
                    src={images[index]}
                    alt="Package"
                    className="w-full h-full object-cover"
                  />
                  {!isCenter && <div className="absolute inset-0 bg-black/20" />}
                  {isCenter && (
                    <div
                      className="
                        pointer-events-none absolute inset-0 -translate-x-full
                        bg-gradient-to-r from-transparent via-white/40 to-transparent
                        skew-x-[-20deg] transition-transform duration-700
                        group-hover:translate-x-full
                      "
                    />
                  )}
                </div>
              );
            })}
          </div>

          {images.length > 1 && (
            <>
              <button
                onClick={prevSlide}
                aria-label="Previous image"
                className="absolute left-2 top-1/2 -translate-y-1/2 z-30 bg-black/40 hover:bg-[var(--accent)] text-white p-2 rounded-full transition-colors duration-200"
              >
                <ChevronLeft size={18} />
              </button>
              <button
                onClick={nextSlide}
                aria-label="Next image"
                className="absolute right-2 top-1/2 -translate-y-1/2 z-30 bg-black/40 hover:bg-[var(--accent)] text-white p-2 rounded-full transition-colors duration-200"
              >
                <ChevronRight size={18} />
              </button>
              <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-30 flex gap-2">
                {images.map((_, i) => (
                  <div
                    key={i}
                    style={current === i ? { backgroundColor: "var(--accent)" } : undefined}
                    className={`h-2 rounded-full transition-all duration-300 ${
                      current === i ? "w-5" : "w-2 bg-white/40"
                    }`}
                  />
                ))}
              </div>
            </>
          )}
        </div>

        {/* --- Tabs --- */}
        <div className="p-6">
          <TabbedCard tabs={tabs} />
        </div>
      </div>

      {/* --- Floating Book Button --- */}
      <FloatingBookButton packageId={packageDetail.id} />

      {/* --- Lightbox --- */}
      {lightboxOpen && (
        <Lightbox
          open={lightboxOpen}
          close={() => setLightboxOpen(false)}
          slides={images.map((img) => ({ src: img }))}
          index={lightboxIndex}
          onIndexChange={setLightboxIndex}
        />
      )}

      <style>{`
        @keyframes card-in {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .card-in {
          animation: card-in 0.5s ease-out both;
        }
        @media (prefers-reduced-motion: reduce) {
          .card-in { animation: none; }
        }
      `}</style>
    </div>
  );
}