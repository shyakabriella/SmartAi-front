// src/pages/customer/CustomerProfile.jsx
import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  BadgeCheck,
  CalendarDays,
  CreditCard,
  Mail,
  Phone,
  RefreshCw,
  ShieldCheck,
  User,
} from "lucide-react";

const API_BASE =
  import.meta.env.VITE_API_BASE_URL ||
  import.meta.env.VITE_API_URL ||
  import.meta.env.VITE_API ||
  "";

const TOKEN_KEYS = ["token", "access_token", "auth_token", "smartcar_token"];
const USER_KEYS = ["auth.user", "user", "auth_user", "smartcar_user"];

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

function pretty(value) {
  return String(value || "active")
    .replaceAll("_", " ")
    .replace(/\b\w/g, (m) => m.toUpperCase());
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

function InfoCard({ label, value }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
      <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
        {label}
      </div>
      <div className="mt-2 text-sm font-semibold text-slate-900">{value || "—"}</div>
    </div>
  );
}

export default function CustomerProfile() {
  const token = useMemo(() => getStoredToken(), []);
  const storedUser = useMemo(() => getStoredUser(), []);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [customer, setCustomer] = useState(null);
  const [bookings, setBookings] = useState([]);

  async function loadProfile() {
    if (!token) return;

    setLoading(true);
    setError("");

    try {
      const [customerJson, bookingsJson] = await Promise.all([
        apiRequest("/customers/me", { token }),
        apiRequest("/bookings/me", { token }),
      ]);

      setCustomer(customerJson);
      setBookings(normalizeList(bookingsJson));
    } catch (e) {
      setError(e?.message || "Failed to load customer profile.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadProfile();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const user = customer?.user || storedUser || {};
  const stats = useMemo(() => {
    const upcoming = bookings.filter((b) => {
      const d = toJsDate(
        b?.dropoff_time ||
          b?.dropoff_at ||
          b?.end_time ||
          b?.trip_date ||
          b?.created_at
      );
      return d ? d.getTime() > Date.now() : false;
    }).length;

    const paid = bookings.filter((b) => {
      const s = String(b?.payment_status || b?.status || "").toLowerCase();
      return s.includes("paid") || s.includes("success") || s.includes("completed");
    }).length;

    return {
      total: bookings.length,
      upcoming,
      paid,
    };
  }, [bookings]);

  if (!token) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-6">
        <p className="text-sm font-semibold text-slate-900">Please login first</p>
        <p className="mt-1 text-sm text-slate-600">Your profile is available only after sign in.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">My Profile</h1>
          <p className="mt-1 text-sm text-slate-600">
            This page loads your customer profile from the secure <code>/customers/me</code> route.
          </p>
        </div>

        <button
          type="button"
          onClick={loadProfile}
          disabled={loading}
          className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60"
        >
          <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
          Refresh
        </button>
      </div>

      {error && (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">
          <div className="flex items-start gap-2">
            <AlertTriangle size={18} />
            <div>
              <p className="font-semibold">Could not load profile</p>
              <p className="mt-1">{error}</p>
            </div>
          </div>
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        <StatCard icon={<CalendarDays size={16} />} label="Bookings" value={stats.total} />
        <StatCard icon={<CreditCard size={16} />} label="Paid Bookings" value={stats.paid} />
        <StatCard icon={<ShieldCheck size={16} />} label="Upcoming" value={stats.upcoming} />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1fr_1fr]">
        <div className="rounded-2xl border border-slate-200 bg-white p-5">
          <div className="flex items-center gap-2">
            <User size={18} className="text-slate-700" />
            <h2 className="text-lg font-semibold text-slate-900">Personal Information</h2>
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <InfoCard label="Full Name" value={user?.name || user?.full_name} />
            <InfoCard label="Email" value={user?.email} />
            <InfoCard label="Phone" value={user?.phone || user?.telephone} />
            <InfoCard label="Customer Status" value={pretty(customer?.status)} />
            <InfoCard label="Customer Code" value={customer?.code} />
            <InfoCard label="Document No" value={customer?.document_no} />
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5">
          <div className="flex items-center gap-2">
            <BadgeCheck size={18} className="text-slate-700" />
            <h2 className="text-lg font-semibold text-slate-900">Account Summary</h2>
          </div>

          <div className="mt-4 grid gap-3">
            <InfoCard label="Profile ID" value={customer?.id} />
            <InfoCard label="Created At" value={formatDateTime(customer?.created_at)} />
            <InfoCard label="Updated At" value={formatDateTime(customer?.updated_at)} />
            <InfoCard
              label="Booking Draft Saved"
              value={customer?.preferences?.booking_draft ? "Yes" : "No"}
            />
          </div>

          <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
            Customer profile editing can be added next through a secure <code>/customers/me</code> update route.
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-5">
        <div className="flex items-center gap-2">
          <Mail size={18} className="text-slate-700" />
          <h2 className="text-lg font-semibold text-slate-900">Contact Details</h2>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <InfoCard label="Email Address" value={user?.email} />
          <InfoCard label="Phone Number" value={user?.phone || user?.telephone} />
        </div>

        <div className="mt-4 rounded-2xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-800">
          This customer profile is private and should show only the logged-in customer’s own data.
        </div>
      </div>
    </div>
  );
}