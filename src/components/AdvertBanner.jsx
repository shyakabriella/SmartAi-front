// src/components/AdvertBanner.jsx

// Put your banner image here, e.g. public/images/advert-banner-bg.jpg
const ADVERT_BG = "/ban.jpg";

export default function AdvertBanner() {
  return (
    <section className="relative text-white">
      {/* Background image */}
      <div
        className="absolute inset-0 bg-cover bg-center"
        style={{ backgroundImage: `url(${ADVERT_BG})` }}
      />

      {/* Dark overlay so text is readable */}
      <div className="absolute inset-0 bg-gradient-to-r from-sky-950/80 via-sky-900/60 to-sky-800/40" />

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* soft glow top-left (optional) */}
        <div className="pointer-events-none absolute -left-32 -top-24 h-40 w-40 rounded-full bg-white/40 blur-3xl" />

        <div className="relative flex h-20 items-center gap-4 sm:h-24">
          {/* Car bubble */}
          <div className="flex h-10 w-10 items-center justify-center rounded-full border border-white/40 bg-white/15 shadow-sm backdrop-blur-sm">
            <span className="text-lg">🚗</span>
          </div>

          {/* Text */}
          <div className="flex flex-col">
            <h2 className="text-sm font-semibold sm:text-base">
              Experience the Future of Car Rental
            </h2>
            <p className="mt-1 text-[11px] uppercase tracking-[0.18em] text-sky-100/80 sm:text-xs">
              AI-Powered | Seamless | Trustworthy
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
