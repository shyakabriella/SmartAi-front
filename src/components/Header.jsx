// src/components/HeaderMenu.jsx
import { useEffect, useMemo, useRef, useState } from "react";
import { NavLink, useLocation } from "react-router-dom";

const MENU = [
  { label: "Home", to: "/" },
  { label: "Vehicles", to: "/vehicles" },
  { label: "Drivers", to: "/drivers" },
  { label: "Deals", to: "/deals" },
  { label: "Reviews", to: "/reviews" },
];

export default function HeaderMenu() {
  const { pathname } = useLocation();
  const containerRef = useRef(null);
  const itemRefs = useRef([]);
  const [hoverIdx, setHoverIdx] = useState(-1);
  const [open, setOpen] = useState(false);
  const [pill, setPill] = useState({ left: 0, width: 0, opacity: 0 });

  const activeIdx = useMemo(() => {
    const i = MENU.findIndex(
      (m) => pathname === m.to || (m.to !== "/" && pathname.startsWith(m.to))
    );
    return i >= 0 ? i : 0;
  }, [pathname]);

  // move pill on hover/active
  useEffect(() => {
    const idx = hoverIdx >= 0 ? hoverIdx : activeIdx;
    const el = itemRefs.current[idx];
    const bar = containerRef.current;
    if (!el || !bar) {
      setPill((p) => ({ ...p, opacity: 0 }));
      return;
    }
    const rItem = el.getBoundingClientRect();
    const rBar = bar.getBoundingClientRect();
    setPill({
      left: rItem.left - rBar.left,
      width: rItem.width,
      opacity: 1,
    });
  }, [hoverIdx, activeIdx, pathname]);

  // recalc on resize
  useEffect(() => {
    const onResize = () => setHoverIdx((h) => h); // trigger effect
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  return (
    <header className="sticky top-0 z-50 border-b border-slate-200 bg-white/80 backdrop-blur">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="flex h-16 items-center justify-between gap-6">
          {/* Left: brand (SmartCar AI logo) */}
          <NavLink to="/" className="flex items-center gap-2">
            {/* simple car badge icon */}
            <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-500/10">
              <span className="block h-4 w-6 rounded-full border-[1.5px] border-emerald-500" />
            </span>
            <span className="text-lg font-semibold text-slate-900">
              SmartCar <span className="text-emerald-600">AI</span>
            </span>
          </NavLink>

          {/* Center: main menu with animated pill (desktop) */}
          <nav className="relative hidden flex-1 justify-center md:flex">
            <div
              ref={containerRef}
              className="relative inline-flex items-center gap-2"
              onMouseLeave={() => setHoverIdx(-1)}
            >
              {/* animated pill */}
              <span
                className="pointer-events-none absolute top-1/2 -z-10 h-9 -translate-y-1/2 rounded-xl bg-emerald-500/8 ring-1 ring-emerald-500/30 transition-all duration-300 ease-out"
                style={{
                  transform: `translateX(${pill.left}px) translateY(-50%)`,
                  width: `${pill.width}px`,
                  opacity: pill.opacity,
                }}
              />
              {MENU.map((m, i) => (
                <NavLink
                  key={m.to}
                  to={m.to}
                  ref={(el) => (itemRefs.current[i] = el)}
                  onMouseEnter={() => setHoverIdx(i)}
                  className={({ isActive }) =>
                    [
                      "relative z-10 flex h-9 items-center rounded-xl px-3 transition-colors",
                      isActive
                        ? "text-slate-900 font-medium"
                        : "text-slate-600 hover:text-slate-900",
                    ].join(" ")
                  }
                >
                  <span className="text-sm">{m.label}</span>
                </NavLink>
              ))}
            </div>
          </nav>

          {/* Right: actions + mobile trigger */}
          <div className="flex items-center gap-3">
            {/* desktop actions */}
            <div className="hidden items-center gap-3 md:flex">
              <NavLink
                to="/login"
                className="inline-flex items-center rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                Login
              </NavLink>

              {/* List your car (Owner / Host entry) */}
              <NavLink
                to="/host/register"
                className="inline-flex items-center rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-sm shadow-emerald-500/30 hover:bg-emerald-700"
              >
                List your car here
              </NavLink>
            </div>

            {/* mobile menu button */}
            <button
              className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-slate-300 md:hidden"
              aria-label="Menu"
              onClick={() => setOpen((v) => !v)}
            >
              <div className="w-5">
                <span
                  className={`block h-[2px] bg-slate-800 transition-all ${
                    open ? "translate-y-[6px] rotate-45" : ""
                  }`}
                />
                <span
                  className={`my-[6px] block h-[2px] bg-slate-800 transition-opacity ${
                    open ? "opacity-0" : ""
                  }`}
                />
                <span
                  className={`block h-[2px] bg-slate-800 transition-all ${
                    open ? "-translate-y-[6px] -rotate-45" : ""
                  }`}
                />
              </div>
            </button>
          </div>
        </div>
      </div>

      {/* Mobile drawer */}
      <div
        className={`overflow-hidden transition-[max-height] duration-300 md:hidden ${
          open ? "max-h-96" : "max-h-0"
        }`}
      >
        <nav className="px-4 pb-4">
          <ul className="grid gap-1">
            {MENU.map((m) => (
              <li key={m.to}>
                <NavLink
                  to={m.to}
                  onClick={() => setOpen(false)}
                  className={({ isActive }) =>
                    [
                      "block rounded-lg px-3 py-2 text-sm",
                      isActive
                        ? "bg-slate-900/5 text-slate-900 font-medium"
                        : "text-slate-700 hover:bg-slate-900/5",
                    ].join(" ")
                  }
                >
                  {m.label}
                </NavLink>
              </li>
            ))}

            {/* Mobile actions */}
            <li className="mt-2 flex flex-col gap-2">
              <NavLink
                to="/login"
                onClick={() => setOpen(false)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-center text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                Login
              </NavLink>
              <NavLink
                to="/host/register"
                onClick={() => setOpen(false)}
                className="w-full rounded-lg bg-emerald-600 px-3 py-2 text-center text-sm font-semibold text-white shadow-sm shadow-emerald-500/30 hover:bg-emerald-700"
              >
                List your car here
              </NavLink>
            </li>
          </ul>
        </nav>
      </div>
    </header>
  );
}
