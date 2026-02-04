// src/pages/admin/drivers/DriverDetail.jsx
import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { api } from "../../../lib/api";

export default function DriverDetail() {
  const { id } = useParams();
  const nav = useNavigate();

  const [driver, setDriver] = useState(null);
  const [err, setErr] = useState("");
  const [saving, setSaving] = useState(false);

  // assignment state
  const [customers, setCustomers] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [selCustomer, setSelCustomer] = useState("");
  const [selVehicle, setSelVehicle] = useState("");

  const [edit, setEdit] = useState(null);

  function unwrap(out) {
    return out?.success !== undefined ? out.data : out;
  }

  async function load() {
    setErr("");
    try {
      const out = await api(`/drivers/${id}`);
      setDriver(unwrap(out));
    } catch (e) {
      setErr(e.message || "Failed to load driver");
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  // Load customers for assignment dropdown
  useEffect(() => {
    (async () => {
      try {
        const res = await api("/customers?simple=1");
        const root = unwrap(res);
        const list = Array.isArray(root) ? root : root?.data ?? [];
        setCustomers(list);
      } catch {
        setCustomers([]);
      }
    })();
  }, []);

  // Load vehicles when a customer is selected
  useEffect(() => {
    if (!selCustomer) {
      setVehicles([]);
      setSelVehicle("");
      return;
    }
    (async () => {
      try {
        const res = await api(`/vehicles?customer_id=${selCustomer}`);
        const root = unwrap(res);
        const list = Array.isArray(root) ? root : root?.data ?? [];
        setVehicles(list);
      } catch {
        setVehicles([]);
      }
    })();
  }, [selCustomer]);

  function openEdit() {
    if (!driver) return;
    setEdit({
      // user
      name: driver.user?.name || "",
      phone: driver.user?.phone || "",
      email: driver.user?.email || "",
      password: "",

      // driver
      profile_image: null,
      gender: driver.gender || "",
      marital_status: driver.marital_status || "",

      license_no: driver.license_no || "",
      license_category: driver.license_category || "",
      license_expiry: driver.license_expiry
        ? String(driver.license_expiry).slice(0, 10)
        : "",
      experience_years: driver.experience_years ?? 0,

      status: driver.status || "active",
      is_verified: !!driver.is_verified,
      is_available:
        driver.is_available !== undefined ? !!driver.is_available : true,

      current_lat: driver.current_lat ?? "",
      current_lng: driver.current_lng ?? "",
      current_address: driver.current_address ?? "",
    });
  }

  async function saveEdit(e) {
    e.preventDefault();
    if (!edit) return;

    setSaving(true);
    setErr("");

    try {
      const fd = new FormData();

      // user updates
      if (edit.name) fd.append("name", edit.name);
      if (edit.phone) fd.append("phone", edit.phone);
      if (edit.email) fd.append("email", edit.email);
      if (edit.password) fd.append("password", edit.password);

      // image
      if (edit.profile_image) fd.append("profile_image", edit.profile_image);

      // personal
      if (edit.gender) fd.append("gender", edit.gender);
      if (edit.marital_status) fd.append("marital_status", edit.marital_status);

      // license
      if (edit.license_no) fd.append("license_no", edit.license_no);
      if (edit.license_category)
        fd.append("license_category", edit.license_category);
      if (edit.license_expiry) fd.append("license_expiry", edit.license_expiry);
      fd.append("experience_years", String(edit.experience_years ?? 0));

      // status
      fd.append("status", edit.status || "active");
      fd.append("is_verified", edit.is_verified ? "1" : "0");
      fd.append("is_available", edit.is_available ? "1" : "0");

      // location
      if (edit.current_lat !== "" && edit.current_lat !== null)
        fd.append("current_lat", String(edit.current_lat));
      if (edit.current_lng !== "" && edit.current_lng !== null)
        fd.append("current_lng", String(edit.current_lng));
      if (edit.current_address) fd.append("current_address", edit.current_address);

      // PUT via POST
      fd.append("_method", "PUT");

      const out = await api(`/drivers/${id}`, { method: "POST", body: fd });
      setDriver(unwrap(out));
      setEdit(null);
    } catch (e2) {
      setErr(e2.message || "Update failed");
    } finally {
      setSaving(false);
    }
  }

  async function remove() {
    if (!confirm("Delete this driver? This cannot be undone.")) return;
    try {
      await api(`/drivers/${id}`, { method: "DELETE" });
      nav("/admin/drivers");
    } catch (e) {
      setErr(e.message || "Delete failed");
    }
  }

  async function assignCustomer() {
    if (!selCustomer) return;
    try {
      await api(`/drivers/${id}/assign-customer`, {
        method: "POST",
        body: { customer_id: selCustomer },
      });
      await load();
    } catch (e) {
      alert(e.message || "Failed to assign");
    }
  }

  async function assignVehicle() {
    if (!selVehicle) return;
    try {
      await api(`/drivers/${id}/assign-vehicle`, {
        method: "POST",
        body: { vehicle_id: selVehicle },
      });
      await load();
    } catch (e) {
      alert(e.message || "Failed to assign");
    }
  }

  const coords = useMemo(() => {
    const lat = Number(driver?.current_lat ?? 0);
    const lon = Number(driver?.current_lng ?? 0);
    return isFinite(lat) && isFinite(lon) && (lat || lon) ? { lat, lon } : null;
  }, [driver]);

  function osmEmbed(lat, lon, zoom = 14) {
    const d = 0.02;
    const left = lon - d,
      right = lon + d,
      top = lat + d,
      bottom = lat - d;
    const bbox = `${left},${bottom},${right},${top}`;
    return `https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${lat},${lon}&zoom=${zoom}`;
  }

  // ✅ FIXED: Always point to LARAVEL host, not the React host
  const profileImgUrl = useMemo(() => {
    // 1) Best: backend provides full URL
    if (driver?.profile_image_url) return driver.profile_image_url;

    // 2) Fallback: build from stored path
    const p = driver?.profile_image;
    if (!p) return null;

    // already full url
    if (String(p).startsWith("http")) return p;

    // normalize path
    const clean = String(p).replaceAll("\\", "/").replace(/^\/+/, "");

    // example: VITE_API_BASE_URL = http://127.0.0.1:8000/api
    const apiBase =
      import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000/api";
    const backendBase = apiBase.replace(/\/api\/?$/, ""); // -> http://127.0.0.1:8000

    return `${backendBase}/storage/${clean}`;
  }, [driver]);

  // ✅ badge helper
  function Badge({ label, value, tone = "slate" }) {
    const tones = {
      slate: "bg-slate-100 text-slate-800 border-slate-200",
      blue: "bg-blue-50 text-blue-700 border-blue-200",
      green: "bg-green-50 text-green-700 border-green-200",
      purple: "bg-purple-50 text-purple-700 border-purple-200",
      amber: "bg-amber-50 text-amber-700 border-amber-200",
      rose: "bg-rose-50 text-rose-700 border-rose-200",
    };

    return (
      <span
        className={`inline-flex items-center gap-1 px-3 py-1 rounded-full border text-xs font-semibold ${tones[tone] || tones.slate}`}
      >
        <span className="opacity-70 font-medium">{label}:</span>
        <span className="uppercase">{value}</span>
      </span>
    );
  }

  if (!driver) {
    return (
      <div>
        {err ? (
          <div className="rounded-lg border border-rose-300 bg-rose-50 text-rose-700 px-3 py-2 text-sm">
            {err}
          </div>
        ) : (
          "Loading…"
        )}
      </div>
    );
  }

  return (
    <div className="grid xl:grid-cols-[1.2fr_1.1fr] gap-6">
      {/* Driver card */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 space-y-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex gap-4 items-start">
            {/* ✅ Bigger + Circle profile image */}
            <div className="h-24 w-24 rounded-full overflow-hidden bg-slate-100 border border-slate-200 shrink-0">
              {profileImgUrl ? (
                <img
                  src={profileImgUrl}
                  alt={driver.user?.name || "Driver"}
                  className="h-full w-full object-cover"
                  onError={(e) => {
                    e.currentTarget.style.display = "none";
                  }}
                />
              ) : (
                <div className="h-full w-full grid place-items-center text-slate-400 text-xs">
                  No photo
                </div>
              )}
            </div>

            <div className="min-w-0">
              <h2 className="text-lg font-semibold truncate">
                {driver.user?.name}
              </h2>
              <div className="text-sm text-slate-500 truncate">
                {driver.user?.email} • {driver.user?.phone || "-"}
              </div>

              {/* ✅ Inline colored badges */}
              <div className="mt-2 flex flex-wrap gap-2">
                <Badge
                  label="Status"
                  value={driver.status || "active"}
                  tone={driver.status === "active" ? "blue" : "amber"}
                />
                <Badge
                  label="Verified"
                  value={driver.is_verified ? "YES" : "NO"}
                  tone={driver.is_verified ? "green" : "rose"}
                />
                <Badge
                  label="Available"
                  value={driver.is_available ? "YES" : "NO"}
                  tone={driver.is_available ? "purple" : "rose"}
                />
              </div>
            </div>
          </div>

          <div className="inline-flex gap-2">
            <button
              onClick={openEdit}
              className="px-3 py-2 rounded-lg border border-slate-300 hover:bg-slate-50"
            >
              Edit
            </button>
            <button
              onClick={remove}
              className="px-3 py-2 rounded-lg border border-rose-300 text-rose-700 hover:bg-rose-50"
            >
              Delete
            </button>
          </div>
        </div>

        <div className="grid sm:grid-cols-2 gap-3 text-sm">
          <div>
            <span className="text-slate-500">Gender:</span>{" "}
            {driver.gender || <span className="text-slate-400">—</span>}
          </div>
          <div>
            <span className="text-slate-500">Marital status:</span>{" "}
            {driver.marital_status || <span className="text-slate-400">—</span>}
          </div>

          <div>
            <span className="text-slate-500">License No:</span>{" "}
            {driver.license_no || <span className="text-slate-400">—</span>}
          </div>
          <div>
            <span className="text-slate-500">License category:</span>{" "}
            {driver.license_category || (
              <span className="text-slate-400">—</span>
            )}
          </div>

          <div>
            <span className="text-slate-500">License expiry:</span>{" "}
            {driver.license_expiry ? (
              String(driver.license_expiry).slice(0, 10)
            ) : (
              <span className="text-slate-400">—</span>
            )}
          </div>
          <div>
            <span className="text-slate-500">Experience years:</span>{" "}
            {driver.experience_years ?? 0}
          </div>

          <div>
            <span className="text-slate-500">Rating:</span>{" "}
            <b>{Number(driver.rating_avg || 0).toFixed(2)}</b>{" "}
            <span className="text-slate-500">
              ({driver.rating_count || 0} reviews)
            </span>
          </div>
          <div>
            <span className="text-slate-500">Cancel count:</span>{" "}
            {driver.cancel_count ?? 0}
          </div>

          <div className="sm:col-span-2">
            <span className="text-slate-500">Address:</span>{" "}
            {driver.current_address || (
              <span className="text-slate-400">—</span>
            )}
          </div>

          <div className="sm:col-span-2">
            <span className="text-slate-500">Assigned Customer:</span>{" "}
            {driver.customer?.code ? (
              `${driver.customer.code} — ${driver.customer.user?.name}`
            ) : (
              <span className="text-slate-400">—</span>
            )}
          </div>
          <div className="sm:col-span-2">
            <span className="text-slate-500">Vehicle:</span>{" "}
            {driver.vehicle?.name ? (
              `${driver.vehicle.name} (${driver.vehicle.plate || "-"})`
            ) : (
              <span className="text-slate-400">—</span>
            )}
          </div>
        </div>

    

        {/* Edit drawer */}
        {edit && (
          <div className="fixed inset-0 z-50">
            <div
              className="absolute inset-0 bg-black/40"
              onClick={() => setEdit(null)}
            />
            <div className="absolute right-0 top-0 h-full w-full max-w-md bg-white shadow-2xl p-4 overflow-auto">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">Edit driver</h3>
                <button
                  onClick={() => setEdit(null)}
                  className="h-9 w-9 grid place-items-center rounded-lg border"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={saveEdit} className="mt-4 grid gap-3">
                <div className="text-sm font-medium text-slate-700">Account</div>

                <input
                  className="border rounded-lg px-3 py-2"
                  placeholder="Name"
                  value={edit.name}
                  onChange={(e) =>
                    setEdit((s) => ({ ...s, name: e.target.value }))
                  }
                />
                <input
                  className="border rounded-lg px-3 py-2"
                  placeholder="Email"
                  type="email"
                  value={edit.email}
                  onChange={(e) =>
                    setEdit((s) => ({ ...s, email: e.target.value }))
                  }
                />
                <input
                  className="border rounded-lg px-3 py-2"
                  placeholder="Phone"
                  value={edit.phone}
                  onChange={(e) =>
                    setEdit((s) => ({ ...s, phone: e.target.value }))
                  }
                />
                <input
                  className="border rounded-lg px-3 py-2"
                  placeholder="New password (optional)"
                  type="password"
                  value={edit.password}
                  onChange={(e) =>
                    setEdit((s) => ({ ...s, password: e.target.value }))
                  }
                />

                <div className="text-sm font-medium text-slate-700 mt-2">
                  Profile
                </div>
                <input
                  type="file"
                  accept="image/*"
                  className="border rounded-lg px-3 py-2"
                  onChange={(e) =>
                    setEdit((s) => ({
                      ...s,
                      profile_image: e.target.files?.[0] || null,
                    }))
                  }
                />
                {edit.profile_image && (
                  <div className="text-xs text-slate-500">
                    Selected: {edit.profile_image.name}
                  </div>
                )}

                {err && <div className="text-sm text-rose-600">{err}</div>}

                <div className="flex gap-2">
                  <button
                    disabled={saving}
                    className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-60"
                  >
                    {saving ? "Saving…" : "Save"}
                  </button>
                  <button
                    type="button"
                    className="px-4 py-2 rounded-lg border"
                    onClick={() => setEdit(null)}
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>

      {/* Map & vehicle */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 space-y-3">
        <h3 className="text-lg font-semibold">Location</h3>
        {coords ? (
          <div className="space-y-2">
            <div className="text-sm text-slate-600">
              Lat: {coords.lat.toFixed(6)} — Lon: {coords.lon.toFixed(6)}
            </div>
            {driver.current_address && (
              <div className="text-sm text-slate-600">
                📍 {driver.current_address}
              </div>
            )}
            <div className="aspect-video rounded-xl overflow-hidden border">
              <iframe
                title="map"
                src={osmEmbed(coords.lat, coords.lon, 14)}
                className="w-full h-full"
                style={{ border: 0 }}
                loading="lazy"
              />
            </div>
          </div>
        ) : (
          <div className="text-sm text-slate-500">No location available.</div>
        )}

        <h3 className="text-lg font-semibold mt-4">Vehicle</h3>
        {driver.vehicle?.id ? (
          <div className="grid grid-cols-[120px_1fr] gap-3 items-center">
            <div className="h-24 w-full bg-slate-100 rounded-lg overflow-hidden">
              {driver.vehicle.image_url ? (
                <img
                  src={driver.vehicle.image_url}
                  alt={driver.vehicle.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full grid place-items-center text-slate-400 text-xs">
                  No image
                </div>
              )}
            </div>
            <div className="text-sm">
              <div className="font-medium">{driver.vehicle.name}</div>
              <div className="text-slate-600">
                Plate: {driver.vehicle.plate || "-"}
              </div>
              <div className="text-slate-600">
                Type:{" "}
                {driver.vehicle.vehicle_type?.name || driver.vehicle.type || "-"}
              </div>
              <div className="text-slate-600">
                Status: {driver.vehicle.status || "-"}
              </div>
            </div>
          </div>
        ) : (
          <div className="text-sm text-slate-500">No vehicle assigned.</div>
        )}
      </div>
    </div>
  );
}