// src/pages/owner/Owner.jsx
import { useEffect, useMemo, useRef, useState } from "react";

/* ---------------- helpers ---------------- */
function safeParse(s) {
  try {
    return s ? JSON.parse(s) : null;
  } catch {
    return null;
  }
}

function getRoleName(u) {
  if (!u) return "User";
  if (typeof u.role === "string") return u.role;
  if (u.role?.name) return u.role.name;
  if (u.role?.slug) return u.role.slug;

  if (Array.isArray(u.roles) && u.roles.length) {
    const r = u.roles[0];
    return typeof r === "string" ? r : r.name || r.slug || "User";
  }
  return "User";
}

function initials(nameOrEmail) {
  const s = String(nameOrEmail || "").trim();
  if (!s) return "U";
  const parts = s.split(" ").filter(Boolean);
  const a = parts[0]?.[0] || "U";
  const b = parts[1]?.[0] || "";
  return (a + b).toUpperCase();
}

function formatRWF(n) {
  if (n == null || n === "") return "—";
  const num = Number(n);
  if (Number.isNaN(num)) return String(n);
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency: "RWF",
    maximumFractionDigits: 0,
  }).format(num);
}

function vehicleName(v) {
  return (
    v?.display_name ||
    v?.name ||
    `${v?.year || ""} ${v?.make || ""} ${v?.model || ""}`.trim() ||
    "Vehicle"
  );
}

function vehicleCategory(v) {
  return (
    v?.type?.name ||
    v?.vehicle_type?.name ||
    v?.vehicleType?.name ||
    v?.type ||
    "—"
  );
}

function vehiclePlate(v) {
  return v?.plate_no || v?.license_plate || v?.plate || "—";
}

function pickDailyRate(v) {
  return (
    v?.base_daily_rate ??
    v?.price_per_day ??
    v?.daily_rate ??
    v?.pricePerDay ??
    null
  );
}

function statusBadge(status) {
  const base =
    "inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium";

  const s = String(status || "").toLowerCase();

  if (s === "available" || s === "in_service" || s === "live") {
    return `${base} bg-emerald-50 text-emerald-700`;
  }
  if (s === "booked" || s === "confirmed" || s === "pending") {
    return `${base} bg-amber-50 text-amber-700`;
  }
  if (s === "maintenance") {
    return `${base} bg-rose-50 text-rose-700`;
  }
  return `${base} bg-slate-100 text-slate-600`;
}

/* ---------------- component ---------------- */
export default function Owner() {
  const API = import.meta.env.VITE_API_URL || `${window.location.origin}/api`;

  const user = useMemo(() => {
    return (
      safeParse(localStorage.getItem("auth.user")) ||
      safeParse(localStorage.getItem("user")) ||
      null
    );
  }, []);

  const displayName = user?.name || user?.fullName || "Guest";
  const email = user?.email || "";
  const role = getRoleName(user);
  const ownerId = user?.id;

  const [vehicles, setVehicles] = useState([]);
  const [loadingVehicles, setLoadingVehicles] = useState(true);
  const [vehiclesErr, setVehiclesErr] = useState("");

  /* ---------------- Showroom profile modal ---------------- */
  const [profileOpen, setProfileOpen] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [loadingProfile, setLoadingProfile] = useState(false);
  const [profileErr, setProfileErr] = useState("");
  const [profileOk, setProfileOk] = useState("");

  const [showroomName, setShowroomName] = useState("");
  const [showroomAddress, setShowroomAddress] = useState("");
  const [showroomLat, setShowroomLat] = useState(""); // hidden
  const [showroomLng, setShowroomLng] = useState(""); // hidden

  const [logoFile, setLogoFile] = useState(null);
  const [permitPdf, setPermitPdf] = useState(null);

  // Google places + map refs
  const locationInputRef = useRef(null);
  const autoRef = useRef(null);

  const mapDivRef = useRef(null);
  const mapRef = useRef(null);
  const markerRef = useRef(null);
  const geocoderRef = useRef(null);

  // ✅ Load Google Maps JS (Places + Maps)
  useEffect(() => {
    const key = import.meta.env.VITE_GOOGLE_MAPS_KEY;
    if (!key) return;
    if (window.google?.maps?.places) return;

    const id = "google-maps-places";
    if (document.getElementById(id)) return;

    const s = document.createElement("script");
    s.id = id;
    s.async = true;
    s.defer = true;
    s.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(
      key
    )}&libraries=places`;
    document.head.appendChild(s);
  }, []);

  // ✅ Create map when modal open
  useEffect(() => {
    if (!profileOpen) return;

    let timer = null;

    const initMap = () => {
      if (!window.google?.maps) return false;
      if (!mapDivRef.current) return false;

      if (!mapRef.current) {
        const defaultCenter = { lat: -1.9441, lng: 30.0619 }; // Kigali

        mapRef.current = new window.google.maps.Map(mapDivRef.current, {
          center: defaultCenter,
          zoom: 12,
          mapTypeControl: false,
          streetViewControl: false,
          fullscreenControl: false,
        });

        markerRef.current = new window.google.maps.Marker({
          position: defaultCenter,
          map: mapRef.current,
        });

        geocoderRef.current = new window.google.maps.Geocoder();
      }

      return true;
    };

    if (!initMap()) {
      timer = setInterval(() => {
        if (initMap()) clearInterval(timer);
      }, 300);
    }

    return () => {
      if (timer) clearInterval(timer);
    };
  }, [profileOpen]);

  // ✅ Auto-load current location (GPS) when modal opens
  useEffect(() => {
    if (!profileOpen) return;

    // If profile already has coordinates, don’t override it
    if (showroomLat && showroomLng) return;

    if (!navigator.geolocation) return;

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const p = { lat: pos.coords.latitude, lng: pos.coords.longitude };

        setShowroomLat(String(p.lat));
        setShowroomLng(String(p.lng));

        // Move map
        if (mapRef.current) {
          mapRef.current.setCenter(p);
          mapRef.current.setZoom(15);
        }
        if (markerRef.current) markerRef.current.setPosition(p);

        // Reverse geocode to fill address
        const geocoder = geocoderRef.current;
        if (geocoder) {
          geocoder.geocode({ location: p }, (results, status) => {
            if (status === "OK" && results?.[0]?.formatted_address) {
              setShowroomAddress(results[0].formatted_address);
            }
          });
        }
      },
      () => {
        // ignore if user blocks location
      },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 0 }
    );
  }, [profileOpen, showroomLat, showroomLng]);

  // ✅ init autocomplete when modal open
  useEffect(() => {
    if (!profileOpen) return;

    const key = import.meta.env.VITE_GOOGLE_MAPS_KEY;
    if (!key) return;
    if (!locationInputRef.current) return;

    let timer = null;

    const init = () => {
      if (!window.google?.maps?.places) return false;

      if (!autoRef.current) {
        autoRef.current = new window.google.maps.places.Autocomplete(
          locationInputRef.current,
          {
            fields: ["formatted_address", "geometry", "name"],
            componentRestrictions: { country: ["rw"] },
          }
        );

        autoRef.current.addListener("place_changed", () => {
          const place = autoRef.current.getPlace();
          const addr =
            place?.formatted_address ||
            place?.name ||
            locationInputRef.current.value;

          setShowroomAddress(addr || "");

          const lat = place?.geometry?.location?.lat?.();
          const lng = place?.geometry?.location?.lng?.();

          if (lat != null && lng != null) {
            const p = { lat: Number(lat), lng: Number(lng) };
            setShowroomLat(String(p.lat));
            setShowroomLng(String(p.lng));

            if (mapRef.current) {
              mapRef.current.setCenter(p);
              mapRef.current.setZoom(15);
            }
            if (markerRef.current) markerRef.current.setPosition(p);
          }
        });
      }
      return true;
    };

    if (!init()) {
      timer = setInterval(() => {
        if (init()) clearInterval(timer);
      }, 300);
    }

    return () => {
      if (timer) clearInterval(timer);
    };
  }, [profileOpen]);

  // ✅ Load showroom profile when modal opens
  useEffect(() => {
    if (!profileOpen) return;

    const token = localStorage.getItem("token");
    if (!token) return;

    const controller = new AbortController();

    async function fetchProfile() {
      setLoadingProfile(true);
      setProfileErr("");
      setProfileOk("");

      try {
        const res = await fetch(`${API}/showroom/profile`, {
          signal: controller.signal,
          headers: {
            Accept: "application/json",
            Authorization: `Bearer ${token}`,
          },
        });

        const json = await res.json().catch(() => ({}));
        if (!res.ok) {
          throw new Error(
            json?.message || json?.error || `Request failed (${res.status})`
          );
        }

        const p = json?.data || null;

        setShowroomName(p?.name || "");
        setShowroomAddress(p?.address || "");
        setShowroomLat(p?.lat != null ? String(p.lat) : "");
        setShowroomLng(p?.lng != null ? String(p.lng) : "");

        if (p?.lat != null && p?.lng != null) {
          const point = { lat: Number(p.lat), lng: Number(p.lng) };

          const tryMove = () => {
            if (mapRef.current && markerRef.current) {
              mapRef.current.setCenter(point);
              mapRef.current.setZoom(15);
              markerRef.current.setPosition(point);
              return true;
            }
            return false;
          };

          if (!tryMove()) {
            const t = setInterval(() => {
              if (tryMove()) clearInterval(t);
            }, 250);
            setTimeout(() => clearInterval(t), 4000);
          }
        }
      } catch (e) {
        if (e?.name !== "AbortError") {
          setProfileErr(e?.message || "Failed to load showroom profile.");
        }
      } finally {
        setLoadingProfile(false);
      }
    }

    fetchProfile();
    return () => controller.abort();
  }, [profileOpen, API]);

  // ✅ Load showroom vehicles
  useEffect(() => {
    const token = localStorage.getItem("token");
    const controller = new AbortController();

    async function fetchVehicles() {
      setVehiclesErr("");
      setLoadingVehicles(true);

      try {
        if (!token) throw new Error("Not authenticated. Please login again.");

        const primaryUrl =
          ownerId != null ? `${API}/showroom/${ownerId}/vehicles` : null;
        const fallbackUrl = `${API}/showroom/vehicles`;

        async function call(url) {
          const res = await fetch(url, {
            signal: controller.signal,
            headers: {
              Accept: "application/json",
              Authorization: `Bearer ${token}`,
            },
          });

          const json = await res.json().catch(() => ({}));

          if (!res.ok) {
            const msg =
              json?.message ||
              json?.error ||
              json?.errors?.error?.[0] ||
              `Request failed (${res.status})`;
            const err = new Error(msg);
            err.status = res.status;
            throw err;
          }

          const data = json?.data ?? json;

          if (Array.isArray(data?.data)) return data.data;
          if (Array.isArray(data)) return data;

          return [];
        }

        let list = [];

        if (primaryUrl) {
          try {
            list = await call(primaryUrl);
          } catch (e) {
            if (e?.status === 404 || e?.status === 403) {
              list = await call(fallbackUrl);
            } else {
              throw e;
            }
          }
        } else {
          list = await call(fallbackUrl);
        }

        setVehicles(Array.isArray(list) ? list : []);
      } catch (e) {
        if (e?.name !== "AbortError") {
          setVehiclesErr(e?.message || "Failed to load your vehicles.");
          setVehicles([]);
        }
      } finally {
        setLoadingVehicles(false);
      }
    }

    fetchVehicles();
    return () => controller.abort();
  }, [API, ownerId]);

  // KPI stats
  const vehicleStats = useMemo(() => {
    const stats = {
      total: vehicles.length,
      available: 0,
      in_service: 0,
      booked: 0,
      maintenance: 0,
      other: 0,
    };

    for (const v of vehicles) {
      const s = String(v?.status || "").toLowerCase();

      if (s === "available") stats.available++;
      else if (s === "in_service") stats.in_service++;
      else if (s === "booked") stats.booked++;
      else if (s === "maintenance") stats.maintenance++;
      else stats.other++;
    }

    stats.live = stats.available + stats.in_service;
    return stats;
  }, [vehicles]);

  const kpis = useMemo(() => {
    return [
      {
        label: "Total Vehicles",
        value: String(vehicleStats.total),
        hint: "Cars saved in your showroom",
        accent: "bg-slate-900",
      },
      {
        label: "Vehicles Live",
        value: `${vehicleStats.live} / ${vehicleStats.total}`,
        hint: "Available & in service",
        accent: "bg-emerald-500",
      },
      {
        label: "Booked Cars",
        value: String(vehicleStats.booked),
        hint: "Currently booked",
        accent: "bg-amber-500",
      },
      {
        label: "Maintenance",
        value: String(vehicleStats.maintenance),
        hint: "Not available now",
        accent: "bg-rose-500",
      },
    ];
  }, [vehicleStats]);

  function openProfileModal() {
    setProfileErr("");
    setProfileOk("");
    setLogoFile(null);
    setPermitPdf(null);
    setProfileOpen(true);
  }

  async function saveProfile() {
    setProfileErr("");
    setProfileOk("");

    const token = localStorage.getItem("token");
    if (!token) {
      setProfileErr("Not authenticated. Please login again.");
      return;
    }

    if (!showroomName.trim()) {
      setProfileErr("Showroom name is required.");
      return;
    }

    if (!showroomAddress.trim()) {
      setProfileErr("Showroom location is required.");
      return;
    }

    if (!permitPdf) {
      setProfileErr("Working permission PDF is required.");
      return;
    }

    setSavingProfile(true);

    try {
      const fd = new FormData();
      fd.append("name", showroomName.trim());
      fd.append("address", showroomAddress.trim());

      if (showroomLat) fd.append("lat", showroomLat);
      if (showroomLng) fd.append("lng", showroomLng);

      if (logoFile) fd.append("logo", logoFile);
      fd.append("working_permission_pdf", permitPdf);

      const res = await fetch(`${API}/showroom/profile`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/json",
        },
        body: fd,
      });

      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(
          json?.message ||
            json?.error ||
            json?.errors?.name?.[0] ||
            json?.errors?.working_permission_pdf?.[0] ||
            `Request failed (${res.status})`
        );
      }

      setProfileOk("✅ Showroom profile updated successfully.");
      setTimeout(() => setProfileOpen(false), 700);
    } catch (e) {
      setProfileErr(e?.message || "Failed to update showroom profile.");
    } finally {
      setSavingProfile(false);
    }
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 space-y-6">
      {/* header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">
            Owner Dashboard
          </h1>
          <p className="text-sm text-slate-500">Monitor your cars in one place.</p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-3 py-2">
            <div className="h-9 w-9 rounded-full bg-slate-900 text-white grid place-items-center text-xs font-semibold">
              {initials(displayName || email)}
            </div>

            <div className="leading-tight">
              <div className="flex items-center gap-2">
                <p className="text-sm font-semibold text-slate-900 truncate max-w-[180px]">
                  {displayName}
                </p>
                <span className="text-[11px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
                  {String(role).toLowerCase()}
                </span>
              </div>

              {email ? (
                <p className="text-[11px] text-slate-500 truncate max-w-[220px]">
                  {email}
                </p>
              ) : (
                <p className="text-[11px] text-slate-400">Not logged in</p>
              )}
            </div>
          </div>

          <button
            onClick={openProfileModal}
            className="inline-flex items-center h-10 rounded-lg bg-slate-900 px-4 text-sm font-semibold text-white shadow-sm hover:bg-slate-800"
          >
            🏢 Update Showroom Profile
          </button>
        </div>
      </div>

      {/* KPI cards */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {loadingVehicles
          ? Array.from({ length: 4 }).map((_, i) => (
              <div
                key={i}
                className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm shadow-slate-900/5 animate-pulse"
              >
                <div className="h-4 w-28 bg-slate-100 rounded" />
                <div className="mt-3 h-7 w-16 bg-slate-100 rounded" />
                <div className="mt-2 h-3 w-40 bg-slate-100 rounded" />
              </div>
            ))
          : kpis.map((card) => (
              <div
                key={card.label}
                className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm shadow-slate-900/5"
              >
                <div className="flex items-center gap-3">
                  <div className={`h-9 w-9 rounded-lg ${card.accent}`} />
                  <div>
                    <p className="text-xs font-medium text-slate-500">
                      {card.label}
                    </p>
                    <p className="mt-0.5 text-[11px] text-slate-400">
                      {card.hint}
                    </p>
                  </div>
                </div>
                <div className="mt-3 text-2xl font-semibold text-slate-900">
                  {card.value}
                </div>
              </div>
            ))}
      </div>

      {/* vehicles table */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
        <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
          <div>
            <h2 className="text-sm font-semibold text-slate-900">My Vehicles</h2>
            <p className="text-xs text-slate-500">
              Only vehicles saved in your showroom appear here.
            </p>
          </div>
        </div>

        {vehiclesErr && (
          <div className="px-4 py-3 text-sm text-rose-700 bg-rose-50 border-b border-rose-100">
            {vehiclesErr}
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="bg-slate-50 text-left text-xs font-medium text-slate-500">
                <th className="px-4 py-2">Vehicle</th>
                <th className="px-4 py-2">Car Type</th>
                <th className="px-4 py-2">Status</th>
                <th className="px-4 py-2">Daily Rate</th>
              </tr>
            </thead>

            <tbody>
              {loadingVehicles ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <tr key={i} className="border-t border-slate-100">
                    <td className="px-4 py-3">
                      <div className="h-4 w-40 rounded bg-slate-100 animate-pulse" />
                      <div className="mt-2 h-3 w-28 rounded bg-slate-100 animate-pulse" />
                    </td>
                    <td className="px-4 py-3">
                      <div className="h-4 w-24 rounded bg-slate-100 animate-pulse" />
                    </td>
                    <td className="px-4 py-3">
                      <div className="h-5 w-16 rounded bg-slate-100 animate-pulse" />
                    </td>
                    <td className="px-4 py-3">
                      <div className="h-4 w-24 rounded bg-slate-100 animate-pulse" />
                    </td>
                  </tr>
                ))
              ) : vehicles.length > 0 ? (
                vehicles.map((v) => (
                  <tr key={v.id} className="border-t border-slate-100">
                    <td className="px-4 py-2">
                      <div className="flex flex-col">
                        <span className="text-sm font-medium text-slate-900">
                          {vehicleName(v)}
                        </span>
                        <span className="text-xs text-slate-500">
                          {vehiclePlate(v)} • ID: {v.id}
                        </span>
                      </div>
                    </td>

                    <td className="px-4 py-2 text-xs text-slate-600">
                      {vehicleCategory(v)}
                    </td>

                    <td className="px-4 py-2">
                      <span className={statusBadge(v.status)}>
                        {v.status || "unknown"}
                      </span>
                    </td>

                    <td className="px-4 py-2 text-sm text-slate-800">
                      {formatRWF(pickDailyRate(v))}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td
                    colSpan={4}
                    className="px-4 py-6 text-center text-sm text-slate-500"
                  >
                    You don&apos;t have any vehicles yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ✅ MODAL */}
      {profileOpen && (
        <div className="fixed inset-0 z-50">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => !savingProfile && setProfileOpen(false)}
          />
          <div className="absolute inset-0 flex items-center justify-center p-4">
            <div className="w-full max-w-2xl rounded-3xl bg-white shadow-2xl overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-semibold text-slate-900">
                    Update Showroom Profile
                  </h3>
                  <p className="text-xs text-slate-500">
                    Location auto-loads (GPS) and you can search to change it.
                  </p>
                </div>

                <button
                  className="h-9 w-9 rounded-full hover:bg-slate-100 grid place-items-center"
                  onClick={() => !savingProfile && setProfileOpen(false)}
                  aria-label="close"
                >
                  ✕
                </button>
              </div>

              <div className="p-5 space-y-4">
                {loadingProfile && (
                  <div className="text-sm text-slate-500">Loading profile…</div>
                )}

                {profileErr && (
                  <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                    {profileErr}
                  </div>
                )}

                {profileOk && (
                  <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                    {profileOk}
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-600">
                      Showroom name
                    </label>
                    <input
                      value={showroomName}
                      onChange={(e) => setShowroomName(e.target.value)}
                      className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                      placeholder="e.g. SmartCar Showroom"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-600">
                      Location (Google search)
                    </label>
                    <input
                      ref={locationInputRef}
                      value={showroomAddress}
                      onChange={(e) => setShowroomAddress(e.target.value)}
                      className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                      placeholder="Start typing location..."
                    />
                  </div>
                </div>

                {/* ✅ SMALLER MAP */}
                <div className="rounded-2xl border border-slate-200 overflow-hidden">
                  <div ref={mapDivRef} className="w-full h-[200px] bg-slate-100" />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-600">
                      Owner logo (image)
                    </label>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => setLogoFile(e.target.files?.[0] || null)}
                      className="mt-1 w-full text-sm"
                    />
                    {logoFile && (
                      <div className="mt-1 text-[11px] text-slate-500">
                        Selected: {logoFile.name}
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-600">
                      Working permission (PDF)
                    </label>
                    <input
                      type="file"
                      accept="application/pdf"
                      onChange={(e) => setPermitPdf(e.target.files?.[0] || null)}
                      className="mt-1 w-full text-sm"
                    />
                    {permitPdf && (
                      <div className="mt-1 text-[11px] text-slate-500">
                        Selected: {permitPdf.name}
                      </div>
                    )}
                  </div>
                </div>

                <div className="text-[11px] text-slate-500">
                  {showroomLat && showroomLng ? (
                    <span>
                      📍 Point: {Number(showroomLat).toFixed(5)},{" "}
                      {Number(showroomLng).toFixed(5)}
                    </span>
                  ) : (
                    <span>📍 Choose a location to set the marker.</span>
                  )}
                </div>
              </div>

              <div className="px-5 py-4 border-t border-slate-200 flex items-center justify-end gap-2">
                <button
                  onClick={() => setProfileOpen(false)}
                  disabled={savingProfile}
                  className="h-10 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60"
                >
                  Cancel
                </button>
                <button
                  onClick={saveProfile}
                  disabled={savingProfile}
                  className="h-10 rounded-xl bg-slate-900 px-4 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-60"
                >
                  {savingProfile ? "Saving..." : "Save profile"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}