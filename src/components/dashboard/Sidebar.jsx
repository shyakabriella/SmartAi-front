// src/components/dashboard/Sidebar.jsx
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { useEffect, useMemo, useState } from "react";

/* ---------------- utils ---------------- */
function safeParse(s) {
  try {
    return s ? JSON.parse(s) : null;
  } catch {
    return null;
  }
}

function normalizeRole(x) {
  return String(x || "").trim().toLowerCase();
}

function getPrimaryRole(user, roles) {
  // priority: user.primary_role -> user.role -> roles[0]
  const fromUserPrimary = normalizeRole(user?.primary_role);
  if (fromUserPrimary) return fromUserPrimary;

  const fromUserRole =
    typeof user?.role === "string"
      ? normalizeRole(user.role)
      : normalizeRole(user?.role?.name || user?.role?.slug);

  if (fromUserRole) return fromUserRole;

  const firstRole = Array.isArray(roles) && roles.length ? roles[0] : "";
  if (typeof firstRole === "string") return normalizeRole(firstRole);

  return normalizeRole(firstRole?.name || firstRole?.slug || "user");
}

function initials(nameOrEmail) {
  const s = String(nameOrEmail || "").trim();
  if (!s) return "U";
  const parts = s.split(" ").filter(Boolean);
  const a = parts[0]?.[0] || "U";
  const b = parts[1]?.[0] || "";
  return (a + b).toUpperCase();
}

function routeForRole(role) {
  const map = {
    admin: "/admin",
    manager: "/admin",
    agent: "/admin/agent",
    owner: "/owner",
    host: "/owner",
    driver: "/driver",
    customer: "/customer",
  };
  return map[role] || "/admin";
}

/* ---------------- styles ---------------- */
const itemBase =
  "group relative flex items-center gap-3 px-3 h-10 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-slate-300";
const activeCls = "bg-slate-900/5 text-slate-900";
const idleCls = "text-slate-600 hover:bg-slate-900/5 hover:text-slate-900";

export default function Sidebar({ collapsed: collapsedProp, onToggle }) {
  const { pathname } = useLocation();
  const nav = useNavigate();

  /* ---------------- auth data ---------------- */
  const user = useMemo(() => {
    return (
      safeParse(localStorage.getItem("auth.user")) ||
      safeParse(localStorage.getItem("user")) ||
      null
    );
  }, []);

  const roles = useMemo(() => {
    const raw =
      safeParse(localStorage.getItem("auth.roles")) ||
      safeParse(localStorage.getItem("roles")) ||
      [];
    return Array.isArray(raw)
      ? raw
          .map((r) => (typeof r === "string" ? normalizeRole(r) : normalizeRole(r?.name || r?.slug)))
          .filter(Boolean)
      : [];
  }, []);

  const primaryRole = useMemo(() => getPrimaryRole(user, roles), [user, roles]);

  const isAdminLike = primaryRole === "admin" || primaryRole === "manager";
  const isOwnerLike = primaryRole === "owner" || primaryRole === "host";
  const isAgentLike = primaryRole === "agent";

  const dashboardPath = routeForRole(primaryRole);

  const displayName = user?.name || user?.fullName || "User";
  const email = user?.email || "";

  /* ---------------- role-based menu ---------------- */
  // ✅ Dashboard must exist for ALL users
  const TOP_MENU = useMemo(() => {
    const base = [{ to: dashboardPath, label: "Dashboard", icon: "🏠" }];

    // common: bookings for most roles
    if (isAdminLike || isAgentLike || isOwnerLike) {
      base.push({ to: "/admin/bookings", label: "Bookings", icon: "🗓️" });
    }

    // admin-only sections
    if (isAdminLike) {
      base.push({ to: "/admin/payments", label: "Payments", icon: "💳" });
      base.push({ to: "/admin/reviews", label: "Reviews", icon: "⭐" });
    }

    return base;
  }, [dashboardPath, isAdminLike, isAgentLike, isOwnerLike]);

  /* ---------------- sidebar collapsed state ---------------- */
  const [collapsed, setCollapsed] = useState(() => {
    const saved = localStorage.getItem("sidebarCollapsed");
    return saved ? saved === "1" : collapsedProp ?? false;
  });

  useEffect(() => {
    if (typeof collapsedProp === "boolean") setCollapsed(collapsedProp);
  }, [collapsedProp]);

  const toggle = () => {
    const next = !collapsed;
    setCollapsed(next);
    localStorage.setItem("sidebarCollapsed", next ? "1" : "0");
    onToggle?.(next);
  };

  /* ---------------- groups open state ---------------- */
  const [vehOpen, setVehOpen] = useState(pathname.startsWith("/admin/vehicles"));
  const [drvOpen, setDrvOpen] = useState(pathname.startsWith("/admin/drivers"));
  const [custOpen, setCustOpen] = useState(pathname.startsWith("/admin/customers"));

  useEffect(() => setVehOpen(pathname.startsWith("/admin/vehicles")), [pathname]);
  useEffect(() => setDrvOpen(pathname.startsWith("/admin/drivers")), [pathname]);
  useEffect(() => setCustOpen(pathname.startsWith("/admin/customers")), [pathname]);

  const isPathActive = useMemo(
    () => (to) => pathname === to || (to !== dashboardPath && pathname.startsWith(to)),
    [pathname, dashboardPath]
  );

  /* ---------------- role visibility rules ---------------- */
  const canSeeVehicles = isAdminLike || isAgentLike || isOwnerLike;
  const canSeeDrivers = isAdminLike;
  const canSeeCustomers = isAdminLike;

  /* ---------------- logout ---------------- */
  const onLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("auth.user");
    localStorage.removeItem("auth.roles");
    localStorage.removeItem("auth.permissions");
    localStorage.removeItem("sidebarCollapsed");
    nav("/login", { replace: true });
  };

  return (
    <aside
      className={[
        "sticky top-0 h-dvh border-r border-slate-200 bg-white/90 backdrop-blur",
        "hidden md:flex flex-col",
        collapsed ? "w-20" : "w-64",
      ].join(" ")}
      aria-label="Sidebar navigation"
    >
      {/* Brand + user */}
      <div className="h-16 flex items-center justify-between gap-2 px-3">
        <button
          type="button"
          onClick={() => nav(dashboardPath)}
          className="flex items-center gap-2"
          title="Go to dashboard"
        >
          <div
            className="h-9 w-9 rounded-xl bg-gradient-to-br from-cyan-400 to-blue-600"
            aria-hidden
          />
          {!collapsed && (
            <div className="font-semibold text-slate-900">
              SmartCar<span className="text-cyan-500">AI</span>
            </div>
          )}
        </button>

        {!collapsed && (
          <div className="flex items-center gap-2">
            <div className="h-9 w-9 rounded-full bg-slate-900 text-white grid place-items-center text-xs font-semibold">
              {initials(displayName || email)}
            </div>
          </div>
        )}
      </div>

      {!collapsed && (
        <div className="px-3 -mt-2 pb-2">
          <p className="text-xs text-slate-500 truncate">
            {displayName}
            {email ? ` • ${email}` : ""}
          </p>
          <p className="text-[11px] text-slate-400">
            Role: <span className="font-medium text-slate-600">{primaryRole}</span>
          </p>
        </div>
      )}

      {/* Toggle */}
      <button
        onClick={toggle}
        className="mx-3 mb-2 inline-flex items-center justify-center h-9 rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50"
        title={collapsed ? "Expand" : "Collapse"}
        aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
      >
        {collapsed ? "»" : "«"}
      </button>

      {/* Menu */}
      <nav className="px-2 py-2 space-y-1 overflow-y-auto">
        {/* Top menu */}
        {TOP_MENU.map((m) => {
          const active = isPathActive(m.to);
          return (
            <NavLink
              key={m.to}
              to={m.to}
              title={collapsed ? m.label : undefined}
              className={[itemBase, active ? activeCls : idleCls].join(" ")}
              aria-current={active ? "page" : undefined}
            >
              {active && (
                <span className="absolute left-0 top-1/2 -translate-y-1/2 h-6 w-1 rounded-full bg-slate-900/60" />
              )}
              <span className="text-lg" aria-hidden>
                {m.icon}
              </span>
              {!collapsed && <span className="text-sm font-medium">{m.label}</span>}
            </NavLink>
          );
        })}

        {/* Vehicles group (Admin / Agent / Owner) */}
        {canSeeVehicles && (
          <div className="mt-1">
            <button
              onClick={() => (collapsed ? nav("/admin/vehicles") : setVehOpen((v) => !v))}
              className={[
                itemBase,
                pathname.startsWith("/admin/vehicles") ? activeCls : idleCls,
              ].join(" ")}
              aria-expanded={vehOpen}
              aria-controls="vehicles-subnav"
              title={collapsed ? "Vehicles" : undefined}
            >
              {pathname.startsWith("/admin/vehicles") && (
                <span className="absolute left-0 top-1/2 -translate-y-1/2 h-6 w-1 rounded-full bg-slate-900/60" />
              )}
              <span className="text-lg" aria-hidden>
                🚗
              </span>

              {!collapsed && (
                <>
                  <span className="text-sm font-medium flex-1 text-left">
                    {isAdminLike ? "Vehicles" : "My Showroom"}
                  </span>
                  <span className="text-slate-500 text-xs">{vehOpen ? "▾" : "▸"}</span>
                </>
              )}
            </button>

            {!collapsed && (
              <div
                id="vehicles-subnav"
                className={[
                  "grid overflow-hidden transition-[grid-template-rows,opacity] duration-300",
                  vehOpen ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0",
                ].join(" ")}
              >
                <div className="min-h-0">
                  <ul className="pl-10 pr-2 py-1 space-y-1">
                    <li>
                      <NavLink
                        to="/admin/vehicles"
                        className={({ isActive }) =>
                          [
                            "block h-8 rounded-md px-2 text-sm",
                            isActive
                              ? "bg-slate-900/5 text-slate-900"
                              : "text-slate-600 hover:bg-slate-900/5 hover:text-slate-900",
                          ].join(" ")
                        }
                      >
                        {isAdminLike ? "Customer Showrooms" : "My Vehicles"}
                      </NavLink>
                    </li>
                  </ul>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Drivers group (Admin only) */}
        {canSeeDrivers && (
          <div className="mt-1">
            <button
              onClick={() => (collapsed ? nav("/admin/drivers") : setDrvOpen((v) => !v))}
              className={[
                itemBase,
                pathname.startsWith("/admin/drivers") ? activeCls : idleCls,
              ].join(" ")}
              aria-expanded={drvOpen}
              aria-controls="drivers-subnav"
              title={collapsed ? "Drivers" : undefined}
            >
              {pathname.startsWith("/admin/drivers") && (
                <span className="absolute left-0 top-1/2 -translate-y-1/2 h-6 w-1 rounded-full bg-slate-900/60" />
              )}
              <span className="text-lg" aria-hidden>
                👨‍✈️
              </span>
              {!collapsed && (
                <>
                  <span className="text-sm font-medium flex-1 text-left">Drivers</span>
                  <span className="text-slate-500 text-xs">{drvOpen ? "▾" : "▸"}</span>
                </>
              )}
            </button>

            {!collapsed && (
              <div
                id="drivers-subnav"
                className={[
                  "grid overflow-hidden transition-[grid-template-rows,opacity] duration-300",
                  drvOpen ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0",
                ].join(" ")}
              >
                <div className="min-h-0">
                  <ul className="pl-10 pr-2 py-1 space-y-1">
                    <li>
                      <NavLink
                        to="/admin/drivers"
                        className={({ isActive }) =>
                          [
                            "block h-8 rounded-md px-2 text-sm",
                            isActive
                              ? "bg-slate-900/5 text-slate-900"
                              : "text-slate-600 hover:bg-slate-900/5 hover:text-slate-900",
                          ].join(" ")
                        }
                      >
                        All Drivers
                      </NavLink>
                    </li>
                  </ul>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Customers group (Admin only) */}
        {canSeeCustomers && (
          <div className="mt-1">
            <button
              onClick={() => (collapsed ? nav("/admin/customers") : setCustOpen((v) => !v))}
              className={[
                itemBase,
                pathname.startsWith("/admin/customers") ? activeCls : idleCls,
              ].join(" ")}
              aria-expanded={custOpen}
              aria-controls="customers-subnav"
              title={collapsed ? "Customers" : undefined}
            >
              {pathname.startsWith("/admin/customers") && (
                <span className="absolute left-0 top-1/2 -translate-y-1/2 h-6 w-1 rounded-full bg-slate-900/60" />
              )}
              <span className="text-lg" aria-hidden>
                👥
              </span>
              {!collapsed && (
                <>
                  <span className="text-sm font-medium flex-1 text-left">Customers</span>
                  <span className="text-slate-500 text-xs">{custOpen ? "▾" : "▸"}</span>
                </>
              )}
            </button>

            {!collapsed && (
              <div
                id="customers-subnav"
                className={[
                  "grid overflow-hidden transition-[grid-template-rows,opacity] duration-300",
                  custOpen ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0",
                ].join(" ")}
              >
                <div className="min-h-0">
                  <ul className="pl-10 pr-2 py-1 space-y-1">
                    <li>
                      <NavLink
                        to="/admin/customers"
                        className={({ isActive }) =>
                          [
                            "block h-8 rounded-md px-2 text-sm",
                            isActive
                              ? "bg-slate-900/5 text-slate-900"
                              : "text-slate-600 hover:bg-slate-900/5 hover:text-slate-900",
                          ].join(" ")
                        }
                      >
                        All Customers
                      </NavLink>
                    </li>
                  </ul>
                </div>
              </div>
            )}
          </div>
        )}
      </nav>

      {/* Logout */}
      <div className="p-3 border-t border-slate-200">
        <button
          onClick={onLogout}
          className="w-full inline-flex items-center justify-center gap-2 h-10 rounded-lg bg-slate-900 text-white hover:bg-slate-800"
          title="Sign out"
        >
          ⎋ Logout
        </button>
      </div>

      {/* Footer */}
      <div className="p-3 text-[11px] text-slate-400">
        {!collapsed && <>v0.1 • {primaryRole}</>}
      </div>
    </aside>
  );
}
