// src/pages/HostRegister.jsx
import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";

// Match Login.jsx style
const API = import.meta.env.VITE_API_URL || `${window.location.origin}/api`;

export default function HostRegister() {
  const navigate = useNavigate();

  // Must accept terms first (set by /terms page)
  const acceptedVersion = localStorage.getItem("scai_terms_version");
  const acceptedAt = localStorage.getItem("scai_terms_accepted_at");
  const termsOk = useMemo(
    () => Boolean(acceptedVersion && acceptedAt),
    [acceptedVersion, acceptedAt]
  );

  // Only these three fields
  const [form, setForm] = useState({ name: "", email: "", phone: "" });

  const [busy, setBusy] = useState(false);
  const [errors, setErrors] = useState({});
  const [flash, setFlash] = useState(null);

  useEffect(() => {
    document.title = "Register • SmartCar AI";
  }, []);

  const onChange = (e) => {
    const { name, value } = e.target;
    setForm((f) => ({ ...f, [name]: value }));
    setErrors((err) => ({ ...err, [name]: undefined }));
  };

  const clientValidate = () => {
    const e = {};
    if (!form.name?.trim()) e.name = "Name is required.";
    if (!form.email?.trim()) e.email = "Email is required.";
    if (!form.phone?.trim()) e.phone = "Phone is required.";
    return e;
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    setFlash(null);

    if (!termsOk) {
      navigate("/terms#accept");
      return;
    }

    const ce = clientValidate();
    if (Object.keys(ce).length) {
      setErrors(ce);
      return;
    }

    const payload = {
      name: form.name.trim(),
      email: form.email.trim(),
      phone: form.phone.trim(),

      // 👇 THIS is the important part: Host = OWNER
      role: "owner",
      primary_role: "owner",
      notify: true,
    };

    setBusy(true);
    setErrors({});
    try {
      const res = await fetch(`${API}/register`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify(payload),
      });

      const text = await res.text();
      let json = {};
      try {
        json = text ? JSON.parse(text) : {};
      } catch {
        // ignore JSON parse error – will handle with generic message
      }

      const success = res.ok && json?.success !== false;

      if (!success) {
        const msg =
          json?.message ||
          (json?.errors && Object.values(json.errors)[0]?.[0]) ||
          "Registration failed.";
        const dataErrors = json?.errors || json?.data || {};
        setErrors(normalizeLaravelErrors(dataErrors));
        setFlash({ type: "error", text: msg });
        setBusy(false);
        return;
      }

      // ✅ Registration succeeded — do NOT store token here
      localStorage.setItem("lastEmail", form.email.trim()); // prefill Login.jsx
      navigate("/login", {
        replace: true,
        state: { from: "/host/register", justRegistered: true },
      });
    } catch (err) {
      setFlash({
        type: "error",
        text: err?.message || "Network error. Is the API reachable?",
      });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-full relative overflow-hidden bg-slate-950 text-slate-100">
      {/* Gradient backdrop like Login */}
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
          {/* Brand header (matches Login) */}
          <div className="flex items-center justify-center gap-2 mb-6">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-cyan-400 to-blue-600 animate-pulse" />
            <h1 className="text-2xl font-semibold tracking-tight">
              SmartCar<span className="text-cyan-400">AI</span>
            </h1>
          </div>

          {/* Card */}
          <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur p-6 shadow-2xl">
            <h2 className="text-xl font-semibold">Become a SmartCar AI Owner</h2>
            <p className="text-sm text-slate-300 mb-5">
              Create an owner account to list and manage your vehicles in the
              SmartCar AI showroom. Password will be generated automatically and
              emailed to you.
            </p>

            {!termsOk && (
              <div className="mb-4 text-sm text-amber-200 bg-amber-900/30 border border-amber-500/30 rounded-lg px-3 py-2">
                Please accept the{" "}
                <Link className="underline" to="/terms#accept">
                  Terms &amp; Conditions
                </Link>{" "}
                before registering.
              </div>
            )}

            {flash && (
              <div
                className={[
                  "mb-4 rounded-lg px-3 py-2 text-sm",
                  flash.type === "success"
                    ? "border border-emerald-500/30 bg-emerald-900/30 text-emerald-100"
                    : "border border-rose-500/30 bg-rose-900/30 text-rose-100",
                ].join(" ")}
              >
                {flash.text}
              </div>
            )}

            <form onSubmit={onSubmit} className="grid gap-4">
              <div>
                <label
                  className="block text-sm text-slate-300 mb-1"
                  htmlFor="name"
                >
                  Full name
                </label>
                <input
                  id="name"
                  name="name"
                  value={form.name}
                  onChange={onChange}
                  className={[
                    "w-full rounded-lg bg-slate-900/60 border border-white/10 px-3 py-2 outline-none focus:ring-2 focus:ring-cyan-400",
                    errors.name ? "ring-2 ring-rose-400" : "",
                  ].join(" ")}
                  placeholder="Mary Owner"
                />
                {errors.name && (
                  <p className="mt-1 text-xs text-rose-300">{errors.name}</p>
                )}
              </div>

              <div>
                <label
                  className="block text-sm text-slate-300 mb-1"
                  htmlFor="email"
                >
                  Email
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  value={form.email}
                  onChange={onChange}
                  className={[
                    "w-full rounded-lg bg-slate-900/60 border border-white/10 px-3 py-2 outline-none focus:ring-2 focus:ring-cyan-400",
                    errors.email ? "ring-2 ring-rose-400" : "",
                  ].join(" ")}
                  placeholder="owner1@example.com"
                />
                {errors.email && (
                  <p className="mt-1 text-xs text-rose-300">{errors.email}</p>
                )}
              </div>

              <div>
                <label
                  className="block text-sm text-slate-300 mb-1"
                  htmlFor="phone"
                >
                  Phone
                </label>
                <input
                  id="phone"
                  name="phone"
                  value={form.phone}
                  onChange={onChange}
                  className={[
                    "w-full rounded-lg bg-slate-900/60 border border-white/10 px-3 py-2 outline-none focus:ring-2 focus:ring-cyan-400",
                    errors.phone ? "ring-2 ring-rose-400" : "",
                  ].join(" ")}
                  placeholder="0781112223"
                />
                {errors.phone && (
                  <p className="mt-1 text-xs text-rose-300">{errors.phone}</p>
                )}
              </div>

              <button
                type="submit"
                disabled={busy || !termsOk}
                className="mt-2 inline-flex items-center justify-center gap-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 active:scale-[0.99] text-slate-900 font-medium px-4 py-2.5 transition disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {busy ? (
                  <>
                    <span className="h-4 w-4 rounded-full border-2 border-slate-900 border-r-transparent animate-spin" />
                    Creating…
                  </>
                ) : (
                  "Create owner account"
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

/* ——— Helpers ——— */
function normalizeLaravelErrors(e) {
  const out = {};
  if (!e) return out;
  if (typeof e === "string") {
    out._ = e;
    return out;
  }
  Object.entries(e).forEach(([k, v]) => {
    if (Array.isArray(v)) out[k] = v[0];
    else if (typeof v === "string") out[k] = v;
    else out[k] = JSON.stringify(v);
  });
  return out;
}
