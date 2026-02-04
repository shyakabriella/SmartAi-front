import { useEffect, useMemo, useState } from "react";
// If you have the helper, keep this import. If not, the component falls back to fetch.
// npm path: src/lib/api.js exporting { api }
import { api } from "../../../lib/api";

const API = import.meta.env.VITE_API_URL || `${window.location.origin}/api`;

export default function BookingsPage() {
  const [rows, setRows] = useState([]);
  const [meta, setMeta] = useState(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  const [q, setQ] = useState("");
  const [status, setStatus] = useState(""); // "", pending, confirmed, ongoing, completed, cancelled
  const [from, setFrom] = useState("");     // ISO date
  const [to, setTo] = useState("");         // ISO date

  const [showNew, setShowNew] = useState(false);

  async function load(url = "/bookings") {
    setLoading(true);
    setErr("");
    try {
      // Prefer axios helper if present
      if (api?.get) {
        const { data } = await api.get(url);
        setRows(data?.data || data || []);
        setMeta(data?.meta || null);
      } else {
        const token = localStorage.getItem("token");
        const res = await fetch(url.startsWith("http") ? url : `${API}${url}`, {
          headers: {
            Accept: "application/json",
            Authorization: token ? `Bearer ${token}` : undefined,
          },
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data?.message || "Failed to load bookings");
        setRows(data?.data || data || []);
        setMeta(data?.meta || null);
      }
    } catch (e) {
      setErr(e.message || "Failed to load bookings");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => {
    let r = rows;
    if (q) {
      const s = q.toLowerCase();
      r = r.filter((b) =>
        (b?.code || "").toLowerCase().includes(s) ||
        (b?.customer?.user?.name || "").toLowerCase().includes(s) ||
        (b?.vehicle?.plate_no || "").toLowerCase().includes(s) ||
        (b?.driver?.user?.name || "").toLowerCase().includes(s)
      );
    }
    if (status) r = r.filter((b) => (b?.status || "").toLowerCase() === status);
    if (from)   r = r.filter((b) => new Date(b?.starts_at) >= new Date(from));
    if (to)     r = r.filter((b) => new Date(b?.ends_at || b?.starts_at) <= new Date(`${to}T23:59:59`));
    return r;
  }, [rows, q, status, from, to]);

  async function onDelete(id) {
    if (!confirm("Delete this booking? This cannot be undone.")) return;
    try {
      if (api?.delete) {
        await api.delete(`/bookings/${id}`);
      } else {
        const token = localStorage.getItem("token");
        const res = await fetch(`${API}/bookings/${id}`, {
          method: "DELETE",
          headers: { Accept: "application/json", Authorization: token ? `Bearer ${token}` : undefined },
        });
        if (!res.ok) throw new Error("Delete failed");
      }
      setRows((r) => r.filter((x) => x.id !== id));
    } catch (e) {
      alert(e.message || "Delete failed");
    }
  }

  async function onStatus(id, next) {
    try {
      if (api?.patch) {
        await api.patch(`/bookings/${id}`, { status: next });
      } else {
        const token = localStorage.getItem("token");
        const res = await fetch(`${API}/bookings/${id}`, {
          method: "PATCH",
          headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
            Authorization: token ? `Bearer ${token}` : undefined,
          },
          body: JSON.stringify({ status: next }),
        });
        if (!res.ok) {
          const j = await res.json().catch(() => ({}));
          throw new Error(j?.message || "Update failed");
        }
      }
      setRows((r) => r.map((x) => (x.id === id ? { ...x, status: next } : x)));
    } catch (e) {
      alert(e.message || "Update failed");
    }
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between gap-2">
        <div>
          <h1 className="text-xl font-semibold">Bookings</h1>
          <p className="text-sm text-slate-500">Manage rentals, assign drivers, and track status.</p>
        </div>
        <div className="flex items-center gap-2">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search code/name/plate…"
            className="h-10 rounded-lg border border-slate-300 px-3"
          />
          <button
            onClick={() => setShowNew(true)}
            className="h-10 px-4 rounded-lg bg-blue-600 text-white hover:bg-blue-700"
          >
            + New
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="rounded-2xl border border-slate-200 bg-white p-3 grid gap-3 md:grid-cols-4">
        <div className="grid gap-1">
          <label className="text-xs text-slate-500">Status</label>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="h-10 rounded-lg border border-slate-300 px-3"
          >
            <option value="">All</option>
            <option value="pending">Pending</option>
            <option value="confirmed">Confirmed</option>
            <option value="ongoing">Ongoing</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>
        <div className="grid gap-1">
          <label className="text-xs text-slate-500">From</label>
          <input type="date" value={from} onChange={(e) => setFrom(e.target.value)}
                 className="h-10 rounded-lg border border-slate-300 px-3"/>
        </div>
        <div className="grid gap-1">
          <label className="text-xs text-slate-500">To</label>
          <input type="date" value={to} onChange={(e) => setTo(e.target.value)}
                 className="h-10 rounded-lg border border-slate-300 px-3"/>
        </div>
        <div className="flex items-end gap-2">
          <button
            onClick={() => { setQ(""); setStatus(""); setFrom(""); setTo(""); }}
            className="h-10 px-4 rounded-lg border border-slate-300 hover:bg-slate-50 w-full"
          >
            Reset
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50 text-slate-600">
              <tr>
                <th className="px-4 py-2 text-left">Code</th>
                <th className="px-4 py-2 text-left">Customer</th>
                <th className="px-4 py-2 text-left">Vehicle</th>
                <th className="px-4 py-2 text-left">Driver</th>
                <th className="px-4 py-2 text-left">Period</th>
                <th className="px-4 py-2 text-right">Price</th>
                <th className="px-4 py-2 text-right">Status</th>
                <th className="px-4 py-2 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td className="px-4 py-6" colSpan={8}>Loading…</td></tr>
              ) : err ? (
                <tr><td className="px-4 py-6 text-rose-700" colSpan={8}>{err}</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td className="px-4 py-6" colSpan={8}>No bookings.</td></tr>
              ) : (
                filtered.map((b) => (
                  <tr key={b.id} className="border-t border-slate-100">
                    <td className="px-4 py-2 font-medium">{b.code || `BK-${b.id}`}</td>
                    <td className="px-4 py-2">{b.customer?.user?.name || "—"}</td>
                    <td className="px-4 py-2">{b.vehicle?.plate_no || b.vehicle?.name || "—"}</td>
                    <td className="px-4 py-2">{b.driver?.user?.name || "—"}</td>
                    <td className="px-4 py-2">
                      {fmtDate(b.starts_at)} → {fmtDate(b.ends_at)}
                    </td>
                    <td className="px-4 py-2 text-right">{money(b.total_price ?? b.price)}</td>
                    <td className="px-4 py-2 text-right">
                      <StatusSelect value={b.status} onChange={(v) => onStatus(b.id, v)} />
                    </td>
                    <td className="px-4 py-2 text-right">
                      <div className="inline-flex gap-2">
                        {/* Replace with a real detail route when ready: /admin/bookings/:id */}
                        <button className="px-3 py-1.5 rounded-lg border border-slate-300 hover:bg-slate-50">View</button>
                        <button onClick={() => onDelete(b.id)}
                                className="px-3 py-1.5 rounded-lg border border-rose-300 text-rose-700 hover:bg-rose-50">
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
          <div className="p-3 flex items-center justify-between text-sm text-slate-500 border-top border-slate-200">
            <button
              disabled={!meta?.links?.[0]?.url}
              onClick={() => meta.links?.[0]?.url && load(meta.links[0].url)}
              className="px-3 py-1.5 rounded-lg border border-slate-300 disabled:opacity-50"
            >
              Prev
            </button>
            <span>Page {meta.current_page} / {meta.last_page}</span>
            <button
              disabled={!meta?.links?.[meta.links.length - 1]?.url}
              onClick={() => meta.links?.[meta.links.length - 1]?.url && load(meta.links.at(-1).url)}
              className="px-3 py-1.5 rounded-lg border border-slate-300 disabled:opacity-50"
            >
              Next
            </button>
          </div>
        )}
      </div>

      {/* New booking modal */}
      {showNew && (
        <NewBookingModal
          onClose={() => setShowNew(false)}
          onCreated={(bk) => {
            setShowNew(false);
            // Prepend new booking to list
            setRows((r) => [bk, ...r]);
          }}
        />
      )}
    </div>
  );
}

/* -------- New Booking Modal -------- */
function NewBookingModal({ onClose, onCreated }) {
  const [customers, setCustomers] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [drivers, setDrivers] = useState([]);

  const [form, setForm] = useState({
    customer_id: "",
    vehicle_id: "",
    driver_id: "",
    starts_at: "",
    ends_at: "",
    pickup_location: "",
    dropoff_location: "",
    price: "",
    status: "pending",
    notes: "",
  });

  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  useEffect(() => {
    (async () => {
      try {
        // Load minimal dropdown data
        const token = localStorage.getItem("token");

        const fetcher = async (url) => {
          if (api?.get) {
            const { data } = await api.get(url);
            return data?.data || data || [];
          }
          const res = await fetch(`${API}${url}`, {
            headers: { Accept: "application/json", Authorization: token ? `Bearer ${token}` : undefined },
          });
          const j = await res.json();
          if (!res.ok) throw new Error(j?.message || "Load failed");
          return j?.data || j || [];
        };

        const [cs, vs, ds] = await Promise.all([
          fetcher("/customers"),
          fetcher("/vehicles"),
          fetcher("/drivers"),
        ]);

        setCustomers(cs);
        setVehicles(vs);
        setDrivers(ds);
      } catch (e) {
        setErr(e.message || "Failed to load dropdowns");
      }
    })();
  }, []);

  function upd(k, v) { setForm((f) => ({ ...f, [k]: v })); }

  async function submit(e) {
    e.preventDefault();
    setLoading(true);
    setErr("");
    try {
      let created;
      if (api?.post) {
        const { data } = await api.post("/bookings", form);
        created = data?.data || data;
      } else {
        const token = localStorage.getItem("token");
        const res = await fetch(`${API}/bookings`, {
          method: "POST",
          headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
            Authorization: token ? `Bearer ${token}` : undefined,
          },
          body: JSON.stringify(form),
        });
        const j = await res.json();
        if (!res.ok) throw new Error(j?.message || "Create failed");
        created = j?.data || j;
      }
      onCreated?.(created);
    } catch (e) {
      setErr(e.message || "Create failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4">
      <div className="w-full max-w-2xl rounded-2xl bg-white p-5 shadow-2xl">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-lg font-semibold">New Booking</h3>
          <button onClick={onClose} className="h-9 w-9 rounded-lg hover:bg-slate-100">✕</button>
        </div>

        {err && <div className="mb-3 text-sm text-rose-700 bg-rose-50 border border-rose-200 rounded-lg px-3 py-2">{err}</div>}

        <form onSubmit={submit} className="grid gap-3">
          {/* Row 1 */}
          <div className="grid md:grid-cols-3 gap-3">
            <SelectField
              label="Customer"
              value={form.customer_id}
              onChange={(v) => upd("customer_id", v)}
              options={customers.map((c) => ({ value: c.id, label: c.user?.name || c.code || `#${c.id}` }))}
              required
            />
            <SelectField
              label="Vehicle"
              value={form.vehicle_id}
              onChange={(v) => upd("vehicle_id", v)}
              options={vehicles.map((v) => ({ value: v.id, label: v.plate_no || v.name || `#${v.id}` }))}
              required
            />
            <SelectField
              label="Driver (optional)"
              value={form.driver_id}
              onChange={(v) => upd("driver_id", v)}
              options={[{ value: "", label: "— Unassigned —" }, ...drivers.map((d) => ({ value: d.id, label: d.user?.name || `#${d.id}` }))]}
            />
          </div>

          {/* Row 2 */}
          <div className="grid md:grid-cols-2 gap-3">
            <InputField type="datetime-local" label="Start" value={form.starts_at} onChange={(v) => upd("starts_at", v)} required />
            <InputField type="datetime-local" label="End"   value={form.ends_at}   onChange={(v) => upd("ends_at", v)} required />
          </div>

          {/* Row 3 */}
          <div className="grid md:grid-cols-3 gap-3">
            <InputField label="Pickup Location"  value={form.pickup_location}  onChange={(v) => upd("pickup_location", v)} />
            <InputField label="Dropoff Location" value={form.dropoff_location} onChange={(v) => upd("dropoff_location", v)} />
            <InputField type="number" step="0.01" label="Price" value={form.price} onChange={(v) => upd("price", v)} required />
          </div>

          {/* Row 4 */}
          <div className="grid md:grid-cols-3 gap-3">
            <SelectField
              label="Status"
              value={form.status}
              onChange={(v) => upd("status", v)}
              options={["pending","confirmed","ongoing","completed","cancelled"].map(s => ({ value: s, label: cap(s) }))}
            />
            <div className="md:col-span-2">
              <InputField label="Notes" value={form.notes} onChange={(v) => upd("notes", v)} placeholder="Optional notes…" />
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <button type="button" onClick={onClose} className="h-10 px-4 rounded-lg border border-slate-300 hover:bg-slate-50">Cancel</button>
            <button disabled={loading} className="h-10 px-4 rounded-lg bg-blue-600 text-white hover:bg-blue-700">
              {loading ? "Saving…" : "Create Booking"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* -------- Small UI helpers -------- */
function StatusSelect({ value, onChange }) {
  const v = (value || "pending").toLowerCase();
  return (
    <select
      value={v}
      onChange={(e) => onChange?.(e.target.value)}
      className={[
        "h-9 rounded-lg border px-2",
        v === "completed" ? "border-emerald-300 bg-emerald-50 text-emerald-700" :
        v === "cancelled" ? "border-rose-300 bg-rose-50 text-rose-700" :
        v === "ongoing"   ? "border-blue-300 bg-blue-50 text-blue-700" :
        v === "confirmed" ? "border-amber-300 bg-amber-50 text-amber-700" :
                            "border-slate-300 bg-slate-50 text-slate-700"
      ].join(" ")}
    >
      {["pending","confirmed","ongoing","completed","cancelled"].map((s) => (
        <option value={s} key={s}>{cap(s)}</option>
      ))}
    </select>
  );
}

function InputField({ label, type="text", value, onChange, ...rest }) {
  return (
    <label className="grid gap-1">
      <span className="text-xs text-slate-500">{label}</span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange?.(e.target.value)}
        className="h-10 rounded-lg border border-slate-300 px-3"
        {...rest}
      />
    </label>
  );
}

function SelectField({ label, value, onChange, options = [], ...rest }) {
  return (
    <label className="grid gap-1">
      <span className="text-xs text-slate-500">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange?.(e.target.value)}
        className="h-10 rounded-lg border border-slate-300 px-3"
        {...rest}
      >
        <option value="" hidden />
        {options.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
    </label>
  );
}

function cap(s) { return String(s || "").slice(0,1).toUpperCase() + String(s || "").slice(1); }
function fmtDate(iso) { try { return new Date(iso).toLocaleString(); } catch { return "—"; } }
function money(n) {
  const v = Number(n || 0);
  return new Intl.NumberFormat(undefined, { style: "currency", currency: "USD" }).format(v);
}
