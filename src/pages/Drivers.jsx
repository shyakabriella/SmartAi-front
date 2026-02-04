// src/pages/Drivers.jsx
import { useMemo, useState } from "react";
import { DRIVERS } from "../components/demoBookingData";

const INITIAL_FILTERS = {
  minRating: 4.0,
  languages: {
    English: true,
    French: true,
    Kinyarwanda: true,
  },
  minExperience: 0,
  highMatchOnly: false,
};

const CATEGORY_TABS = [
  { key: "all", label: "All" },
  { key: "top", label: "Top Rated" },
  { key: "experienced", label: "Most Experienced" },
];

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

export default function Drivers() {
  const [filters, setFilters] = useState(INITIAL_FILTERS);
  const [activeCategory, setActiveCategory] = useState("all");
  const [search, setSearch] = useState("");

  const filteredDrivers = useMemo(() => {
    return DRIVERS.filter((d) => {
      // Rating
      if (d.rating < filters.minRating) return false;

      // Languages
      const activeLangs = Object.entries(filters.languages)
        .filter(([, enabled]) => enabled)
        .map(([lang]) => lang);
      if (
        activeLangs.length > 0 &&
        !d.languages.some((l) => activeLangs.includes(l))
      ) {
        return false;
      }

      // Experience
      if (d.experienceYears < filters.minExperience) return false;

      // High match only
      if (filters.highMatchOnly && (d.matchScore ?? 0) < 90) return false;

      // Category tabs
      if (activeCategory === "top" && d.rating < 4.8) return false;
      if (activeCategory === "experienced" && d.experienceYears < 5) {
        return false;
      }

      // Search by name
      if (search.trim()) {
        const q = search.trim().toLowerCase();
        if (!d.name.toLowerCase().includes(q)) return false;
      }

      return true;
    });
  }, [filters, activeCategory, search]);

  function resetFilters() {
    setFilters(INITIAL_FILTERS);
    setSearch("");
  }

  return (
    <section className="bg-slate-50 py-8 sm:py-10">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-xl sm:text-2xl font-semibold text-slate-900">
              Meet Our Drivers
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              Professionally vetted, AI-matched drivers for safer, smoother
              rides across Rwanda and beyond.
            </p>
          </div>

          {/* Search */}
          <div className="w-full max-w-xs">
            <label className="mb-1 block text-[11px] font-medium text-slate-600">
              Search Driver
            </label>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name"
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs text-slate-900 shadow-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500/40"
            />
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-[260px,minmax(0,1fr)]">
          {/* LEFT: Filters */}
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

            {/* Rating */}
            <div className="mb-5">
              <p className="text-xs font-semibold text-slate-600">
                Minimum Rating
              </p>
              <div className="mt-2 flex items-center justify-between text-[11px] text-slate-500">
                <span>3.0★</span>
                <span>{filters.minRating.toFixed(1)}★</span>
              </div>
              <input
                type="range"
                min={3}
                max={5}
                step={0.1}
                value={filters.minRating}
                onChange={(e) =>
                  setFilters((prev) => ({
                    ...prev,
                    minRating: Number(e.target.value),
                  }))
                }
                className="mt-1 w-full accent-emerald-600"
              />
            </div>

            {/* Languages */}
            <div className="mb-5 space-y-2">
              <p className="text-xs font-semibold text-slate-600">
                Languages
              </p>
              {["English", "French", "Kinyarwanda"].map((lang) => (
                <label
                  key={lang}
                  className="flex items-center justify-between rounded-lg px-2 py-1 hover:bg-slate-50 text-xs"
                >
                  <span className="text-slate-600">{lang}</span>
                  <button
                    type="button"
                    onClick={() =>
                      setFilters((prev) => ({
                        ...prev,
                        languages: {
                          ...prev.languages,
                          [lang]: !prev.languages[lang],
                        },
                      }))
                    }
                    className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                      filters.languages[lang]
                        ? "bg-emerald-500"
                        : "bg-slate-300"
                    }`}
                  >
                    <span
                      className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow-sm transition-transform ${
                        filters.languages[lang]
                          ? "translate-x-4"
                          : "translate-x-1"
                      }`}
                    />
                  </button>
                </label>
              ))}
            </div>

            {/* Experience */}
            <div className="mb-5">
              <p className="text-xs font-semibold text-slate-600">
                Experience (years)
              </p>
              <div className="mt-2 flex items-center gap-2">
                <input
                  type="number"
                  min={0}
                  max={20}
                  value={filters.minExperience}
                  onChange={(e) =>
                    setFilters((prev) => ({
                      ...prev,
                      minExperience: Number(e.target.value) || 0,
                    }))
                  }
                  className="w-16 rounded-lg border border-slate-200 px-2 py-1 text-xs text-slate-900 shadow-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500/50"
                />
                <span className="text-[11px] text-slate-500">
                  or more years
                </span>
              </div>
            </div>

            {/* High match toggle */}
            <div className="border-t border-slate-100 pt-4 mt-2">
              <label className="flex items-center justify-between text-xs">
                <span className="font-semibold text-slate-600">
                  High AI Match Only
                </span>
                <button
                  type="button"
                  onClick={() =>
                    setFilters((prev) => ({
                      ...prev,
                      highMatchOnly: !prev.highMatchOnly,
                    }))
                  }
                  className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                    filters.highMatchOnly ? "bg-emerald-500" : "bg-slate-300"
                  }`}
                >
                  <span
                    className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow-sm transition-transform ${
                      filters.highMatchOnly
                        ? "translate-x-4"
                        : "translate-x-1"
                    }`}
                  />
                </button>
              </label>
              <p className="mt-1 text-[11px] text-slate-500">
                Show only drivers with AI match score ≥ 90%.
              </p>
            </div>
          </aside>

          {/* RIGHT: Drivers list */}
          <div className="space-y-4">
            {/* Category tabs + count */}
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
                Showing {filteredDrivers.length} of {DRIVERS.length} drivers
              </p>
            </div>

            {/* Cards */}
            {filteredDrivers.length > 0 ? (
              <div className="space-y-3">
                {filteredDrivers.map((d) => (
                  <DriverCard key={d.id} driver={d} />
                ))}
              </div>
            ) : (
              <div className="flex items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-white/60 py-10 text-sm text-slate-500">
                No drivers match your filters. Try lowering minimum rating or
                experience.
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

function DriverCard({ driver }) {
  return (
    <div className="flex flex-col sm:flex-row items-stretch gap-3 rounded-2xl border border-slate-200 bg-white p-3 sm:p-4 shadow-sm shadow-slate-900/5 hover:-translate-y-0.5 hover:shadow-md hover:shadow-emerald-500/10 transition-all">
      {/* Avatar */}
      <div className="flex items-center sm:block">
        <div className="h-14 w-14 sm:h-16 sm:w-16 rounded-full overflow-hidden bg-slate-200">
          <img
            src={driver.avatar}
            alt={driver.name}
            className="h-full w-full object-cover"
          />
        </div>
      </div>

      {/* Main info */}
      <div className="flex-1 space-y-1">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <p className="text-sm font-semibold text-slate-900">
              {driver.name}
            </p>
            <p className="text-[11px] text-slate-500">
              {driver.experienceYears} years experience •{" "}
              {driver.languages.join(", ")}
            </p>
          </div>
          <div className="text-right">
            <RatingStars value={driver.rating} />
            <p className="text-[11px] text-slate-500">
              ({driver.trips} trips)
            </p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 pt-1 text-[11px] text-slate-600">
          <span className="inline-flex items-center rounded-full bg-slate-50 px-3 py-1">
            🛡️ Safe-driving record
          </span>
          <span className="inline-flex items-center rounded-full bg-slate-50 px-3 py-1">
            🚗 Route-optimized by AI
          </span>
          {driver.matchScore != null && (
            <span className="inline-flex items-center rounded-full bg-emerald-50 px-3 py-1 font-semibold text-emerald-700">
              Match score {driver.matchScore}%
            </span>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="flex flex-col justify-between gap-2 sm:w-40">
        <button
          type="button"
          className="inline-flex w-full items-center justify-center rounded-lg border border-slate-200 px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50"
        >
          View Profile
        </button>
        <button
          type="button"
          className="inline-flex w-full items-center justify-center rounded-lg bg-emerald-600 px-3 py-2 text-xs font-semibold text-white shadow-sm hover:bg-emerald-700"
        >
          Book with this driver
        </button>
      </div>
    </div>
  );
}
