// src/components/VehicleGrid.jsx
import RatingStars from "./RatingStars";

/* ✅ backend origin (works even if VITE_API_URL is /api or /api/v1) */
const API_BASE = import.meta.env.VITE_API_URL || "";
const API_ORIGIN = (() => {
  try {
    return API_BASE ? new URL(API_BASE).origin : "";
  } catch {
    return "";
  }
})();

/* ✅ Always show something if image fails */
const FALLBACK_IMG =
  "data:image/svg+xml;charset=UTF-8," +
  encodeURIComponent(`
  <svg xmlns="http://www.w3.org/2000/svg" width="900" height="500">
    <defs>
      <linearGradient id="g" x1="0" x2="1" y1="0" y2="1">
        <stop offset="0%" stop-color="#f8fafc"/>
        <stop offset="100%" stop-color="#e2e8f0"/>
      </linearGradient>
    </defs>
    <rect width="100%" height="100%" fill="url(#g)"/>
    <text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle"
      font-family="Arial" font-size="22" fill="#64748b">
      No image available
    </text>
  </svg>`);

/* ---------------- helpers ---------------- */
function formatRWF(n) {
  if (n == null || n === "") return "—";
  const num = Number(n);
  if (Number.isNaN(num)) return n;
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency: "RWF",
    maximumFractionDigits: 0,
  }).format(num);
}

/* ✅ Normalize laravel/storage paths to browser-friendly */
function normalizeRelativePath(u) {
  if (!u) return "";
  let p = String(u).trim();

  p = p.replace(/^https?:\/\/[^/]+/i, "");
  p = p.replace(/^\/?storage\/app\/public\//i, "/storage/");
  p = p.replace(/^\/?public\/storage\//i, "/storage/");
  p = p.replace(/^\/?public\//i, "/");

  if (!p.startsWith("/")) p = `/${p}`;
  return p;
}

/**
 * ✅ Resolve url:
 * - If absolute URL and contains /storage/... => force our API_ORIGIN + pathname
 * - If relative => API_ORIGIN + normalized path
 */
function resolveImageUrl(u) {
  if (!u) return "";

  const s = String(u).trim();

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

  const clean = normalizeRelativePath(s);
  if (!API_ORIGIN) return clean;
  return `${API_ORIGIN}${clean}`;
}

/* ✅ get first preview image from ANY possible shape */
function getPreviewRaw(v) {
  if (!v) return "";

  return (
    (Array.isArray(v?.images) && v.images?.[0]) ||
    v?.image_url ||
    v?.primary_image_url ||
    v?.primaryImageUrl ||
    (Array.isArray(v?.media) &&
      (v.media?.[0]?.url ||
        v.media?.[0]?.original_url ||
        v.media?.[0]?.path ||
        v.media?.[0]?.file)) ||
    (Array.isArray(v?.raw?.media) &&
      (v.raw.media?.[0]?.url ||
        v.raw.media?.[0]?.original_url ||
        v.raw.media?.[0]?.path ||
        v.raw.media?.[0]?.file)) ||
    v?.raw?.image_url ||
    v?.raw?.primary_image_url ||
    ""
  );
}

function getVehicleName(v) {
  return (
    v?.display_name ||
    v?.name ||
    `${v?.year || ""} ${v?.make || ""} ${v?.model || ""}`.trim() ||
    "Vehicle"
  );
}

function getVehicleType(v) {
  return (
    v?.type?.name ||
    v?.vehicle_type?.name ||
    v?.vehicleType?.name ||
    v?.type ||
    v?.vehicle_type ||
    v?.raw?.type?.name ||
    v?.raw?.vehicle_type?.name ||
    "Car"
  );
}

function getVehiclePricePerDay(v) {
  return (
    v?.base_daily_rate ??
    v?.price_per_day ??
    v?.pricePerDay ??
    v?.daily_rate ??
    v?.raw?.base_daily_rate ??
    v?.raw?.price_per_day ??
    null
  );
}

function getTripsCount(v) {
  return v?.trips ?? v?.total_trips ?? v?.bookings_count ?? null;
}

function getRatingValue(v) {
  return v?.rating ?? v?.avg_rating ?? null;
}

/* ✅ Owner/Listed-by helpers */
function getOwnerName(v) {
  return (
    v?.owner?.name ||
    v?.user?.name ||
    v?.host?.name ||
    v?.created_by?.name ||
    v?.owner_name ||
    v?.user_name ||
    v?.listed_by ||
    v?.lister_name ||
    null
  );
}

function getOwnerAvatarRaw(v) {
  return (
    v?.owner?.avatar_url ||
    v?.owner?.photo_url ||
    v?.user?.avatar_url ||
    v?.user?.photo_url ||
    v?.host?.avatar_url ||
    v?.owner_avatar ||
    v?.user_avatar ||
    null
  );
}

function getOwnerInitials(name) {
  if (!name) return "U";
  const parts = String(name).trim().split(" ").filter(Boolean);
  const a = parts?.[0]?.[0] || "U";
  const b = parts?.[1]?.[0] || "";
  return (a + b).toUpperCase();
}

/* ✅ Showroom profile helpers */
function getShowroomProfile(v) {
  return (
    v?.showroom_profile ||
    v?.showroomProfile ||
    v?.owner?.showroom_profile ||
    v?.owner?.showroomProfile ||
    v?.user?.showroom_profile ||
    v?.user?.showroomProfile ||
    v?.raw?.showroom_profile ||
    v?.raw?.owner?.showroom_profile ||
    null
  );
}

function getShowroomName(v) {
  const p = getShowroomProfile(v);
  return p?.name || p?.showroom_name || null;
}

function getShowroomLogoRaw(v) {
  const p = getShowroomProfile(v);
  return p?.logo_path || p?.logo_url || p?.logo || null;
}

/* ---------------- simple icons ---------------- */
function CarIcon({ className = "h-4 w-4" }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <path
        d="M5 16l1.4-4.2A2 2 0 0 1 8.3 10h7.4a2 2 0 0 1 1.9 1.4L19 16"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M4 16h16" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M6 16v2.2A1.8 1.8 0 0 0 7.8 20H8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M18 16v2.2A1.8 1.8 0 0 1 16.2 20H16" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <circle cx="7.5" cy="16.5" r="1" fill="currentColor" />
      <circle cx="16.5" cy="16.5" r="1" fill="currentColor" />
    </svg>
  );
}

function SeatIcon({ className = "h-4 w-4" }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <path d="M8 12V7.5A2.5 2.5 0 0 1 10.5 5h1A2.5 2.5 0 0 1 14 7.5V12" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M6 13h12v2.5A2.5 2.5 0 0 1 15.5 18h-7A2.5 2.5 0 0 1 6 15.5V13Z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M6 18v1.5M18 18v1.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

function TripsIcon({ className = "h-4 w-4" }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <path d="M4 7h16M7 4v6M17 4v6M5 10h14a1 1 0 0 1 1 1v6a3 3 0 0 1-3 3H7a3 3 0 0 1-3-3v-6a1 1 0 0 1 1-1Z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function MoneyIcon({ className = "h-4 w-4" }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <rect x="3" y="6" width="18" height="12" rx="2.5" stroke="currentColor" strokeWidth="1.8" />
      <circle cx="12" cy="12" r="2.5" stroke="currentColor" strokeWidth="1.8" />
      <path d="M7 10h.01M17 14h.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function BuildingIcon({ className = "h-4 w-4" }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <path d="M4 20h16M6 20V7a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v13M9 10h.01M12 10h.01M15 10h.01M9 13h.01M12 13h.01M15 13h.01" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

function UserIcon({ className = "h-4 w-4" }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <circle cx="12" cy="8" r="3.2" stroke="currentColor" strokeWidth="1.8" />
      <path d="M5.5 19a6.5 6.5 0 0 1 13 0" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

function SparkIcon({ className = "h-4 w-4" }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <path
        d="M12 3l1.6 4.4L18 9l-4.4 1.6L12 15l-1.6-4.4L6 9l4.4-1.6L12 3z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function EmptyIcon({ className = "h-8 w-8" }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <rect x="3" y="6" width="18" height="12" rx="2.5" stroke="currentColor" strokeWidth="1.8" />
      <path d="M7 10h10M7 14h6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

function MetaChip({ icon, children }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-medium text-slate-700">
      {icon}
      {children}
    </span>
  );
}

/* ---------------- component ---------------- */
export default function VehicleGrid({
  vehicles = [],
  allCount = 0,
  onOpenVehicle,
}) {
  const showing = Array.isArray(vehicles) ? vehicles.length : 0;
  const total = allCount || showing;

  return (
    <div className="space-y-5">
      <style>{`
        @keyframes fadeUpCard {
          from {
            opacity: 0;
            transform: translateY(18px) scale(.985);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }

        @keyframes aiPulse {
          0%, 100% {
            box-shadow: 0 0 0 0 rgba(16,185,129,.35);
          }
          50% {
            box-shadow: 0 0 0 8px rgba(16,185,129,0);
          }
        }

        @keyframes shineMove {
          0% { transform: translateX(-130%) skewX(-22deg); opacity: 0; }
          25% { opacity: .28; }
          100% { transform: translateX(230%) skewX(-22deg); opacity: 0; }
        }

        .vehicle-card-enter {
          animation: fadeUpCard .55s ease both;
        }

        .vehicle-card {
          position: relative;
          overflow: hidden;
          isolation: isolate;
        }

        .vehicle-card::before {
          content: "";
          position: absolute;
          inset: 0;
          background: linear-gradient(
            120deg,
            transparent 0%,
            rgba(255,255,255,.22) 45%,
            transparent 80%
          );
          transform: translateX(-130%) skewX(-22deg);
          transition: opacity .3s ease;
          opacity: 0;
          z-index: 2;
          pointer-events: none;
        }

        .vehicle-card:hover::before {
          animation: shineMove 1.15s ease;
          opacity: 1;
        }

        .ai-badge-pulse {
          animation: aiPulse 2.2s infinite;
        }
      `}</style>

      <div className="flex flex-col gap-3 rounded-3xl border border-slate-200 bg-white/90 p-4 shadow-sm shadow-slate-900/5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-slate-900">
            Available Vehicles
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Explore clean, modern listings with better details and smoother interactions.
          </p>
        </div>

        <div className="inline-flex items-center gap-2 self-start rounded-2xl bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-700 ring-1 ring-emerald-100">
          <CarIcon className="h-4 w-4" />
          Showing {showing} of {total} results
        </div>
      </div>

      <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
        {(vehicles || []).map((v, idx) => {
          const key = v?.id ?? v?.raw?.id ?? idx;

          const raw = getPreviewRaw(v);
          const img = resolveImageUrl(raw);

          const name = getVehicleName(v);
          const type = getVehicleType(v);
          const seats = v?.seats ?? v?.seat_count ?? null;

          const price = getVehiclePricePerDay(v);
          const rating = getRatingValue(v);
          const trips = getTripsCount(v);

          const ownerName = getOwnerName(v);
          const ownerAvatar = resolveImageUrl(getOwnerAvatarRaw(v));
          const ownerInitials = getOwnerInitials(ownerName);

          const showroomName = getShowroomName(v);
          const showroomLogo = resolveImageUrl(getShowroomLogoRaw(v));

          const isAiRecommended =
            v?.aiRecommended === true ||
            v?.ai_recommended === true ||
            v?.is_ai_recommended === true;

          return (
            <button
              key={key}
              type="button"
              onClick={() => onOpenVehicle?.(v)}
              className="vehicle-card vehicle-card-enter group flex flex-col rounded-[28px] border border-slate-200 bg-white text-left shadow-sm shadow-slate-900/5 transition duration-300 hover:-translate-y-1.5 hover:shadow-xl hover:shadow-emerald-500/10 focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
              style={{ animationDelay: `${idx * 70}ms` }}
            >
              <div className="relative h-52 w-full overflow-hidden rounded-t-[28px] bg-slate-100">
                <img
                  src={img || FALLBACK_IMG}
                  alt={name}
                  className="h-full w-full object-cover transition duration-500 group-hover:scale-110"
                  loading="lazy"
                  onError={(e) => {
                    e.currentTarget.src = FALLBACK_IMG;
                  }}
                />

                <div className="absolute inset-0 bg-gradient-to-t from-slate-950/70 via-slate-900/10 to-transparent" />

                {isAiRecommended && (
                  <span className="ai-badge-pulse absolute left-3 top-3 inline-flex items-center gap-1.5 rounded-full bg-emerald-600 px-3 py-1 text-[11px] font-semibold text-white shadow-lg">
                    <SparkIcon className="h-3.5 w-3.5" />
                    AI Recommended
                  </span>
                )}

                {showroomName && (
                  <div className="absolute right-3 top-3 flex max-w-[75%] items-center gap-2 rounded-full bg-white/90 px-2.5 py-1.5 text-slate-900 shadow-md backdrop-blur">
                    {showroomLogo ? (
                      <img
                        src={showroomLogo}
                        alt={showroomName}
                        className="h-7 w-7 rounded-full object-cover ring-1 ring-slate-200"
                        loading="lazy"
                        onError={(e) => {
                          e.currentTarget.style.display = "none";
                        }}
                      />
                    ) : (
                      <div className="grid h-7 w-7 place-items-center rounded-full bg-slate-200 text-slate-700">
                        <BuildingIcon className="h-3.5 w-3.5" />
                      </div>
                    )}

                    <span className="truncate text-[11px] font-semibold">
                      {showroomName}
                    </span>
                  </div>
                )}

                <div className="absolute bottom-3 left-3 right-3 flex items-end justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-lg font-bold text-white drop-shadow-sm">
                      {name}
                    </p>
                    <p className="mt-1 truncate text-xs text-white/85">
                      {type}
                      {seats ? ` • ${seats} seats` : ""}
                    </p>
                  </div>

                  <div className="shrink-0 rounded-2xl bg-white/92 px-3 py-2 text-right shadow-md backdrop-blur">
                    <p className="inline-flex items-center gap-1 text-sm font-bold text-slate-900">
                      <MoneyIcon className="h-4 w-4 text-emerald-600" />
                      {formatRWF(price)}
                    </p>
                    <p className="text-[11px] text-slate-500">per day</p>
                  </div>
                </div>
              </div>

              <div className="flex flex-1 flex-col gap-4 p-4">
                <div className="flex flex-wrap gap-2">
                  <MetaChip icon={<CarIcon className="h-3.5 w-3.5" />}>{type}</MetaChip>

                  {seats ? (
                    <MetaChip icon={<SeatIcon className="h-3.5 w-3.5" />}>
                      {seats} seats
                    </MetaChip>
                  ) : null}

                  {trips != null ? (
                    <MetaChip icon={<TripsIcon className="h-3.5 w-3.5" />}>
                      {trips} trips
                    </MetaChip>
                  ) : null}
                </div>

                <div className="grid gap-2 text-sm">
                  {showroomName && (
                    <div className="flex items-center gap-2 text-slate-600">
                      <BuildingIcon className="h-4 w-4 text-emerald-600" />
                      <span className="truncate">
                        Showroom:{" "}
                        <span className="font-semibold text-slate-800">{showroomName}</span>
                      </span>
                    </div>
                  )}

                  {ownerName && (
                    <div className="flex items-center gap-2 text-slate-600">
                      {ownerAvatar ? (
                        <img
                          src={ownerAvatar}
                          alt={ownerName}
                          className="h-6 w-6 rounded-full object-cover ring-1 ring-slate-200"
                          loading="lazy"
                          onError={(e) => {
                            e.currentTarget.style.display = "none";
                          }}
                        />
                      ) : (
                        <div className="grid h-6 w-6 place-items-center rounded-full bg-emerald-100 text-[10px] font-bold text-emerald-700">
                          {ownerInitials}
                        </div>
                      )}

                      <span className="truncate">
                        Listed by{" "}
                        <span className="font-semibold text-slate-800">{ownerName}</span>
                      </span>
                    </div>
                  )}
                </div>

                <div className="mt-auto flex items-center justify-between border-t border-slate-100 pt-3">
                  <div>
                    {rating != null ? (
                      <RatingStars value={rating} />
                    ) : (
                      <p className="text-xs text-slate-400">No rating yet</p>
                    )}
                  </div>

                  <span className="inline-flex items-center rounded-full bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white transition duration-300 group-hover:bg-emerald-600">
                    View details
                  </span>
                </div>
              </div>
            </button>
          );
        })}

        {showing === 0 && (
          <div className="col-span-full rounded-[28px] border border-dashed border-slate-300 bg-gradient-to-br from-white to-slate-50 p-10 text-center shadow-sm">
            <div className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-emerald-50 text-emerald-600 ring-1 ring-emerald-100">
              <EmptyIcon className="h-8 w-8" />
            </div>

            <h3 className="mt-4 text-lg font-semibold text-slate-900">
              No vehicles found
            </h3>

            <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">
              No vehicles match your current filters. Try changing the price range,
              vehicle type, or search options.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}