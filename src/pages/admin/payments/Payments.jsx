// src/pages/admin/payments/Payments.jsx
import { useEffect, useMemo, useState } from "react";

// Optional: if you already have api helper, uncomment the next line
// import { api } from "../../../lib/api";

export default function Payments() {
  const API = import.meta.env.VITE_API_URL || `${window.location.origin}/api`;

  const [rows, setRows] = useState([]);
  const [meta, setMeta] = useState(null);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [tab, setTab] = useState("transactions"); // 'overview' | 'transactions'
  const [err, setErr] = useState("");

  async function load(url = "/payments") {
    setLoading(true);
    setErr("");
    try {
      // If you use the api helper:
      // const { data } = await api.get(url);

      // Fallback direct fetch (works without api helper)
      const token = localStorage.getItem("token");
      const res = await fetch(
        url.startsWith("http") ? url : `${API}${url}`,
        { headers: { Accept: "application/json", Authorization: token ? `Bearer ${token}` : undefined } }
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data?.message || "Failed to load payments");

      setRows(data?.data || data || []);
      setMeta(data?.meta || null);
    } catch (e) {
      setErr(e.message || "Failed to load payments");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => {
    if (!q) return rows;
    const s = q.toLowerCase();
    return rows.filter((p) =>
      (p?.reference || "").toLowerCase().includes(s) ||
      (p?.customer?.user?.name || "").toLowerCase().includes(s) ||
      (p?.driver?.user?.name || "").toLowerCase().includes(s) ||
      (String(p?.amount || "")).toLowerCase().includes(s)
    );
  }, [rows, q]);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between gap-2">
        <div>
          <h1 className="text-xl font-semibold">Payments</h1>
          <p className="text-sm text-slate-500">
            Track rental payments, driver payouts, tax and fees.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search ref/name/amount…"
            className="h-10 rounded-lg border border-slate-300 px-3"
          />
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-slate-200">
        <button
          onClick={() => setTab("overview")}
          className={[
            "h-10 px-4 -mb-px border-b-2",
            tab === "overview" ? "border-slate-900 text-slate-900" : "border-transparent text-slate-500 hover:text-slate-800"
          ].join(" ")}
        >
          Overview
        </button>
        <button
          onClick={() => setTab("transactions")}
          className={[
            "h-10 px-4 -mb-px border-b-2",
            tab === "transactions" ? "border-slate-900 text-slate-900" : "border-transparent text-slate-500 hover:text-slate-800"
          ].join(" ")}
        >
          Transactions
        </button>
      </div>

      {/* Content */}
      {tab === "overview" ? (
        <Overview rows={rows} loading={loading} err={err} />
      ) : (
        <TransactionsTable
          rows={filtered}
          meta={meta}
          loading={loading}
          err={err}
          onPrev={() => meta?.links?.[0]?.url && load(meta.links[0].url)}
          onNext={() => meta?.links?.[meta.links.length - 1]?.url && load(meta.links.at(-1).url)}
        />
      )}
    </div>
  );
}

function Overview({ rows, loading, err }) {
  // Simple aggregates
  const totals = useMemo(() => {
    const sum = (k) => rows.reduce((acc, r) => acc + (Number(r?.[k]) || 0), 0);
    return {
      total_amount: sum("amount"),
      total_tax: sum("tax_amount"),
      total_fees: sum("fee_amount"),
    };
  }, [rows]);

  return (
    <div className="grid gap-4 sm:grid-cols-3">
      <StatCard title="Total Collected" value={money(totals.total_amount)} loading={loading} />
      <StatCard title="Tax" value={money(totals.total_tax)} loading={loading} />
      <StatCard title="Fees" value={money(totals.total_fees)} loading={loading} />
      {err && <div className="sm:col-span-3 text-rose-700 bg-rose-50 border border-rose-200 rounded-lg p-3">{err}</div>}
    </div>
  );
}

function TransactionsTable({ rows, meta, loading, err, onPrev, onNext }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden">
      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead className="bg-slate-50 text-slate-600">
            <tr>
              <th className="px-4 py-2 text-left">Date</th>
              <th className="px-4 py-2 text-left">Reference</th>
              <th className="px-4 py-2 text-left">Customer</th>
              <th className="px-4 py-2 text-left">Driver</th>
              <th className="px-4 py-2 text-left">Type</th>
              <th className="px-4 py-2 text-right">Amount</th>
              <th className="px-4 py-2 text-right">Status</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td className="px-4 py-6" colSpan={7}>Loading…</td></tr>
            ) : err ? (
              <tr><td className="px-4 py-6 text-rose-700" colSpan={7}>{err}</td></tr>
            ) : rows.length === 0 ? (
              <tr><td className="px-4 py-6" colSpan={7}>No payments.</td></tr>
            ) : (
              rows.map((p) => (
                <tr key={p.id} className="border-t border-slate-100">
                  <td className="px-4 py-2">{fmtDate(p.created_at)}</td>
                  <td className="px-4 py-2 font-medium">{p.reference || `PAY-${p.id}`}</td>
                  <td className="px-4 py-2">{p.customer?.user?.name || "—"}</td>
                  <td className="px-4 py-2">{p.driver?.user?.name || "—"}</td>
                  <td className="px-4 py-2">{p.type || "rent"}</td>
                  <td className="px-4 py-2 text-right">{money(p.amount)}</td>
                  <td className="px-4 py-2 text-right">
                    <span className={[
                      "inline-flex items-center px-2 py-0.5 rounded text-xs",
                      (p.status || "completed") === "completed"
                        ? "bg-emerald-50 text-emerald-700"
                        : "bg-amber-50 text-amber-700"
                    ].join(" ")}>
                      {p.status || "completed"}
                    </span>
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
            onClick={onPrev}
            className="px-3 py-1.5 rounded-lg border border-slate-300 disabled:opacity-50"
          >
            Prev
          </button>
          <span>Page {meta.current_page} / {meta.last_page}</span>
          <button
            disabled={!meta?.links?.[meta.links.length - 1]?.url}
            onClick={onNext}
            className="px-3 py-1.5 rounded-lg border border-slate-300 disabled:opacity-50"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}

function StatCard({ title, value, loading }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4">
      <div className="text-slate-500 text-sm">{title}</div>
      <div className="text-2xl font-semibold mt-1">{loading ? "…" : value}</div>
    </div>
  );
}

function money(n) {
  const v = Number(n || 0);
  return new Intl.NumberFormat(undefined, { style: "currency", currency: "USD" }).format(v);
}

function fmtDate(iso) {
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return "—";
  }
}
