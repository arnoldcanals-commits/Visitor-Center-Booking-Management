import { useState } from "react";
import TabbedCard from "./TabbedCard";
import FloatingBookButton from "../FloatingBookButton";
import Reviews from "./Reviews";
import "react-calendar/dist/Calendar.css";
// Lightbox imports
import Lightbox from "yet-another-react-lightbox";
import "yet-another-react-lightbox/styles.css";
import EventCalendar from "./Eventcalendar";


export default function PackageDetailContent({ packageDetail }) {
  const [current, setCurrent] = useState(0); // carousel index
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);
  const [eventPage, setEventPage] = useState(0);
  const [imagePage, setImagePage] = useState(0);
  const [reviewPage, setReviewPage] = useState(0);

  const PER_PAGE = 6;
  const serverURL = import.meta.env.VITE_API_URL;

  if (!packageDetail) return <p>Package not found.</p>;

  const images = packageDetail.images?.length
    ? packageDetail.images.map((img) =>
        img.image.startsWith("http") ? img.image : `${serverURL}${img.image}`
      )
    : ["https://placehold.co/800x500?text=No+Image"];

  const nextSlide = () =>
    setCurrent((prev) => (prev + 1) % images.length);

  const prevSlide = () =>
    setCurrent((prev) => (prev - 1 + images.length) % images.length);

  const tabs = [
    {
      label: "Overview",
      content: <div><p> {packageDetail.digest}</p>
      <div 
    className="prose" 
    dangerouslySetInnerHTML={{ __html: packageDetail.description }} 
      />
      </div>,
    
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
              .map((e) => {
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
                    className="bg-white/30 backdrop-blur-lg border border-white/40 rounded-2xl shadow-md p-4"
                  >
                    <div className="mb-3">
                      <div className="font-semibold">
                        {start.toDateString()} → {end.toDateString()}
                      </div>
                      <div className="text-sm text-gray-600">
                        {e.is_group_event ? "Group Event" : "Private Event"}
                      </div>
                      <div
                        className={`text-sm font-semibold ${
                          slotsLeft > 0 ? "text-green-600" : "text-red-500"
                        }`}
                      >
                        {slotsLeft > 0
                          ? `${slotsLeft} slots available`
                          : "Fully booked"}
                      </div>
                    </div>

                    <div className="grid grid-cols-7 gap-1 text-center text-xs">
                      {["S", "M", "T", "W", "T", "F", "S"].map((d) => (
                        <div key={d} className="font-semibold text-gray-500">
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
                        if (day.inRange) {
                          if (isSingleDay) {
                            rangeStyle =
                              "bg-blue-500 text-white rounded-md";
                          } else if (isStart) {
                            rangeStyle =
                              "bg-blue-500 text-white rounded-l-md";
                          } else if (isEnd) {
                            rangeStyle =
                              "bg-blue-500 text-white rounded-r-md";
                          } else {
                            rangeStyle = "bg-blue-500 text-white";
                          }
                        }

                        return (
                          <div
                            key={idx}
                            className={`py-1 font-semibold ${rangeStyle} ${
                              !day.inRange ? "text-gray-600" : ""
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
            <div className="flex justify-center gap-4 mt-4">
              <button
                onClick={() => setEventPage((p) => Math.max(p - 1, 0))}
                disabled={eventPage === 0}
                className="px-3 py-1 rounded bg-white/40"
              >
                Prev
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
                className="px-3 py-1 rounded bg-white/40"
              >
                Next
              </button>
            </div>
          )}
        </>
      ) : (
        <p>No scheduled events.</p>
      ),
    },
    {
      label: "Gallery",
      content: images.length ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {images.map((url, idx) => (
            <img
              key={idx}
              src={url}
              alt="Package"
              className="w-full h-32 object-cover rounded cursor-pointer"
              onClick={() => {
                setLightboxIndex(idx);
                setLightboxOpen(true);
              }}
            />
          ))}
        </div>
      ) : (
        <p>No images available.</p>
      ),
    },
  ];

  return (
    <div className="mt-12 px-8 sm:px-12 lg:px-16 flex flex-col max-w-5xl w-full">
      {/* --- Glass wrapper --- */}
      <div className="relative rounded-2xl overflow-hidden shadow-md bg-white/20 backdrop-blur-lg border border-white/30 group transition-shadow duration-300 hover:shadow-xl">

        {/* --- Header: Name + Rating + Price --- */}
        <div className="p-6">
          <h1 className="text-3xl font-bold">{packageDetail.name}</h1>

          <div className="mt-1 mb-6 flex items-center gap-6 flex-wrap">
            <div className="text-gray-600 text-sm">
              ★ {packageDetail.average_rating}
            </div>

            <div className="text-gray-600 text-sm">
              {packageDetail.booking_count || 0} bookings
            </div>

            <div className="text-xl font-semibold ml-auto">
              ₱{packageDetail.base_price}
            </div>
          </div>

          <p className="text-gray-700">{packageDetail.short_description}</p>
        </div>

        {/* --- CAROUSEL --- */}
        <div className="relative w-full h-72 sm:h-96 overflow-hidden rounded-2xl px-6">
          <div
            className="flex h-full transition-transform duration-500 ease-out rounded-2xl overflow-hidden"
            style={{ transform: `translateX(-${current * 100}%)` }}
          >
            {images.map((url, idx) => (
              <div key={idx} className="relative w-full h-full flex-shrink-0 cursor-pointer">
                <img
                  src={url}
                  alt="Package"
                  className="w-full h-full object-cover rounded-2xl"
                  onClick={() => {
                    setLightboxIndex(idx);
                    setLightboxOpen(true);
                  }}
                />
                {/* Optional image shine */}
                <div className="
                  pointer-events-none
                  absolute
                  inset-0
                  -translate-x-full
                  bg-gradient-to-r
                  from-transparent
                  via-white/40
                  to-transparent
                  skew-x-[-20deg]
                  transition-transform
                  duration-700
                  group-hover:translate-x-full
                  rounded-2xl
                "/>
              </div>
            ))}
          </div>

          {images.length > 1 && (
            <>
              <button
                onClick={prevSlide}
                className="absolute left-3 top-1/2 -translate-y-1/2 bg-black/40 text-white p-2 rounded-full hover:bg-black/60"
              >
                ‹
              </button>
              <button
                onClick={nextSlide}
                className="absolute right-3 top-1/2 -translate-y-1/2 bg-black/40 text-white p-2 rounded-full hover:bg-black/60"
              >
                ›
              </button>
              <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-2">
                {images.map((_, i) => (
                  <div
                    key={i}
                    className={`h-2 w-2 rounded-full ${
                      current === i ? "bg-white" : "bg-white/40"
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
    </div>
  );
}
