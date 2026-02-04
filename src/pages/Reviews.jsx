// src/pages/Reviews.jsx
import { useMemo, useState } from "react";

const REVIEW_TABS = [
  { key: "all", label: "All" },
  { key: "vehicle", label: "Vehicle Reviews" },
  { key: "driver", label: "Driver Reviews" },
  { key: "platform", label: "Platform & Service" },
];

const INITIAL_FILTERS = {
  minRating: 0,
  tripType: "all",
};

// Demo reviews – replace with API later
const REVIEWS = [
  {
    id: 1,
    rating: 4.9,
    title: "Perfect airport pickup – on time and smooth ride",
    text: "Driver was waiting at arrivals, helped with luggage and the Tesla was super clean. The AI recommendation really matched my preferences.",
    customerName: "Alice N.",
    avatar: "/images/customers/alice.jpg",
    date: "Dec 02, 2025",
    tripType: "airport",
    focus: "driver",
    vehicleName: "Tesla Model 3",
    driverName: "Shyaka Samuel",
    verified: true,
  },
  {
    id: 2,
    rating: 4.7,
    title: "Weekend in Rubavu with Model Y",
    text: "Comfortable seats and great range. Loved being able to see transparent pricing before booking. Only wish we had more charging options on the way.",
    customerName: "Eric M.",
    avatar: "/images/customers/eric.jpg",
    date: "Nov 21, 2025",
    tripType: "weekend",
    focus: "vehicle",
    vehicleName: "Tesla Model Y",
    driverName: null,
    verified: true,
  },
  {
    id: 3,
    rating: 4.8,
    title: "Great for client meetings around Kigali",
    text: "Mercedes E-Class with professional driver. Booking and changes were super easy on the web app. My clients were impressed.",
    customerName: "Grace B.",
    avatar: "/images/customers/grace.jpg",
    date: "Oct 15, 2025",
    tripType: "business",
    focus: "platform",
    vehicleName: "Mercedes-Benz E-Class",
    driverName: "Patrick K.",
    verified: true,
  },
  {
    id: 4,
    rating: 4.5,
    title: "Long-term team shuttle worked well",
    text: "We used SmartCar AI for a 2-week project. Ford Transit was reliable and drivers rotated smoothly. Support was responsive when we adjusted pickup times.",
    customerName: "TechLab Rwanda",
    avatar: "/images/customers/company-1.jpg",
    date: "Sep 30, 2025",
    tripType: "longTerm",
    focus: "vehicle",
    vehicleName: "Ford Transit",
    driverName: "Team of drivers",
    verified: true,
  },
  {
    id: 5,
    rating: 5.0,
    title: "Best driver experience so far",
    text: "Polite, safe driving and knew the city shortcuts. The match score gave me confidence before confirming.",
    customerName: "Sandrine K.",
    avatar: "/images/customers/sandrine.jpg",
    date: "Sep 09, 2025",
    tripType: "business",
    focus: "driver",
    vehicleName: "Toyota RAV4",
    driverName: "Shyaka Samuel",
    verified: true,
  },
];

function RatingStars({ value }) {
  const full = Math.round(value);
  return (
    <div className="flex items-center gap-1 text-xs text-amber-400">
      {Array.from({ length: 5 }).map((_, i) => (
        <span key={i}>{i < full ? "★" : "☆"}</span>
      ))}
      <span className="ml-1 text-[11px] text-slate-500">
        {value.toFixed(1)}
      </span>
    </div>
  );
}

export default function Reviews() {
  const [activeTab, setActiveTab] = useState("all");
  const [filters, setFilters] = useState(INITIAL_FILTERS);

  const overallRating = useMemo(() => {
    if (!REVIEWS.length) return 0;
    const sum = REVIEWS.reduce((acc, r) => acc + r.rating, 0);
    return sum / REVIEWS.length;
  }, []);

  const ratingDistribution = useMemo(() => {
    const dist = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
    REVIEWS.forEach((r) => {
      const bucket = Math.round(r.rating);
      dist[bucket] = (dist[bucket] || 0) + 1;
    });
    return dist;
  }, []);

  const maxBucketCount = Math.max(...Object.values(ratingDistribution));

  const filteredReviews = useMemo(
    () =>
      REVIEWS.filter((r) => {
        if (r.rating < filters.minRating) return false;
        if (filters.tripType !== "all" && r.tripType !== filters.tripType)
          return false;
        if (activeTab !== "all" && r.focus !== activeTab) return false;
        return true;
      }),
    [filters, activeTab]
  );

  function resetFilters() {
    setFilters(INITIAL_FILTERS);
    setActiveTab("all");
  }

  return (
    <section className="bg-slate-50 py-8 sm:py-10">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-xl sm:text-2xl font-semibold text-slate-900">
              Customer Reviews &amp; Ratings
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              See what riders and partners say about SmartCar AI vehicles,
              drivers, and booking experience.
            </p>
          </div>

          {/* Overall rating card */}
          <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm shadow-slate-900/5 flex items-center gap-4">
            <div className="flex flex-col items-center justify-center rounded-2xl bg-slate-900 text-white px-3 py-2">
              <span className="text-lg font-semibold">
                {overallRating.toFixed(1)}
              </span>
              <span className="text-[10px] uppercase tracking-wide text-slate-300">
                Overall
              </span>
            </div>
            <div>
              <RatingStars value={overallRating} />
              <p className="mt-0.5 text-[11px] text-slate-500">
                Based on {REVIEWS.length} verified trips
              </p>
            </div>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-[260px,minmax(0,1fr)]">
          {/* LEFT: filters + distribution */}
          <aside className="rounded-2xl bg-white p-4 shadow-sm shadow-slate-900/5 border border-slate-200">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-slate-900">Filters</h2>
              <button
                type="button"
                onClick={resetFilters}
                className="text-xs font-medium text-emerald-600 hover:text-emerald-700"
              >
                Reset
              </button>
            </div>

            {/* Minimum rating */}
            <div className="mb-4">
              <p className="text-xs font-semibold text-slate-600">
                Minimum Rating
              </p>
              <div className="mt-2 flex flex-wrap gap-1">
                {[0, 3, 4, 4.5].map((v) => {
                  const label =
                    v === 0 ? "All" : v === 4.5 ? "4.5+" : `${v.toFixed(1)}+`;
                  const active = filters.minRating === v;
                  return (
                    <button
                      key={v}
                      type="button"
                      onClick={() =>
                        setFilters((prev) => ({ ...prev, minRating: v }))
                      }
                      className={`rounded-full px-2.5 py-1 text-[11px] border transition-all ${
                        active
                          ? "bg-emerald-600 text-white border-emerald-600"
                          : "bg-white text-slate-600 border-slate-200 hover:border-emerald-400 hover:text-slate-900"
                      }`}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Trip type */}
            <div className="mb-4">
              <p className="text-xs font-semibold text-slate-600">Trip Type</p>
              <div className="mt-2 grid grid-cols-2 gap-2 text-[11px]">
                {[
                  ["all", "Any"],
                  ["airport", "Airport"],
                  ["business", "Business"],
                  ["weekend", "Weekend"],
                  ["longTerm", "Long-term"],
                ].map(([key, label]) => {
                  const active = filters.tripType === key;
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() =>
                        setFilters((prev) => ({ ...prev, tripType: key }))
                      }
                      className={`rounded-lg border px-2 py-1 text-left transition-all ${
                        active
                          ? "border-emerald-500 bg-emerald-50 text-emerald-700"
                          : "border-slate-200 bg-white text-slate-600 hover:border-emerald-400 hover:bg-emerald-50/40"
                      }`}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Rating distribution */}
            <div className="border-t border-slate-100 pt-4 mt-2">
              <p className="text-xs font-semibold text-slate-600 mb-2">
                Rating Breakdown
              </p>
              <div className="space-y-1.5">
                {[5, 4, 3, 2, 1].map((star) => {
                  const count = ratingDistribution[star] || 0;
                  const width =
                    maxBucketCount > 0 ? (count / maxBucketCount) * 100 : 0;
                  return (
                    <div
                      key={star}
                      className="flex items-center gap-2 text-[11px]"
                    >
                      <span className="w-5 text-right text-slate-500">
                        {star}★
                      </span>
                      <div className="flex-1 h-1.5 rounded-full bg-slate-100 overflow-hidden">
                        <div
                          className="h-full rounded-full bg-emerald-500"
                          style={{ width: `${width}%` }}
                        />
                      </div>
                      <span className="w-6 text-right text-slate-400">
                        {count}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </aside>

          {/* RIGHT: tabs + reviews list */}
          <div className="space-y-4">
            {/* Tabs + sort */}
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap gap-2">
                {REVIEW_TABS.map((tab) => {
                  const active = tab.key === activeTab;
                  return (
                    <button
                      key={tab.key}
                      type="button"
                      onClick={() => setActiveTab(tab.key)}
                      className={`rounded-full px-3 py-1 text-xs font-medium border transition-all ${
                        active
                          ? "bg-sky-600 text-white border-sky-600 shadow-sm"
                          : "bg-white text-slate-600 border-slate-200 hover:border-sky-400 hover:text-slate-900"
                      }`}
                    >
                      {tab.label}
                    </button>
                  );
                })}
              </div>

              <div className="flex items-center gap-2 text-[11px] text-slate-500">
                <span>{filteredReviews.length} reviews shown</span>
              </div>
            </div>

            {/* List */}
            {filteredReviews.length > 0 ? (
              <div className="space-y-3">
                {filteredReviews.map((review) => (
                  <ReviewCard key={review.id} review={review} />
                ))}
              </div>
            ) : (
              <div className="flex items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-white/60 py-10 text-sm text-slate-500">
                No reviews match your filters. Try lowering the minimum rating or
                changing the trip type.
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

function ReviewCard({ review }) {
  const {
    rating,
    title,
    text,
    customerName,
    avatar,
    date,
    tripType,
    focus,
    vehicleName,
    driverName,
    verified,
  } = review;

  const focusLabel =
    focus === "vehicle"
      ? "Vehicle"
      : focus === "driver"
      ? "Driver"
      : "Platform";

  const tripLabel =
    tripType === "airport"
      ? "Airport"
      : tripType === "business"
      ? "Business"
      : tripType === "weekend"
      ? "Weekend"
      : tripType === "longTerm"
      ? "Long-term"
      : "Other";

  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm shadow-slate-900/5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        {/* Left: avatar + text */}
        <div className="flex flex-1 gap-3">
          <div className="mt-1 h-10 w-10 flex-shrink-0 overflow-hidden rounded-full bg-slate-200">
            <img
              src={avatar}
              alt={customerName}
              className="h-full w-full object-cover"
            />
          </div>

          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-sm font-semibold text-slate-900">
                {customerName}
              </p>
              <span className="text-[11px] text-slate-400">{date}</span>
            </div>

            <RatingStars value={rating} />

            <h3 className="text-sm font-semibold text-slate-900 mt-1">
              {title}
            </h3>
            <p className="text-xs text-slate-600 mt-0.5">{text}</p>

            {/* Chips */}
            <div className="mt-2 flex flex-wrap gap-1.5 text-[11px]">
              {vehicleName && (
                <span className="inline-flex items-center rounded-full bg-slate-50 px-2.5 py-0.5 text-slate-700">
                  🚗 Vehicle: {vehicleName}
                </span>
              )}
              {driverName && (
                <span className="inline-flex items-center rounded-full bg-slate-50 px-2.5 py-0.5 text-slate-700">
                  🧑‍✈️ Driver: {driverName}
                </span>
              )}
              <span className="inline-flex items-center rounded-full bg-slate-50 px-2.5 py-0.5 text-slate-700">
                🎯 Focus: {focusLabel}
              </span>
              <span className="inline-flex items-center rounded-full bg-slate-50 px-2.5 py-0.5 text-slate-700">
                🗺 Trip: {tripLabel}
              </span>
              {verified && (
                <span className="inline-flex items-center rounded-full bg-emerald-50 px-2.5 py-0.5 text-emerald-700">
                  ✅ Verified trip
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Right: small CTA */}
        <div className="mt-2 flex flex-col items-end gap-2 sm:mt-0">
          <button
            type="button"
            className="inline-flex items-center justify-center rounded-lg border border-slate-200 px-3 py-1.5 text-[11px] font-medium text-slate-700 hover:bg-slate-50"
          >
            Report an issue
          </button>
          <button
            type="button"
            className="inline-flex items-center justify-center rounded-lg bg-sky-600 px-3 py-1.5 text-[11px] font-semibold text-white shadow-sm hover:bg-sky-700"
          >
            Book a similar trip
          </button>
        </div>
      </div>
    </article>
  );
}
