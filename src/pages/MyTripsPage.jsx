// src/pages/MyTripsPage.jsx
import { useLocation, useNavigate } from "react-router-dom";
import { useState } from "react";

const DEMO_TRIP = {
  id: "#SC-2241117-0042",
  dateLabel: "December 15, 2024",
  timeLabel: "Departure 8:30 AM • Return 5:30 PM",
  status: "Confirmed",
  vehicle: {
    name: "Tesla Model 3",
    type: "Sedan",
    seats: 5,
    image: "/images/cars/tesla-3-1.jpg",
  },
  driver: {
    name: "Shyaka Samuel",
    avatar: "/images/drivers/shyaka-1.jpg",
  },
  pickup: "Kigali City Center, Rwanda",
  dropoff: "Kigali International Airport",
  pricing: {
    vehicleRental: 300,
    driverFee: 20,
    insurance: 12,
    total: 332,
  },
};

export default function MyTripsPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("upcoming");

  // If you later pass real trip data via router, you can merge it here:
  const trip = location.state?.trip || DEMO_TRIP;

  const { pricing } = trip;
  const totalPrice =
    pricing.vehicleRental + pricing.driverFee + pricing.insurance;

  const handleProceedToPayment = () => {
    // send the order to /payment
    navigate("/payment", {
      state: {
        order: {
          id: trip.id,
          title: "SmartCar AI Rental",
          subtitle: `${trip.vehicle.name} • ${trip.dateLabel}`,
          vehicleRental: pricing.vehicleRental,
          driverFee: pricing.driverFee,
          insurance: pricing.insurance,
          taxes: 0, // adjust later
        },
      },
    });
  };

  return (
    <section className="bg-slate-100 py-10 sm:py-12">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        {/* Header + tabs */}
        <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-baseline sm:justify-between">
          <h1 className="text-lg font-semibold text-slate-900">My Trips</h1>

          <div className="inline-flex rounded-full bg-slate-200/70 p-1 text-xs">
            {[
              { id: "upcoming", label: "Upcoming Trips" },
              { id: "past", label: "Past Trips" },
            ].map((tab) => {
              const active = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={`rounded-full px-3 py-1 font-medium transition-colors ${
                    active
                      ? "bg-white text-sky-700 shadow-sm"
                      : "text-slate-600 hover:text-slate-800"
                  }`}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* If you wanted to hide content for past tab you could, but for now we show same trip */}
        <div className="grid gap-5 lg:grid-cols-[minmax(0,1.2fr),minmax(0,1.1fr)]">
          {/* LEFT: trip overview card */}
          <div className="rounded-2xl bg-white p-4 shadow-sm shadow-slate-900/10 border border-slate-200">
            {/* Image */}
            <div className="mb-3 overflow-hidden rounded-xl">
              <div className="relative h-32 w-full sm:h-40">
                <img
                  src={trip.vehicle.image}
                  alt={trip.vehicle.name}
                  className="h-full w-full object-cover"
                />
                <div className="absolute left-3 bottom-3 flex items-center gap-2 rounded-full bg-white/90 px-3 py-1 shadow-sm">
                  <div className="h-7 w-7 overflow-hidden rounded-full bg-slate-200">
                    <img
                      src={trip.driver.avatar}
                      alt={trip.driver.name}
                      className="h-full w-full object-cover"
                    />
                  </div>
                  <span className="text-[11px] font-semibold text-slate-800">
                    {trip.driver.name}
                  </span>
                </div>
              </div>
            </div>

            <p className="mb-2 text-xs font-semibold text-slate-800">
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
                    defaultValue={trip.pickup}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs text-slate-900 shadow-sm focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500/40"
                  />
                  <p className="mt-1 text-[11px] text-slate-400">
                    {trip.dateLabel} • 08:30 AM
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
                    defaultValue={trip.dropoff}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs text-slate-900 shadow-sm focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500/40"
                  />
                  <p className="mt-1 text-[11px] text-slate-400">
                    {trip.dateLabel} • 05:30 PM
                  </p>
                </div>
                <div className="flex items-center justify-center rounded-lg border border-slate-200 bg-slate-50 text-[11px] text-slate-400">
                  Map preview
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:justify-end">
              <button
                type="button"
                className="inline-flex items-center justify-center rounded-lg border border-slate-300 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
              >
                View Details
              </button>
              <button
                type="button"
                className="inline-flex items-center justify-center rounded-lg border border-rose-200 px-4 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50"
              >
                Cancel Trip
              </button>
            </div>
          </div>

          {/* RIGHT: order summary card */}
          <div className="rounded-2xl bg-white p-4 shadow-sm shadow-slate-900/10 border border-slate-200 text-xs">
            <p className="text-sm font-semibold text-slate-900 mb-2">
              Order Summary
            </p>

            <p className="text-[11px] font-medium text-slate-700">
              {trip.dateLabel}
            </p>
            <p className="mb-3 text-[11px] text-slate-500">
              {trip.timeLabel}
            </p>

            <div className="mb-3 space-y-1 text-slate-700">
              <div className="flex items-center justify-between">
                <span>Status:</span>
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                  {trip.status}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span>Vehicle Rental</span>
                <span>${pricing.vehicleRental.toFixed(2)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Driver Fee</span>
                <span>${pricing.driverFee.toFixed(2)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Insurance</span>
                <span>${pricing.insurance.toFixed(2)}</span>
              </div>
            </div>

            <div className="mt-2 flex items-center justify-between border-t border-slate-200 pt-3">
              <span className="text-xs font-semibold text-slate-900">
                Total Price
              </span>
              <span className="text-lg font-semibold text-slate-900">
                ${totalPrice.toFixed(2)}
              </span>
            </div>

            <button
              type="button"
              onClick={handleProceedToPayment}
              className="mt-4 inline-flex w-full items-center justify-center rounded-lg bg-sky-600 px-4 py-2 text-sm font-semibold text-white shadow-md shadow-sky-500/30 hover:bg-sky-700"
            >
              Proceed to Payment
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
