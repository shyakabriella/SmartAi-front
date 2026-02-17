// src/pages/admin/drivers/DriversPage.jsx
import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api } from "../../../lib/api";

const BACKEND_ORIGIN =
  (import.meta.env.VITE_BACKEND_URL || "").trim().replace(/\/+$/, "");

function toAbsoluteUrl(url) {
  if (!url) return "";
  const s = String(url).trim();
  if (!s) return "";

  // already absolute
  if (s.startsWith("http://") || s.startsWith("https://")) return s;

  // best: backend origin
  if (BACKEND_ORIGIN) {
    return s.startsWith("/") ? `${BACKEND_ORIGIN}${s}` : `${BACKEND_ORIGIN}/${s}`;
  }

  // fallback: current origin (works only if you proxy /storage)
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  return s.startsWith("/") ? `${origin}${s}` : `${origin}/${s}`;
}

/**
 * Normalize DB stored values to a /storage/... path:
 * Accepts:
 * - "drivers/1/x.jpg"
 * - "/storage/drivers/1/x.jpg"
 * - "storage/drivers/1/x.jpg"
 * - full http url
 */
function normalizeStoragePath(p) {
  if (!p) return "";

  const s = String(p).trim();
  if (!s) return "";

  if (s.startsWith("http://") || s.startsWith("https://")) return s;

  // already /storage/...
  if (s.startsWith("/storage/")) return s;

  // storage/...
  if (s.startsWith("storage/")) return `/${s}`;

  // if it is already like "/drivers/1/x.jpg" or "drivers/1/x.jpg"
  const clean = s.replace(/^\/+/, "");
  return `/storage/${clean}`;
}

export default function DriversPage() {
  const nav = useNavigate();
  const [rows, setRows] = useState([]);
  const [meta, setMeta] = useState(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [q, setQ] = useState("");

  function toPath(u) {
    try {
      const url = new URL(u);
      return url.pathname.replace(/^\/api/, "") + (url.search || "");
    } catch {
      return u;
    }
  }

  function normalize(out) {
    const root = out?.success !== undefined ? out.data : out;
    let list = Array.isArray(root) ? root : root?.data ?? [];
    let m = root?.meta ?? null;

    if (!m && root?.current_page) {
      m = {
        current_page: root.current_page,
        last_page: root.last_page,
        links: [{ url: root.prev_page_url || null }, { url: root.next_page_url || null }],
      };
    }
    return { list, meta: m };
  }

  async function load(path = "/drivers") {
    setLoading(true);
    setErr("");
    try {
      const out = await api(path);
      const { list, meta } = normalize(out);
      setRows(list);
      setMeta(meta);
    } catch (e) {
      setErr(e.message || "Failed to load drivers");
      setRows([]);
      setMeta(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const filtered = useMemo(() => {
    if (!q) return rows;
    const s = q.toLowerCase();
    return rows.filter((d) => {
      const name = (d?.user?.name || "").toLowerCase();
      const email = (d?.user?.email || "").toLowerCase();
      const license = (d?.license_no || "").toLowerCase();
      const gender = (d?.gender || "").toLowerCase();
      const address = (d?.current_address || "").toLowerCase();
      return (
        name.includes(s) ||
        email.includes(s) ||
        license.includes(s) ||
        gender.includes(s) ||
        address.includes(s)
      );
    });
  }, [rows, q]);

  function badgeStatus(status) {
    const s = (status || "active").toLowerCase();
    if (s === "active") return "bg-emerald-50 text-emerald-700";
    if (s === "inactive") return "bg-slate-100 text-slate-700";
    if (s === "suspended") return "bg-rose-50 text-rose-700";
    return "bg-slate-100 text-slate-700";
  }

  function profileImgUrl(driver) {
    // sometimes photo may be in driver.profile_image OR driver.user.avatar etc
    const p =
      driver?.profile_image ||
      driver?.user?.profile_image ||
      driver?.user?.avatar ||
      driver?.user?.photo ||
      "";

    const normalized = normalizeStoragePath(p);
    return normalized ? toAbsoluteUrl(normalized) : "";
  }

  async function remove(id) {
    if (!confirm("Delete this driver? This cannot be undone.")) return;
    try {
      await api(`/drivers/${id}`, { method: "DELETE" });
      setRows((r) => r.filter((x) => x.id !== id));
    } catch (e) {
      setErr(e.message || "Delete failed");
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <div>
          <h1 className="text-xl font-semibold">Drivers</h1>
         
        </div>

        <div className="flex items-center gap-2">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search name/email/license/gender/address…"
            className="h-10 rounded-lg border border-slate-300 px-3"
          />
          <Link
            to="/admin/drivers/new"
            className="h-10 px-4 rounded-lg bg-blue-600 text-white inline-flex items-center hover:bg-blue-700"
          >
            + New
          </Link>
        </div>
      </div>

      {err && (
        <div className="rounded-lg border border-rose-300 bg-rose-50 text-rose-700 px-3 py-2 text-sm">
          {err}
        </div>
      )}

      <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50 text-slate-600">
              <tr>
                <th className="px-4 py-2 text-left">Driver</th>
                <th className="px-4 py-2 text-left">License</th>
                <th className="px-4 py-2 text-left">Status</th>
                <th className="px-4 py-2 text-left">Verified</th>
                <th className="px-4 py-2 text-left">Available</th>
                <th className="px-4 py-2 text-left">Gender</th>
                <th className="px-4 py-2 text-left">Location</th>
                <th className="px-4 py-2 text-left">Vehicle</th>
                <th className="px-4 py-2 text-right">Actions</th>
              </tr>
            </thead>

            <tbody>
              {loading ? (
                <tr>
                  <td className="px-4 py-6" colSpan={9}>
                    Loading…
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td className="px-4 py-6" colSpan={9}>
                    No drivers.
                  </td>
                </tr>
              ) : (
                filtered.map((d) => {
                  const img = profileImgUrl(d);

                  return (
                    <tr key={d.id} className="border-t border-slate-100">
                      {/* Driver */}
                      <td className="px-4 py-2">
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-xl overflow-hidden bg-slate-100 border">
                            {img ? (
                              <img
                                src={img}
                                alt={d.user?.name || "Driver"}
                                className="h-full w-full object-cover"
                                onError={(e) => {
                                  // clean fallback
                                  e.currentTarget.style.display = "none";
                                }}
                              />
                            ) : (
                              <div className="h-full w-full grid place-items-center text-slate-400 text-[10px]">
                                No photo
                              </div>
                            )}
                          </div>

                          <div className="leading-tight">
                            <div className="font-medium">{d.user?.name || "-"}</div>
                            <div className="text-xs text-slate-500">{d.user?.email || "-"}</div>
                          </div>
                        </div>
                      </td>

                      {/* License */}
                      <td className="px-4 py-2">
                        <div className="text-slate-700">{d.license_no || "-"}</div>
                        {d.license_category && (
                          <div className="text-xs text-slate-500">Cat: {d.license_category}</div>
                        )}
                      </td>

                      {/* Status */}
                      <td className="px-4 py-2">
                        <span
                          className={[
                            "inline-flex items-center px-2 py-0.5 rounded text-xs",
                            badgeStatus(d.status),
                          ].join(" ")}
                        >
                          {d.status || "active"}
                        </span>
                      </td>

                      {/* Verified */}
                      <td className="px-4 py-2">
                        <span
                          className={[
                            "inline-flex items-center px-2 py-0.5 rounded text-xs",
                            d.is_verified
                              ? "bg-emerald-50 text-emerald-700"
                              : "bg-slate-100 text-slate-700",
                          ].join(" ")}
                        >
                          {d.is_verified ? "YES" : "NO"}
                        </span>
                      </td>

                      {/* Available */}
                      <td className="px-4 py-2">
                        <span
                          className={[
                            "inline-flex items-center px-2 py-0.5 rounded text-xs",
                            d.is_available ? "bg-blue-50 text-blue-700" : "bg-slate-100 text-slate-700",
                          ].join(" ")}
                        >
                          {d.is_available ? "YES" : "NO"}
                        </span>
                      </td>

                      {/* Gender */}
                      <td className="px-4 py-2">{d.gender || "-"}</td>

                      {/* Location */}
                      <td className="px-4 py-2">
                        {d.current_address ? (
                          <div className="max-w-[260px] truncate" title={d.current_address}>
                            📍 {d.current_address}
                          </div>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>

                      {/* Vehicle */}
                      <td className="px-4 py-2">
                        {d.vehicle?.name ? (
                          `${d.vehicle.name} (${d.vehicle.plate || "-"})`
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="px-4 py-2 text-right">
                        <div className="inline-flex gap-2">
                          <button
                            onClick={() => nav(`/admin/drivers/${d.id}`)}
                            className="px-3 py-1.5 rounded-lg border border-slate-300 hover:bg-slate-50"
                          >
                            View
                          </button>
                          <button
                            onClick={() => remove(d.id)}
                            className="px-3 py-1.5 rounded-lg border border-rose-300 text-rose-700 hover:bg-rose-50"
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {meta && (
          <div className="p-3 flex items-center justify-between text-sm text-slate-500 border-t border-slate-200">
            <button
              disabled={!meta?.links?.[0]?.url}
              onClick={() => meta.links?.[0]?.url && load(toPath(meta.links[0].url))}
              className="px-3 py-1.5 rounded-lg border border-slate-300 disabled:opacity-50"
            >
              Prev
            </button>
            <span>
              Page {meta.current_page} / {meta.last_page}
            </span>
            <button
              disabled={!meta?.links?.[meta.links.length - 1]?.url}
              onClick={() =>
                meta.links?.[meta.links.length - 1]?.url && load(toPath(meta.links.at(-1).url))
              }
              className="px-3 py-1.5 rounded-lg border border-slate-300 disabled:opacity-50"
            >
              Next
            </button>
          </div>
        )}
      </div>
    </div>
  );
}