// src/components/BookingDetailsModal.jsx
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { RENTER_DAYS } from "./demoBookingData";

export default function BookingDetailsModal({ booking, onClose }) {
  const navigate = useNavigate();

  const { vehicle, driver, trip } = booking;

  const [pickup, setPickup] = useState(trip.pickup);
  const [dropoff, setDropoff] = useState(trip.dropoff);
  const [promo, setPromo] = useState("");

  const base = vehicle.pricePerDay * RENTER_DAYS;
  const insurance = vehicle.insurancePerDay * RENTER_DAYS;
  const driverFeePerDay = 2;
  const driverFee = driverFeePerDay * RENTER_DAYS;
  const taxesFees = Math.round((base + insurance + driverFee) * 0.08);
  const total = base + insurance + driverFee + taxesFees;

  // Simple booking id (or use one passed in booking)
  const bookingId = booking.bookingId || "#SC-2241117-0042";

  function handleProceedToPayment() {
    const orderForPayment = {
      id: bookingId,
      title: "SmartCar AI Rental",
      subtitle: `${trip.startDate} – ${trip.endDate} • ${vehicle.name} with ${driver.name}`,
      vehicleRental: base,
      driverFee,
      insurance,
      taxes: taxesFees,
    };

    navigate("/payment", { state: { order: orderForPayment } });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm">
      <div className="relative mx-4 w-full max-w-5xl rounded-3xl bg-slate-50 p-4 sm:p-5 shadow-2xl shadow-slate-900/40">
        {/* Close */}
        <button
          type="button"
          onClick={onClose}
          className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 hover:bg-slate-50"
          aria-label="Close"
        >
          ✕
        </button>

        <div className="mb-4">
          <h2 className="text-sm font-semibold text-slate-900">
            Your Booking Details
          </h2>
        </div>

        <div className="grid gap-4 lg:grid-cols-[minmax(0,1.2fr),minmax(0,1.1fr)]">
          {/* LEFT: Car + trip overview */}
          <div className="space-y-3">
            <div className="rounded-2xl bg-white p-3 shadow-sm shadow-slate-900/10 border border-slate-200">
              <div className="overflow-hidden rounded-xl mb-3">
                <div className="relative h-32 w-full">
                  <img
                    src={vehicle.images[0]}
                    alt={vehicle.name}
                    className="h-full w-full object-cover"
                  />
                  <div className="absolute left-3 bottom-3 flex items-center gap-2 rounded-full bg-white/90 px-3 py-1 shadow-sm">
                    <div className="h-7 w-7 rounded-full overflow-hidden bg-slate-200">
                      <img
                        src={driver.avatar}
                        alt={driver.name}
                        className="h-full w-full object-cover"
                      />
                    </div>
                    <span className="text-[11px] font-semibold text-slate-800">
                      {driver.name}
                    </span>
                  </div>
                </div>
              </div>

              <p className="text-xs font-semibold text-slate-800 mb-2">
                Trip Overview
              </p>

              <div className="space-y-3 text-xs text-slate-700">
                {/* Pickup */}
                <div className="grid grid-cols-[minmax(0,1.4fr),minmax(0,1fr)] gap-3">
                  <div>
                    <label className="mb-1 block text-[11px] font-medium text-slate-600">
                      Pickup
                    </label>
                    <input
                      type="text"
                      value={pickup}
                      onChange={(e) => setPickup(e.target.value)}
                      className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs text-slate-900 shadow-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500/40"
                      placeholder="Pickup address"
                    />
                    <p className="mt-1 text-[11px] text-slate-400">
                      {trip.startDate} • 08:30 AM (example)
                    </p>
                  </div>
                  <div className="flex items-center justify-center rounded-lg border border-slate-200 bg-slate-50 text-[11px] text-slate-400">
                    Map preview
                  </div>
                </div>

                {/* Drop-off */}
                <div className="grid grid-cols-[minmax(0,1.4fr),minmax(0,1fr)] gap-3">
                  <div>
                    <label className="mb-1 block text-[11px] font-medium text-slate-600">
                      Drop-off
                    </label>
                    <input
                      type="text"
                      value={dropoff}
                      onChange={(e) => setDropoff(e.target.value)}
                      className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs text-slate-900 shadow-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500/40"
                      placeholder="Drop-off address"
                    />
                    <p className="mt-1 text-[11px] text-slate-400">
                      {trip.endDate} • 02:15 PM (example)
                    </p>
                  </div>
                  <div className="flex items-center justify-center rounded-lg border border-slate-200 bg-slate-50 text-[11px] text-slate-400">
                    Map preview
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* RIGHT: Order summary */}
          <div className="rounded-2xl bg-white p-4 shadow-sm shadow-slate-900/10 border border-slate-200">
            <p className="text-sm font-semibold text-slate-900 mb-2">
              Order Summary
            </p>

            <div className="space-y-1 text-xs text-slate-700 mb-3">
              <div className="flex items-center justify-between">
                <span>Vehicle Rental</span>
                <span>${base.toFixed(2)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Driver Fee</span>
                <span>${driverFee.toFixed(2)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Insurance</span>
                <span>${insurance.toFixed(2)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Taxes &amp; Fees</span>
                <span>${taxesFees.toFixed(2)}</span>
              </div>
            </div>

            {/* Promo code */}
            <div className="mb-3">
              <label className="mb-1 block text-[11px] font-medium text-slate-600">
                Apply Promo Code
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={promo}
                  onChange={(e) => setPromo(e.target.value)}
                  placeholder="Enter code"
                  className="flex-1 rounded-lg border border-slate-200 px-3 py-2 text-xs text-slate-900 shadow-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500/40"
                />
                <button
                  type="button"
                  className="rounded-lg border border-slate-200 px-3 py-2 text-[11px] font-medium text-slate-600 hover:bg-slate-50"
                >
                  Apply
                </button>
              </div>
            </div>

            {/* Total */}
            <div className="mt-2 flex items-center justify-between border-t border-slate-200 pt-3">
              <span className="text-xs font-semibold text-slate-900">
                Total Price
              </span>
              <span className="text-lg font-semibold text-slate-900">
                ${total.toFixed(2)}
              </span>
            </div>

            <button
              type="button"
              onClick={handleProceedToPayment}
              className="mt-4 inline-flex w-full items-center justify-center rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-md shadow-emerald-500/30 hover:bg-emerald-700"
            >
              Proceed to Payment
            </button>

            <p className="mt-2 text-[11px] text-slate-500">
              By continuing, you agree to SmartCar AI&apos;s rental terms and
              safety guidelines.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
