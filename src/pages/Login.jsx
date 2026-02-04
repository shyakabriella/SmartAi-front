// src/pages/Login.jsx
import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";

export default function Login() {
  const nav = useNavigate();
  const location = useLocation();
  const API = import.meta.env.VITE_API_URL || `${window.location.origin}/api`;

  const [email, setEmail] = useState(localStorage.getItem("lastEmail") || "");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  // map primary role -> route
  const routeForRole = (role) => {
    const map = {
      admin: "/admin",
      manager: "/admin",
      driver: "/driver",
      customer: "/customer",
      agent: "/admin/agent",
      owner: "/owner", // 👈 Owner dashboard
      host: "/owner",  // if backend ever uses "host"
    };
    return map[role] || "/";
  };

  async function onSubmit(e) {
    e.preventDefault();
    setErr("");
    setLoading(true);

    try {
      const res = await fetch(`${API}/login`, {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password }),
      });

      const json = await res.json();

      if (!res.ok || json?.success === false) {
        const msg =
          json?.message ||
          json?.errors?.email?.[0] ||
          json?.errors?.error?.[0] ||
          "Login failed";
        throw new Error(msg);
      }

      const data = json?.data ?? json;
      const token = data?.token;
      const user = data?.user ?? null;
      const roles = data?.roles ?? user?.roles_list ?? user?.roles ?? [];
      const perms = data?.permissions ?? [];

      if (!token) throw new Error("No token in response");

      // normalize role names (handles ['agent'] or [{name:'agent'}])
      const roleNames = Array.isArray(roles)
        ? roles
            .map((r) => (typeof r === "string" ? r : r?.name))
            .filter(Boolean)
        : [];

      // persist auth
      localStorage.setItem("token", token);
      localStorage.setItem("auth.user", JSON.stringify(user));
      localStorage.setItem("auth.roles", JSON.stringify(roleNames));
      localStorage.setItem("auth.permissions", JSON.stringify(perms));
      localStorage.setItem("lastEmail", email);

      // compute redirect destination
      const primary =
        user?.primary_role ||    // from accessor (preferred)
        user?.role ||            // from users.role column
        roleNames?.[0] || "";    // fallback: first Spatie role

      const suggested = routeForRole(primary);

      // if guard sent us here, prefer that
      const from = location.state?.from;
      const dest = from ? from : suggested;

      nav(dest, { replace: true });
    } catch (e) {
      setErr(e.message || "Login failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-full relative overflow-hidden bg-slate-950 text-slate-100">
      <div
        className="absolute inset-0 opacity-60"
        style={{
          background:
            "radial-gradient(1200px 420px at 10% 10%, #0ea5e999, transparent 60%), radial-gradient(900px 360px at 90% 20%, #6366f199, transparent 60%), radial-gradient(700px 300px at 50% 100%, #06b6d499, transparent 60%)",
          animation: "floatyBackdrop 12s ease-in-out infinite alternate",
        }}
      />
      <div className="relative z-10 grid min-h-screen place-items-center px-4">
        <div className="w-full max-w-md">
          <div className="mb-6 flex items-center justify-center gap-2">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-cyan-400 to-blue-600 animate-pulse" />
            <h1 className="text-2xl font-semibold tracking-tight">
              SmartCar<span className="text-cyan-400">AI</span>
            </h1>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/5 p-6 shadow-2xl backdrop-blur">
            <h2 className="text-xl font-semibold">Welcome back</h2>
            <p className="mb-5 text-sm text-slate-300">
              Sign in to manage vehicles, drivers, bookings, and your showroom.
            </p>

            <form onSubmit={onSubmit} className="grid gap-4">
              <div>
                <label className="mb-1 block text-sm text-slate-300">
                  Email
                </label>
                <input
                  type="email"
                  required
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded-lg border border-white/10 bg-slate-900/60 px-3 py-2 outline-none focus:ring-2 focus:ring-cyan-400"
                  placeholder="you@example.com"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm text-slate-300">
                  Password
                </label>
                <div className="relative">
                  <input
                    type={showPass ? "text" : "password"}
                    required
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full rounded-lg border border-white/10 bg-slate-900/60 px-3 py-2 pr-10 outline-none focus:ring-2 focus:ring-cyan-400"
                    placeholder="••••••••"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPass((v) => !v)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200"
                    aria-label={showPass ? "Hide password" : "Show password"}
                  >
                    {showPass ? "🙈" : "👁️"}
                  </button>
                </div>
              </div>

              {err && (
                <div className="rounded-lg border border-rose-500/30 bg-rose-900/30 px-3 py-2 text-sm text-rose-300">
                  {err}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="mt-2 inline-flex items-center justify-center gap-2 rounded-xl bg-cyan-500 px-4 py-2.5 text-sm font-medium text-slate-900 transition hover:bg-cyan-400 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading ? (
                  <>
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-slate-900 border-r-transparent" />
                    Signing in…
                  </>
                ) : (
                  "Sign in"
                )}
              </button>
            </form>
          </div>

          <p className="mt-6 text-center text-xs text-slate-400">
            © {new Date().getFullYear()} SmartCar AI
          </p>
        </div>
      </div>

      <style>{`
        @keyframes floatyBackdrop {
          0% { transform: translateY(0px); filter: saturate(1); }
          100% { transform: translateY(-10px); filter: saturate(1.1); }
        }
      `}</style>
    </div>
  );
}
