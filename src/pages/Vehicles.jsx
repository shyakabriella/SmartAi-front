// src/pages/Vehicles.jsx
import { useMemo, useState } from "react";
import { VEHICLES } from "../components/demoBookingData";

// Category tabs (top pills)
const CATEGORY_TABS = [
  { key: "all", label: "All" },
  { key: "suv", label: "SUVs" },
  { key: "sedan", label: "Sedans" },
  { key: "electric", label: "Electric" },
  { key: "luxury", label: "Luxury" },
  { key: "van", label: "Vans" },
];

// Left filter types
const TYPE_FILTERS = [
  { key: "sedan", label: "Sedan" },
  { key: "van", label: "Van" },
  { key: "truck", label: "Truck" },
  { key: "electric", label: "Electric" },
  { key: "luxury", label: "Luxury" },
];

const INITIAL_FILTERS = {
  maxPrice: 250,
  types: {
    sedan: true,
    van: true,
    truck: true,
    electric: true,
    luxury: true,
  },
  availability: 100,
  withDriverOnly: false,
};

function RatingStars({ value }) {
  const full = Math.round(value);
  return (
    <div className="flex items-center gap-1 text-[11px] text-amber-400">
      {Array.from({ length: 5 }).map((_, i) => (
        <span key={i}>{i < full ? "★" : "☆"}</span>
      ))}
      <span className="ml-1 text-[11px] text-slate-500">
        {value.toFixed(1)}
      </span>
    </div>
  );
}

// Tags we use for filters + category chips
function getVehicleTags(v) {
  const tags = [];
  const type = v.type?.toLowerCase() || "";
  const fuel = v.fuel?.toLowerCase() || "";

  if (type === "suv") tags.push("suv");
  if (type === "sedan") tags.push("sedan");
  if (type === "van") tags.push("van");
  if (type === "truck") tags.push("truck");

  if (fuel === "electric") tags.push("electric");

  if (v.pricePerDay >= 150 || /mercedes|g-class/i.test(v.name)) {
    tags.push("luxury");
  }

  return tags;
}

export default function Vehicles() {
  const [filters, setFilters] = useState(INITIAL_FILTERS);
  const [activeCategory, setActiveCategory] = useState("all");
  const [viewMode, setViewMode] = useState("grid");

  const maxPriceInData = useMemo(
    () => Math.max(...VEHICLES.map((v) => v.pricePerDay)),
    []
  );

  const filteredVehicles = useMemo(() => {
    const activeTypeKeys = TYPE_FILTERS.filter(
      (t) => filters.types[t.key]
    ).map((t) => t.key);

    return VEHICLES.filter((v) => {
      if (v.pricePerDay > filters.maxPrice) return false;
      if (filters.withDriverOnly && !v.withDriver) return false;

      const tags = getVehicleTags(v);

      // Left filter: if some types are ON, car must match at least one
      if (
        activeTypeKeys.length > 0 &&
        !tags.some((tag) => activeTypeKeys.includes(tag))
      ) {
        return false;
      }

      // Category tab
      if (activeCategory !== "all" && !tags.includes(activeCategory)) {
        return false;
      }

      return true;
    });
  }, [filters, activeCategory]);

  const featuredVehicle = filteredVehicles[0] || null;
  const otherVehicles = featuredVehicle
    ? filteredVehicles.slice(1)
    : filteredVehicles;

  function resetFilters() {
    setFilters(INITIAL_FILTERS);
  }

  return (
    <section className="bg-slate-50 py-8 sm:py-10">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Page header */}
        <div className="mb-4 sm:mb-6 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-xl sm:text-2xl font-semibold text-slate-900">
              Our Fleet
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              AI-curated vehicles for city rides, safaris and premium trips.
            </p>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-[260px,minmax(0,1fr)]">
          {/* LEFT: Filter & Sort */}
          <aside className="rounded-2xl bg-white p-4 shadow-sm shadow-slate-900/5 border border-slate-200">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-slate-900">
                Filter &amp; Sort
              </h2>
              <button
                type="button"
                onClick={resetFilters}
                className="text-xs font-medium text-emerald-600 hover:text-emerald-700"
              >
                Reset
              </button>
            </div>

            {/* Price range */}
            <div className="mb-5">
              <p className="text-xs font-semibold text-slate-600">
                Price Range
              </p>
              <div className="mt-2 flex items-center justify-between text-[11px] text-slate-500">
                <span>$50</span>
                <span>up to ${filters.maxPrice}</span>
              </div>
              <input
                type="range"
                min={50}
                max={maxPriceInData}
                value={filters.maxPrice}
                onChange={(e) =>
                  setFilters((prev) => ({
                    ...prev,
                    maxPrice: Number(e.target.value),
                  }))
                }
                className="mt-1 w-full accent-emerald-600"
              />
            </div>

            {/* Vehicle type */}
            <div className="mb-5 space-y-2">
              <p className="text-xs font-semibold text-slate-600">
                Vehicle Type
              </p>
              {TYPE_FILTERS.map((t) => (
                <label
                  key={t.key}
                  className="flex items-center justify-between rounded-lg px-2 py-1 hover:bg-slate-50 text-xs"
                >
                  <span className="text-slate-600">{t.label}</span>
                  <button
                    type="button"
                    onClick={() =>
                      setFilters((prev) => ({
                        ...prev,
                        types: {
                          ...prev.types,
                          [t.key]: !prev.types[t.key],
                        },
                      }))
                    }
                    className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                      filters.types[t.key] ? "bg-emerald-500" : "bg-slate-300"
                    }`}
                  >
                    <span
                      className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow-sm transition-transform ${
                        filters.types[t.key] ? "translate-x-4" : "translate-x-1"
                      }`}
                    />
                  </button>
                </label>
              ))}
            </div>

            {/* Availability slider (visual only for now) */}
            <div className="mb-5">
              <p className="text-xs font-semibold text-slate-600">
                Availability
              </p>
              <div className="mt-2 flex items-center justify-between text-[11px] text-slate-500">
                <span>Low</span>
                <span>High</span>
              </div>
              <input
                type="range"
                min={0}
                max={100}
                value={filters.availability}
                onChange={(e) =>
                  setFilters((prev) => ({
                    ...prev,
                    availability: Number(e.target.value),
                  }))
                }
                className="mt-1 w-full accent-emerald-600"
              />
            </div>

            {/* With driver toggle */}
            <div className="border-t border-slate-100 pt-4 mt-2">
              <label className="flex items-center justify-between text-xs">
                <span className="font-semibold text-slate-600">
                  With driver / Self-drive
                </span>
                <button
                  type="button"
                  onClick={() =>
                    setFilters((prev) => ({
                      ...prev,
                      withDriverOnly: !prev.withDriverOnly,
                    }))
                  }
                  className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                    filters.withDriverOnly ? "bg-emerald-500" : "bg-slate-300"
                  }`}
                >
                  <span
                    className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow-sm transition-transform ${
                      filters.withDriverOnly
                        ? "translate-x-4"
                        : "translate-x-1"
                    }`}
                  />
                </button>
              </label>
              <p className="mt-1 text-[11px] text-slate-500">
                When enabled, only cars that include a driver are shown.
              </p>
            </div>

            {/* View mode */}
            <div className="mt-4 border-t border-slate-100 pt-4">
              <p className="text-xs font-semibold text-slate-600 mb-2">
                View As
              </p>
              <div className="inline-flex rounded-full bg-slate-100 p-1">
                <button
                  type="button"
                  onClick={() => setViewMode("grid")}
                  className={`h-7 px-3 text-[11px] font-medium rounded-full ${
                    viewMode === "grid"
                      ? "bg-white shadow-sm text-slate-900"
                      : "text-slate-500"
                  }`}
                >
                  Grid
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode("list")}
                  className={`h-7 px-3 text-[11px] font-medium rounded-full ${
                    viewMode === "list"
                      ? "bg-white shadow-sm text-slate-900"
                      : "text-slate-500"
                  }`}
                >
                  List
                </button>
              </div>
            </div>
          </aside>

          {/* RIGHT: Fleet list */}
          <div className="space-y-4">
            {/* Category chips */}
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap gap-2">
                {CATEGORY_TABS.map((tab) => {
                  const active = tab.key === activeCategory;
                  return (
                    <button
                      key={tab.key}
                      type="button"
                      onClick={() => setActiveCategory(tab.key)}
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
                Showing {filteredVehicles.length} of {VEHICLES.length} vehicles
              </p>
            </div>

            {/* Featured vehicle */}
            {featuredVehicle && (
              <FeaturedVehicleCard vehicle={featuredVehicle} />
            )}

            {/* Other vehicles */}
            {otherVehicles.length > 0 ? (
              viewMode === "grid" ? (
                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                  {otherVehicles.map((v) => (
                    <VehicleCard key={v.id} vehicle={v} compact />
                  ))}
                </div>
              ) : (
                <div className="space-y-3">
                  {otherVehicles.map((v) => (
                    <VehicleCard key={v.id} vehicle={v} />
                  ))}
                </div>
              )
            ) : (
              <div className="flex items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-white/60 py-10 text-sm text-slate-500">
                No vehicles match your filters. Try adjusting the price or
                vehicle type.
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

/* --------------------------
   Featured + regular cards
   -------------------------- */

function FeaturedVehicleCard({ vehicle }) {
  return (
    <div className="rounded-3xl bg-white shadow-sm shadow-slate-900/10 border border-slate-200 p-4 sm:p-5">
      <div className="grid gap-4 sm:grid-cols-[minmax(0,1.4fr),minmax(0,1fr)] items-center">
        <div className="space-y-3">
          <div className="relative overflow-hidden rounded-2xl bg-slate-100 h-40 sm:h-52">
            <img
              src={vehicle.images[0]}
              alt={vehicle.name}
              className="h-full w-full object-cover"
            />
            {vehicle.aiRecommended && (
              <span className="absolute left-3 top-3 rounded-full bg-emerald-600/95 px-3 py-1 text-xs font-semibold text-white shadow-sm">
                AI Recommended
              </span>
            )}
          </div>

          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-base font-semibold text-slate-900">
                {vehicle.name}
              </p>
              <p className="text-xs text-slate-500">
                {vehicle.type} • {vehicle.seats} seats • {vehicle.fuel}
              </p>
              <div className="mt-1 flex items-center gap-2">
                <RatingStars value={vehicle.rating} />
                <span className="text-[11px] text-slate-500">
                  ({vehicle.trips} trips)
                </span>
              </div>
            </div>
            <div className="text-right">
              <p className="text-lg font-semibold text-slate-900">
                ${vehicle.pricePerDay}
                <span className="text-xs font-normal text-slate-500">
                  {" "}
                  / day
                </span>
              </p>
              <p className="mt-1 text-[11px] text-emerald-600">
                Instant confirmation
              </p>
            </div>
          </div>
        </div>

        <div className="space-y-3 text-xs text-slate-600">
          <p>
            Perfect for airport transfers, business trips and weekend getaways.
            SmartCar AI keeps this car&apos;s availability optimized based on
            demand and charging schedule.
          </p>
          <ul className="space-y-1">
            <li>• Free cancellation up to 24 hours</li>
            <li>• Included mileage: 250 km / day</li>
            <li>• Extra distance: $0.35 / km</li>
            <li>• Driver available on request</li>
          </ul>
          <div className="flex flex-wrap gap-2 pt-1">
            <button
              type="button"
              className="inline-flex items-center justify-center rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-emerald-700"
            >
              Book this vehicle
            </button>
            <button
              type="button"
              className="inline-flex items-center justify-center rounded-lg border border-slate-200 px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50"
            >
              View details
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function VehicleCard({ vehicle, compact = false }) {
  return (
    <div className="group flex flex-col overflow-hidden rounded-2xl bg-white text-left shadow-sm shadow-slate-900/5 border border-slate-200 hover:-translate-y-1 hover:shadow-lg hover:shadow-emerald-500/10 transition-all">
      <div className="relative h-40 w-full overflow-hidden">
        <img
          src={vehicle.images[0]}
          alt={vehicle.name}
          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
        />
        {vehicle.aiRecommended && (
          <span className="absolute left-2 top-2 rounded-full bg-emerald-600/90 px-2.5 py-0.5 text-[11px] font-semibold text-white shadow-sm">
            AI Recommended
          </span>
        )}
      </div>

      <div className="flex flex-1 flex-col px-4 py-3 gap-1.5">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="text-sm font-semibold text-slate-900">
              {vehicle.name}
            </p>
            <p className="text-[11px] text-slate-500">
              {vehicle.type} • {vehicle.seats} seats • {vehicle.fuel}
            </p>
          </div>
          <div className="text-right">
            <p className="text-sm font-semibold text-slate-900">
              ${vehicle.pricePerDay}
              <span className="text-[11px] font-normal text-slate-500">
                {" "}
                / day
              </span>
            </p>
            {!compact && (
              <p className="text-[11px] text-emerald-600">View details</p>
            )}
          </div>
        </div>

        <div className="mt-1 flex items-center justify-between">
          <RatingStars value={vehicle.rating} />
          <p className="text-[11px] text-slate-500">
            {vehicle.trips} trips
          </p>
        </div>
      </div>
    </div>
  );
}
