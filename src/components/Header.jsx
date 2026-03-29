// src/components/HeaderMenu.jsx
import { useEffect, useMemo, useRef, useState } from "react";
import { NavLink, useLocation } from "react-router-dom";

/* -----------------------------
   Simple inline icons
-------------------------------- */
function HomeIcon({ className = "h-4 w-4" }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <path
        d="M3 10.5L12 3l9 7.5"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M5.5 9.5V20a1 1 0 0 0 1 1H10v-5h4v5h3.5a1 1 0 0 0 1-1V9.5"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function LoginIcon({ className = "h-4 w-4" }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <path
        d="M15 3h3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-3"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M10 17l5-5-5-5"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M15 12H4"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function CarIcon({ className = "h-4 w-4" }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <path
        d="M5 16l1.4-4.2A2 2 0 0 1 8.3 10h7.4a2 2 0 0 1 1.9 1.4L19 16"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M4 16h16"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      <path
        d="M6 16v2.2A1.8 1.8 0 0 0 7.8 20H8"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      <path
        d="M18 16v2.2A1.8 1.8 0 0 1 16.2 20H16"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      <circle cx="7.5" cy="16.5" r="1" fill="currentColor" />
      <circle cx="16.5" cy="16.5" r="1" fill="currentColor" />
    </svg>
  );
}

function SparkIcon({ className = "h-4 w-4" }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <path
        d="M12 3l1.6 4.4L18 9l-4.4 1.6L12 15l-1.6-4.4L6 9l4.4-1.6L12 3z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/* -----------------------------
   Menu
-------------------------------- */
const MENU = [
  { label: "Home", to: "/", icon: HomeIcon },
];

export default function HeaderMenu() {
  const { pathname } = useLocation();
  const containerRef = useRef(null);
  const itemRefs = useRef([]);
  const [hoverIdx, setHoverIdx] = useState(-1);
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [pill, setPill] = useState({ left: 0, width: 0, opacity: 0 });

  const activeIdx = useMemo(() => {
    const i = MENU.findIndex(
      (m) => pathname === m.to || (m.to !== "/" && pathname.startsWith(m.to))
    );
    return i >= 0 ? i : 0;
  }, [pathname]);

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

  useEffect(() => {
    const onResize = () => setHoverIdx((h) => h);
    const onScroll = () => setScrolled(window.scrollY > 8);

    window.addEventListener("resize", onResize);
    window.addEventListener("scroll", onScroll);
    onScroll();

    return () => {
      window.removeEventListener("resize", onResize);
      window.removeEventListener("scroll", onScroll);
    };
  }, []);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  return (
    <>
      <style>{`
        @keyframes headerGlow {
          0%, 100% { opacity: .35; transform: translateX(0); }
          50% { opacity: .7; transform: translateX(8px); }
        }

        @keyframes brandFloat {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-2px); }
        }

        @keyframes softPulse {
          0%, 100% { box-shadow: 0 0 0 0 rgba(16,185,129,.12); }
          50% { box-shadow: 0 0 0 10px rgba(16,185,129,0); }
        }

        @keyframes ctaShine {
          0% { transform: translateX(-120%); opacity: 0; }
          35% { opacity: .35; }
          100% { transform: translateX(220%); opacity: 0; }
        }

        .header-glow::before {
          content: "";
          position: absolute;
          inset: 0;
          background:
            linear-gradient(90deg, rgba(16,185,129,.08), rgba(16,185,129,.03), rgba(16,185,129,.08));
          animation: headerGlow 8s ease-in-out infinite;
          pointer-events: none;
        }

        .brand-float {
          animation: brandFloat 3.2s ease-in-out infinite;
        }

        .brand-pulse {
          animation: softPulse 2.4s ease-in-out infinite;
        }

        .cta-shine {
          position: relative;
          overflow: hidden;
        }

        .cta-shine::after {
          content: "";
          position: absolute;
          top: -20%;
          left: -30%;
          width: 40%;
          height: 140%;
          background: linear-gradient(
            90deg,
            transparent,
            rgba(255,255,255,.28),
            transparent
          );
          transform: skewX(-20deg);
          animation: ctaShine 3.5s ease-in-out infinite;
          pointer-events: none;
        }

        .menu-link {
          transform: translateY(0);
          transition: transform .25s ease, color .25s ease;
        }

        .menu-link:hover {
          transform: translateY(-1px);
        }

        .mobile-fade {
          transition:
            max-height .35s ease,
            opacity .25s ease,
            transform .25s ease;
        }
      `}</style>

      <header
        className={[
          "sticky top-0 z-50 border-b backdrop-blur-xl transition-all duration-300",
          scrolled
            ? "border-slate-200/80 bg-white/90 shadow-sm"
            : "border-slate-200/60 bg-white/75",
        ].join(" ")}
      >
        <div className="header-glow relative">
          <div className="mx-auto max-w-7xl px-4 sm:px-6">
            <div className="flex h-16 items-center justify-between gap-6">
              {/* Brand */}
              <NavLink
                to="/"
                className="group flex items-center gap-3"
                aria-label="SmartCar AI Home"
              >
                <span className="brand-pulse inline-flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600 ring-1 ring-emerald-500/20 transition-transform duration-300 group-hover:scale-105">
                  <span className="brand-float">
                    <CarIcon className="h-5 w-5" />
                  </span>
                </span>

                <span className="flex items-center gap-1 text-lg font-semibold tracking-tight text-slate-900">
                  <span>SmartCar</span>
                  <span className="inline-flex items-center gap-1 text-emerald-600">
                    <SparkIcon className="h-4 w-4" />
                    AI
                  </span>
                </span>
              </NavLink>

              {/* Center menu */}
              <nav className="relative hidden flex-1 justify-center md:flex">
                <div
                  ref={containerRef}
                  className="relative inline-flex items-center gap-2 rounded-2xl border border-slate-200/80 bg-white/70 px-2 py-1 shadow-sm"
                  onMouseLeave={() => setHoverIdx(-1)}
                >
                  {/* animated pill */}
                  <span
                    className="pointer-events-none absolute top-1/2 -z-10 h-10 -translate-y-1/2 rounded-xl bg-emerald-500/10 ring-1 ring-emerald-500/25 transition-all duration-300 ease-out"
                    style={{
                      transform: `translateX(${pill.left}px) translateY(-50%)`,
                      width: `${pill.width}px`,
                      opacity: pill.opacity,
                    }}
                  />

                  {MENU.map((m, i) => {
                    const Icon = m.icon;
                    return (
                      <NavLink
                        key={m.to}
                        to={m.to}
                        ref={(el) => (itemRefs.current[i] = el)}
                        onMouseEnter={() => setHoverIdx(i)}
                        className={({ isActive }) =>
                          [
                            "menu-link relative z-10 flex h-10 items-center gap-2 rounded-xl px-4 text-sm transition-colors",
                            isActive
                              ? "font-semibold text-slate-900"
                              : "text-slate-600 hover:text-slate-900",
                          ].join(" ")
                        }
                      >
                        <Icon className="h-4 w-4" />
                        <span>{m.label}</span>
                      </NavLink>
                    );
                  })}
                </div>
              </nav>

              {/* Right actions */}
              <div className="flex items-center gap-3">
                <div className="hidden items-center gap-3 md:flex">
                  <NavLink
                    to="/login"
                    className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:border-slate-400 hover:bg-slate-50 hover:text-slate-900"
                  >
                    <LoginIcon className="h-4 w-4" />
                    <span>Login</span>
                  </NavLink>

                  <NavLink
                    to="/host/register"
                    className="cta-shine inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-emerald-500/20 transition-all duration-300 hover:-translate-y-0.5 hover:bg-emerald-700"
                  >
                    <CarIcon className="h-4 w-4" />
                    <span>List your car here</span>
                  </NavLink>
                </div>

                {/* mobile button */}
                <button
                  className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-300 bg-white text-slate-800 shadow-sm transition-all duration-300 hover:bg-slate-50 md:hidden"
                  aria-label="Menu"
                  onClick={() => setOpen((v) => !v)}
                >
                  <div className="w-5">
                    <span
                      className={`block h-[2px] rounded bg-current transition-all duration-300 ${
                        open ? "translate-y-[6px] rotate-45" : ""
                      }`}
                    />
                    <span
                      className={`my-[6px] block h-[2px] rounded bg-current transition-all duration-300 ${
                        open ? "opacity-0" : "opacity-100"
                      }`}
                    />
                    <span
                      className={`block h-[2px] rounded bg-current transition-all duration-300 ${
                        open ? "-translate-y-[6px] -rotate-45" : ""
                      }`}
                    />
                  </div>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Mobile drawer */}
        <div
          className={`mobile-fade overflow-hidden border-t border-slate-200/70 bg-white/95 md:hidden ${
            open ? "max-h-96 opacity-100 translate-y-0" : "max-h-0 opacity-0 -translate-y-1"
          }`}
        >
          <nav className="px-4 pb-4 pt-3">
            <ul className="grid gap-2">
              {MENU.map((m) => {
                const Icon = m.icon;
                return (
                  <li key={m.to}>
                    <NavLink
                      to={m.to}
                      onClick={() => setOpen(false)}
                      className={({ isActive }) =>
                        [
                          "flex items-center gap-3 rounded-xl px-3 py-3 text-sm transition-all duration-300",
                          isActive
                            ? "bg-emerald-500/10 font-semibold text-slate-900 ring-1 ring-emerald-500/20"
                            : "text-slate-700 hover:bg-slate-100",
                        ].join(" ")
                      }
                    >
                      <Icon className="h-4 w-4" />
                      <span>{m.label}</span>
                    </NavLink>
                  </li>
                );
              })}

              <li className="mt-2 flex flex-col gap-2">
                <NavLink
                  to="/login"
                  onClick={() => setOpen(false)}
                  className="flex w-full items-center justify-center gap-2 rounded-xl border border-slate-300 px-3 py-3 text-center text-sm font-medium text-slate-700 transition-all duration-300 hover:bg-slate-50"
                >
                  <LoginIcon className="h-4 w-4" />
                  <span>Login</span>
                </NavLink>

                <NavLink
                  to="/host/register"
                  onClick={() => setOpen(false)}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-3 py-3 text-center text-sm font-semibold text-white shadow-lg shadow-emerald-500/20 transition-all duration-300 hover:bg-emerald-700"
                >
                  <CarIcon className="h-4 w-4" />
                  <span>List your car here</span>
                </NavLink>
              </li>
            </ul>
          </nav>
        </div>
      </header>
    </>
  );
}