// src/pages/admin/showrooms/ShowroomVehiclesPage.jsx
import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";

const API_BASE =
  (import.meta.env.VITE_API_BASE_URL ||
    import.meta.env.VITE_API_URL ||
    import.meta.env.VITE_API ||
    "/api")
    .trim()
    .replace(/\/+$/, "");

// ✅ Put your backend origin here (NO /api)
// Example in .env: VITE_BACKEND_URL=http://127.0.0.1:8000
const BACKEND_ORIGIN =
  (import.meta.env.VITE_BACKEND_URL || "").trim().replace(/\/+$/, "");

const TOKEN_KEYS = ["token", "access_token", "auth_token", "smartcar_token"];

function getStoredToken() {
  if (typeof window === "undefined") return "";
  for (const k of TOKEN_KEYS) {
    const v = window.localStorage.getItem(k);
    if (v && String(v).trim()) return String(v).trim();
  }
  return "";
}

function extractErrorMessage(json) {
  const msg =
    json?.message || json?.error || json?.data?.message || json?.data?.error || "";
  const errors = json?.errors || json?.data?.errors;
  const list =
    errors && typeof errors === "object"
      ? Object.values(errors).flat().filter(Boolean)
      : [];
  return (list.length ? list.join(", ") : msg) || "Request failed. Please try again.";
}

async function apiRequest(path, { method = "GET", token = "", body } = {}) {
  const api = String(API_BASE || "").replace(/\/+$/, "");
  if (!api) throw new Error("Missing API base URL. Set VITE_API_URL in .env (or use /api proxy).");

  const res = await fetch(`${api}${path}`, {
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
    err.json = json;
    throw err;
  }
  return json;
}

function pickData(payload) {
  if (!payload) return null;
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.data)) return payload.data;
  if (payload?.data && typeof payload.data === "object") return payload.data;
  return payload;
}

function firstString(...vals) {
  for (const v of vals) {
    if (typeof v === "string" && v.trim()) return v.trim();
  }
  return "";
}

function extractImageUrl(obj) {
  if (!obj || typeof obj !== "object") return "";
  return firstString(
    obj.image_url,
    obj.url,
    obj.path,
    obj.src,
    obj.public_url,
    obj.full_url,
    obj.fullUrl,
    obj.image,
    obj.file,
    obj.location
  );
}

function extractImageFromAny(json) {
  const data = pickData(json);
  if (!data) return "";

  if (Array.isArray(data)) {
    const primary =
      data.find((x) => x?.is_primary || x?.primary) ||
      data.find((x) => x?.isPrimary) ||
      data[0];
    return extractImageUrl(primary);
  }

  if (typeof data === "object") return extractImageUrl(data);
  return "";
}

/**
 * ✅ Convert relative /storage/... to absolute backend url
 * Priority:
 * 1) already absolute
 * 2) BACKEND_ORIGIN (best)
 * 3) derive origin from absolute API_BASE
 * 4) fallback to frontend origin (needs /storage proxy)
 */
function toAbsoluteUrl(url) {
  if (!url) return "";
  const s = String(url).trim();
  if (!s) return "";

  if (s.startsWith("http://") || s.startsWith("https://")) return s;

  if (BACKEND_ORIGIN) {
    return s.startsWith("/") ? `${BACKEND_ORIGIN}${s}` : `${BACKEND_ORIGIN}/${s}`;
  }

  if (API_BASE.startsWith("http://") || API_BASE.startsWith("https://")) {
    const origin = API_BASE.replace(/\/api\/?$/, "");
    return s.startsWith("/") ? `${origin}${s}` : `${origin}/${s}`;
  }

  const origin = typeof window !== "undefined" ? window.location.origin : "";
  return s.startsWith("/") ? `${origin}${s}` : `${origin}/${s}`;
}

const STATUSES = ["available", "in_service", "booked", "maintenance", "inactive"];

export default function ShowroomVehiclesPage() {
  const nav = useNavigate();
  const location = useLocation();
  const { showroomId } = useParams();
  const [token] = useState(() => getStoredToken());

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [showroom, setShowroom] = useState(() => location.state?.showroom || null);

  const [ownerId, setOwnerId] = useState(() => {
    const s = location.state?.showroom;
    if (s?.owner_id) return Number(s.owner_id);
    const n = Number(showroomId);
    return Number.isFinite(n) ? n : null;
  });

  const [vehicles, setVehicles] = useState([]);
  const [page, setPage] = useState(1);
  const [meta, setMeta] = useState({ current_page: 1, last_page: 1, total: 0 });

  const [q, setQ] = useState("");
  const [status, setStatus] = useState("");

  // ✅ vehicleId -> image_url (string). undefined = not fetched yet
  const [imageMap, setImageMap] = useState({}); // { [id]: string | "" }

  useEffect(() => setPage(1), [showroomId]);

  // Load showroom profile
  useEffect(() => {
    (async () => {
      if (showroom?.owner_id) return;

      const sid = Number(showroomId);
      if (!Number.isFinite(sid) || sid <= 0) return;

      try {
        const tryOne = await apiRequest(`/showroom/profiles?owner_id=${sid}`, { token });
        const list1 = Array.isArray(tryOne?.data) ? tryOne.data : [];
        if (list1.length > 0) {
          setShowroom(list1[0]);
          setOwnerId(Number(list1[0]?.owner_id || sid));
          return;
        }
      } catch {}

      try {
        const all = await apiRequest(`/showroom/profiles`, { token });
        const list2 = Array.isArray(all?.data) ? all.data : [];
        const byProfileId = list2.find((p) => Number(p?.id) === sid);
        const byOwnerId = list2.find((p) => Number(p?.owner_id) === sid);
        const found = byProfileId || byOwnerId;

        if (found) {
          setShowroom(found);
          setOwnerId(Number(found?.owner_id || sid));
        } else {
          setOwnerId(sid);
        }
      } catch {
        setOwnerId(sid);
      }
    })();
  }, [token, showroomId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Load vehicles list
  useEffect(() => {
    (async () => {
      if (!ownerId) return;

      setError("");
      setLoading(true);

      try {
        const qs = new URLSearchParams();
        qs.set("user_id", String(ownerId));
        qs.set("page", String(page));

        const json = await apiRequest(`/showroom/vehicles?${qs.toString()}`, { token });
        const payload = json && typeof json === "object" ? json : {};
        const list = Array.isArray(payload?.data) ? payload.data : [];

        setVehicles(list);
        setMeta({
          current_page: Number(payload?.current_page || 1),
          last_page: Number(payload?.last_page || 1),
          total: Number(payload?.total || list.length || 0),
        });
      } catch (e) {
        setError(e?.message || "Failed to load vehicles.");
        setVehicles([]);
        setMeta({ current_page: 1, last_page: 1, total: 0 });
      } finally {
        setLoading(false);
      }
    })();
  }, [token, ownerId, page]);

  // ✅ Fetch image for each vehicle:
  // 1) /vehicles/:id/images/primary
  // 2) if empty, try /vehicles/:id/images (pick first/primary)
  // 3) if still empty, keep "" => "No image"
  useEffect(() => {
    let alive = true;
    if (!vehicles || vehicles.length === 0) return;

    (async () => {
      const ids = vehicles.map((v) => v?.id).filter(Boolean);

      // fetch only ids we never tried before
      const missing = ids.filter((id) => imageMap[id] === undefined);
      if (missing.length === 0) return;

      const results = await Promise.all(
        missing.map(async (id) => {
          try {
            const primaryJson = await apiRequest(`/vehicles/${id}/images/primary`, { token });
            let url = extractImageFromAny(primaryJson);

            // fallback to "all images"
            if (!url) {
              try {
                const allJson = await apiRequest(`/vehicles/${id}/images`, { token });
                url = extractImageFromAny(allJson);
              } catch {
                // ignore
              }
            }

            return [id, url || ""];
          } catch {
            return [id, ""];
          }
        })
      );

      if (!alive) return;

      setImageMap((prev) => {
        const next = { ...prev };
        for (const [id, url] of results) next[id] = url || "";
        return next;
      });
    })();

    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vehicles, token, imageMap]);

  const filtered = useMemo(() => {
    const term = String(q || "").trim().toLowerCase();

    return (vehicles || []).filter((v) => {
      const plate = String(v?.plate_no || v?.license_plate || "").toLowerCase();
      const make = String(v?.make || "").toLowerCase();
      const model = String(v?.model || "").toLowerCase();
      const st = String(v?.status || "").toLowerCase();
      const type = String(v?.type?.name || v?.type?.title || "").toLowerCase();

      const okTerm =
        !term ||
        plate.includes(term) ||
        make.includes(term) ||
        model.includes(term) ||
        st.includes(term) ||
        type.includes(term) ||
        String(v?.id ?? "").includes(term);

      const okStatus = !status || st === status;

      return okTerm && okStatus;
    });
  }, [vehicles, q, status]);

  const showroomName = showroom?.name || `Showroom (Owner ID: ${ownerId ?? showroomId})`;

  return (
    <div className="p-6">
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <button
            onClick={() => nav(-1)}
            className="mb-2 inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
          >
            ← Back
          </button>

          <h1 className="text-xl font-semibold text-slate-900">{showroomName}</h1>
          <p className="text-sm text-slate-500">
            Vehicles from <b>/api/showroom/vehicles?user_id={ownerId ?? showroomId}</b> 🚗
          </p>

          {!BACKEND_ORIGIN && API_BASE === "/api" && (
            <p className="mt-1 text-xs text-amber-600">
              ⚠️ Tip: Set <b>VITE_BACKEND_URL</b> or proxy <b>/storage</b> in Vite for images.
            </p>
          )}
        </div>

        <div className="flex w-full flex-col gap-2 sm:w-[520px] sm:flex-row">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search cars (plate, make, model, status, id)..."
            className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-emerald-400"
          />

          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-emerald-400 sm:w-48"
          >
            <option value="">All status</option>
            {STATUSES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>
      </div>

      {loading && (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-600">
          Loading cars…
        </div>
      )}

      {!loading && error && (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
          ❌ {error}
          <div className="mt-1 text-xs text-rose-600">
            Check: (1) ownerId correct, (2) token valid, (3) image routes exist
          </div>
        </div>
      )}

      {!loading && !error && filtered.length === 0 && (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-600">
          No vehicles found for this showroom.
        </div>
      )}

      {!loading && !error && filtered.length > 0 && (
        <>
          <div className="mb-4 text-xs text-slate-500">
            Showing <b>{filtered.length}</b> vehicle(s) • Total on server: <b>{meta.total}</b>
          </div>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {filtered.map((v) => {
              const id = v?.id;
              const plate = v?.plate_no || v?.license_plate || "—";
              const title = `${v?.make || ""} ${v?.model || ""}`.trim() || "Vehicle";
              const yr = v?.year ? `(${v.year})` : "";
              const st = v?.status || "—";
              const type = v?.type?.name || v?.type?.title || "—";
              const loc = v?.location?.name || v?.location?.title || "—";
              const price = v?.base_daily_rate ?? v?.price_per_day ?? null;

              const raw = id ? imageMap[id] : "";
              const imgUrl = raw ? toAbsoluteUrl(raw) : "";

              return (
                <div
                  key={id}
                  className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
                >
                  <div className="aspect-[16/10] w-full bg-slate-100">
                    {imgUrl ? (
                      <img
                        src={imgUrl}
                        alt={title}
                        className="h-full w-full object-cover"
                        onError={() => {
                          // ✅ clean fallback (no broken icon)
                          if (!id) return;
                          setImageMap((prev) => ({ ...prev, [id]: "" }));
                        }}
                      />
                    ) : (
                      <div className="grid h-full w-full place-items-center text-sm text-slate-400">
                        No image
                      </div>
                    )}
                  </div>

                  <div className="p-4">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="text-sm font-semibold text-slate-900">
                          {title} <span className="text-slate-400">{yr}</span>
                        </div>
                        <div className="mt-1 text-xs text-slate-500">
                          Plate: <b>{plate}</b> • Type: <b>{type}</b>
                        </div>
                      </div>

                      <div className="rounded-full bg-slate-100 px-3 py-1 text-[11px] font-semibold text-slate-700">
                        {st}
                      </div>
                    </div>

                    <div className="mt-3 text-xs text-slate-600">
                      📍 {loc}
                      {price !== null ? (
                        <span>
                          {" "}
                          • 💰 <b>{price}</b>/day
                        </span>
                      ) : null}
                    </div>

                    <div className="mt-4 flex items-center justify-between">
                      <div className="text-[11px] text-slate-400">Vehicle ID: {id}</div>

                      <button
                        type="button"
                        onClick={() => navigator.clipboard?.writeText(String(id))}
                        className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                      >
                        Copy ID
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mt-6 flex items-center justify-between rounded-2xl border border-slate-200 bg-white p-4">
            <div className="text-xs text-slate-600">
              Page <b>{meta.current_page}</b> of <b>{meta.last_page}</b>
            </div>

            <div className="flex gap-2">
              <button
                disabled={meta.current_page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 disabled:opacity-50"
              >
                ← Prev
              </button>
              <button
                disabled={meta.current_page >= meta.last_page}
                onClick={() => setPage((p) => p + 1)}
                className="rounded-lg bg-emerald-600 px-3 py-2 text-xs font-semibold text-white disabled:opacity-50"
              >
                Next →
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}