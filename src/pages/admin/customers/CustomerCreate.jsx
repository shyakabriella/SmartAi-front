// src/pages/admin/customers/CustomerCreate.jsx
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

const API_BASE =
  (import.meta.env.VITE_API_BASE_URL ||
    import.meta.env.VITE_API_URL ||
    import.meta.env.VITE_API ||
    "/api")
    .trim()
    .replace(/\/+$/, "");

const TOKEN_KEYS = ["token", "access_token", "auth_token", "smartcar_token"];

const STEPS = [
  { id: 1, title: "Customer Details", subtitle: "Basic information" },
  { id: 2, title: "Trip Booking", subtitle: "Owner, car and trip" },
  { id: 3, title: "Review & Save", subtitle: "Confirm and submit" },
];

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/i;

const INITIAL_FORM = {
  name: "",
  email: "",
  phone: "",
  document_no: "",
  customer_source: "office_walk_in",
  create_booking: true,
  owner_id: "",
  car_id: "",
  driver_id: "",
  pickup: "",
  destination: "",
  trip_date: new Date().toISOString().slice(0, 10),
  pickup_time: "",
  passengers: "1",
  trip_type: "one_way",
  estimated_km: "",
  rate_per_km: "",
};

function getStoredToken() {
  if (typeof window === "undefined") return "";
  for (const key of TOKEN_KEYS) {
    const value = window.localStorage.getItem(key);
    if (value && String(value).trim()) return String(value).trim();
  }
  return "";
}

function extractErrorMessage(payload) {
  const msg =
    payload?.message ||
    payload?.error ||
    payload?.data?.message ||
    payload?.data?.error ||
    "";
  const errors = payload?.errors || payload?.data?.errors;
  const list =
    errors && typeof errors === "object"
      ? Object.values(errors).flat().filter(Boolean)
      : [];
  return (list.length ? list.join(", ") : msg) || "Request failed. Please try again.";
}

async function apiRequest(path, { method = "GET", body, params, token } = {}) {
  const base = String(API_BASE || "").replace(/\/+$/, "");
  if (!base) throw new Error("Missing API URL. Set VITE_API_URL or VITE_API_BASE_URL.");

  const query = new URLSearchParams();
  Object.entries(params || {}).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") query.append(key, value);
  });

  const url = `${base}${path}${query.toString() ? `?${query}` : ""}`;

  const res = await fetch(url, {
    method,
    headers: {
      Accept: "application/json",
      ...(body ? { "Content-Type": "application/json" } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  const json = await res.json().catch(() => ({}));

  if (!res.ok) {
    const err = new Error(extractErrorMessage(json));
    err.status = res.status;
    err.payload = json;
    throw err;
  }

  return json;
}

function extractArray(payload) {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.data?.data)) return payload.data.data;
  if (Array.isArray(payload?.users)) return payload.users;
  if (Array.isArray(payload?.cars)) return payload.cars;
  if (Array.isArray(payload?.drivers)) return payload.drivers;
  if (Array.isArray(payload?.items)) return payload.items;
  return [];
}

async function firstNonEmpty(requests = [], token = "") {
  let empty = [];
  for (const req of requests) {
    try {
      const json = await apiRequest(req.url, {
        method: req.method || "GET",
        params: req.params,
        body: req.body,
        token,
      });
      const arr = extractArray(json);
      if (!Array.isArray(arr)) continue;
      if (arr.length > 0) return arr;
      empty = arr;
    } catch (_) {}
  }
  return empty;
}

function roleNames(item) {
  const fromRoles = Array.isArray(item?.roles)
    ? item.roles
        .map((r) => (typeof r === "string" ? r : r?.name || r?.slug || ""))
        .filter(Boolean)
    : [];
  const plain = item?.role ? [String(item.role)] : [];
  const primary = item?.primary_role ? [String(item.primary_role)] : [];
  return [...fromRoles, ...plain, ...primary].map((x) => String(x).trim().toLowerCase());
}

function isOwner(item) {
  return roleNames(item).includes("owner");
}

function normalizeOwnerUser(item) {
  const id = item?.id ?? item?.user_id ?? "";
  const name =
    item?.name ||
    [item?.first_name, item?.last_name].filter(Boolean).join(" ").trim() ||
    item?.email ||
    `Owner #${id}`;

  return {
    id: String(id),
    ownerName: name,
    email: item?.email || "",
    phone: item?.phone || "",
    showroomName: "",
    showroomProfileId: "",
    showroomAddress: "",
    label: name,
    subtitle: [item?.phone, item?.email].filter(Boolean).join(" • "),
  };
}

function normalizeProfile(item) {
  return {
    id: String(item?.id ?? ""),
    ownerId: String(item?.owner_id ?? item?.owner?.id ?? item?.user_id ?? ""),
    showroomName: item?.name || "",
    address: item?.address || "",
    ownerName: item?.owner?.name || item?.owner_name || "",
    ownerEmail: item?.owner?.email || "",
    ownerPhone: item?.owner?.phone || "",
  };
}

function normalizeCar(item) {
  const id = item?.id ?? item?.value ?? "";
  const ownerId =
    item?.user_id ??
    item?.owner_id ??
    item?.owner?.id ??
    item?.user?.id ??
    item?.raw?.user_id ??
    "";
  const make = item?.make || item?.brand || "";
  const model = item?.model || item?.title || item?.vehicle_name || "";
  const year = item?.year || "";
  const plate =
    item?.plate_no || item?.plate || item?.registration_number || item?.license_plate || "";
  const type =
    item?.type?.name ||
    item?.vehicle_type?.name ||
    item?.vehicleType?.name ||
    item?.car_class ||
    "";
  const dailyRate =
    item?.base_daily_rate ??
    item?.price_per_day ??
    item?.daily_rate ??
    item?.pricePerDay ??
    "";
  const embeddedProfile =
    item?.showroom_profile ||
    item?.showroomProfile ||
    item?.owner?.showroom_profile ||
    item?.owner?.showroomProfile ||
    item?.user?.showroom_profile ||
    item?.user?.showroomProfile ||
    null;

  const showroomName =
    embeddedProfile?.name ||
    item?.showroom_name ||
    item?.owner?.showroom_name ||
    item?.user?.showroom_name ||
    "";

  const title = [year, make, model].filter(Boolean).join(" ").trim() || `Car #${id}`;
  const secondary = [plate, type].filter(Boolean).join(" • ");

  return {
    id: String(id),
    ownerId: String(ownerId || ""),
    showroomName,
    label: secondary ? `${title} (${secondary})` : title,
    details: {
      title,
      plate,
      type,
      make,
      model,
      year,
      dailyRate,
      seats: item?.seats || "",
      fuel: item?.fuel_type || "",
      transmission: item?.transmission || "",
      status: item?.status || "available",
      ownerId: String(ownerId || ""),
      showroomName,
    },
  };
}

function normalizeDriver(item) {
  const id = item?.id ?? item?.value ?? "";
  const name =
    item?.name ||
    item?.full_name ||
    [item?.first_name, item?.last_name].filter(Boolean).join(" ").trim() ||
    item?.email ||
    `Driver #${id}`;
  const secondary = [item?.phone, item?.license_no, item?.email]
    .filter(Boolean)
    .join(" • ");
  return { id: String(id), label: secondary ? `${name} (${secondary})` : name };
}

function mergeOwners(ownerUsers, profiles, cars) {
  const map = new Map();

  ownerUsers.forEach((owner) => {
    if (!owner?.id) return;
    map.set(String(owner.id), owner);
  });

  profiles.forEach((profile) => {
    if (!profile.ownerId) return;
    const key = String(profile.ownerId);
    const prev = map.get(key) || {
      id: key,
      ownerName: profile.ownerName || `Owner #${key}`,
      email: profile.ownerEmail || "",
      phone: profile.ownerPhone || "",
      showroomName: "",
      showroomProfileId: "",
      showroomAddress: "",
      label: profile.ownerName || `Owner #${key}`,
      subtitle: "",
    };

    const ownerName = prev.ownerName || profile.ownerName || `Owner #${key}`;
    const showroomName = profile.showroomName || "";

    map.set(key, {
      ...prev,
      id: key,
      ownerName,
      email: prev.email || profile.ownerEmail || "",
      phone: prev.phone || profile.ownerPhone || "",
      showroomName,
      showroomProfileId: profile.id || "",
      showroomAddress: profile.address || "",
      label: showroomName ? `${ownerName} — ${showroomName}` : ownerName,
      subtitle: [
        showroomName ? `Showroom: ${showroomName}` : "",
        prev.phone || profile.ownerPhone || "",
        prev.email || profile.ownerEmail || "",
      ]
        .filter(Boolean)
        .join(" • "),
    });
  });

  cars.forEach((car) => {
    if (!car.ownerId || map.has(String(car.ownerId))) return;
    map.set(String(car.ownerId), {
      id: String(car.ownerId),
      ownerName: `Owner #${car.ownerId}`,
      email: "",
      phone: "",
      showroomName: car.showroomName || "",
      showroomProfileId: "",
      showroomAddress: "",
      label: car.showroomName
        ? `Owner #${car.ownerId} — ${car.showroomName}`
        : `Owner #${car.ownerId}`,
      subtitle: "Inferred from registered vehicles",
    });
  });

  return Array.from(map.values()).sort((a, b) => a.label.localeCompare(b.label));
}

async function geocode(query) {
  const res = await fetch(
    `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&q=${encodeURIComponent(query)}`,
    { headers: { Accept: "application/json" } }
  );
  if (!res.ok) throw new Error("Could not search location");
  const data = await res.json();
  if (!Array.isArray(data) || !data.length) throw new Error(`Location not found: ${query}`);
  return { lat: Number(data[0].lat), lon: Number(data[0].lon) };
}

function haversineKm(a, b) {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLon = ((b.lon - a.lon) * Math.PI) / 180;
  const lat1 = (a.lat * Math.PI) / 180;
  const lat2 = (b.lat * Math.PI) / 180;
  const x =
    Math.sin(dLat / 2) ** 2 +
    Math.sin(dLon / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2);
  return R * (2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x)));
}

async function roadDistanceKm(fromText, toText) {
  const [from, to] = await Promise.all([geocode(fromText), geocode(toText)]);
  const res = await fetch(
    `https://router.project-osrm.org/route/v1/driving/${from.lon},${from.lat};${to.lon},${to.lat}?overview=false&alternatives=false&steps=false`
  );
  if (!res.ok) return Number(haversineKm(from, to).toFixed(1));
  const json = await res.json();
  const meters = json?.routes?.[0]?.distance;
  return Number(((meters || haversineKm(from, to) * 1000) / 1000).toFixed(1));
}

function money(value) {
  if (value == null || value === "") return "—";
  const num = Number(value);
  if (Number.isNaN(num)) return String(value);
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency: "RWF",
    maximumFractionDigits: 0,
  }).format(num);
}

function Label({ children, required }) {
  return (
    <label className="mb-2 block text-sm font-medium text-slate-700">
      {children}
      {required && <span className="ml-1 text-rose-500">*</span>}
    </label>
  );
}

function Input({ label, hint, required, className = "", containerClassName = "", ...props }) {
  return (
    <div className={containerClassName}>
      {label && <Label required={required}>{label}</Label>}
      <input
        {...props}
        className={`w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100 ${className}`}
      />
      {hint ? <p className="mt-2 text-xs text-slate-500">{hint}</p> : null}
    </div>
  );
}

function Select({
  label,
  hint,
  required,
  children,
  className = "",
  containerClassName = "",
  ...props
}) {
  return (
    <div className={containerClassName}>
      {label && <Label required={required}>{label}</Label>}
      <select
        {...props}
        className={`w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100 ${className}`}
      >
        {children}
      </select>
      {hint ? <p className="mt-2 text-xs text-slate-500">{hint}</p> : null}
    </div>
  );
}

function SummaryRow({ label, value }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-dashed border-slate-200 py-3 last:border-b-0">
      <div className="text-sm text-slate-500">{label}</div>
      <div className="text-right text-sm font-medium text-slate-900">
        {value || <span className="text-slate-400">—</span>}
      </div>
    </div>
  );
}

function OwnerCard({ owner }) {
  if (!owner) return null;
  return (
    <div className="rounded-3xl border border-violet-200 bg-violet-50 p-5">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <div className="text-xs font-semibold uppercase tracking-[0.18em] text-violet-700">
            Selected Owner / Showroom
          </div>
          <h3 className="mt-2 text-lg font-semibold text-slate-900">
            {owner.ownerName || owner.label || "—"}
          </h3>
          <p className="mt-1 text-sm text-slate-600">
            {owner.showroomName ? `Showroom: ${owner.showroomName}` : "No showroom profile found."}
          </p>
        </div>
        <span className="inline-flex rounded-full bg-white px-3 py-1 text-xs font-semibold text-violet-700 ring-1 ring-violet-200">
          User ID: {owner.id || "—"}
        </span>
      </div>
    </div>
  );
}

function CarCard({ car }) {
  if (!car) return null;
  const d = car.details || {};
  const statusClass =
    String(d.status || "").toLowerCase() === "available"
      ? "bg-emerald-100 text-emerald-700"
      : String(d.status || "").toLowerCase() === "booked"
      ? "bg-amber-100 text-amber-700"
      : "bg-slate-100 text-slate-700";

  return (
    <div className="rounded-3xl border border-blue-200 bg-blue-50 p-5">
      <div className="flex items-center justify-between gap-4">
        <div>
          <div className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-700">
            Selected Vehicle
          </div>
          <h3 className="mt-2 text-lg font-semibold text-slate-900">
            {d.title || car.label}
          </h3>
          <p className="mt-1 text-sm text-slate-600">
            Loaded from selected owner or direct vehicle fallback.
          </p>
        </div>
        <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${statusClass}`}>
          {d.status || "unknown"}
        </span>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
        {[
          ["Plate", d.plate],
          ["Type", d.type],
          ["Seats", d.seats],
          ["Daily Rate", money(d.dailyRate)],
          ["Showroom", d.showroomName],
          ["Transmission", d.transmission],
          ["Fuel", d.fuel],
        ].map(([k, v]) => (
          <div key={k} className="rounded-2xl bg-white px-4 py-3">
            <div className="text-[11px] uppercase tracking-[0.14em] text-slate-400">{k}</div>
            <div className="mt-1 text-sm font-semibold text-slate-900">{v || "—"}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function CustomerCreate() {
  const nav = useNavigate();

  const [token] = useState(() => getStoredToken());
  const [form, setForm] = useState(INITIAL_FORM);
  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");
  const [optionsLoading, setOptionsLoading] = useState(true);
  const [carsLoading, setCarsLoading] = useState(false);
  const [distanceState, setDistanceState] = useState({ loading: false, error: "" });

  const [owners, setOwners] = useState([]);
  const [profiles, setProfiles] = useState([]);
  const [allCars, setAllCars] = useState([]);
  const [cars, setCars] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [usingOwnerFallback, setUsingOwnerFallback] = useState(false);

  const updateField = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));

  useEffect(() => {
    let active = true;

    (async () => {
      setOptionsLoading(true);
      setErr("");

      try {
        const [profilesRaw, ownersRaw, carsRaw, driversRaw] = await Promise.all([
          firstNonEmpty([{ url: "/showroom/profiles" }], token),
          firstNonEmpty(
            [
              { url: "/users", params: { role: "owner", per_page: 100 } },
              { url: "/users", params: { per_page: 100 } },
            ],
            token
          ),
          firstNonEmpty(
            [
              { url: "/showroom/vehicles", params: { per_page: 100 } },
              { url: "/vehicles", params: { per_page: 100 } },
              { url: "/cars", params: { per_page: 100 } },
            ],
            token
          ),
          firstNonEmpty(
            [
              { url: "/drivers", params: { per_page: 100 } },
              { url: "/users", params: { role: "driver", per_page: 100 } },
              { url: "/employees", params: { role: "driver", per_page: 100 } },
            ],
            token
          ),
        ]);

        if (!active) return;

        const normalizedProfiles = profilesRaw.map(normalizeProfile);
        const normalizedCars = carsRaw.map(normalizeCar);
        const normalizedOwners = ownersRaw.filter(isOwner).map(normalizeOwnerUser);
        const mergedOwners = mergeOwners(normalizedOwners, normalizedProfiles, normalizedCars);

        setProfiles(normalizedProfiles);
        setAllCars(normalizedCars);
        setDrivers(driversRaw.map(normalizeDriver));
        setOwners(mergedOwners);
        setUsingOwnerFallback(
          normalizedOwners.length === 0 &&
            (normalizedProfiles.length > 0 || normalizedCars.length > 0)
        );

        if (mergedOwners.length === 1) {
          setForm((prev) => ({ ...prev, owner_id: prev.owner_id || mergedOwners[0].id }));
        }
      } catch (e) {
        if (active) setErr(extractErrorMessage(e?.payload || e));
      } finally {
        if (active) setOptionsLoading(false);
      }
    })();

    return () => {
      active = false;
    };
  }, [token]);

  useEffect(() => {
    let active = true;

    (async () => {
      if (!form.owner_id) {
        setCars(!owners.length && allCars.length ? allCars : []);
        setCarsLoading(false);
        return;
      }

      const localCars = allCars.filter(
        (car) => String(car.ownerId) === String(form.owner_id)
      );

      setCars(localCars);
      setCarsLoading(true);

      try {
        const ownerId = String(form.owner_id);
        const raw = await firstNonEmpty(
          [
            { url: "/showroom/vehicles", params: { user_id: ownerId, per_page: 100 } },
            { url: "/vehicles", params: { user_id: ownerId, per_page: 100 } },
            { url: "/cars", params: { user_id: ownerId, per_page: 100 } },
            { url: `/showroom/${ownerId}/vehicles`, params: { per_page: 100 } },
          ],
          token
        );

        if (!active) return;

        const remoteCars = raw.map(normalizeCar);
        const nextCars = remoteCars.length ? remoteCars : localCars;

        setCars(nextCars);

        if (form.car_id && !nextCars.some((car) => String(car.id) === String(form.car_id))) {
          setForm((prev) => ({ ...prev, car_id: "" }));
        }
      } finally {
        if (active) setCarsLoading(false);
      }
    })();

    return () => {
      active = false;
    };
  }, [form.owner_id, allCars, owners.length, form.car_id, token]);

  useEffect(() => {
    if (!form.create_booking || !form.pickup.trim() || !form.destination.trim()) return;

    const timer = setTimeout(async () => {
      setDistanceState({ loading: true, error: "" });
      try {
        const km = await roadDistanceKm(form.pickup, form.destination);
        setForm((prev) => ({ ...prev, estimated_km: String(km) }));
        setDistanceState({ loading: false, error: "" });
      } catch (e) {
        setDistanceState({ loading: false, error: extractErrorMessage(e) });
      }
    }, 700);

    return () => clearTimeout(timer);
  }, [form.create_booking, form.pickup, form.destination]);

  const selectedOwner = useMemo(
    () => owners.find((item) => String(item.id) === String(form.owner_id)) || null,
    [owners, form.owner_id]
  );

  const selectedCar = useMemo(
    () => cars.find((item) => String(item.id) === String(form.car_id)) || null,
    [cars, form.car_id]
  );

  const selectedDriver = useMemo(
    () => drivers.find((item) => String(item.id) === String(form.driver_id)) || null,
    [drivers, form.driver_id]
  );

  const ownerlessCarMode = !optionsLoading && owners.length === 0 && allCars.length > 0;
  const effectiveOwnerId =
    form.owner_id || selectedCar?.ownerId || selectedCar?.details?.ownerId || "";
  const selectedProfile =
    profiles.find((item) => String(item.ownerId) === String(effectiveOwnerId)) || null;

  const ownerName =
    selectedOwner?.ownerName ||
    selectedOwner?.label ||
    (effectiveOwnerId ? `Owner #${effectiveOwnerId}` : "");

  const showroomName =
    selectedOwner?.showroomName ||
    selectedProfile?.showroomName ||
    selectedCar?.showroomName ||
    "";

  const selectedCarLabel = selectedCar?.label || "";
  const selectedDriverLabel = selectedDriver?.label || "";
  const requireDriver = form.create_booking && drivers.length > 0;

  const estimatedTotal = useMemo(() => {
    const km = Number(form.estimated_km);
    const rate = Number(form.rate_per_km);
    if (!km || !rate || Number.isNaN(km) || Number.isNaN(rate)) return "";
    return String(Math.round(km * rate));
  }, [form.estimated_km, form.rate_per_km]);

  function validate(currentStep) {
    if (currentStep === 1) {
      if (!form.name.trim()) return "Customer full name is required";
      if (!form.email.trim()) return "Email address is required";
      if (!EMAIL_RE.test(form.email.trim())) return "Please enter a valid email address";
    }

    if (currentStep === 2 && form.create_booking) {
      if (!form.owner_id && !ownerlessCarMode) return "Please select an owner first";
      if (!form.car_id) return ownerlessCarMode ? "Please select a vehicle" : "Please select a registered vehicle";
      if (requireDriver && !form.driver_id) return "Please select a driver";
      if (!form.trip_date) return "Trip date is required";
      if (!form.pickup.trim()) return "Departure / pickup location is required";
      if (!form.destination.trim()) return "Destination is required";
      if (!String(form.passengers).trim() || Number(form.passengers) < 1) {
        return "Passengers must be at least 1";
      }
    }

    return "";
  }

  const bookingPayload = (customerId = null) => ({
    customer_id: customerId,
    owner_id: effectiveOwnerId || null,
    owner_name: ownerName || null,
    showroom_profile_id: selectedProfile?.id || null,
    showroom_name: showroomName || null,
    car_id: form.car_id || null,
    car_label: selectedCarLabel || null,
    car_snapshot: selectedCar?.details || null,
    driver_id: form.driver_id || null,
    driver_label: selectedDriverLabel || null,
    pickup_location: form.pickup || null,
    departure: form.pickup || null,
    destination: form.destination || null,
    trip_date: form.trip_date || null,
    pickup_time: form.pickup_time || null,
    passengers: form.passengers ? Number(form.passengers) : 1,
    trip_type: form.trip_type || "one_way",
    estimated_km: form.estimated_km ? Number(form.estimated_km) : null,
    rate_per_km: form.rate_per_km ? Number(form.rate_per_km) : null,
    estimated_total: estimatedTotal ? Number(estimatedTotal) : null,
    status: "pending",
  });

  async function submit(e) {
    e.preventDefault();

    const message = validate(1) || validate(2);
    if (message) {
      setErr(message);
      setStep(validate(1) ? 1 : 2);
      return;
    }

    setSaving(true);
    setErr("");

    try {
      const customerPayload = {
        name: form.name.trim(),
        email: form.email.trim(),
        phone: form.phone.trim() || null,
        document_no: form.document_no.trim() || null,
        preferences: {
          customer_source: form.customer_source || "office_walk_in",
          owner_id: effectiveOwnerId || null,
          owner_name: ownerName || null,
          showroom_profile_id: selectedProfile?.id || null,
          showroom_name: showroomName || null,
          booking_draft: form.create_booking ? bookingPayload(null) : null,
        },
      };

      const customerJson = await apiRequest("/customers", {
        method: "POST",
        body: customerPayload,
        token,
      });

      const customerId = customerJson?.customer?.id || customerJson?.id;

      if (form.create_booking && customerId) {
        try {
          await apiRequest("/bookings", {
            method: "POST",
            body: {
              ...bookingPayload(customerId),
              customer_name: form.name.trim(),
              customer_phone: form.phone.trim() || null,
            },
            token,
          });
        } catch (_) {}
      }

      nav(`/admin/customers/${customerId}`);
    } catch (e) {
      setErr(extractErrorMessage(e?.payload || e));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mx-auto max-w-6xl">
      <div className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-[0_10px_40px_rgba(2,6,23,0.06)]">
        <div className="border-b border-slate-200 bg-[linear-gradient(135deg,#eff6ff_0%,#f8fafc_42%,#faf5ff_100%)] px-6 py-6 md:px-8">
          <div className="flex flex-col gap-6 xl:flex-row xl:items-center xl:justify-between">
            <div>
              <div className="inline-flex items-center rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-emerald-700">
                Customers
              </div>
              <h1 className="mt-4 text-2xl font-bold tracking-tight text-slate-950 md:text-3xl">
                Create Customer
              </h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
                Register customer and optionally create booking with owner, showroom, car and trip details.
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              {STEPS.map((item) => {
                const active = step === item.id;
                const done = step > item.id;
                return (
                  <div
                    key={item.id}
                    className={`rounded-3xl border px-4 py-4 shadow-sm ${
                      active
                        ? "border-blue-200 bg-blue-50"
                        : done
                        ? "border-emerald-200 bg-emerald-50"
                        : "border-slate-200 bg-white"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <div className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                          Step {item.id}
                        </div>
                        <div className="mt-1 text-sm font-semibold text-slate-900">
                          {item.title}
                        </div>
                      </div>
                      <span
                        className={`inline-flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold ${
                          active
                            ? "bg-blue-600 text-white"
                            : done
                            ? "bg-emerald-600 text-white"
                            : "bg-slate-100 text-slate-700"
                        }`}
                      >
                        {done ? "✓" : item.id}
                      </span>
                    </div>
                    <p className="mt-3 text-xs leading-5 text-slate-500">{item.subtitle}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <form onSubmit={submit} className="px-6 py-6 md:px-8 md:py-8">
          {err ? (
            <div className="mb-6 rounded-3xl border border-rose-200 bg-rose-50 px-5 py-4 text-sm text-rose-800">
              {err}
            </div>
          ) : null}

          {step === 1 && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                <Input
                  label="Customer Full Name"
                  required
                  placeholder="Enter customer name"
                  value={form.name}
                  onChange={(e) => updateField("name", e.target.value)}
                />
                <Input
                  label="Email Address"
                  required
                  type="email"
                  placeholder="name@example.com"
                  value={form.email}
                  onChange={(e) => updateField("email", e.target.value)}
                />
                <Input
                  label="Phone Number"
                  placeholder="07..."
                  value={form.phone}
                  onChange={(e) => updateField("phone", e.target.value)}
                />
                <Input
                  label="Document No."
                  placeholder="Optional reference"
                  value={form.document_no}
                  onChange={(e) => updateField("document_no", e.target.value)}
                />
                <Select
                  label="Customer Source"
                  value={form.customer_source}
                  onChange={(e) => updateField("customer_source", e.target.value)}
                >
                  <option value="office_walk_in">Office Walk-in</option>
                  <option value="phone_call">Phone Call</option>
                  <option value="website">Website</option>
                  <option value="referral">Referral</option>
                </Select>
              </div>

              <div className="rounded-3xl border border-slate-200 bg-white p-5">
                <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                  <div>
                    <h3 className="text-base font-semibold text-slate-900">
                      Create booking together with customer?
                    </h3>
                    <p className="mt-1 text-sm text-slate-500">
                      Enable this if customer is booking a car immediately.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => updateField("create_booking", !form.create_booking)}
                    className={`inline-flex items-center justify-center rounded-full px-4 py-2 text-sm font-semibold ${
                      form.create_booking
                        ? "bg-emerald-600 text-white hover:bg-emerald-700"
                        : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                    }`}
                  >
                    {form.create_booking ? "Booking Enabled" : "Booking Disabled"}
                  </button>
                </div>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-6">
              {!form.create_booking ? (
                <div className="rounded-3xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-800">
                  Booking is disabled. Continue to review or go back and enable it.
                </div>
              ) : (
                <>
                  <div className="rounded-3xl border border-slate-200 bg-slate-50/60 p-5">
                    <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                      <div>
                        <h2 className="text-lg font-semibold text-slate-900">Booking Details</h2>
                        <p className="mt-1 text-sm text-slate-500">
                          Select owner when available. If owner list is missing, cars still load directly.
                        </p>
                      </div>
                      <span className="inline-flex rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                        Owners: {owners.length} • Cars: {cars.length} • Drivers: {drivers.length}
                      </span>
                    </div>

                    {usingOwnerFallback ? (
                      <div className="mt-5 rounded-2xl border border-violet-200 bg-violet-50 px-4 py-3 text-sm text-violet-800">
                        Owner list was built from showroom profiles and registered vehicles.
                      </div>
                    ) : null}

                    {ownerlessCarMode ? (
                      <div className="mt-5 rounded-2xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-800">
                        No owner records were returned, so cars are loaded directly from vehicle records.
                      </div>
                    ) : null}

                    {!optionsLoading && owners.length === 0 && allCars.length === 0 ? (
                      <div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                        No owner records or cars were found from the API. Check token storage and API base URL.
                      </div>
                    ) : null}

                    <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2">
                      <Select
                        label="Select Owner"
                        required={!ownerlessCarMode}
                        value={form.owner_id}
                        onChange={(e) =>
                          setForm((prev) => ({
                            ...prev,
                            owner_id: e.target.value,
                            car_id: "",
                          }))
                        }
                        hint={
                          optionsLoading
                            ? "Loading owners..."
                            : ownerlessCarMode
                            ? "Owners are inferred automatically from cars"
                            : "Loaded from showroom profiles, owner users and vehicles"
                        }
                        disabled={optionsLoading || ownerlessCarMode}
                      >
                        <option value="">
                          {optionsLoading
                            ? "Loading owners..."
                            : ownerlessCarMode
                            ? "Owners inferred automatically"
                            : "Choose an owner"}
                        </option>
                        {owners.map((owner) => (
                          <option key={owner.id} value={owner.id}>
                            {owner.label}
                          </option>
                        ))}
                      </Select>

                      <Select
                        label="Select Car"
                        required
                        value={form.car_id}
                        onChange={(e) => {
                          const picked = cars.find((c) => String(c.id) === String(e.target.value));
                          setForm((prev) => ({
                            ...prev,
                            car_id: e.target.value,
                            owner_id: ownerlessCarMode
                              ? String(picked?.ownerId || picked?.details?.ownerId || prev.owner_id || "")
                              : prev.owner_id,
                          }));
                        }}
                        disabled={(!form.owner_id && !ownerlessCarMode) || carsLoading}
                        hint={
                          !form.owner_id && !ownerlessCarMode
                            ? "Select owner first"
                            : carsLoading
                            ? "Loading cars..."
                            : "Loaded from matching owner vehicles"
                        }
                      >
                        <option value="">
                          {!form.owner_id && !ownerlessCarMode
                            ? "Select owner first"
                            : carsLoading
                            ? "Loading cars..."
                            : "Choose a vehicle"}
                        </option>
                        {cars.map((car) => (
                          <option key={car.id} value={car.id}>
                            {car.label}
                          </option>
                        ))}
                      </Select>

                      <Select
                        label="Select Driver"
                        required={requireDriver}
                        value={form.driver_id}
                        onChange={(e) => updateField("driver_id", e.target.value)}
                        hint={
                          drivers.length
                            ? "Choose assigned driver"
                            : "No drivers found yet. Driver is optional for now."
                        }
                      >
                        <option value="">
                          {drivers.length ? "Choose a driver" : "No drivers available"}
                        </option>
                        {drivers.map((driver) => (
                          <option key={driver.id} value={driver.id}>
                            {driver.label}
                          </option>
                        ))}
                      </Select>

                      <Input
                        label="Trip Date"
                        required
                        type="date"
                        value={form.trip_date}
                        onChange={(e) => updateField("trip_date", e.target.value)}
                      />
                      <Input
                        label="Pickup Time"
                        type="time"
                        value={form.pickup_time}
                        onChange={(e) => updateField("pickup_time", e.target.value)}
                      />
                      <Input
                        label="Departure / Pickup Location"
                        required
                        value={form.pickup}
                        onChange={(e) => updateField("pickup", e.target.value)}
                        placeholder="Example: Kigali Convention Centre"
                      />
                      <Input
                        label="Destination"
                        required
                        value={form.destination}
                        onChange={(e) => updateField("destination", e.target.value)}
                        placeholder="Example: Musanze"
                      />
                      <Input
                        label="Passengers"
                        required
                        type="number"
                        min="1"
                        value={form.passengers}
                        onChange={(e) => updateField("passengers", e.target.value)}
                      />
                      <Select
                        label="Trip Type"
                        value={form.trip_type}
                        onChange={(e) => updateField("trip_type", e.target.value)}
                      >
                        <option value="one_way">One Way</option>
                        <option value="round_trip">Round Trip</option>
                      </Select>
                      <Input
                        label="Estimated Distance (KM)"
                        type="number"
                        min="0"
                        step="0.1"
                        value={form.estimated_km}
                        onChange={(e) => updateField("estimated_km", e.target.value)}
                        hint={
                          distanceState.loading
                            ? "Calculating route..."
                            : distanceState.error || "Auto-calculated from pickup and destination"
                        }
                      />
                      <Input
                        label="Rate per KM"
                        type="number"
                        min="0"
                        step="1"
                        value={form.rate_per_km}
                        onChange={(e) => updateField("rate_per_km", e.target.value)}
                        placeholder="Enter agreed rate"
                      />
                    </div>

                    {(form.owner_id || ownerlessCarMode) && !carsLoading && cars.length === 0 ? (
                      <div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                        No cars were found for the selected owner.
                      </div>
                    ) : null}

                    {estimatedTotal ? (
                      <div className="mt-5 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
                        Estimated Total: <span className="font-semibold">{money(estimatedTotal)}</span>
                      </div>
                    ) : null}
                  </div>

                  <OwnerCard
                    owner={
                      selectedOwner || effectiveOwnerId
                        ? {
                            ...(selectedOwner || {
                              id: String(effectiveOwnerId),
                              ownerName: ownerName || `Owner #${effectiveOwnerId}`,
                              label: ownerName || `Owner #${effectiveOwnerId}`,
                            }),
                            showroomName:
                              selectedOwner?.showroomName ||
                              selectedProfile?.showroomName ||
                              selectedCar?.showroomName ||
                              "",
                            showroomAddress:
                              selectedOwner?.showroomAddress || selectedProfile?.address || "",
                          }
                        : null
                    }
                  />

                  <CarCard car={selectedCar} />
                </>
              )}
            </div>
          )}

          {step === 3 && (
            <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
              <div className="rounded-3xl border border-slate-200 bg-slate-50/60 p-5">
                <h3 className="text-base font-semibold text-slate-900">Customer Summary</h3>
                <div className="mt-4">
                  <SummaryRow label="Full Name" value={form.name} />
                  <SummaryRow label="Email" value={form.email} />
                  <SummaryRow label="Phone" value={form.phone} />
                  <SummaryRow label="Document No." value={form.document_no} />
                  <SummaryRow label="Customer Source" value={form.customer_source} />
                  <SummaryRow
                    label="Booking Status"
                    value={form.create_booking ? "Booking enabled" : "Booking disabled"}
                  />
                </div>
              </div>

              <div className="rounded-3xl border border-slate-200 bg-slate-50/60 p-5">
                <h3 className="text-base font-semibold text-slate-900">Booking Summary</h3>
                <div className="mt-4">
                  <SummaryRow label="Owner" value={ownerName} />
                  <SummaryRow label="Showroom" value={showroomName} />
                  <SummaryRow label="Vehicle" value={selectedCarLabel} />
                  <SummaryRow label="Driver" value={selectedDriverLabel} />
                  <SummaryRow label="Trip Date" value={form.trip_date} />
                  <SummaryRow label="Pickup Time" value={form.pickup_time} />
                  <SummaryRow label="Pickup" value={form.pickup} />
                  <SummaryRow label="Destination" value={form.destination} />
                  <SummaryRow label="Passengers" value={form.passengers} />
                  <SummaryRow
                    label="Trip Type"
                    value={form.trip_type === "round_trip" ? "Round Trip" : "One Way"}
                  />
                  <SummaryRow label="Estimated KM" value={form.estimated_km} />
                  <SummaryRow label="Rate per KM" value={money(form.rate_per_km)} />
                  <SummaryRow label="Estimated Total" value={money(estimatedTotal)} />
                </div>
              </div>

              <div className="rounded-3xl border border-slate-200 bg-slate-50/60 p-5">
                <h3 className="text-base font-semibold text-slate-900">What happens next?</h3>
                <div className="mt-4 space-y-3 text-sm leading-6 text-slate-600">
                  <p>Saving will create the customer first. If booking is enabled, it will also try to create a booking.</p>
                  <p>If booking save fails because of optional fields, the customer will still remain saved.</p>
                </div>
              </div>
            </div>
          )}

          <div className="mt-8 flex flex-col gap-3 border-t border-slate-200 pt-6 sm:flex-row sm:items-center sm:justify-between">
            <button
              type="button"
              onClick={() => (step === 1 ? nav(-1) : setStep((s) => Math.max(s - 1, 1)))}
              className="inline-flex items-center justify-center rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              {step === 1 ? "Cancel" : "Back"}
            </button>

            {step < STEPS.length ? (
              <button
                type="button"
                onClick={() => {
                  const message = validate(step);
                  if (message) return setErr(message);
                  setErr("");
                  setStep((s) => Math.min(s + 1, STEPS.length));
                }}
                className="inline-flex items-center justify-center rounded-2xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white hover:bg-blue-700"
              >
                Continue
              </button>
            ) : (
              <button
                type="submit"
                disabled={saving}
                className={`inline-flex items-center justify-center rounded-2xl px-5 py-3 text-sm font-semibold text-white ${
                  saving ? "cursor-not-allowed bg-slate-400" : "bg-emerald-600 hover:bg-emerald-700"
                }`}
              >
                {saving ? "Saving..." : "Save Customer"}
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}