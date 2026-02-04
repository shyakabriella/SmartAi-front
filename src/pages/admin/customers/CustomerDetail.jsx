// src/pages/admin/customers/CustomerDetail.jsx
import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { api } from "../../../lib/api";

export default function CustomerDetail() {
  const { id } = useParams();
  const nav = useNavigate();
  const [customer, setCustomer] = useState(null);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");

  function unwrap(out) {
    // handle {success, data} or plain object
    return out?.success !== undefined ? out.data : out;
  }

  async function load() {
    setErr("");
    try {
      const out = await api(`/customers/${id}`);
      setCustomer(unwrap(out));
    } catch (e) {
      setErr(e.message || "Failed to load customer");
    }
  }

  useEffect(() => { load(); }, [id]);

  async function updateStatus(status) {
    setSaving(true); setErr("");
    try {
      const updated = await api(`/customers/${id}`, { method: "PUT", body: { status } });
      // API returns the updated customer object
      setCustomer((c) => ({ ...c, ...unwrap(updated) }));
    } catch (e) {
      setErr(e.message || "Update failed");
    } finally {
      setSaving(false);
    }
  }

  async function remove() {
    if (!confirm("Delete this customer? This cannot be undone.")) return;
    try {
      await api(`/customers/${id}`, { method: "DELETE" });
      nav("/admin/customers");
    } catch (e) {
      setErr(e.message || "Delete failed");
    }
  }

  if (!customer) {
    return (
      <div>
        {err ? (
          <div className="rounded-lg border border-rose-300 bg-rose-50 text-rose-700 px-3 py-2 text-sm">{err}</div>
        ) : (
          "Loading…"
        )}
      </div>
    );
  }

  return (
    <div className="grid xl:grid-cols-[1.1fr_1.2fr] gap-6">
      <div className="rounded-2xl border border-slate-200 bg-white p-5 space-y-3">
        <h2 className="text-lg font-semibold">Customer</h2>
        <div className="text-sm grid gap-1">
          <div><span className="text-slate-500">Code:</span> <span className="font-medium">{customer.code}</span></div>
          <div><span className="text-slate-500">Name:</span> {customer.user?.name}</div>
          <div><span className="text-slate-500">Email:</span> {customer.user?.email}</div>
          <div><span className="text-slate-500">Status:</span> <span className="uppercase">{customer.status}</span></div>
          <div><span className="text-slate-500">Document No:</span> {customer.document_no || "-"}</div>
        </div>

        <div className="flex items-center gap-2 pt-3">
          <select
            value={customer.status}
            onChange={(e) => updateStatus(e.target.value)}
            className="border rounded-lg px-3 py-2"
          >
            <option value="active">active</option>
            <option value="inactive">inactive</option>
          </select>
          <button onClick={remove} className="ml-auto px-3 py-2 rounded-lg border border-rose-300 text-rose-700 hover:bg-rose-50">
            Delete customer
          </button>
        </div>
        {saving && <div className="text-xs text-slate-500">Saving…</div>}
        {err && <div className="text-sm text-rose-600">{err}</div>}
      </div>

      {/* Placeholder showroom panel */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5">
        <h2 className="text-lg font-semibold mb-3">Car Showroom</h2>
        <div className="text-sm text-slate-500">
          Implement <code>GET /api/customers/{id}/showroom</code> to show vehicles here.
        </div>
      </div>
    </div>
  );
}
