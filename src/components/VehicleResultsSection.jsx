// src/components/VehicleResultsSection.jsx
import { useEffect, useMemo, useState } from "react";
import { fetchVehicles } from "./demoBookingData";

import VehicleFiltersPanel from "./VehicleFiltersPanel";
import VehicleGrid from "./VehicleGrid";
import VehicleDetailModal from "./VehicleDetailModal";
import DriverMatchingModal from "./DriverMatchingModal";
import BookingDetailsModal from "./BookingDetailsModal";

function buildBooleanMap(values = []) {
  const map = {};
  values.forEach((v) => {
    if (!v) return;
    map[v] = true;
  });
  return map;
}

export default function VehicleResultsSection() {
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(true);

  const [filters, setFilters] = useState({
    maxPrice: 200000,
    types: {},
    makes: {},
    transmissions: {},
    fuels: {},
    minSeats: 2,
    minYear: 0,
    maxOdometerKm: 0, // 0 = unlimited
    withDriverOnly: false,
    search: "",
  });

  // W3
  const [selectedVehicle, setSelectedVehicle] = useState(null);
  const [detailTab, setDetailTab] = useState("overview");
  const [detailImageIdx, setDetailImageIdx] = useState(0);

  // W4
  const [driverMatchingVehicle, setDriverMatchingVehicle] = useState(null);

  // W5
  const [bookingData, setBookingData] = useState(null);

  /* ✅ Load vehicles from API */
  useEffect(() => {
    let cancelled = false;

    (async () => {
      setLoading(true);

      const list = await fetchVehicles({ usePublicFeed: true });

      if (cancelled) return;

      setVehicles(list || []);

      // ✅ compute defaults from real data
      const maxPriceInData =
        list?.length > 0
          ? Math.max(...list.map((v) => Number(v?.pricePerDay || 0)))
          : 200000;

      const years = (list || []).map((v) => Number(v?.year || 0)).filter(Boolean);
      const yearMin = years.length ? Math.min(...years) : 0;

      const uniqueTypes = Array.from(new Set((list || []).map((v) => v?.type).filter(Boolean)));
      const uniqueMakes = Array.from(new Set((list || []).map((v) => v?.make).filter(Boolean)));
      const uniqueTransmissions = Array.from(new Set((list || []).map((v) => String(v?.transmission || "").toLowerCase()).filter(Boolean)));
      const uniqueFuels = Array.from(new Set((list || []).map((v) => String(v?.fuel || "").toLowerCase()).filter(Boolean)));

      setFilters((prev) => ({
        ...prev,
        maxPrice: maxPriceInData || prev.maxPrice || 200000,
        minYear: yearMin || 0,
        types: Object.keys(prev.types || {}).length ? prev.types : buildBooleanMap(uniqueTypes),
        makes: Object.keys(prev.makes || {}).length ? prev.makes : buildBooleanMap(uniqueMakes),
        transmissions: Object.keys(prev.transmissions || {}).length ? prev.transmissions : buildBooleanMap(uniqueTransmissions),
        fuels: Object.keys(prev.fuels || {}).length ? prev.fuels : buildBooleanMap(uniqueFuels),
      }));

      setLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const maxPriceInData = useMemo(() => {
    if (!vehicles.length) return 200000;
    return Math.max(...vehicles.map((v) => Number(v?.pricePerDay || 0)));
  }, [vehicles]);

  const filteredVehicles = useMemo(() => {
    const q = String(filters.search || "").trim().toLowerCase();

    return (vehicles || []).filter((v) => {
      const price = Number(v?.pricePerDay || 0);
      const type = v?.type || "Car";
      const seats = Number(v?.seats || 0);

      const make = String(v?.make || "").trim();
      const transmission = String(v?.transmission || "").toLowerCase();
      const fuel = String(v?.fuel || "").toLowerCase();

      const year = Number(v?.year || 0);
      const odometer = Number(v?.odometerKm || 0);

      // ✅ Daily price
      if (price > Number(filters.maxPrice || 0)) return false;

      // ✅ Type map
      if (filters.types && Object.keys(filters.types).length > 0) {
        if (filters.types[type] === false) return false;
      }

      // ✅ Make map
      if (filters.makes && Object.keys(filters.makes).length > 0) {
        if (filters.makes[make] === false) return false;
      }

      // ✅ Transmission map
      if (filters.transmissions && Object.keys(filters.transmissions).length > 0) {
        if (filters.transmissions[transmission] === false) return false;
      }

      // ✅ Fuel map
      if (filters.fuels && Object.keys(filters.fuels).length > 0) {
        if (filters.fuels[fuel] === false) return false;
      }

      // ✅ Seats
      if (seats < Number(filters.minSeats || 0)) return false;

      // ✅ Year min
      if (Number(filters.minYear || 0) > 0 && year < Number(filters.minYear || 0)) return false;

      // ✅ Odometer max (0 means no limit)
      if (Number(filters.maxOdometerKm || 0) > 0 && odometer > Number(filters.maxOdometerKm || 0))
        return false;

      // ✅ With driver
      if (filters.withDriverOnly && !v?.withDriver) return false;

      // ✅ Search by plate/make/model/type
      if (q) {
        const hay = [
          v?.plateNo,
          v?.make,
          v?.model,
          v?.name,
          v?.type,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();

        if (!hay.includes(q)) return false;
      }

      return true;
    });
  }, [vehicles, filters]);

  function resetFilters() {
    const maxP = maxPriceInData || 200000;

    const years = (vehicles || []).map((v) => Number(v?.year || 0)).filter(Boolean);
    const yearMin = years.length ? Math.min(...years) : 0;

    const uniqueTypes = Array.from(new Set((vehicles || []).map((v) => v?.type).filter(Boolean)));
    const uniqueMakes = Array.from(new Set((vehicles || []).map((v) => v?.make).filter(Boolean)));
    const uniqueTransmissions = Array.from(new Set((vehicles || []).map((v) => String(v?.transmission || "").toLowerCase()).filter(Boolean)));
    const uniqueFuels = Array.from(new Set((vehicles || []).map((v) => String(v?.fuel || "").toLowerCase()).filter(Boolean)));

    setFilters({
      maxPrice: maxP,
      minSeats: 2,
      minYear: yearMin || 0,
      maxOdometerKm: 0,
      withDriverOnly: false,
      search: "",
      types: buildBooleanMap(uniqueTypes),
      makes: buildBooleanMap(uniqueMakes),
      transmissions: buildBooleanMap(uniqueTransmissions),
      fuels: buildBooleanMap(uniqueFuels),
    });
  }

  function openVehicle(v) {
    setSelectedVehicle(v);
    setDetailTab("overview");
    setDetailImageIdx(0);
  }

  function closeVehicle() {
    setSelectedVehicle(null);
  }

  function handleSelectCar(vehicle) {
    setSelectedVehicle(null);
    setDriverMatchingVehicle(vehicle);
  }

  function handleDriverComplete(vehicle, driver, trip) {
    setDriverMatchingVehicle(null);
    setBookingData({ vehicle, driver, trip });
  }

  return (
    <section className="bg-slate-100 py-10 sm:py-12">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid gap-6 lg:grid-cols-[260px,minmax(0,1fr)]">
          {/* ✅ LEFT: Filters */}
          <VehicleFiltersPanel
            vehicles={vehicles}
            filters={filters}
            maxPriceInData={maxPriceInData}
            onReset={resetFilters}
            onChangePrice={(maxPrice) =>
              setFilters((prev) => ({ ...prev, maxPrice }))
            }
            onToggleType={(type) =>
              setFilters((prev) => ({
                ...prev,
                types: { ...prev.types, [type]: !prev.types[type] },
              }))
            }
            onToggleMake={(make) =>
              setFilters((prev) => ({
                ...prev,
                makes: { ...prev.makes, [make]: !prev.makes[make] },
              }))
            }
            onToggleTransmission={(t) =>
              setFilters((prev) => ({
                ...prev,
                transmissions: {
                  ...prev.transmissions,
                  [t]: !prev.transmissions[t],
                },
              }))
            }
            onToggleFuel={(f) =>
              setFilters((prev) => ({
                ...prev,
                fuels: { ...prev.fuels, [f]: !prev.fuels[f] },
              }))
            }
            onChangeSeats={(minSeats) =>
              setFilters((prev) => ({ ...prev, minSeats }))
            }
            onChangeMinYear={(minYear) =>
              setFilters((prev) => ({ ...prev, minYear }))
            }
            onChangeMaxOdometerKm={(maxOdometerKm) =>
              setFilters((prev) => ({ ...prev, maxOdometerKm }))
            }
            onToggleWithDriver={() =>
              setFilters((prev) => ({
                ...prev,
                withDriverOnly: !prev.withDriverOnly,
              }))
            }
            onChangeSearch={(search) =>
              setFilters((prev) => ({ ...prev, search }))
            }
          />

          {/* ✅ RIGHT: Results grid */}
          <div className="space-y-3">
            {loading ? (
              <div className="rounded-2xl border border-dashed border-slate-300 bg-white/60 py-10 text-center text-sm text-slate-500">
                Loading vehicles...
              </div>
            ) : (
              <VehicleGrid
                vehicles={filteredVehicles}
                allCount={vehicles.length}
                onOpenVehicle={openVehicle}
              />
            )}
          </div>
        </div>
      </div>

      {/* W3 – Vehicle details */}
      {selectedVehicle && (
        <VehicleDetailModal
          vehicle={selectedVehicle}
          onClose={closeVehicle}
          onSelectCar={handleSelectCar}
          tab={detailTab}
          setTab={setDetailTab}
          imageIdx={detailImageIdx}
          setImageIdx={setDetailImageIdx}
        />
      )}

      {/* W4 – AI driver matching */}
      {driverMatchingVehicle && !bookingData && (
        <DriverMatchingModal
          vehicle={driverMatchingVehicle}
          onClose={() => setDriverMatchingVehicle(null)}
          onComplete={handleDriverComplete}
        />
      )}

      {/* W5 – Booking details */}
      {bookingData && (
        <BookingDetailsModal
          booking={bookingData}
          onClose={() => setBookingData(null)}
        />
      )}
    </section>
  );
}
