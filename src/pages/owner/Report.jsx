// src/pages/owner/Reports.jsx
import { useEffect, useMemo, useRef, useState } from "react";

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

function money(x) {
  if (x === null || x === undefined || x === "") return "-";
  const n = Number(x);
  if (Number.isNaN(n)) return String(x);
  return n.toLocaleString();
}

function fmtDate(x) {
  if (!x) return "-";
  const d = new Date(x);
  if (Number.isNaN(d.getTime())) return String(x);
  return d.toLocaleString();
}

function toStartOfDay(dateStr) {
  if (!dateStr) return null;
  return new Date(`${dateStr}T00:00:00`);
}

function toEndOfDay(dateStr) {
  if (!dateStr) return null;
  return new Date(`${dateStr}T23:59:59.999`);
}

function parseDate(x) {
  if (!x) return null;
  const d = new Date(x);
  return Number.isNaN(d.getTime()) ? null : d;
}

function getBookingStart(b) {
  return (
    parseDate(b?.pickup_time) ||
    parseDate(b?.pickup_at) ||
    parseDate(b?.start_date) ||
    parseDate(b?.from) ||
    null
  );
}

function getBookingEnd(b) {
  return (
    parseDate(b?.dropoff_time) ||
    parseDate(b?.dropoff_at) ||
    parseDate(b?.end_date) ||
    parseDate(b?.to) ||
    null
  );
}

function overlapsRange(start, end, rangeStart, rangeEnd) {
  if (!start) return false;
  const s = start.getTime();
  const e = (end || start).getTime();

  const rs = rangeStart ? rangeStart.getTime() : -Infinity;
  const re = rangeEnd ? rangeEnd.getTime() : Infinity;

  return s <= re && e >= rs;
}

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

function getVehicleId(b) {
  return b?.vehicle_id ?? b?.vehicle?.id ?? b?.vehicleId ?? null;
}

function getTotalAmount(b) {
  return (
    b?.price_total ??
    b?.total_amount ??
    b?.total ??
    b?.amount ??
    b?.price ??
    0
  );
}

function normalizeStatus(x) {
  return String(x || "").toLowerCase().trim();
}

function getMaintenanceAmount(m) {
  const val =
    m?.cost ??
    m?.amount ??
    m?.total_cost ??
    m?.price ??
    m?.fee ??
    m?.meta?.cost ??
    0;
  const n = Number(val);
  return Number.isNaN(n) ? 0 : n;
}

function getMaintenanceDate(m) {
  return (
    parseDate(m?.service_date) ||
    parseDate(m?.date) ||
    parseDate(m?.created_at) ||
    parseDate(m?.updated_at) ||
    null
  );
}

function formatYMD(d = new Date()) {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

export default function Reports() {
  const printRef = useRef(null);

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
  const [maintenance, setMaintenance] = useState([]);

  // ✅ Date range default: last 30 days
  const todayStr = useMemo(() => formatYMD(new Date()), []);
  const defaultFromStr = useMemo(() => {
    const t = new Date();
    t.setDate(t.getDate() - 30);
    return formatYMD(t);
  }, []);

  const [from, setFrom] = useState(defaultFromStr);
  const [to, setTo] = useState(todayStr);

  async function req(url) {
    const res = await fetch(url, {
      headers: {
        Accept: "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    });

    const text = await res.text();
    const json = safeJsonFromText(text);

    if (res.status === 401) throw new Error(json?.message || "Unauthorized. Please login again.");
    if (res.status === 403) throw new Error(json?.message || "Forbidden. You don’t have access.");

    if (!res.ok) {
      const msg = json?.message || json?.error || text || `Request failed (${res.status})`;
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

        let mList = [];
        try {
          const mRes = await req(`${API_BASE}/maintenance-records`);
          const mData = pickData(mRes);
          mList = Array.isArray(mData)
            ? mData
            : Array.isArray(mData?.data)
            ? mData.data
            : [];
        } catch {
          mList = [];
        }

        if (!alive) return;

        setVehicles(vList || []);
        setBookings(bList || []);
        setMaintenance(mList || []);
      } catch (e) {
        if (!alive) return;
        setErr(e?.message || "Failed to load reports.");
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

  // ✅ Printing (Save as PDF)
  const onPrint = () => {
    // Print whole page, but only the report area will appear (via @media print CSS below)
    window.print();
  };

  // Vehicle maps / ids
  const vehicleMap = useMemo(() => {
    const map = new Map();
    (vehicles || []).forEach((v) => {
      if (v?.id != null) map.set(String(v.id), v);
    });
    return map;
  }, [vehicles]);

  const ownerVehicleIds = useMemo(() => {
    return new Set((vehicles || []).map((v) => String(v.id)));
  }, [vehicles]);

  const rangeStart = useMemo(() => toStartOfDay(from), [from]);
  const rangeEnd = useMemo(() => toEndOfDay(to), [to]);

  const ownerBookings = useMemo(() => {
    return (bookings || []).filter((b) => {
      const vid = getVehicleId(b);
      if (vid == null) return false;
      return ownerVehicleIds.has(String(vid));
    });
  }, [bookings, ownerVehicleIds]);

  const bookingsInRange = useMemo(() => {
    return (ownerBookings || []).filter((b) => {
      const s = getBookingStart(b);
      const e = getBookingEnd(b);
      return overlapsRange(s, e, rangeStart, rangeEnd);
    });
  }, [ownerBookings, rangeStart, rangeEnd]);

  const now = useMemo(() => new Date(), []);
  const currentlyRentedVehicleIds = useMemo(() => {
    const set = new Set();
    (ownerBookings || []).forEach((b) => {
      const st = normalizeStatus(b?.status);
      if (st === "cancelled") return;

      const s = getBookingStart(b);
      const e = getBookingEnd(b) || s;
      if (!s || !e) return;

      if (s.getTime() <= now.getTime() && e.getTime() >= now.getTime()) {
        const vid = getVehicleId(b);
        if (vid != null) set.add(String(vid));
      }
    });
    return set;
  }, [ownerBookings, now]);

  const rentedVehicleIdsInRange = useMemo(() => {
    const set = new Set();
    (bookingsInRange || []).forEach((b) => {
      const st = normalizeStatus(b?.status);
      if (st === "cancelled") return;

      const vid = getVehicleId(b);
      if (vid != null) set.add(String(vid));
    });
    return set;
  }, [bookingsInRange]);

  const currency = useMemo(() => {
    return bookingsInRange?.[0]?.currency || "RWF";
  }, [bookingsInRange]);

  const paidRevenue = useMemo(() => {
    return (bookingsInRange || []).reduce((sum, b) => {
      const st = normalizeStatus(b?.status);
      if (st === "cancelled") return sum;

      const pay = normalizeStatus(b?.payment_status);
      if (pay !== "paid") return sum;

      return sum + Number(getTotalAmount(b) || 0);
    }, 0);
  }, [bookingsInRange]);

  const unpaidBookings = useMemo(() => {
    return (bookingsInRange || []).filter((b) => {
      const st = normalizeStatus(b?.status);
      if (st === "cancelled") return false;

      const pay = normalizeStatus(b?.payment_status);
      return pay !== "paid";
    });
  }, [bookingsInRange]);

  const unpaidAmount = useMemo(() => {
    return (unpaidBookings || []).reduce(
      (sum, b) => sum + Number(getTotalAmount(b) || 0),
      0
    );
  }, [unpaidBookings]);

  const ownerMaintenanceInRange = useMemo(() => {
    return (maintenance || []).filter((m) => {
      const vid = m?.vehicle_id ?? m?.vehicle?.id ?? null;
      if (vid == null) return false;
      if (!ownerVehicleIds.has(String(vid))) return false;

      const d = getMaintenanceDate(m);
      if (!d) return true;
      return overlapsRange(d, d, rangeStart, rangeEnd);
    });
  }, [maintenance, ownerVehicleIds, rangeStart, rangeEnd]);

  const expenses = useMemo(() => {
    return (ownerMaintenanceInRange || []).reduce(
      (sum, m) => sum + getMaintenanceAmount(m),
      0
    );
  }, [ownerMaintenanceInRange]);

  const net = useMemo(() => paidRevenue - expenses, [paidRevenue, expenses]);
  const profit = useMemo(() => (net >= 0 ? net : 0), [net]);
  const loss = useMemo(() => (net < 0 ? Math.abs(net) : 0), [net]);

  const topVehicles = useMemo(() => {
    const map = new Map();
    (bookingsInRange || []).forEach((b) => {
      const st = normalizeStatus(b?.status);
      if (st === "cancelled") return;

      const pay = normalizeStatus(b?.payment_status);
      if (pay !== "paid") return;

      const vid = getVehicleId(b);
      if (vid == null) return;

      const key = String(vid);
      map.set(key, (map.get(key) || 0) + Number(getTotalAmount(b) || 0));
    });

    const arr = Array.from(map.entries()).map(([vid, rev]) => {
      const v = vehicleMap.get(vid);
      return {
        vid,
        rev,
        plate: v?.plate_no || v?.license_plate || vid,
        label: `${v?.make || ""} ${v?.model || ""}`.trim() || "Vehicle",
      };
    });

    arr.sort((a, b) => b.rev - a.rev);
    return arr.slice(0, 8);
  }, [bookingsInRange, vehicleMap]);

  const outstandingList = useMemo(() => {
    const list = (unpaidBookings || []).map((b) => {
      const vid = getVehicleId(b);
      const v = vid != null ? vehicleMap.get(String(vid)) : null;

      const ci = getCustomerInfo(b);
      const s = getBookingStart(b);
      const e = getBookingEnd(b);

      return {
        id: b?.id,
        code: b?.code || `#${b?.id || "-"}`,
        customer: ci.name,
        email: ci.email,
        phone: ci.phone,
        plate: v?.plate_no || v?.license_plate || "-",
        car: `${v?.make || ""} ${v?.model || ""}`.trim() || "Vehicle",
        pickup: s ? fmtDate(s) : "-",
        dropoff: e ? fmtDate(e) : "-",
        status: normalizeStatus(b?.status || "pending"),
        payment: normalizeStatus(b?.payment_status || "unpaid"),
        total: getTotalAmount(b),
      };
    });

    list.sort((a, b) => Number(b.total || 0) - Number(a.total || 0));
    return list.slice(0, 25);
  }, [unpaidBookings, vehicleMap]);

  const printedAt = useMemo(() => fmtDate(new Date()), []);

  return (
    <div className="space-y-6">
      {/* ✅ Print styles */}
      <style>{`
        @media print {
          /* Hide everything by default */
          body * { visibility: hidden !important; }

          /* Only show report area */
          #report-print-area, #report-print-area * { visibility: visible !important; }

          /* Position report at top-left for printing */
          #report-print-area {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
          }

          /* Hide print button + inputs on print */
          .no-print { display: none !important; }

          /* Better print colors */
          * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }

          /* Page margins */
          @page { margin: 12mm; }

          /* Avoid page breaks in cards/tables */
          .print-avoid-break { break-inside: avoid; page-break-inside: avoid; }
        }
      `}</style>

      {/* Header + controls */}
      <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-3 no-print">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Owner Reports</h1>
          <p className="text-sm text-slate-500">
            Print this report as PDF: click <b>Print / Save PDF</b>
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-2">
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500">From</span>
            <input
              type="date"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm"
            />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500">To</span>
            <input
              type="date"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm"
            />
          </div>

          <button
            onClick={onPrint}
            className="h-10 px-4 rounded-lg bg-slate-900 text-white hover:bg-slate-800"
          >
            🖨️ Print / Save PDF
          </button>
        </div>
      </div>

      {loading && (
        <div className="rounded-2xl border border-slate-200 bg-white p-4 text-slate-600">
          Loading reports...
        </div>
      )}

      {!loading && err && (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-rose-700">
          {err}
          <div className="mt-2 text-sm text-rose-600">
            Tip: Make sure these routes work: <b>/api/showroom/vehicles</b>,{" "}
            <b>/api/bookings</b>, <b>/api/maintenance-records</b>
          </div>
        </div>
      )}

      {!loading && !err && (
        <div id="report-print-area" ref={printRef} className="space-y-6">
          {/* ✅ Print-only header */}
          <div className="hidden print:block">
            <div className="text-xl font-semibold text-slate-900">SmartCar AI — Owner Report</div>
            <div className="text-sm text-slate-600 mt-1">
              Owner: <b>{user?.name || user?.email || "Owner"}</b> • Range: <b>{from}</b> → <b>{to}</b>
            </div>
            <div className="text-xs text-slate-500 mt-1">Printed at: {printedAt}</div>
            <hr className="my-3" />
          </div>

          {/* Summary cards */}
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3 print-avoid-break">
            <div className="rounded-2xl border border-slate-200 bg-white p-4">
              <div className="text-xs text-slate-500">Total cars in showroom</div>
              <div className="text-2xl font-semibold text-slate-900 mt-1">
                {vehicles?.length || 0}
              </div>
              <div className="text-xs text-slate-400 mt-1">
                Owner: {user?.name || user?.email || "Owner"}
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-4">
              <div className="text-xs text-slate-500">Rented cars (in range)</div>
              <div className="text-2xl font-semibold text-slate-900 mt-1">
                {rentedVehicleIdsInRange.size}
              </div>
              <div className="text-xs text-slate-400 mt-1">
                Bookings in range: {bookingsInRange.length}
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-4">
              <div className="text-xs text-slate-500">Earnings (paid)</div>
              <div className="text-2xl font-semibold text-slate-900 mt-1">
                {money(paidRevenue)}{" "}
                <span className="text-sm text-slate-500">{currency}</span>
              </div>
              <div className="text-xs text-slate-400 mt-1">
                Only payment_status = paid
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-4">
              <div className="text-xs text-slate-500">Rented but NOT paid</div>
              <div className="text-2xl font-semibold text-slate-900 mt-1">
                {unpaidBookings.length}
              </div>
              <div className="text-xs text-slate-400 mt-1">
                Amount: <b>{money(unpaidAmount)} {currency}</b>
              </div>
            </div>
          </div>

          {/* Profit/Loss */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 print-avoid-break">
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
              <div>
                <div className="text-lg font-semibold text-slate-900">
                  Profit & Loss Report
                </div>
                <div className="text-sm text-slate-500 mt-1">
                  Profit = <b>Paid revenue</b> − <b>Expenses</b>
                </div>
                <div className="text-xs text-slate-400 mt-1">
                  Note: Expenses are from <b>maintenance-records</b> only.
                </div>
              </div>

              <div className="text-xs text-slate-500">
                Currently rented cars (right now):{" "}
                <b className="text-slate-900">{currentlyRentedVehicleIds.size}</b>
              </div>
            </div>

            <div className="grid sm:grid-cols-3 gap-3 mt-4">
              <div className="rounded-xl border border-slate-200 p-4">
                <div className="text-xs text-slate-500">Expenses (maintenance)</div>
                <div className="text-xl font-semibold text-slate-900 mt-1">
                  {money(expenses)}{" "}
                  <span className="text-sm text-slate-500">{currency}</span>
                </div>
              </div>

              <div className="rounded-xl border border-slate-200 p-4">
                <div className="text-xs text-slate-500">Net (Revenue − Expenses)</div>
                <div className="text-xl font-semibold text-slate-900 mt-1">
                  {money(net)}{" "}
                  <span className="text-sm text-slate-500">{currency}</span>
                </div>
              </div>

              <div className="rounded-xl border border-slate-200 p-4">
                <div className="text-xs text-slate-500">Result</div>
                <div className="text-xl font-semibold text-slate-900 mt-1">
                  {profit > 0 ? (
                    <>
                      ✅ Profit: {money(profit)}{" "}
                      <span className="text-sm text-slate-500">{currency}</span>
                    </>
                  ) : loss > 0 ? (
                    <>
                      ⚠️ Loss: {money(loss)}{" "}
                      <span className="text-sm text-slate-500">{currency}</span>
                    </>
                  ) : (
                    <>0</>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Top vehicles */}
          <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden print-avoid-break">
            <div className="px-4 py-3 border-b border-slate-200 font-medium flex items-center justify-between">
              <span>Top cars by paid earnings (range)</span>
              <span className="text-xs text-slate-500">
                Showing {topVehicles.length} car(s)
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="text-left text-slate-500 bg-slate-50">
                    <th className="px-4 py-2">Plate</th>
                    <th className="px-4 py-2">Car</th>
                    <th className="px-4 py-2 text-right">Paid Revenue</th>
                  </tr>
                </thead>
                <tbody>
                  {topVehicles.map((x) => (
                    <tr key={x.vid} className="border-t border-slate-100">
                      <td className="px-4 py-2 font-medium text-slate-800">{x.plate}</td>
                      <td className="px-4 py-2">{x.label}</td>
                      <td className="px-4 py-2 text-right">
                        {money(x.rev)} {currency}
                      </td>
                    </tr>
                  ))}

                  {topVehicles.length === 0 && (
                    <tr>
                      <td colSpan={3} className="px-4 py-8 text-center text-slate-500">
                        No paid bookings in this range.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Outstanding */}
          <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-200 font-medium flex items-center justify-between">
              <span>Rented but not paid (top 25)</span>
              <span className="text-xs text-slate-500">
                {unpaidBookings.length} unpaid booking(s)
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="text-left text-slate-500 bg-slate-50">
                    <th className="px-4 py-2">Booking</th>
                    <th className="px-4 py-2">Customer</th>
                    <th className="px-4 py-2">Car</th>
                    <th className="px-4 py-2">Pick up</th>
                    <th className="px-4 py-2">Drop off</th>
                    <th className="px-4 py-2">Status</th>
                    <th className="px-4 py-2">Payment</th>
                    <th className="px-4 py-2 text-right">Total</th>
                  </tr>
                </thead>

                <tbody>
                  {outstandingList.map((x) => (
                    <tr key={x.id || x.code} className="border-t border-slate-100">
                      <td className="px-4 py-2 font-medium text-slate-800">{x.code}</td>
                      <td className="px-4 py-2">
                        <div className="font-medium text-slate-800">{x.customer}</div>
                        <div className="text-xs text-slate-500">
                          {x.email}
                          {x.email && x.phone ? " • " : ""}
                          {x.phone}
                        </div>
                      </td>
                      <td className="px-4 py-2">
                        <div className="font-medium text-slate-800">{x.plate}</div>
                        <div className="text-xs text-slate-500">{x.car}</div>
                      </td>
                      <td className="px-4 py-2">{x.pickup}</td>
                      <td className="px-4 py-2">{x.dropoff}</td>
                      <td className="px-4 py-2">{x.status}</td>
                      <td className="px-4 py-2">{x.payment}</td>
                      <td className="px-4 py-2 text-right">
                        {money(x.total)} {currency}
                      </td>
                    </tr>
                  ))}

                  {outstandingList.length === 0 && (
                    <tr>
                      <td colSpan={8} className="px-4 py-8 text-center text-slate-500">
                        No unpaid bookings in this range ✅
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <div className="px-4 py-3 border-t border-slate-200 text-xs text-slate-500">
              Range: <b>{from}</b> → <b>{to}</b> • Paid revenue uses{" "}
              <b>payment_status = paid</b>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}