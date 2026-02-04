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
    <rect width="100%" height="100%" fill="#f1f5f9"/>
    <text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle"
      font-family="Arial" font-size="22" fill="#64748b">
      No image
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

  // remove domain if mistakenly included
  p = p.replace(/^https?:\/\/[^/]+/i, "");

  // laravel common variants → /storage/...
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

/* ✅ NEW: Showroom profile helpers */
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

/* ---------------- component ---------------- */
export default function VehicleGrid({
  vehicles = [],
  allCount = 0,
  onOpenVehicle,
}) {
  const showing = Array.isArray(vehicles) ? vehicles.length : 0;
  const total = allCount || showing;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-slate-900">
          Available Vehicles
        </h2>
        <p className="text-xs text-slate-500">
          Showing {showing} of {total} results
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
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
              className="group flex flex-col overflow-hidden rounded-2xl bg-white text-left shadow-sm shadow-slate-900/5 border border-slate-200 hover:-translate-y-1 hover:shadow-lg hover:shadow-emerald-500/10 transition-all"
            >
              <div className="relative h-40 w-full overflow-hidden bg-slate-100">
                <img
                  src={img || FALLBACK_IMG}
                  alt={name}
                  className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                  loading="lazy"
                  onError={(e) => {
                    e.currentTarget.src = FALLBACK_IMG;
                  }}
                />

                {isAiRecommended && (
                  <span className="absolute left-2 top-2 rounded-full bg-emerald-600/90 px-2.5 py-0.5 text-[11px] font-semibold text-white shadow-sm">
                    AI Recommended
                  </span>
                )}

                {/* ✅ Showroom badge (from profile) */}
                {showroomName && (
                  <div className="absolute right-2 top-2 flex items-center gap-2 rounded-full bg-white/85 px-2.5 py-1 text-slate-900 shadow-sm">
                    {showroomLogo ? (
                      <img
                        src={showroomLogo}
                        alt={showroomName}
                        className="h-6 w-6 rounded-full object-cover ring-1 ring-slate-200"
                        loading="lazy"
                        onError={(e) => {
                          e.currentTarget.style.display = "none";
                        }}
                      />
                    ) : (
                      <div className="h-6 w-6 rounded-full bg-slate-200 grid place-items-center text-[10px] font-semibold">
                        🏢
                      </div>
                    )}
                    <span className="text-[11px] font-semibold truncate max-w-[160px]">
                      {showroomName}
                    </span>
                  </div>
                )}

                {/* ✅ Listed-by overlay chip */}
                {ownerName && (
                  <div className="absolute bottom-2 left-2 flex items-center gap-2 rounded-full bg-black/45 px-2.5 py-1 text-white">
                    {ownerAvatar ? (
                      <img
                        src={ownerAvatar}
                        alt={ownerName}
                        className="h-6 w-6 rounded-full object-cover ring-1 ring-white/20"
                        loading="lazy"
                        onError={(e) => {
                          e.currentTarget.style.display = "none";
                        }}
                      />
                    ) : (
                      <div className="h-6 w-6 rounded-full bg-white/20 grid place-items-center text-[10px] font-semibold">
                        {ownerInitials}
                      </div>
                    )}

                    <span className="text-[11px] font-medium truncate max-w-[190px]">
                      Listed by {ownerName}
                    </span>
                  </div>
                )}
              </div>

              <div className="flex flex-1 flex-col px-4 py-3 gap-1.5">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-slate-900 truncate">
                      {name}
                    </p>

                    <p className="text-[11px] text-slate-500 truncate">
                      {type}
                      {seats ? ` • ${seats} seats` : ""}
                    </p>

                    {/* ✅ Showroom info in details area */}
                    {showroomName && (
                      <p className="mt-1 text-[11px] text-slate-500 truncate">
                        Showroom:{" "}
                        <span className="text-slate-700 font-medium">
                          {showroomName}
                        </span>
                      </p>
                    )}

                    {ownerName && (
                      <p className="mt-1 text-[11px] text-slate-500 truncate">
                        Listed by:{" "}
                        <span className="text-slate-700">{ownerName}</span>
                      </p>
                    )}
                  </div>

                  <div className="text-right shrink-0">
                    <p className="text-sm font-semibold text-slate-900">
                      {formatRWF(price)}
                      <span className="text-[11px] font-normal text-slate-500">
                        {" "}
                        / day
                      </span>
                    </p>
                    <p className="text-[11px] text-emerald-600">View details</p>
                  </div>
                </div>

                <div className="mt-1 flex items-center justify-between">
                  {rating != null ? (
                    <RatingStars value={rating} />
                  ) : (
                    <p className="text-[11px] text-slate-400">No rating yet</p>
                  )}

                  {trips != null ? (
                    <p className="text-[11px] text-slate-500">{trips} trips</p>
                  ) : (
                    <p className="text-[11px] text-slate-400">—</p>
                  )}
                </div>
              </div>
            </button>
          );
        })}

        {showing === 0 && (
          <div className="col-span-full flex items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-white/60 py-10 text-sm text-slate-500">
            No vehicles match your filters. Try adjusting the price or car type.
          </div>
        )}
      </div>
    </div>
  );
}