// src/pages/customer/CustomerBookings.jsx
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  AlertTriangle,
  CalendarDays,
  Car,
  Clock3,
  CreditCard,
  RefreshCw,
} from "lucide-react";

const API_BASE =
  import.meta.env.VITE_API_BASE_URL ||
  import.meta.env.VITE_API_URL ||
  import.meta.env.VITE_API ||
  "";

const TOKEN_KEYS = ["token", "access_token", "auth_token", "smartcar_token"];

function getStoredToken() {
  if (typeof window === "undefined") return "";
  for (const k of TOKEN_KEYS) {
    const v = window.localStorage.getItem(k);
    if (v && String(v).trim()) return String(v).trim();
  }
  return "";
}

function normalizeList(payload) {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.data?.data)) return payload.data.data;
  if (Array.isArray(payload?.bookings)) return payload.bookings;
  if (Array.isArray(payload?.items)) return payload.items;
  return [];
}

function extractErrorMessage(json) {
  const msg =
    json?.message ||
    json?.error ||
    json?.data?.error ||
    json?.data?.message ||
    "";

  const errors =
    json?.errors ||
    json?.data?.errors ||
    (json?.data && typeof json.data === "object" ? json.data.errors : null);

  const list =
    errors && typeof errors === "object"
      ? Object.values(errors).flat().filter(Boolean)
      : [];

  return (list.length ? list.join(", ") : msg) || "Request failed. Please try again.";
}

async function apiRequest(path, { token = "" } = {}) {
  const api = String(API_BASE || "").replace(/\/+$/, "");
  if (!api) throw new Error("Missing API base URL. Set VITE_API_URL in .env");

  const res = await fetch(`${api}${path}`, {
    headers: {
      Accept: "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });

  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(extractErrorMessage(json));
    err.status = res.status;
    throw err;
  }
  return json;
}

function toJsDate(value) {
  if (!value) return null;
  const s = String(value);
  const d = new Date(s.includes(" ") ? s.replace(" ", "T") : s);
  return Number.isNaN(d.getTime()) ? null : d;
}

function formatDateTime(value) {
  const d = toJsDate(value);
  if (!d) return "—";
  try {
    return new Intl.DateTimeFormat(undefined, {
      year: "numeric",
      month: "short",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    }).format(d);
  } catch {
    return d.toLocaleString();
  }
}

function formatMoney(amount, currency = "RWF") {
  const n = Number(amount || 0);
  if (Number.isNaN(n)) return `${currency} 0`;
  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency,
      maximumFractionDigits: 0,
    }).format(n);
  } catch {
    return `${currency} ${Math.round(n)}`;
  }
}

function bookingCode(b) {
  return b?.code || b?.booking_code || b?.reference || b?.id || "—";
}

function bookingTitle(b) {
  return (
    b?.car_label ||
    b?.vehicle?.display_name ||
    b?.vehicle?.name ||
    b?.vehicle_name ||
    "Vehicle Booking"
  );
}

function bookingStatus(b) {
  return b?.status || b?.booking_status || b?.state || b?.payment_status || "pending";
}

function bookingAmount(b) {
  return b?.estimated_total || b?.price_total || b?.total || b?.amount_total || 0;
}

function pickupValue(b) {
  return b?.departure || b?.pickup_location || b?.pickup || "—";
}

function dropoffValue(b) {
  return b?.destination || b?.dropoff_location || b?.dropoff || "—";
}

function pickupTimeValue(b) {
  return (
    b?.pickup_time ||
    b?.pickup_at ||
    b?.start_time ||
    b?.pickup_datetime ||
    b?.trip_date ||
    b?.created_at ||
    null
  );
}

function dropoffTimeValue(b) {
  return (
    b?.dropoff_time ||
    b?.dropoff_at ||
    b?.end_time ||
    b?.dropoff_datetime ||
    b?.trip_date ||
    b?.created_at ||
    null
  );
}

function isUpcoming(booking) {
  const end = toJsDate(dropoffTimeValue(booking));
  if (!end) return false;
  return end.getTime() > Date.now();
}

function isPaidBooking(b) {
  const s = String(b?.payment_status || b?.status || bookingStatus(b) || "").toLowerCase();
  return s.includes("paid") || s.includes("success") || s.includes("completed");
}

function isPendingBooking(b) {
  const s = String(bookingStatus(b) || "").toLowerCase();
  return s.includes("pending") || s.includes("request") || s.includes("new");
}

function statusPillClass(status) {
  const s = String(status || "").toLowerCase();
  if (
    s.includes("paid") ||
    s.includes("confirmed") ||
    s.includes("active") ||
    s.includes("accepted") ||
    s.includes("ongoing")
  ) {
    return "bg-emerald-50 text-emerald-700 border-emerald-200";
  }
  if (s.includes("cancel") || s.includes("failed") || s.includes("reject")) {
    return "bg-rose-50 text-rose-700 border-rose-200";
  }
  if (s.includes("complete") || s.includes("done") || s.includes("finished")) {
    return "bg-slate-50 text-slate-700 border-slate-200";
  }
  return "bg-amber-50 text-amber-800 border-amber-200";
}

function pretty(value) {
  return String(value || "pending")
    .replaceAll("_", " ")
    .replace(/\b\w/g, (m) => m.toUpperCase());
}

function StatCard({ icon, label, value }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-slate-700">
          {icon}
          <span className="text-xs font-semibold">{label}</span>
        </div>
        <span className="text-lg font-semibold text-slate-900">{value}</span>
      </div>
    </div>
  );
}

function BookingCard({ item }) {
  const status = bookingStatus(item);
  const paid = isPaidBooking(item);
  const currency = item?.currency || item?.meta?.currency || "RWF";

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 transition hover:shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-slate-900">{bookingTitle(item)}</p>
          <p className="mt-0.5 text-[11px] text-slate-500">Code: {bookingCode(item)}</p>
        </div>

        <span
          className={`shrink-0 rounded-full border px-2.5 py-1 text-[11px] font-semibold ${statusPillClass(
            paid ? "paid" : status
          )}`}
        >
          {pretty(paid ? "paid" : status)}
        </span>
      </div>

      <div className="mt-3 space-y-2 text-[12px] text-slate-700">
        <div className="flex items-center justify-between gap-2">
          <span className="text-slate-500">From</span>
          <span className="max-w-[70%] truncate font-semibold">{pickupValue(item)}</span>
        </div>
        <div className="flex items-center justify-between gap-2">
          <span className="text-slate-500">To</span>
          <span className="max-w-[70%] truncate font-semibold">{dropoffValue(item)}</span>
        </div>
        <div className="flex items-center justify-between gap-2">
          <span className="text-slate-500">Pickup</span>
          <span className="text-right font-semibold">{formatDateTime(pickupTimeValue(item))}</span>
        </div>
      </div>

      <div className="mt-4 flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
        <span className="text-[11px] font-semibold text-slate-600">Total</span>
        <span className="text-sm font-semibold text-slate-900">
          {formatMoney(bookingAmount(item), currency)}
        </span>
      </div>
    </div>
  );
}

export default function CustomerBookings() {
  const token = useMemo(() => getStoredToken(), []);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [bookings, setBookings] = useState([]);

  async function loadBookings() {
    if (!token) return;

    setLoading(true);
    setError("");

    try {
      const json = await apiRequest("/bookings/me", { token });
      const list = normalizeList(json);
      const sorted = [...list].sort((a, b) => {
        const da = toJsDate(a?.created_at || pickupTimeValue(a))?.getTime() || 0;
        const db = toJsDate(b?.created_at || pickupTimeValue(b))?.getTime() || 0;
        return db - da;
      });
      setBookings(sorted);
    } catch (e) {
      setError(e?.message || "Failed to load bookings.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadBookings();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const filteredBookings = useMemo(() => {
    if (statusFilter === "all") return bookings;
    if (statusFilter === "paid") return bookings.filter(isPaidBooking);
    if (statusFilter === "upcoming") return bookings.filter(isUpcoming);
    if (statusFilter === "pending") return bookings.filter(isPendingBooking);
    return bookings.filter(
      (b) => String(bookingStatus(b)).toLowerCase() === String(statusFilter).toLowerCase()
    );
  }, [bookings, statusFilter]);

  const stats = useMemo(() => {
    return {
      total: bookings.length,
      upcoming: bookings.filter(isUpcoming).length,
      paid: bookings.filter(isPaidBooking).length,
      pending: bookings.filter(isPendingBooking).length,
    };
  }, [bookings]);

  if (!token) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-6">
        <p className="text-sm font-semibold text-slate-900">Please login first</p>
        <p className="mt-1 text-sm text-slate-600">Your bookings are available only after sign in.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">My Bookings</h1>
          <p className="mt-1 text-sm text-slate-600">
            Only your own bookings are shown here from the secure <code>/bookings/me</code> route.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none focus:ring-2 focus:ring-blue-200"
          >
            <option value="all">All</option>
            <option value="upcoming">Upcoming</option>
            <option value="paid">Paid</option>
            <option value="pending">Pending</option>
            <option value="confirmed">Confirmed</option>
            <option value="cancelled">Cancelled</option>
            <option value="completed">Completed</option>
          </select>

          <button
            type="button"
            onClick={loadBookings}
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60"
          >
            <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
            Refresh
          </button>

          <Link
            to="/vehicles"
            className="inline-flex items-center justify-center rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700"
          >
            Book Vehicle
          </Link>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard icon={<Car size={16} />} label="Total Bookings" value={stats.total} />
        <StatCard icon={<CalendarDays size={16} />} label="Upcoming" value={stats.upcoming} />
        <StatCard icon={<CreditCard size={16} />} label="Paid" value={stats.paid} />
        <StatCard icon={<Clock3 size={16} />} label="Pending" value={stats.pending} />
      </div>

      {error && (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">
          <div className="flex items-start gap-2">
            <AlertTriangle size={18} />
            <div>
              <p className="font-semibold">Could not load bookings</p>
              <p className="mt-1">{error}</p>
            </div>
          </div>
        </div>
      )}

      {loading ? (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="rounded-2xl border border-slate-200 bg-white p-4">
              <div className="h-4 w-2/3 animate-pulse rounded bg-slate-100" />
              <div className="mt-3 h-3 w-1/2 animate-pulse rounded bg-slate-100" />
              <div className="mt-4 h-10 w-full animate-pulse rounded-xl bg-slate-100" />
            </div>
          ))}
        </div>
      ) : filteredBookings.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-6 text-sm text-slate-700">
          <p className="font-semibold">No bookings found</p>
          <p className="mt-1 text-slate-600">
            Your filtered booking list is empty at the moment.
          </p>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {filteredBookings.map((item) => (
            <BookingCard key={String(bookingCode(item))} item={item} />
          ))}
        </div>
      )}
    </div>
  );
}