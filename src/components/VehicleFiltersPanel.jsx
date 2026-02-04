// src/components/VehicleFiltersPanel.jsx

function getTypeName(v) {
  if (!v) return "";

  if (typeof v.type === "string" && v.type.trim()) return v.type.trim();

  if (v?.type?.name) return String(v.type.name).trim();
  if (v?.vehicle_type?.name) return String(v.vehicle_type.name).trim();
  if (v?.vehicleType?.name) return String(v.vehicleType.name).trim();

  if (typeof v?.raw?.type === "string" && v.raw.type.trim())
    return v.raw.type.trim();

  if (v?.raw?.type?.name) return String(v.raw.type.name).trim();
  if (v?.raw?.vehicle_type?.name) return String(v.raw.vehicle_type.name).trim();

  return "";
}

function getTransmissionName(v) {
  return String(v?.transmission || v?.raw?.transmission || "")
    .trim()
    .toLowerCase();
}

function getFuelName(v) {
  return String(v?.fuel || v?.raw?.fuel_type || v?.raw?.fuel || "")
    .trim()
    .toLowerCase();
}

function getMakeName(v) {
  return String(v?.make || v?.raw?.make || "").trim();
}

/* ✅ price formatter (RWF) */
function formatRWF(n) {
  const num = Number(n || 0);
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency: "RWF",
    maximumFractionDigits: 0,
  }).format(num);
}

/* ✅ small toggle component */
function Toggle({ enabled, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
        enabled ? "bg-emerald-500" : "bg-slate-300"
      }`}
    >
      <span
        className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow-sm transition-transform ${
          enabled ? "translate-x-4" : "translate-x-1"
        }`}
      />
    </button>
  );
}

export default function VehicleFiltersPanel({
  vehicles = [],
  filters,
  maxPriceInData,
  onReset,
  onChangePrice,
  onToggleType,
  onChangeSeats,
  onToggleWithDriver,

  /* ✅ NEW */
  onToggleTransmission,
  onToggleFuel,
  onToggleMake,
  onChangeMinYear,
  onChangeMaxOdometerKm,
  onChangeSearch,
}) {
  const safeMax = Number(maxPriceInData || 0);
  const sliderMax = Math.max(safeMax, Number(filters?.maxPrice || 0), 300000);
  const currentMaxPrice = Math.min(Number(filters?.maxPrice || 0), sliderMax);

  const typesToShow = Array.from(
    new Set(
      (vehicles || [])
        .map(getTypeName)
        .map((t) => String(t || "").trim())
        .filter(Boolean)
    )
  ).sort((a, b) => a.localeCompare(b));

  const transmissionsToShow = Array.from(
    new Set((vehicles || []).map(getTransmissionName).filter(Boolean))
  ).sort((a, b) => a.localeCompare(b));

  const fuelsToShow = Array.from(
    new Set((vehicles || []).map(getFuelName).filter(Boolean))
  ).sort((a, b) => a.localeCompare(b));

  const makesToShow = Array.from(
    new Set((vehicles || []).map(getMakeName).filter(Boolean))
  ).sort((a, b) => a.localeCompare(b));

  const yearMinInData = vehicles.length
    ? Math.min(...vehicles.map((v) => Number(v?.year || 0)).filter(Boolean))
    : 0;

  const yearMaxInData = vehicles.length
    ? Math.max(...vehicles.map((v) => Number(v?.year || 0)).filter(Boolean))
    : 0;

  const odometerMaxInData = vehicles.length
    ? Math.max(...vehicles.map((v) => Number(v?.odometerKm || 0)))
    : 0;

  return (
    <aside className="rounded-2xl bg-white p-4 shadow-sm shadow-slate-900/5 border border-slate-200">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-slate-900">Filters</h3>
        <button
          type="button"
          onClick={onReset}
          className="text-xs font-medium text-emerald-600 hover:text-emerald-700"
        >
          Reset
        </button>
      </div>

      {/* ✅ Search (plate / make / model) */}
      <div className="mb-5">
        <p className="text-xs font-semibold text-slate-600">Search</p>
        <input
          type="text"
          value={filters?.search || ""}
          onChange={(e) => onChangeSearch?.(e.target.value)}
          placeholder="Search plate, make, model..."
          className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2 text-xs text-slate-900 shadow-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500/50"
        />
      </div>

      {/* ✅ Price range */}
      <div className="mb-5">
        <p className="text-xs font-semibold text-slate-600">Price Per Day</p>

        <div className="mt-2 flex items-center justify-between text-[11px] text-slate-500">
          <span>{formatRWF(0)}</span>
          <span>Up to {formatRWF(currentMaxPrice)}</span>
        </div>

        <input
          type="range"
          min={0}
          max={sliderMax}
          step={1000}
          value={currentMaxPrice}
          onChange={(e) => onChangePrice?.(Number(e.target.value))}
          className="mt-1 w-full accent-emerald-600"
        />

        <p className="mt-1 text-[11px] text-slate-400">
          Max: <span className="text-slate-500">{formatRWF(sliderMax)}</span>
        </p>
      </div>

      {/* ✅ Car Type */}
      <div className="mb-5 space-y-2">
        <p className="text-xs font-semibold text-slate-600">Car Type</p>

        {typesToShow.length === 0 ? (
          <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 px-3 py-3 text-xs text-slate-500">
            No car types found from saved vehicles.
          </div>
        ) : (
          typesToShow.map((type) => {
            const enabled = Boolean(filters?.types?.[type]);
            return (
              <label
                key={type}
                className="flex items-center justify-between rounded-lg px-2 py-1 hover:bg-slate-50 text-xs"
              >
                <span className="text-slate-600">{type}</span>
                <Toggle enabled={enabled} onClick={() => onToggleType?.(type)} />
              </label>
            );
          })
        )}
      </div>

      {/* ✅ Make */}
      <div className="mb-5 space-y-2">
        <p className="text-xs font-semibold text-slate-600">Make</p>

        {makesToShow.length === 0 ? (
          <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 px-3 py-3 text-xs text-slate-500">
            No vehicle make found.
          </div>
        ) : (
          makesToShow.map((make) => {
            const enabled = Boolean(filters?.makes?.[make]);
            return (
              <label
                key={make}
                className="flex items-center justify-between rounded-lg px-2 py-1 hover:bg-slate-50 text-xs"
              >
                <span className="text-slate-600">{make}</span>
                <Toggle enabled={enabled} onClick={() => onToggleMake?.(make)} />
              </label>
            );
          })
        )}
      </div>

      {/* ✅ Transmission */}
      <div className="mb-5 space-y-2">
        <p className="text-xs font-semibold text-slate-600">Transmission</p>

        {transmissionsToShow.length === 0 ? (
          <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 px-3 py-3 text-xs text-slate-500">
            No transmission data found.
          </div>
        ) : (
          transmissionsToShow.map((t) => {
            const enabled = Boolean(filters?.transmissions?.[t]);
            return (
              <label
                key={t}
                className="flex items-center justify-between rounded-lg px-2 py-1 hover:bg-slate-50 text-xs"
              >
                <span className="text-slate-600 capitalize">{t}</span>
                <Toggle
                  enabled={enabled}
                  onClick={() => onToggleTransmission?.(t)}
                />
              </label>
            );
          })
        )}
      </div>

      {/* ✅ Fuel */}
      <div className="mb-5 space-y-2">
        <p className="text-xs font-semibold text-slate-600">Fuel Type</p>

        {fuelsToShow.length === 0 ? (
          <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 px-3 py-3 text-xs text-slate-500">
            No fuel type data found.
          </div>
        ) : (
          fuelsToShow.map((f) => {
            const enabled = Boolean(filters?.fuels?.[f]);
            return (
              <label
                key={f}
                className="flex items-center justify-between rounded-lg px-2 py-1 hover:bg-slate-50 text-xs"
              >
                <span className="text-slate-600 capitalize">{f}</span>
                <Toggle enabled={enabled} onClick={() => onToggleFuel?.(f)} />
              </label>
            );
          })
        )}
      </div>

      {/* ✅ Seats */}
      <div className="mb-5">
        <p className="text-xs font-semibold text-slate-600">Seats (min)</p>
        <div className="mt-2 flex items-center gap-2">
          <input
            type="number"
            min={1}
            max={50}
            value={Number(filters?.minSeats || 1)}
            onChange={(e) => onChangeSeats?.(Number(e.target.value) || 1)}
            className="w-16 rounded-lg border border-slate-200 px-2 py-1 text-xs text-slate-900 shadow-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500/50"
          />
          <span className="text-[11px] text-slate-500">passengers or more</span>
        </div>
      </div>

      {/* ✅ Year (min) */}
      <div className="mb-5">
        <p className="text-xs font-semibold text-slate-600">Year (min)</p>
        <div className="mt-2 flex items-center justify-between text-[11px] text-slate-500">
          <span>{yearMinInData || 0}</span>
          <span>{filters?.minYear || yearMinInData || 0}</span>
          <span>{yearMaxInData || 0}</span>
        </div>

        <input
          type="range"
          min={yearMinInData || 0}
          max={yearMaxInData || 0}
          step={1}
          value={Number(filters?.minYear || yearMinInData || 0)}
          onChange={(e) => onChangeMinYear?.(Number(e.target.value))}
          className="mt-1 w-full accent-emerald-600"
        />
      </div>

      {/* ✅ Odometer (max) */}
      <div className="mb-5">
        <p className="text-xs font-semibold text-slate-600">Odometer (max KM)</p>

        <div className="mt-2 flex items-center gap-2">
          <input
            type="number"
            min={0}
            max={odometerMaxInData || 9999999}
            value={Number(filters?.maxOdometerKm || 0)}
            onChange={(e) =>
              onChangeMaxOdometerKm?.(Number(e.target.value) || 0)
            }
            className="w-24 rounded-lg border border-slate-200 px-2 py-1 text-xs text-slate-900 shadow-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500/50"
          />
          <span className="text-[11px] text-slate-500">
            e.g. 200000 (0 = no limit)
          </span>
        </div>
      </div>

      {/* ✅ With driver toggle */}
      <div className="border-t border-slate-100 pt-4 mt-2">
        <label className="flex items-center justify-between text-xs">
          <span className="font-semibold text-slate-600">With driver only</span>

          <Toggle
            enabled={Boolean(filters?.withDriverOnly)}
            onClick={() => onToggleWithDriver?.()}
          />
        </label>

        <p className="mt-1 text-[11px] text-slate-500">
          When enabled, only cars that include a driver are shown.
        </p>
      </div>
    </aside>
  );
}
