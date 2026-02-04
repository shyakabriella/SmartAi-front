// src/components/VehicleDetailModal.jsx
import { useEffect, useMemo } from "react";
import { VEHICLES, RENTER_DAYS } from "./demoBookingData";
import RatingStars from "./RatingStars";

/* ✅ backend origin (same logic as VehicleGrid) */
const API_BASE = import.meta.env.VITE_API_URL || import.meta.env.VITE_API_URL || "";
const API_ORIGIN = (() => {
  try {
    return API_BASE ? new URL(API_BASE).origin : "";
  } catch {
    return "";
  }
})();

/* ✅ fallback image */
const FALLBACK_IMG =
  "data:image/svg+xml;charset=UTF-8," +
  encodeURIComponent(`
  <svg xmlns="http://www.w3.org/2000/svg" width="900" height="500">
    <rect width="100%" height="100%" fill="#f1f5f9"/>
    <text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle"
      font-family="Arial" font-size="22" fill="#64748b">
      No image
    </text>
  </svg>`);

/* ✅ Normalize laravel/storage paths to browser-friendly */
function normalizeRelativePath(u) {
  if (!u) return "";
  let p = String(u).trim();

  // remove domain if mistakenly included
  p = p.replace(/^https?:\/\/[^/]+/i, "");

  // laravel common variants → /storage/...
  p = p.replace(/^\/?storage\/app\/public\//i, "/storage/");
  p = p.replace(/^\/?public\/storage\//i, "/storage/");
  p = p.replace(/^\/?public\//i, "/");

  if (!p.startsWith("/")) p = `/${p}`;
  return p;
}

/* ✅ Resolve url (same as grid) */
function resolveImageUrl(u) {
  if (!u) return "";

  const s = String(u).trim();

  // absolute url
  if (/^https?:\/\//i.test(s)) {
    try {
      const url = new URL(s);
      const pathname = url.pathname || "";

      const isStorage =
        /^\/?storage\//i.test(pathname.replace(/^\//, "")) ||
        pathname.includes("/storage/");

      if (isStorage && API_ORIGIN) {
        return `${API_ORIGIN}${pathname}`;
      }
      return s;
    } catch {
      return s;
    }
  }

  // relative
  const clean = normalizeRelativePath(s);
  if (!API_ORIGIN) return clean;
  return `${API_ORIGIN}${clean}`;
}

/* ✅ get ALL images from ANY possible shape */
function getAllImagesRaw(v) {
  if (!v) return [];
  const arr = [];

  if (Array.isArray(v?.images)) arr.push(...v.images);
  if (v?.image_url) arr.push(v.image_url);

  if (Array.isArray(v?.media)) {
    v.media.forEach((m) => arr.push(m?.url, m?.original_url, m?.path, m?.file));
  }

  if (Array.isArray(v?.raw?.images)) arr.push(...v.raw.images);
  if (v?.raw?.image_url) arr.push(v.raw.image_url);

  if (Array.isArray(v?.raw?.media)) {
    v.raw.media.forEach((m) =>
      arr.push(m?.url, m?.original_url, m?.path, m?.file)
    );
  }

  const cleaned = arr
    .filter(Boolean)
    .map((x) => String(x).trim())
    .filter(Boolean);

  return Array.from(new Set(cleaned));
}

function getVehicleName(v) {
  return (
    v?.display_name ||
    v?.name ||
    `${v?.year || ""} ${v?.make || ""} ${v?.model || ""}`.trim() ||
    "Vehicle"
  );
}

export default function VehicleDetailModal({
  vehicle,
  onClose,
  onSelectCar,
  tab,
  setTab,
  imageIdx,
  setImageIdx,
}) {
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  const name = getVehicleName(vehicle);

  const images = useMemo(() => {
    const raw = getAllImagesRaw(vehicle);
    const resolved = raw.map(resolveImageUrl).filter(Boolean);
    return resolved.length ? resolved : [FALLBACK_IMG];
  }, [vehicle]);

  const safeIdx = Math.min(Math.max(imageIdx || 0, 0), images.length - 1);
  const activeImage = images[safeIdx] || images[0];

  const base = (Number(vehicle?.pricePerDay) || 0) * RENTER_DAYS;
  const insurance = (Number(vehicle?.insurancePerDay) || 0) * RENTER_DAYS;
  const serviceFee = Math.round(base * 0.1);
  const total = base + insurance + serviceFee;

  function handlePrev() {
    setImageIdx((idx) => (idx - 1 + images.length) % images.length);
  }
  function handleNext() {
    setImageIdx((idx) => (idx + 1) % images.length);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-2 sm:p-4">
      {/* ✅ FIXED HEIGHT (NO SCROLL) */}
      <div className="relative w-full max-w-6xl h-[86vh] overflow-hidden rounded-3xl bg-slate-50 shadow-2xl shadow-slate-900/40 border border-slate-200">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200">
          <h2 className="text-sm font-semibold text-slate-900">
            Vehicle Information
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 hover:bg-slate-50"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        {/* ✅ Content area fits inside modal */}
        <div className="h-[calc(86vh-52px)] p-3 sm:p-4">
          <div className="grid h-full gap-4 lg:grid-cols-[minmax(0,2fr),minmax(0,1.1fr)]">
            {/* LEFT */}
            <div className="rounded-2xl bg-white p-3 sm:p-4 shadow-sm shadow-slate-900/10 border border-slate-200 overflow-hidden">
              {/* ✅ Image (NOT CUT) */}
              <div className="mb-2">
                <div className="relative overflow-hidden rounded-2xl bg-white border border-slate-200">
                  <div className="w-full h-[160px] sm:h-[200px] lg:h-[220px]">
                    <img
                      src={activeImage}
                      alt={name}
                      className="h-full w-full object-contain p-2"
                      onError={(e) => {
                        e.currentTarget.src = FALLBACK_IMG;
                      }}
                    />
                  </div>

                  {images.length > 1 && (
                    <>
                      <button
                        type="button"
                        onClick={handlePrev}
                        className="absolute left-3 top-1/2 -translate-y-1/2 rounded-full bg-slate-900/70 px-2 py-1 text-xs text-white hover:bg-slate-900/90"
                      >
                        ‹
                      </button>
                      <button
                        type="button"
                        onClick={handleNext}
                        className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full bg-slate-900/70 px-2 py-1 text-xs text-white hover:bg-slate-900/90"
                      >
                        ›
                      </button>
                    </>
                  )}
                </div>

                {/* ✅ Thumbnails (NOT CUT) */}
                {images.length > 1 && (
                  <div className="mt-2 flex gap-2 overflow-x-auto pb-1">
                    {images.map((img, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => setImageIdx(i)}
                        className={`h-12 w-16 flex-shrink-0 overflow-hidden rounded-xl border transition bg-white ${
                          i === safeIdx
                            ? "border-emerald-500 ring-2 ring-emerald-200"
                            : "border-slate-200 hover:border-slate-300"
                        }`}
                      >
                        <img
                          src={img}
                          alt={`thumb-${i}`}
                          className="h-full w-full object-contain p-1"
                          onError={(e) => {
                            e.currentTarget.src = FALLBACK_IMG;
                          }}
                        />
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Title + rating */}
              <div className="mb-2 flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-sm sm:text-base font-semibold text-slate-900 truncate">
                    {name}
                  </p>
                  <div className="mt-1 flex items-center gap-2">
                    <RatingStars value={vehicle?.rating || 0} />
                    <span className="text-[11px] text-slate-500">
                      ({vehicle?.trips || 0} trips)
                    </span>
                  </div>
                </div>

                {vehicle?.aiRecommended && (
                  <span className="shrink-0 inline-flex items-center rounded-full bg-emerald-50 px-3 py-1 text-[11px] font-semibold text-emerald-700">
                    AI Recommended
                  </span>
                )}
              </div>

              {/* Chips (compact) */}
              <div className="mb-2 flex flex-wrap gap-2 text-[11px] text-slate-600">
                <span className="rounded-full bg-slate-50 px-3 py-1">
                  🚘 {vehicle?.seats || "-"} Seats
                </span>
                <span className="rounded-full bg-slate-50 px-3 py-1">
                  ⚙️ {vehicle?.transmission || "-"}
                </span>
                <span className="rounded-full bg-slate-50 px-3 py-1">
                  🔋 {vehicle?.fuel || "-"}
                </span>
              </div>

              {/* Tabs */}
              <div className="mb-2 border-b border-slate-200">
                <div className="flex gap-4 text-xs">
                  {["overview", "specs", "reviews"].map((key) => {
                    const label =
                      key === "overview"
                        ? "Overview"
                        : key === "specs"
                        ? "Specs"
                        : "Reviews";
                    const active = tab === key;

                    return (
                      <button
                        key={key}
                        type="button"
                        onClick={() => setTab(key)}
                        className={`relative pb-2 font-medium ${
                          active
                            ? "text-slate-900"
                            : "text-slate-500 hover:text-slate-800"
                        }`}
                      >
                        {label}
                        {active && (
                          <span className="absolute inset-x-0 bottom-0 h-0.5 rounded-full bg-emerald-500" />
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Tab content (compact) */}
              <div className="text-xs text-slate-600 space-y-1">
                {tab === "overview" && (
                  <>
                    <p>Perfect for city trips and airport transfers with comfort.</p>
                    <p>
                      Ideal for{" "}
                      <span className="font-semibold">
                        {vehicle?.type || "Car"} trips with up to{" "}
                        {vehicle?.seats || "-"} passengers
                      </span>
                      .
                    </p>
                  </>
                )}

                {tab === "specs" && (
                  <ul className="space-y-1">
                    <li>
                      • Transmission:{" "}
                      <span className="font-medium">{vehicle?.transmission || "-"}</span>
                    </li>
                    <li>
                      • Fuel:{" "}
                      <span className="font-medium">{vehicle?.fuel || "-"}</span>
                    </li>
                    <li>• Seats: {vehicle?.seats || "-"}</li>
                    <li>• Included mileage: 250 km / day</li>
                  </ul>
                )}

                {tab === "reviews" && (
                  <div className="space-y-1">
                    <p>“Very smooth ride and professional driver.”</p>
                    <p>“Clean interior, easy pickup and drop-off.”</p>
                  </div>
                )}
              </div>
            </div>

            {/* RIGHT */}
            <div className="space-y-3 h-full">
              {/* Other options */}
              <div className="rounded-2xl bg-white p-3 shadow-sm shadow-slate-900/10 border border-slate-200">
                <div className="mb-2 text-xs font-semibold text-slate-900">
                  Other Options
                </div>

                <div className="space-y-2">
                  {VEHICLES.filter((v) => v.id !== vehicle?.id)
                    .slice(0, 2)
                    .map((v) => {
                      const imgRaw =
                        (Array.isArray(v?.images) && v.images?.[0]) ||
                        v?.image_url ||
                        "";
                      const img = resolveImageUrl(imgRaw) || FALLBACK_IMG;

                      return (
                        <div
                          key={v.id}
                          className="flex items-center gap-2 rounded-xl bg-slate-50 p-2"
                        >
                          <div className="h-10 w-14 overflow-hidden rounded-lg bg-white border border-slate-200">
                            <img
                              src={img}
                              alt={v.name}
                              className="h-full w-full object-contain p-1"
                              onError={(e) => (e.currentTarget.src = FALLBACK_IMG)}
                            />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="truncate text-xs font-semibold text-slate-900">
                              {v.name}
                            </p>
                            <p className="text-[11px] text-slate-500">
                              ${v.pricePerDay} / day
                            </p>
                          </div>
                        </div>
                      );
                    })}
                </div>
              </div>

              {/* Price */}
              <div className="rounded-2xl bg-white p-3 shadow-sm shadow-slate-900/10 border border-slate-200">
                <h3 className="mb-2 text-xs font-semibold text-slate-900">
                  Total Estimated Price
                </h3>

                <div className="space-y-1 text-[11px] text-slate-600">
                  <div className="flex items-center justify-between">
                    <span>
                      Car ({RENTER_DAYS} days @ ${vehicle?.pricePerDay || 0}/day)
                    </span>
                    <span className="font-medium text-slate-800">${base}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Insurance (${vehicle?.insurancePerDay || 0}/day)</span>
                    <span className="font-medium text-slate-800">${insurance}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Service fee</span>
                    <span className="font-medium text-slate-800">${serviceFee}</span>
                  </div>

                  <div className="mt-2 flex items-center justify-between border-t border-slate-200 pt-2">
                    <span className="text-xs font-semibold text-slate-900">
                      Total
                    </span>
                    <span className="text-sm font-semibold text-slate-900">
                      ${total}
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => onSelectCar?.(vehicle)}
                  className="mt-3 inline-flex w-full items-center justify-center rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-md shadow-emerald-500/30 hover:bg-emerald-700"
                >
                  Select Car &amp; Choose Driver
                </button>
              </div>
            </div>
          </div>
        </div>
        {/* end content */}
      </div>
    </div>
  );
}