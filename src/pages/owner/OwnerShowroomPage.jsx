// src/pages/owner/OwnerShowroomPage.jsx
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

function safeParse(s) {
  try {
    return s ? JSON.parse(s) : null;
  } catch {
    return null;
  }
}

function pickData(payload) {
  if (!payload) return null;
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.data)) return payload.data;
  if (payload?.data && typeof payload.data === "object") return payload.data;
  return payload;
}

function safeJsonFromText(text) {
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

export default function OwnerShowroomPage() {
  const nav = useNavigate();

  const token = useMemo(() => localStorage.getItem("token") || "", []);
  const user = useMemo(() => {
    return (
      safeParse(localStorage.getItem("auth.user")) ||
      safeParse(localStorage.getItem("user")) ||
      null
    );
  }, []);

  // ✅ FIX: read the correct env var (VITE_API_URL), fallback to VITE_API_BASE
  // Your .env has: VITE_API_URL=http://127.0.0.1:8000/api
  const API_BASE = useMemo(() => {
    const raw =
      (import.meta?.env?.VITE_API_URL || import.meta?.env?.VITE_API_BASE || "")
        .trim()
        .replace(/\/+$/, "");

    // If env missing, fall back to /api (works only if you proxy /api to backend)
    return raw || "/api";
  }, []);

  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  const [showroom, setShowroom] = useState(null);
  const [vehicles, setVehicles] = useState([]);

  useEffect(() => {
    let alive = true;

    async function req(url) {
      const res = await fetch(url, {
        method: "GET",
        headers: {
          Accept: "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });

      const text = await res.text();
      const json = safeJsonFromText(text);

      // Helpful error messages
      if (res.status === 401) {
        throw new Error(json?.message || "Unauthorized. Please login again.");
      }

      if (!res.ok) {
        const msg =
          json?.message ||
          json?.error ||
          text ||
          `Request failed (${res.status})`;
        throw new Error(`${msg}  |  URL: ${url}`);
      }

      return json;
    }

    async function load() {
      setLoading(true);
      setErr("");

      try {
        // ✅ REAL endpoints that exist in your Laravel route:list
        const srRes = await req(`${API_BASE}/showroom/profile`);
        const sr = pickData(srRes);
        const showroomObj = Array.isArray(sr) ? sr[0] : sr;

        const vRes = await req(`${API_BASE}/showroom/vehicles`);
        const vData = pickData(vRes);
        const vList = Array.isArray(vData)
          ? vData
          : Array.isArray(vData?.data)
          ? vData.data
          : [];

        if (!alive) return;

        setShowroom(showroomObj || null);
        setVehicles(vList || []);
      } catch (e) {
        if (!alive) return;
        setErr(e?.message || "Failed to load showroom.");
      } finally {
        if (!alive) return;
        setLoading(false);
      }
    }

    load();
    return () => {
      alive = false;
    };
  }, [API_BASE, token]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">My ShowRoom</h1>
          <p className="text-sm text-slate-500">
            This is your showroom page. From here you can manage and add cars 
          </p>

        </div>

        <button
          onClick={() => nav("/owner/vehicles")}
          className="inline-flex items-center h-10 px-4 rounded-lg bg-blue-600 text-white hover:bg-blue-700"
        >
          ➕ Add Car
        </button>
      </div>

      {loading && (
        <div className="rounded-2xl border border-slate-200 bg-white p-4 text-slate-600">
          Loading your showroom...
        </div>
      )}

      {!loading && err && (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-rose-700">
          {err}
          <div className="mt-2 text-sm text-rose-600">
            Tip: Your backend routes are: <b>/api/showroom/profile</b> and{" "}
            <b>/api/showroom/vehicles</b>
          </div>
        </div>
      )}

      {!loading && !err && (
        <>
          <div className="rounded-2xl border border-slate-200 bg-white p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-sm text-slate-500">Showroom</div>
                <div className="text-xl font-semibold text-slate-900">
                  {showroom?.name || showroom?.title || "My Showroom"}
                </div>
                <div className="mt-1 text-sm text-slate-600">
                  Owner: {user?.name || user?.email || "Owner"}
                </div>
              </div>

              <div className="text-xs px-2 py-1 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
                {showroom?.status || "active"}
              </div>
            </div>

            <div className="mt-4 grid sm:grid-cols-2 lg:grid-cols-3 gap-3 text-sm">
              <div className="rounded-xl border border-slate-200 p-3">
                <div className="text-xs text-slate-500">Location</div>
                <div className="font-medium text-slate-800">
                  {showroom?.location ||
                    showroom?.address ||
                    showroom?.city ||
                    "-"}
                </div>
              </div>
              <div className="rounded-xl border border-slate-200 p-3">
                <div className="text-xs text-slate-500">Phone</div>
                <div className="font-medium text-slate-800">
                  {showroom?.phone || "-"}
                </div>
              </div>
              <div className="rounded-xl border border-slate-200 p-3">
                <div className="text-xs text-slate-500">Email</div>
                <div className="font-medium text-slate-800">
                  {showroom?.email || "-"}
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-200 font-medium flex items-center justify-between">
              <span>My Vehicles</span>
              <span className="text-xs text-slate-500">
                {vehicles?.length || 0} vehicle(s)
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="text-left text-slate-500 bg-slate-50">
                    <th className="px-4 py-2">Plate</th>
                    <th className="px-4 py-2">Make</th>
                    <th className="px-4 py-2">Model</th>
                    <th className="px-4 py-2">Status</th>
                    <th className="px-4 py-2">Price/Day</th>
                  </tr>
                </thead>

                <tbody>
                  {(vehicles || []).slice(0, 10).map((v) => (
                    <tr key={v.id} className="border-t border-slate-100">
                      <td className="px-4 py-2 font-medium text-slate-800">
                        {v.plate_no || v.license_plate || "-"}
                      </td>
                      <td className="px-4 py-2">{v.make || "-"}</td>
                      <td className="px-4 py-2">{v.model || "-"}</td>
                      <td className="px-4 py-2">
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-slate-900/5 text-slate-700">
                          {v.status || "available"}
                        </span>
                      </td>
                      <td className="px-4 py-2">
                        {v.base_daily_rate ?? v.price_per_day ?? "-"}
                      </td>
                    </tr>
                  ))}

                  {(!vehicles || vehicles.length === 0) && (
                    <tr>
                      <td
                        colSpan={5}
                        className="px-4 py-6 text-center text-slate-500"
                      >
                        No vehicles yet. Click <b>Add Car</b> to add your first
                        car 🚗
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {vehicles?.length > 10 && (
              <div className="px-4 py-3 border-t border-slate-200 text-sm text-slate-600 flex justify-end">
                <button
                  onClick={() => nav("/owner/vehicles")}
                  className="text-blue-600 hover:text-blue-700 font-medium"
                >
                  View all vehicles →
                </button>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}