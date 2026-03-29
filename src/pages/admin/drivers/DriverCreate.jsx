// src/pages/admin/drivers/DriverCreate.jsx
import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../../../lib/api";

const STEPS = [
  { id: 1, title: "Account", subtitle: "Basic login and contact info" },
  { id: 2, title: "Profile", subtitle: "Driver personal and license details" },
  { id: 3, title: "Location & Status", subtitle: "Driver map location and availability" },
  { id: 4, title: "Review", subtitle: "Confirm before saving" },
];

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/i;

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

function Label({ children, required = false }) {
  return (
    <label className="mb-2 block text-sm font-medium text-slate-700">
      {children}
      {required && <span className="ml-1 text-rose-500">*</span>}
    </label>
  );
}

function Input({
  label,
  required,
  hint,
  className = "",
  containerClassName = "",
  ...props
}) {
  return (
    <div className={containerClassName}>
      {label ? <Label required={required}>{label}</Label> : null}
      <input
        {...props}
        className={`w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100 ${className}`}
      />
      {hint ? <p className="mt-2 text-xs text-slate-500">{hint}</p> : null}
    </div>
  );
}

function Select({
  label,
  required,
  hint,
  children,
  className = "",
  containerClassName = "",
  ...props
}) {
  return (
    <div className={containerClassName}>
      {label ? <Label required={required}>{label}</Label> : null}
      <select
        {...props}
        className={`w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100 ${className}`}
      >
        {children}
      </select>
      {hint ? <p className="mt-2 text-xs text-slate-500">{hint}</p> : null}
    </div>
  );
}

function ToggleCard({ label, desc, checked, onChange }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={`flex w-full items-start justify-between gap-3 rounded-2xl border p-4 text-left transition ${
        checked
          ? "border-emerald-300 bg-emerald-50"
          : "border-slate-200 bg-white hover:bg-slate-50"
      }`}
    >
      <div>
        <div className="text-sm font-semibold text-slate-900">{label}</div>
        <div className="mt-1 text-xs text-slate-500">{desc}</div>
      </div>

      <div
        className={`mt-0.5 flex h-6 w-11 rounded-full p-1 transition ${
          checked ? "bg-emerald-600" : "bg-slate-300"
        }`}
      >
        <div
          className={`h-4 w-4 rounded-full bg-white transition ${
            checked ? "translate-x-5" : "translate-x-0"
          }`}
        />
      </div>
    </button>
  );
}

function SummaryRow({ label, value }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-dashed border-slate-200 py-3 last:border-b-0">
      <div className="text-sm text-slate-500">{label}</div>
      <div className="text-right text-sm font-medium text-slate-900">
        {value || <span className="text-slate-400">—</span>}
      </div>
    </div>
  );
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
    const lat = Number(value?.lat);
    const lng = Number(value?.lng);
    if (Number.isFinite(lat) && Number.isFinite(lng) && (lat || lng)) {
      return { lat, lng };
    }
    return { lat: -1.9441, lng: 30.0619 }; // Kigali default
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

        mapObj.current = new g.maps.Map(mapRef.current, {
          center: initialCenter,
          zoom: 13,
          mapTypeControl: false,
          streetViewControl: false,
          fullscreenControl: true,
        });

        markerObj.current = new g.maps.Marker({
          position: initialCenter,
          map: mapObj.current,
          draggable: true,
        });

        mapObj.current.addListener("click", async (e) => {
          const lat = e.latLng.lat();
          const lng = e.latLng.lng();
          await setLocation(lat, lng, true);
        });

        markerObj.current.addListener("dragend", async () => {
          const pos = markerObj.current.getPosition();
          if (!pos) return;
          await setLocation(pos.lat(), pos.lng(), true);
        });

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
      } catch (_) {
        setMapErr("Failed to load Google Maps. Check API key, permissions and billing.");
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [apiKey, initialCenter]);

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
      setMapErr("Geolocation is not supported in this browser.");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        await setLocation(lat, lng, true);
      },
      () => setMapErr("Failed to get current location. Permission may be denied."),
      { enableHighAccuracy: true, timeout: 8000 }
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-3 md:flex-row">
        <input
          ref={inputRef}
          className="flex-1 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
          placeholder="Search address on Google Maps..."
          disabled={!mapReady}
        />
        <button
          type="button"
          onClick={useMyLocation}
          className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-60"
          disabled={!mapReady}
        >
          📍 Use My Location
        </button>
      </div>

      {mapErr ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {mapErr}
          <div className="mt-1 text-xs text-rose-500">
            Make sure Places API is enabled and billing is active for your Google key.
          </div>
        </div>
      ) : null}

      <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-xs text-slate-500">
        Tip: click the map or drag the marker to set the driver's location.
      </div>

      <div className="h-[340px] overflow-hidden rounded-3xl border border-slate-200 bg-slate-50" ref={mapRef} />

      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        <div className="rounded-2xl border border-slate-200 bg-white p-4">
          <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Latitude
          </div>
          <div className="mt-2 text-sm font-semibold text-slate-900">
            {value?.lat ? Number(value.lat).toFixed(6) : "—"}
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4">
          <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Longitude
          </div>
          <div className="mt-2 text-sm font-semibold text-slate-900">
            {value?.lng ? Number(value.lng).toFixed(6) : "—"}
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 md:col-span-1">
          <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Address
          </div>
          <div className="mt-2 text-sm font-semibold text-slate-900 break-words">
            {value?.address || "—"}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function DriverCreate() {
  const nav = useNavigate();
  const GOOGLE_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;

  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");
  const [previewUrl, setPreviewUrl] = useState("");

  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    password: "",

    profile_image: null,
    gender: "",
    marital_status: "",

    license_no: "",
    license_expiry: "",
    license_category: "",
    experience_years: 0,

    status: "active",
    is_verified: false,
    is_available: true,

    current_lat: "",
    current_lng: "",
    current_address: "",
  });

  function set(key, value) {
    setForm((s) => ({ ...s, [key]: value }));
  }

  useEffect(() => {
    if (!form.profile_image) {
      setPreviewUrl("");
      return;
    }

    const url = URL.createObjectURL(form.profile_image);
    setPreviewUrl(url);

    return () => URL.revokeObjectURL(url);
  }, [form.profile_image]);

  function validateCurrentStep(currentStep = step) {
    if (currentStep === 1) {
      if (!form.name.trim()) return "Driver full name is required";
      if (!form.email.trim()) return "Email is required";
      if (!EMAIL_RE.test(form.email.trim())) return "Enter a valid email address";
      return "";
    }

    if (currentStep === 2) {
      if (!form.license_no.trim()) return "License number is required";
      if (!form.license_category.trim()) return "License category is required";
      if (Number(form.experience_years) < 0) return "Experience years cannot be negative";
      return "";
    }

    if (currentStep === 3) {
      return "";
    }

    return "";
  }

  function nextStep() {
    const message = validateCurrentStep(step);
    if (message) {
      setErr(message);
      return;
    }
    setErr("");
    setStep((s) => Math.min(s + 1, STEPS.length));
  }

  function prevStep() {
    setErr("");
    setStep((s) => Math.max(s - 1, 1));
  }

  async function submit(e) {
    e.preventDefault();

    const validationError =
      validateCurrentStep(1) || validateCurrentStep(2) || validateCurrentStep(3);

    if (validationError) {
      setErr(validationError);
      return;
    }

    setSaving(true);
    setErr("");

    try {
      const fd = new FormData();

      fd.append("name", form.name.trim());
      fd.append("email", form.email.trim());
      if (form.phone) fd.append("phone", form.phone.trim());
      if (form.password) fd.append("password", form.password);

      if (form.profile_image) fd.append("profile_image", form.profile_image);

      if (form.gender) fd.append("gender", form.gender);
      if (form.marital_status) fd.append("marital_status", form.marital_status);

      fd.append("license_no", form.license_no.trim());
      if (form.license_expiry) fd.append("license_expiry", form.license_expiry);
      fd.append("license_category", form.license_category.trim());
      fd.append("experience_years", String(form.experience_years ?? 0));

      fd.append("status", form.status);
      fd.append("is_verified", form.is_verified ? "1" : "0");
      fd.append("is_available", form.is_available ? "1" : "0");

      if (form.current_lat !== "") fd.append("current_lat", String(form.current_lat));
      if (form.current_lng !== "") fd.append("current_lng", String(form.current_lng));
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
    <div className="mx-auto max-w-6xl">
      <div className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-[0_10px_40px_rgba(2,6,23,0.06)]">
        <div className="border-b border-slate-200 bg-gradient-to-r from-slate-50 via-white to-blue-50 px-6 py-6 sm:px-8">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="mb-2 inline-flex rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-blue-700">
                Driver Registration
              </p>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
                Create New Driver
              </h1>
              <p className="mt-2 max-w-2xl text-sm text-slate-600">
                Add driver account, personal details, license information, location and
                current availability in a clean multi-step form.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {STEPS.map((item) => {
                const active = step === item.id;
                const done = step > item.id;

                return (
                  <div
                    key={item.id}
                    className={`rounded-2xl border px-4 py-3 transition ${
                      active
                        ? "border-blue-500 bg-blue-50 shadow-sm"
                        : done
                        ? "border-emerald-200 bg-emerald-50"
                        : "border-slate-200 bg-white"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold ${
                          active
                            ? "bg-blue-600 text-white"
                            : done
                            ? "bg-emerald-600 text-white"
                            : "bg-slate-100 text-slate-600"
                        }`}
                      >
                        {done ? "✓" : item.id}
                      </div>
                      <div>
                        <div className="text-sm font-semibold text-slate-900">{item.title}</div>
                        <div className="text-xs text-slate-500">{item.subtitle}</div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <form onSubmit={submit} className="px-6 py-6 sm:px-8">
          {err ? (
            <div className="mb-5 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
              {err}
            </div>
          ) : null}

          {step === 1 && (
            <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.1fr_0.9fr]">
              <div className="rounded-3xl border border-slate-200 bg-slate-50/60 p-5">
                <h2 className="text-lg font-semibold text-slate-900">Account Information</h2>
                <p className="mt-1 text-sm text-slate-500">
                  Basic user information for the driver account.
                </p>

                <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2">
                  <Input
                    label="Full Name"
                    required
                    placeholder="Enter full name"
                    value={form.name}
                    onChange={(e) => set("name", e.target.value)}
                    containerClassName="md:col-span-2"
                  />

                  <Input
                    label="Email Address"
                    required
                    type="email"
                    placeholder="driver@example.com"
                    value={form.email}
                    onChange={(e) => set("email", e.target.value)}
                  />

                  <Input
                    label="Phone Number"
                    placeholder="078..."
                    value={form.phone}
                    onChange={(e) => set("phone", e.target.value)}
                  />

                  <Input
                    label="Password"
                    type="password"
                    placeholder="Optional password"
                    hint="Leave empty if password should be set later."
                    value={form.password}
                    onChange={(e) => set("password", e.target.value)}
                    containerClassName="md:col-span-2"
                  />
                </div>
              </div>

              <div className="rounded-3xl border border-slate-200 bg-white p-5">
                <h2 className="text-lg font-semibold text-slate-900">Profile Image</h2>
                <p className="mt-1 text-sm text-slate-500">
                  Upload a driver photo for profile and identification.
                </p>

                <div className="mt-5 flex flex-col items-center rounded-3xl border border-dashed border-slate-300 bg-slate-50 p-6 text-center">
                  <div className="mb-4 h-28 w-28 overflow-hidden rounded-full border border-slate-200 bg-white">
                    {previewUrl ? (
                      <img
                        src={previewUrl}
                        alt="Driver preview"
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-3xl text-slate-300">
                        👤
                      </div>
                    )}
                  </div>

                  <label className="inline-flex cursor-pointer items-center justify-center rounded-2xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800">
                    Choose Image
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => set("profile_image", e.target.files?.[0] || null)}
                    />
                  </label>

                  <p className="mt-3 text-xs text-slate-500">
                    Recommended: clear face photo, JPG or PNG.
                  </p>

                  {form.profile_image ? (
                    <div className="mt-2 text-xs font-medium text-slate-700">
                      Selected: {form.profile_image.name}
                    </div>
                  ) : null}
                </div>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
              <div className="rounded-3xl border border-slate-200 bg-slate-50/60 p-5">
                <h2 className="text-lg font-semibold text-slate-900">Personal Details</h2>
                <p className="mt-1 text-sm text-slate-500">
                  Optional personal information about the driver.
                </p>

                <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2">
                  <Select
                    label="Gender"
                    value={form.gender}
                    onChange={(e) => set("gender", e.target.value)}
                  >
                    <option value="">Select gender</option>
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                    <option value="other">Other</option>
                  </Select>

                  <Select
                    label="Marital Status"
                    value={form.marital_status}
                    onChange={(e) => set("marital_status", e.target.value)}
                  >
                    <option value="">Select marital status</option>
                    <option value="single">Single</option>
                    <option value="married">Married</option>
                    <option value="divorced">Divorced</option>
                    <option value="widowed">Widowed</option>
                  </Select>
                </div>
              </div>

              <div className="rounded-3xl border border-slate-200 bg-white p-5">
                <h2 className="text-lg font-semibold text-slate-900">License Details</h2>
                <p className="mt-1 text-sm text-slate-500">
                  Main driving license information.
                </p>

                <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2">
                  <Input
                    label="License Number"
                    required
                    placeholder="Enter license number"
                    value={form.license_no}
                    onChange={(e) => set("license_no", e.target.value)}
                    containerClassName="md:col-span-2"
                  />

                  <Input
                    label="License Expiry"
                    type="date"
                    value={form.license_expiry}
                    onChange={(e) => set("license_expiry", e.target.value)}
                  />

                  <Input
                    label="License Category"
                    required
                    placeholder="Example: A / B / C"
                    value={form.license_category}
                    onChange={(e) => set("license_category", e.target.value)}
                  />

                  <Input
                    label="Experience Years"
                    type="number"
                    min="0"
                    placeholder="0"
                    value={form.experience_years}
                    onChange={(e) => set("experience_years", e.target.value)}
                    containerClassName="md:col-span-2"
                  />
                </div>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-6">
              <div className="rounded-3xl border border-slate-200 bg-slate-50/60 p-5">
                <h2 className="text-lg font-semibold text-slate-900">Driver Status</h2>
                <p className="mt-1 text-sm text-slate-500">
                  Set driver status, verification and current availability.
                </p>

                <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-3">
                  <Select
                    label="Account Status"
                    value={form.status}
                    onChange={(e) => set("status", e.target.value)}
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                    <option value="suspended">Suspended</option>
                  </Select>

                  <ToggleCard
                    label="Verified Driver"
                    desc="Mark driver as verified by admin."
                    checked={form.is_verified}
                    onChange={(value) => set("is_verified", value)}
                  />

                  <ToggleCard
                    label="Available Now"
                    desc="Shows whether this driver can accept rides."
                    checked={form.is_available}
                    onChange={(value) => set("is_available", value)}
                  />
                </div>
              </div>

              <div className="rounded-3xl border border-slate-200 bg-white p-5">
                <h2 className="text-lg font-semibold text-slate-900">Driver Location</h2>
                <p className="mt-1 text-sm text-slate-500">
                  Set the driver's current position using Google Maps.
                </p>

                <div className="mt-5">
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
              </div>
            </div>
          )}

          {step === 4 && (
            <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
              <div className="rounded-3xl border border-slate-200 bg-white p-5">
                <h2 className="text-lg font-semibold text-slate-900">Account Summary</h2>
                <p className="mt-1 text-sm text-slate-500">
                  Review user and contact information.
                </p>

                <div className="mt-4">
                  <SummaryRow label="Full Name" value={form.name} />
                  <SummaryRow label="Email" value={form.email} />
                  <SummaryRow label="Phone" value={form.phone} />
                  <SummaryRow
                    label="Password"
                    value={form.password ? "Will be set" : "Not set now"}
                  />
                  <SummaryRow
                    label="Profile Image"
                    value={form.profile_image ? form.profile_image.name : ""}
                  />
                </div>
              </div>

              <div className="rounded-3xl border border-slate-200 bg-white p-5">
                <h2 className="text-lg font-semibold text-slate-900">Driver Summary</h2>
                <p className="mt-1 text-sm text-slate-500">
                  Review personal, license and location details.
                </p>

                <div className="mt-4">
                  <SummaryRow label="Gender" value={form.gender} />
                  <SummaryRow label="Marital Status" value={form.marital_status} />
                  <SummaryRow label="License Number" value={form.license_no} />
                  <SummaryRow label="License Expiry" value={form.license_expiry} />
                  <SummaryRow label="License Category" value={form.license_category} />
                  <SummaryRow label="Experience Years" value={String(form.experience_years)} />
                  <SummaryRow label="Status" value={form.status} />
                  <SummaryRow label="Verified" value={form.is_verified ? "Yes" : "No"} />
                  <SummaryRow label="Available" value={form.is_available ? "Yes" : "No"} />
                  <SummaryRow label="Latitude" value={form.current_lat ? String(form.current_lat) : ""} />
                  <SummaryRow label="Longitude" value={form.current_lng ? String(form.current_lng) : ""} />
                  <SummaryRow label="Address" value={form.current_address} />
                </div>
              </div>

              <div className="xl:col-span-2 rounded-3xl border border-blue-200 bg-blue-50 p-5">
                <h3 className="text-base font-semibold text-blue-900">Before saving</h3>
                <p className="mt-2 text-sm text-blue-800">
                  This will create the driver account and store the driver profile, license,
                  status and current location in the system.
                </p>
              </div>
            </div>
          )}

          <div className="mt-8 flex flex-col gap-3 border-t border-slate-200 pt-6 sm:flex-row sm:items-center sm:justify-between">
            <button
              type="button"
              onClick={() => (step === 1 ? nav(-1) : prevStep())}
              className="inline-flex items-center justify-center rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              {step === 1 ? "Cancel" : "Back"}
            </button>

            <div className="flex flex-col gap-3 sm:flex-row">
              {step < STEPS.length ? (
                <button
                  type="button"
                  onClick={nextStep}
                  className="inline-flex items-center justify-center rounded-2xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
                >
                  Continue
                </button>
              ) : (
                <button
                  type="submit"
                  disabled={saving}
                  className="inline-flex items-center justify-center rounded-2xl bg-blue-600 px-6 py-3 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {saving ? "Saving..." : "Save Driver"}
                </button>
              )}
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}