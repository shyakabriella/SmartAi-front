// src/components/demoBookingData.js
import api from "../lib/api";

export const RENTER_DAYS = 3;

// ✅ better origin extractor
const API_BASE = import.meta.env.VITE_API_URL || "";
const API_ORIGIN = (() => {
  try {
    return API_BASE ? new URL(API_BASE).origin : "";
  } catch {
    return "";
  }
})();

/* ---------------- helpers ---------------- */
function resolveImageUrl(u) {
  if (!u) return "";
  const s = String(u).trim();

  // absolute already
  if (/^https?:\/\//i.test(s)) return s;

  // normalize laravel storage weird paths
  let p = s.replace(/^https?:\/\/[^/]+/i, "");
  p = p.replace(/^\/?storage\/app\/public\//i, "/storage/");
  p = p.replace(/^\/?public\/storage\//i, "/storage/");
  p = p.replace(/^\/?public\//i, "/");
  if (!p.startsWith("/")) p = `/${p}`;

  // attach backend origin
  return API_ORIGIN ? `${API_ORIGIN}${p}` : p;
}

function extractVehicleList(res) {
  if (Array.isArray(res)) return res;
  if (Array.isArray(res?.data)) return res.data;
  if (Array.isArray(res?.data?.data)) return res.data.data;
  if (Array.isArray(res?.items)) return res.items;
  if (Array.isArray(res?.data?.items)) return res.data.items;
  if (Array.isArray(res?.data?.vehicles)) return res.data.vehicles;
  return [];
}

/* ✅ SAME LOGIC AS DASHBOARD + MORE */
function getPreviewRaw(v) {
  if (!v) return "";

  // prefer ready url fields
  if (v.image_url) return v.image_url;
  if (v.primary_image_url) return v.primary_image_url;

  // images array
  if (Array.isArray(v.images) && v.images[0]) return v.images[0];

  // media array (dashboard style)
  if (Array.isArray(v.media) && v.media.length) {
    const m0 = v.media[0];
    return m0?.url || m0?.original_url || m0?.path || m0?.file || "";
  }

  // sometimes media inside raw
  if (Array.isArray(v?.raw?.media) && v.raw.media.length) {
    const m0 = v.raw.media[0];
    return m0?.url || m0?.original_url || m0?.path || m0?.file || "";
  }

  // raw fallback
  if (v?.raw?.image_url) return v.raw.image_url;
  if (v?.raw?.primary_image_url) return v.raw.primary_image_url;

  return "";
}

function getVehicleName(v) {
  const year = v?.year || v?.raw?.year || "";
  const make = v?.make || v?.raw?.make || "";
  const model = v?.model || v?.raw?.model || "";

  return (
    v?.display_name ||
    v?.name ||
    `${year} ${make} ${model}`.trim() ||
    v?.plate_no ||
    v?.raw?.plate_no ||
    "Vehicle"
  );
}

function getVehicleType(v) {
  return (
    v?.vehicleType?.name ||
    v?.vehicle_type?.name ||
    v?.type?.name ||
    v?.type ||
    v?.vehicle_type ||
    v?.raw?.type?.name ||
    v?.raw?.vehicle_type?.name ||
    "Car"
  );
}

function getPricePerDay(v) {
  return (
    v?.base_daily_rate ??
    v?.price_per_day ??
    v?.daily_rate ??
    v?.raw?.base_daily_rate ??
    v?.raw?.price_per_day ??
    0
  );
}

function toArrayImages(v) {
  // media array
  if (Array.isArray(v?.media) && v.media.length) {
    const imgs = v.media
      .map((m) => m?.url || m?.original_url || m?.path || m?.file)
      .filter(Boolean)
      .map(resolveImageUrl);

    if (imgs.length) return imgs;
  }

  // images array
  if (Array.isArray(v?.images) && v.images.length) {
    return v.images.map(resolveImageUrl);
  }

  // single preview
  const one = getPreviewRaw(v);
  return one ? [resolveImageUrl(one)] : [];
}

/**
 * ✅ Normalize backend vehicle -> UI format
 */
export function mapApiVehicleToDemoShape(v) {
  return {
    id: v?.id,

    name: getVehicleName(v),
    type: getVehicleType(v),

    make: String(v?.make || "").trim(),
    model: String(v?.model || "").trim(),
    year: Number(v?.year || 0),
    plateNo: String(v?.plate_no || "").trim(),

    seats: Number(v?.seats ?? v?.seat_count ?? 4),
    fuel: String(v?.fuel_type ?? v?.fuel ?? "").trim() || "petrol",
    transmission:
      String(v?.transmission ?? v?.transmission_type ?? "").trim() ||
      "automatic",

    odometerKm: Number(v?.odometer_km ?? 0),

    pricePerDay: Number(getPricePerDay(v) || 0),
    pricePerHour: Number(v?.base_hourly_rate ?? 0),

    rating: Number(v?.avg_rating ?? v?.rating ?? 0),
    trips: Number(v?.bookings_count ?? v?.trips ?? 0),

    aiRecommended: Boolean(
      v?.ai_recommended ?? v?.aiRecommended ?? v?.is_ai_recommended ?? false
    ),
    withDriver: Boolean(v?.with_driver ?? v?.withDriver ?? false),
    insurancePerDay: Number(v?.insurance_per_day ?? v?.insurancePerDay ?? 0),

    // ✅ IMPORTANT: images for home
    images: toArrayImages(v),

    raw: v,
  };
}

/**
 * ✅ Fetch vehicles from backend
 */
export async function fetchVehicles({ usePublicFeed = true } = {}) {
  try {
    const endpoint = usePublicFeed ? "/public/vehicles" : "/vehicles";
    const res = await api(endpoint);
    const list = extractVehicleList(res);

    return Array.isArray(list) ? list.map(mapApiVehicleToDemoShape) : [];
  } catch (e) {
    console.warn("fetchVehicles failed:", e);
    return [];
  }
}

export async function fetchDrivers() {
  try {
    const res = await api("/drivers");
    const list = extractVehicleList(res);
    return Array.isArray(list) ? list : [];
  } catch (e) {
    console.warn("fetchDrivers failed:", e);
    return [];
  }
}

export const VEHICLES = [];
export const DRIVERS = [];
