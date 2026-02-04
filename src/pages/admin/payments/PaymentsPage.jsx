// src/pages/admin/payments/PaymentsPage.jsx
import { useEffect, useMemo, useState } from "react";
import api from "../../../lib/api"; 


const TYPES = [
  { value: "", label: "All types" },
  { value: "rent", label: "Rent" },
  { value: "driver_payout", label: "Driver payout" },
  { value: "tax", label: "Tax" },
  { value: "fee", label: "Fee" },
  { value: "refund", label: "Refund" },
  { value: "other", label: "Other" },
];

const STATUSES = [
  { value: "", label: "All status" },
  { value: "paid", label: "Paid" },
  { value: "pending", label: "Pending" },
  { value: "overdue", label: "Overdue" },
  { value: "refunded", label: "Refunded" },
];

const PARTY_TYPES = [
  { value: "", label: "All parties" },
  { value: "customer", label: "Customer" },
  { value: "driver", label: "Driver" },
  { value: "vendor", label: "Vendor" },
];

const fmtMoney = (amt, ccy = "RWF") =>
  typeof amt === "number"
    ? new Intl.NumberFormat(undefined, { style: "currency", currency: ccy }).format(amt)
    : amt ?? "-";

const fmtDate = (iso) => (iso ? new Date(iso).toLocaleString() : "-");

export default function PaymentsPage() {
  // list state
  const [rows, setRows] = useState([]);
  const [meta, setMeta] = useState(null);
  const [loading, setLoading] = useState(true);

  // filters
  const [q, setQ] = useState("");
  const [type, setType] = useState("");
  const [status, setStatus] = useState("");
  const [party, setParty] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");    
  const [sort, setSort] = useState("newest"); 

  // quick-add form
  const [openCreate, setOpenCreate] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    type: "rent",
    status: "paid",
    party_type: "customer", 
    party_id: "",           
    amount: "",
    currency: "RWF",
    method: "cash",        
    reference: "",
    notes: "",
    due_at: "",
    paid_at: "",
  });

  function setF(k, v) { setForm((f) => ({ ...f, [k]: v })); }

  async function load(url = "/payments") {
    setLoading(true);
    try {
      // build query
      const params = new URLSearchParams();
      if (q) params.set("q", q);
      if (type) params.set("type", type);
      if (status) params.set("status", status);
      if (party) params.set("party_type", party);
      if (from) params.set("date_from", from);
      if (to) params.set("date_to", to);
      if (sort) params.set("sort", sort);

      const full = url.includes("?") || url.startsWith("http")
        ? url
        : `${url}?${params.toString()}`;

      const out = await api(full);
      const payload = out?.data ?? out;
      setRows(payload?.data || payload || []);
      setMeta(payload?.meta || null);
    } catch (e) {
      console.error(e);
      setRows([]);
      setMeta(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []); // initial

  const filtered = useMemo(() => {
    // if backend doesn’t support filters, we also filter client-side as fallback
    let list = Array.isArray(rows) ? [...rows] : [];
    if (q) {
      const s = q.toLowerCase();
      list = list.filter((r) =>
        (r?.reference || "").toLowerCase().includes(s) ||
        (r?.notes || "").toLowerCase().includes(s) ||
        (r?.party_name || "").toLowerCase().includes(s) ||
        (r?.customer?.user?.name || r?.driver?.user?.name || "").toLowerCase().includes(s)
      );
    }
    if (type)   list = list.filter((r) => (r?.type || "") === type);
    if (status) list = list.filter((r) => (r?.status || "") === status);
    if (party)  list = list.filter((r) => (r?.party_type || "") === party);

    switch (sort) {
      case "oldest": list.sort((a,b) => new Date(a.created_at) - new Date(b.created_at)); break;
      case "amount": list.sort((a,b) => (b?.amount||0) - (a?.amount||0)); break;
      default:       list.sort((a,b) => new Date(b.created_at) - new Date(a.created_at));
    }
    return list;
  }, [rows, q, type, status, party, sort]);

  function go(url) {
    if (!url) return;
    const base = import.meta.env.VITE_API_URL || `${location.origin}/api`;
    const path = url.startsWith(base) ? url.replace(base, "") : url;
    load(path);
  }

  async function togglePaid(row) {
    const next = row.status === "paid" ? "pending" : "paid";
    const prev = row.status;
    try {
      setRows((xs) => xs.map((x) => x.id === row.id ? { ...x, status: next } : x));
      await api(`/payments/${row.id}`, { method: "PUT", body: { status: next } });
    } catch (e) {
      setRows((xs) => xs.map((x) => x.id === row.id ? { ...x, status: prev } : x));
      alert(e.message || "Failed to update status");
    }
  }

  async function remove(id) {
    if (!confirm("Delete this payment? This cannot be undone.")) return;
    try {
      const prev = rows;
      setRows((xs) => xs.filter((x) => x.id !== id));
      await api(`/payments/${id}`, { method: "DELETE" });
    } catch (e) {
      alert(e.message || "Failed to delete payment");
      load();
    }
  }

  async function createPayment(e) {
    e.preventDefault();
    setSaving(true);
    try {
      // Basic validation
      if (!form.amount || !form.party_type || !form.type) {
        throw new Error("Please fill required fields (Amount, Party type, Type).");
      }
      const payload = { ...form, amount: Number(form.amount) };
      const res = await api("/payments", { method: "POST", body: payload });
      const created = res?.data ?? res;
      setRows((xs) => [created, ...xs]);
      setOpenCreate(false);
      // reset minimal fields
      setForm((f) => ({ ...f, amount: "", reference: "", notes: "", paid_at: "" }));
    } catch (e) {
      alert(e.message || "Failed to create payment");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4">
      {/* Header & filters */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">Payments</h1>
          <p className="text-sm text-slate-500">
            Track rent, driver payouts, taxes and other financial entries.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search ref/notes/name…"
            className="h-10 rounded-lg border border-slate-300 px-3"
          />
          <select value={type} onChange={(e)=>setType(e.target.value)} className="h-10 rounded-lg border border-slate-300 px-2">
            {TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
          <select value={status} onChange={(e)=>setStatus(e.target.value)} className="h-10 rounded-lg border border-slate-300 px-2">
            {STATUSES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
          </select>
          <select value={party} onChange={(e)=>setParty(e.target.value)} className="h-10 rounded-lg border border-slate-300 px-2">
            {PARTY_TYPES.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
          </select>
          <input type="date" value={from} onChange={(e)=>setFrom(e.target.value)} className="h-10 rounded-lg border border-slate-300 px-2" />
          <input type="date" value={to}   onChange={(e)=>setTo(e.target.value)}   className="h-10 rounded-lg border border-slate-300 px-2" />
          <select value={sort} onChange={(e)=>setSort(e.target.value)} className="h-10 rounded-lg border border-slate-300 px-2">
            <option value="newest">Newest first</option>
            <option value="oldest">Oldest first</option>
            <option value="amount">Amount (high→low)</option>
          </select>
          <button
            onClick={() => load("/payments")}
            className="h-10 px-3 rounded-lg border border-slate-300 hover:bg-slate-50"
            title="Apply filters"
          >
            Apply
          </button>
          <button
            onClick={() => setOpenCreate(true)}
            className="h-10 px-4 rounded-lg bg-blue-600 text-white hover:bg-blue-700"
          >
            + Add Payment
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50 text-slate-600">
              <tr>
                <th className="px-4 py-2 text-left">ID</th>
                <th className="px-4 py-2 text-left">Type</th>
                <th className="px-4 py-2 text-left">Party</th>
                <th className="px-4 py-2 text-left">Amount</th>
                <th className="px-4 py-2 text-left">Method</th>
                <th className="px-4 py-2 text-left">Status</th>
                <th className="px-4 py-2 text-left">Due / Paid</th>
                <th className="px-4 py-2 text-left">Ref / Notes</th>
                <th className="px-4 py-2 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td className="px-4 py-6" colSpan={9}>Loading…</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td className="px-4 py-6" colSpan={9}>No payments.</td></tr>
              ) : (
                filtered.map((r) => (
                  <tr key={r.id} className="border-t border-slate-100 align-top">
                    <td className="px-4 py-2">{r.id}</td>

                    <td className="px-4 py-2">
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-slate-100 text-slate-700">
                        {r.type || "-"}
                      </span>
                    </td>

                    <td className="px-4 py-2">
                      <div className="font-medium">
                        {r?.party_name ||
                         r?.customer?.user?.name ||
                         r?.driver?.user?.name ||
                         r?.customer?.name ||
                         r?.driver?.name ||
                         "-"}
                      </div>
                      <div className="text-xs text-slate-500">
                        {(r?.party_type || "").toUpperCase()} {r?.party_id ? `#${r.party_id}` : ""}
                      </div>
                    </td>

                    <td className="px-4 py-2">
                      <div className="font-medium tabular-nums">{fmtMoney(r.amount, r.currency || "RWF")}</div>
                      {r?.tax_amount ? (
                        <div className="text-xs text-slate-500">Tax: {fmtMoney(r.tax_amount, r.currency || "RWF")}</div>
                      ) : null}
                    </td>

                    <td className="px-4 py-2">{r.method || "-"}</td>

                    <td className="px-4 py-2">
                      <span className={[
                        "inline-flex items-center px-2 py-0.5 rounded text-xs",
                        r.status === "paid"     ? "bg-emerald-50 text-emerald-700"
                      : r.status === "overdue"  ? "bg-rose-50 text-rose-700"
                      : r.status === "refunded" ? "bg-amber-50 text-amber-700"
                      : "bg-slate-100 text-slate-600"
                      ].join(" ")}>{r.status || "-"}</span>
                    </td>

                    <td className="px-4 py-2">
                      <div><span className="text-slate-500 text-xs">Due:</span> {fmtDate(r.due_at)}</div>
                      <div><span className="text-slate-500 text-xs">Paid:</span> {fmtDate(r.paid_at)}</div>
                    </td>

                    <td className="px-4 py-2 max-w-[360px]">
                      <div className="font-medium">{r.reference || "-"}</div>
                      <div className="text-xs text-slate-600 line-clamp-2">{r.notes || ""}</div>
                    </td>

                    <td className="px-4 py-2 text-right">
                      <div className="inline-flex gap-2">
                        <button
                          onClick={() => togglePaid(r)}
                          className="px-3 py-1.5 rounded-lg border border-slate-300 hover:bg-slate-50"
                        >
                          {r.status === "paid" ? "Mark Pending" : "Mark Paid"}
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

        {/* Paginator */}
        {meta && (
          <div className="p-3 flex items-center justify-between text-sm text-slate-500 border-top border-slate-200">
            <button
              disabled={!meta?.links?.[0]?.url}
              onClick={() => go(meta.links?.[0]?.url)}
              className="px-3 py-1.5 rounded-lg border border-slate-300 disabled:opacity-50"
            >
              Prev
            </button>
            <span>Page {meta.current_page} / {meta.last_page}</span>
            <button
              disabled={!meta?.links?.[meta.links.length - 1]?.url}
              onClick={() => go(meta.links?.[meta.links.length - 1]?.url)}
              className="px-3 py-1.5 rounded-lg border border-slate-300 disabled:opacity-50"
            >
              Next
            </button>
          </div>
        )}
      </div>

      {/* Quick Add Drawer */}
      {openCreate && (
        <div className="fixed inset-0 z-50">
          <div className="absolute inset-0 bg-black/30" onClick={() => setOpenCreate(false)} />
          <div className="absolute right-0 top-0 h-full w-full max-w-md bg-white shadow-xl p-6 overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Add Payment</h3>
              <button onClick={() => setOpenCreate(false)} className="text-slate-500 hover:text-slate-700">✕</button>
            </div>

            <form onSubmit={createPayment} className="grid gap-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm text-slate-700 mb-1">Type</label>
                  <select
                    value={form.type}
                    onChange={(e)=>setF("type", e.target.value)}
                    className="w-full h-10 rounded-lg border border-slate-300 px-2"
                    required
                  >
                    {TYPES.filter(t=>t.value!=="").map(t => (
                      <option key={t.value} value={t.value}>{t.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm text-slate-700 mb-1">Status</label>
                  <select
                    value={form.status}
                    onChange={(e)=>setF("status", e.target.value)}
                    className="w-full h-10 rounded-lg border border-slate-300 px-2"
                    required
                  >
                    {["paid","pending","overdue","refunded"].map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm text-slate-700 mb-1">Party Type</label>
                  <select
                    value={form.party_type}
                    onChange={(e)=>setF("party_type", e.target.value)}
                    className="w-full h-10 rounded-lg border border-slate-300 px-2"
                    required
                  >
                    {PARTY_TYPES.filter(p=>p.value!=="").map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm text-slate-700 mb-1">Party ID</label>
                  <input
                    value={form.party_id}
                    onChange={(e)=>setF("party_id", e.target.value)}
                    className="w-full h-10 rounded-lg border border-slate-300 px-3"
                    placeholder="e.g. 12"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm text-slate-700 mb-1">Amount</label>
                  <input
                    type="number"
                    step="0.01"
                    value={form.amount}
                    onChange={(e)=>setF("amount", e.target.value)}
                    className="w-full h-10 rounded-lg border border-slate-300 px-3"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm text-slate-700 mb-1">Currency</label>
                  <input
                    value={form.currency}
                    onChange={(e)=>setF("currency", e.target.value)}
                    className="w-full h-10 rounded-lg border border-slate-300 px-3"
                    placeholder="RWF"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm text-slate-700 mb-1">Method</label>
                  <input
                    value={form.method}
                    onChange={(e)=>setF("method", e.target.value)}
                    className="w-full h-10 rounded-lg border border-slate-300 px-3"
                    placeholder="cash / card / mobile / bank"
                  />
                </div>
                <div>
                  <label className="block text-sm text-slate-700 mb-1">Reference</label>
                  <input
                    value={form.reference}
                    onChange={(e)=>setF("reference", e.target.value)}
                    className="w-full h-10 rounded-lg border border-slate-300 px-3"
                    placeholder="INV-2025-0001"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm text-slate-700 mb-1">Due at</label>
                  <input
                    type="datetime-local"
                    value={form.due_at}
                    onChange={(e)=>setF("due_at", e.target.value)}
                    className="w-full h-10 rounded-lg border border-slate-300 px-3"
                  />
                </div>
                <div>
                  <label className="block text-sm text-slate-700 mb-1">Paid at</label>
                  <input
                    type="datetime-local"
                    value={form.paid_at}
                    onChange={(e)=>setF("paid_at", e.target.value)}
                    className="w-full h-10 rounded-lg border border-slate-300 px-3"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm text-slate-700 mb-1">Notes</label>
                <textarea
                  rows={3}
                  value={form.notes}
                  onChange={(e)=>setF("notes", e.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2"
                  placeholder="Optional details…"
                />
              </div>

              <div className="mt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setOpenCreate(false)}
                  className="h-10 px-4 rounded-lg border border-slate-300 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="h-10 px-4 rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-60"
                >
                  {saving ? "Saving…" : "Save Payment"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
