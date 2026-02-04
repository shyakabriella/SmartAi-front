// src/components/Footer.jsx
import { useMemo } from "react";

export default function Footer() {
  const year = useMemo(() => new Date().getFullYear(), []);

  const groups = [
    {
      title: "Fleet",
      links: [
        { label: "SUV", href: "/vehicles?class=SUV" },
        { label: "Sedan", href: "/vehicles?class=Sedan" },
        { label: "Luxury", href: "/vehicles?class=Luxury" },
        { label: "Electric", href: "/vehicles?class=EV" },
      ],
    },
    {
      title: "Booking",
      links: [
        { label: "Start a Reservation", href: "/booking" },
        { label: "Manage Booking", href: "/booking/manage" },
        { label: "Driver Matching", href: "/drivers" },
        { label: "Locations", href: "/locations" },
      ],
    },
    {
      title: "Company",
      links: [
        { label: "About Us", href: "/about" },
        { label: "Careers", href: "/careers" },
        { label: "Press", href: "/press" },
        { label: "Contact", href: "/contact" },
      ],
    },
    {
      title: "Support",
      links: [
        { label: "Help Center", href: "/support" },
        { label: "Insurance & Policy", href: "/policy" },
        { label: "Terms", href: "/terms" },
        { label: "Privacy", href: "/privacy" },
      ],
    },
  ];

  return (
    <footer className="relative mt-16 text-slate-200 bg-slate-900 overflow-hidden">
      {/* Animated top border */}
      <div
        className="h-[2px] w-full"
        style={{
          background:
            "linear-gradient(90deg,#22d3ee,#3b82f6,#a855f7,#22d3ee)",
          backgroundSize: "300% 100%",
          animation: "bg-pan 8s linear infinite",
        }}
      />

      {/* Floating glow orbs */}
      <div className="pointer-events-none absolute -top-24 -left-24 h-64 w-64 rounded-full blur-3xl opacity-20"
           style={{ background: "radial-gradient(circle at 30% 30%, #22d3ee, transparent 60%)", animation: "floaty 9s ease-in-out infinite" }} />
      <div className="pointer-events-none absolute -bottom-24 -right-24 h-72 w-72 rounded-full blur-3xl opacity-20"
           style={{ background: "radial-gradient(circle at 70% 70%, #a855f7, transparent 60%)", animation: "floaty2 11s ease-in-out infinite" }} />

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 py-12">
        {/* Brand + tagline */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-cyan-400 to-blue-600 animate-pulse" />
            <h3 className="text-xl font-semibold tracking-tight">
              SmartCar<span className="text-cyan-400">AI</span>
            </h3>
          </div>
          <p className="mt-2 text-slate-400">
            AI-driven rentals. Transparent pricing. Seamless rides.
          </p>
        </div>

        {/* Link groups */}
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {groups.map((g) => (
            <div key={g.title}>
              <h4 className="text-slate-200 font-medium mb-3">{g.title}</h4>
              <ul className="space-y-2">
                {g.links.map((l) => (
                  <li key={l.label}>
                    <a
                      href={l.href}
                      className="group inline-flex items-center gap-2 text-slate-400 hover:text-slate-200 transition-colors"
                    >
                      <span className="relative">
                        {l.label}
                        <span className="absolute left-0 -bottom-0.5 h-px w-0 bg-current transition-all duration-300 group-hover:w-full" />
                      </span>
                      <svg
                        className="w-3.5 h-3.5 opacity-0 -translate-x-1 group-hover:translate-x-0 group-hover:opacity-100 transition-all"
                        viewBox="0 0 20 20" fill="currentColor"
                      >
                        <path d="M7 5h8v8h-2V8.414l-7.293 7.293-1.414-1.414L11.586 7H7z" />
                      </svg>
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Bottom bar */}
        <div className="mt-12 flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-white/10 pt-6">
          <p className="text-sm text-slate-400">
            © {year} SmartCar AI. All rights reserved.
          </p>

          <div className="flex items-center gap-3 text-sm">
            <a href="mailto:support@smartcar.ai" className="hover:text-slate-200 transition-colors">
              support@smartcar.ai
            </a>
            <span className="text-slate-700">•</span>
            <a href="tel:+250700000000" className="hover:text-slate-200 transition-colors">
              +250 700 000 000
            </a>
          </div>

          <button
            onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-700 px-3 py-1.5 text-sm hover:bg-white/5 transition-all"
          >
            <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
              <path d="M10 4l5 6h-3v6H8v-6H5l5-6z" />
            </svg>
            Back to top
          </button>
        </div>
      </div>

      {/* Keyframes */}
      <style>{`
        @keyframes bg-pan {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
        @keyframes floaty {
          0%, 100% { transform: translateY(0) translateX(0); }
          50% { transform: translateY(-10px) translateX(6px); }
        }
        @keyframes floaty2 {
          0%, 100% { transform: translateY(0) translateX(0) scale(1); }
          50% { transform: translateY(12px) translateX(-8px) scale(1.05); }
        }
      `}</style>
    </footer>
  );
}
