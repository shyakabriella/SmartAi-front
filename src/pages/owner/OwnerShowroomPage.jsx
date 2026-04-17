import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

function safeParse(s) {
  try {
    return s ? JSON.parse(s) : null;
  } catch {
    return null;
  }
}

function pickData(payload) {
  if (!payload) return null;
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.data)) return payload.data;
  if (payload?.data && typeof payload.data === "object") return payload.data;
  return payload;
}

function safeJsonFromText(text) {
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

function initials(value) {
  const str = String(value || "").trim();
  if (!str) return "SR";
  const parts = str.split(" ").filter(Boolean);
  return ((parts[0]?.[0] || "S") + (parts[1]?.[0] || "R")).toUpperCase();
}

function formatMoney(value) {
  if (value == null || value === "") return "Price not set";
  const num = Number(value);
  if (Number.isNaN(num)) return String(value);

  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency: "RWF",
    maximumFractionDigits: 0,
  }).format(num);
}

function getVehiclePrice(v) {
  return v?.base_daily_rate ?? v?.price_per_day ?? v?.daily_rate ?? null;
}

function getVehiclePlate(v) {
  return v?.plate_no || v?.license_plate || v?.plate || "No plate";
}

function getVehicleTitle(v) {
  const full = [v?.year, v?.make, v?.model].filter(Boolean).join(" ").trim();
  return full || v?.name || v?.display_name || "Vehicle";
}

function getVehicleType(v) {
  return (
    v?.type?.name ||
    v?.vehicle_type?.name ||
    v?.vehicleType?.name ||
    v?.category ||
    "Standard"
  );
}

function getVehicleImage(v) {
  if (typeof v?.image_url === "string" && v.image_url.trim()) return v.image_url;
  if (typeof v?.primary_image_url === "string" && v.primary_image_url.trim()) {
    return v.primary_image_url;
  }

  if (Array.isArray(v?.images) && v.images.length > 0) {
    const first = v.images[0];
    return first?.url || first?.image_url || first?.path || "";
  }

  if (Array.isArray(v?.media) && v.media.length > 0) {
    const first = v.media[0];
    if (typeof first === "string") return first;
    return first?.url || first?.image_url || first?.path || "";
  }

  return "";
}

function getShowroomLocation(showroom) {
  return (
    showroom?.location ||
    showroom?.address ||
    showroom?.city ||
    showroom?.district ||
    "Location not added yet"
  );
}

function getStatusMeta(status) {
  const s = String(status || "available").toLowerCase();

  if (s === "available" || s === "in_service" || s === "live") {
    return {
      label: s.replace("_", " "),
      badge: "bg-emerald-50 text-emerald-700 border border-emerald-200",
      dot: "bg-emerald-500",
    };
  }

  if (s === "booked" || s === "pending" || s === "reserved") {
    return {
      label: s.replace("_", " "),
      badge: "bg-amber-50 text-amber-700 border border-amber-200",
      dot: "bg-amber-500",
    };
  }

  if (s === "maintenance") {
    return {
      label: "maintenance",
      badge: "bg-rose-50 text-rose-700 border border-rose-200",
      dot: "bg-rose-500",
    };
  }

  return {
    label: s.replace("_", " "),
    badge: "bg-slate-100 text-slate-700 border border-slate-200",
    dot: "bg-slate-500",
  };
}

function SmallStat({ label, value }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="text-[11px] uppercase tracking-[0.16em] text-slate-400">
        {label}
      </div>
      <div className="mt-2 text-2xl font-semibold text-slate-900">{value}</div>
    </div>
  );
}

function VehicleMiniCard({ vehicle, index, onOpenAll }) {
  const image = getVehicleImage(vehicle);
  const meta = getStatusMeta(vehicle?.status);

  return (
    <div
      className="fade-up overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm transition duration-300 hover:-translate-y-1 hover:shadow-lg"
      style={{ animationDelay: `${index * 70}ms` }}
    >
      <div className="relative h-40 overflow-hidden bg-gradient-to-br from-slate-900 via-slate-800 to-blue-900">
        {image ? (
          <img
            src={image}
            alt={getVehicleTitle(vehicle)}
            className="h-full w-full object-cover transition duration-500 hover:scale-105"
          />
        ) : (
          <div className="grid h-full place-items-center text-3xl text-white">🚘</div>
        )}

        <div className="absolute left-3 top-3">
          <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${meta.badge}`}>
            {meta.label}
          </span>
        </div>

        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-3">
          <div className="text-[11px] uppercase tracking-[0.16em] text-white/70">
            {getVehiclePlate(vehicle)}
          </div>
          <div className="truncate text-sm font-semibold text-white">
            {getVehicleTitle(vehicle)}
          </div>
        </div>
      </div>

      <div className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-[11px] uppercase tracking-[0.16em] text-slate-400">
              Type
            </div>
            <div className="mt-1 text-sm font-medium text-slate-800">
              {getVehicleType(vehicle)}
            </div>
          </div>

          <div className="text-right">
            <div className="text-[11px] uppercase tracking-[0.16em] text-slate-400">
              / Day
            </div>
            <div className="mt-1 text-sm font-semibold text-slate-900">
              {formatMoney(getVehiclePrice(vehicle))}
            </div>
          </div>
        </div>

        <button
          onClick={onOpenAll}
          className="mt-4 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
        >
          Manage vehicle
        </button>
      </div>
    </div>
  );
}

export default function OwnerShowroomPage() {
  const nav = useNavigate();

  const token = useMemo(() => localStorage.getItem("token") || "", []);
  const user = useMemo(() => {
    return (
      safeParse(localStorage.getItem("auth.user")) ||
      safeParse(localStorage.getItem("user")) ||
      null
    );
  }, []);

  const API_BASE = useMemo(() => {
    const raw =
      (import.meta?.env?.VITE_API_URL || import.meta?.env?.VITE_API_BASE || "")
        .trim()
        .replace(/\/+$/, "");
    return raw || "/api";
  }, []);

  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [showroom, setShowroom] = useState(null);
  const [vehicles, setVehicles] = useState([]);

  useEffect(() => {
    let alive = true;

    async function req(url) {
      const res = await fetch(url, {
        method: "GET",
        headers: {
          Accept: "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });

      const text = await res.text();
      const json = safeJsonFromText(text);

      if (res.status === 401) {
        throw new Error(json?.message || "Unauthorized. Please login again.");
      }

      if (!res.ok) {
        const msg =
          json?.message ||
          json?.error ||
          text ||
          `Request failed (${res.status})`;
        throw new Error(`${msg} | URL: ${url}`);
      }

      return json;
    }

    async function load() {
      setLoading(true);
      setErr("");

      try {
        const [srRes, vRes] = await Promise.all([
          req(`${API_BASE}/showroom/profile`),
          req(`${API_BASE}/showroom/vehicles`),
        ]);

        const sr = pickData(srRes);
        const showroomObj = Array.isArray(sr) ? sr[0] : sr;

        const vData = pickData(vRes);
        const vList = Array.isArray(vData)
          ? vData
          : Array.isArray(vData?.data)
          ? vData.data
          : [];

        if (!alive) return;

        setShowroom(showroomObj || null);
        setVehicles(vList || []);
      } catch (e) {
        if (!alive) return;
        setErr(e?.message || "Failed to load showroom.");
      } finally {
        if (!alive) return;
        setLoading(false);
      }
    }

    load();

    return () => {
      alive = false;
    };
  }, [API_BASE, token]);

  const stats = useMemo(() => {
    const total = vehicles.length;
    const available = vehicles.filter((v) =>
      ["available", "in_service", "live"].includes(
        String(v?.status || "").toLowerCase()
      )
    ).length;
    const booked = vehicles.filter((v) =>
      ["booked", "pending", "reserved"].includes(
        String(v?.status || "").toLowerCase()
      )
    ).length;
    const maintenance = vehicles.filter(
      (v) => String(v?.status || "").toLowerCase() === "maintenance"
    ).length;

    return {
      total,
      available,
      booked,
      maintenance,
      featured: vehicles.slice(0, 6),
      recent: vehicles.slice(0, 5),
    };
  }, [vehicles]);

  const showroomName =
    showroom?.name || showroom?.title || `${user?.name || "My"} Showroom`;

  const ownerName = user?.name || user?.email || "Owner";
  const locationLabel = getShowroomLocation(showroom);

  const goToCreateVehicle = () => nav("/owner/vehicles/create");
  const goToVehiclesList = () => nav("/owner/vehicles");

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#f8fbff_0%,#eef4ff_100%)] px-4 py-6 sm:px-6 lg:px-8">
      <style>{`
        .fade-up {
          opacity: 0;
          transform: translateY(14px);
          animation: fadeUp .55s ease forwards;
        }
        @keyframes fadeUp {
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>

      <div className="mx-auto max-w-7xl space-y-6">
        <section className="fade-up rounded-[32px] border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <div className="grid gap-5 xl:grid-cols-[1.3fr_0.7fr]">
            <div className="rounded-[28px] bg-[linear-gradient(135deg,#0f172a_0%,#1e3a8a_100%)] p-6 text-white">
              <div className="flex flex-wrap items-center gap-3">
                <span className="rounded-full border border-white/15 bg-white/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em]">
                  Showroom page
                </span>
                <span className="rounded-full border border-white/15 bg-white/10 px-3 py-1 text-[11px] font-semibold">
                  Premium presentation
                </span>
              </div>

              <h1 className="mt-5 text-3xl font-semibold leading-tight sm:text-4xl">
                {showroomName}
              </h1>

              <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-200">
                Present your vehicles in a calm, polished, international-style
                showroom layout with compact data and better visual balance.
              </p>

              <div className="mt-6 flex flex-wrap gap-3">
                <button
                  onClick={goToCreateVehicle}
                  className="rounded-full bg-white px-5 py-3 text-sm font-semibold text-slate-900 transition hover:bg-slate-100"
                >
                  Add car
                </button>
                <button
                  onClick={() => nav("/owner")}
                  className="rounded-full border border-white/20 bg-white/10 px-5 py-3 text-sm font-semibold text-white transition hover:bg-white/15"
                >
                  Open dashboard
                </button>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-1">
              <div className="rounded-[28px] border border-slate-200 bg-slate-50 p-5">
                <div className="flex items-center gap-4">
                  <div className="grid h-14 w-14 place-items-center rounded-2xl bg-slate-900 text-sm font-semibold text-white">
                    {initials(showroomName)}
                  </div>
                  <div>
                    <div className="text-[11px] uppercase tracking-[0.16em] text-slate-400">
                      Owner
                    </div>
                    <div className="mt-1 text-base font-semibold text-slate-900">
                      {ownerName}
                    </div>
                    <div className="mt-1 text-sm text-slate-500">
                      {locationLabel}
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <SmallStat label="Vehicles" value={stats.total} />
                <SmallStat label="Available" value={stats.available} />
                <SmallStat label="Booked" value={stats.booked} />
                <SmallStat label="Service" value={stats.maintenance} />
              </div>
            </div>
          </div>
        </section>

        {loading ? (
          <div className="grid gap-5 lg:grid-cols-[1.1fr_0.9fr]">
            <div className="h-72 animate-pulse rounded-[28px] border border-slate-200 bg-white" />
            <div className="h-72 animate-pulse rounded-[28px] border border-slate-200 bg-white" />
          </div>
        ) : err ? (
          <div className="rounded-[28px] border border-rose-200 bg-rose-50 p-5 text-rose-700">
            <div className="text-lg font-semibold">Unable to load showroom</div>
            <div className="mt-2 text-sm">{err}</div>
          </div>
        ) : (
          <>
            <section className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
              <div className="fade-up rounded-[30px] border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex items-end justify-between gap-4">
                  <div>
                    <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-blue-500">
                      Showroom profile
                    </div>
                    <h2 className="mt-2 text-2xl font-semibold text-slate-900">
                      Business details
                    </h2>
                  </div>
                </div>

                <div className="mt-5 grid gap-4 sm:grid-cols-2">
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <div className="text-[11px] uppercase tracking-[0.16em] text-slate-400">
                      Showroom name
                    </div>
                    <div className="mt-2 text-sm font-semibold text-slate-900">
                      {showroom?.name || "Not added"}
                    </div>
                  </div>

                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <div className="text-[11px] uppercase tracking-[0.16em] text-slate-400">
                      Address
                    </div>
                    <div className="mt-2 text-sm font-semibold text-slate-900">
                      {showroom?.address || "Not added"}
                    </div>
                  </div>

                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <div className="text-[11px] uppercase tracking-[0.16em] text-slate-400">
                      Phone
                    </div>
                    <div className="mt-2 text-sm font-semibold text-slate-900">
                      {showroom?.phone || "Not added"}
                    </div>
                  </div>

                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <div className="text-[11px] uppercase tracking-[0.16em] text-slate-400">
                      Email
                    </div>
                    <div className="mt-2 break-all text-sm font-semibold text-slate-900">
                      {showroom?.email || user?.email || "Not added"}
                    </div>
                  </div>
                </div>
              </div>

              <div className="fade-up rounded-[30px] border border-slate-200 bg-white p-5 shadow-sm">
                <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-blue-500">
                  Recent vehicles
                </div>
                <h2 className="mt-2 text-2xl font-semibold text-slate-900">
                  Quick lineup
                </h2>

                <div className="mt-5 space-y-3">
                  {stats.recent.length > 0 ? (
                    stats.recent.map((v) => {
                      const meta = getStatusMeta(v.status);
                      return (
                        <div
                          key={v.id}
                          className="flex items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3"
                        >
                          <div className="min-w-0">
                            <div className="truncate text-sm font-semibold text-slate-900">
                              {getVehicleTitle(v)}
                            </div>
                            <div className="mt-1 truncate text-xs text-slate-500">
                              {getVehiclePlate(v)} • {getVehicleType(v)}
                            </div>
                          </div>

                          <span className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold ${meta.badge}`}>
                            {meta.label}
                          </span>
                        </div>
                      );
                    })
                  ) : (
                    <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-6 text-center text-sm text-slate-500">
                      No vehicles yet.
                    </div>
                  )}
                </div>
              </div>
            </section>

            <section className="fade-up rounded-[30px] border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-blue-500">
                    Featured collection
                  </div>
                  <h2 className="mt-2 text-2xl font-semibold text-slate-900">
                    Compact premium cards
                  </h2>
                </div>

                <button
                  onClick={goToVehiclesList}
                  className="rounded-full border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
                >
                  View all vehicles
                </button>
              </div>

              {stats.featured.length > 0 ? (
                <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                  {stats.featured.map((vehicle, index) => (
                    <VehicleMiniCard
                      key={vehicle?.id || index}
                      vehicle={vehicle}
                      index={index}
                      onOpenAll={goToVehiclesList}
                    />
                  ))}
                </div>
              ) : (
                <div className="mt-6 rounded-[28px] border border-dashed border-slate-300 bg-slate-50 p-10 text-center">
                  <div className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-white text-2xl shadow-sm">
                    🚗
                  </div>
                  <h3 className="mt-4 text-lg font-semibold text-slate-900">
                    Start building your showroom
                  </h3>
                  <p className="mt-2 text-sm text-slate-500">
                    Add your first car to begin presenting your inventory.
                  </p>

                  <button
                    onClick={goToCreateVehicle}
                    className="mt-5 rounded-full bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
                  >
                    Add first car
                  </button>
                </div>
              )}
            </section>
          </>
        )}
      </div>
    </div>
  );
}