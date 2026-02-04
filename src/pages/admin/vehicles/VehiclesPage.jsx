// src/pages/admin/vehicles/VehiclesPage.jsx
import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../../lib/api";
import VehicleCreate from "../../owner/VehicleCreate";

const ADMIN_BASE = "/vehicles";
const SHOWROOM_BASE = "/showroom/vehicles";

// Derive API origin from VITE_API_URL (e.g. http://127.0.0.1:8000/api -> http://127.0.0.1:8000)
const API_BASE = import.meta.env.VITE_API_URL || "";
const API_ORIGIN = API_BASE.replace(/\/api\/?$/, "");

/* ---------------- helpers ---------------- */
function safeParse(s) {
  try {
    return s ? JSON.parse(s) : null;
  } catch {
    return null;
  }
}

function getRoleSlugFromUser(u) {
  if (!u) return undefined;

  // ✅ handle role column like: role: "owner"
  if (typeof u.role === "string") return u.role.toLowerCase();

  // ✅ handle role object like: role: { name: "Owner" }
  if (u.role?.slug) return String(u.role.slug).toLowerCase();
  if (u.role?.name) return String(u.role.name).toLowerCase();

  // ✅ handle roles array
  if (Array.isArray(u.roles) && u.roles.length) {
    const first = u.roles[0];
    return typeof first === "string"
      ? first.toLowerCase()
      : (first.slug || first.name || "").toLowerCase();
  }

  // ✅ handle spatie role names like: role_names: ["owner"]
  if (Array.isArray(u.role_names) && u.role_names.length) {
    return String(u.role_names[0]).toLowerCase();
  }

  return undefined;
}

// ⬅️ read same key that Login.jsx writes
const LS_USER =
  safeParse(localStorage.getItem("auth.user")) ||
  safeParse(localStorage.getItem("user")) ||
  {};
const ROLE = getRoleSlugFromUser(LS_USER);

// ✅ owner + agent should use showroom endpoints
const IS_SHOWROOM_ROLE = ROLE === "agent" || ROLE === "owner";
const GUESS_PRIMARY_BASE = IS_SHOWROOM_ROLE ? SHOWROOM_BASE : ADMIN_BASE;

function relativize(url) {
  if (!url) return url;
  try {
    const base = import.meta.env.VITE_API_URL || "";
    return base ? url.replace(base, "") : url;
  } catch {
    return url;
  }
}

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

function getPreviewRaw(v) {
  return (
    v.image_url ||
    v.primary_image_url ||
    (v?.media && Array.isArray(v.media) && v.media[0]?.url) ||
    ""
  );
}

function resolveImageUrl(u) {
  if (!u) return "";
  if (/^https?:\/\//i.test(u)) {
    try {
      const url = new URL(u);
      if (/^\/?storage\//i.test(url.pathname.replace(/^\//, ""))) {
        return `${API_ORIGIN}${url.pathname}`;
      }
      return u;
    } catch {
      return u;
    }
  }
  const path = u.startsWith("/") ? u : `/${u}`;
  return `${API_ORIGIN}${path}`;
}

function mapVehicleToWizardForm(v) {
  const mapLoc = v?.media?.map_location || v?.media?.mapLocation || null;

  return {
    vehicle_type_id: v.vehicle_type_id != null ? String(v.vehicle_type_id) : "",
    plate_no: v.plate_no ?? v.license_plate ?? "",
    make: v.make ?? "",
    model: v.model ?? "",
    year: v.year ?? "",
    seats: v.seats ?? "",
    fuel_type: v.fuel_type ?? "",
    transmission: v.transmission ?? "",
    odometer_km: v.odometer_km ?? "",
    base_daily_rate: v.base_daily_rate ?? v.price_per_day ?? "",
    base_hourly_rate: v.base_hourly_rate ?? "",
    status: v.status ?? "available",

    location_id: v.location_id != null ? String(v.location_id) : "",

    location_address: mapLoc?.address || "",
    location_lat: mapLoc?.lat ? String(mapLoc.lat) : "",
    location_lng: mapLoc?.lng ? String(mapLoc.lng) : "",
    google_place_id: mapLoc?.place_id || "",
  };
}

/* ---------------- component ---------------- */
export default function VehiclesPage() {
  const nav = useNavigate();

  const [base, setBase] = useState(GUESS_PRIMARY_BASE);
  const [vehicles, setVehicles] = useState([]);
  const [meta, setMeta] = useState(null);
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(true);

  const [types, setTypes] = useState([]);
  const [locations, setLocations] = useState([]);

  const [openWizard, setOpenWizard] = useState(false);
  const [wizardMode, setWizardMode] = useState("create");
  const [wizardVehicle, setWizardVehicle] = useState(null);

  const uploadInputRef = useRef(null);
  const [uploadTarget, setUploadTarget] = useState(null);
  const [uploadingId, setUploadingId] = useState(null);

  // ✅ Set correct base for owner/agent
  useEffect(() => {
    if (IS_SHOWROOM_ROLE) setBase(SHOWROOM_BASE);
  }, []);

  // Load vehicle-types and locations (read-only)
  useEffect(() => {
    (async () => {
      try {
        const [t, l] = await Promise.all([api("/vehicle-types"), api("/locations")]);

        const tlist = (t?.data || t || []).map((x) => ({ id: x.id, name: x.name }));
        const llist = (l?.data || l || []).map((x) => ({ id: x.id, name: x.name }));

        setTypes(tlist);
        setLocations(llist);
      } catch (e) {
        console.warn("Failed to load reference data", e);
      }
    })();
  }, []);

  function otherBase(b) {
    return b === ADMIN_BASE ? SHOWROOM_BASE : ADMIN_BASE;
  }

  async function apiWith403Fallback(urlPath, options) {
    let path = urlPath || "";

    // if not absolute resource path, prefix current base
    if (!(path.startsWith(ADMIN_BASE) || path.startsWith(SHOWROOM_BASE))) {
      path = `${base}${path ? (path.startsWith("/") ? "" : "/") : ""}${path}`;
    }

    try {
      return await api(path, options);
    } catch (e) {
      if (e?.status === 401) {
        nav("/login");
        throw e;
      }
      if (e?.status !== 403) throw e;

      const alt = otherBase(path.startsWith(ADMIN_BASE) ? ADMIN_BASE : SHOWROOM_BASE);

      const altPath = path.replace(
        /^\/(vehicles|showroom\/vehicles)/,
        alt.slice(1)
      );

      const res = await api(altPath, options);
      setBase(alt);
      return res;
    }
  }

  async function load(pathOrEmpty = "") {
    setLoading(true);
    try {
      const rel = relativize(pathOrEmpty || "");
      const path = rel || base;

      const out = await apiWith403Fallback(path, undefined);

      setVehicles(out?.data || out || []);
      setMeta(out?.meta || null);
    } catch (e) {
      if (e?.status === 401) nav("/login");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line
  }, []);

  const filtered = useMemo(() => {
    if (!q) return vehicles;
    const s = q.toLowerCase();
    return vehicles.filter((v) => {
      const dn = (
        v.display_name || `${v.year || ""} ${v.make || ""} ${v.model || ""}`
      ).trim();
      return (
        dn.toLowerCase().includes(s) ||
        (v.make || "").toLowerCase().includes(s) ||
        (v.model || "").toLowerCase().includes(s) ||
        String(v.year || "").toLowerCase().includes(s) ||
        (v.license_plate || v.plate_no || "").toLowerCase().includes(s)
      );
    });
  }, [vehicles, q]);

  function openCreate() {
    setWizardMode("create");
    setWizardVehicle(null);
    setOpenWizard(true);
  }

  function openEdit(v) {
    setWizardMode("edit");
    setWizardVehicle(v);
    setOpenWizard(true);
  }

  async function deleteVehicle(v) {
    if (
      !confirm(
        `Remove ${v.make} ${v.model} (${v.license_plate || v.plate_no || "no-plate"})?`
      )
    )
      return;

    try {
      await apiWith403Fallback(`${base}/${v.id}`, { method: "DELETE" });
      setVehicles((prev) => prev.filter((x) => x.id !== v.id));
    } catch {
      alert("Failed to delete vehicle.");
    }
  }

  function startUploadFor(v) {
    setUploadTarget(v);
    uploadInputRef.current?.click();
  }

  async function handleUploadFile(e) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !uploadTarget) return;

    try {
      setUploadingId(uploadTarget.id);

      const fd = new FormData();
      fd.append("image", file);

      const hasPreview = Boolean(getPreviewRaw(uploadTarget));
      if (!hasPreview) fd.append("is_primary", "1");

      // ✅ Upload always to showroom images endpoint
      await api(`${SHOWROOM_BASE}/${uploadTarget.id}/images`, {
        method: "POST",
        body: fd,
      });

      setUploadTarget(null);
      await load();
    } catch (err) {
      console.error("Upload failed", err);
      alert(err?.message || "Failed to upload image.");
    } finally {
      setUploadingId(null);
    }
  }

  const hasPrev = !!(meta && meta.links && meta.links[0] && meta.links[0].url);
  const lastIdx = meta && meta.links ? meta.links.length - 1 : -1;
  const nextUrl = lastIdx >= 0 && meta.links[lastIdx] ? meta.links[lastIdx].url : null;

  const heading = base === SHOWROOM_BASE ? "Showroom" : "Vehicles";
  const sub =
    base === SHOWROOM_BASE
      ? "Add, update, or remove vehicles in your showroom."
      : "Browse and manage all vehicles.";

  return (
    <div className="space-y-4">
      <input
        ref={uploadInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleUploadFile}
      />

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">{heading}</h1>
          <p className="text-sm text-slate-500">{sub}</p>
        </div>
        <div className="flex gap-2">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search (make/model/plate)…"
            className="h-10 w-56 rounded-lg border border-slate-300 px-3"
          />
          <button
            onClick={openCreate}
            className="h-10 px-3 rounded-lg bg-blue-600 text-white hover:bg-blue-700"
          >
            + Add vehicle
          </button>
        </div>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {loading ? (
          Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="h-44 rounded-2xl border border-slate-200 bg-white animate-pulse"
            />
          ))
        ) : filtered.length === 0 ? (
          <div className="col-span-full text-sm text-slate-500">
            No vehicles yet. Click <b>“Add vehicle”</b> to create one.
          </div>
        ) : (
          filtered.map((v) => {
            const raw = getPreviewRaw(v);
            const preview = resolveImageUrl(raw);
            const isUploading = uploadingId === v.id;

            return (
              <div
                key={v.id}
                className="group rounded-2xl border border-slate-200 bg-white hover:shadow-md transition overflow-hidden"
              >
                <button
                  type="button"
                  onClick={() => startUploadFor(v)}
                  className="relative h-32 w-full overflow-hidden bg-slate-100 focus:outline-none"
                  title={preview ? "Change photo" : "Add photo"}
                >
                  {preview ? (
                    <img
                      src={preview}
                      alt={`${v.make || ""} ${v.model || ""}`}
                      className={`h-32 w-full object-cover transition ${
                        isUploading ? "opacity-50" : ""
                      }`}
                      loading="lazy"
                    />
                  ) : (
                    <div
                      className={`h-32 w-full grid place-items-center text-slate-400 text-sm ${
                        isUploading ? "opacity-50" : ""
                      }`}
                    >
                      No image — click to add
                    </div>
                  )}

                  <div className="absolute inset-0 hidden group-hover:grid place-items-center bg-black/30 text-white text-xs">
                    {isUploading ? "Uploading…" : preview ? "Change photo" : "Add photo"}
                  </div>

                  {isUploading && (
                    <div className="absolute top-2 right-2 h-5 w-5 rounded-full bg-white/90 grid place-items-center text-[10px] text-slate-700">
                      …
                    </div>
                  )}
                </button>

                <div className="p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="font-medium truncate">
                        {(
                          v.display_name ||
                          `${v.year || ""} ${v.make || ""} ${v.model || ""}`
                        ).trim()}
                      </div>
                      <div className="text-xs text-slate-500 truncate">
                        Plate: {v.license_plate || v.plate_no || "—"}
                      </div>
                    </div>

                    <div className="shrink-0 grid justify-items-end gap-1">
                      <span
                        className={[
                          "text-[11px] px-2 py-0.5 rounded-full border",
                          v.status === "available"
                            ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                            : v.status === "in_service"
                            ? "bg-sky-50 text-sky-700 border-sky-200"
                            : v.status === "booked"
                            ? "bg-indigo-50 text-indigo-700 border-indigo-200"
                            : v.status === "maintenance"
                            ? "bg-amber-50 text-amber-700 border-amber-200"
                            : "bg-slate-50 text-slate-700 border-slate-200",
                        ].join(" ")}
                      >
                        {v.status || "unknown"}
                      </span>

                      {v.type?.name && (
                        <span className="text-[11px] px-2 py-0.5 rounded-full border bg-slate-50 text-slate-700 border-slate-200">
                          {v.type.name}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="mt-2 flex items-center justify-between">
                    <div className="text-sm">
                      <span className="text-slate-500 mr-1">/day</span>
                      <span className="font-semibold">
                        {formatRWF(v.base_daily_rate ?? v.price_per_day)}
                      </span>
                    </div>
                    <div className="text-xs text-slate-500 truncate">
                      {v.seats ? `${v.seats} seats` : ""}
                      {v.seats && v.transmission ? " • " : ""}
                      {v.transmission || ""}
                    </div>
                  </div>

                  <div className="mt-3 flex items-center gap-2">
                    <button
                      onClick={() => openEdit(v)}
                      className="flex-1 h-9 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => deleteVehicle(v)}
                      className="flex-1 h-9 rounded-lg border border-rose-300 text-rose-700 hover:bg-rose-50"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {meta && (
        <div className="p-3 flex items-center justify-between text-sm text-slate-500 border-t border-slate-200 rounded-2xl bg-white">
          <button
            disabled={!hasPrev}
            onClick={() => hasPrev && load(relativize(meta.links[0].url))}
            className="px-3 py-1.5 rounded-lg border border-slate-300 disabled:opacity-50"
          >
            Prev
          </button>
          <span>
            Page {meta.current_page} / {meta.last_page}
          </span>
          <button
            disabled={!nextUrl}
            onClick={() => nextUrl && load(relativize(nextUrl))}
            className="px-3 py-1.5 rounded-lg border border-slate-300 disabled:opacity-50"
          >
            Next
          </button>
        </div>
      )}

      {openWizard && (
        <div
          className="fixed inset-0 z-[80] grid place-items-center bg-black/60 backdrop-blur-sm p-2 sm:p-4"
          role="dialog"
          aria-modal="true"
        >
          <div className="relative w-full max-w-5xl max-h-[95vh] overflow-y-auto rounded-2xl bg-slate-50 shadow-2xl border border-slate-200">
            <button
              type="button"
              onClick={() => setOpenWizard(false)}
              className="absolute right-3 top-3 h-8 w-8 grid place-items-center rounded-full bg-white/80 text-slate-600 hover:bg-slate-100"
              aria-label="Close"
            >
              ✕
            </button>

            <div className="pt-10">
              <VehicleCreate
                key={`${wizardMode}-${wizardVehicle?.id || "new"}`}
                embedded
                mode={wizardMode}
                vehicleId={wizardVehicle?.id || null}
                resourceBase={base} // ✅ owner will now use /showroom/vehicles
                initialValues={
                  wizardVehicle ? mapVehicleToWizardForm(wizardVehicle) : null
                }
                onSuccess={() => {
                  setOpenWizard(false);
                  load();
                }}
                onCancel={() => setOpenWizard(false)}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
