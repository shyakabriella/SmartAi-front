// src/pages/admin/customers/CustomersPage.jsx
import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api } from "../../../lib/api";

export default function CustomersPage() {
  const nav = useNavigate();
  const [rows, setRows] = useState([]);
  const [meta, setMeta] = useState(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [q, setQ] = useState("");

  function toPath(u) {
    // Convert absolute URL (e.g. http://127.0.0.1:8000/api/customers?page=2)
    // into a path that our helper accepts (e.g. /customers?page=2)
    try {
      const url = new URL(u);
      return url.pathname.replace(/^\/api/, "") + (url.search || "");
    } catch {
      // already a relative path
      return u;
    }
  }

  function extractListAndMeta(out) {
    // Accept shapes:
    // 1) Plain paginator: { current_page, data: [...], last_page, next_page_url, prev_page_url, ... }
    // 2) API Resource style: { data: [...], meta: {...}, links: {...} }
    // 3) Wrapped: { success, data: <either of above> }
    const root = out?.success !== undefined ? out.data : out;

    // List
    let list = [];
    if (Array.isArray(root)) list = root;
    else if (Array.isArray(root?.data)) list = root.data;             // resource or paginator
    else if (Array.isArray(root?.data?.data)) list = root.data.data;  // wrapped resource
    else list = root?.data ?? []; // last resort

    // Meta
    let m = root?.meta ?? null;
    if (!m && root?.current_page) {
      // synthesize meta from plain paginator keys
      m = {
        current_page: root.current_page,
        last_page: root.last_page,
        links: [
          { url: root.prev_page_url || null },
          { url: root.next_page_url || null },
        ],
      };
    }
    return { list, meta: m };
  }

  async function load(path = "/customers") {
    setLoading(true);
    setErr("");
    try {
      const out = await api(path);
      const { list, meta } = extractListAndMeta(out);
      setRows(list);
      setMeta(meta);
    } catch (e) {
      setErr(e.message || "Failed to load customers");
      setRows([]);
      setMeta(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => {
    if (!q) return rows;
    const s = q.toLowerCase();
    return rows.filter((c) =>
      (c?.code || "").toLowerCase().includes(s) ||
      (c?.user?.name || "").toLowerCase().includes(s) ||
      (c?.user?.email || "").toLowerCase().includes(s)
    );
  }, [rows, q]);

  async function remove(id) {
    if (!confirm("Delete this customer? This cannot be undone.")) return;
    await api(`/customers/${id}`, { method: "DELETE" });
    setRows((r) => r.filter((x) => x.id !== id));
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <div>
          <h1 className="text-xl font-semibold">Customers</h1>
          <p className="text-sm text-slate-500">Manage customer accounts and showrooms.</p>
        </div>
        <div className="flex items-center gap-2">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search name/email/code…"
            className="h-10 rounded-lg border border-slate-300 px-3"
          />
          <Link
            to="/admin/customers/new"
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
                <th className="px-4 py-2 text-left">ID</th>
                <th className="px-4 py-2 text-left">Code</th>
                <th className="px-4 py-2 text-left">Name</th>
                <th className="px-4 py-2 text-left">Email</th>
                <th className="px-4 py-2 text-left">Status</th>
                <th className="px-4 py-2 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td className="px-4 py-6" colSpan={6}>Loading…</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td className="px-4 py-6" colSpan={6}>No customers.</td></tr>
              ) : (
                filtered.map((c) => (
                  <tr key={c.id} className="border-t border-slate-100">
                    <td className="px-4 py-2">{c.id}</td>
                    <td className="px-4 py-2 font-medium">{c.code}</td>
                    <td className="px-4 py-2">{c.user?.name}</td>
                    <td className="px-4 py-2">{c.user?.email}</td>
                    <td className="px-4 py-2">
                      <span className={[
                        "inline-flex items-center px-2 py-0.5 rounded text-xs",
                        c.status === "active" ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-600"
                      ].join(" ")}>{c.status}</span>
                    </td>
                    <td className="px-4 py-2 text-right">
                      <div className="inline-flex gap-2">
                        <button
                          onClick={() => nav(`/admin/customers/${c.id}`)}
                          className="px-3 py-1.5 rounded-lg border border-slate-300 hover:bg-slate-50"
                        >
                          View
                        </button>
                        <button
                          onClick={() => remove(c.id)}
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

        {meta && (
          <div className="p-3 flex items-center justify-between text-sm text-slate-500 border-t border-slate-200">
            <button
              disabled={!meta?.links?.[0]?.url}
              onClick={() => meta.links?.[0]?.url && load(toPath(meta.links[0].url))}
              className="px-3 py-1.5 rounded-lg border border-slate-300 disabled:opacity-50"
            >
              Prev
            </button>
            <span>Page {meta.current_page} / {meta.last_page}</span>
            <button
              disabled={!meta?.links?.[meta.links.length - 1]?.url}
              onClick={() => meta.links?.[meta.links.length - 1]?.url && load(toPath(meta.links.at(-1).url))}
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
