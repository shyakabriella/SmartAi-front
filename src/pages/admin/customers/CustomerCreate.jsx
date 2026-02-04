// src/pages/admin/customers/CustomerCreate.jsx
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../../lib/api";

export default function CustomerCreate() {
  const nav = useNavigate();
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    password: "",
    document_no: "",
    preferences: '{"car_class":"SUV"}',
    status: "active",
  });
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");

  function set(k, v) { setForm((s) => ({ ...s, [k]: v })); }

  async function submit(e) {
    e.preventDefault();
    setSaving(true); setErr("");
    try {
      const body = {
        name: form.name,
        email: form.email,
        phone: form.phone || null,
        password: form.password || undefined,
        document_no: form.document_no || null,
        preferences: form.preferences ? JSON.parse(form.preferences) : null,
        status: form.status,
      };
      const { data } = await api.post("/customers", body);
      nav(`/admin/customers/${data.customer?.id || data?.id}`);
    } catch (e) {
      setErr(e?.response?.data?.message || Object.values(e?.response?.data?.errors||{})?.[0]?.[0] || "Save failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="max-w-2xl">
      <h1 className="text-xl font-semibold mb-4">New Customer</h1>
      <form onSubmit={submit} className="grid gap-3">
        <input className="border rounded-lg px-3 py-2" placeholder="Full name" value={form.name} onChange={e=>set("name", e.target.value)} required/>
        <input className="border rounded-lg px-3 py-2" placeholder="Email" type="email" value={form.email} onChange={e=>set("email", e.target.value)} required/>
        <input className="border rounded-lg px-3 py-2" placeholder="Phone" value={form.phone} onChange={e=>set("phone", e.target.value)}/>
        <input className="border rounded-lg px-3 py-2" placeholder="Password (optional)" type="password" value={form.password} onChange={e=>set("password", e.target.value)}/>
        <input className="border rounded-lg px-3 py-2" placeholder="Document No" value={form.document_no} onChange={e=>set("document_no", e.target.value)}/>
        <textarea className="border rounded-lg px-3 py-2" rows={4} placeholder='Preferences JSON' value={form.preferences} onChange={e=>set("preferences", e.target.value)}/>
        <select className="border rounded-lg px-3 py-2" value={form.status} onChange={e=>set("status", e.target.value)}>
          <option value="active">active</option>
          <option value="inactive">inactive</option>
        </select>
        {err && <div className="text-sm text-rose-600">{err}</div>}
        <div className="flex gap-2">
          <button disabled={saving} className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700">{saving ? "Saving…" : "Save"}</button>
          <button type="button" className="px-4 py-2 rounded-lg border" onClick={()=>nav(-1)}>Cancel</button>
        </div>
      </form>
    </div>
  );
}
