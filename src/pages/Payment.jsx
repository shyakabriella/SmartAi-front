// src/pages/Payment.jsx
import { useState } from "react";
import { VEHICLES, DRIVERS, RENTER_DAYS } from "../components/demoBookingData";

export default function Payment() {
  // demo: use first vehicle + driver
  const vehicle = VEHICLES[0];
  const driver = DRIVERS[0];

  const base = vehicle.pricePerDay * RENTER_DAYS;
  const insurance = vehicle.insurancePerDay * RENTER_DAYS;
  const driverFeePerDay = 2;
  const driverFee = driverFeePerDay * RENTER_DAYS;
  const taxesFees = Math.round((base + insurance + driverFee) * 0.08);
  const total = base + insurance + driverFee + taxesFees;

  const [method, setMethod] = useState("card");
  const [cardNumber, setCardNumber] = useState("");
  const [cardName, setCardName] = useState("");
  const [expiry, setExpiry] = useState("");
  const [cvv, setCvv] = useState("");
  const [saveCard, setSaveCard] = useState(false);

  return (
    <section className="bg-slate-100 py-10 sm:py-12">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mb-4">
          <h1 className="text-lg font-semibold text-slate-900">
            Payment Method
          </h1>
          <p className="text-xs text-slate-500">
            Complete your booking securely with SmartCar AI.
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1.5fr),minmax(0,1.1fr)]">
          {/* LEFT: Payment methods + form */}
          <div className="rounded-2xl bg-white p-4 sm:p-5 shadow-sm shadow-slate-900/10 border border-slate-200">
            {/* Method cards */}
            <div className="mb-4 grid gap-3 sm:grid-cols-3">
              <PaymentMethodCard
                label="Credit/Debit Card"
                icon="💳"
                active={method === "card"}
                onClick={() => setMethod("card")}
              />
              <PaymentMethodCard
                label="Mobile Money (MTN)"
                icon="📱"
                active={method === "mobile"}
                onClick={() => setMethod("mobile")}
              />
              <PaymentMethodCard
                label="PayPal"
                icon="🅿️"
                active={method === "paypal"}
                onClick={() => setMethod("paypal")}
              />
            </div>

            {/* Card form – you can branch by method later */}
            <div className="space-y-3 text-xs">
              <div className="grid gap-3 sm:grid-cols-[minmax(0,1.4fr),minmax(0,1fr)]">
                <FormField
                  label="Card Number"
                  placeholder="1234 5678 9012 3456"
                  value={cardNumber}
                  onChange={setCardNumber}
                />
                <FormField
                  label="Cardholder Name"
                  placeholder="Name on card"
                  value={cardName}
                  onChange={setCardName}
                />
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <FormField
                  label="Expiry Date (MM/YY)"
                  placeholder="08/28"
                  value={expiry}
                  onChange={setExpiry}
                />
                <FormField
                  label="CVV"
                  placeholder="***"
                  value={cvv}
                  onChange={setCvv}
                />
              </div>

              <label className="flex items-center gap-2 text-[11px] text-slate-600 pt-1">
                <input
                  type="checkbox"
                  className="h-3.5 w-3.5 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                  checked={saveCard}
                  onChange={(e) => setSaveCard(e.target.checked)}
                />
                <span>Securely save this card for future rentals.</span>
              </label>

              <button
                type="button"
                className="mt-2 inline-flex w-full items-center justify-center rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-md hover:bg-blue-700"
              >
                Pay Now
              </button>

              <p className="mt-1 text-[11px] text-slate-500">
                By clicking Pay Now, you agree to SmartCar AI&apos;s Terms of
                Service and Privacy Policy.
              </p>
            </div>
          </div>

          {/* RIGHT: Order summary */}
          <div className="rounded-2xl bg-white p-4 sm:p-5 shadow-sm shadow-slate-900/10 border border-slate-200">
            <p className="text-sm font-semibold text-slate-900 mb-2">
              Order Summary
            </p>

            <div className="mb-3 flex gap-3">
              <div className="h-16 w-24 overflow-hidden rounded-xl bg-slate-100">
                <img
                  src={vehicle.images[0]}
                  alt={vehicle.name}
                  className="h-full w-full object-cover"
                />
              </div>
              <div className="flex-1">
                <p className="text-xs font-semibold text-slate-900">
                  {vehicle.name}
                </p>
                <p className="text-[11px] text-slate-500">
                  With driver • {RENTER_DAYS} days
                </p>
                <p className="mt-1 text-[11px] text-slate-500">
                  Driver: {driver.name}
                </p>
              </div>
            </div>

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

            <div className="mt-2 flex items-center justify-between border-t border-slate-200 pt-3">
              <span className="text-xs font-semibold text-slate-900">
                Total Price
              </span>
              <span className="text-lg font-semibold text-slate-900">
                ${total.toFixed(2)}
              </span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function PaymentMethodCard({ label, icon, active, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center justify-center gap-2 rounded-xl border px-3 py-3 text-xs font-semibold shadow-sm transition-all ${
        active
          ? "border-sky-500 bg-sky-50 text-sky-800"
          : "border-slate-200 bg-slate-50 text-slate-700 hover:border-sky-400 hover:bg-sky-50"
      }`}
    >
      <span className="text-base">{icon}</span>
      <span>{label}</span>
    </button>
  );
}

function FormField({ label, placeholder, value, onChange }) {
  return (
    <div>
      <label className="mb-1 block text-[11px] font-medium text-slate-600">
        {label}
      </label>
      <input
        type="text"
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs text-slate-900 shadow-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500/40"
      />
    </div>
  );
}
