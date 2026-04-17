// src/components/driver/DriverHeader.jsx
import { useEffect, useMemo, useState } from "react";
import { Link, NavLink, useLocation, useNavigate } from "react-router-dom";
import {
  Bell,
  CarFront,
  ChevronDown,
  LayoutDashboard,
  LogOut,
  Menu,
  ShieldCheck,
  User,
  X,
} from "lucide-react";

/* ✅ same local auth keys used in your app */
const TOKEN_KEYS = ["token", "access_token", "auth_token", "smartcar_token"];
const USER_KEYS = ["auth.user", "user", "auth_user", "smartcar_user"];

function safeJsonParse(v) {
  try {
    return JSON.parse(v);
  } catch {
    return null;
  }
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

function clearStoredAuth() {
  if (typeof window === "undefined") return;

  [...TOKEN_KEYS, ...USER_KEYS].forEach((k) => {
    window.localStorage.removeItem(k);
  });
}

function getUserName(user) {
  return user?.name || user?.full_name || "Driver";
}

function getUserEmail(user) {
  return user?.email || "";
}

function getUserAvatar(user) {
  return user?.avatar_url || user?.photo_url || user?.avatar || "";
}

function getInitials(name) {
  const parts = String(name || "")
    .trim()
    .split(" ")
    .filter(Boolean);

  if (!parts.length) return "DR";

  const a = parts[0]?.[0] || "";
  const b = parts[1]?.[0] || "";
  return (a + b || "DR").toUpperCase();
}

function navBase(isActive) {
  return [
    "inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium transition",
    isActive
      ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200"
      : "text-slate-600 hover:bg-slate-100 hover:text-slate-900",
  ].join(" ");
}

function MobileNavLink({ to, icon, children, onClick }) {
  return (
    <NavLink to={to} onClick={onClick} className={({ isActive }) => navBase(isActive)}>
      {icon}
      <span>{children}</span>
    </NavLink>
  );
}

export default function DriverHeader({
  brandName = "SmartCar AI",
  logoSrc = "",
  homeTo = "/",
  user: userProp = null,
}) {
  const location = useLocation();
  const navigate = useNavigate();

  const [open, setOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);

  const storedUser = useMemo(() => getStoredUser(), []);
  const user = userProp || storedUser || null;

  const name = getUserName(user);
  const email = getUserEmail(user);
  const avatar = getUserAvatar(user);
  const initials = getInitials(name);

  useEffect(() => {
    setOpen(false);
    setProfileOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    function handleClickOutside() {
      setProfileOpen(false);
    }

    if (profileOpen) {
      window.addEventListener("click", handleClickOutside);
    }

    return () => window.removeEventListener("click", handleClickOutside);
  }, [profileOpen]);

  function handleLogout() {
    clearStoredAuth();
    navigate("/login", { replace: true });
  }

  return (
    <header className="sticky top-0 z-50 border-b border-slate-200 bg-white/90 backdrop-blur-xl">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="flex h-16 items-center justify-between gap-4">
          {/* Brand */}
          <div className="flex items-center gap-3">
            <Link to={homeTo} className="flex items-center gap-3">
              {logoSrc ? (
                <img
                  src={logoSrc}
                  alt={brandName}
                  className="h-10 w-10 rounded-xl object-cover ring-1 ring-slate-200"
                />
              ) : (
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200">
                  <CarFront size={18} />
                </div>
              )}

              <div className="min-w-0">
                <p className="truncate text-sm font-bold text-slate-900">{brandName}</p>
                <p className="flex items-center gap-1 text-[11px] font-medium text-emerald-700">
                  <ShieldCheck size={12} />
                  Driver Portal
                </p>
              </div>
            </Link>
          </div>

          {/* Desktop Nav */}
          <nav className="hidden items-center gap-2 md:flex">
            <NavLink to="/driver" end className={({ isActive }) => navBase(isActive)}>
              <LayoutDashboard size={16} />
              <span>Dashboard</span>
            </NavLink>
          </nav>

          {/* Right side */}
          <div className="flex items-center gap-2">
            {/* Notifications */}
            <button
              type="button"
              className="hidden h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 transition hover:bg-slate-50 hover:text-slate-900 md:inline-flex"
              aria-label="Notifications"
            >
              <Bell size={17} />
            </button>

            {/* Desktop Profile */}
            <div className="relative hidden md:block">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setProfileOpen((v) => !v);
                }}
                className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-2.5 py-1.5 transition hover:bg-slate-50"
              >
                {avatar ? (
                  <img
                    src={avatar}
                    alt={name}
                    className="h-9 w-9 rounded-xl object-cover ring-1 ring-slate-200"
                  />
                ) : (
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-100 text-sm font-bold text-emerald-700">
                    {initials}
                  </div>
                )}

                <div className="max-w-[160px] min-w-0 text-left">
                  <p className="truncate text-sm font-semibold text-slate-900">{name}</p>
                  <p className="truncate text-[11px] text-slate-500">
                    {email || "Driver account"}
                  </p>
                </div>

                <ChevronDown size={16} className="text-slate-500" />
              </button>

              {profileOpen && (
                <div
                  className="absolute right-0 mt-2 w-64 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="border-b border-slate-100 px-4 py-4">
                    <div className="flex items-center gap-3">
                      {avatar ? (
                        <img
                          src={avatar}
                          alt={name}
                          className="h-11 w-11 rounded-xl object-cover ring-1 ring-slate-200"
                        />
                      ) : (
                        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-100 text-sm font-bold text-emerald-700">
                          {initials}
                        </div>
                      )}

                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-slate-900">{name}</p>
                        <p className="truncate text-xs text-slate-500">
                          {email || "Driver account"}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="p-2">
                    <Link
                      to="/driver/profile"
                      className="flex items-center gap-2 rounded-xl px-3 py-2 text-sm text-slate-700 transition hover:bg-slate-50"
                    >
                      <User size={16} />
                      My Profile
                    </Link>

                    <button
                      type="button"
                      onClick={handleLogout}
                      className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm text-rose-600 transition hover:bg-rose-50"
                    >
                      <LogOut size={16} />
                      Logout
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Mobile Toggle */}
            <button
              type="button"
              onClick={() => setOpen((v) => !v)}
              className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 transition hover:bg-slate-50 md:hidden"
              aria-label="Toggle menu"
            >
              {open ? <X size={18} /> : <Menu size={18} />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      {open && (
        <div className="border-t border-slate-200 bg-white md:hidden">
          <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6">
            <div className="mb-4 flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-3">
              {avatar ? (
                <img
                  src={avatar}
                  alt={name}
                  className="h-11 w-11 rounded-xl object-cover ring-1 ring-slate-200"
                />
              ) : (
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-100 text-sm font-bold text-emerald-700">
                  {initials}
                </div>
              )}

              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-slate-900">{name}</p>
                <p className="truncate text-xs text-slate-500">
                  {email || "Driver account"}
                </p>
              </div>
            </div>

            <nav className="grid gap-2">
              <MobileNavLink
                to="/driver"
                onClick={() => setOpen(false)}
                icon={<LayoutDashboard size={16} />}
              >
                Dashboard
              </MobileNavLink>

              <button
                type="button"
                onClick={handleLogout}
                className="inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium text-rose-600 transition hover:bg-rose-50"
              >
                <LogOut size={16} />
                Logout
              </button>
            </nav>
          </div>
        </div>
      )}
    </header>
  );
}