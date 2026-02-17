// src/pages/admin/Admin.jsx
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

/* ✅ API base */
const API_BASE =
  import.meta.env.VITE_API_BASE_URL ||
  import.meta.env.VITE_API_URL ||
  import.meta.env.VITE_API ||
  "";

/* ✅ token keys */
const TOKEN_KEYS = ["token", "access_token", "auth_token", "smartcar_token"];

function getStoredToken() {
  if (typeof window === "undefined") return "";
  for (const k of TOKEN_KEYS) {
    const v = window.localStorage.getItem(k);
    if (v && String(v).trim()) return String(v).trim();
  }
  return "";
}

function safeParse(s) {
  try {
    return s ? JSON.parse(s) : null;
  } catch {
    return null;
  }
}

function getRoleName(u) {
  if (!u) return "User";
  if (typeof u.role === "string") return u.role;
  if (u.role?.name) return u.role.name;
  if (u.role?.slug) return u.role.slug;
  if (Array.isArray(u.roles) && u.roles.length) {
    const r = u.roles[0];
    return typeof r === "string" ? r : r.name || r.slug || "User";
  }
  return "User";
}

function initials(nameOrEmail) {
  const s = String(nameOrEmail || "").trim();
  if (!s) return "U";
  const parts = s.split(" ").filter(Boolean);
  const a = parts[0]?.[0] || "U";
  const b = parts[1]?.[0] || "";
  return (a + b).toUpperCase();
}

function extractErrorMessage(json) {
  const msg =
    json?.message ||
    json?.error ||
    json?.data?.message ||
    json?.data?.error ||
    "";

  const errors = json?.errors || json?.data?.errors;
  const list =
    errors && typeof errors === "object"
      ? Object.values(errors).flat().filter(Boolean)
      : [];

  return (
    (list.length ? list.join(", ") : msg) ||
    "Request failed. Please try again."
  );
}

async function apiRequest(path, { method = "GET", token = "", body } = {}) {
  const api = String(API_BASE || "").replace(/\/+$/, "");
  if (!api) throw new Error("Missing API base URL. Set VITE_API_URL in .env");

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

/** Supports:
 * - Laravel paginate(): { data: [], total, current_page, last_page }
 * - wrapper: { success:true, data: ... }
 * - plain list: []
 */
function normalizeListResponse(json) {
  if (Array.isArray(json)) {
    return { items: json, total: json.length, meta: null };
  }

  if (json && typeof json === "object" && json.success === true && "data" in json) {
    const inner = json.data;
    if (Array.isArray(inner)) return { items: inner, total: inner.length, meta: null };
    if (inner && typeof inner === "object" && Array.isArray(inner.data)) {
      return {
        items: inner.data,
        total: Number(inner.total || inner.data.length || 0),
        meta: {
          current_page: Number(inner.current_page || 1),
          last_page: Number(inner.last_page || 1),
        },
      };
    }
    return { items: inner ? [inner] : [], total: inner ? 1 : 0, meta: null };
  }

  if (json && typeof json === "object" && Array.isArray(json.data)) {
    return {
      items: json.data,
      total: Number(json.total || json.data.length || 0),
      meta: {
        current_page: Number(json.current_page || 1),
        last_page: Number(json.last_page || 1),
      },
    };
  }

  return { items: [], total: 0, meta: null };
}

function fmtDate(x) {
  if (!x) return "—";
  const d = new Date(x);
  if (Number.isNaN(d.getTime())) return String(x);
  return d.toLocaleString();
}

export default function Admin() {
  const nav = useNavigate();
  const token = useMemo(() => getStoredToken(), []);

  const user = useMemo(() => {
    return (
      safeParse(localStorage.getItem("auth.user")) ||
      safeParse(localStorage.getItem("user")) ||
      null
    );
  }, []);

  const displayName = user?.name || user?.fullName || "Guest";
  const email = user?.email || "";
  const role = getRoleName(user);

  const [loading, setLoading] = useState(true);
  const [errLine, setErrLine] = useState("");

  const [stats, setStats] = useState({
    showroomsTotal: 0,
    vehiclesTotal: 0,
    vehiclesAvailable: 0,
    driversActive: 0,
  });

  const [recentShowrooms, setRecentShowrooms] = useState([]);

  useEffect(() => {
    let alive = true;

    (async () => {
      setLoading(true);
      setErrLine("");

      const errors = [];

      // --- Showrooms total + recent
      const showroomsTask = (async () => {
        const totalRes = await apiRequest(`/showroom/profiles?per_page=1&page=1`, { token });
        const totalNorm = normalizeListResponse(totalRes);

        const recentRes = await apiRequest(`/showroom/profiles?per_page=5&page=1`, { token });
        const recentNorm = normalizeListResponse(recentRes);

        return {
          showroomsTotal: totalNorm.total || 0,
          recentShowrooms: recentNorm.items || [],
        };
      })();

      // --- Vehicles total + available
      const vehiclesTask = (async () => {
        const totalRes = await apiRequest(`/vehicles?per_page=1&page=1`, { token });
        const totalNorm = normalizeListResponse(totalRes);

        const availRes = await apiRequest(`/vehicles?per_page=1&page=1&status=available`, { token });
        const availNorm = normalizeListResponse(availRes);

        return {
          vehiclesTotal: totalNorm.total || 0,
          vehiclesAvailable: availNorm.total || 0,
        };
      })();

      // --- Drivers active
      const driversTask = (async () => {
        try {
          const activeRes = await apiRequest(`/drivers?per_page=1&page=1&status=active`, { token });
          const activeNorm = normalizeListResponse(activeRes);
          if (activeNorm.total > 0) return { driversActive: activeNorm.total };
        } catch {
          // ignore
        }

        const totalRes = await apiRequest(`/drivers?per_page=1&page=1`, { token });
        const totalNorm = normalizeListResponse(totalRes);
        return { driversActive: totalNorm.total || 0 };
      })();

      const results = await Promise.allSettled([showroomsTask, vehiclesTask, driversTask]);

      if (!alive) return;

      const next = {
        showroomsTotal: 0,
        vehiclesTotal: 0,
        vehiclesAvailable: 0,
        driversActive: 0,
      };

      let nextRecentShowrooms = [];

      for (const r of results) {
        if (r.status === "fulfilled") {
          Object.assign(next, r.value || {});
          if (r.value?.recentShowrooms) nextRecentShowrooms = r.value.recentShowrooms;
        } else {
          errors.push(r.reason?.message || "One dashboard request failed.");
        }
      }

      setStats(next);
      setRecentShowrooms(nextRecentShowrooms);

      if (errors.length) setErrLine(errors.join(" • "));
      setLoading(false);
    })();

    return () => {
      alive = false;
    };
  }, [token]);

  const cards = [
    { label: "Total Showrooms", value: loading ? "…" : String(stats.showroomsTotal ?? 0), accent: "bg-cyan-500" },
    { label: "Total Vehicles", value: loading ? "…" : String(stats.vehiclesTotal ?? 0), accent: "bg-emerald-500" },
    { label: "Vehicles Available", value: loading ? "…" : String(stats.vehiclesAvailable ?? 0), accent: "bg-violet-500" },
    { label: "Active Drivers", value: loading ? "…" : String(stats.driversActive ?? 0), accent: "bg-amber-500" },
  ];

  const rows = (recentShowrooms || []).map((s) => {
    const ownerName =
      s?.owner?.name ||
      s?.user?.name ||
      s?.owner_name ||
      "—";

    const showroomName = s?.name || s?.title || "—";

    return {
      id: s?.id ?? `${showroomName}-${ownerName}`,
      showroomName,
      ownerName,
      createdAt: fmtDate(s?.created_at),
    };
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Admin Dashboard</h1>
          <p className="text-sm text-slate-500">
            Overview of showrooms, vehicles and drivers 🧾🚗
          </p>

          {errLine ? (
            <div className="mt-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
              ⚠️ {errLine}
            </div>
          ) : null}
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-3 py-2">
            <div className="h-9 w-9 rounded-full bg-slate-900 text-white grid place-items-center text-xs font-semibold">
              {initials(displayName || email)}
            </div>

            <div className="leading-tight">
              <div className="flex items-center gap-2">
                <p className="text-sm font-semibold text-slate-900 truncate max-w-[180px]">
                  {displayName}
                </p>
                <span className="text-[11px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
                  {String(role).toLowerCase()}
                </span>
              </div>

              {email ? (
                <p className="text-[11px] text-slate-500 truncate max-w-[220px]">{email}</p>
              ) : (
                <p className="text-[11px] text-slate-400">Not logged in</p>
              )}
            </div>
          </div>

          {/* ✅ Go to admin reports */}
          <button
            onClick={() => nav("/admin/reports")}
            className="h-10 px-4 rounded-lg bg-slate-900 text-white hover:bg-slate-800"
            title="Open Admin Reports"
          >
            📊 Reports
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map((c) => (
          <div key={c.label} className="rounded-2xl border border-slate-200 bg-white p-4">
            <div className="flex items-center gap-3">
              <div className={`h-9 w-9 rounded-lg ${c.accent}`} />
              <div className="text-sm text-slate-500">{c.label}</div>
            </div>
            <div className="mt-3 text-2xl font-semibold">{c.value}</div>
          </div>
        ))}
      </div>

      {/* Recent Showrooms */}
      <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-200 font-medium flex items-center justify-between">
          <span>Recent Showrooms</span>
          <span className="text-xs text-slate-500">
            {loading ? "Loading…" : `${rows.length} shown`}
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="text-left text-slate-500 bg-slate-50">
                <th className="px-4 py-2">Showroom</th>
                <th className="px-4 py-2">Owner</th>
                <th className="px-4 py-2">Created</th>
              </tr>
            </thead>

            <tbody>
              {!loading && rows.length === 0 ? (
                <tr className="border-t border-slate-100">
                  <td className="px-4 py-6 text-slate-500" colSpan={3}>
                    No showrooms found.
                  </td>
                </tr>
              ) : null}

              {rows.map((r) => (
                <tr key={String(r.id)} className="border-t border-slate-100">
                  <td className="px-4 py-2 font-medium text-slate-800">{r.showroomName}</td>
                  <td className="px-4 py-2">{r.ownerName}</td>
                  <td className="px-4 py-2">{r.createdAt}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Placeholder */}
      <div className="rounded-2xl border border-dashed border-slate-300 p-6 text-slate-500 text-sm">
         Charts area (we can add: vehicles per showroom, utilization, top owners, etc.)
      </div>
    </div>
  );
}