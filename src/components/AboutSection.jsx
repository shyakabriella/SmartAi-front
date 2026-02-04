import { useEffect, useRef, useState } from "react";

// Put some nice image here: public/images/about-smartcar.jpg
const ABOUT_IMAGE = "/rent.jpg";

export default function AboutSection() {
  const [visible, setVisible] = useState(false);
  const sectionRef = useRef(null);

  // Simple scroll-in animation using IntersectionObserver
  useEffect(() => {
    const el = sectionRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.3 }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <section ref={sectionRef} className="bg-slate-50 py-12 sm:py-16">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div
          className={`
            grid gap-10 md:grid-cols-2 items-center
            transform transition-all duration-700 ease-out
            ${visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}
          `}
        >
          {/* LEFT: Image */}
          <div className="relative">
            <div className="overflow-hidden rounded-3xl shadow-xl shadow-slate-900/20">
              <img
                src={ABOUT_IMAGE}
                alt="SmartCar AI fleet and drivers"
                className="h-full w-full object-cover"
              />
            </div>

            {/* small floating badge */}
            <div className="absolute -bottom-6 left-6 rounded-2xl bg-white px-4 py-3 shadow-lg shadow-slate-900/15">
              <p className="text-xs font-semibold text-slate-700">
                24/7 Smart Fleet Monitoring
              </p>
              <p className="mt-1 text-[11px] text-slate-500">
                Real-time availability, health & driver status.
              </p>
            </div>
          </div>

          {/* RIGHT: Text card */}
          <div className="relative">
            <div className="rounded-3xl bg-white px-6 py-6 sm:px-8 sm:py-7 shadow-xl shadow-slate-900/10">
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-emerald-600">
                About Us
              </p>
              <h2 className="mt-2 text-xl font-semibold text-slate-900 sm:text-2xl">
                AI-Driven Rentals, Built for Modern Mobility
              </h2>
              <p className="mt-3 text-sm leading-relaxed text-slate-600">
                SmartCar AI combines intelligent fleet management, driver
                matching, and transparent pricing to create a smoother, safer
                car rental experience. We help customers find the right car and
                the right driver in just a few clicks.
              </p>

              <div className="mt-4 grid gap-3 sm:grid-cols-2 text-sm">
                <div className="rounded-2xl bg-emerald-50 px-4 py-3">
                  <p className="text-xs font-semibold text-emerald-700">
                    Smart Driver Matching
                  </p>
                  <p className="mt-1 text-xs text-emerald-800/80">
                    AI picks verified drivers based on ratings, route type and
                    customer preferences.
                  </p>
                </div>
                <div className="rounded-2xl bg-slate-50 px-4 py-3">
                  <p className="text-xs font-semibold text-slate-800">
                    Transparent Pricing
                  </p>
                  <p className="mt-1 text-xs text-slate-600">
                    Clear breakdown of vehicle, driver and extra fees – no
                    hidden surprises.
                  </p>
                </div>
              </div>

              <ul className="mt-4 space-y-1 text-sm text-slate-600">
                <li>• Real-time fleet visibility & maintenance tracking</li>
                <li>• Support for self-drive and driver-assisted trips</li>
                <li>• Built for agencies, corporates and everyday users</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
