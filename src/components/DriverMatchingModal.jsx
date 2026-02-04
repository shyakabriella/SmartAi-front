// src/components/DriverMatchingModal.jsx
import { useMemo, useState, useEffect } from "react";
import { api } from "../lib/api";
import { DRIVERS as DEMO_DRIVERS, RENTER_DAYS } from "./demoBookingData";
import RatingStars from "./RatingStars";

/* ✅ backend origin */
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

function resolveImageUrl(u) {
  if (!u) return "";
  const s = String(u).trim();
  if (/^https?:\/\//i.test(s)) return s;
  const clean = normalizeRelativePath(s);
  return API_ORIGIN ? `${API_ORIGIN}${clean}` : clean;
}

function getVehicleName(v) {
  return (
    v?.display_name ||
    v?.name ||
    `${v?.year || ""} ${v?.make || ""} ${v?.model || ""}`.trim() ||
    "Vehicle"
  );
}

/* ✅ convert many API shapes into array */
function toList(input) {
  if (!input) return [];
  if (Array.isArray(input)) return input;

  const payload = input?.data ?? input;

  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.data?.data)) return payload.data.data;

  if (Array.isArray(payload?.drivers)) return payload.drivers;

  return [];
}

function normalizeDriver(d) {
  if (!d) return null;

  const name =
    d?.user?.name ||
    d?.name ||
    d?.full_name ||
    d?.user_name ||
    d?.username ||
    "Driver";

  const avatarRaw = d?.profile_image_url || d?.profile_image || d?.avatar || "";

  const rating =
    d?.rating != null
      ? Number(d.rating)
      : d?.rating_avg != null
      ? Number(d.rating_avg)
      : 0;

  const trips =
    d?.trips != null
      ? Number(d.trips)
      : d?.rating_count != null
      ? Number(d.rating_count)
      : 0;

  const experienceYears =
    d?.experienceYears != null
      ? Number(d.experienceYears)
      : d?.experience_years != null
      ? Number(d.experience_years)
      : 0;

  const dist = d?.distance_km != null ? Number(d.distance_km) : null;

  // distance -> score (fallback)
  const matchScore =
    d?.matchScore != null
      ? Number(d.matchScore)
      : d?.match_score != null
      ? Number(d.match_score)
      : dist == null
      ? 80
      : Math.max(50, Math.min(99, Math.round(100 - dist * 6)));

  return {
    id: d?.id,
    name,
    avatar: avatarRaw ? resolveImageUrl(avatarRaw) : "",
    rating,
    trips,
    experienceYears,
    matchScore,
    distance_km: dist,
    raw: d,
  };
}

export default function DriverMatchingModal({
  vehicle,
  onClose,
  onComplete,
  drivers: driversProp,
  radiusKm = 10,
}) {
  // ✅ NEW: booking mode
  const [withDriver, setWithDriver] = useState(true);

  const [liveDrivers, setLiveDrivers] = useState([]);
  const [loadingDrivers, setLoadingDrivers] = useState(false);
  const [driversErr, setDriversErr] = useState("");

  const passedDrivers = useMemo(() => {
    const arr = toList(driversProp);
    return arr.map(normalizeDriver).filter(Boolean);
  }, [driversProp]);

  // ✅ fetch drivers ONLY when withDriver=true
  useEffect(() => {
    let cancelled = false;

    // if drive-yourself, clear drivers + stop
    if (!withDriver) {
      setLiveDrivers([]);
      setDriversErr("");
      setLoadingDrivers(false);
      return;
    }

    // if parent passed drivers, use them
    if (passedDrivers.length > 0) {
      setLiveDrivers(passedDrivers);
      return;
    }

    // else fetch by GPS
    if (!navigator.geolocation) {
      setLiveDrivers([]);
      return;
    }

    setLoadingDrivers(true);
    setDriversErr("");

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const lat = pos.coords.latitude;
          const lng = pos.coords.longitude;
          const r = Math.max(1, Number(radiusKm) || 10);

          const res = await api(
            `/public/nearby/drivers?lat=${lat}&lng=${lng}&radius=${r}&only_available=1`
          );

          const arr = toList(res).map(normalizeDriver).filter(Boolean);
          if (!cancelled) setLiveDrivers(arr);
        } catch (e) {
          if (!cancelled) {
            setDriversErr(e?.message || "Failed to load drivers.");
            setLiveDrivers([]);
          }
        } finally {
          if (!cancelled) setLoadingDrivers(false);
        }
      },
      () => {
        if (!cancelled) {
          setDriversErr("GPS permission denied. Can't load drivers.");
          setLiveDrivers([]);
          setLoadingDrivers(false);
        }
      },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 0 }
    );

    return () => {
      cancelled = true;
    };
  }, [passedDrivers, radiusKm, withDriver]);

  const drivers = liveDrivers;

  const [selectedDriverId, setSelectedDriverId] = useState(null);
  const [profileDriver, setProfileDriver] = useState(null);

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => (document.body.style.overflow = prev);
  }, []);

  // ✅ auto-select first driver when list changes (only if withDriver)
  useEffect(() => {
    if (!withDriver) {
      setSelectedDriverId(null);
      return;
    }
    if (!drivers?.length) {
      setSelectedDriverId(null);
      return;
    }
    const exists = drivers.some((d) => d?.id === selectedDriverId);
    if (!selectedDriverId || !exists) setSelectedDriverId(drivers[0]?.id ?? null);
  }, [drivers, selectedDriverId, withDriver]);

  const selectedDriver = useMemo(
    () => drivers.find((d) => d?.id === selectedDriverId) || null,
    [drivers, selectedDriverId]
  );

  const base = (Number(vehicle?.pricePerDay) || 0) * RENTER_DAYS;
  const insurance = (Number(vehicle?.insurancePerDay) || 0) * RENTER_DAYS;
  const serviceFee = Math.round(base * 0.1);

  // ✅ optional: add driver fee only when withDriver
  const driverFee = withDriver ? Math.round((Number(vehicle?.driverFeePerDay) || 2) * RENTER_DAYS) : 0;

  const total = base + insurance + serviceFee + driverFee;

  const vehicleName = getVehicleName(vehicle);

  function handleContinue() {
    // ✅ if drive yourself: no driver required
    if (!withDriver) {
      onComplete?.(vehicle, null, { withDriver: false, total });
      return;
    }

    // ✅ if with driver: must select one
    if (!selectedDriver) return;
    onComplete?.(vehicle, selectedDriver, { withDriver: true, total });
  }

  const hasDrivers = drivers.length > 0;
  const canContinue = withDriver ? !!selectedDriver : true;

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-2 sm:p-4">
        <div className="relative w-full max-w-5xl h-[86vh] overflow-hidden rounded-3xl bg-slate-50 shadow-2xl border border-slate-200">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 bg-slate-50/90 backdrop-blur">
            <h2 className="text-sm font-semibold text-slate-900">
              AI Driver Matching
            </h2>
            <button
              type="button"
              onClick={onClose}
              className="flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 hover:bg-slate-50"
            >
              ✕
            </button>
          </div>

          <div className="h-[calc(86vh-52px)] p-3 sm:p-4">
            <div className="grid h-full gap-4 lg:grid-cols-[minmax(0,1.1fr),minmax(0,1.4fr)]">
              {/* LEFT */}
              <div className="space-y-3 overflow-hidden">
                {/* Trip summary */}
                <div className="rounded-2xl bg-white p-3 shadow-sm border border-slate-200">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-slate-700 mb-1">
                        Your Trip Summary
                      </p>
                      <p className="text-sm font-semibold text-slate-900 truncate">
                        {vehicleName}
                      </p>
                      <div className="mt-2 text-[11px] text-slate-600">
                        <span className="font-semibold">Total:</span>{" "}
                        <span className="font-semibold text-slate-900">${total}</span>
                      </div>
                    </div>

                    {/* ✅ NEW: Drive yourself toggle */}
                    <div className="shrink-0">
                      <div className="inline-flex rounded-xl border border-slate-200 bg-white p-1">
                        <button
                          type="button"
                          onClick={() => setWithDriver(true)}
                          className={`px-3 py-1.5 text-[11px] font-semibold rounded-lg transition ${
                            withDriver
                              ? "bg-emerald-600 text-white"
                              : "text-slate-600 hover:bg-slate-50"
                          }`}
                        >
                          With Driver
                        </button>
                        <button
                          type="button"
                          onClick={() => setWithDriver(false)}
                          className={`px-3 py-1.5 text-[11px] font-semibold rounded-lg transition ${
                            !withDriver
                              ? "bg-slate-900 text-white"
                              : "text-slate-600 hover:bg-slate-50"
                          }`}
                        >
                          Drive Yourself
                        </button>
                      </div>
                    </div>
                  </div>

                  {!withDriver && (
                    <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-[11px] text-slate-600">
                      ✅ You selected <span className="font-semibold">Drive Yourself</span>. No driver will be assigned.
                    </div>
                  )}
                </div>

                {/* Available Drivers (only show if withDriver) */}
                {withDriver && (
                  <div className="rounded-2xl bg-white p-3 shadow-sm border border-slate-200">
                    <div className="mb-2 flex items-center justify-between">
                      <p className="text-xs font-semibold text-slate-700">
                        Available Drivers
                      </p>
                      <p className="text-[11px] text-slate-500">
                        {drivers.length} found
                      </p>
                    </div>

                    {loadingDrivers && (
                      <div className="text-[11px] text-slate-500">
                        Loading drivers…
                      </div>
                    )}

                    {driversErr && (
                      <div className="mt-2 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-[11px] text-rose-700">
                        {driversErr}
                      </div>
                    )}

                    {!hasDrivers ? (
                      <div className="mt-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-[11px] text-slate-600">
                        No drivers found for this location.
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {drivers.slice(0, 3).map((d) => {
                          const active = d.id === selectedDriverId;
                          return (
                            <button
                              key={d.id}
                              type="button"
                              onClick={() => setSelectedDriverId(d.id)}
                              className={`flex w-full items-center justify-between gap-3 rounded-xl border px-3 py-2 text-left transition ${
                                active
                                  ? "border-emerald-500/70 bg-emerald-50/60"
                                  : "border-slate-200 bg-white hover:border-emerald-400/60 hover:bg-emerald-50/30"
                              }`}
                            >
                              <div className="flex items-center gap-3 min-w-0">
                                <div className="h-10 w-10 overflow-hidden rounded-full bg-slate-200">
                                  <img
                                    src={d.avatar || FALLBACK_AVATAR}
                                    alt={d.name}
                                    className="h-full w-full object-cover"
                                    onError={(e) =>
                                      (e.currentTarget.src = FALLBACK_AVATAR)
                                    }
                                  />
                                </div>
                                <div className="min-w-0">
                                  <p className="text-xs font-semibold text-slate-900 truncate">
                                    {d.name}
                                  </p>
                                  <div className="text-[11px] text-slate-500">
                                    {d.distance_km != null
                                      ? `${d.distance_km.toFixed(1)} km away`
                                      : "Nearby"}
                                  </div>
                                </div>
                              </div>
                              <span className="rounded-full bg-emerald-50 px-3 py-1 text-[11px] font-semibold text-emerald-700">
                                {d.matchScore}%
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}

                {/* Selected driver summary (only if withDriver) */}
                {withDriver && (
                  <div className="rounded-2xl bg-white p-3 shadow-sm border border-slate-200">
                    <p className="text-xs font-semibold text-slate-700 mb-2">
                      Selected Driver
                    </p>

                    {selectedDriver ? (
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 overflow-hidden rounded-full bg-slate-200">
                          <img
                            src={selectedDriver.avatar || FALLBACK_AVATAR}
                            alt={selectedDriver.name}
                            className="h-full w-full object-cover"
                            onError={(e) =>
                              (e.currentTarget.src = FALLBACK_AVATAR)
                            }
                          />
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-semibold text-slate-900 truncate">
                            {selectedDriver.name}
                          </p>
                          <div className="flex items-center gap-1">
                            <RatingStars value={selectedDriver.rating || 0} />
                            <span className="text-[11px] text-slate-500">
                              ({selectedDriver.trips || 0})
                            </span>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <p className="text-[11px] text-slate-500">
                        No driver selected.
                      </p>
                    )}
                  </div>
                )}
              </div>

              {/* RIGHT (only meaningful when withDriver) */}
              <div className="flex flex-col gap-3 overflow-hidden">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold text-slate-800">
                    Recommended Drivers
                  </p>
                  <p className="text-[11px] text-slate-500">
                    Ranked by match score
                  </p>
                </div>

                <div className="space-y-2 max-h-[52vh] overflow-y-auto pr-1">
                  {!withDriver ? (
                    <div className="rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-600">
                      You chose <span className="font-semibold">Drive Yourself</span>.
                      No driver list is needed ✅
                    </div>
                  ) : !hasDrivers ? (
                    <div className="rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-600">
                      No drivers available.
                    </div>
                  ) : (
                    drivers.map((d) => {
                      const active = d.id === selectedDriverId;
                      return (
                        <button
                          key={d.id}
                          type="button"
                          onClick={() => setSelectedDriverId(d.id)}
                          className={`flex w-full items-center justify-between gap-3 rounded-2xl border px-3 py-2 text-left shadow-sm transition-all ${
                            active
                              ? "border-emerald-500/70 bg-emerald-50/60"
                              : "border-slate-200 bg-white hover:border-emerald-400/60 hover:bg-emerald-50/30"
                          }`}
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="h-12 w-12 overflow-hidden rounded-full bg-slate-200">
                              <img
                                src={d.avatar || FALLBACK_AVATAR}
                                alt={d.name}
                                className="h-full w-full object-cover"
                                onError={(e) =>
                                  (e.currentTarget.src = FALLBACK_AVATAR)
                                }
                              />
                            </div>
                            <div className="min-w-0">
                              <p className="text-sm font-semibold text-slate-900 truncate">
                                {d.name}
                              </p>
                              <p className="text-[11px] text-slate-500">
                                {d.distance_km != null
                                  ? `${d.distance_km.toFixed(1)} km away`
                                  : "Nearby"}
                              </p>
                            </div>
                          </div>

                          <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
                            {d.matchScore}%
                          </span>
                        </button>
                      );
                    })
                  )}
                </div>

                <button
                  type="button"
                  disabled={!canContinue}
                  onClick={handleContinue}
                  className={`inline-flex w-full items-center justify-center rounded-lg px-4 py-2 text-sm font-semibold shadow-md ${
                    canContinue
                      ? "bg-emerald-600 text-white hover:bg-emerald-700"
                      : "bg-slate-300 text-slate-600 cursor-not-allowed"
                  }`}
                >
                  {withDriver ? "Continue with Selected Driver" : "Continue (Drive Yourself)"}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
