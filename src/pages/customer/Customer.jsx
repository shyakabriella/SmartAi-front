// src/pages/customer/Customer.jsx
import { useEffect, useMemo, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  AlertTriangle,
  BadgeCheck,
  CalendarDays,
  Car,
  CreditCard,
  Mail,
  Phone,
  RefreshCw,
  User,
} from "lucide-react";

/* ✅ API base (/api) */
const API_BASE =
  import.meta.env.VITE_API_BASE_URL ||
  import.meta.env.VITE_API_URL ||
  import.meta.env.VITE_API ||
  "";

/* ✅ local auth helpers */
const TOKEN_KEYS = ["token", "access_token", "auth_token", "smartcar_token"];
const USER_KEYS = ["user", "auth_user", "smartcar_user"];

function safeJsonParse(v) {
  try {
    return JSON.parse(v);
  } catch {
    return null;
  }
}
function getStoredToken() {
  if (typeof window === "undefined") return "";
  for (const k of TOKEN_KEYS) {
    const v = window.localStorage.getItem(k);
    if (v && String(v).trim()) return String(v).trim();
  }
  return "";
}
function getStoredUser() {
  if (typeof window === "undefined") return null;
  for (const k of USER_KEYS) {
    const raw = window.localStorage.getItem(k);
    const parsed = raw ? safeJsonParse(raw) : null;
    if (parsed && typeof parsed === "object") return parsed;
  }
  return null;
}

/* ✅ unwrap Laravel BaseController sendResponse format */
function unwrapApiPayload(json) {
  if (json && typeof json === "object" && "data" in json) return json.data;
  return json;
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

  return (
    (list.length ? list.join(", ") : msg) ||
    "Request failed. Please try again."
  );
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

function toJsDate(mysqlOrIso) {
  if (!mysqlOrIso) return null;
  const s = String(mysqlOrIso);
  const d = new Date(s.includes(" ") ? s.replace(" ", "T") : s);
  if (Number.isNaN(d.getTime())) return null;
  return d;
}

function formatDateTime(mysqlOrIso) {
  const d = toJsDate(mysqlOrIso);
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

function isUpcoming(booking) {
  const end =
    toJsDate(
      booking?.dropoff_time ||
        booking?.end_time ||
        booking?.dropoff_datetime ||
        booking?.end ||
        booking?.meta?.dropoff_time
    ) || null;

  if (!end) return false;
  return end.getTime() > Date.now();
}

function normalizeBookings(payload) {
  // supports:
  // - [ ... ]
  // - { data: [ ... ] }
  // - { data: { data: [ ... ] } } (pagination)
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.data?.data)) return payload.data.data;
  if (Array.isArray(payload?.bookings)) return payload.bookings;
  return [];
}

function bookingTitle(b) {
  return (
    b?.meta?.vehicle_name ||
    b?.vehicle?.name ||
    b?.vehicle_name ||
    b?.vehicle?.display_name ||
    "Vehicle Booking"
  );
}

function bookingCode(b) {
  return b?.code || b?.booking_code || b?.reference || b?.id || "—";
}

function bookingStatus(b) {
  return (
    b?.status ||
    b?.booking_status ||
    b?.state ||
    b?.payment_status ||
    "pending"
  );
}

function statusPillClass(status) {
  const s = String(status || "").toLowerCase();
  if (s.includes("paid") || s.includes("confirmed") || s.includes("active"))
    return "bg-emerald-50 text-emerald-700 border-emerald-200";
  if (s.includes("cancel") || s.includes("failed"))
    return "bg-rose-50 text-rose-700 border-rose-200";
  if (s.includes("complete") || s.includes("done"))
    return "bg-slate-50 text-slate-700 border-slate-200";
  return "bg-amber-50 text-amber-800 border-amber-200";
}

async function apiRequest(path, { method = "GET", token = "", body } = {}) {
  const api = String(API_BASE || "").replace(/\/+$/, "");
  if (!api) throw new Error("Missing API base URL. Set VITE_API_URL in .env");

  const res = await fetch(`${api}${path}`, {
    method,
    headers: {
      Accept: "application/json",
      ...(body ? { "Content-Type": "application/json" } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(extractErrorMessage(json));
    err.status = res.status;
    err.json = json;
    throw err;
  }
  return json;
}

export default function Customer() {
  const location = useLocation();

  const token = useMemo(() => getStoredToken(), []);
  const user = useMemo(() => getStoredUser(), []);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [bookings, setBookings] = useState([]);

  // ✅ nice banner when coming from BookingDetailsModal → /payment → dashboard
  const [banner, setBanner] = useState(() => {
    const fromState = location?.state?.bookingSaved || location?.state?.paidOk;
    return fromState
      ? {
          type: "success",
          message:
            "✅ Booking saved successfully. You can see it in your bookings below.",
        }
      : null;
  });

  const profile = useMemo(() => {
    const name = user?.name || user?.full_name || "Customer";
    const email = user?.email || "";
    const phone = user?.phone || user?.telephone || "";
    return { name, email, phone };
  }, [user]);

  const stats = useMemo(() => {
    const total = bookings.length;
    const upcoming = bookings.filter((b) => isUpcoming(b)).length;
    const paid = bookings.filter((b) =>
      String(bookingStatus(b)).toLowerCase().includes("paid")
    ).length;
    return { total, upcoming, paid };
  }, [bookings]);

  async function loadBookings() {
    if (!token) return;

    setLoading(true);
    setError("");

    try {
      // ✅ Most common endpoint
      // If your backend uses a different one (like /customer/bookings), change it here.
      const json = await apiRequest("/bookings", { token });
      const payload = unwrapApiPayload(json);
      const list = normalizeBookings(payload);

      // newest first (by created_at if present)
      const sorted = [...list].sort((a, b) => {
        const da = toJsDate(a?.created_at)?.getTime() || 0;
        const db = toJsDate(b?.created_at)?.getTime() || 0;
        return db - da;
      });

      setBookings(sorted);
    } catch (e) {
      const status = e?.status;
      const msg = e?.message || "Failed to load bookings.";

      if (status === 401) {
        setError("Your session expired. Please login again.");
      } else if (status === 403) {
        setError(
          "Access denied (403). Make sure customers are allowed to view GET /api/bookings."
        );
      } else {
        setError(msg);
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (token) loadBookings();
  }, [token]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!token) {
    return (
      <div className="mx-auto max-w-7xl px-4 sm:px-6 py-8">
        <div className="rounded-2xl border border-slate-200 bg-white p-6">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50 border border-amber-200">
              <AlertTriangle className="text-amber-700" size={18} />
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-900">
                Please login to view your dashboard
              </p>
              <p className="mt-1 text-sm text-slate-600">
                Your customer profile and bookings need an authenticated account.
              </p>

              <div className="mt-4 flex flex-wrap gap-2">
                <Link
                  to="/login"
                  className="inline-flex items-center justify-center rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700"
                >
                  Go to Login
                </Link>
                <Link
                  to="/"
                  className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Back to Home
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const recentBookings = bookings.slice(0, 6);

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 py-8">
      {/* Banner */}
      {banner && (
        <div
          className={`mb-4 rounded-2xl border px-4 py-3 text-sm ${
            banner.type === "success"
              ? "border-emerald-200 bg-emerald-50 text-emerald-800"
              : "border-amber-200 bg-amber-50 text-amber-900"
          }`}
        >
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-2">
              {banner.type === "success" ? (
                <BadgeCheck size={18} />
              ) : (
                <AlertTriangle size={18} />
              )}
              <span>{banner.message}</span>
            </div>
            <button
              type="button"
              onClick={() => setBanner(null)}
              className="text-xs font-semibold underline"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      {/* Top row */}
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.2fr),minmax(0,0.8fr)]">
        {/* Profile */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-slate-900">
                Welcome, {profile.name} 👋
              </p>
              <p className="mt-1 text-sm text-slate-600">
                Here is your customer information and recent bookings.
              </p>
            </div>

            <button
              type="button"
              onClick={loadBookings}
              disabled={loading}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60"
              title="Refresh"
            >
              <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
              Refresh
            </button>
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <div className="flex items-center gap-2 text-slate-700">
                <User size={16} />
                <p className="text-xs font-semibold">Customer</p>
              </div>
              <p className="mt-2 text-sm font-semibold text-slate-900 truncate">
                {profile.name}
              </p>
              <p className="text-xs text-slate-500">Account holder</p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <div className="flex items-center gap-2 text-slate-700">
                <Mail size={16} />
                <p className="text-xs font-semibold">Email</p>
              </div>
              <p className="mt-2 text-sm font-semibold text-slate-900 truncate">
                {profile.email || "—"}
              </p>
              <p className="text-xs text-slate-500">Used for receipts</p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <div className="flex items-center gap-2 text-slate-700">
                <Phone size={16} />
                <p className="text-xs font-semibold">Phone</p>
              </div>
              <p className="mt-2 text-sm font-semibold text-slate-900 truncate">
                {profile.phone || "—"}
              </p>
              <p className="text-xs text-slate-500">For driver contact</p>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5">
          <p className="text-sm font-semibold text-slate-900">Your Summary</p>

          <div className="mt-4 grid gap-3">
            <div className="rounded-2xl border border-slate-200 bg-white p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-slate-700">
                  <Car size={16} />
                  <span className="text-xs font-semibold">Total bookings</span>
                </div>
                <span className="text-lg font-semibold text-slate-900">
                  {stats.total}
                </span>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-slate-700">
                  <CalendarDays size={16} />
                  <span className="text-xs font-semibold">Upcoming</span>
                </div>
                <span className="text-lg font-semibold text-slate-900">
                  {stats.upcoming}
                </span>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-slate-700">
                  <CreditCard size={16} />
                  <span className="text-xs font-semibold">Paid</span>
                </div>
                <span className="text-lg font-semibold text-slate-900">
                  {stats.paid}
                </span>
              </div>
            </div>

            <div className="pt-1">
              <Link
                to="/vehicles"
                className="inline-flex w-full items-center justify-center rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700"
              >
                Book a Vehicle
              </Link>
              <p className="mt-2 text-[11px] text-slate-500">
                Tip: You can view all bookings in{" "}
                <Link to="/customer/bookings" className="underline font-semibold">
                  Bookings
                </Link>
                .
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Bookings */}
      <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-slate-900">Recent Bookings</p>
            <p className="mt-1 text-sm text-slate-600">
              Your latest bookings appear here.
            </p>
          </div>

          <Link
            to="/customer/bookings"
            className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
          >
            View all
          </Link>
        </div>

        {/* States */}
        {error && (
          <div className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">
            <div className="flex items-start gap-2">
              <AlertTriangle size={18} />
              <div>
                <p className="font-semibold">Could not load bookings</p>
                <p className="mt-1">{error}</p>
              </div>
            </div>
          </div>
        )}

        {loading && (
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="rounded-2xl border border-slate-200 bg-white p-4"
              >
                <div className="h-4 w-2/3 bg-slate-100 rounded animate-pulse" />
                <div className="mt-3 h-3 w-1/2 bg-slate-100 rounded animate-pulse" />
                <div className="mt-4 h-10 w-full bg-slate-100 rounded-xl animate-pulse" />
              </div>
            ))}
          </div>
        )}

        {!loading && !error && recentBookings.length === 0 && (
          <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-6 text-sm text-slate-700">
            <p className="font-semibold">No bookings yet 😄</p>
            <p className="mt-1 text-slate-600">
              When you book a vehicle, it will appear here.
            </p>
            <div className="mt-4">
              <Link
                to="/vehicles"
                className="inline-flex items-center justify-center rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700"
              >
                Browse Vehicles
              </Link>
            </div>
          </div>
        )}

        {!loading && recentBookings.length > 0 && (
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {recentBookings.map((b) => {
              const title = bookingTitle(b);
              const code = bookingCode(b);

              const status = bookingStatus(b);
              const currency = b?.currency || b?.meta?.currency || "RWF";
              const total =
                b?.price_total ||
                b?.total ||
                b?.amount_total ||
                b?.meta?.price_total ||
                0;

              const pickup =
                b?.meta?.pickup_address ||
                b?.pickup_address ||
                b?.pickup ||
                b?.pickup_location ||
                "—";

              const dropoff =
                b?.meta?.dropoff_address ||
                b?.dropoff_address ||
                b?.dropoff ||
                b?.dropoff_location ||
                "—";

              const pickupTime =
                b?.pickup_time ||
                b?.start_time ||
                b?.pickup_datetime ||
                b?.meta?.pickup_time ||
                null;

              const dropoffTime =
                b?.dropoff_time ||
                b?.end_time ||
                b?.dropoff_datetime ||
                b?.meta?.dropoff_time ||
                null;

              return (
                <div
                  key={String(code)}
                  className="rounded-2xl border border-slate-200 bg-white p-4 hover:shadow-sm transition"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-slate-900 truncate">
                        {title}
                      </p>
                      <p className="mt-0.5 text-[11px] text-slate-500 truncate">
                        Booking: {code}
                      </p>
                    </div>

                    <span
                      className={`shrink-0 rounded-full border px-2.5 py-1 text-[11px] font-semibold ${statusPillClass(
                        status
                      )}`}
                    >
                      {String(status)}
                    </span>
                  </div>

                  <div className="mt-3 space-y-2 text-[12px] text-slate-700">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-slate-500">Pickup</span>
                      <span className="font-semibold truncate max-w-[70%]">
                        {pickup}
                      </span>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-slate-500">Drop-off</span>
                      <span className="font-semibold truncate max-w-[70%]">
                        {dropoff}
                      </span>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-slate-500">Time</span>
                      <span className="font-semibold text-right">
                        {formatDateTime(pickupTime)} <br />
                        <span className="text-slate-400">→</span>{" "}
                        {formatDateTime(dropoffTime)}
                      </span>
                    </div>
                  </div>

                  <div className="mt-4 flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
                    <span className="text-[11px] text-slate-600 font-semibold">
                      Total
                    </span>
                    <span className="text-sm font-semibold text-slate-900">
                      {formatMoney(total, currency)}
                    </span>
                  </div>

                  <div className="mt-3 flex gap-2">
                    <Link
                      to="/customer/bookings"
                      className="inline-flex flex-1 items-center justify-center rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                    >
                      View
                    </Link>
                    <Link
                      to="/payment"
                      state={{ savedBooking: b, bookingSaved: true }}
                      className="inline-flex flex-1 items-center justify-center rounded-xl bg-emerald-600 px-3 py-2 text-xs font-semibold text-white hover:bg-emerald-700"
                      title="Continue payment (if needed)"
                    >
                      Pay
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
