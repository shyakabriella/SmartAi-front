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

/* ✅ Showrooms routes by role */
function showroomPathForRole(role) {
  if (role === "admin" || role === "manager" || role === "agent")
    return "/admin/showrooms";
  if (role === "owner" || role === "host") return "/owner/showroom";
  return null;
}

function bookingsPathForRole(role) {
  // ✅ booking should be owner only (based on your latest request)
  if (role === "owner" || role === "host") return "/owner/bookings";

  // keep admin/agent fallback if you still have pages, otherwise remove
  if ( role === "manager" || role === "agent")
    return "/admin/bookings";

  return null;
}

// ✅ Owner Reports
function ownerReportsPathForRole(role) {
  if (role === "owner" || role === "host") return "/owner/reports";
  return null;
}

// ✅ Admin Reports
function adminReportsPathForRole(role) {
  if (role === "admin" || role === "manager") return "/admin/reports";
  return null;
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
          .map((r) =>
            typeof r === "string"
              ? normalizeRole(r)
              : normalizeRole(r?.name || r?.slug)
          )
          .filter(Boolean)
      : [];
  }, []);

  const primaryRole = useMemo(() => getPrimaryRole(user, roles), [user, roles]);

  const isAdminLike = primaryRole === "admin" || primaryRole === "manager";
  const isOwnerLike = primaryRole === "owner" || primaryRole === "host";
  const isAgentLike = primaryRole === "agent";

  const dashboardPath = routeForRole(primaryRole);
  const showroomPath = showroomPathForRole(primaryRole);
  const bookingsPath = bookingsPathForRole(primaryRole);

  const ownerReportsPath = ownerReportsPathForRole(primaryRole);
  const adminReportsPath = adminReportsPathForRole(primaryRole);

  const displayName = user?.name || user?.fullName || "User";
  const email = user?.email || "";

  /* ---------------- role-based menu ---------------- */
  const TOP_MENU = useMemo(() => {
    const base = [{ to: dashboardPath, label: "Dashboard", icon: "🏠" }];

    // ✅ Showrooms menu
    if (showroomPath) {
      base.push({
        to: showroomPath,
        label: isOwnerLike ? "My ShowRoom" : "ShowRooms",
        icon: "🏢",
      });
    }

    // ✅ Bookings menu
    if (bookingsPath && (isAdminLike || isAgentLike || isOwnerLike)) {
      base.push({ to: bookingsPath, label: "Bookings", icon: "🗓️" });
    }

    // ✅ Reports menu (Owner)
    if (ownerReportsPath && isOwnerLike) {
      base.push({ to: ownerReportsPath, label: "Reports", icon: "📊" });
    }

    // ✅ Admin Reports menu (Admin/Manager)
    if (adminReportsPath && isAdminLike) {
      base.push({ to: adminReportsPath, label: "AdminReport", icon: "📈" });
    }

    return base;
  }, [
    dashboardPath,
    showroomPath,
    bookingsPath,
    ownerReportsPath,
    adminReportsPath,
    isAdminLike,
    isAgentLike,
    isOwnerLike,
  ]);

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

  const isPathActive = useMemo(
    () => (to) => pathname === to || (to !== dashboardPath && pathname.startsWith(to)),
    [pathname, dashboardPath]
  );

  /* ---------------- role visibility rules ---------------- */
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
          <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-cyan-400 to-blue-600" />
          {!collapsed && (
            <div className="font-semibold text-slate-900">
              SmartCar<span className="text-cyan-500">AI</span>
            </div>
          )}
        </button>

        {!collapsed && (
          <div className="h-9 w-9 rounded-full bg-slate-900 text-white grid place-items-center text-xs font-semibold">
            {initials(displayName || email)}
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
              <span className="text-lg">{m.icon}</span>
              {!collapsed && <span className="text-sm font-medium">{m.label}</span>}
            </NavLink>
          );
        })}

        {/* Drivers (Admin only) */}
        {canSeeDrivers && (
          <NavLink
            to="/admin/drivers"
            className={({ isActive }) => [itemBase, isActive ? activeCls : idleCls].join(" ")}
          >
            <span className="text-lg">👨‍✈️</span>
            {!collapsed && <span className="text-sm font-medium">Drivers</span>}
          </NavLink>
        )}

        {/* Customers (Admin only) */}
        {canSeeCustomers && (
          <NavLink
            to="/admin/customers"
            className={({ isActive }) => [itemBase, isActive ? activeCls : idleCls].join(" ")}
          >
            <span className="text-lg">👥</span>
            {!collapsed && <span className="text-sm font-medium">Customers</span>}
          </NavLink>
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

      <div className="p-3 text-[11px] text-slate-400">
        {!collapsed && <>v0.1 • {primaryRole}</>}
      </div>
    </aside>
  );
}