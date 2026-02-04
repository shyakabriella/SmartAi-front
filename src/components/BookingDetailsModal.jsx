// src/components/BookingDetailsModal.jsx
import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { RENTER_DAYS } from "./demoBookingData";

/* ✅ API origin for resolving /storage links */
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

/* ✅ Google Maps key (support multiple env names) */
const GMAPS_KEY =
  import.meta.env.VITE_GOOGLE_MAPS_KEY ||
  import.meta.env.VITE_GOOGLE_MAP_KEY ||
  import.meta.env.VITE_GOOGLE_MAPS_API_KEY ||
  "";

/* ✅ fallbacks */
const FALLBACK_CAR =
  "data:image/svg+xml;charset=UTF-8," +
  encodeURIComponent(`
  <svg xmlns="http://www.w3.org/2000/svg" width="900" height="500">
    <rect width="100%" height="100%" fill="#f1f5f9"/>
    <text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle"
      font-family="Arial" font-size="22" fill="#64748b">
      No car image
    </text>
  </svg>`);

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

/* ✅ Normalize laravel/storage paths */
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

/* ✅ Resolve image url (handles absolute storage paths too) */
function resolveImageUrl(u) {
  if (!u) return "";
  const s = String(u).trim();

  // absolute url
  if (/^https?:\/\//i.test(s)) {
    try {
      const url = new URL(s);
      const pathname = url.pathname || "";
      const isStorage =
        pathname.includes("/storage/") ||
        /^\/?storage\//i.test(pathname.replace(/^\//, ""));
      if (isStorage && API_ORIGIN) return `${API_ORIGIN}${pathname}`;
      return s;
    } catch {
      return s;
    }
  }

  // relative
  const clean = normalizeRelativePath(s);
  return API_ORIGIN ? `${API_ORIGIN}${clean}` : clean;
}

/* ✅ If image item is object or string, extract a usable string */
function pickMediaUrl(x) {
  if (!x) return "";
  if (typeof x === "string") return x;
  if (typeof x === "object") {
    return (
      x?.url ||
      x?.original_url ||
      x?.path ||
      x?.file ||
      x?.src ||
      x?.image ||
      ""
    );
  }
  return "";
}

/* ✅ Extract vehicle image from any backend shape (NOW supports object images) */
function getVehicleImageRaw(v) {
  if (!v) return "";

  const img0 = Array.isArray(v?.images) ? pickMediaUrl(v.images?.[0]) : "";
  const media0 = Array.isArray(v?.media) ? pickMediaUrl(v.media?.[0]) : "";

  const rawMedia0 = Array.isArray(v?.raw?.media)
    ? pickMediaUrl(v.raw.media?.[0])
    : "";

  const rawImg0 = Array.isArray(v?.raw?.images)
    ? pickMediaUrl(v.raw.images?.[0])
    : "";

  return (
    img0 ||
    v?.image_url ||
    v?.primary_image_url ||
    v?.primaryImageUrl ||
    media0 ||
    rawImg0 ||
    v?.raw?.image_url ||
    rawMedia0 ||
    ""
  );
}

/* ✅ Extract driver avatar from any backend shape */
function getDriverAvatarRaw(d) {
  if (!d) return "";
  return d?.avatar || d?.profile_image_url || d?.profile_image || d?.image_url || "";
}

/* ✅ Name helpers */
function vehicleName(v) {
  return (
    v?.name ||
    v?.display_name ||
    `${v?.year || ""} ${v?.make || ""} ${v?.model || ""}`.trim() ||
    "Vehicle"
  );
}
function driverName(d) {
  return d?.name || d?.user?.name || d?.full_name || "Driver";
}

/* ✅ Google map embed URL helper */
function mapEmbedUrl(q) {
  if (!GMAPS_KEY || !q) return "";
  return `https://www.google.com/maps/embed/v1/place?key=${encodeURIComponent(
    GMAPS_KEY
  )}&q=${encodeURIComponent(q)}`;
}

export default function BookingDetailsModal({ booking, onClose }) {
  const navigate = useNavigate();

  const { vehicle, driver, trip } = booking || {};

  const withDriver = !!driver; // ✅ drive yourself support

  const [pickup, setPickup] = useState(trip?.pickup || "");
  const [dropoff, setDropoff] = useState(trip?.dropoff || "");
  const [promo, setPromo] = useState("");

  // ✅ safer numbers (avoid NaN)
  const pricePerDay = Number(vehicle?.pricePerDay ?? vehicle?.base_daily_rate ?? 0);
  const insurancePerDay = Number(vehicle?.insurancePerDay ?? 0);

  const base = pricePerDay * RENTER_DAYS;
  const insurance = insurancePerDay * RENTER_DAYS;

  // ✅ charge driver fee only if driver exists
  const driverFeePerDay = 2;
  const driverFee = withDriver ? driverFeePerDay * RENTER_DAYS : 0;

  const taxesFees = Math.round((base + insurance + driverFee) * 0.08);
  const total = base + insurance + driverFee + taxesFees;

  const bookingId = booking?.bookingId || "#SC-2241117-0042";

  const vName = vehicleName(vehicle);
  const dName = withDriver ? driverName(driver) : "Self Drive";

  const vImg = useMemo(() => {
    const raw = getVehicleImageRaw(vehicle);
    const resolved = raw ? resolveImageUrl(raw) : "";
    return resolved || FALLBACK_CAR;
  }, [vehicle]);

  const dAvatar = useMemo(() => {
    if (!withDriver) return FALLBACK_AVATAR;
    const raw = getDriverAvatarRaw(driver);
    return raw ? resolveImageUrl(raw) : FALLBACK_AVATAR;
  }, [driver, withDriver]);

  // ✅ show map only when user types pickup/dropoff (as you requested)
  const pickupMap = useMemo(() => mapEmbedUrl(pickup), [pickup]);
  const dropoffMap = useMemo(() => mapEmbedUrl(dropoff), [dropoff]);

  function handleProceedToPayment() {
    const orderForPayment = {
      id: bookingId,
      title: "SmartCar AI Rental",
      subtitle: `${trip?.startDate || ""} – ${trip?.endDate || ""} • ${vName} ${
        withDriver ? `with ${dName}` : "(Drive Yourself)"
      }`,
      vehicleRental: base,
      driverFee,
      insurance,
      taxes: taxesFees,
      pickup,
      dropoff,
      withDriver,
    };

    navigate("/payment", { state: { order: orderForPayment } });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm">
      <div className="relative mx-4 w-full max-w-5xl rounded-3xl bg-slate-50 p-4 sm:p-5 shadow-2xl shadow-slate-900/40">
        {/* Close */}
        <button
          type="button"
          onClick={onClose}
          className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 hover:bg-slate-50"
          aria-label="Close"
        >
          ✕
        </button>

        <div className="mb-4">
          <h2 className="text-sm font-semibold text-slate-900">
            Your Booking Details
          </h2>
        </div>

        <div className="grid gap-4 lg:grid-cols-[minmax(0,1.2fr),minmax(0,1.1fr)]">
          {/* LEFT */}
          <div className="space-y-3">
            <div className="rounded-2xl bg-white p-3 shadow-sm shadow-slate-900/10 border border-slate-200">
              <div className="overflow-hidden rounded-xl mb-3">
                {/* ✅ use object-contain like VehicleDetailModal so images never “look missing” */}
                <div className="relative h-40 w-full bg-white border border-slate-200 rounded-xl overflow-hidden">
                  <img
                    src={vImg}
                    alt={vName}
                    className="h-full w-full object-contain p-2"
                    onError={(e) => {
                      e.currentTarget.src = FALLBACK_CAR;
                    }}
                  />

                  {/* Driver badge (only if withDriver) */}
                  {withDriver && (
                    <div className="absolute left-3 bottom-3 flex items-center gap-2 rounded-full bg-white/90 px-3 py-1 shadow-sm">
                      <div className="h-7 w-7 rounded-full overflow-hidden bg-slate-200">
                        <img
                          src={dAvatar}
                          alt={dName}
                          className="h-full w-full object-cover"
                          onError={(e) => {
                            e.currentTarget.src = FALLBACK_AVATAR;
                          }}
                        />
                      </div>
                      <span className="text-[11px] font-semibold text-slate-800">
                        {dName}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              <p className="text-xs font-semibold text-slate-800 mb-2">
                Trip Overview
              </p>

              <div className="space-y-3 text-xs text-slate-700">
                {/* Pickup */}
                <div className="grid grid-cols-1 md:grid-cols-[minmax(0,1.4fr),minmax(0,1fr)] gap-3">
                  <div>
                    <label className="mb-1 block text-[11px] font-medium text-slate-600">
                      Pickup
                    </label>
                    <input
                      type="text"
                      value={pickup}
                      onChange={(e) => setPickup(e.target.value)}
                      className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs text-slate-900 shadow-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500/40"
                      placeholder="Pickup address"
                    />
                    <p className="mt-1 text-[11px] text-slate-400">
                      {trip?.startDate || "—"} • 08:30 AM (example)
                    </p>
                  </div>

                  <div className="overflow-hidden rounded-lg border border-slate-200 bg-slate-50 h-32">
                    {pickup && pickupMap ? (
                      <iframe
                        title="Pickup map"
                        src={pickupMap}
                        className="h-full w-full"
                        loading="lazy"
                        referrerPolicy="no-referrer-when-downgrade"
                      />
                    ) : (
                      <div className="h-full w-full flex items-center justify-center text-[11px] text-slate-400">
                        {GMAPS_KEY
                          ? "Type pickup address to show map"
                          : "Missing Google Maps key (set VITE_GOOGLE_MAPS_KEY)"}
                      </div>
                    )}
                  </div>
                </div>

                {/* Drop-off */}
                <div className="grid grid-cols-1 md:grid-cols-[minmax(0,1.4fr),minmax(0,1fr)] gap-3">
                  <div>
                    <label className="mb-1 block text-[11px] font-medium text-slate-600">
                      Drop-off
                    </label>
                    <input
                      type="text"
                      value={dropoff}
                      onChange={(e) => setDropoff(e.target.value)}
                      className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs text-slate-900 shadow-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500/40"
                      placeholder="Drop-off address"
                    />
                    <p className="mt-1 text-[11px] text-slate-400">
                      {trip?.endDate || "—"} • 02:15 PM (example)
                    </p>
                  </div>

                  <div className="overflow-hidden rounded-lg border border-slate-200 bg-slate-50 h-32">
                    {dropoff && dropoffMap ? (
                      <iframe
                        title="Dropoff map"
                        src={dropoffMap}
                        className="h-full w-full"
                        loading="lazy"
                        referrerPolicy="no-referrer-when-downgrade"
                      />
                    ) : (
                      <div className="h-full w-full flex items-center justify-center text-[11px] text-slate-400">
                        {GMAPS_KEY
                          ? "Type drop-off address to show map"
                          : "Missing Google Maps key (set VITE_GOOGLE_MAPS_KEY)"}
                      </div>
                    )}
                  </div>
                </div>

                {/* ✅ Helpful hint */}
                {!GMAPS_KEY && (
                  <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-[11px] text-amber-800">
                    Add your key in <span className="font-semibold">.env</span>:
                    <div className="mt-1 font-mono">
                      VITE_GOOGLE_MAPS_KEY=YOUR_KEY
                    </div>
                    Then restart: <span className="font-semibold">npm run dev</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* RIGHT */}
          <div className="rounded-2xl bg-white p-4 shadow-sm shadow-slate-900/10 border border-slate-200">
            <p className="text-sm font-semibold text-slate-900 mb-2">
              Order Summary
            </p>

            <div className="space-y-1 text-xs text-slate-700 mb-3">
              <div className="flex items-center justify-between">
                <span>Vehicle Rental</span>
                <span>${base.toFixed(2)}</span>
              </div>

              {withDriver && (
                <div className="flex items-center justify-between">
                  <span>Driver Fee</span>
                  <span>${driverFee.toFixed(2)}</span>
                </div>
              )}

              <div className="flex items-center justify-between">
                <span>Insurance</span>
                <span>${insurance.toFixed(2)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Taxes &amp; Fees</span>
                <span>${taxesFees.toFixed(2)}</span>
              </div>
            </div>

            {/* Promo */}
            <div className="mb-3">
              <label className="mb-1 block text-[11px] font-medium text-slate-600">
                Apply Promo Code
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={promo}
                  onChange={(e) => setPromo(e.target.value)}
                  placeholder="Enter code"
                  className="flex-1 rounded-lg border border-slate-200 px-3 py-2 text-xs text-slate-900 shadow-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500/40"
                />
                <button
                  type="button"
                  className="rounded-lg border border-slate-200 px-3 py-2 text-[11px] font-medium text-slate-600 hover:bg-slate-50"
                >
                  Apply
                </button>
              </div>
            </div>

            {/* Total */}
            <div className="mt-2 flex items-center justify-between border-t border-slate-200 pt-3">
              <span className="text-xs font-semibold text-slate-900">
                Total Price
              </span>
              <span className="text-lg font-semibold text-slate-900">
                ${total.toFixed(2)}
              </span>
            </div>

            <button
              type="button"
              onClick={handleProceedToPayment}
              className="mt-4 inline-flex w-full items-center justify-center rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-md shadow-emerald-500/30 hover:bg-emerald-700"
            >
              Proceed to Payment
            </button>

            <p className="mt-2 text-[11px] text-slate-500">
              By continuing, you agree to SmartCar AI&apos;s rental terms and
              safety guidelines.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
