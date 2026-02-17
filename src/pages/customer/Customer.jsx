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
  X,
  Smartphone,
  Wallet,
  ShieldCheck,
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

function isPaidBooking(b) {
  // ✅ demo support: __demoPaid
  if (b?.__demoPaid) return true;

  const s = String(b?.payment_status || b?.status || bookingStatus(b) || "").toLowerCase();
  if (!s) return false;
  return s.includes("paid") || s.includes("success") || s.includes("completed");
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

/* ---------------- Demo Payment Modal ---------------- */
function PaymentModal({
  open,
  booking,
  onClose,
  onPaid,
}) {
  const [method, setMethod] = useState("momo");
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    if (open) {
      setMethod("momo");
      setProcessing(false);
    }
  }, [open]);

  if (!open || !booking) return null;

  const code = bookingCode(booking);
  const title = bookingTitle(booking);
  const currency = booking?.currency || booking?.meta?.currency || "RWF";
  const total =
    booking?.price_total ||
    booking?.total ||
    booking?.amount_total ||
    booking?.meta?.price_total ||
    0;

  const pickupTime =
    booking?.pickup_time ||
    booking?.start_time ||
    booking?.pickup_datetime ||
    booking?.meta?.pickup_time ||
    null;

  const dropoffTime =
    booking?.dropoff_time ||
    booking?.end_time ||
    booking?.dropoff_datetime ||
    booking?.meta?.dropoff_time ||
    null;

  const doPay = async () => {
    // ✅ DEMO ONLY: no backend call
    setProcessing(true);
    await new Promise((r) => setTimeout(r, 900));
    setProcessing(false);

    onPaid?.({
      booking,
      method,
      paid_at: new Date().toISOString(),
      amount: total,
      currency,
    });
  };

  const MethodCard = ({ value, icon, title, desc }) => {
    const active = method === value;
    return (
      <button
        type="button"
        onClick={() => setMethod(value)}
        className={[
          "w-full text-left rounded-2xl border p-4 transition",
          active
            ? "border-emerald-300 bg-emerald-50"
            : "border-slate-200 bg-white hover:bg-slate-50",
        ].join(" ")}
      >
        <div className="flex items-start gap-3">
          <div
            className={[
              "h-10 w-10 rounded-xl grid place-items-center border",
              active
                ? "bg-white border-emerald-200 text-emerald-700"
                : "bg-slate-50 border-slate-200 text-slate-700",
            ].join(" ")}
          >
            {icon}
          </div>

          <div className="min-w-0">
            <div className="flex items-center justify-between gap-2">
              <p className="font-semibold text-slate-900">{title}</p>
              {active && (
                <span className="text-[11px] px-2 py-0.5 rounded-full bg-emerald-600 text-white">
                  Selected
                </span>
              )}
            </div>
            <p className="mt-1 text-sm text-slate-600">{desc}</p>
          </div>
        </div>
      </button>
    );
  };

  return (
    <div className="fixed inset-0 z-[999]">
      {/* Backdrop */}
      <button
        type="button"
        className="absolute inset-0 bg-black/40"
        onClick={onClose}
        aria-label="Close payment modal"
      />

      {/* Dialog */}
      <div className="absolute inset-0 grid place-items-center p-4">
        <div className="w-full max-w-2xl rounded-3xl bg-white shadow-xl border border-slate-200 overflow-hidden">
          {/* Header */}
          <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-slate-900">Pay Booking</p>
              <p className="text-xs text-slate-500">
                Demo payment (no backend) • Booking <b>{code}</b>
              </p>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="h-10 w-10 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 grid place-items-center"
              title="Close"
            >
              <X size={18} />
            </button>
          </div>

          {/* Body */}
          <div className="p-5 grid gap-4 lg:grid-cols-[1fr,0.9fr]">
            {/* Left */}
            <div className="space-y-3">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-sm font-semibold text-slate-900 truncate">{title}</p>
                <p className="mt-1 text-xs text-slate-600">
                  {formatDateTime(pickupTime)} <span className="text-slate-400">→</span>{" "}
                  {formatDateTime(dropoffTime)}
                </p>

                <div className="mt-3 rounded-xl border border-slate-200 bg-white px-3 py-2 flex items-center justify-between">
                  <span className="text-xs text-slate-600 font-semibold">Total to pay</span>
                  <span className="text-sm font-semibold text-slate-900">
                    {formatMoney(total, currency)}
                  </span>
                </div>

                <div className="mt-3 flex items-center gap-2 text-xs text-slate-600">
                  <ShieldCheck size={16} className="text-emerald-600" />
                  Payment is simulated for demo UI only.
                </div>
              </div>

              <div className="grid gap-3">
                <MethodCard
                  value="momo"
                  icon={<Smartphone size={18} />}
                  title="Mobile Money (MoMo)"
                  desc="Pay using MoMo (demo)."
                />
                <MethodCard
                  value="card"
                  icon={<CreditCard size={18} />}
                  title="Card"
                  desc="Visa / Mastercard (demo)."
                />
                <MethodCard
                  value="cash"
                  icon={<Wallet size={18} />}
                  title="Cash"
                  desc="Pay on delivery (demo)."
                />
              </div>
            </div>

            {/* Right: Actions */}
            <div className="rounded-2xl border border-slate-200 bg-white p-4 h-fit">
              <p className="text-sm font-semibold text-slate-900">Confirm</p>
              <p className="mt-1 text-sm text-slate-600">
                Selected method:{" "}
                <span className="font-semibold text-slate-900">
                  {method === "momo" ? "Mobile Money" : method === "card" ? "Card" : "Cash"}
                </span>
              </p>

              <button
                type="button"
                onClick={doPay}
                disabled={processing}
                className="mt-4 w-full h-11 rounded-xl bg-emerald-600 text-white font-semibold hover:bg-emerald-700 disabled:opacity-60"
              >
                {processing ? "Processing…" : `Pay Now • ${formatMoney(total, currency)}`}
              </button>

              <button
                type="button"
                onClick={onClose}
                className="mt-2 w-full h-11 rounded-xl border border-slate-200 bg-white font-semibold text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>

              <p className="mt-3 text-[11px] text-slate-500">
                💡 Later we will connect this button to your backend payment API.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Customer() {
  const location = useLocation();

  const token = useMemo(() => getStoredToken(), []);
  const user = useMemo(() => getStoredUser(), []);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [bookings, setBookings] = useState([]);

  // ✅ demo pay modal state
  const [payOpen, setPayOpen] = useState(false);
  const [payBooking, setPayBooking] = useState(null);

  // ✅ nice banner when coming from other pages
  const [banner, setBanner] = useState(() => {
    const fromState = location?.state?.bookingSaved || location?.state?.paidOk;
    return fromState
      ? {
          type: "success",
          message: "✅ Booking saved successfully. You can see it in your bookings below.",
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
    const paid = bookings.filter((b) => isPaidBooking(b)).length;
    return { total, upcoming, paid };
  }, [bookings]);

  async function loadBookings() {
    if (!token) return;

    setLoading(true);
    setError("");

    try {
      // ✅ Most common endpoint
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  function openPayModal(b) {
    setPayBooking(b);
    setPayOpen(true);
  }

  function onDemoPaid({ booking, method, paid_at }) {
    const key = String(booking?.id ?? bookingCode(booking));

    setBookings((prev) =>
      (prev || []).map((x) => {
        const k = String(x?.id ?? bookingCode(x));
        if (k !== key) return x;

        // ✅ Demo mark as paid
        return {
          ...x,
          __demoPaid: true,
          payment_status: "paid",
          status: String(x?.status || "").toLowerCase() === "pending" ? "confirmed" : x?.status,
          paid_at: paid_at,
          meta: {
            ...(x?.meta || {}),
            demo_payment_method: method,
            demo_paid_at: paid_at,
          },
        };
      })
    );

    setPayOpen(false);
    setPayBooking(null);

    setBanner({
      type: "success",
      message: `✅ Payment successful (demo). Booking ${bookingCode(booking)} is now marked as PAID.`,
    });
  }

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
      {/* Demo Payment Modal */}
      <PaymentModal
        open={payOpen}
        booking={payBooking}
        onClose={() => {
          setPayOpen(false);
          setPayBooking(null);
        }}
        onPaid={onDemoPaid}
      />

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
                Tip: View all bookings in{" "}
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

              const paid = isPaidBooking(b);
              const status = paid ? "paid" : bookingStatus(b);

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

                    {/* ✅ Pay opens modal (demo) */}
                    <button
                      type="button"
                      onClick={() => openPayModal(b)}
                      disabled={paid}
                      className={[
                        "inline-flex flex-1 items-center justify-center rounded-xl px-3 py-2 text-xs font-semibold",
                        paid
                          ? "bg-emerald-100 text-emerald-800 cursor-not-allowed"
                          : "bg-emerald-600 text-white hover:bg-emerald-700",
                      ].join(" ")}
                      title={paid ? "Already paid" : "Pay (demo modal)"}
                    >
                      {paid ? "Paid ✅" : "Pay"}
                    </button>
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