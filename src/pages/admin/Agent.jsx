// src/pages/admin/Agent.jsx
import { useEffect, useMemo } from "react";
import { NavLink } from "react-router-dom";

export default function Agent() {
  useEffect(() => {
    document.title = "Agent Dashboard • SmartCar AI";
  }, []);

  // Try both keys you've used elsewhere
  const user =
    useMemo(() => {
      try {
        return (
          JSON.parse(localStorage.getItem("auth.user")) ||
          JSON.parse(localStorage.getItem("auth_user")) ||
          null
        );
      } catch {
        return null;
      }
    }, []) || {};

  const roles =
    useMemo(() => {
      try {
        return JSON.parse(localStorage.getItem("auth.roles")) || [];
      } catch {
        return [];
      }
    }, []) || (user?.roles?.map(r => r.name) ?? []);

  return (
    <div className="p-6">
      {/* Hero */}
      <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-gradient-to-br from-cyan-50 to-blue-50">
        <div className="absolute -top-10 -right-10 h-40 w-40 rounded-full bg-cyan-200/40 blur-2xl" />
        <div className="relative p-6">
          <h1 className="text-2xl md:text-3xl font-semibold tracking-tight text-slate-900">
            Agent Dashboard
          </h1>
          <p className="mt-1 text-slate-600">
            Welcome{user?.name ? `, ${user.name}` : ""}!{" "}
            <span className="text-slate-500">
              {roles?.length ? `Role: ${roles.join(", ")}` : "Role: agent"}
            </span>
          </p>
        </div>
      </div>

      {/* Quick actions */}
      <section className="mt-6">
        <h2 className="text-sm font-semibold text-slate-500 mb-3">Quick actions</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <QuickAction to="/admin/customers/new" emoji="🧑‍💼" title="Create Customer" desc="Add a new customer profile" />
          <QuickAction to="/admin/drivers/new" emoji="🚘" title="Add Driver" desc="Register a new driver" />
          <QuickAction to="/admin/vehicles" emoji="🚗" title="Manage Vehicles" desc="View and edit vehicles" />
          <QuickAction to="/admin/bookings" emoji="📅" title="Bookings" desc="View upcoming bookings" />
        </div>
      </section>

      {/* KPIs */}
      <section className="mt-8">
        <h2 className="text-sm font-semibold text-slate-500 mb-3">Today’s overview</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <KPI label="New customers" value="0" sublabel="past 24h" />
          <KPI label="Bookings" value="0" sublabel="upcoming" />
          <KPI label="Vehicles online" value="0" sublabel="available" />
          <KPI label="Payouts pending" value="0" sublabel="this week" />
        </div>
      </section>

      {/* Recent activity (placeholder) */}
      <section className="mt-8">
        <h2 className="text-sm font-semibold text-slate-500 mb-3">Recent activity</h2>
        <div className="rounded-2xl border border-slate-200 bg-white">
          <ul className="divide-y divide-slate-200">
            {[
              { t: "No recent activity yet", d: "Actions you take will appear here." },
            ].map((a, i) => (
              <li key={i} className="p-4 flex items-start gap-3">
                <span className="mt-0.5 text-slate-400">•</span>
                <div>
                  <div className="text-slate-800">{a.t}</div>
                  <div className="text-sm text-slate-500">{a.d}</div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </section>
    </div>
  );
}

function QuickAction({ to, emoji, title, desc }) {
  return (
    <NavLink
      to={to}
      className="group rounded-2xl border border-slate-200 bg-white p-4 hover:border-slate-300 hover:shadow-sm transition"
    >
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 grid place-items-center rounded-xl bg-slate-100 group-hover:bg-slate-200 transition text-lg">
          <span aria-hidden>{emoji}</span>
        </div>
        <div>
          <div className="font-medium text-slate-900">{title}</div>
          <div className="text-sm text-slate-500">{desc}</div>
        </div>
      </div>
    </NavLink>
  );
}

function KPI({ label, value, sublabel }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4">
      <div className="text-sm text-slate-500">{label}</div>
      <div className="mt-1 text-2xl font-semibold text-slate-900">{value}</div>
      <div className="text-xs text-slate-500">{sublabel}</div>
    </div>
  );
}
