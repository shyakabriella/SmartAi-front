import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

const API_BASE =
  import.meta.env.VITE_API_BASE_URL ||
  import.meta.env.VITE_API_URL ||
  import.meta.env.VITE_API ||
  "";

const TOKEN_KEYS = ["token", "access_token", "auth_token", "smartcar_token"];

function getStoredToken() {
  if (typeof window === "undefined") return "";
  for (const k of TOKEN_KEYS) {
    const v = window.localStorage.getItem(k);
    if (v && String(v).trim()) return String(v).trim();
  }
  return "";
}

function extractErrorMessage(json) {
  const msg = json?.message || json?.error || json?.data?.message || json?.data?.error || "";
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
  if (!res.ok) throw new Error(extractErrorMessage(json));
  return json;
}

export default function ShowroomsPage() {
  const nav = useNavigate();
  const [token] = useState(() => getStoredToken());

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [rows, setRows] = useState([]);
  const [q, setQ] = useState("");

  useEffect(() => {
    (async () => {
      setError("");
      setLoading(true);
      try {
        const json = await apiRequest("/showroom/profiles", { token });

        const list = Array.isArray(json?.data) ? json.data : [];
        setRows(list);
      } catch (e) {
        setError(e?.message || "Failed to load showrooms.");
      } finally {
        setLoading(false);
      }
    })();
  }, [token]);

  const filtered = useMemo(() => {
    const term = String(q || "").trim().toLowerCase();
    if (!term) return rows;

    return (rows || []).filter((r) => {
      const name = String(r?.name || "").toLowerCase();
      const email = String(r?.owner?.email || "").toLowerCase();
      const phone = String(r?.owner?.phone || "").toLowerCase();
      const ownerId = String(r?.owner_id ?? "");
      return (
        name.includes(term) ||
        email.includes(term) ||
        phone.includes(term) ||
        ownerId.includes(term)
      );
    });
  }, [rows, q]);

  return (
    <div className="p-6">
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">Showrooms</h1>
          <p className="text-sm text-slate-500">
            Select a showroom to view its cars
          </p>
        </div>

        <div className="w-full sm:w-80">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search showroom (name, email, phone, id)..."
            className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-emerald-400"
          />
        </div>
      </div>

      {loading && (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-600">
          Loading showrooms…
        </div>
      )}

      {!loading && error && (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
          ❌ {error}
        </div>
      )}

      {!loading && !error && filtered.length === 0 && (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-600">
          No showrooms found.
        </div>
      )}

      {!loading && !error && filtered.length > 0 && (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filtered.map((r) => {
            const profileId = r?.id;
            const ownerId = r?.owner_id;
            const name = r?.name || `Showroom #${profileId}`;
            const email = r?.owner?.email || "";
            const phone = r?.owner?.phone || "";

            return (
              <div
                key={profileId}
                className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
              >
                <div className="text-sm font-semibold text-slate-900">{name}</div>

                <div className="mt-1 text-xs text-slate-500">
                  {email ? `📧 ${email}` : "—"}
                  {phone ? ` • 📞 ${phone}` : ""}
                </div>

                <div className="mt-3 flex items-center justify-between">
                  <div className="text-[11px] text-slate-400">Owner ID: {ownerId}</div>

                  <button
                    type="button"
                    onClick={() => nav(`/admin/showrooms/${ownerId}/vehicles`, { state: { showroom: r } })}
                    className="rounded-lg bg-emerald-600 px-3 py-2 text-xs font-semibold text-white hover:bg-emerald-700"
                  >
                    View Cars →
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}