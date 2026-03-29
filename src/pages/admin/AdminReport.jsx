// src/pages/admin/AdminReport.jsx
import { useEffect, useMemo, useState } from "react";

const TOKEN_KEYS = ["token", "access_token", "auth_token", "smartcar_token"];

function getStoredToken() {
  if (typeof window === "undefined") return "";
  for (const k of TOKEN_KEYS) {
    const v = window.localStorage.getItem(k);
    if (v && String(v).trim()) return String(v).trim();
  }
  return "";
}

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

function pickArray(payload) {
  if (!payload) return [];
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.data?.data)) return payload.data.data;
  if (Array.isArray(payload?.items)) return payload.items;
  return [];
}

function money(x, currency = "RWF") {
  if (x === null || x === undefined || x === "") return "-";
  const n = Number(x);
  if (Number.isNaN(n)) return String(x);
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(n);
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

function normalizeStatus(x) {
  return String(x || "").toLowerCase().trim();
}

function pretty(x) {
  if (!x) return "-";
  return String(x)
    .replaceAll("_", " ")
    .replace(/\b\w/g, (m) => m.toUpperCase());
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function getBookingStart(b) {
  return (
    parseDate(b?.pickup_time) ||
    parseDate(b?.pickup_at) ||
    parseDate(b?.trip_date) ||
    parseDate(b?.created_at) ||
    null
  );
}

function getBookingEnd(b) {
  return (
    parseDate(b?.dropoff_time) ||
    parseDate(b?.dropoff_at) ||
    parseDate(b?.trip_date) ||
    parseDate(b?.created_at) ||
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

function inCreatedRange(item, rangeStart, rangeEnd) {
  const d = parseDate(item?.created_at);
  if (!d) return true;
  const x = d.getTime();
  const rs = rangeStart ? rangeStart.getTime() : -Infinity;
  const re = rangeEnd ? rangeEnd.getTime() : Infinity;
  return x >= rs && x <= re;
}

function getTotalAmount(b) {
  return (
    b?.estimated_total ??
    b?.price_total ??
    b?.total_amount ??
    b?.total ??
    b?.amount ??
    b?.price ??
    0
  );
}

function getVehicleOwnerId(b) {
  const v = b?.vehicle || null;
  return v?.owner_id ?? v?.user_id ?? b?.owner_id ?? null;
}

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

function buildTableHtml(headers, rows) {
  return `
    <table>
      <thead>
        <tr>
          ${headers.map((h) => `<th>${escapeHtml(h)}</th>`).join("")}
        </tr>
      </thead>
      <tbody>
        ${
          rows.length
            ? rows
                .map(
                  (row) => `
              <tr>
                ${row.map((cell) => `<td>${escapeHtml(cell)}</td>`).join("")}
              </tr>
            `
                )
                .join("")
            : `<tr><td colspan="${headers.length}" style="text-align:center;color:#64748b">No data</td></tr>`
        }
      </tbody>
    </table>
  `;
}

export default function AdminReport() {
  const token = useMemo(() => getStoredToken(), []);
  const user = useMemo(() => {
    return (
      safeParse(localStorage.getItem("auth.user")) ||
      safeParse(localStorage.getItem("user")) ||
      null
    );
  }, []);

  const API_BASE = useMemo(() => {
    const raw =
      (
        import.meta?.env?.VITE_API_BASE_URL ||
        import.meta?.env?.VITE_API_URL ||
        import.meta?.env?.VITE_API ||
        ""
      )
        .trim()
        .replace(/\/+$/, "");
    return raw || "/api";
  }, []);

  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  const [profiles, setProfiles] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [bookings, setBookings] = useState([]);

  const today = useMemo(() => new Date(), []);
  const [to, setTo] = useState(yyyyMmDd(today));
  const defaultFrom = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return yyyyMmDd(d);
  }, []);
  const [from, setFrom] = useState(defaultFrom);

  const [status, setStatus] = useState("all");
  const [payment, setPayment] = useState("all");
  const [showroomOwnerId, setShowroomOwnerId] = useState("all");
  const [q, setQ] = useState("");

  const [globalCommissionRate, setGlobalCommissionRate] = useState(0.1);
  const [commissionOverrides, setCommissionOverrides] = useState({});

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
    if (res.status === 403) throw new Error(json?.message || "Forbidden. You do not have access.");
    if (!res.ok) {
      const msg = json?.message || json?.error || text || `Request failed (${res.status})`;
      throw new Error(`${msg} | URL: ${url}`);
    }
    return json;
  }

  async function fetchAllPaginated(endpoint, { maxPages = 50 } = {}) {
    const all = [];
    let page = 1;
    const joiner = endpoint.includes("?") ? "&" : "?";

    for (let i = 0; i < maxPages; i++) {
      const url = `${endpoint}${joiner}page=${page}`;
      const json = await req(url);

      if (!json || typeof json !== "object" || !("data" in json)) {
        return pickArray(json);
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
        const [prof, veh, cust, drv, book] = await Promise.all([
          fetchAllPaginated(`${API_BASE}/showroom/profiles`, { maxPages: 50 }),
          fetchAllPaginated(`${API_BASE}/vehicles`, { maxPages: 50 }),
          fetchAllPaginated(`${API_BASE}/customers`, { maxPages: 50 }),
          fetchAllPaginated(`${API_BASE}/drivers`, { maxPages: 50 }),
          fetchAllPaginated(`${API_BASE}/bookings`, { maxPages: 50 }),
        ]);

        if (!alive) return;

        setProfiles(Array.isArray(prof) ? prof : []);
        setVehicles(Array.isArray(veh) ? veh : []);
        setCustomers(Array.isArray(cust) ? cust : []);
        setDrivers(Array.isArray(drv) ? drv : []);
        setBookings(Array.isArray(book) ? book : []);
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

  const profileByOwnerId = useMemo(() => {
    const map = new Map();
    profiles.forEach((p) => {
      const ownerId = p?.owner_id ?? p?.owner?.id ?? null;
      if (ownerId != null) map.set(String(ownerId), p);
    });
    return map;
  }, [profiles]);

  const showroomOptions = useMemo(() => {
    const arr = profiles.map((p) => {
      const ownerId = p?.owner_id ?? p?.owner?.id ?? null;
      const name = p?.name || p?.title || "Showroom";
      const ownerName = p?.owner?.name || p?.owner?.email || "";
      return {
        key: ownerId != null ? String(ownerId) : "",
        label: `${name}${ownerName ? ` • ${ownerName}` : ""}`,
      };
    });

    const seen = new Set();
    const uniq = [];
    for (const x of arr) {
      if (!x.key || seen.has(x.key)) continue;
      seen.add(x.key);
      uniq.push(x);
    }

    uniq.sort((a, b) => a.label.localeCompare(b.label));
    return uniq;
  }, [profiles]);

  const filteredBookings = useMemo(() => {
    return bookings.filter((b) => {
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
        if (ownerId == null || String(ownerId) !== String(showroomOwnerId)) return false;
      }

      const query = q.trim().toLowerCase();
      if (!query) return true;

      const customerName =
        b?.customer?.user?.name || b?.customer?.name || b?.customer_name || "";
      const carLabel =
        b?.vehicle?.display_name || b?.car_label || b?.vehicle?.make || "";
      const destination = b?.destination || "";
      const ownerName = b?.owner_name || "";
      return [customerName, carLabel, destination, ownerName]
        .join(" ")
        .toLowerCase()
        .includes(query);
    });
  }, [bookings, rangeStart, rangeEnd, status, payment, showroomOwnerId, q]);

  const filteredVehicles = useMemo(() => {
    return vehicles.filter((v) => {
      if (!inCreatedRange(v, rangeStart, rangeEnd)) return false;
      if (showroomOwnerId !== "all") {
        const ownerId = v?.owner_id ?? v?.user_id ?? null;
        if (ownerId == null || String(ownerId) !== String(showroomOwnerId)) return false;
      }

      const query = q.trim().toLowerCase();
      if (!query) return true;

      const label =
        v?.display_name ||
        [v?.year, v?.make, v?.model].filter(Boolean).join(" ") ||
        v?.plate_no ||
        "";
      return [label, v?.plate_no, v?.make, v?.model, v?.status]
        .join(" ")
        .toLowerCase()
        .includes(query);
    });
  }, [vehicles, rangeStart, rangeEnd, showroomOwnerId, q]);

  const filteredCustomers = useMemo(() => {
    return customers.filter((c) => {
      if (!inCreatedRange(c, rangeStart, rangeEnd)) return false;
      const query = q.trim().toLowerCase();
      if (!query) return true;

      const name = c?.user?.name || c?.name || c?.customer_name || "";
      const email = c?.user?.email || c?.email || "";
      const phone = c?.user?.phone || c?.phone || "";
      return [name, email, phone, c?.document_no, c?.status]
        .join(" ")
        .toLowerCase()
        .includes(query);
    });
  }, [customers, rangeStart, rangeEnd, q]);

  const filteredDrivers = useMemo(() => {
    return drivers.filter((d) => {
      if (!inCreatedRange(d, rangeStart, rangeEnd)) return false;
      const query = q.trim().toLowerCase();
      if (!query) return true;

      const name = d?.name || d?.full_name || d?.user?.name || "";
      const email = d?.email || d?.user?.email || "";
      const phone = d?.phone || d?.user?.phone || "";
      const license = d?.license_no || d?.license_number || "";
      return [name, email, phone, license, d?.status]
        .join(" ")
        .toLowerCase()
        .includes(query);
    });
  }, [drivers, rangeStart, rangeEnd, q]);

  const showroomRows = useMemo(() => {
    const map = new Map();

    function ensure(ownerIdStr) {
      if (!map.has(ownerIdStr)) {
        const profile = profileByOwnerId.get(ownerIdStr) || null;
        map.set(ownerIdStr, {
          ownerId: ownerIdStr,
          showroomName: profile?.name || profile?.title || "Showroom",
          ownerName: profile?.owner?.name || profile?.owner?.email || "",
          ownerEmail: profile?.owner?.email || "",
          ownerPhone: profile?.owner?.phone || "",
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

    for (const b of filteredBookings) {
      const ownerId = getVehicleOwnerId(b);
      const ownerIdStr = ownerId != null ? String(ownerId) : "__unknown__";
      const agg = ensure(ownerIdStr);

      const st = normalizeStatus(b?.status || "pending");
      const pay = normalizeStatus(b?.payment_status || "unpaid");
      const total = Number(getTotalAmount(b) || 0);

      agg.bookingsCount += 1;
      if (st === "cancelled") agg.cancelledCount += 1;

      if (st !== "cancelled") {
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

    return Array.from(map.values())
      .map((r) => {
        const profile = r.ownerId !== "__unknown__" ? profileByOwnerId.get(r.ownerId) : null;
        const override = commissionOverrides?.[r.ownerId];
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
      })
      .sort((a, b) => (b.totalRevenue || 0) - (a.totalRevenue || 0));
  }, [filteredBookings, profileByOwnerId, commissionOverrides, globalCommissionRate]);

  const currency = useMemo(() => {
    return filteredBookings?.[0]?.currency || "RWF";
  }, [filteredBookings]);

  const totals = useMemo(() => {
    return {
      showrooms: showroomRows.length,
      vehicles: filteredVehicles.length,
      customers: filteredCustomers.length,
      drivers: filteredDrivers.length,
      bookings: filteredBookings.length,
      paidRevenue: showroomRows.reduce((a, r) => a + Number(r.paidRevenue || 0), 0),
      unpaidRevenue: showroomRows.reduce((a, r) => a + Number(r.unpaidRevenue || 0), 0),
      totalRevenue: showroomRows.reduce((a, r) => a + Number(r.totalRevenue || 0), 0),
      commissionPaid: showroomRows.reduce((a, r) => a + Number(r.commissionPaid || 0), 0),
      commissionUnpaid: showroomRows.reduce((a, r) => a + Number(r.commissionUnpaid || 0), 0),
    };
  }, [showroomRows, filteredVehicles, filteredCustomers, filteredDrivers, filteredBookings]);

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

  function downloadPdf() {
    const summaryCards = `
      <div class="cards">
        <div class="card"><div class="label">Showrooms</div><div class="value">${totals.showrooms}</div></div>
        <div class="card"><div class="label">Vehicles</div><div class="value">${totals.vehicles}</div></div>
        <div class="card"><div class="label">Customers</div><div class="value">${totals.customers}</div></div>
        <div class="card"><div class="label">Drivers</div><div class="value">${totals.drivers}</div></div>
        <div class="card"><div class="label">Bookings</div><div class="value">${totals.bookings}</div></div>
        <div class="card"><div class="label">Paid Revenue</div><div class="value">${money(totals.paidRevenue, currency)}</div></div>
        <div class="card"><div class="label">Commission Paid</div><div class="value">${money(totals.commissionPaid, currency)}</div></div>
      </div>
    `;

    const showroomTable = buildTableHtml(
      ["Showroom", "Owner", "Bookings", "Paid Revenue", "Unpaid", "Rate", "Commission Paid"],
      showroomRows.map((r) => [
        r.ownerId === "__unknown__" ? "Unknown / No showroom" : r.showroomName,
        r.ownerName || "-",
        r.bookingsCount,
        `${money(r.paidRevenue, currency)}`,
        `${money(r.unpaidRevenue, currency)}`,
        r.commissionRate?.toFixed(2),
        `${money(r.commissionPaid, currency)}`,
      ])
    );

    const vehicleTable = buildTableHtml(
      ["Plate", "Vehicle", "Status", "Type", "Owner ID", "Created"],
      filteredVehicles.map((v) => [
        v?.plate_no || v?.license_plate || "-",
        v?.display_name || [v?.year, v?.make, v?.model].filter(Boolean).join(" ") || "-",
        pretty(v?.status),
        v?.type?.name || v?.vehicle_type?.name || "-",
        v?.owner_id ?? v?.user_id ?? "-",
        fmtDate(v?.created_at),
      ])
    );

    const customerTable = buildTableHtml(
      ["Name", "Email", "Phone", "Status", "Document No", "Created"],
      filteredCustomers.map((c) => [
        c?.user?.name || c?.name || c?.customer_name || "-",
        c?.user?.email || c?.email || "-",
        c?.user?.phone || c?.phone || "-",
        pretty(c?.status),
        c?.document_no || "-",
        fmtDate(c?.created_at),
      ])
    );

    const driverTable = buildTableHtml(
      ["Name", "Email", "Phone", "Status", "License", "Created"],
      filteredDrivers.map((d) => [
        d?.name || d?.full_name || d?.user?.name || "-",
        d?.email || d?.user?.email || "-",
        d?.phone || d?.user?.phone || "-",
        pretty(d?.status || "active"),
        d?.license_no || d?.license_number || "-",
        fmtDate(d?.created_at),
      ])
    );

    const bookingTable = buildTableHtml(
      ["Customer", "Vehicle", "Destination", "Status", "Payment", "Total", "Date"],
      filteredBookings.map((b) => [
        b?.customer?.user?.name || b?.customer?.name || b?.customer_name || "-",
        b?.vehicle?.display_name || b?.car_label || "-",
        b?.destination || "-",
        pretty(b?.status),
        pretty(b?.payment_status || "unpaid"),
        money(getTotalAmount(b), currency),
        fmtDate(b?.trip_date || b?.pickup_time || b?.created_at),
      ])
    );

    const html = `
      <html>
        <head>
          <title>Admin Report</title>
          <style>
            * { box-sizing: border-box; }
            body { font-family: Arial, sans-serif; color: #0f172a; margin: 24px; }
            h1 { margin: 0 0 8px; font-size: 28px; }
            h2 { margin: 28px 0 10px; font-size: 18px; }
            p { margin: 4px 0; color: #475569; }
            .cards {
              display: grid;
              grid-template-columns: repeat(3, 1fr);
              gap: 12px;
              margin-top: 20px;
            }
            .card {
              border: 1px solid #e2e8f0;
              border-radius: 14px;
              padding: 14px;
            }
            .label { font-size: 12px; color: #64748b; margin-bottom: 6px; }
            .value { font-size: 20px; font-weight: 700; color: #0f172a; }
            table {
              width: 100%;
              border-collapse: collapse;
              margin-top: 12px;
              font-size: 12px;
            }
            th, td {
              border: 1px solid #e2e8f0;
              padding: 8px 10px;
              text-align: left;
              vertical-align: top;
            }
            th {
              background: #f8fafc;
              color: #475569;
              font-weight: 700;
            }
            .meta {
              margin-top: 10px;
              font-size: 12px;
              color: #64748b;
            }
            @media print {
              body { margin: 18px; }
              h2 { page-break-after: avoid; }
              table { page-break-inside: auto; }
              tr { page-break-inside: avoid; page-break-after: auto; }
              thead { display: table-header-group; }
            }
          </style>
        </head>
        <body>
          <h1>Admin Report</h1>
          <p><b>Range:</b> ${escapeHtml(from)} → ${escapeHtml(to)}</p>
          <p><b>Generated:</b> ${escapeHtml(fmtDate(new Date()))}</p>
          <p><b>User:</b> ${escapeHtml(user?.email || user?.name || "Admin")}</p>

          ${summaryCards}

          <h2>Showroom Revenue & Commission</h2>
          ${showroomTable}

          <h2>Vehicle Report</h2>
          ${vehicleTable}

          <h2>Customer Report</h2>
          ${customerTable}

          <h2>Driver Report</h2>
          ${driverTable}

          <h2>Booking Report</h2>
          ${bookingTable}
        </body>
      </html>
    `;

    const win = window.open("", "_blank", "width=1200,height=900");
    if (!win) {
      window.print();
      return;
    }

    win.document.open();
    win.document.write(html);
    win.document.close();
    win.focus();

    setTimeout(() => {
      win.print();
    }, 500);
  }

  return (
    <div className="space-y-6">
      <style>{`
        @media print {
          .no-print { display: none !important; }
        }
      `}</style>

      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between no-print">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Admin Report</h1>
          <p className="text-sm text-slate-500">
            Full report for showroom, vehicle, customer, driver and booking 📄
          </p>
          <p className="mt-1 text-xs text-slate-400">
            API: <b>{API_BASE}</b>
          </p>
        </div>

        <div className="flex gap-2">
          <button
            onClick={downloadPdf}
            className="h-10 rounded-lg bg-slate-900 px-4 text-white hover:bg-slate-800"
          >
            📄 Download PDF
          </button>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-4 no-print">
        <div className="grid gap-3 lg:grid-cols-6">
          <div>
            <div className="mb-1 text-xs text-slate-500">From</div>
            <input
              type="date"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm"
            />
          </div>

          <div>
            <div className="mb-1 text-xs text-slate-500">To</div>
            <input
              type="date"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm"
            />
          </div>

          <div>
            <div className="mb-1 text-xs text-slate-500">Booking Status</div>
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
            <div className="mb-1 text-xs text-slate-500">Payment</div>
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
            <div className="mb-1 text-xs text-slate-500">Showroom</div>
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
            <div className="mb-1 text-xs text-slate-500">Search</div>
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search report..."
              className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm outline-none focus:ring-2 focus:ring-blue-200"
            />
          </div>
        </div>

        <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
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
            <span className="text-xs text-slate-400">(0.10 = 10%)</span>
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
        </div>
      )}

      {!loading && !err && (
        <div className="space-y-6">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5">
            <div className="rounded-2xl border border-slate-200 bg-white p-4">
              <div className="text-xs text-slate-500">Showrooms</div>
              <div className="mt-1 text-2xl font-semibold text-slate-900">{totals.showrooms}</div>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-4">
              <div className="text-xs text-slate-500">Vehicles</div>
              <div className="mt-1 text-2xl font-semibold text-slate-900">{totals.vehicles}</div>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-4">
              <div className="text-xs text-slate-500">Customers</div>
              <div className="mt-1 text-2xl font-semibold text-slate-900">{totals.customers}</div>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-4">
              <div className="text-xs text-slate-500">Drivers</div>
              <div className="mt-1 text-2xl font-semibold text-slate-900">{totals.drivers}</div>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-4">
              <div className="text-xs text-slate-500">Bookings</div>
              <div className="mt-1 text-2xl font-semibold text-slate-900">{totals.bookings}</div>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-4">
              <div className="text-xs text-slate-500">Paid Revenue</div>
              <div className="mt-1 text-2xl font-semibold text-slate-900">
                {money(totals.paidRevenue, currency)}
              </div>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-4">
              <div className="text-xs text-slate-500">Unpaid Revenue</div>
              <div className="mt-1 text-2xl font-semibold text-slate-900">
                {money(totals.unpaidRevenue, currency)}
              </div>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-4">
              <div className="text-xs text-slate-500">Commission Paid</div>
              <div className="mt-1 text-2xl font-semibold text-slate-900">
                {money(totals.commissionPaid, currency)}
              </div>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-4">
              <div className="text-xs text-slate-500">Commission Unpaid</div>
              <div className="mt-1 text-2xl font-semibold text-slate-900">
                {money(totals.commissionUnpaid, currency)}
              </div>
            </div>
          </div>

          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
            <div className="border-b border-slate-200 px-4 py-3 font-medium">
              Showroom Revenue & Commission
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="bg-slate-50 text-left text-slate-500">
                    <th className="px-4 py-2">Showroom</th>
                    <th className="px-4 py-2">Owner</th>
                    <th className="px-4 py-2 text-right">Bookings</th>
                    <th className="px-4 py-2 text-right">Paid Revenue</th>
                    <th className="px-4 py-2 text-right">Unpaid</th>
                    <th className="px-4 py-2 text-right">Rate</th>
                    <th className="px-4 py-2 text-right">Commission Paid</th>
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
                          <div className="font-medium text-slate-800">{r.ownerName || "-"}</div>
                          <div className="text-xs text-slate-500">{r.ownerEmail || "-"}</div>
                        </td>

                        <td className="px-4 py-2 text-right">{r.bookingsCount}</td>
                        <td className="px-4 py-2 text-right">{money(r.paidRevenue, currency)}</td>
                        <td className="px-4 py-2 text-right">{money(r.unpaidRevenue, currency)}</td>

                        <td className="px-4 py-2 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <input
                              disabled={isUnknown}
                              type="number"
                              step="0.01"
                              value={commissionOverrides?.[r.ownerId] ?? r.commissionRate}
                              onChange={(e) => setOverride(r.ownerId, e.target.value)}
                              className="h-9 w-24 rounded-lg border border-slate-200 bg-white px-2 text-sm"
                            />
                            {!!commissionOverrides?.[r.ownerId] && (
                              <button
                                disabled={isUnknown}
                                onClick={() => clearOverride(r.ownerId)}
                                className="h-9 rounded-lg border border-slate-200 px-2 text-slate-700 hover:bg-slate-50"
                              >
                                ↺
                              </button>
                            )}
                          </div>
                        </td>

                        <td className="px-4 py-2 text-right">{money(r.commissionPaid, currency)}</td>
                      </tr>
                    );
                  })}

                  {showroomRows.length === 0 && (
                    <tr>
                      <td colSpan={7} className="px-4 py-8 text-center text-slate-500">
                        No showroom data in this range.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
            <div className="border-b border-slate-200 px-4 py-3 font-medium">Vehicle Report</div>
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="bg-slate-50 text-left text-slate-500">
                    <th className="px-4 py-2">Plate</th>
                    <th className="px-4 py-2">Vehicle</th>
                    <th className="px-4 py-2">Status</th>
                    <th className="px-4 py-2">Type</th>
                    <th className="px-4 py-2">Owner ID</th>
                    <th className="px-4 py-2">Created</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredVehicles.map((v) => (
                    <tr key={v?.id} className="border-t border-slate-100">
                      <td className="px-4 py-2">{v?.plate_no || v?.license_plate || "-"}</td>
                      <td className="px-4 py-2 font-medium text-slate-800">
                        {v?.display_name || [v?.year, v?.make, v?.model].filter(Boolean).join(" ") || "-"}
                      </td>
                      <td className="px-4 py-2">{pretty(v?.status)}</td>
                      <td className="px-4 py-2">{v?.type?.name || v?.vehicle_type?.name || "-"}</td>
                      <td className="px-4 py-2">{v?.owner_id ?? v?.user_id ?? "-"}</td>
                      <td className="px-4 py-2">{fmtDate(v?.created_at)}</td>
                    </tr>
                  ))}

                  {filteredVehicles.length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-4 py-8 text-center text-slate-500">
                        No vehicle data in this range.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
            <div className="border-b border-slate-200 px-4 py-3 font-medium">Customer Report</div>
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="bg-slate-50 text-left text-slate-500">
                    <th className="px-4 py-2">Name</th>
                    <th className="px-4 py-2">Email</th>
                    <th className="px-4 py-2">Phone</th>
                    <th className="px-4 py-2">Status</th>
                    <th className="px-4 py-2">Document No</th>
                    <th className="px-4 py-2">Created</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredCustomers.map((c) => (
                    <tr key={c?.id} className="border-t border-slate-100">
                      <td className="px-4 py-2 font-medium text-slate-800">
                        {c?.user?.name || c?.name || c?.customer_name || "-"}
                      </td>
                      <td className="px-4 py-2">{c?.user?.email || c?.email || "-"}</td>
                      <td className="px-4 py-2">{c?.user?.phone || c?.phone || "-"}</td>
                      <td className="px-4 py-2">{pretty(c?.status)}</td>
                      <td className="px-4 py-2">{c?.document_no || "-"}</td>
                      <td className="px-4 py-2">{fmtDate(c?.created_at)}</td>
                    </tr>
                  ))}

                  {filteredCustomers.length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-4 py-8 text-center text-slate-500">
                        No customer data in this range.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
            <div className="border-b border-slate-200 px-4 py-3 font-medium">Driver Report</div>
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="bg-slate-50 text-left text-slate-500">
                    <th className="px-4 py-2">Name</th>
                    <th className="px-4 py-2">Email</th>
                    <th className="px-4 py-2">Phone</th>
                    <th className="px-4 py-2">Status</th>
                    <th className="px-4 py-2">License</th>
                    <th className="px-4 py-2">Created</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredDrivers.map((d) => (
                    <tr key={d?.id} className="border-t border-slate-100">
                      <td className="px-4 py-2 font-medium text-slate-800">
                        {d?.name || d?.full_name || d?.user?.name || "-"}
                      </td>
                      <td className="px-4 py-2">{d?.email || d?.user?.email || "-"}</td>
                      <td className="px-4 py-2">{d?.phone || d?.user?.phone || "-"}</td>
                      <td className="px-4 py-2">{pretty(d?.status || "active")}</td>
                      <td className="px-4 py-2">{d?.license_no || d?.license_number || "-"}</td>
                      <td className="px-4 py-2">{fmtDate(d?.created_at)}</td>
                    </tr>
                  ))}

                  {filteredDrivers.length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-4 py-8 text-center text-slate-500">
                        No driver data in this range.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
            <div className="border-b border-slate-200 px-4 py-3 font-medium">Booking Report</div>
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="bg-slate-50 text-left text-slate-500">
                    <th className="px-4 py-2">Customer</th>
                    <th className="px-4 py-2">Vehicle</th>
                    <th className="px-4 py-2">Destination</th>
                    <th className="px-4 py-2">Status</th>
                    <th className="px-4 py-2">Payment</th>
                    <th className="px-4 py-2">Total</th>
                    <th className="px-4 py-2">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredBookings.map((b) => (
                    <tr key={b?.id} className="border-t border-slate-100">
                      <td className="px-4 py-2 font-medium text-slate-800">
                        {b?.customer?.user?.name || b?.customer?.name || b?.customer_name || "-"}
                      </td>
                      <td className="px-4 py-2">
                        {b?.vehicle?.display_name || b?.car_label || "-"}
                      </td>
                      <td className="px-4 py-2">{b?.destination || "-"}</td>
                      <td className="px-4 py-2">{pretty(b?.status)}</td>
                      <td className="px-4 py-2">{pretty(b?.payment_status || "unpaid")}</td>
                      <td className="px-4 py-2">{money(getTotalAmount(b), currency)}</td>
                      <td className="px-4 py-2">{fmtDate(b?.trip_date || b?.pickup_time || b?.created_at)}</td>
                    </tr>
                  ))}

                  {filteredBookings.length === 0 && (
                    <tr>
                      <td colSpan={7} className="px-4 py-8 text-center text-slate-500">
                        No booking data in this range.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}