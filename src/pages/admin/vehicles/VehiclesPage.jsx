import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";

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

function getVehicleImage(v) {
  if (typeof v?.image_url === "string" && v.image_url.trim()) return v.image_url;
  if (typeof v?.primary_image_url === "string" && v.primary_image_url.trim()) {
    return v.primary_image_url;
  }

  if (Array.isArray(v?.images) && v.images.length > 0) {
    const first = v.images[0];
    return first?.url || first?.image_url || first?.path || "";
  }

  if (Array.isArray(v?.media) && v.media.length > 0) {
    const first = v.media[0];
    if (typeof first === "string") return first;
    return first?.url || first?.image_url || first?.path || "";
  }

  return "";
}

function statusBadge(status) {
  const base =
    "inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-semibold border";

  const s = String(status || "").toLowerCase();

  if (s === "available" || s === "in_service" || s === "live") {
    return `${base} bg-emerald-50 text-emerald-700 border-emerald-200`;
  }
  if (s === "booked" || s === "confirmed" || s === "pending") {
    return `${base} bg-amber-50 text-amber-700 border-amber-200`;
  }
  if (s === "maintenance") {
    return `${base} bg-rose-50 text-rose-700 border-rose-200`;
  }
  return `${base} bg-slate-100 text-slate-600 border-slate-200`;
}

function profileCompletion(showroom) {
  if (!showroom) return 18;
  const fields = [
    showroom?.name,
    showroom?.address || showroom?.location,
    showroom?.phone,
    showroom?.email,
    showroom?.lat,
    showroom?.lng,
  ];
  return Math.min(
    100,
    Math.max(18, Math.round((fields.filter(Boolean).length / fields.length) * 100))
  );
}

function MiniKpi({ label, value, tone = "bg-slate-900" }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="text-[11px] uppercase tracking-[0.16em] text-slate-400">
            {label}
          </div>
          <div className="mt-1 text-lg font-semibold text-slate-900">{value}</div>
        </div>
        <div className={`h-8 w-8 rounded-xl ${tone}`} />
      </div>
    </div>
  );
}

/* ---------------- component ---------------- */
export default function Owner() {
  const nav = useNavigate();

  const API = useMemo(() => {
    const raw =
      (import.meta.env.VITE_API_URL || `${window.location.origin}/api`)
        .trim()
        .replace(/\/+$/, "");
    return raw || "/api";
  }, []);

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

  const [showroomSummary, setShowroomSummary] = useState(null);
  const [loadingShowroomSummary, setLoadingShowroomSummary] = useState(true);

  const [profileOpen, setProfileOpen] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [loadingProfile, setLoadingProfile] = useState(false);
  const [profileErr, setProfileErr] = useState("");
  const [profileOk, setProfileOk] = useState("");

  const [showroomName, setShowroomName] = useState("");
  const [showroomAddress, setShowroomAddress] = useState("");
  const [showroomLat, setShowroomLat] = useState("");
  const [showroomLng, setShowroomLng] = useState("");

  const [logoFile, setLogoFile] = useState(null);
  const [permitPdf, setPermitPdf] = useState(null);

  const locationInputRef = useRef(null);
  const autoRef = useRef(null);

  const mapDivRef = useRef(null);
  const mapRef = useRef(null);
  const markerRef = useRef(null);
  const geocoderRef = useRef(null);

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

  useEffect(() => {
    if (!profileOpen) return;

    let timer = null;

    const initMap = () => {
      if (!window.google?.maps) return false;
      if (!mapDivRef.current) return false;

      if (!mapRef.current) {
        const defaultCenter = { lat: -1.9441, lng: 30.0619 };

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

  useEffect(() => {
    if (!profileOpen) return;
    if (showroomLat && showroomLng) return;
    if (!navigator.geolocation) return;

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const p = { lat: pos.coords.latitude, lng: pos.coords.longitude };

        setShowroomLat(String(p.lat));
        setShowroomLng(String(p.lng));

        if (mapRef.current) {
          mapRef.current.setCenter(p);
          mapRef.current.setZoom(15);
        }
        if (markerRef.current) markerRef.current.setPosition(p);

        const geocoder = geocoderRef.current;
        if (geocoder) {
          geocoder.geocode({ location: p }, (results, status) => {
            if (status === "OK" && results?.[0]?.formatted_address) {
              setShowroomAddress(results[0].formatted_address);
            }
          });
        }
      },
      () => {},
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 0 }
    );
  }, [profileOpen, showroomLat, showroomLng]);

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

  useEffect(() => {
    const token = localStorage.getItem("token");
    const controller = new AbortController();

    async function fetchSummary() {
      setLoadingShowroomSummary(true);

      try {
        if (!token) return;

        const res = await fetch(`${API}/showroom/profile`, {
          signal: controller.signal,
          headers: {
            Accept: "application/json",
            Authorization: `Bearer ${token}`,
          },
        });

        if (res.status === 404) {
          setShowroomSummary(null);
          return;
        }

        const json = await res.json().catch(() => ({}));
        if (!res.ok) return;

        const p = json?.data || null;
        setShowroomSummary(p || null);
      } catch {
        setShowroomSummary(null);
      } finally {
        setLoadingShowroomSummary(false);
      }
    }

    fetchSummary();
    return () => controller.abort();
  }, [API]);

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

  const vehicleStats = useMemo(() => {
    const stats = {
      total: vehicles.length,
      available: 0,
      in_service: 0,
      booked: 0,
      maintenance: 0,
      inactive: 0,
      other: 0,
    };

    for (const v of vehicles) {
      const s = String(v?.status || "").toLowerCase();

      if (s === "available") stats.available++;
      else if (s === "in_service") stats.in_service++;
      else if (s === "booked") stats.booked++;
      else if (s === "maintenance") stats.maintenance++;
      else if (s === "inactive") stats.inactive++;
      else stats.other++;
    }

    stats.live = stats.available + stats.in_service;
    stats.recent = vehicles.slice(0, 5);
    stats.top = vehicles.slice(0, 4);
    return stats;
  }, [vehicles]);

  const completion = profileCompletion(showroomSummary);

  function openProfileModal() {
    setProfileErr("");
    setProfileOk("");
    setLogoFile(null);
    setPermitPdf(null);

    if (showroomSummary) {
      setShowroomName(showroomSummary?.name || "");
      setShowroomAddress(showroomSummary?.address || showroomSummary?.location || "");
      setShowroomLat(
        showroomSummary?.lat != null ? String(showroomSummary.lat) : ""
      );
      setShowroomLng(
        showroomSummary?.lng != null ? String(showroomSummary.lng) : ""
      );
    }

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

      const saved = json?.data || {
        name: showroomName.trim(),
        address: showroomAddress.trim(),
        lat: showroomLat,
        lng: showroomLng,
      };

      setShowroomSummary((prev) => ({
        ...(prev || {}),
        ...saved,
      }));

      setProfileOk("✅ Showroom profile updated successfully.");
      setTimeout(() => setProfileOpen(false), 700);
    } catch (e) {
      setProfileErr(e?.message || "Failed to update showroom profile.");
    } finally {
      setSavingProfile(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#f6f8fc] px-4 py-5 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-5">
        <section className="rounded-[28px] border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            <div className="flex items-center gap-4">
              <div className="grid h-14 w-14 place-items-center rounded-2xl bg-slate-900 text-sm font-semibold text-white">
                {initials(displayName || email)}
              </div>

              <div>
                <h1 className="text-2xl font-semibold text-slate-900">
                  Owner Dashboard
                </h1>
                <p className="mt-1 text-sm text-slate-500">
                  Compact operations view for showroom activity and vehicle status.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-700">
                {String(role).toLowerCase()}
              </span>
              <button
                onClick={() => nav("/owner/showroom")}
                className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
              >
                Open showroom
              </button>
              <button
                onClick={openProfileModal}
                className="rounded-2xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800"
              >
                Update profile
              </button>
            </div>
          </div>
        </section>

        <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
          <MiniKpi label="Vehicles" value={vehicleStats.total} tone="bg-slate-900" />
          <MiniKpi label="Live" value={vehicleStats.live} tone="bg-emerald-500" />
          <MiniKpi label="Booked" value={vehicleStats.booked} tone="bg-amber-500" />
          <MiniKpi label="Maintenance" value={vehicleStats.maintenance} tone="bg-rose-500" />
          <MiniKpi label="Completion" value={`${completion}%`} tone="bg-blue-500" />
        </section>

        <section className="grid gap-5 xl:grid-cols-[1.2fr_0.8fr]">
          <div className="space-y-5">
            <div className="rounded-[28px] border border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="text-[11px] uppercase tracking-[0.16em] text-blue-500">
                    Inventory snapshot
                  </div>
                  <h2 className="mt-1 text-lg font-semibold text-slate-900">
                    Recent vehicles
                  </h2>
                </div>

                <button
                  onClick={() => nav("/owner/vehicles")}
                  className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
                >
                  Manage all
                </button>
              </div>

              {vehiclesErr && (
                <div className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                  {vehiclesErr}
                </div>
              )}

              <div className="mt-4 space-y-3">
                {loadingVehicles ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <div
                      key={i}
                      className="h-16 animate-pulse rounded-2xl border border-slate-200 bg-slate-50"
                    />
                  ))
                ) : vehicleStats.recent.length > 0 ? (
                  vehicleStats.recent.map((v) => (
                    <div
                      key={v.id}
                      className="grid grid-cols-[1fr_auto] items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3"
                    >
                      <div className="min-w-0">
                        <div className="truncate text-sm font-semibold text-slate-900">
                          {vehicleName(v)}
                        </div>
                        <div className="mt-1 truncate text-xs text-slate-500">
                          {vehiclePlate(v)} • {vehicleCategory(v)}
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <div className="hidden text-right sm:block">
                          <div className="text-[11px] uppercase tracking-[0.14em] text-slate-400">
                            / Day
                          </div>
                          <div className="mt-1 text-sm font-semibold text-slate-900">
                            {formatRWF(pickDailyRate(v))}
                          </div>
                        </div>
                        <span className={statusBadge(v.status)}>{v.status || "unknown"}</span>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center text-sm text-slate-500">
                    No vehicles yet.
                  </div>
                )}
              </div>
            </div>

            <div className="rounded-[28px] border border-slate-200 bg-white p-4 shadow-sm">
              <div className="text-[11px] uppercase tracking-[0.16em] text-blue-500">
                Highlight cards
              </div>
              <h2 className="mt-1 text-lg font-semibold text-slate-900">
                Quick preview
              </h2>

              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                {loadingVehicles
                  ? Array.from({ length: 4 }).map((_, i) => (
                      <div
                        key={i}
                        className="h-40 animate-pulse rounded-3xl border border-slate-200 bg-slate-50"
                      />
                    ))
                  : vehicleStats.top.map((v) => {
                      const img = getVehicleImage(v);
                      return (
                        <div
                          key={v.id}
                          className="overflow-hidden rounded-3xl border border-slate-200 bg-white"
                        >
                          <div className="relative h-28 bg-gradient-to-br from-slate-900 via-slate-800 to-blue-900">
                            {img ? (
                              <img
                                src={img}
                                alt={vehicleName(v)}
                                className="h-full w-full object-cover"
                              />
                            ) : (
                              <div className="grid h-full place-items-center text-2xl text-white">
                                🚗
                              </div>
                            )}

                            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-3">
                              <div className="truncate text-sm font-semibold text-white">
                                {vehicleName(v)}
                              </div>
                            </div>
                          </div>

                          <div className="p-3">
                            <div className="flex items-center justify-between gap-3">
                              <span className="truncate text-xs text-slate-500">
                                {vehiclePlate(v)}
                              </span>
                              <span className={statusBadge(v.status)}>
                                {v.status || "unknown"}
                              </span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
              </div>
            </div>
          </div>

          <div className="space-y-5">
            <div className="rounded-[28px] border border-slate-200 bg-white p-4 shadow-sm">
              <div className="text-[11px] uppercase tracking-[0.16em] text-blue-500">
                Showroom profile
              </div>
              <h2 className="mt-1 text-lg font-semibold text-slate-900">
                Business summary
              </h2>

              <div className="mt-4 rounded-3xl bg-slate-900 p-4 text-white">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="text-[11px] uppercase tracking-[0.16em] text-white/60">
                      Completion
                    </div>
                    <div className="mt-2 text-3xl font-semibold">{completion}%</div>
                  </div>

                  <div className="grid h-14 w-14 place-items-center rounded-2xl bg-white/10 text-sm font-semibold">
                    {initials(showroomSummary?.name || displayName)}
                  </div>
                </div>

                <div className="mt-4 h-2.5 overflow-hidden rounded-full bg-white/10">
                  <div
                    className="h-full rounded-full bg-white"
                    style={{ width: `${completion}%` }}
                  />
                </div>
              </div>

              <div className="mt-4 space-y-3">
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
                  <div className="text-[11px] uppercase tracking-[0.14em] text-slate-400">
                    Showroom
                  </div>
                  <div className="mt-1 text-sm font-semibold text-slate-900">
                    {loadingShowroomSummary
                      ? "Loading..."
                      : showroomSummary?.name || "Not added"}
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
                  <div className="text-[11px] uppercase tracking-[0.14em] text-slate-400">
                    Address
                  </div>
                  <div className="mt-1 text-sm font-semibold text-slate-900">
                    {loadingShowroomSummary
                      ? "Loading..."
                      : showroomSummary?.address || "Not added"}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
                    <div className="text-[11px] uppercase tracking-[0.14em] text-slate-400">
                      Phone
                    </div>
                    <div className="mt-1 text-sm font-semibold text-slate-900">
                      {showroomSummary?.phone || "Not added"}
                    </div>
                  </div>

                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
                    <div className="text-[11px] uppercase tracking-[0.14em] text-slate-400">
                      Email
                    </div>
                    <div className="mt-1 truncate text-sm font-semibold text-slate-900">
                      {showroomSummary?.email || email || "Not added"}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-[28px] border border-slate-200 bg-white p-4 shadow-sm">
              <div className="text-[11px] uppercase tracking-[0.16em] text-blue-500">
                Status mix
              </div>
              <h2 className="mt-1 text-lg font-semibold text-slate-900">
                Vehicle health
              </h2>

              <div className="mt-4 space-y-4">
                {[
                  {
                    label: "Available",
                    value: vehicleStats.available,
                    color: "bg-emerald-500",
                  },
                  {
                    label: "In service",
                    value: vehicleStats.in_service,
                    color: "bg-blue-500",
                  },
                  {
                    label: "Booked",
                    value: vehicleStats.booked,
                    color: "bg-amber-500",
                  },
                  {
                    label: "Maintenance",
                    value: vehicleStats.maintenance,
                    color: "bg-rose-500",
                  },
                ].map((item) => {
                  const percent =
                    vehicleStats.total > 0
                      ? Math.round((item.value / vehicleStats.total) * 100)
                      : 0;

                  return (
                    <div key={item.label}>
                      <div className="mb-2 flex items-center justify-between text-sm">
                        <span className="font-medium text-slate-700">{item.label}</span>
                        <span className="text-slate-500">
                          {item.value} ({percent}%)
                        </span>
                      </div>
                      <div className="h-2.5 overflow-hidden rounded-full bg-slate-100">
                        <div
                          className={`h-full rounded-full ${item.color}`}
                          style={{ width: `${percent}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="mt-5 flex flex-col gap-2">
                <button
                  onClick={() => nav("/owner/vehicles")}
                  className="rounded-2xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
                >
                  Manage vehicles
                </button>
                <button
                  onClick={() => nav("/owner/showroom")}
                  className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
                >
                  Visit showroom page
                </button>
              </div>
            </div>
          </div>
        </section>
      </div>

      {profileOpen && (
        <div className="fixed inset-0 z-50">
          <div
            className="absolute inset-0 bg-slate-950/55 backdrop-blur-sm"
            onClick={() => !savingProfile && setProfileOpen(false)}
          />
          <div className="absolute inset-0 flex items-center justify-center p-4">
            <div className="w-full max-w-3xl overflow-hidden rounded-[30px] border border-slate-200 bg-white shadow-2xl">
              <div className="border-b border-slate-200 bg-slate-900 px-6 py-5 text-white">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h3 className="text-lg font-semibold">Update Showroom Profile</h3>
                    <p className="mt-1 text-sm text-slate-300">
                      Compact modal with location, map, logo, and permit upload.
                    </p>
                  </div>

                  <button
                    className="grid h-10 w-10 place-items-center rounded-full border border-white/15 bg-white/10 text-white transition hover:bg-white/15"
                    onClick={() => !savingProfile && setProfileOpen(false)}
                    aria-label="close"
                  >
                    ✕
                  </button>
                </div>
              </div>

              <div className="max-h-[75vh] overflow-y-auto p-6">
                {loadingProfile && (
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
                    Loading profile…
                  </div>
                )}

                {profileErr && (
                  <div className="mb-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                    {profileErr}
                  </div>
                )}

                {profileOk && (
                  <div className="mb-4 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                    {profileOk}
                  </div>
                )}

                <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                  <div>
                    <label className="block text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                      Showroom name
                    </label>
                    <input
                      value={showroomName}
                      onChange={(e) => setShowroomName(e.target.value)}
                      className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
                      placeholder="e.g. SmartCar Showroom"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                      Location
                    </label>
                    <input
                      ref={locationInputRef}
                      value={showroomAddress}
                      onChange={(e) => setShowroomAddress(e.target.value)}
                      className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
                      placeholder="Start typing showroom location..."
                    />
                  </div>
                </div>

                <div className="mt-5 overflow-hidden rounded-[24px] border border-slate-200">
                  <div ref={mapDivRef} className="h-[220px] w-full bg-slate-100" />
                </div>

                <div className="mt-5 grid grid-cols-1 gap-5 sm:grid-cols-2">
                  <div>
                    <label className="block text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                      Owner logo
                    </label>
                    <div className="mt-2 rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-4">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => setLogoFile(e.target.files?.[0] || null)}
                        className="w-full text-sm text-slate-700"
                      />
                      {logoFile && (
                        <div className="mt-2 text-xs text-slate-500">
                          Selected: {logoFile.name}
                        </div>
                      )}
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                      Working permission PDF
                    </label>
                    <div className="mt-2 rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-4">
                      <input
                        type="file"
                        accept="application/pdf"
                        onChange={(e) => setPermitPdf(e.target.files?.[0] || null)}
                        className="w-full text-sm text-slate-700"
                      />
                      {permitPdf && (
                        <div className="mt-2 text-xs text-slate-500">
                          Selected: {permitPdf.name}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-xs text-slate-600">
                  {showroomLat && showroomLng ? (
                    <span>
                      📍 Selected point: {Number(showroomLat).toFixed(5)},{" "}
                      {Number(showroomLng).toFixed(5)}
                    </span>
                  ) : (
                    <span>📍 Choose a location to set the showroom marker.</span>
                  )}
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 border-t border-slate-200 bg-slate-50 px-6 py-4">
                <button
                  onClick={() => setProfileOpen(false)}
                  disabled={savingProfile}
                  className="rounded-2xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 disabled:opacity-60"
                >
                  Cancel
                </button>
                <button
                  onClick={saveProfile}
                  disabled={savingProfile}
                  className="rounded-2xl bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:opacity-60"
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