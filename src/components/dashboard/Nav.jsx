export default function Nav({
  collapsed,
  onToggleSidebar,
  rightOpen,
  onToggleRight,
}) {
  return (
    <header className="h-16 sticky top-0 z-40 bg-white/80 backdrop-blur border-b border-slate-200">
      <div className="h-full px-3 sm:px-6 flex items-center gap-3">
        {/* Left: toggles */}
        <div className="flex items-center gap-2">
          <button
            className="md:hidden inline-flex items-center justify-center h-10 w-10 rounded-lg border border-slate-200"
            onClick={onToggleSidebar}
            aria-label="Toggle sidebar"
          >
            ☰
          </button>
          <button
            className="hidden md:inline-flex items-center justify-center h-10 w-10 rounded-lg border border-slate-200"
            onClick={onToggleSidebar}
            aria-label="Collapse sidebar"
            title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {collapsed ? "»" : "«"}
          </button>
        </div>

        {/* Center: search (grow) */}
        <div className="flex-1 min-w-0">
          <div className="relative">
            <input
              placeholder="Search bookings, vehicles, drivers…"
              className="w-full h-10 pl-10 pr-3 rounded-lg border border-slate-200 bg-white focus:ring-2 focus:ring-cyan-400 outline-none"
            />
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">🔎</span>
          </div>
        </div>

        {/* Right: actions */}
        <div className="flex items-center gap-2">
          <button
            className="hidden xl:inline-flex items-center justify-center h-10 w-10 rounded-lg border border-slate-200"
            onClick={onToggleRight}
            aria-label="Toggle right panel"
            title={rightOpen ? "Hide panel" : "Show panel"}
          >
            {rightOpen ? "→" : "←"}
          </button>

          <button className="inline-flex items-center h-10 px-3 rounded-lg border border-slate-200 hover:bg-slate-50">
            ⚙️
          </button>
          <div className="h-9 w-9 rounded-full bg-gradient-to-br from-cyan-400 to-blue-600" title="Admin" />
        </div>
      </div>
    </header>
  );
}
