// src/pages/admin/vehicles/CustomerShowroom.jsx
import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { api } from "../../../lib/api";

const STATUS_OPTS = ["available", "maintenance", "hidden"];

export default function CustomerShowroom() {
  const { customerId } = useParams();
  const nav = useNavigate();

  const [customer, setCustomer] = useState(null);
  const [vehicles, setVehicles] = useState([]);
  const [types, setTypes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingTypes, setLoadingTypes] = useState(true);

  // filters
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("");
  const [typeId, setTypeId] = useState("");

  // edit drawer
  const [editing, setEditing] = useState(null); // vehicle object or null
  const [saving, setSaving] = useState(false);
  const [msgOpen, setMsgOpen] = useState(false);
  const [msg, setMsg] = useState({ subject: "", body: "" });
  const [err, setErr] = useState("");

  async function loadCustomer() {
    const out = await api(`/customers/${customerId}`);
    setCustomer(out);
  }

  async function loadTypes() {
    setLoadingTypes(true);
    try {
      const out = await api("/vehicle-types"); // expects array or {data:[]}
      setTypes(out?.data || out || []);
    } catch {
      setTypes([]);
    } finally {
      setLoadingTypes(false);
    }
  }

  async function loadVehicles() {
    setLoading(true);
    try {
      // Try server-side filters (if your backend supports them)
      const params = new URLSearchParams();
      if (q) params.set("q", q);
      if (status) params.set("status", status);
      if (typeId) params.set("type_id", typeId);

      let path = `/customers/${customerId}/showroom`;
      if (params.toString()) path += `?${params.toString()}`;

      let out = await api(path);
      out = out?.data || out || [];
      setVehicles(out);
    } catch {
      // fallback empty (or keep last)
      setVehicles([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadCustomer();
    loadTypes();
  }, [customerId]);

  useEffect(() => {
    loadVehicles();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [customerId, q, status, typeId]);

  const filtered = useMemo(() => {
    // If backend filtered, this just returns vehicles as-is
    if (!vehicles || vehicles.length === 0) return [];
    if (q || status || typeId) {
      const s = q.toLowerCase();
      return vehicles.filter(v => {
        const text =
          `${v.name || ""} ${v.title || ""} ${v.plate || ""} ${v.type || ""} ${v.vehicle_type?.name || ""}`.toLowerCase();
        const okQ = !q || text.includes(s);
        const okS = !status || (v.status || "").toLowerCase() === status;
        const okT = !typeId || String(v.vehicle_type_id || v.type_id || "") === String(typeId);
        return okQ && okS && okT;
      });
    }
    return vehicles;
  }, [vehicles, q, status, typeId]);

  function openEdit(v) {
    setEditing({
      id: v.id,
      name: v.name || v.title || "",
      plate: v.plate || "",
      status: v.status || "available",
      type_id: v.vehicle_type_id || v.type_id || "",
      daily_rate: v.daily_rate || "",
      image_url: v.image_url || "",
      meta: v.meta || {},
    });
    setErr("");
  }

  async function saveVehicle(e) {
    e?.preventDefault?.();
    if (!editing) return;
    setSaving(true);
    setErr("");
    try {
      const body = {
        name: editing.name,
        plate: editing.plate || null,
        status: editing.status,
        vehicle_type_id: editing.type_id || null,
        daily_rate: editing.daily_rate || null,
        image_url: editing.image_url || null,
        meta: editing.meta || null,
      };
      await api(`/vehicles/${editing.id}`, { method: "PUT", body });
      await loadVehicles();
      setEditing(null);
    } catch (e) {
      setErr(e.message || "Save failed");
    } finally {
      setSaving(false);
    }
  }

  async function toggleHide(v) {
    const next = (v.status === "hidden") ? "available" : "hidden";
    try {
      await api(`/vehicles/${v.id}`, { method: "PUT", body: { status: next } });
      await loadVehicles();
    } catch (e) {
      alert(e.message || "Failed to update status");
    }
  }

  async function sendMessage(e) {
    e.preventDefault();
    try {
      await api(`/customers/${customerId}/message`, { method: "POST", body: msg });
      setMsg({ subject: "", body: "" });
      setMsgOpen(false);
      alert("Message sent");
    } catch (e) {
      alert(e.message || "Failed to send message");
    }
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          <h1 className="text-xl font-semibold">
            {customer?.user?.name ? `${customer.user.name} — Showroom` : "Showroom"}
          </h1>
          <p className="text-sm text-slate-500 truncate">{customer?.user?.email}</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setMsgOpen(true)} className="h-10 px-3 rounded-lg border border-slate-300 hover:bg-slate-50">
            Message customer
          </button>
          <button onClick={() => nav("/admin/vehicles")} className="h-10 px-3 rounded-lg border border-slate-300 hover:bg-slate-50">
            Back to customers
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="rounded-2xl border border-slate-200 bg-white p-3 flex flex-wrap items-center gap-3">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search vehicle (name/plate/type)…"
          className="h-10 rounded-lg border border-slate-300 px-3 w-full sm:w-64"
        />
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="h-10 rounded-lg border border-slate-300 px-3"
        >
          <option value="">All statuses</option>
          {STATUS_OPTS.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <select
          value={typeId}
          onChange={(e) => setTypeId(e.target.value)}
          className="h-10 rounded-lg border border-slate-300 px-3"
          disabled={loadingTypes}
        >
          <option value="">All types</option>
          {types.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
        </select>
        <div className="ml-auto text-sm text-slate-500">
          {loading ? "Loading…" : `${filtered.length} vehicles`}
        </div>
      </div>

      {/* Grid */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {loading ? (
          Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-56 rounded-2xl border border-slate-200 bg-white animate-pulse" />
          ))
        ) : filtered.length === 0 ? (
          <div className="col-span-full text-sm text-slate-500">
            No vehicles found. Adjust filters or add vehicles for this customer.
          </div>
        ) : (
          filtered.map((v) => (
            <div key={v.id} className="rounded-2xl border border-slate-200 bg-white overflow-hidden flex flex-col">
              <div className="aspect-[4/3] bg-slate-100">
                {v.image_url ? (
                  <img src={v.image_url} alt={v.name || `Vehicle #${v.id}`} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full grid place-items-center text-slate-400 text-sm">No image</div>
                )}
              </div>
              <div className="p-3 text-sm flex-1 flex flex-col">
                <div className="font-medium">{v.name || v.title || `Vehicle #${v.id}`}</div>
                <div className="text-slate-500">
                  {v.plate ? <span>Plate: {v.plate}</span> : <span className="italic">No plate</span>}
                </div>
                <div className="text-slate-500">
                  Type: {v.vehicle_type?.name || v.type || "-"}
                </div>
                <div className="mt-auto flex items-center justify-between pt-2">
                  <span className={[
                    "inline-flex items-center px-2 py-0.5 rounded",
                    v.status === "available" ? "bg-emerald-50 text-emerald-700" :
                    v.status === "maintenance" ? "bg-amber-50 text-amber-700" :
                    v.status === "hidden" ? "bg-slate-200 text-slate-700" :
                    "bg-slate-100 text-slate-700"
                  ].join(" ")}>
                    {v.status || "unknown"}
                  </span>
                  <div className="inline-flex gap-2">
                    <button onClick={() => openEdit(v)} className="px-3 py-1.5 rounded-lg border border-slate-300 hover:bg-slate-50">
                      Edit
                    </button>
                    <button onClick={() => toggleHide(v)} className="px-3 py-1.5 rounded-lg border border-slate-300 hover:bg-slate-50">
                      {v.status === "hidden" ? "Unhide" : "Hide"}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Edit Drawer */}
      {editing && (
        <div className="fixed inset-0 z-50">
          <div className="absolute inset-0 bg-black/40" onClick={() => setEditing(null)} />
          <div className="absolute right-0 top-0 h-full w-full max-w-md bg-white shadow-2xl p-4 overflow-auto">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">Edit vehicle</h3>
              <button onClick={() => setEditing(null)} className="h-9 w-9 grid place-items-center rounded-lg border">✕</button>
            </div>
            <form onSubmit={saveVehicle} className="mt-4 grid gap-3">
              <input className="border rounded-lg px-3 py-2" placeholder="Name" value={editing.name} onChange={e=>setEditing(s=>({...s, name:e.target.value}))}/>
              <input className="border rounded-lg px-3 py-2" placeholder="Plate" value={editing.plate} onChange={e=>setEditing(s=>({...s, plate:e.target.value}))}/>
              <select className="border rounded-lg px-3 py-2" value={editing.status} onChange={e=>setEditing(s=>({...s, status:e.target.value}))}>
                {STATUS_OPTS.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
              <select className="border rounded-lg px-3 py-2" value={editing.type_id} onChange={e=>setEditing(s=>({...s, type_id:e.target.value}))}>
                <option value="">-- Type --</option>
                {types.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
              <input className="border rounded-lg px-3 py-2" placeholder="Daily rate" value={editing.daily_rate} onChange={e=>setEditing(s=>({...s, daily_rate:e.target.value}))}/>
              <input className="border rounded-lg px-3 py-2" placeholder="Image URL" value={editing.image_url} onChange={e=>setEditing(s=>({...s, image_url:e.target.value}))}/>
              {err && <div className="text-sm text-rose-600">{err}</div>}
              <div className="flex gap-2">
                <button disabled={saving} className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700">{saving ? "Saving…" : "Save"}</button>
                <button type="button" className="px-4 py-2 rounded-lg border" onClick={()=>setEditing(null)}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Message modal */}
      {msgOpen && (
        <div className="fixed inset-0 z-50">
          <div className="absolute inset-0 bg-black/40" onClick={() => setMsgOpen(false)} />
          <div className="absolute inset-0 m-auto h-fit w-full max-w-lg rounded-2xl bg-white p-5 shadow-2xl">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">Message {customer?.user?.name}</h3>
              <button onClick={() => setMsgOpen(false)} className="h-9 w-9 grid place-items-center rounded-lg border">✕</button>
            </div>
            <form onSubmit={sendMessage} className="mt-4 grid gap-3">
              <input
                className="border rounded-lg px-3 py-2"
                placeholder="Subject"
                value={msg.subject}
                onChange={(e)=>setMsg(s=>({...s, subject:e.target.value}))}
                required
              />
              <textarea
                className="border rounded-lg px-3 py-2"
                rows={6}
                placeholder="Write your message…"
                value={msg.body}
                onChange={(e)=>setMsg(s=>({...s, body:e.target.value}))}
                required
              />
              <div className="flex gap-2">
                <button className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700">Send</button>
                <button type="button" className="px-4 py-2 rounded-lg border" onClick={()=>setMsgOpen(false)}>Cancel</button>
              </div>
            </form>
            <p className="text-xs text-slate-500 mt-2">
              This posts to <code>/api/customers/{customerId}/message</code>. If not implemented, it will show an error.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
