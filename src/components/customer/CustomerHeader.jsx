// src/components/customer/CustomerHeader.jsx
import { useEffect, useMemo, useRef, useState } from "react";
import { Link, NavLink, useLocation, useNavigate } from "react-router-dom";
import {
  Menu,
  X,
  User,
  LogOut,
  LayoutDashboard,
} from "lucide-react";

/* ✅ local auth helpers (same style as your modal) */
const TOKEN_KEYS = ["token", "access_token", "auth_token", "smartcar_token"];
const USER_KEYS = ["user", "auth_user", "smartcar_user"];

function safeJsonParse(v) {
  try {
    return JSON.parse(v);
  } catch {
    return null;
  }
}

function getStoredToken() {
  if (typeof window === "undefined") return "";
  for (const k of TOKEN_KEYS) {
    const v = window.localStorage.getItem(k);
    if (v && String(v).trim()) return String(v).trim();
  }
  return "";
}

function getStoredUser() {
  if (typeof window === "undefined") return null;
  for (const k of USER_KEYS) {
    const raw = window.localStorage.getItem(k);
    const parsed = raw ? safeJsonParse(raw) : null;
    if (parsed && typeof parsed === "object") return parsed;
  }
  return null;
}

function clearAuth() {
  if (typeof window === "undefined") return;
  [...TOKEN_KEYS, ...USER_KEYS].forEach((k) => window.localStorage.removeItem(k));
}

function initials(nameOrEmail = "") {
  const s = String(nameOrEmail).trim();
  if (!s) return "CU";
  const parts = s.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  return s.slice(0, 2).toUpperCase();
}

export default function CustomerHeader({
  brandName = "SmartCar AI",
  logoSrc = "",
  homeTo = "/",
  user: userProp,
  links,
  onLogout,
}) {
  const navigate = useNavigate();
  const location = useLocation();

  const user = useMemo(() => userProp || getStoredUser(), [userProp]);
  const token = useMemo(() => getStoredToken(), []);

  const [mobileOpen, setMobileOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  const menuRef = useRef(null);

  const defaultLinks = useMemo(
    () => [
      { to: "/customer", label: "Dashboard", icon: LayoutDashboard },
    ],
    []
  );

  const navLinks = links?.length ? links : defaultLinks;

  useEffect(() => {
    function onDocClick(e) {
      if (!menuRef.current) return;
      if (!menuRef.current.contains(e.target)) setMenuOpen(false);
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  useEffect(() => {
    setMobileOpen(false);
    setMenuOpen(false);
  }, [location.pathname]);

  function handleLogout() {
    clearAuth();
    setMenuOpen(false);
    setMobileOpen(false);

    if (typeof onLogout === "function") onLogout();

    navigate("/login", { replace: true });
  }

  const displayName =
    user?.name || user?.full_name || user?.username || user?.email || "Customer";
  const displayEmail = user?.email || "";

  const Avatar = (
    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-bold">
      {initials(displayName || displayEmail)}
    </div>
  );

  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-200 bg-white/80 backdrop-blur">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="flex h-16 items-center justify-between gap-3">
          {/* Left: Brand */}
          <div className="flex items-center gap-3">
            <Link to={homeTo} className="flex items-center gap-2">
              {logoSrc ? (
                <img
                  src={logoSrc}
                  alt={brandName}
                  className="h-9 w-9 rounded-xl object-contain border border-slate-200 bg-white"
                />
              ) : (
                <div className="h-9 w-9 rounded-xl bg-slate-900 text-white flex items-center justify-center font-bold text-xs">
                  {brandName.slice(0, 2).toUpperCase()}
                </div>
              )}
              <div className="leading-tight">
                <p className="text-sm font-semibold text-slate-900">{brandName}</p>
                <p className="text-[11px] text-slate-500 -mt-0.5">
                  Customer Portal
                </p>
              </div>
            </Link>
          </div>

          {/* Center: Desktop nav */}
          <nav className="hidden md:flex items-center gap-1">
            {navLinks.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={({ isActive }) =>
                    `inline-flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold transition
                     ${
                       isActive
                         ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                         : "text-slate-600 hover:bg-slate-50 border border-transparent"
                     }`
                  }
                >
                  {Icon ? <Icon size={16} /> : null}
                  {item.label}
                </NavLink>
              );
            })}
          </nav>

          {/* Right: User */}
          <div className="flex items-center gap-2">
            {/* Mobile menu button */}
            <button
              type="button"
              onClick={() => setMobileOpen((s) => !s)}
              className="md:hidden inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
              aria-label={mobileOpen ? "Close menu" : "Open menu"}
            >
              {mobileOpen ? <X size={18} /> : <Menu size={18} />}
            </button>

            {/* User dropdown */}
            <div className="relative" ref={menuRef}>
              <button
                type="button"
                onClick={() => setMenuOpen((s) => !s)}
                className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-2 py-1.5 hover:bg-slate-50"
                aria-haspopup="menu"
                aria-expanded={menuOpen}
              >
                {Avatar}
                <div className="hidden sm:block text-left">
                  <p className="text-xs font-semibold text-slate-900 max-w-[180px] truncate">
                    {displayName}
                  </p>
                  <p className="text-[11px] text-slate-500 max-w-[180px] truncate">
                    {displayEmail || (token ? "Signed in" : "Guest")}
                  </p>
                </div>
              </button>

              {menuOpen && (
                <div
                  role="menu"
                  className="absolute right-0 mt-2 w-56 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-lg"
                >
                  <div className="p-3 border-b border-slate-100">
                    <p className="text-xs font-semibold text-slate-900 truncate">
                      {displayName}
                    </p>
                    <p className="text-[11px] text-slate-500 truncate">
                      {displayEmail || "—"}
                    </p>
                  </div>

                  <div className="p-2">
                    <Link
                      to="/customer/profile"
                      className="flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                      role="menuitem"
                      onClick={() => setMenuOpen(false)}
                    >
                      <User size={16} />
                      My Profile
                    </Link>

                    <button
                      type="button"
                      onClick={handleLogout}
                      className="mt-1 w-full flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold text-rose-700 hover:bg-rose-50"
                      role="menuitem"
                    >
                      <LogOut size={16} />
                      Logout
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Mobile nav */}
        {mobileOpen && (
          <div className="md:hidden pb-3">
            <div className="mt-2 grid gap-2 rounded-2xl border border-slate-200 bg-white p-2">
              {navLinks.map((item) => {
                const Icon = item.icon;
                const active = location.pathname === item.to;
                return (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    className={`flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold border transition
                      ${
                        active
                          ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                          : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
                      }`}
                  >
                    {Icon ? <Icon size={16} /> : null}
                    {item.label}
                  </NavLink>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </header>
  );
}