// src/pages/admin/drivers/DriverCreate.jsx
import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../../../lib/api";

// --- Simple Google Maps loader (no dependency) ---
function loadGoogleMaps(apiKey) {
  return new Promise((resolve, reject) => {
    if (window.google?.maps) return resolve(window.google);

    const existing = document.querySelector('script[data-google-maps="1"]');
    if (existing) {
      existing.addEventListener("load", () => resolve(window.google));
      existing.addEventListener("error", reject);
      return;
    }

    const s = document.createElement("script");
    s.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(
      apiKey
    )}&libraries=places`;
    s.async = true;
    s.defer = true;
    s.dataset.googleMaps = "1";
    s.onload = () => resolve(window.google);
    s.onerror = reject;
    document.head.appendChild(s);
  });
}

// --- Reusable Location Picker ---
function LocationPicker({ apiKey, value, onChange }) {
  const mapRef = useRef(null);
  const inputRef = useRef(null);

  const mapObj = useRef(null);
  const markerObj = useRef(null);
  const geocoderObj = useRef(null);
  const autocompleteObj = useRef(null);

  const [mapReady, setMapReady] = useState(false);
  const [mapErr, setMapErr] = useState("");

  const initialCenter = useMemo(() => {
    // Kigali default if nothing set
    const lat = Number(value?.lat);
    const lng = Number(value?.lng);
    if (isFinite(lat) && isFinite(lng) && (lat || lng)) return { lat, lng };
    return { lat: -1.9441, lng: 30.0619 };
  }, [value]);

  useEffect(() => {
    if (!apiKey) {
      setMapErr("Google Maps API key missing. Set VITE_GOOGLE_MAPS_API_KEY.");
      return;
    }

    let cancelled = false;

    (async () => {
      try {
        setMapErr("");
        const g = await loadGoogleMaps(apiKey);
        if (cancelled) return;

        geocoderObj.current = new g.maps.Geocoder();

        // Create map
        mapObj.current = new g.maps.Map(mapRef.current, {
          center: initialCenter,
          zoom: 13,
          mapTypeControl: false,
          streetViewControl: false,
          fullscreenControl: true,
        });

        // Create marker
        markerObj.current = new g.maps.Marker({
          position: initialCenter,
          map: mapObj.current,
          draggable: true,
        });

        // Click to set marker
        mapObj.current.addListener("click", async (e) => {
          const lat = e.latLng.lat();
          const lng = e.latLng.lng();
          await setLocation(lat, lng, true);
        });

        // Drag end to update
        markerObj.current.addListener("dragend", async () => {
          const pos = markerObj.current.getPosition();
          if (!pos) return;
          await setLocation(pos.lat(), pos.lng(), true);
        });

        // Autocomplete input
        autocompleteObj.current = new g.maps.places.Autocomplete(inputRef.current, {
          fields: ["formatted_address", "geometry"],
        });

        autocompleteObj.current.addListener("place_changed", async () => {
          const place = autocompleteObj.current.getPlace();
          const loc = place?.geometry?.location;
          if (!loc) return;

          const lat = loc.lat();
          const lng = loc.lng();
          const address = place.formatted_address || "";
          await setLocation(lat, lng, false, address);
        });

        setMapReady(true);
      } catch (e) {
        setMapErr("Failed to load Google Maps. Check API key & billing/permissions.");
      }
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [apiKey]);

  async function reverseGeocode(lat, lng) {
    const g = window.google;
    const geo = geocoderObj.current;
    if (!g?.maps || !geo) return "";

    return new Promise((resolve) => {
      geo.geocode({ location: { lat, lng } }, (results, status) => {
        if (status === "OK" && results?.[0]?.formatted_address) {
          resolve(results[0].formatted_address);
        } else {
          resolve("");
        }
      });
    });
  }

  async function setLocation(lat, lng, shouldReverse = true, providedAddress = "") {
    const g = window.google;
    if (g?.maps && mapObj.current && markerObj.current) {
      const pos = { lat, lng };
      markerObj.current.setPosition(pos);
      mapObj.current.panTo(pos);
    }

    let address = providedAddress || value?.address || "";
    if (shouldReverse) {
      const found = await reverseGeocode(lat, lng);
      if (found) address = found;
    }

    onChange?.({ lat, lng, address });
  }

  async function useMyLocation() {
    if (!navigator.geolocation) {
      setMapErr("Geolocation not supported in this browser.");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        await setLocation(lat, lng, true);
      },
      () => setMapErr("Failed to get your current location (permission denied?)."),
      { enableHighAccuracy: true, timeout: 8000 }
    );
  }

  return (
    <div className="grid gap-2">
      <div className="flex items-center gap-2">
        <input
          ref={inputRef}
          className="border rounded-lg px-3 py-2 flex-1"
          placeholder="Search address on Google Maps…"
          disabled={!mapReady}
        />
        <button
          type="button"
          onClick={useMyLocation}
          className="px-3 py-2 rounded-lg border hover:bg-slate-50"
          disabled={!mapReady}
          title="Use current location"
        >
          📍 Use my location
        </button>
      </div>

      {mapErr && (
        <div className="text-sm text-rose-600">
          {mapErr}
          <div className="text-xs text-rose-500 mt-1">
            Make sure “Places API” is enabled for your key, and billing is active.
          </div>
        </div>
      )}

      <div className="text-xs text-slate-500">
        Tip: Click the map or drag the marker to set driver location.
      </div>

      <div className="h-[320px] rounded-xl overflow-hidden border bg-slate-50" ref={mapRef} />

      <div className="grid grid-cols-2 gap-2">
        <div className="text-sm text-slate-700">
          <span className="text-slate-500">Lat:</span>{" "}
          <b>{value?.lat ? Number(value.lat).toFixed(6) : "—"}</b>
        </div>
        <div className="text-sm text-slate-700">
          <span className="text-slate-500">Lng:</span>{" "}
          <b>{value?.lng ? Number(value.lng).toFixed(6) : "—"}</b>
        </div>
      </div>

      <div className="text-sm text-slate-700">
        <span className="text-slate-500">Address:</span>{" "}
        {value?.address ? value.address : <span className="text-slate-400">—</span>}
      </div>
    </div>
  );
}

export default function DriverCreate() {
  const nav = useNavigate();
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");

  const GOOGLE_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;

  const [form, setForm] = useState({
    // user
    name: "",
    email: "",
    phone: "",
    password: "",

    // driver
    profile_image: null, // File
    gender: "",
    marital_status: "",

    license_no: "",
    license_expiry: "",
    license_category: "",
    experience_years: 0,

    status: "active",
    is_verified: false,
    is_available: true,

    // location
    current_lat: "",
    current_lng: "",
    current_address: "",
  });

  const set = (k, v) => setForm((s) => ({ ...s, [k]: v }));

  async function submit(e) {
    e.preventDefault();
    setSaving(true);
    setErr("");

    try {
      const fd = new FormData();

      // user
      fd.append("name", form.name);
      fd.append("email", form.email);
      if (form.phone) fd.append("phone", form.phone);
      if (form.password) fd.append("password", form.password);

      // driver image
      if (form.profile_image) fd.append("profile_image", form.profile_image);

      // personal
      if (form.gender) fd.append("gender", form.gender);
      if (form.marital_status) fd.append("marital_status", form.marital_status);

      // license
      if (form.license_no) fd.append("license_no", form.license_no);
      if (form.license_expiry) fd.append("license_expiry", form.license_expiry);
      if (form.license_category) fd.append("license_category", form.license_category);
      fd.append("experience_years", String(form.experience_years ?? 0));

      // status
      fd.append("status", form.status);
      fd.append("is_verified", form.is_verified ? "1" : "0");
      fd.append("is_available", form.is_available ? "1" : "0");

      // location (from picker)
      if (form.current_lat) fd.append("current_lat", String(form.current_lat));
      if (form.current_lng) fd.append("current_lng", String(form.current_lng));
      if (form.current_address) fd.append("current_address", form.current_address);

      const out = await api("/drivers", { method: "POST", body: fd });
      const driver = out?.driver ?? out?.data?.driver ?? out?.data ?? out;
      const id = driver?.id || driver?.driver?.id;

      if (!id) throw new Error("Driver created but id not returned.");
      nav(`/admin/drivers/${id}`);
    } catch (e2) {
      setErr(e2?.message || "Save failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="max-w-2xl">
      <h1 className="text-xl font-semibold mb-4">New Driver</h1>

      <form onSubmit={submit} className="grid gap-3">
        {/* User */}
        <input
          className="border rounded-lg px-3 py-2"
          placeholder="Full name"
          value={form.name}
          onChange={(e) => set("name", e.target.value)}
          required
        />
        <input
          className="border rounded-lg px-3 py-2"
          placeholder="Email"
          type="email"
          value={form.email}
          onChange={(e) => set("email", e.target.value)}
          required
        />
        <input
          className="border rounded-lg px-3 py-2"
          placeholder="Phone"
          value={form.phone}
          onChange={(e) => set("phone", e.target.value)}
        />
        <input
          className="border rounded-lg px-3 py-2"
          placeholder="Password (optional)"
          type="password"
          value={form.password}
          onChange={(e) => set("password", e.target.value)}
        />

        {/* Profile image */}
        <div className="grid gap-1">
          <label className="text-sm text-gray-600">Profile Image</label>
          <input
            type="file"
            accept="image/*"
            className="border rounded-lg px-3 py-2"
            onChange={(e) => set("profile_image", e.target.files?.[0] || null)}
          />
          {form.profile_image && (
            <div className="text-xs text-gray-500">Selected: {form.profile_image.name}</div>
          )}
        </div>

        {/* Personal */}
        <div className="grid grid-cols-2 gap-2">
          <select
            className="border rounded-lg px-3 py-2"
            value={form.gender}
            onChange={(e) => set("gender", e.target.value)}
          >
            <option value="">Gender (optional)</option>
            <option value="male">male</option>
            <option value="female">female</option>
            <option value="other">other</option>
          </select>

          <select
            className="border rounded-lg px-3 py-2"
            value={form.marital_status}
            onChange={(e) => set("marital_status", e.target.value)}
          >
            <option value="">Marital status (optional)</option>
            <option value="single">single</option>
            <option value="married">married</option>
            <option value="divorced">divorced</option>
            <option value="widowed">widowed</option>
          </select>
        </div>

        {/* License */}
        <input
          className="border rounded-lg px-3 py-2"
          placeholder="License No"
          value={form.license_no}
          onChange={(e) => set("license_no", e.target.value)}
        />

        <div className="grid grid-cols-2 gap-2">
          <input
            className="border rounded-lg px-3 py-2"
            type="date"
            value={form.license_expiry}
            onChange={(e) => set("license_expiry", e.target.value)}
          />
          <input
            className="border rounded-lg px-3 py-2"
            placeholder="License Category (e.g. A/B/C)"
            value={form.license_category}
            onChange={(e) => set("license_category", e.target.value)}
          />
        </div>

        <input
          className="border rounded-lg px-3 py-2"
          type="number"
          min="0"
          placeholder="Experience years"
          value={form.experience_years}
          onChange={(e) => set("experience_years", e.target.value)}
        />

        {/* Status */}
        <div className="grid grid-cols-2 gap-2">
          <select
            className="border rounded-lg px-3 py-2"
            value={form.status}
            onChange={(e) => set("status", e.target.value)}
          >
            <option value="active">active</option>
            <option value="inactive">inactive</option>
            <option value="suspended">suspended</option>
          </select>

          <div className="flex items-center gap-4 border rounded-lg px-3 py-2">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={form.is_verified}
                onChange={(e) => set("is_verified", e.target.checked)}
              />
              Verified
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={form.is_available}
                onChange={(e) => set("is_available", e.target.checked)}
              />
              Available
            </label>
          </div>
        </div>

        {/* Google Maps Location Picker */}
        <div className="grid gap-2">
          <div className="text-sm font-medium text-gray-700">Driver Location (Google Map)</div>

          <LocationPicker
            apiKey={GOOGLE_KEY}
            value={{
              lat: form.current_lat ? Number(form.current_lat) : null,
              lng: form.current_lng ? Number(form.current_lng) : null,
              address: form.current_address || "",
            }}
            onChange={({ lat, lng, address }) => {
              set("current_lat", lat);
              set("current_lng", lng);
              set("current_address", address || "");
            }}
          />
        </div>

        {err && <div className="text-sm text-rose-600">{err}</div>}

        <div className="flex gap-2">
          <button
            disabled={saving}
            className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-60"
          >
            {saving ? "Saving…" : "Save"}
          </button>
          <button type="button" className="px-4 py-2 rounded-lg border" onClick={() => nav(-1)}>
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}