// src/components/DriverMatchingModal.jsx
import { useMemo, useState, useEffect } from "react";
import RatingStars from "./RatingStars";

/* ✅ backend origin (same logic as VehicleGrid) */
const API_BASE =
  import.meta.env.VITE_API_BASE_URL ||
  import.meta.env.VITE_API_URL ||
  import.meta.env.VITE_API ||
  "";
const API_ORIGIN = (() => {
  try {
    return API_BASE ? new URL(API_BASE).origin : "";
  } catch {
    return "";
  }
})();

/* ✅ fallback avatar */
const FALLBACK_AVATAR =
  "data:image/svg+xml;charset=UTF-8," +
  encodeURIComponent(`
  <svg xmlns="http://www.w3.org/2000/svg" width="200" height="200">
    <rect width="100%" height="100%" fill="#e2e8f0"/>
    <text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle"
      font-family="Arial" font-size="18" fill="#475569">
      Driver
    </text>
  </svg>`);

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

/* ✅ Resolve url */
function resolveImageUrl(u) {
  if (!u) return "";
  const s = String(u).trim();

  if (/^https?:\/\//i.test(s)) return s;

  const clean = normalizeRelativePath(s);
  if (!API_ORIGIN) return clean;
  return `${API_ORIGIN}${clean}`;
}

function getVehicleName(v) {
  return (
    v?.display_name ||
    v?.name ||
    `${v?.year || ""} ${v?.make || ""} ${v?.model || ""}`.trim() ||
    "Vehicle"
  );
}

/**
 * ✅ Normalize driver shape from backend (nearby/drivers)
 * Your API can return:
 * - { id, user: { name }, profile_image_url, experience_years, distance_km, ... }
 * - or { id, name, avatar, ... }
 */
function normalizeDriver(d) {
  if (!d) return null;

  const id = d?.id ?? d?.driver_id ?? d?.user_id ?? Math.random().toString(36);

  const name =
    d?.user?.name ||
    d?.name ||
    d?.full_name ||
    d?.user_name ||
    "Driver";

  const avatar =
    resolveImageUrl(d?.profile_image_url || d?.profile_image || d?.avatar) ||
    FALLBACK_AVATAR;

  const experienceYears =
    Number(d?.experience_years ?? d?.experienceYears ?? 0) || 0;

  const distanceKm =
    d?.distance_km != null ? Number(d.distance_km) : null;

  // ✅ If your API doesn't send matchScore, compute a simple one from distance
  // closer => higher score (max 98, min 55)
  const computedScore =
    distanceKm == null
      ? 80
      : Math.max(55, Math.min(98, Math.round(98 - distanceKm * 3)));

  const matchScore = Number(d?.matchScore ?? d?.match_score ?? computedScore);

  // rating/trips/languages may not exist in backend yet
  const rating = Number(d?.rating ?? 0) || 0;
  const trips = Number(d?.trips ?? d?.total_trips ?? 0) || 0;

  const languages = Array.isArray(d?.languages)
    ? d.languages
    : Array.isArray(d?.user?.languages)
    ? d.user.languages
    : [];

  return {
    raw: d,
    id,
    name,
    avatar,
    experienceYears,
    distanceKm,
    matchScore,
    rating,
    trips,
    languages,
  };
}

export default function DriverMatchingModal({
  vehicle,
  drivers = [], // ✅ real drivers passed from ImageOnlyWelcome
  onClose,
  onComplete,
}) {
  const normalizedDrivers = useMemo(() => {
    const list = Array.isArray(drivers) ? drivers : [];
    return list.map(normalizeDriver).filter(Boolean);
  }, [drivers]);

  const [selectedDriverId, setSelectedDriverId] = useState(null);
  const [profileDriver, setProfileDriver] = useState(null);

  // ✅ Prevent background scroll
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => (document.body.style.overflow = prev);
  }, []);

  // ✅ Auto-select first driver if available
  useEffect(() => {
    if (!normalizedDrivers.length) {
      setSelectedDriverId(null);
      return;
    }
    const exists = normalizedDrivers.some((d) => d.id === selectedDriverId);
    if (!selectedDriverId || !exists) {
      setSelectedDriverId(normalizedDrivers[0].id);
    }
  }, [normalizedDrivers, selectedDriverId]);

  const selectedDriver = useMemo(
    () => normalizedDrivers.find((d) => d.id === selectedDriverId) || null,
    [normalizedDrivers, selectedDriverId]
  );

  const vehicleName = getVehicleName(vehicle);

  function handleContinue() {
    if (!selectedDriver) return;

    // ✅ return original driver shape as well (selectedDriver.raw)
    onComplete?.(vehicle, selectedDriver.raw, {
      withDriver: true,
      selectedDriverNormalized: selectedDriver,
    });
  }

  const hasDrivers = normalizedDrivers.length > 0;

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-2 sm:p-4">
        <div className="relative w-full max-w-5xl h-[86vh] overflow-hidden rounded-3xl bg-slate-50 shadow-2xl shadow-slate-900/40 border border-slate-200">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 bg-slate-50/90 backdrop-blur">
            <h2 className="text-sm font-semibold text-slate-900">
              AI Driver Matching
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

          {/* Content */}
          <div className="h-[calc(86vh-52px)] p-3 sm:p-4">
            <div className="grid h-full gap-4 lg:grid-cols-[minmax(0,1.1fr),minmax(0,1.4fr)]">
              {/* LEFT */}
              <div className="space-y-3 overflow-hidden">
                {/* Selected car */}
                <div className="rounded-2xl bg-white p-3 shadow-sm shadow-slate-900/10 border border-slate-200">
                  <p className="text-xs font-semibold text-slate-700 mb-2">
                    Selected Vehicle
                  </p>
                  <p className="text-sm font-semibold text-slate-900 truncate">
                    {vehicleName}
                  </p>
                </div>

                {/* Selected driver summary */}
                <div className="rounded-2xl bg-white p-3 shadow-sm shadow-slate-900/10 border border-slate-200">
                  <div className="mb-2 flex items-center justify-between">
                    <p className="text-xs font-semibold text-slate-700">
                      Selected Driver
                    </p>

                    {selectedDriver && (
                      <button
                        type="button"
                        onClick={() => setProfileDriver(selectedDriver)}
                        className="text-[11px] font-medium text-emerald-600 hover:text-emerald-700"
                      >
                        View Profile
                      </button>
                    )}
                  </div>

                  {selectedDriver ? (
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 overflow-hidden rounded-full bg-slate-200">
                        <img
                          src={selectedDriver.avatar || FALLBACK_AVATAR}
                          alt={selectedDriver.name}
                          className="h-full w-full object-cover"
                          onError={(e) => (e.currentTarget.src = FALLBACK_AVATAR)}
                        />
                      </div>

                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-slate-900 truncate">
                          {selectedDriver.name}
                        </p>
                        <p className="text-[11px] text-slate-500 truncate">
                          {selectedDriver.distanceKm != null
                            ? `${selectedDriver.distanceKm.toFixed(1)} km away`
                            : "Nearby"}{" "}
                          • {selectedDriver.experienceYears} years
                        </p>
                      </div>

                      <span className="rounded-full bg-emerald-50 px-3 py-1 text-[11px] font-semibold text-emerald-700">
                        {selectedDriver.matchScore}%
                      </span>
                    </div>
                  ) : (
                    <p className="text-[11px] text-slate-500">
                      No driver selected. {hasDrivers ? "" : "(No drivers found)"}
                    </p>
                  )}
                </div>
              </div>

              {/* RIGHT */}
              <div className="flex flex-col gap-3 overflow-hidden">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold text-slate-800">
                    Recommended Drivers
                  </p>
                  <p className="text-[11px] text-slate-500">
                    {normalizedDrivers.length} found
                  </p>
                </div>

                <div className="space-y-2 max-h-[56vh] overflow-y-auto pr-1">
                  {!hasDrivers ? (
                    <div className="rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-600">
                      No drivers available.
                    </div>
                  ) : (
                    normalizedDrivers.map((d) => {
                      const active = d.id === selectedDriverId;
                      return (
                        <button
                          key={d.id}
                          type="button"
                          onClick={() => setSelectedDriverId(d.id)}
                          className={`flex w-full items-center justify-between gap-3 rounded-2xl border px-3 py-2 text-left shadow-sm transition-all ${
                            active
                              ? "border-emerald-500/70 bg-emerald-50/60 shadow-emerald-200"
                              : "border-slate-200 bg-white hover:border-emerald-400/60 hover:bg-emerald-50/30"
                          }`}
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="h-12 w-12 overflow-hidden rounded-full bg-slate-200">
                              <img
                                src={d.avatar || FALLBACK_AVATAR}
                                alt={d.name}
                                className="h-full w-full object-cover"
                                onError={(e) => (e.currentTarget.src = FALLBACK_AVATAR)}
                              />
                            </div>

                            <div className="min-w-0">
                              <p className="text-sm font-semibold text-slate-900 truncate">
                                {d.name}
                              </p>

                              <div className="flex items-center gap-1">
                                <RatingStars value={d.rating || 0} />
                                <span className="text-[11px] text-slate-500">
                                  ({d.trips || 0} trips)
                                </span>
                              </div>

                              <p className="text-[11px] text-slate-500 truncate">
                                {d.distanceKm != null
                                  ? `${d.distanceKm.toFixed(1)} km away`
                                  : "Nearby"}{" "}
                                • {d.experienceYears} yrs
                              </p>
                            </div>
                          </div>

                          <div className="flex flex-col items-end gap-2">
                            <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
                              {d.matchScore}%
                            </span>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setProfileDriver(d);
                              }}
                              className="text-[11px] font-medium text-emerald-600 hover:text-emerald-700"
                            >
                              View Profile
                            </button>
                          </div>
                        </button>
                      );
                    })
                  )}
                </div>

                <div className="pt-1">
                  <button
                    type="button"
                    disabled={!selectedDriver}
                    onClick={handleContinue}
                    className={`inline-flex w-full items-center justify-center rounded-lg px-4 py-2 text-sm font-semibold shadow-md ${
                      selectedDriver
                        ? "bg-emerald-600 text-white shadow-emerald-500/30 hover:bg-emerald-700"
                        : "bg-slate-300 text-slate-600 cursor-not-allowed shadow-none"
                    }`}
                  >
                    Continue with Selected Driver
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Driver profile mini-modal */}
      {profileDriver && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/50 p-3">
          <div className="w-full max-w-sm rounded-2xl bg-white p-4 shadow-2xl shadow-slate-900/40">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-semibold text-slate-900">
                Driver Profile
              </p>
              <button
                type="button"
                onClick={() => setProfileDriver(null)}
                className="h-7 w-7 flex items-center justify-center rounded-full border border-slate-200 text-slate-500 hover:bg-slate-50 text-xs"
              >
                ✕
              </button>
            </div>

            <div className="flex items-center gap-3 mb-3">
              <div className="h-14 w-14 rounded-full overflow-hidden bg-slate-200">
                <img
                  src={profileDriver.avatar || FALLBACK_AVATAR}
                  alt={profileDriver.name}
                  className="h-full w-full object-cover"
                  onError={(e) => (e.currentTarget.src = FALLBACK_AVATAR)}
                />
              </div>

              <div className="min-w-0">
                <p className="text-sm font-semibold text-slate-900 truncate">
                  {profileDriver.name}
                </p>
                <div className="flex items-center gap-1">
                  <RatingStars value={profileDriver.rating || 0} />
                  <span className="text-[11px] text-slate-500">
                    ({profileDriver.trips || 0} trips)
                  </span>
                </div>
              </div>
            </div>

            <div className="space-y-1 text-[11px] text-slate-600 mb-3">
              <p>
                <span className="font-semibold">Distance:</span>{" "}
                {profileDriver.distanceKm != null
                  ? `${profileDriver.distanceKm.toFixed(1)} km`
                  : "Nearby"}
              </p>
              <p>
                <span className="font-semibold">Experience:</span>{" "}
                {profileDriver.experienceYears} years
              </p>
              <p>
                <span className="font-semibold">Match score:</span>{" "}
                {profileDriver.matchScore}%
              </p>
            </div>

            <p className="text-[11px] text-slate-500">
              SmartCar AI ranks drivers based on distance, experience and availability.
            </p>
          </div>
        </div>
      )}
    </>
  );
}