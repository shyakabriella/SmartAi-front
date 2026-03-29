import { useMemo } from "react";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import DriverHeader from "../../components/driver/DriverHeader";

/* ✅ local auth helpers */
const TOKEN_KEYS = ["token", "access_token", "auth_token", "smartcar_token"];
const USER_KEYS = ["user", "auth_user", "smartcar_user", "auth.user"];

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

function DriverFooter() {
  return (
    <footer className="mt-10 border-t border-slate-200 bg-white">
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-slate-500">
            © {new Date().getFullYear()} SmartCar AI. All rights reserved.
          </p>

          <div className="flex items-center gap-3 text-xs">
            <a className="text-slate-600 hover:text-slate-900" href="#">
              Terms
            </a>
            <span className="text-slate-300">•</span>
            <a className="text-slate-600 hover:text-slate-900" href="#">
              Privacy
            </a>
            <span className="text-slate-300">•</span>
            <a className="text-slate-600 hover:text-slate-900" href="#">
              Support
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}

export default function DriverLayouts({
  requireAuth = true,
  brandName = "SmartCar AI",
  logoSrc = "",
  homeTo = "/",
}) {
  const location = useLocation();

  const token = useMemo(() => getStoredToken(), []);
  const user = useMemo(() => getStoredUser(), []);

  if (requireAuth && !token) {
    return (
      <Navigate
        to="/login"
        replace
        state={{ from: location.pathname || "/driver" }}
      />
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <DriverHeader
        brandName={brandName}
        logoSrc={logoSrc}
        homeTo={homeTo}
        user={user}
      />

      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
        <Outlet />
      </main>

      <DriverFooter />
    </div>
  );
}