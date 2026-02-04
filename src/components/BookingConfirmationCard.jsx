// src/components/BookingConfirmationCard.jsx

export default function BookingConfirmationCard({
  bookingId,
  onViewTrip,
  onDownloadInvoice,
  onBackHome,
}) {
  const idDisplay = bookingId || "#SC-2241117-0042";

  return (
    <div className="mx-auto max-w-md rounded-3xl bg-white px-6 py-7 shadow-xl shadow-slate-900/20 border border-slate-200 text-center">
      {/* Icon */}
      <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full border-4 border-sky-100 bg-sky-50">
        <span className="flex h-9 w-9 items-center justify-center rounded-full bg-sky-500 text-white text-2xl">
          ✓
        </span>
      </div>

      <h1 className="text-lg font-semibold text-slate-900">
        Booking Confirmed!
      </h1>
      <p className="mt-1 text-sm text-slate-600">
        Your reservation is all set. Enjoy your trip!
      </p>

      <p className="mt-3 text-xs text-slate-500">
        Booking ID:&nbsp;
        <span className="font-semibold text-slate-800">{idDisplay}</span>
      </p>

      <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:justify-center">
        <button
          type="button"
          onClick={onViewTrip}
          className="inline-flex items-center justify-center rounded-lg bg-sky-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-sky-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500/70"
        >
          View Trip Details
        </button>

        <button
          type="button"
          onClick={onDownloadInvoice}
          className="inline-flex items-center justify-center rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
        >
          Download Invoice
        </button>
      </div>

      <button
        type="button"
        onClick={onBackHome}
        className="mt-4 text-xs font-medium text-slate-500 hover:text-slate-700"
      >
        Back to Home
      </button>
    </div>
  );
}
