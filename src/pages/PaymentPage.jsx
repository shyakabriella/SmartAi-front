// src/pages/PaymentPage.jsx
import { useLocation, useNavigate } from "react-router-dom";
import { useState } from "react";

export default function PaymentPage() {
  const location = useLocation();
  const navigate = useNavigate();

  const orderFromState = location.state?.order;

  // Fallback demo order if user opens /payment directly
  const order = orderFromState || {
    id: "#SC-2241117-0042",
    title: "SmartCar AI Rental",
    subtitle: "Example booking for demo",
    vehicleRental: 360, // e.g. 3 days x 120
    driverFee: 6,       // 3 x 2
    insurance: 45,      // 3 x 15
    taxes: 30,
  };

  const [method, setMethod] = useState("card");
  const [cardNumber, setCardNumber] = useState("");
  const [cardName, setCardName] = useState("");
  const [expiry, setExpiry] = useState("");
  const [cvv, setCvv] = useState("");
  const [saveCard, setSaveCard] = useState(false);

  const total =
    order.vehicleRental + order.driverFee + order.insurance + order.taxes;

  const handlePayNow = (e) => {
    e.preventDefault();
    // TODO: hook real payment here

    navigate("/booking/confirmed", {
      state: {
        bookingId: order.id,
        order,
      },
    });
  };

  return (
    <section className="bg-slate-100 py-10 sm:py-12">
      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
        <h1 className="mb-6 text-xl font-semibold text-slate-900">
          Payment Method
        </h1>

        <div className="grid gap-5 lg:grid-cols-[minmax(0,1.5fr),minmax(0,1fr)]">
          {/* LEFT: Payment form */}
          <form
            onSubmit={handlePayNow}
            className="rounded-2xl bg-white p-4 sm:p-5 shadow-sm shadow-slate-900/10 border border-slate-200"
          >
            <p className="text-sm font-semibold text-slate-900 mb-3">
              Payment Method
            </p>

            {/* Method cards */}
            <div className="mb-5 grid gap-3 sm:grid-cols-3">
              {[
                { id: "card", label: "Credit/Debit Card", badge: "VISA" },
                { id: "mobile", label: "Mobile Money (MTN)", badge: "₣" },
                { id: "paypal", label: "PayPal", badge: "PP" },
              ].map((m) => {
                const active = method === m.id;
                return (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => setMethod(m.id)}
                    className={`flex h-14 items-center gap-3 rounded-xl border px-3 text-left text-xs font-medium transition-all ${
                      active
                        ? "border-sky-500 bg-sky-50 shadow-sm"
                        : "border-slate-200 bg-slate-50 hover:border-sky-400"
                    }`}
                  >
                    <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-white text-xs shadow-sm">
                      {m.badge}
                    </span>
                    <span className="text-slate-800">{m.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Card details (for now we always show these fields) */}
            <div className="space-y-3 text-xs">
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-[11px] font-medium text-slate-600">
                    Card Number
                  </label>
                  <input
                    type="text"
                    value={cardNumber}
                    onChange={(e) => setCardNumber(e.target.value)}
                    placeholder="Card Number"
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs text-slate-900 shadow-sm focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500/40"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-[11px] font-medium text-slate-600">
                    Cardholder Name
                  </label>
                  <input
                    type="text"
                    value={cardName}
                    onChange={(e) => setCardName(e.target.value)}
                    placeholder="Name on card"
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs text-slate-900 shadow-sm focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500/40"
                  />
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-[11px] font-medium text-slate-600">
                    Expiry Date (MM/YY)
                  </label>
                  <input
                    type="text"
                    value={expiry}
                    onChange={(e) => setExpiry(e.target.value)}
                    placeholder="MM/YY"
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs text-slate-900 shadow-sm focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500/40"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-[11px] font-medium text-slate-600">
                    CVV
                  </label>
                  <input
                    type="password"
                    value={cvv}
                    onChange={(e) => setCvv(e.target.value)}
                    placeholder="CVV"
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs text-slate-900 shadow-sm focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500/40"
                  />
                </div>
              </div>

              <label className="mt-2 flex items-center gap-2 text-[11px] text-slate-600">
                <input
                  type="checkbox"
                  checked={saveCard}
                  onChange={(e) => setSaveCard(e.target.checked)}
                  className="h-3.5 w-3.5 rounded border-slate-300 text-sky-600 focus:ring-sky-500/40"
                />
                <span>Securely save this card for future rentals</span>
              </label>
            </div>

            <button
              type="submit"
              className="mt-4 inline-flex w-full items-center justify-center rounded-lg bg-sky-600 px-4 py-2 text-sm font-semibold text-white shadow-md shadow-sky-500/30 hover:bg-sky-700"
            >
              Pay Now
            </button>

            <p className="mt-2 text-[11px] text-slate-500">
              By clicking Pay Now, you agree to the SmartCar AI Terms of Service.
            </p>
          </form>

          {/* RIGHT: Order summary */}
          <aside className="rounded-2xl bg-white p-4 sm:p-5 shadow-sm shadow-slate-900/10 border border-slate-200 text-xs">
            <p className="text-sm font-semibold text-slate-900 mb-2">
              Order Summary
            </p>
            <p className="text-[11px] font-medium text-slate-700">
              {order.title}
            </p>
            {order.subtitle && (
              <p className="mb-3 text-[11px] text-slate-500">
                {order.subtitle}
              </p>
            )}

            <div className="space-y-1 text-slate-700 mb-3">
              <div className="flex items-center justify-between">
                <span>Vehicle Rental</span>
                <span>${order.vehicleRental.toFixed(2)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Driver Fee</span>
                <span>${order.driverFee.toFixed(2)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Insurance</span>
                <span>${order.insurance.toFixed(2)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Taxes &amp; Fees</span>
                <span>${order.taxes.toFixed(2)}</span>
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
          </aside>
        </div>
      </div>
    </section>
  );
}
