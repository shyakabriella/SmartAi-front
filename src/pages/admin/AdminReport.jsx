// src/pages/admin/AdminReport.jsx
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

function yyyyMmDd(d) {
  const x = d instanceof Date ? d : new Date();
  const yyyy = x.getFullYear();
  const mm = String(x.getMonth() + 1).padStart(2, "0");
  const dd = String(x.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
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

// booking time fields (your backend: pickup_time, dropoff_time)
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

function normalizeStatus(x) {
  return String(x || "").toLowerCase().trim();
}

function getTotalAmount(b) {
  // your backend uses price_total
  return (
    b?.price_total ??
    b?.total_amount ??
    b?.total ??
    b?.amount ??
    b?.price ??
    0
  );
}

// ✅ Determine vehicle owner id from booking.vehicle
function getVehicleOwnerId(b) {
  const v = b?.vehicle || null;
  return (
    v?.owner_id ??
    v?.user_id ??
    v?.created_by ??
    v?.ownerId ??
    null
  );
}

// ✅ commission rate per showroom (fallbacks)
function getShowroomCommissionRate(profile, globalRate) {
  const direct =
    profile?.commission_rate ??
    profile?.commissionRate ??
    profile?.meta?.commission_rate ??
    profile?.meta?.commissionRate ??
    null;

  const n = Number(direct);
  if (!Number.isNaN(n) && n > 0) return n;

  return globalRate;
}

export default function AdminReport() {
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

  const [profiles, setProfiles] = useState([]); // showroom profiles (admin can see all)
  const [bookings, setBookings] = useState([]);

  // filters
  const today = useMemo(() => new Date(), []);
  const [to, setTo] = useState(yyyyMmDd(today));

  const defaultFrom = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return yyyyMmDd(d);
  }, []);
  const [from, setFrom] = useState(defaultFrom);

  const [status, setStatus] = useState("all"); // booking status
  const [payment, setPayment] = useState("all"); // paid/unpaid/all
  const [showroomOwnerId, setShowroomOwnerId] = useState("all"); // filter by showroom

  const [q, setQ] = useState(""); // search showroom name/owner/email

  // commission config
  const [globalCommissionRate, setGlobalCommissionRate] = useState(0.1); // 10% default
  const [commissionOverrides, setCommissionOverrides] = useState({}); // { [ownerId]: number }

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

  // fetch ALL pages from a Laravel paginator
  async function fetchAllPaginated(endpoint, { maxPages = 50 } = {}) {
    const all = [];
    let page = 1;

    // if endpoint already contains ?, append with &page=, else ?page=
    const joiner = endpoint.includes("?") ? "&" : "?";

    for (let i = 0; i < maxPages; i++) {
      const url = `${endpoint}${joiner}page=${page}`;
      const json = await req(url);

      // if not paginator, just return it
      if (!json || typeof json !== "object" || !("data" in json)) {
        const list = pickData(json);
        return Array.isArray(list) ? list : [];
      }

      const chunk = Array.isArray(json.data) ? json.data : [];
      all.push(...chunk);

      const last = Number(json.last_page || 1);
      if (page >= last) break;

      page += 1;
    }

    return all;
  }

  useEffect(() => {
    let alive = true;

    async function load() {
      setLoading(true);
      setErr("");

      try {
        // 1) Showroom profiles (admin gets all)
        const prof = await fetchAllPaginated(`${API_BASE}/showroom/profiles`, { maxPages: 50 });

        // 2) Bookings (admin gets all)
        const b = await fetchAllPaginated(`${API_BASE}/bookings`, { maxPages: 50 });

        if (!alive) return;

        setProfiles(Array.isArray(prof) ? prof : []);
        setBookings(Array.isArray(b) ? b : []);
      } catch (e) {
        if (!alive) return;
        setErr(e?.message || "Failed to load admin report.");
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

  const rangeStart = useMemo(() => toStartOfDay(from), [from]);
  const rangeEnd = useMemo(() => toEndOfDay(to), [to]);

  // map owner_id -> showroom profile
  const profileByOwnerId = useMemo(() => {
    const map = new Map();
    (profiles || []).forEach((p) => {
      const ownerId = p?.owner_id ?? p?.owner?.id ?? null;
      if (ownerId != null) map.set(String(ownerId), p);
    });
    return map;
  }, [profiles]);

  // showroom options for filter (owner_id)
  const showroomOptions = useMemo(() => {
    const arr = (profiles || []).map((p) => {
      const ownerId = p?.owner_id ?? p?.owner?.id ?? null;
      const name = p?.name || p?.title || "Showroom";
      const ownerName = p?.owner?.name || p?.owner?.email || "";
      return {
        key: ownerId != null ? String(ownerId) : "",
        label: `${name}${ownerName ? ` • ${ownerName}` : ""}`,
      };
    });

    // unique
    const seen = new Set();
    const uniq = [];
    for (const x of arr) {
      if (!x.key) continue;
      if (seen.has(x.key)) continue;
      seen.add(x.key);
      uniq.push(x);
    }

    uniq.sort((a, b) => a.label.localeCompare(b.label));
    return uniq;
  }, [profiles]);

  // filtered bookings (range + status/payment + optional showroom)
  const bookingsInRange = useMemo(() => {
    const list = (bookings || []).filter((b) => {
      const s = getBookingStart(b);
      const e = getBookingEnd(b);
      if (!overlapsRange(s, e, rangeStart, rangeEnd)) return false;

      const st = normalizeStatus(b?.status || "");
      if (status !== "all" && st !== status) return false;

      const pay = normalizeStatus(b?.payment_status || "unpaid");
      if (payment !== "all") {
        if (payment === "paid" && pay !== "paid") return false;
        if (payment === "unpaid" && pay === "paid") return false;
      }

      if (showroomOwnerId !== "all") {
        const ownerId = getVehicleOwnerId(b);
        if (ownerId == null) return false;
        if (String(ownerId) !== String(showroomOwnerId)) return false;
      }

      return true;
    });

    return list;
  }, [bookings, rangeStart, rangeEnd, status, payment, showroomOwnerId]);

  // currency
  const currency = useMemo(() => {
    return bookingsInRange?.[0]?.currency || "RWF";
  }, [bookingsInRange]);

  // build showroom aggregates
  const showroomRows = useMemo(() => {
    // ownerId -> agg
    const map = new Map();

    function ensure(ownerIdStr) {
      if (!map.has(ownerIdStr)) {
        const profile = profileByOwnerId.get(ownerIdStr) || null;

        const showroomName = profile?.name || profile?.title || "Showroom";
        const ownerName = profile?.owner?.name || profile?.owner?.email || "";
        const ownerEmail = profile?.owner?.email || "";
        const ownerPhone = profile?.owner?.phone || "";

        map.set(ownerIdStr, {
          ownerId: ownerIdStr,
          showroomName,
          ownerName,
          ownerEmail,
          ownerPhone,
          bookingsCount: 0,
          cancelledCount: 0,
          paidCount: 0,
          unpaidCount: 0,
          paidRevenue: 0,
          unpaidRevenue: 0,
          totalRevenue: 0,
        });
      }
      return map.get(ownerIdStr);
    }

    // group bookings by vehicle owner_id
    for (const b of bookingsInRange || []) {
      const ownerId = getVehicleOwnerId(b);
      const ownerIdStr = ownerId != null ? String(ownerId) : "__unknown__";
      const agg = ensure(ownerIdStr);

      const st = normalizeStatus(b?.status || "pending");
      const pay = normalizeStatus(b?.payment_status || "unpaid");
      const total = Number(getTotalAmount(b) || 0);

      agg.bookingsCount += 1;
      if (st === "cancelled") agg.cancelledCount += 1;

      // usually you don't want cancelled to count in revenue
      const includeRevenue = st !== "cancelled";

      if (includeRevenue) {
        agg.totalRevenue += total;
        if (pay === "paid") {
          agg.paidCount += 1;
          agg.paidRevenue += total;
        } else {
          agg.unpaidCount += 1;
          agg.unpaidRevenue += total;
        }
      }
    }

    // turn map to list + compute commission
    const rows = Array.from(map.values()).map((r) => {
      const ownerKey = r.ownerId;

      const profile = ownerKey !== "__unknown__" ? profileByOwnerId.get(ownerKey) : null;

      const override = commissionOverrides?.[ownerKey];
      const baseRate =
        override != null && !Number.isNaN(Number(override)) && Number(override) >= 0
          ? Number(override)
          : getShowroomCommissionRate(profile, globalCommissionRate);

      const rate = Math.max(0, Number(baseRate || 0));

      return {
        ...r,
        commissionRate: rate,
        commissionPaid: r.paidRevenue * rate,
        commissionUnpaid: r.unpaidRevenue * rate,
        commissionTotal: r.totalRevenue * rate,
      };
    });

    // filter by search (showroom name / owner / email)
    const query = q.trim().toLowerCase();
    const filtered = !query
      ? rows
      : rows.filter((x) => {
          const a = String(x.showroomName || "").toLowerCase();
          const b = String(x.ownerName || "").toLowerCase();
          const c = String(x.ownerEmail || "").toLowerCase();
          return a.includes(query) || b.includes(query) || c.includes(query);
        });

    // sort biggest revenue first
    filtered.sort((a, b) => (b.paidRevenue || 0) - (a.paidRevenue || 0));
    return filtered;
  }, [
    bookingsInRange,
    profileByOwnerId,
    commissionOverrides,
    globalCommissionRate,
    q,
  ]);

  // totals
  const totals = useMemo(() => {
    const t = {
      showrooms: showroomRows.length,
      bookings: 0,
      paidRevenue: 0,
      unpaidRevenue: 0,
      totalRevenue: 0,
      commissionPaid: 0,
      commissionUnpaid: 0,
      commissionTotal: 0,
    };

    showroomRows.forEach((r) => {
      t.bookings += Number(r.bookingsCount || 0);
      t.paidRevenue += Number(r.paidRevenue || 0);
      t.unpaidRevenue += Number(r.unpaidRevenue || 0);
      t.totalRevenue += Number(r.totalRevenue || 0);
      t.commissionPaid += Number(r.commissionPaid || 0);
      t.commissionUnpaid += Number(r.commissionUnpaid || 0);
      t.commissionTotal += Number(r.commissionTotal || 0);
    });

    return t;
  }, [showroomRows]);

  function onPrint() {
    window.print();
  }

  function setOverride(ownerId, val) {
    const v = Number(val);
    setCommissionOverrides((prev) => ({
      ...prev,
      [ownerId]: Number.isNaN(v) ? 0 : v,
    }));
  }

  function clearOverride(ownerId) {
    setCommissionOverrides((prev) => {
      const next = { ...prev };
      delete next[ownerId];
      return next;
    });
  }

  return (
    <div className="space-y-6">
      {/* Print styles */}
      <style>{`
        @media print {
          .no-print { display: none !important; }
          .print-area { padding: 0 !important; }
          body { background: white !important; }
          table { page-break-inside: auto; }
          tr { page-break-inside: avoid; page-break-after: auto; }
          thead { display: table-header-group; }
          tfoot { display: table-footer-group; }
        }
      `}</style>

      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-3 no-print">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">AdminReport</h1>
          <p className="text-sm text-slate-500">
            Showroom bookings + revenue + commission per showroom 📈🏢
          </p>
          <p className="text-xs text-slate-400 mt-1">
            API: <b>{API_BASE}</b>
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-2">
          <button
            onClick={onPrint}
            className="h-10 px-4 rounded-lg bg-slate-900 text-white hover:bg-slate-800"
          >
            🖨️ Print / Save PDF
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4 no-print">
        <div className="grid lg:grid-cols-6 gap-3">
          <div>
            <div className="text-xs text-slate-500 mb-1">From</div>
            <input
              type="date"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm"
            />
          </div>

          <div>
            <div className="text-xs text-slate-500 mb-1">To</div>
            <input
              type="date"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm"
            />
          </div>

          <div>
            <div className="text-xs text-slate-500 mb-1">Booking Status</div>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm"
            >
              <option value="all">All</option>
              <option value="pending">Pending</option>
              <option value="confirmed">Confirmed</option>
              <option value="active">Active</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>

          <div>
            <div className="text-xs text-slate-500 mb-1">Payment</div>
            <select
              value={payment}
              onChange={(e) => setPayment(e.target.value)}
              className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm"
            >
              <option value="all">All</option>
              <option value="paid">Paid only</option>
              <option value="unpaid">Unpaid only</option>
            </select>
          </div>

          <div>
            <div className="text-xs text-slate-500 mb-1">Showroom</div>
            <select
              value={showroomOwnerId}
              onChange={(e) => setShowroomOwnerId(e.target.value)}
              className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm"
            >
              <option value="all">All showrooms</option>
              {showroomOptions.map((x) => (
                <option key={x.key} value={x.key}>
                  {x.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <div className="text-xs text-slate-500 mb-1">Search</div>
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Showroom / owner / email…"
              className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm outline-none focus:ring-2 focus:ring-blue-200"
            />
          </div>
        </div>

        <div className="mt-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="text-xs text-slate-500">
            Report range: <b>{from}</b> → <b>{to}</b>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500">Global commission rate</span>
            <input
              type="number"
              step="0.01"
              value={globalCommissionRate}
              onChange={(e) => setGlobalCommissionRate(Number(e.target.value || 0))}
              className="h-10 w-28 rounded-lg border border-slate-200 bg-white px-3 text-sm"
            />
            <span className="text-xs text-slate-400">
              (ex: 0.10 = 10%)
            </span>
          </div>
        </div>
      </div>

      {loading && (
        <div className="rounded-2xl border border-slate-200 bg-white p-4 text-slate-600">
          Loading admin report...
        </div>
      )}

      {!loading && err && (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-rose-700">
          {err}
          <div className="mt-2 text-sm text-rose-600">
            Required routes: <b>/api/showroom/profiles</b> and <b>/api/bookings</b>
          </div>
        </div>
      )}

      {!loading && !err && (
        <div className="print-area space-y-6">
          {/* Print header */}
          <div className="hidden print:block">
            <div className="text-xl font-semibold text-slate-900">Admin Report</div>
            <div className="text-sm text-slate-600">
              Range: <b>{from}</b> → <b>{to}</b> • Currency: <b>{currency}</b>
            </div>
            <div className="text-xs text-slate-500 mt-1">
              Generated: {fmtDate(new Date())}
              {user?.email ? ` • By: ${user.email}` : ""}
            </div>
            <hr className="my-3" />
          </div>

          {/* Summary */}
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="rounded-2xl border border-slate-200 bg-white p-4">
              <div className="text-xs text-slate-500">Showrooms</div>
              <div className="text-2xl font-semibold text-slate-900 mt-1">
                {totals.showrooms}
              </div>
              <div className="text-xs text-slate-400 mt-1">
                Bookings: {totals.bookings}
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-4">
              <div className="text-xs text-slate-500">Paid Revenue</div>
              <div className="text-2xl font-semibold text-slate-900 mt-1">
                {money(totals.paidRevenue)}{" "}
                <span className="text-sm text-slate-500">{currency}</span>
              </div>
              <div className="text-xs text-slate-400 mt-1">
                payment_status = paid
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-4">
              <div className="text-xs text-slate-500">Unpaid Amount</div>
              <div className="text-2xl font-semibold text-slate-900 mt-1">
                {money(totals.unpaidRevenue)}{" "}
                <span className="text-sm text-slate-500">{currency}</span>
              </div>
              <div className="text-xs text-slate-400 mt-1">
                payment_status ≠ paid
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-4">
              <div className="text-xs text-slate-500">Commission (Paid)</div>
              <div className="text-2xl font-semibold text-slate-900 mt-1">
                {money(totals.commissionPaid)}{" "}
                <span className="text-sm text-slate-500">{currency}</span>
              </div>
              <div className="text-xs text-slate-400 mt-1">
                Based on showroom rate
              </div>
            </div>
          </div>

          {/* Table */}
          <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-200 font-medium flex items-center justify-between">
              <span>Commission per Showroom</span>
              <span className="text-xs text-slate-500">
                Range: <b>{from}</b> → <b>{to}</b>
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="text-left text-slate-500 bg-slate-50">
                    <th className="px-4 py-2">Showroom</th>
                    <th className="px-4 py-2">Owner</th>
                    <th className="px-4 py-2 text-right">Bookings</th>
                    <th className="px-4 py-2 text-right">Paid Revenue</th>
                    <th className="px-4 py-2 text-right">Unpaid</th>
                    <th className="px-4 py-2 text-right">Rate</th>
                    <th className="px-4 py-2 text-right">Commission (Paid)</th>
                    <th className="px-4 py-2 text-right">Commission (Unpaid)</th>
                  </tr>
                </thead>

                <tbody>
                  {showroomRows.map((r) => {
                    const isUnknown = r.ownerId === "__unknown__";
                    return (
                      <tr key={r.ownerId} className="border-t border-slate-100">
                        <td className="px-4 py-2">
                          <div className="font-medium text-slate-900">
                            {isUnknown ? "Unknown / No showroom" : r.showroomName}
                          </div>
                          <div className="text-xs text-slate-500">
                            Cancelled: {r.cancelledCount}
                          </div>
                        </td>

                        <td className="px-4 py-2">
                          <div className="font-medium text-slate-800">
                            {r.ownerName || "-"}
                          </div>
                          <div className="text-xs text-slate-500">
                            {r.ownerEmail}
                            {r.ownerEmail && r.ownerPhone ? " • " : ""}
                            {r.ownerPhone}
                          </div>
                        </td>

                        <td className="px-4 py-2 text-right">
                          {r.bookingsCount}
                        </td>

                        <td className="px-4 py-2 text-right">
                          {money(r.paidRevenue)} {currency}
                        </td>

                        <td className="px-4 py-2 text-right">
                          {money(r.unpaidRevenue)} {currency}
                        </td>

                        <td className="px-4 py-2 text-right">
                          <div className="flex items-center justify-end gap-2 no-print">
                            <input
                              disabled={isUnknown}
                              type="number"
                              step="0.01"
                              value={
                                commissionOverrides?.[r.ownerId] ?? r.commissionRate
                              }
                              onChange={(e) =>
                                setOverride(r.ownerId, e.target.value)
                              }
                              className="h-9 w-24 rounded-lg border border-slate-200 bg-white px-2 text-sm"
                              title="Commission rate (example: 0.10 = 10%)"
                            />
                            {!!commissionOverrides?.[r.ownerId] && (
                              <button
                                disabled={isUnknown}
                                onClick={() => clearOverride(r.ownerId)}
                                className="h-9 px-2 rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50"
                                title="Use showroom/default rate again"
                              >
                                ↺
                              </button>
                            )}
                          </div>

                          {/* Print view */}
                          <div className="hidden print:block text-right">
                            {(r.commissionRate ?? 0).toFixed(2)}
                          </div>
                        </td>

                        <td className="px-4 py-2 text-right">
                          {money(r.commissionPaid)} {currency}
                        </td>

                        <td className="px-4 py-2 text-right">
                          {money(r.commissionUnpaid)} {currency}
                        </td>
                      </tr>
                    );
                  })}

                  {showroomRows.length === 0 && (
                    <tr>
                      <td colSpan={8} className="px-4 py-10 text-center text-slate-500">
                        No data in this range.
                      </td>
                    </tr>
                  )}
                </tbody>

                <tfoot>
                  <tr className="border-t border-slate-200 bg-slate-50">
                    <td className="px-4 py-3 font-semibold text-slate-900" colSpan={2}>
                      Totals
                    </td>
                    <td className="px-4 py-3 text-right font-semibold text-slate-900">
                      {totals.bookings}
                    </td>
                    <td className="px-4 py-3 text-right font-semibold text-slate-900">
                      {money(totals.paidRevenue)} {currency}
                    </td>
                    <td className="px-4 py-3 text-right font-semibold text-slate-900">
                      {money(totals.unpaidRevenue)} {currency}
                    </td>
                    <td className="px-4 py-3 text-right text-slate-500">—</td>
                    <td className="px-4 py-3 text-right font-semibold text-slate-900">
                      {money(totals.commissionPaid)} {currency}
                    </td>
                    <td className="px-4 py-3 text-right font-semibold text-slate-900">
                      {money(totals.commissionUnpaid)} {currency}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>

            <div className="px-4 py-3 border-t border-slate-200 text-xs text-slate-500">
              Note: Revenue excludes <b>cancelled</b> bookings. Commission is calculated from revenue × rate.
            </div>
          </div>
        </div>
      )}
    </div>
  );
}