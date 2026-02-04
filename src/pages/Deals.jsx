// src/pages/Deals.jsx
import { useMemo, useState } from "react";

const DEAL_TABS = [
  { key: "all", label: "All Deals" },
  { key: "weekend", label: "Weekend Escapes" },
  { key: "business", label: "Business Trips" },
  { key: "longTerm", label: "Long-Term" },
  { key: "airport", label: "Airport Runs" },
];

const INITIAL_FILTERS = {
  maxPricePerDay: 250,
  aiOnly: false,
};

// Demo deals – swap to API later
const DEALS = [
  {
    id: 1,
    type: "weekend",
    vehicleName: "Tesla Model 3",
    image: "/images/cars/tesla-3-1.jpg",
    originalPricePerDay: 140,
    discountedPricePerDay: 110,
    discountLabel: "-21%",
    badge: "AI Weekend Pick",
    description: "Perfect for Kigali → Musanze or Rubavu weekend trips.",
    validUntil: "Valid until 30 Dec 2025",
    aiRecommended: true,
    perks: ["Free extra 50 km / day", "Priority charging"],
  },
  {
    id: 2,
    type: "business",
    vehicleName: "Mercedes-Benz E-Class",
    image: "/images/cars/merc-e-1.jpg",
    originalPricePerDay: 200,
    discountedPricePerDay: 165,
    discountLabel: "-18%",
    badge: "Executive Deal",
    description: "Comfortable sedan for meetings and airport pickups.",
    validUntil: "Valid until 15 Jan 2026",
    aiRecommended: true,
    perks: ["Professional driver", "Bottled water & Wi-Fi"],
  },
  {
    id: 3,
    type: "longTerm",
    vehicleName: "Ford Transit",
    image: "/images/cars/ford-transit-1.jpg",
    originalPricePerDay: 150,
    discountedPricePerDay: 120,
    discountLabel: "-20%",
    badge: "Team Travel",
    description: "Ideal for team field visits and group events.",
    validUntil: "Valid until 31 Mar 2026",
    aiRecommended: false,
    perks: ["Incl. 300 km / day", "Flexible driver shifts"],
  },
  {
    id: 4,
    type: "airport",
    vehicleName: "Toyota RAV4",
    image: "/images/cars/rav4-1.jpg",
    originalPricePerDay: 110,
    discountedPricePerDay: 90,
    discountLabel: "-18%",
    badge: "Airport Shuttle",
    description: "Fixed-price airport transfers – 24/7 availability.",
    validUntil: "Always on (limited slots per day)",
    aiRecommended: true,
    perks: ["Meet & greet", "Flight tracking"],
  },
  {
    id: 5,
    type: "weekend",
    vehicleName: "Tesla Model Y",
    image: "/images/cars/tesla-y-1.jpg",
    originalPricePerDay: 135,
    discountedPricePerDay: 115,
    discountLabel: "-15%",
    badge: "Family Weekend",
    description: "Extra space for family getaways & luggage.",
    validUntil: "Valid until 10 Feb 2026",
    aiRecommended: false,
    perks: ["Child seat on request", "Roadside assistance"],
  },
];

export default function Deals() {
  const [activeTab, setActiveTab] = useState("all");
  const [filters, setFilters] = useState(INITIAL_FILTERS);

  const maxPriceInData = useMemo(
    () =>
      Math.max(
        ...DEALS.map((d) => d.discountedPricePerDay || d.originalPricePerDay)
      ),
    []
  );

  const visibleDeals = useMemo(
    () =>
      DEALS.filter((d) => {
        const price = d.discountedPricePerDay || d.originalPricePerDay;
        if (price > filters.maxPricePerDay) return false;
        if (filters.aiOnly && !d.aiRecommended) return false;
        if (activeTab !== "all" && d.type !== activeTab) return false;
        return true;
      }),
    [activeTab, filters]
  );

  function resetFilters() {
    setFilters(INITIAL_FILTERS);
  }

  return (
    <section className="bg-slate-50 py-8 sm:py-10">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Page header */}
        <div className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-xl sm:text-2xl font-semibold text-slate-900">
              Smart Deals &amp; Seasonal Offers
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              Save on your next ride with AI-curated discounts for weekend
              escapes, airport runs, and long-term rentals.
            </p>
          </div>

          {/* Quick badge */}
          <div className="inline-flex items-center rounded-full bg-emerald-50 px-3 py-1 text-[11px] font-medium text-emerald-700">
            🔍 SmartCar AI finds the best value for your trip.
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-[260px,minmax(0,1fr)]">
          {/* LEFT: Filters */}
          <aside className="rounded-2xl bg-white p-4 shadow-sm shadow-slate-900/5 border border-slate-200">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-slate-900">
                Filter Deals
              </h2>
              <button
                type="button"
                onClick={resetFilters}
                className="text-xs font-medium text-emerald-600 hover:text-emerald-700"
              >
                Reset
              </button>
            </div>

            {/* Price slider */}
            <div className="mb-5">
              <p className="text-xs font-semibold text-slate-600">
                Max Price (per day)
              </p>
              <div className="mt-2 flex items-center justify-between text-[11px] text-slate-500">
                <span>$60</span>
                <span>up to ${filters.maxPricePerDay}</span>
              </div>
              <input
                type="range"
                min={60}
                max={maxPriceInData}
                value={filters.maxPricePerDay}
                onChange={(e) =>
                  setFilters((prev) => ({
                    ...prev,
                    maxPricePerDay: Number(e.target.value),
                  }))
                }
                className="mt-1 w-full accent-emerald-600"
              />
            </div>

            {/* AI-only toggle */}
            <div className="border-t border-slate-100 pt-4 mt-2">
              <label className="flex items-center justify-between text-xs">
                <span className="font-semibold text-slate-600">
                  AI-Recommended Only
                </span>
                <button
                  type="button"
                  onClick={() =>
                    setFilters((prev) => ({
                      ...prev,
                      aiOnly: !prev.aiOnly,
                    }))
                  }
                  className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                    filters.aiOnly ? "bg-emerald-500" : "bg-slate-300"
                  }`}
                >
                  <span
                    className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow-sm transition-transform ${
                      filters.aiOnly ? "translate-x-4" : "translate-x-1"
                    }`}
                  />
                </button>
              </label>
              <p className="mt-1 text-[11px] text-slate-500">
                Show only deals SmartCar AI ranks as best value.
              </p>
            </div>
          </aside>

          {/* RIGHT: Tabs + grid */}
          <div className="space-y-4">
            {/* Tabs */}
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap gap-2">
                {DEAL_TABS.map((tab) => {
                  const active = tab.key === activeTab;
                  return (
                    <button
                      key={tab.key}
                      type="button"
                      onClick={() => setActiveTab(tab.key)}
                      className={`rounded-full px-3 py-1 text-xs font-medium border transition-all ${
                        active
                          ? "bg-emerald-600 text-white border-emerald-600 shadow-sm"
                          : "bg-white text-slate-600 border-slate-200 hover:border-emerald-400 hover:text-slate-900"
                      }`}
                    >
                      {tab.label}
                    </button>
                  );
                })}
              </div>

              <p className="text-[11px] text-slate-500">
                Showing {visibleDeals.length} of {DEALS.length} deals
              </p>
            </div>

            {/* Deals grid */}
            {visibleDeals.length > 0 ? (
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {visibleDeals.map((deal) => (
                  <DealCard key={deal.id} deal={deal} />
                ))}
              </div>
            ) : (
              <div className="flex items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-white/60 py-10 text-sm text-slate-500">
                No deals match your filters. Try increasing the max price or
                disabling AI-only.
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

function DealCard({ deal }) {
  const {
    vehicleName,
    image,
    originalPricePerDay,
    discountedPricePerDay,
    discountLabel,
    badge,
    description,
    validUntil,
    aiRecommended,
    perks = [],
  } = deal;

  return (
    <article className="flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm shadow-slate-900/5 hover:-translate-y-1 hover:shadow-lg hover:shadow-emerald-500/10 transition-all">
      {/* Image */}
      <div className="relative h-32 w-full overflow-hidden sm:h-36">
        <img
          src={image}
          alt={vehicleName}
          className="h-full w-full object-cover transition-transform duration-300 hover:scale-105"
        />
        {discountLabel && (
          <span className="absolute left-2 top-2 rounded-full bg-emerald-600 px-2.5 py-0.5 text-[11px] font-semibold text-white shadow-sm">
            {discountLabel}
          </span>
        )}
        {aiRecommended && (
          <span className="absolute right-2 top-2 rounded-full bg-black/65 px-2.5 py-0.5 text-[11px] font-semibold text-white shadow-sm">
            AI Recommended
          </span>
        )}
      </div>

      {/* Body */}
      <div className="flex flex-1 flex-col gap-2 px-4 py-3">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="text-sm font-semibold text-slate-900">
              {vehicleName}
            </p>
            <p className="mt-0.5 text-[11px] text-slate-500">{description}</p>
          </div>
        </div>

        {/* Price row */}
        <div className="mt-1 flex items-center justify-between">
          <div className="flex items-baseline gap-2">
            <p className="text-base font-semibold text-slate-900">
              ${discountedPricePerDay}
              <span className="text-[11px] font-normal text-slate-500">
                {" "}
                / day
              </span>
            </p>
            <p className="text-[11px] text-slate-400 line-through">
              ${originalPricePerDay}
            </p>
          </div>
          {badge && (
            <span className="rounded-full bg-slate-50 px-2.5 py-0.5 text-[10px] font-medium text-slate-700">
              {badge}
            </span>
          )}
        </div>

        {/* Perks */}
        {perks.length > 0 && (
          <ul className="mt-1 space-y-0.5 text-[11px] text-slate-600">
            {perks.map((perk, idx) => (
              <li key={idx} className="flex items-start gap-1.5">
                <span className="mt-[2px] text-emerald-500">•</span>
                <span>{perk}</span>
              </li>
            ))}
          </ul>
        )}

        {/* Footer */}
        <div className="mt-3 flex items-center justify-between">
          <p className="text-[11px] text-slate-400">{validUntil}</p>
          <div className="flex gap-2">
            <button
              type="button"
              className="inline-flex items-center justify-center rounded-lg border border-slate-200 px-3 py-1.5 text-[11px] font-medium text-slate-700 hover:bg-slate-50"
            >
              View Details
            </button>
            <button
              type="button"
              className="inline-flex items-center justify-center rounded-lg bg-emerald-600 px-3 py-1.5 text-[11px] font-semibold text-white shadow-sm hover:bg-emerald-700"
            >
              Book this Deal
            </button>
          </div>
        </div>
      </div>
    </article>
  );
}
