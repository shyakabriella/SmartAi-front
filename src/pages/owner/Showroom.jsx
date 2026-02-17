import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

/* ✅ API base (/api) */
const API_BASE =
  import.meta.env.VITE_API_BASE_URL ||
  import.meta.env.VITE_API_URL ||
  import.meta.env.VITE_API ||
  "";

/* ✅ token keys */
const TOKEN_KEYS = ["token", "access_token", "auth_token", "smartcar_token"];

function getStoredToken() {
  if (typeof window === "undefined") return "";
  for (const k of TOKEN_KEYS) {
    const v = window.localStorage.getItem(k);
    if (v && String(v).trim()) return String(v).trim();
  }
  return "";
}

function unwrapApiPayload(json) {
  if (json && typeof json === "object" && "data" in json) return json.data;
  return json;
}

function extractErrorMessage(json) {
  const msg = json?.message || json?.error || json?.data?.message || "";
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

export default function Showroom() {
  const nav = useNavigate();
  const [token] = useState(() => getStoredToken());

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [flash, setFlash] = useState(null);
  const [error, setError] = useState("");

  const [profile, setProfile] = useState(null);
  const [vehiclesCount, setVehiclesCount] = useState(0);

  const [form, setForm] = useState({
    name: "",
    phone: "",
    email: "",
    address: "",
    about: "",
  });

  useEffect(() => {
    (async () => {
      setError("");
      setFlash(null);
      setLoading(true);

      try {
        // ✅ owner profile
        const profJson = await apiRequest("/showroom/profile", { token });
        const prof = unwrapApiPayload(profJson) || null;
        setProfile(prof);

        setForm({
          name: prof?.name || prof?.title || "",
          phone: prof?.phone || "",
          email: prof?.email || "",
          address: prof?.address || prof?.location || "",
          about: prof?.about || prof?.description || "",
        });

        // ✅ showroom vehicles count (owner's own)
        const vJson = await apiRequest("/showroom/vehicles", { token });
        const vData = unwrapApiPayload(vJson);
        const list = Array.isArray(vData) ? vData : Array.isArray(vData?.data) ? vData.data : [];
        setVehiclesCount(list.length);
      } catch (e) {
        setError(e?.message || "Failed to load showroom.");
      } finally {
        setLoading(false);
      }
    })();
  }, [token]);

  const title = useMemo(() => {
    return form.name || profile?.name || "My Showroom";
  }, [form.name, profile]);

  const setField = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const saveProfile = async () => {
    setFlash(null);
    setError("");
    setSaving(true);

    try {
      const payload = {
        name: String(form.name || "").trim(),
        phone: String(form.phone || "").trim(),
        email: String(form.email || "").trim(),
        address: String(form.address || "").trim(),
        about: String(form.about || "").trim(),
      };

      const json = await apiRequest("/showroom/profile", {
        method: "POST",
        token,
        body: payload,
      });

      const saved = unwrapApiPayload(json) || payload;
      setProfile(saved);
      setFlash({ type: "success", text: "✅ Showroom profile saved successfully!" });
    } catch (e) {
      setFlash({ type: "error", text: e?.message || "Could not save profile." });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-6">
      <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">{title}</h1>
          <p className="text-sm text-slate-500">
            Manage your showroom profile ✨ • Vehicles:{" "}
            <span className="font-semibold text-slate-700">{vehiclesCount}</span>
          </p>
        </div>

        <button
          type="button"
          onClick={() => nav("/owner")}
          className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
        >
          ← Back to Dashboard
        </button>
      </div>

      {loading && (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-600">
          Loading showroom…
        </div>
      )}

      {!loading && error && (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
          ❌ {error}
        </div>
      )}

      {!loading && !error && (
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1.2fr),minmax(0,0.8fr)]">
          {/* Profile form */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-3 text-sm font-semibold text-slate-900">
              Showroom Profile
            </div>

            {flash && (
              <div
                className={[
                  "mb-3 rounded-xl border px-3 py-2 text-sm",
                  flash.type === "success"
                    ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                    : "border-rose-200 bg-rose-50 text-rose-700",
                ].join(" ")}
              >
                {flash.text}
              </div>
            )}

            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600">
                  Showroom name
                </label>
                <input
                  value={form.name}
                  onChange={(e) => setField("name", e.target.value)}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-emerald-400"
                  placeholder="Example: Kigali Premium Cars"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600">
                  Phone
                </label>
                <input
                  value={form.phone}
                  onChange={(e) => setField("phone", e.target.value)}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-emerald-400"
                  placeholder="+250 78xxxxxxx"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600">
                  Email
                </label>
                <input
                  value={form.email}
                  onChange={(e) => setField("email", e.target.value)}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-emerald-400"
                  placeholder="showroom@email.com"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600">
                  Address
                </label>
                <input
                  value={form.address}
                  onChange={(e) => setField("address", e.target.value)}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-emerald-400"
                  placeholder="Kigali, Kacyiru..."
                />
              </div>
            </div>

            <div className="mt-3">
              <label className="mb-1 block text-xs font-medium text-slate-600">
                About showroom
              </label>
              <textarea
                value={form.about}
                onChange={(e) => setField("about", e.target.value)}
                rows={4}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-emerald-400"
                placeholder="Describe your showroom..."
              />
            </div>

            <button
              type="button"
              onClick={saveProfile}
              disabled={saving}
              className="mt-4 inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
            >
              {saving && (
                <span className="inline-block h-4 w-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
              )}
              {saving ? "Saving..." : "Save Profile"}
            </button>
          </div>

          {/* Quick actions */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="text-sm font-semibold text-slate-900 mb-2">
              Quick actions
            </div>

            <button
              type="button"
              onClick={() => nav("/owner/vehicles")}
              className="w-full rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              Manage Vehicles →
            </button>

            <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600">
              Tip: Your showroom vehicles are under <b>/owner/vehicles</b>.
              If you use a different route, tell me and I’ll update it.
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
