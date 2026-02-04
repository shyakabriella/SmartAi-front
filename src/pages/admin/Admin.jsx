// src/pages/admin/Admin.jsx
import { useMemo } from "react";

function safeParse(s) {
  try {
    return s ? JSON.parse(s) : null;
  } catch {
    return null;
  }
}

function getRoleName(u) {
  if (!u) return "User";

  // role column: "owner"
  if (typeof u.role === "string") return u.role;

  // role object
  if (u.role?.name) return u.role.name;
  if (u.role?.slug) return u.role.slug;

  // spatie roles array
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

export default function Admin() {
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

  const cards = [
    { label: "Total Bookings", value: "12,845", diff: "+4.2%", accent: "bg-cyan-500" },
    { label: "Revenue (MTD)", value: "RWF 82,430,000", diff: "+2.1%", accent: "bg-emerald-500" },
    { label: "Vehicles Available", value: "124 / 160", diff: "-", accent: "bg-violet-500" },
    { label: "Active Drivers", value: "65", diff: "+6", accent: "bg-amber-500" },
  ];

  const rows = [
    { id: "SC-2025-0008", customer: "Alice Client", vehicle: "SUV", status: "Paid", total: "RWF 86,000" },
    { id: "SC-2025-0007", customer: "John Doe", vehicle: "Sedan", status: "Pending", total: "RWF 45,500" },
    { id: "SC-2025-0006", customer: "Mary K.", vehicle: "Luxury", status: "Paid", total: "RWF 120,000" },
    { id: "SC-2025-0005", customer: "Robert L.", vehicle: "EV", status: "Refunded", total: "RWF 0" },
    { id: "SC-2025-0004", customer: "Grace B.", vehicle: "SUV", status: "Paid", total: "RWF 68,900" },
  ];

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Dashboard</h1>
          <p className="text-sm text-slate-500">
            Overview of fleet, bookings and revenue.
          </p>
        </div>

        {/* ✅ Logged in user */}
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
                <p className="text-[11px] text-slate-500 truncate max-w-[220px]">
                  {email}
                </p>
              ) : (
                <p className="text-[11px] text-slate-400">Not logged in</p>
              )}
            </div>
          </div>

          <button className="inline-flex items-center h-10 px-4 rounded-lg bg-blue-600 text-white hover:bg-blue-700">
            New Booking
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
              <div className="text-xs px-2 py-1 rounded bg-slate-900/5 text-slate-700">
                {c.diff}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Recent bookings */}
      <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-200 font-medium">
          Recent Bookings
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
              {rows.map((r) => (
                <tr key={r.id} className="border-t border-slate-100">
                  <td className="px-4 py-2 font-medium text-slate-800">{r.id}</td>
                  <td className="px-4 py-2">{r.customer}</td>
                  <td className="px-4 py-2">{r.vehicle}</td>
                  <td className="px-4 py-2">
                    <span
                      className={[
                        "inline-flex items-center px-2 py-0.5 rounded text-xs",
                        r.status === "Paid" && "bg-emerald-50 text-emerald-700",
                        r.status === "Pending" && "bg-amber-50 text-amber-700",
                        r.status === "Refunded" && "bg-rose-50 text-rose-700",
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
        Charts area (add revenue trends, utilization, etc.)
      </div>
    </div>
  );
}
