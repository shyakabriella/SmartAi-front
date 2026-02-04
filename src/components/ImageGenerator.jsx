// src/components/ImageOnlyWelcome.jsx
import { useEffect, useMemo, useRef, useState } from "react";
import { api } from "../lib/api";

const HERO_IMAGE = "/wellcom.jpg";

export default function ImageOnlyWelcome({
  title = "SmartCar AI",
  subtitle = "Smart, personalized car rentals",
}) {
  // ✅ always with driver (no button)
  const [withDriver] = useState(true);

  // ✅ keep radius but no label/words
  const [radius, setRadius] = useState(10);

  // pickup
  const [pickupText, setPickupText] = useState("");
  const [pickupCoords, setPickupCoords] = useState(null); // {lat,lng}
  const [gpsCoords, setGpsCoords] = useState(null); // {lat,lng}

  // results
  const [cars, setCars] = useState([]);
  const [drivers, setDrivers] = useState([]);

  // ui
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [source, setSource] = useState("nearby"); // nearby | pickup | fallback

  const inputRef = useRef(null);
  const autoRef = useRef(null);

  // ✅ debounce timer for auto-filter
  const debounceRef = useRef(null);

  // ✅ Normalize API response to always return an array
  // Works for:
  // - [ ... ]
  // - { data: [ ... ] }
  // - { success: true, data: [ ... ] }
  // - { data: { data: [ ... ] } } (pagination)
  const toList = (res) => {
    const payload = res?.data ?? res;

    if (Array.isArray(payload)) return payload;

    // most common
    if (Array.isArray(payload?.data)) return payload.data;

    // pagination style: { data: { data: [...] } }
    if (Array.isArray(payload?.data?.data)) return payload.data.data;

    // sometimes named keys
    if (Array.isArray(payload?.cars)) return payload.cars;
    if (Array.isArray(payload?.drivers)) return payload.drivers;

    return [];
  };

  // ✅ Load Google Maps JS (Places)
  useEffect(() => {
    const key = import.meta.env.VITE_GOOGLE_MAPS_KEY;
    if (!key) return;
    if (window.google?.maps?.places) return;

    const scriptId = "google-maps-places";
    if (document.getElementById(scriptId)) return;

    const s = document.createElement("script");
    s.id = scriptId;
    s.async = true;
    s.defer = true;
    s.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(
      key
    )}&libraries=places`;
    document.head.appendChild(s);
  }, []);

  // ✅ Init Autocomplete
  useEffect(() => {
    const key = import.meta.env.VITE_GOOGLE_MAPS_KEY;
    if (!key) return;
    if (!inputRef.current) return;

    let timer = null;

    const init = () => {
      if (!window.google?.maps?.places) return false;

      if (!autoRef.current) {
        autoRef.current = new window.google.maps.places.Autocomplete(
          inputRef.current,
          {
            fields: ["formatted_address", "geometry", "name"],
            componentRestrictions: { country: ["rw"] },
          }
        );

        autoRef.current.addListener("place_changed", () => {
          const place = autoRef.current.getPlace();
          const name =
            place?.formatted_address || place?.name || inputRef.current.value;

          setPickupText(name || "");

          const lat = place?.geometry?.location?.lat?.();
          const lng = place?.geometry?.location?.lng?.();

          if (lat != null && lng != null) {
            setPickupCoords({ lat: Number(lat), lng: Number(lng) });
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
  }, []);

  // ✅ GPS by default
  useEffect(() => {
    let cancelled = false;

    if (!navigator.geolocation) return;

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        if (cancelled) return;
        setGpsCoords({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
        });
      },
      () => {
        // not fatal
      },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 0 }
    );

    return () => {
      cancelled = true;
    };
  }, []);

  // ✅ pickup > gps
  const activeCoords = useMemo(() => {
    if (pickupCoords) return { coords: pickupCoords, kind: "pickup" };
    if (gpsCoords) return { coords: gpsCoords, kind: "nearby" };
    return null;
  }, [pickupCoords, gpsCoords]);

  const carLabel = (c) => {
    const makeModel =
      (c?.make ? String(c.make) : "") + (c?.model ? ` ${String(c.model)}` : "");
    if (makeModel.trim()) return makeModel.trim();
    if (c?.name) return c.name;
    if (c?.plate_no) return `Car (${c.plate_no})`;
    return "Car";
  };

  const driverLabel = (d) => {
    return d?.user?.name || d?.name || d?.full_name || d?.user_name || "Driver";
  };

  // ✅ If user clears pickup -> go back to GPS
  useEffect(() => {
    if (!pickupText.trim()) {
      setPickupCoords(null);
    }
  }, [pickupText]);

  // ✅ AUTO FILTER load (debounced)
  useEffect(() => {
    let cancelled = false;

    if (!activeCoords) return;

    if (debounceRef.current) clearTimeout(debounceRef.current);

    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      setErr("");

      try {
        const r = Math.max(1, Number(radius) || 10);
        setSource(activeCoords.kind);

        // cars nearby
        const carsRes = await api(
          `/public/nearby/cars?lat=${activeCoords.coords.lat}&lng=${activeCoords.coords.lng}&radius=${r}`
        );
        let carsList = toList(carsRes);

        // drivers nearby
        let driversList = [];
        if (withDriver) {
          const driversRes = await api(
            `/public/nearby/drivers?lat=${activeCoords.coords.lat}&lng=${activeCoords.coords.lng}&radius=${r}`
          );
          driversList = toList(driversRes);
        }

        const nothing =
          carsList.length === 0 && (!withDriver || driversList.length === 0);

        if (!cancelled) {
          if (nothing) {
            setSource("fallback");

            // fallback cars
            let fallbackCars = [];
            try {
              const res = await api(
                `/public/vehicles?per_page=24&status=available&sort=created_at&dir=desc`
              );
              fallbackCars = toList(res);
            } catch {
              fallbackCars = [];
            }

            // fallback drivers: retry same coords (you can change this to a global drivers list if you want)
            let fallbackDrivers = [];
            if (withDriver) {
              try {
                const res = await api(
                  `/public/nearby/drivers?lat=${activeCoords.coords.lat}&lng=${activeCoords.coords.lng}&radius=${r}`
                );
                fallbackDrivers = toList(res);
              } catch {
                fallbackDrivers = [];
              }
            }

            setCars(fallbackCars);
            setDrivers(withDriver ? fallbackDrivers : []);
          } else {
            setCars(carsList);
            setDrivers(withDriver ? driversList : []);
          }
        }
      } catch (e) {
        if (!cancelled) {
          setErr(e?.message || "Failed to load cars/drivers.");
          setCars([]);
          setDrivers([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }, 500); // ✅ debounce delay

    return () => {
      cancelled = true;
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [activeCoords, radius, withDriver, pickupText]);

  return (
    <section className="bg-slate-50" aria-labelledby="smartcar-hero-title">
      <h1 id="smartcar-hero-title" className="sr-only">
        {title}
      </h1>
      <p className="sr-only">{subtitle}</p>

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pt-6 pb-10">
        <div className="relative w-full overflow-hidden rounded-3xl shadow-xl bg-slate-900 min-h-[660px]">
          <div
            className="absolute inset-0 bg-cover bg-center"
            style={{ backgroundImage: `url(${HERO_IMAGE})` }}
          />
          <div className="absolute inset-0 bg-gradient-to-r from-slate-900/70 via-slate-900/25 to-slate-900/0" />

          <div className="relative z-10 mx-auto max-w-5xl p-4 sm:p-8">
            <div className="rounded-3xl bg-white/95 shadow-2xl backdrop-blur p-6 sm:p-8">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="text-lg font-bold text-slate-900">
                    🚗 {title}
                  </div>
                  <div className="text-sm text-slate-600">{subtitle}</div>
                </div>

                <div className="text-right">
                  <div className="text-xs text-slate-500">Source</div>
                  <div className="text-sm font-semibold text-slate-800">
                    {source}
                  </div>
                </div>
              </div>

              {/* ✅ Minimal controls (no extra words) */}
              <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div className="sm:col-span-2">
                  <input
                    ref={inputRef}
                    value={pickupText}
                    onChange={(e) => setPickupText(e.target.value)}
                    placeholder="Pickup location..."
                    className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm"
                  />
                </div>

                <div>
                  <input
                    value={radius}
                    onChange={(e) => setRadius(e.target.value)}
                    type="number"
                    min="1"
                    max="100"
                    placeholder="Radius (KM)"
                    className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm"
                  />
                </div>
              </div>

              {/* Results */}
              <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2">
                {/* Cars */}
                <div className="rounded-2xl border border-slate-100 bg-white p-5">
                  <div className="flex items-center justify-between">
                    <div className="text-sm font-semibold text-slate-900">
                      🚙 Cars
                    </div>
                    <div className="text-xs text-slate-500">
                      {cars.length} found
                    </div>
                  </div>

                  <div className="mt-4">
                    {cars.length === 0 ? (
                      <div className="text-sm text-slate-500">
                        No cars available.
                      </div>
                    ) : (
                      <ul className="space-y-3">
                        {cars.slice(0, 8).map((c) => (
                          <li
                            key={c.id}
                            className="rounded-xl border border-slate-100 bg-white px-4 py-3"
                          >
                            <div className="text-sm font-semibold text-slate-800">
                              {carLabel(c)}
                            </div>
                            <div className="mt-1 text-xs text-slate-500">
                              {c.plate_no ? `Plate: ${c.plate_no}` : ""}
                              {c.base_daily_rate != null
                                ? ` • ${c.base_daily_rate} / day`
                                : ""}
                              {c.distance_km != null
                                ? ` • ${Number(c.distance_km).toFixed(1)} km`
                                : ""}
                            </div>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>

                  <button
                    type="button"
                    className="mt-5 w-full rounded-xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white hover:bg-slate-800"
                  >
                    Continue Booking
                  </button>
                </div>

                {/* Drivers */}
                <div className="rounded-2xl border border-slate-100 bg-white p-5">
                  <div className="flex items-center justify-between">
                    <div className="text-sm font-semibold text-slate-900">
                      👤 Drivers
                    </div>
                    <div className="text-xs text-slate-500">
                      {drivers.length} found
                    </div>
                  </div>

                  <div className="mt-4">
                    {drivers.length === 0 ? (
                      <div className="text-sm text-slate-500">
                        No drivers available.
                      </div>
                    ) : (
                      <ul className="space-y-3">
                        {drivers.slice(0, 8).map((d) => (
                          <li
                            key={d.id}
                            className="rounded-xl border border-slate-100 bg-white px-4 py-3"
                          >
                            <div className="text-sm font-semibold text-slate-800">
                              {driverLabel(d)}
                            </div>
                            <div className="mt-1 text-xs text-slate-500">
                              {d.distance_km != null
                                ? `${Number(d.distance_km).toFixed(1)} km away`
                                : "Nearby"}
                            </div>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>

                  <div className="mt-5 text-xs text-slate-500">
                    {pickupCoords
                      ? "Matched using pickup location."
                      : "Matched using your GPS (nearby)."}
                  </div>
                </div>
              </div>

              {err && (
                <div className="mt-6 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                  {err}
                </div>
              )}

              {loading && (
                <div className="mt-4 text-xs text-slate-500">Loading…</div>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
