// src/pages/admin/Admin.jsx
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

/* ✅ API base (/api) */
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

  return (list.length ? list.join(", ") : msg) || "Request failed. Please try again.";
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

  // wrapper like {success:true, data: ...}
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

  // paginator
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

  // fallback
  return { items: [], total: 0, meta: null };
}

function formatRWF(amount) {
  const n = Number(amount || 0);
  if (!Number.isFinite(n)) return "RWF 0";
  try {
    return new Intl.NumberFormat("en-RW", {
      style: "currency",
      currency: "RWF",
      maximumFractionDigits: 0,
    }).format(n);
  } catch {
    return `RWF ${Math.round(n).toLocaleString()}`;
  }
}

function parseAmount(row) {
  const v =
    row?.amount ??
    row?.total ??
    row?.total_amount ??
    row?.paid_amount ??
    row?.amount_paid ??
    row?.price ??
    row?.base_daily_rate ??
    0;
  const n = typeof v === "string" ? parseFloat(v) : Number(v);
  return Number.isFinite(n) ? n : 0;
}

function parseDate(row) {
  const raw =
    row?.paid_at ||
    row?.payment_date ||
    row?.updated_at ||
    row?.created_at ||
    null;
  const d = raw ? new Date(raw) : null;
  return d && !isNaN(d.getTime()) ? d : null;
}

function isPaidLike(row) {
  const s = String(row?.status || row?.payment_status || "").toLowerCase();
  const paidFlag = row?.is_paid ?? row?.paid ?? null;
  if (paidFlag === true) return true;
  if (!s) return true; // if no status field, count it (best-effort)
  return ["paid", "success", "succeeded", "completed", "complete"].includes(s);
}

function formatBookingId(id) {
  const n = Number(id);
  if (!Number.isFinite(n)) return String(id ?? "—");
  return `BK-${String(n).padStart(5, "0")}`;
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
    totalBookings: 0,
    revenueMtd: 0,
    vehiclesTotal: 0,
    vehiclesAvailable: 0,
    driversActive: 0,
  });

  const [recentBookings, setRecentBookings] = useState([]);

  useEffect(() => {
    let alive = true;

    (async () => {
      setLoading(true);
      setErrLine("");

      const errors = [];

      // --- Bookings total + recent
      const bookingsTask = (async () => {
        // total
        const totalRes = await apiRequest(`/bookings?per_page=1&page=1`, { token });
        const totalNorm = normalizeListResponse(totalRes);

        // recent list
        const recentRes = await apiRequest(`/bookings?per_page=5&page=1`, { token });
        const recentNorm = normalizeListResponse(recentRes);

        return {
          totalBookings: totalNorm.total || 0,
          recentBookings: recentNorm.items || [],
        };
      })();

      // --- Vehicles total + available
      const vehiclesTask = (async () => {
        const totalRes = await apiRequest(`/vehicles?per_page=1&page=1`, { token });
        const totalNorm = normalizeListResponse(totalRes);

        // VehicleController supports status as string or array
        const availRes = await apiRequest(`/vehicles?per_page=1&page=1&status=available`, { token });
        const availNorm = normalizeListResponse(availRes);

        return {
          vehiclesTotal: totalNorm.total || 0,
          vehiclesAvailable: availNorm.total || 0,
        };
      })();

      // --- Drivers active (best effort)
      const driversTask = (async () => {
        // try active first, fallback to total
        try {
          const activeRes = await apiRequest(`/drivers?per_page=1&page=1&status=active`, { token });
          const activeNorm = normalizeListResponse(activeRes);
          if (activeNorm.total > 0) return { driversActive: activeNorm.total };
        } catch {
          // ignore, fallback below
        }

        const totalRes = await apiRequest(`/drivers?per_page=1&page=1`, { token });
        const totalNorm = normalizeListResponse(totalRes);
        return { driversActive: totalNorm.total || 0 };
      })();

      // --- Revenue MTD from payments (best effort)
      const revenueTask = (async () => {
        // Pull a reasonable page size. If you have many payments, we can later add pagination.
        const payRes = await apiRequest(`/payments?per_page=200&page=1`, { token });
        const payNorm = normalizeListResponse(payRes);

        const now = new Date();
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

        let sum = 0;
        for (const p of payNorm.items || []) {
          if (!isPaidLike(p)) continue;
          const d = parseDate(p);
          if (!d) continue;
          if (d >= monthStart && d <= now) {
            sum += parseAmount(p);
          }
        }
        return { revenueMtd: sum };
      })();

      const results = await Promise.allSettled([
        bookingsTask,
        vehiclesTask,
        driversTask,
        revenueTask,
      ]);

      if (!alive) return;

      const next = {
        totalBookings: 0,
        revenueMtd: 0,
        vehiclesTotal: 0,
        vehiclesAvailable: 0,
        driversActive: 0,
      };

      let nextRecent = [];

      for (const r of results) {
        if (r.status === "fulfilled") {
          Object.assign(next, r.value || {});
          if (r.value?.recentBookings) nextRecent = r.value.recentBookings;
        } else {
          errors.push(r.reason?.message || "One dashboard request failed.");
        }
      }

      setStats(next);
      setRecentBookings(nextRecent);

      if (errors.length) {
        setErrLine(errors.join(" • "));
      }

      setLoading(false);
    })();

    return () => {
      alive = false;
    };
  }, [token]);

  const cards = [
    {
      label: "Total Bookings",
      value: loading ? "…" : String(stats.totalBookings ?? 0),
      diff: "",
      accent: "bg-cyan-500",
    },
    {
      label: "Revenue (MTD)",
      value: loading ? "…" : formatRWF(stats.revenueMtd),
      diff: "",
      accent: "bg-emerald-500",
    },
    {
      label: "Vehicles Available",
      value: loading
        ? "…"
        : `${stats.vehiclesAvailable ?? 0} / ${stats.vehiclesTotal ?? 0}`,
      diff: "",
      accent: "bg-violet-500",
    },
    {
      label: "Active Drivers",
      value: loading ? "…" : String(stats.driversActive ?? 0),
      diff: "",
      accent: "bg-amber-500",
    },
  ];

  const rows = (recentBookings || []).map((b) => {
    const id = b?.id ?? b?.booking_id ?? b?.code ?? "—";

    const customer =
      b?.customer?.name ||
      b?.customer_name ||
      b?.user?.name ||
      b?.client?.name ||
      b?.name ||
      "—";

    const vehicle =
      b?.vehicle?.display_name ||
      b?.vehicle?.plate_no ||
      b?.vehicle?.license_plate ||
      b?.vehicle_name ||
      b?.car?.name ||
      "—";

    const status =
      b?.status ||
      b?.payment_status ||
      b?.booking_status ||
      "—";

    const totalValue =
      b?.total_amount ??
      b?.amount ??
      b?.total ??
      b?.price ??
      b?.payment?.amount ??
      0;

    return {
      id,
      bookingLabel: typeof id === "number" || String(id).match(/^\d+$/) ? formatBookingId(id) : String(id),
      customer,
      vehicle,
      status: String(status),
      total: formatRWF(totalValue),
    };
  });

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Dashboard</h1>
          <p className="text-sm text-slate-500">Overview of fleet, bookings and revenue 📊</p>

          {errLine ? (
            <div className="mt-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
              ⚠️ {errLine}
            </div>
          ) : null}
        </div>

        {/* Logged in user */}
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

          <button
            onClick={() => nav("/admin/bookings")}
            className="inline-flex items-center h-10 px-4 rounded-lg bg-blue-600 text-white hover:bg-blue-700"
            title="Go to bookings"
          >
            Bookings
          </button>
        </div>
      </div>

      {/* KPI cards */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map((c) => (
          <div key={c.label} className="rounded-2xl border border-slate-200 bg-white p-4">
            <div className="flex items-center gap-3">
              <div className={`h-9 w-9 rounded-lg ${c.accent}`} />
              <div className="text-sm text-slate-500">{c.label}</div>
            </div>
            <div className="mt-3 flex items-end justify-between">
              <div className="text-2xl font-semibold">{c.value}</div>
              {c.diff ? (
                <div className="text-xs px-2 py-1 rounded bg-slate-900/5 text-slate-700">
                  {c.diff}
                </div>
              ) : (
                <div className="text-xs text-slate-400">{loading ? "loading…" : " "}</div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Recent bookings */}
      <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-200 font-medium flex items-center justify-between">
          <span>Recent Bookings</span>
          <span className="text-xs text-slate-500">
            {loading ? "Loading…" : `${rows.length} shown`}
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="text-left text-slate-500 bg-slate-50">
                <th className="px-4 py-2">Booking ID</th>
                <th className="px-4 py-2">Customer</th>
                <th className="px-4 py-2">Vehicle</th>
                <th className="px-4 py-2">Status</th>
                <th className="px-4 py-2">Total</th>
              </tr>
            </thead>

            <tbody>
              {!loading && rows.length === 0 ? (
                <tr className="border-t border-slate-100">
                  <td className="px-4 py-6 text-slate-500" colSpan={5}>
                    No bookings found.
                  </td>
                </tr>
              ) : null}

              {rows.map((r) => (
                <tr key={String(r.id)} className="border-t border-slate-100">
                  <td className="px-4 py-2 font-medium text-slate-800">{r.bookingLabel}</td>
                  <td className="px-4 py-2">{r.customer}</td>
                  <td className="px-4 py-2">{r.vehicle}</td>
                  <td className="px-4 py-2">
                    <span
                      className={[
                        "inline-flex items-center px-2 py-0.5 rounded text-xs border",
                        String(r.status).toLowerCase().includes("paid") &&
                          "bg-emerald-50 text-emerald-700 border-emerald-200",
                        String(r.status).toLowerCase().includes("pending") &&
                          "bg-amber-50 text-amber-700 border-amber-200",
                        String(r.status).toLowerCase().includes("cancel") &&
                          "bg-rose-50 text-rose-700 border-rose-200",
                        String(r.status).toLowerCase().includes("refund") &&
                          "bg-rose-50 text-rose-700 border-rose-200",
                        (!String(r.status).toLowerCase().includes("paid") &&
                          !String(r.status).toLowerCase().includes("pending") &&
                          !String(r.status).toLowerCase().includes("cancel") &&
                          !String(r.status).toLowerCase().includes("refund")) &&
                          "bg-slate-50 text-slate-700 border-slate-200",
                      ]
                        .filter(Boolean)
                        .join(" ")}
                    >
                      {r.status}
                    </span>
                  </td>
                  <td className="px-4 py-2">{r.total}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Placeholder */}
      <div className="rounded-2xl border border-dashed border-slate-300 p-6 text-slate-500 text-sm">
        📈 Charts area (we can add revenue trend, bookings per day, vehicle utilization, etc.)
      </div>
    </div>
  );
}