export default function Right({ open }) {
  return (
    <aside
      className={[
        "hidden xl:flex flex-col border-l border-slate-200 bg-white/90 backdrop-blur",
        open ? "w-80" : "w-0",
        open ? "opacity-100" : "opacity-0",
        "transition-all duration-300 overflow-hidden"
      ].join(" ")}
      aria-hidden={!open}
    >
      <div className="h-16 flex items-center px-4 font-medium">
        Activity
      </div>

      <div className="px-4 pb-6 space-y-4 overflow-auto">
        {/* Quick stats */}
        <div className="grid grid-cols-2 gap-3">
          <Stat label="Bookings" value="1,284" />
          <Stat label="Revenue" value="$82k" />
          <Stat label="Vehicles" value="124" />
          <Stat label="Drivers" value="65" />
        </div>

        {/* Notifications */}
        <section>
          <h4 className="text-sm font-semibold text-slate-700 mb-2">Notifications</h4>
          <ul className="space-y-2 text-sm">
            <li className="p-3 rounded-lg border border-slate-200">
              New booking #SC-2025-0001
              <div className="text-slate-500 text-xs mt-1">2m ago</div>
            </li>
            <li className="p-3 rounded-lg border border-slate-200">
              Driver Jane K. completed trip
              <div className="text-slate-500 text-xs mt-1">18m ago</div>
            </li>
            <li className="p-3 rounded-lg border border-slate-200">
              2 vehicles due for maintenance
              <div className="text-slate-500 text-xs mt-1">1h ago</div>
            </li>
          </ul>
        </section>
      </div>
    </aside>
  );
}

function Stat({ label, value }) {
  return (
    <div className="p-3 rounded-xl border border-slate-200 bg-white">
      <div className="text-xs text-slate-500">{label}</div>
      <div className="text-lg font-semibold">{value}</div>
    </div>
  );
}
