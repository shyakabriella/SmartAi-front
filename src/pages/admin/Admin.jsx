// src/pages/admin/Admin.jsx
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

const API_BASE =
  import.meta.env.VITE_API_BASE_URL ||
  import.meta.env.VITE_API_URL ||
  import.meta.env.VITE_API ||
  "";

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

function fmtDay(x) {
  if (!x) return "—";
  const d = new Date(x);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function buildDailyChart(items = []) {
  const map = new Map();
  items.forEach((item) => {
    const key = fmtDay(item?.created_at);
    if (key === "—") return;
    map.set(key, (map.get(key) || 0) + 1);
  });
  return Array.from(map.entries()).map(([label, value]) => ({ label, value }));
}

function StatCard({ label, value, accent, hint }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-center gap-3">
        <div className={`h-10 w-10 rounded-xl ${accent}`} />
        <div className="min-w-0">
          <div className="text-sm font-medium text-slate-500">{label}</div>
          {hint ? <div className="text-[11px] text-slate-400">{hint}</div> : null}
        </div>
      </div>
      <div className="mt-4 text-3xl font-bold tracking-tight text-slate-900">{value}</div>
    </div>
  );
}

function BarDiagram({ title, items = [] }) {
  const max = Math.max(...items.map((i) => Number(i.value || 0)), 1);

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-base font-semibold text-slate-900">{title}</h3>
        <span className="text-xs text-slate-500">Diagram</span>
      </div>

      <div className="space-y-4">
        {items.map((item) => {
          const width = `${Math.max((Number(item.value || 0) / max) * 100, 4)}%`;
          return (
            <div key={item.label}>
              <div className="mb-1 flex items-center justify-between gap-3 text-sm">
                <span className="text-slate-600">{item.label}</span>
                <span className="font-semibold text-slate-900">{item.value}</span>
              </div>
              <div className="h-3 overflow-hidden rounded-full bg-slate-100">
                <div
                  className={`h-full rounded-full ${item.accent}`}
                  style={{ width }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function RingDiagram({ title, value, total, colorClass = "bg-emerald-500", subtitle }) {
  const safeTotal = Math.max(Number(total || 0), 1);
  const safeValue = Math.min(Number(value || 0), safeTotal);
  const percent = Math.round((safeValue / safeTotal) * 100);
  const angle = `${percent}%`;

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-base font-semibold text-slate-900">{title}</h3>
        <span className="text-xs text-slate-500">{percent}%</span>
      </div>

      <div className="flex flex-col items-center justify-center gap-4 md:flex-row">
        <div
          className="relative h-36 w-36 rounded-full"
          style={{
            background: `conic-gradient(${colorClass === "bg-emerald-500" ? "#10b981" : colorClass === "bg-violet-500" ? "#8b5cf6" : "#06b6d4"} ${angle}, #e5e7eb 0)`,
          }}
        >
          <div className="absolute inset-4 grid place-items-center rounded-full bg-white text-center">
            <div>
              <div className="text-2xl font-bold text-slate-900">{safeValue}</div>
              <div className="text-xs text-slate-500">of {total}</div>
            </div>
          </div>
        </div>

        <div className="space-y-2 text-sm">
          <div className="font-semibold text-slate-900">{subtitle}</div>
          <div className="text-slate-600">Available: {safeValue}</div>
          <div className="text-slate-600">Other: {Math.max(Number(total || 0) - safeValue, 0)}</div>
        </div>
      </div>
    </div>
  );
}

function MiniTimeline({ title, items = [] }) {
  const max = Math.max(...items.map((i) => Number(i.value || 0)), 1);

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-base font-semibold text-slate-900">{title}</h3>
        <span className="text-xs text-slate-500">Recent activity</span>
      </div>

      {items.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-sm text-slate-500">
          No recent data to draw yet.
        </div>
      ) : (
        <div className="flex items-end gap-3">
          {items.map((item) => {
            const h = Math.max((Number(item.value || 0) / max) * 140, 12);
            return (
              <div key={item.label} className="flex flex-1 flex-col items-center gap-2">
                <div className="text-xs font-semibold text-slate-700">{item.value}</div>
                <div className="flex h-40 items-end">
                  <div
                    className="w-10 rounded-t-2xl bg-cyan-500"
                    style={{ height: `${h}px` }}
                  />
                </div>
                <div className="text-[11px] text-slate-500">{item.label}</div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
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
    vehiclesBusy: 0,
    driversActive: 0,
    customersTotal: 0,
    bookingsTotal: 0,
  });

  const [recentShowrooms, setRecentShowrooms] = useState([]);
  const [recentCustomers, setRecentCustomers] = useState([]);

  useEffect(() => {
    let alive = true;

    (async () => {
      setLoading(true);
      setErrLine("");

      const errors = [];

      const showroomsTask = (async () => {
        const totalRes = await apiRequest(`/showroom/profiles?per_page=1&page=1`, { token });
        const totalNorm = normalizeListResponse(totalRes);

        const recentRes = await apiRequest(`/showroom/profiles?per_page=8&page=1`, { token });
        const recentNorm = normalizeListResponse(recentRes);

        return {
          showroomsTotal: totalNorm.total || 0,
          recentShowrooms: recentNorm.items || [],
        };
      })();

      const vehiclesTask = (async () => {
        const totalRes = await apiRequest(`/vehicles?per_page=1&page=1`, { token });
        const totalNorm = normalizeListResponse(totalRes);

        let available = 0;
        try {
          const availRes = await apiRequest(`/vehicles?per_page=1&page=1&status=available`, { token });
          const availNorm = normalizeListResponse(availRes);
          available = availNorm.total || 0;
        } catch {
          available = 0;
        }

        return {
          vehiclesTotal: totalNorm.total || 0,
          vehiclesAvailable: available,
          vehiclesBusy: Math.max((totalNorm.total || 0) - available, 0),
        };
      })();

      const driversTask = (async () => {
        try {
          const activeRes = await apiRequest(`/drivers?per_page=1&page=1&status=active`, { token });
          const activeNorm = normalizeListResponse(activeRes);
          if (activeNorm.total > 0) return { driversActive: activeNorm.total };
        } catch {}

        const totalRes = await apiRequest(`/drivers?per_page=1&page=1`, { token });
        const totalNorm = normalizeListResponse(totalRes);
        return { driversActive: totalNorm.total || 0 };
      })();

      const customersTask = (async () => {
        const totalRes = await apiRequest(`/customers?per_page=1&page=1`, { token });
        const totalNorm = normalizeListResponse(totalRes);

        let recent = [];
        try {
          const recentRes = await apiRequest(`/customers?per_page=8&page=1`, { token });
          recent = normalizeListResponse(recentRes).items || [];
        } catch {}

        return {
          customersTotal: totalNorm.total || 0,
          recentCustomers: recent,
        };
      })();

      const bookingsTask = (async () => {
        const totalRes = await apiRequest(`/bookings?per_page=1&page=1`, { token });
        const totalNorm = normalizeListResponse(totalRes);
        return { bookingsTotal: totalNorm.total || 0 };
      })();

      const results = await Promise.allSettled([
        showroomsTask,
        vehiclesTask,
        driversTask,
        customersTask,
        bookingsTask,
      ]);

      if (!alive) return;

      const next = {
        showroomsTotal: 0,
        vehiclesTotal: 0,
        vehiclesAvailable: 0,
        vehiclesBusy: 0,
        driversActive: 0,
        customersTotal: 0,
        bookingsTotal: 0,
      };

      let nextShowrooms = [];
      let nextCustomers = [];

      for (const r of results) {
        if (r.status === "fulfilled") {
          Object.assign(next, r.value || {});
          if (r.value?.recentShowrooms) nextShowrooms = r.value.recentShowrooms;
          if (r.value?.recentCustomers) nextCustomers = r.value.recentCustomers;
        } else {
          errors.push(r.reason?.message || "One dashboard request failed.");
        }
      }

      setStats(next);
      setRecentShowrooms(nextShowrooms);
      setRecentCustomers(nextCustomers);
      if (errors.length) setErrLine(errors.join(" • "));
      setLoading(false);
    })();

    return () => {
      alive = false;
    };
  }, [token]);

  const cards = [
    {
      label: "Total Showrooms",
      value: loading ? "…" : String(stats.showroomsTotal),
      accent: "bg-cyan-500",
      hint: "Registered showroom profiles",
    },
    {
      label: "Total Vehicles",
      value: loading ? "…" : String(stats.vehiclesTotal),
      accent: "bg-emerald-500",
      hint: "All registered cars",
    },
    {
      label: "Available Vehicles",
      value: loading ? "…" : String(stats.vehiclesAvailable),
      accent: "bg-violet-500",
      hint: "Ready for booking",
    },
    {
      label: "Busy Vehicles",
      value: loading ? "…" : String(stats.vehiclesBusy),
      accent: "bg-amber-500",
      hint: "Not currently available",
    },
    {
      label: "Active Drivers",
      value: loading ? "…" : String(stats.driversActive),
      accent: "bg-rose-500",
      hint: "Driver records",
    },
    {
      label: "Customers",
      value: loading ? "…" : String(stats.customersTotal),
      accent: "bg-sky-500",
      hint: "Saved customer records",
    },
    {
      label: "Bookings",
      value: loading ? "…" : String(stats.bookingsTotal),
      accent: "bg-indigo-500",
      hint: "All booking records",
    },
  ];

  const diagramItems = [
    { label: "Showrooms", value: stats.showroomsTotal, accent: "bg-cyan-500" },
    { label: "Vehicles", value: stats.vehiclesTotal, accent: "bg-emerald-500" },
    { label: "Available", value: stats.vehiclesAvailable, accent: "bg-violet-500" },
    { label: "Busy", value: stats.vehiclesBusy, accent: "bg-amber-500" },
    { label: "Drivers", value: stats.driversActive, accent: "bg-rose-500" },
    { label: "Customers", value: stats.customersTotal, accent: "bg-sky-500" },
    { label: "Bookings", value: stats.bookingsTotal, accent: "bg-indigo-500" },
  ];

  const showroomRows = (recentShowrooms || []).map((s) => ({
    id: s?.id ?? Math.random(),
    showroomName: s?.name || s?.title || "—",
    ownerName: s?.owner?.name || s?.user?.name || s?.owner_name || "—",
    createdAt: fmtDate(s?.created_at),
  }));

  const customerRows = (recentCustomers || []).map((c) => ({
    id: c?.id ?? Math.random(),
    name: c?.user?.name || c?.name || c?.customer_name || "—",
    email: c?.user?.email || c?.email || "—",
    createdAt: fmtDate(c?.created_at),
  }));

  const showroomChart = buildDailyChart(recentShowrooms);
  const customerChart = buildDailyChart(recentCustomers);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Admin Dashboard</h1>
          <p className="text-sm text-slate-500">
            Overview of showrooms, vehicles, drivers, customers and bookings 📊
          </p>

          {errLine ? (
            <div className="mt-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
              ⚠️ {errLine}
            </div>
          ) : null}
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-3 py-2">
            <div className="grid h-9 w-9 place-items-center rounded-full bg-slate-900 text-xs font-semibold text-white">
              {initials(displayName || email)}
            </div>

            <div className="leading-tight">
              <div className="flex items-center gap-2">
                <p className="max-w-[180px] truncate text-sm font-semibold text-slate-900">
                  {displayName}
                </p>
                <span className="rounded-full border border-slate-200 bg-slate-100 px-2 py-0.5 text-[11px] text-slate-700">
                  {String(role).toLowerCase()}
                </span>
              </div>

              {email ? (
                <p className="max-w-[220px] truncate text-[11px] text-slate-500">{email}</p>
              ) : (
                <p className="text-[11px] text-slate-400">Not logged in</p>
              )}
            </div>
          </div>

          <button
            onClick={() => nav("/admin/reports")}
            className="h-10 rounded-lg bg-slate-900 px-4 text-white hover:bg-slate-800"
            title="Open Admin Reports"
          >
            📊 Reports
          </button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4 2xl:grid-cols-7">
        {cards.map((card) => (
          <StatCard
            key={card.label}
            label={card.label}
            value={card.value}
            accent={card.accent}
            hint={card.hint}
          />
        ))}
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.4fr_1fr]">
        <BarDiagram title="System Overview Diagram" items={diagramItems} />

        <RingDiagram
          title="Vehicle Availability"
          value={stats.vehiclesAvailable}
          total={stats.vehiclesTotal}
          colorClass="bg-emerald-500"
          subtitle="Availability ratio"
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <MiniTimeline title="Recent Showroom Creation Diagram" items={showroomChart} />
        <MiniTimeline title="Recent Customer Creation Diagram" items={customerChart} />
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
          <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3 font-medium">
            <span>Recent Showrooms</span>
            <span className="text-xs text-slate-500">
              {loading ? "Loading…" : `${showroomRows.length} shown`}
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="bg-slate-50 text-left text-slate-500">
                  <th className="px-4 py-2">Showroom</th>
                  <th className="px-4 py-2">Owner</th>
                  <th className="px-4 py-2">Created</th>
                </tr>
              </thead>
              <tbody>
                {!loading && showroomRows.length === 0 ? (
                  <tr className="border-t border-slate-100">
                    <td className="px-4 py-6 text-slate-500" colSpan={3}>
                      No showrooms found.
                    </td>
                  </tr>
                ) : null}

                {showroomRows.map((row) => (
                  <tr key={String(row.id)} className="border-t border-slate-100">
                    <td className="px-4 py-2 font-medium text-slate-800">{row.showroomName}</td>
                    <td className="px-4 py-2">{row.ownerName}</td>
                    <td className="px-4 py-2">{row.createdAt}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
          <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3 font-medium">
            <span>Recent Customers</span>
            <span className="text-xs text-slate-500">
              {loading ? "Loading…" : `${customerRows.length} shown`}
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="bg-slate-50 text-left text-slate-500">
                  <th className="px-4 py-2">Customer</th>
                  <th className="px-4 py-2">Email</th>
                  <th className="px-4 py-2">Created</th>
                </tr>
              </thead>
              <tbody>
                {!loading && customerRows.length === 0 ? (
                  <tr className="border-t border-slate-100">
                    <td className="px-4 py-6 text-slate-500" colSpan={3}>
                      No customers found.
                    </td>
                  </tr>
                ) : null}

                {customerRows.map((row) => (
                  <tr key={String(row.id)} className="border-t border-slate-100">
                    <td className="px-4 py-2 font-medium text-slate-800">{row.name}</td>
                    <td className="px-4 py-2">{row.email}</td>
                    <td className="px-4 py-2">{row.createdAt}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}