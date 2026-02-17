// src/pages/owner/Booking.jsx
import { useEffect, useMemo, useState } from "react";

function safeParse(s) {
  try {
    return s ? JSON.parse(s) : null;
  } catch {
    return null;
  }
}

function safeJsonFromText(text) {
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

function pickData(payload) {
  if (!payload) return null;
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.data)) return payload.data;
  if (payload?.data && typeof payload.data === "object") return payload.data;
  return payload;
}

function fmtDate(x) {
  if (!x) return "-";
  const d = new Date(x);
  if (Number.isNaN(d.getTime())) return String(x);
  return d.toLocaleString();
}

function money(x) {
  if (x === null || x === undefined || x === "") return "-";
  const n = Number(x);
  if (Number.isNaN(n)) return String(x);
  return n.toLocaleString();
}

// ✅ Extract customer display info from booking.customer.user
function getCustomerInfo(b) {
  const u = b?.customer?.user || null;

  const name =
    u?.name ||
    b?.customer?.name ||
    b?.customer_name ||
    b?.meta?.customer_name ||
    "-";

  const email = u?.email || b?.customer?.email || b?.meta?.customer_email || "";
  const phone = u?.phone || b?.customer?.phone || b?.meta?.customer_phone || "";

  return { name, email, phone };
}

function getInvoiceNumbers(b) {
  const invoiceNo = b?.code || `INV-${String(b?.id || "0000").padStart(6, "0")}`;
  const bookingNo = b?.code || `#${b?.id || "-"}`;
  return { invoiceNo, bookingNo };
}

function getPickupDropoff(b) {
  const pickup =
    b?.pickup_time || b?.pickup_at || b?.start_date || b?.from || null;
  const dropoff =
    b?.dropoff_time || b?.dropoff_at || b?.end_date || b?.to || null;
  return { pickup, dropoff };
}

function getCharges(b) {
  // Your backend uses: price_subtotal, price_driver_fee, price_taxes, price_total
  const subtotal =
    b?.price_subtotal ?? b?.subtotal ?? b?.meta?.price_subtotal ?? 0;
  const driverFee =
    b?.price_driver_fee ?? b?.driver_fee ?? b?.meta?.price_driver_fee ?? 0;
  const taxes = b?.price_taxes ?? b?.taxes ?? b?.meta?.price_taxes ?? 0;
  const total =
    b?.price_total ?? b?.total_amount ?? b?.total ?? b?.amount ?? 0;

  const currency = b?.currency || b?.meta?.currency || "RWF";

  return { subtotal, driverFee, taxes, total, currency };
}

function statusPill(text, tone = "neutral") {
  const base = "inline-flex items-center px-2 py-0.5 rounded text-xs font-medium";
  const tones = {
    neutral: "bg-slate-900/5 text-slate-700",
    success: "bg-emerald-900/10 text-emerald-700",
    warn: "bg-amber-900/10 text-amber-700",
    danger: "bg-rose-900/10 text-rose-700",
    info: "bg-blue-900/10 text-blue-700",
  };
  return `${base} ${tones[tone] || tones.neutral}`;
}

export default function Booking() {
  const token = useMemo(() => localStorage.getItem("token") || "", []);
  const user = useMemo(() => {
    return (
      safeParse(localStorage.getItem("auth.user")) ||
      safeParse(localStorage.getItem("user")) ||
      null
    );
  }, []);

  const API_BASE = useMemo(() => {
    const raw =
      (import.meta?.env?.VITE_API_URL || import.meta?.env?.VITE_API_BASE || "")
        .trim()
        .replace(/\/+$/, "");
    return raw || "/api";
  }, []);

  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  const [vehicles, setVehicles] = useState([]);
  const [bookings, setBookings] = useState([]);

  // UI filters
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("all");

  // ✅ Modal state
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState(null);

  async function req(url) {
    const res = await fetch(url, {
      headers: {
        Accept: "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    });

    const text = await res.text();
    const json = safeJsonFromText(text);

    if (res.status === 401) {
      throw new Error(json?.message || "Unauthorized. Please login again.");
    }
    if (res.status === 403) {
      throw new Error(json?.message || "Forbidden. You don’t have access.");
    }
    if (!res.ok) {
      const msg =
        json?.message || json?.error || text || `Request failed (${res.status})`;
      throw new Error(`${msg} | URL: ${url}`);
    }
    return json;
  }

  useEffect(() => {
    let alive = true;

    async function load() {
      setLoading(true);
      setErr("");

      try {
        const vRes = await req(`${API_BASE}/showroom/vehicles`);
        const vData = pickData(vRes);
        const vList = Array.isArray(vData)
          ? vData
          : Array.isArray(vData?.data)
          ? vData.data
          : [];

        const bRes = await req(`${API_BASE}/bookings`);
        const bData = pickData(bRes);
        const bList = Array.isArray(bData)
          ? bData
          : Array.isArray(bData?.data)
          ? bData.data
          : [];

        if (!alive) return;

        setVehicles(vList || []);
        setBookings(bList || []);
      } catch (e) {
        if (!alive) return;
        setErr(e?.message || "Failed to load bookings.");
      } finally {
        if (!alive) return;
        setLoading(false);
      }
    }

    load();
    return () => {
      alive = false;
    };
  }, [API_BASE, token]);

  // Map vehicle_id -> vehicle object
  const vehicleMap = useMemo(() => {
    const map = new Map();
    (vehicles || []).forEach((v) => {
      if (v?.id != null) map.set(String(v.id), v);
    });
    return map;
  }, [vehicles]);

  // Owner vehicle IDs
  const ownerVehicleIds = useMemo(() => {
    return new Set((vehicles || []).map((v) => String(v.id)));
  }, [vehicles]);

  // Filter bookings to owner cars only + filters/search
  const ownerBookings = useMemo(() => {
    const list = (bookings || []).filter((b) => {
      const vid = b?.vehicle_id ?? b?.vehicle?.id ?? b?.vehicleId;
      if (vid == null) return false;
      return ownerVehicleIds.has(String(vid));
    });

    const statusFiltered =
      status === "all"
        ? list
        : list.filter((b) => String(b?.status || "").toLowerCase() === status);

    const query = q.trim().toLowerCase();
    if (!query) return statusFiltered;

    return statusFiltered.filter((b) => {
      const vid = b?.vehicle_id ?? b?.vehicle?.id ?? b?.vehicleId;
      const v = vehicleMap.get(String(vid)) || b?.vehicle || null;

      const plate = (v?.plate_no || v?.license_plate || "").toLowerCase();
      const make = (v?.make || "").toLowerCase();
      const model = (v?.model || "").toLowerCase();

      const ci = getCustomerInfo(b);
      const cName = (ci.name || "").toLowerCase();
      const cEmail = (ci.email || "").toLowerCase();
      const cPhone = (ci.phone || "").toLowerCase();

      const ref = String(b?.code || b?.reference || b?.id || "").toLowerCase();

      return (
        plate.includes(query) ||
        make.includes(query) ||
        model.includes(query) ||
        cName.includes(query) ||
        cEmail.includes(query) ||
        cPhone.includes(query) ||
        ref.includes(query)
      );
    });
  }, [bookings, ownerVehicleIds, vehicleMap, q, status]);

  function openInvoice(b) {
    setSelected(b);
    setOpen(true);
  }

  function closeInvoice() {
    setOpen(false);
    setSelected(null);
  }

  // ✅ close on ESC
  useEffect(() => {
    function onKey(e) {
      if (e.key === "Escape") closeInvoice();
    }
    if (open) window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const InvoiceModal = () => {
    if (!open || !selected) return null;

    const b = selected;
    const { invoiceNo } = getInvoiceNumbers(b);
    const ci = getCustomerInfo(b);
    const { pickup, dropoff } = getPickupDropoff(b);

    const vid = b?.vehicle_id ?? b?.vehicle?.id ?? b?.vehicleId;
    const v = vid != null ? vehicleMap.get(String(vid)) || b?.vehicle : b?.vehicle;

    const plate = v?.plate_no || v?.license_plate || "-";
    const carLabel = `${v?.make || ""} ${v?.model || ""}`.trim() || "Vehicle";

    const st = String(b?.status || "pending").toLowerCase();
    const pay = String(b?.payment_status || "unpaid").toLowerCase();

    const { subtotal, driverFee, taxes, total, currency } = getCharges(b);

    const payTone =
      pay === "paid" ? "success" : pay === "partial" ? "warn" : "danger";

    return (
      <div className="fixed inset-0 z-[9999]">
        {/* backdrop */}
        <div
          className="absolute inset-0 bg-black/40"
          onClick={closeInvoice}
        />

        {/* modal */}
        <div className="absolute inset-0 flex items-center justify-center p-4">
          <div className="w-full max-w-3xl rounded-2xl bg-white shadow-xl border border-slate-200 overflow-hidden">
            {/* header */}
            <div className="px-6 py-4 border-b border-slate-200 flex items-start justify-between gap-3">
              <div>
                <div className="text-xs text-slate-500">INVOICE</div>
                <div className="text-xl font-semibold text-slate-900">
                  {invoiceNo}
                </div>
                <div className="mt-1 text-sm text-slate-500">
                  Issued: {fmtDate(b?.created_at || new Date().toISOString())}
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className={statusPill(st, "neutral")}>{st}</span>
                <span className={statusPill(pay, payTone)}>{pay}</span>

                <button
                  onClick={closeInvoice}
                  className="ml-2 h-9 px-3 rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50"
                >
                  ✕ Close
                </button>
              </div>
            </div>

            {/* body */}
            <div className="p-6 space-y-6">
              {/* top info */}
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="rounded-xl border border-slate-200 p-4">
                  <div className="text-xs text-slate-500">Billed From</div>
                  <div className="font-semibold text-slate-900 mt-1">
                    {user?.name || "Showroom Owner"}
                  </div>
                  <div className="text-sm text-slate-600">
                    {user?.email || "-"}
                  </div>
                </div>

                <div className="rounded-xl border border-slate-200 p-4">
                  <div className="text-xs text-slate-500">Billed To</div>
                  <div className="font-semibold text-slate-900 mt-1">
                    {ci.name}
                  </div>
                  <div className="text-sm text-slate-600">
                    {ci.email || "-"}
                    {ci.email && ci.phone ? " • " : ""}
                    {ci.phone || ""}
                  </div>
                </div>
              </div>

              {/* booking & car info */}
              <div className="grid sm:grid-cols-3 gap-4">
                <div className="rounded-xl border border-slate-200 p-4">
                  <div className="text-xs text-slate-500">Car</div>
                  <div className="font-semibold text-slate-900 mt-1">{plate}</div>
                  <div className="text-sm text-slate-600">{carLabel}</div>
                </div>

                <div className="rounded-xl border border-slate-200 p-4">
                  <div className="text-xs text-slate-500">Pick up</div>
                  <div className="font-semibold text-slate-900 mt-1">
                    {fmtDate(pickup)}
                  </div>
                </div>

                <div className="rounded-xl border border-slate-200 p-4">
                  <div className="text-xs text-slate-500">Drop off</div>
                  <div className="font-semibold text-slate-900 mt-1">
                    {fmtDate(dropoff)}
                  </div>
                </div>
              </div>

              {/* invoice table */}
              <div className="rounded-2xl border border-slate-200 overflow-hidden">
                <div className="px-4 py-3 border-b border-slate-200 bg-slate-50 font-medium">
                  Charges
                </div>

                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="text-left text-slate-500">
                      <th className="px-4 py-2">Item</th>
                      <th className="px-4 py-2 text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-t border-slate-100">
                      <td className="px-4 py-2">Rental subtotal</td>
                      <td className="px-4 py-2 text-right">
                        {money(subtotal)} {currency}
                      </td>
                    </tr>

                    <tr className="border-t border-slate-100">
                      <td className="px-4 py-2">Driver fee</td>
                      <td className="px-4 py-2 text-right">
                        {money(driverFee)} {currency}
                      </td>
                    </tr>

                    <tr className="border-t border-slate-100">
                      <td className="px-4 py-2">Taxes</td>
                      <td className="px-4 py-2 text-right">
                        {money(taxes)} {currency}
                      </td>
                    </tr>

                    <tr className="border-t border-slate-200 bg-slate-50">
                      <td className="px-4 py-3 font-semibold text-slate-900">
                        Total to pay
                      </td>
                      <td className="px-4 py-3 text-right font-semibold text-slate-900">
                        {money(total)} {currency}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* footer actions */}
              <div className="flex flex-col sm:flex-row gap-2 sm:items-center sm:justify-between">
                <div className="text-xs text-slate-500">
                  Note: This is a generated invoice preview for booking{" "}
                  <b>{b?.code || `#${b?.id}`}</b>.
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => window.print()}
                    className="h-10 px-4 rounded-lg bg-slate-900 text-white hover:bg-slate-800"
                  >
                    🖨️ Print
                  </button>
                  <button
                    onClick={closeInvoice}
                    className="h-10 px-4 rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Bookings</h1>
          <p className="text-sm text-slate-500">
            Bookings made for <b>your cars</b> (your showroom vehicles) 📅🚗
          </p>
          <p className="text-xs text-slate-400 mt-1">
            API: <b>{API_BASE}</b>
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search by plate, make, model, customer name/email/phone…"
            className="h-10 w-full sm:w-96 rounded-lg border border-slate-200 bg-white px-3 text-sm outline-none focus:ring-2 focus:ring-blue-200"
          />
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm"
          >
            <option value="all">All statuses</option>
            <option value="pending">Pending</option>
            <option value="confirmed">Confirmed</option>
            <option value="active">Active</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>
      </div>

      {loading && (
        <div className="rounded-2xl border border-slate-200 bg-white p-4 text-slate-600">
          Loading bookings...
        </div>
      )}

      {!loading && err && (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-rose-700">
          {err}
          <div className="mt-2 text-sm text-rose-600">
            Tip: This page requires API routes: <b>/api/showroom/vehicles</b> and{" "}
            <b>/api/bookings</b>
          </div>
        </div>
      )}

      {!loading && !err && (
        <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-200 font-medium flex items-center justify-between">
            <span>Booking list</span>
            <span className="text-xs text-slate-500">
              {ownerBookings?.length || 0} booking(s)
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="text-left text-slate-500 bg-slate-50">
                  <th className="px-4 py-2">Booking</th>
                  <th className="px-4 py-2">Car</th>
                  <th className="px-4 py-2">Customer</th>
                  <th className="px-4 py-2">Pick up</th>
                  <th className="px-4 py-2">Drop off</th>
                  <th className="px-4 py-2">Status</th>
                  <th className="px-4 py-2">Payment</th>
                  <th className="px-4 py-2">Total</th>
                </tr>
              </thead>

              <tbody>
                {(ownerBookings || []).slice(0, 50).map((b) => {
                  const vid = b?.vehicle_id ?? b?.vehicle?.id ?? b?.vehicleId;
                  const v = vid != null ? vehicleMap.get(String(vid)) : null;

                  const plate = v?.plate_no || v?.license_plate || "-";
                  const carLabel = `${v?.make || ""} ${v?.model || ""}`.trim();

                  const ci = getCustomerInfo(b);

                  const pickup =
                    b?.pickup_time || b?.pickup_at || b?.start_date || b?.from;
                  const dropoff =
                    b?.dropoff_time || b?.dropoff_at || b?.end_date || b?.to;

                  const st = String(b?.status || "pending").toLowerCase();
                  const pay = String(b?.payment_status || "unpaid").toLowerCase();
                  const total =
                    b?.price_total ?? b?.total_amount ?? b?.total ?? b?.amount ?? null;

                  return (
                    <tr
                      key={b.id || `${vid}-${pickup}-${dropoff}`}
                      onClick={() => openInvoice(b)}
                      className="border-t border-slate-100 cursor-pointer hover:bg-slate-50"
                      title="Click to view invoice"
                    >
                      <td className="px-4 py-2">
                        <div className="font-medium text-slate-800">
                          {b?.code || `#${b?.id || "-"}`}
                        </div>
                        <div className="text-xs text-slate-500">
                          {fmtDate(b?.created_at)}
                        </div>
                      </td>

                      <td className="px-4 py-2">
                        <div className="font-medium text-slate-800">{plate}</div>
                        <div className="text-xs text-slate-500">
                          {carLabel || "Vehicle"}
                        </div>
                      </td>

                      <td className="px-4 py-2">
                        <div className="font-medium text-slate-800">{ci.name}</div>
                        {(ci.email || ci.phone) && (
                          <div className="text-xs text-slate-500">
                            {ci.email}
                            {ci.email && ci.phone ? " • " : ""}
                            {ci.phone}
                          </div>
                        )}
                      </td>

                      <td className="px-4 py-2">{fmtDate(pickup)}</td>
                      <td className="px-4 py-2">{fmtDate(dropoff)}</td>

                      <td className="px-4 py-2">
                        <span className={statusPill(st, "neutral")}>{st}</span>
                      </td>

                      <td className="px-4 py-2">
                        <span
                          className={statusPill(
                            pay,
                            pay === "paid" ? "success" : pay === "partial" ? "warn" : "danger"
                          )}
                        >
                          {pay}
                        </span>
                      </td>

                      <td className="px-4 py-2">{money(total)}</td>
                    </tr>
                  );
                })}

                {(!ownerBookings || ownerBookings.length === 0) && (
                  <tr>
                    <td
                      colSpan={8}
                      className="px-4 py-8 text-center text-slate-500"
                    >
                      No bookings yet for your cars 📭
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {ownerBookings?.length > 50 && (
            <div className="px-4 py-3 border-t border-slate-200 text-sm text-slate-600">
              Showing first 50 bookings (add pagination if you want).
            </div>
          )}
        </div>
      )}

      {/* ✅ Modal */}
      <InvoiceModal />
    </div>
  );
}