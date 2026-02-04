// src/pages/admin/reviews/ReviewsPage.jsx
import { useEffect, useMemo, useRef, useState } from "react";
import { api } from "../../../lib/api";

// helpers
const fmtDate = (iso) => (iso ? new Date(iso).toLocaleString() : "-");
const stars = (n) =>
  "★"
    .repeat(Math.max(0, Math.min(Number(n) || 0, 5)))
    .padEnd(5, "☆");

export default function ReviewsPage() {
  const [rows, setRows] = useState([]);
  const [meta, setMeta] = useState(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  // server-side controls
  const [q, setQ] = useState("");
  const [rating, setRating] = useState(""); // "", "5","4","3","2","1"
  const [status, setStatus] = useState(""); // "", "visible","hidden"
  const [sort, setSort] = useState("newest"); // "newest","oldest","rating"

  // Laravel paginator often uses links urls; we store "current endpoint" too
  const [endpoint, setEndpoint] = useState("/reviews");

  // debounce search
  const debounceRef = useRef(null);

  function unwrap(out) {
    return out?.success !== undefined ? out.data : out;
  }

  // build query string for dynamic (server-side) filtering
  const queryUrl = useMemo(() => {
    const base = "/reviews";
    const params = new URLSearchParams();

    if (q) params.set("search", q);
    if (rating) params.set("rating", rating);
    if (status) params.set("status", status);

    // map sort values to backend-friendly values
    // backend can accept: newest|oldest|rating (you can change to your own)
    if (sort) params.set("sort", sort);

    const qs = params.toString();
    return qs ? `${base}?${qs}` : base;
  }, [q, rating, status, sort]);

  async function load(url) {
    setLoading(true);
    setErr("");

    try {
      const out = await api(url);
      const payload = unwrap(out);

      // supports either: { data: [...], meta: {...} } OR paginator structure
      const list = payload?.data ?? payload ?? [];
      setRows(Array.isArray(list) ? list : []);

      // meta can be inside payload.meta OR payload itself contains meta
      setMeta(payload?.meta || payload?.meta === null ? payload?.meta : payload?.meta || payload?.meta || payload?.meta || payload?.meta || payload?.meta);
      // safer:
      setMeta(payload?.meta ?? payload?.meta ?? payload?.meta ?? payload?.meta ?? payload?.meta ?? payload?.meta ?? null);

      // If your backend returns like Laravel:
      // { data: [...], links: [...], meta: {...} }
      // sometimes meta is at payload.meta and links at payload.links
      // we only need meta. If your API gives links separately, adjust below.
      if (!payload?.meta && payload?.links) {
        // Some APIs return { data, links, meta } (meta exists); ignore here.
      }
    } catch (e) {
      console.error(e);
      setRows([]);
      setMeta(null);
      setErr(e.message || "Failed to load reviews");
    } finally {
      setLoading(false);
    }
  }

  // initial load
  useEffect(() => {
    setEndpoint(queryUrl);
    load(queryUrl);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // reload when filters change (debounced)
  useEffect(() => {
    // reset to page 1 whenever filters change
    const next = queryUrl;
    setEndpoint(next);

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      load(next);
    }, q ? 350 : 0);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [queryUrl, q]);

  async function toggleVisibility(row) {
    const next = row?.status === "visible" ? "hidden" : "visible";
    const prevStatus = row?.status;

    try {
      // optimistic
      setRows((xs) =>
        xs.map((x) => (x.id === row.id ? { ...x, status: next } : x))
      );

      await api(`/reviews/${row.id}`, { method: "PUT", body: { status: next } });
    } catch (e) {
      // revert on failure
      setRows((xs) =>
        xs.map((x) => (x.id === row.id ? { ...x, status: prevStatus } : x))
      );
      alert(e.message || "Failed to update status");
    }
  }

  async function remove(id) {
    if (!confirm("Delete this review? This cannot be undone.")) return;

    try {
      // optimistic
      const prev = rows;
      setRows((xs) => xs.filter((x) => x.id !== id));

      await api(`/reviews/${id}`, { method: "DELETE" });
    } catch (e) {
      alert(e.message || "Failed to delete review");
      // reload as fallback
      load(endpoint || queryUrl);
    }
  }

  function go(url) {
    if (!url) return;

    // If backend returns absolute URLs in paginator, strip API base if needed
    const apiBase =
      import.meta.env.VITE_API_BASE_URL || `${location.origin}/api`;

    // remove "/api" from base to support both styles
    const baseNoApi = apiBase.replace(/\/api\/?$/, "");

    // cases:
    // 1) url == "https://domain.com/api/reviews?page=2"
    // 2) url == "/api/reviews?page=2"
    // 3) url == "/reviews?page=2"
    let path = url;

    if (path.startsWith(baseNoApi)) path = path.replace(baseNoApi, "");
    if (path.startsWith(apiBase)) path = path.replace(apiBase, "");

    // ensure it begins with "/"
    if (!path.startsWith("/")) path = "/" + path;

    // If server returns "/api/..." we want "/..."
    path = path.replace(/^\/api\/?/, "/");

    setEndpoint(path);
    load(path);
  }

  // ✅ If backend returns meta.links like Laravel, use it.
  // If not, we still show count.
  const links = meta?.links || null;
  const prevLink = links?.find((x) => x.label?.toLowerCase?.().includes("prev"))?.url || links?.[0]?.url;
  const nextLink =
    links?.find((x) => x.label?.toLowerCase?.().includes("next"))?.url ||
    links?.[links.length - 1]?.url;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">Reviews</h1>
          <p className="text-sm text-slate-500">
            Moderate driver/customer feedback and ratings.
          </p>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search comment/driver/customer…"
            className="h-10 rounded-lg border border-slate-300 px-3"
          />

          <select
            value={rating}
            onChange={(e) => setRating(e.target.value)}
            className="h-10 rounded-lg border border-slate-300 px-2"
            title="Filter by rating"
          >
            <option value="">All ratings</option>
            <option value="5">★★★★★ (5)</option>
            <option value="4">★★★★☆ (4)</option>
            <option value="3">★★★☆☆ (3)</option>
            <option value="2">★★☆☆☆ (2)</option>
            <option value="1">★☆☆☆☆ (1)</option>
          </select>

          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="h-10 rounded-lg border border-slate-300 px-2"
            title="Filter by status"
          >
            <option value="">All status</option>
            <option value="visible">Visible</option>
            <option value="hidden">Hidden</option>
          </select>

          <select
            value={sort}
            onChange={(e) => setSort(e.target.value)}
            className="h-10 rounded-lg border border-slate-300 px-2"
            title="Sort"
          >
            <option value="newest">Newest first</option>
            <option value="oldest">Oldest first</option>
            <option value="rating">Highest rating</option>
          </select>
        </div>
      </div>

      {/* Error */}
      {err && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 text-rose-700 px-3 py-2 text-sm">
          {err}
        </div>
      )}

      {/* Table */}
      <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50 text-slate-600">
              <tr>
                <th className="px-4 py-2 text-left">ID</th>
                <th className="px-4 py-2 text-left">Driver</th>
                <th className="px-4 py-2 text-left">Customer</th>
                <th className="px-4 py-2 text-left">Rating</th>
                <th className="px-4 py-2 text-left">Comment</th>
                <th className="px-4 py-2 text-left">Status</th>
                <th className="px-4 py-2 text-left">Date</th>
                <th className="px-4 py-2 text-right">Actions</th>
              </tr>
            </thead>

            <tbody>
              {loading ? (
                <tr>
                  <td className="px-4 py-6" colSpan={8}>
                    Loading…
                  </td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td className="px-4 py-6" colSpan={8}>
                    No reviews.
                  </td>
                </tr>
              ) : (
                rows.map((r) => (
                  <tr key={r.id} className="border-t border-slate-100 align-top">
                    <td className="px-4 py-2">{r.id}</td>

                    <td className="px-4 py-2">
                      <div className="font-medium">
                        {r?.driver?.user?.name || r?.driver?.name || "-"}
                      </div>
                      <div className="text-xs text-slate-500">
                        {r?.driver?.user?.email || r?.driver?.email || ""}
                      </div>
                    </td>

                    <td className="px-4 py-2">
                      <div className="font-medium">
                        {r?.customer?.user?.name || r?.customer?.name || "-"}
                      </div>
                      <div className="text-xs text-slate-500">
                        {r?.customer?.user?.email || r?.customer?.email || ""}
                      </div>
                    </td>

                    <td className="px-4 py-2 whitespace-nowrap">
                      <span className="font-medium tabular-nums">
                        {r?.rating ?? "-"}
                      </span>
                      <div className="text-amber-500 leading-none">
                        {stars(r?.rating)}
                      </div>
                    </td>

                    <td className="px-4 py-2 max-w-[420px]">
                      <div className="line-clamp-3 text-slate-700">
                        {r?.comment || "-"}
                      </div>
                    </td>

                    <td className="px-4 py-2">
                      <span
                        className={[
                          "inline-flex items-center px-2 py-0.5 rounded text-xs",
                          (r?.status || "") === "visible"
                            ? "bg-emerald-50 text-emerald-700"
                            : "bg-slate-100 text-slate-600",
                        ].join(" ")}
                      >
                        {r?.status || "hidden"}
                      </span>
                    </td>

                    <td className="px-4 py-2 whitespace-nowrap">
                      {fmtDate(r?.created_at)}
                    </td>

                    <td className="px-4 py-2 text-right">
                      <div className="inline-flex gap-2">
                        <button
                          onClick={() => toggleVisibility(r)}
                          className="px-3 py-1.5 rounded-lg border border-slate-300 hover:bg-slate-50"
                          title={
                            r?.status === "visible" ? "Hide review" : "Show review"
                          }
                        >
                          {r?.status === "visible" ? "Hide" : "Show"}
                        </button>
                        <button
                          onClick={() => remove(r.id)}
                          className="px-3 py-1.5 rounded-lg border border-rose-300 text-rose-700 hover:bg-rose-50"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {meta && (
          <div className="p-3 flex items-center justify-between text-sm text-slate-500 border-t border-slate-200">
            <button
              disabled={!prevLink}
              onClick={() => go(prevLink)}
              className="px-3 py-1.5 rounded-lg border border-slate-300 disabled:opacity-50"
            >
              Prev
            </button>

            <span>
              Page {meta.current_page || 1} / {meta.last_page || 1}
            </span>

            <button
              disabled={!nextLink}
              onClick={() => go(nextLink)}
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