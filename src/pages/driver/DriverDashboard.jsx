import { useEffect, useMemo, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  AlertTriangle,
  BadgeCheck,
  BriefcaseBusiness,
  CalendarDays,
  CheckCircle2,
  ClipboardList,
  Clock3,
  Mail,
  Phone,
  RefreshCw,
  User,
  CarFront,
  MapPinned,
} from "lucide-react";

const API_BASE =
  import.meta.env.VITE_API_BASE_URL ||
  import.meta.env.VITE_API_URL ||
  import.meta.env.VITE_API ||
  "";

const TOKEN_KEYS = ["token", "access_token", "auth_token", "smartcar_token"];
const USER_KEYS = ["auth.user", "user", "auth_user", "smartcar_user"];

/* ---------------- helpers ---------------- */
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

function unwrapApiPayload(json) {
  if (json && typeof json === "object" && "data" in json) return json.data;
  return json;
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
    b?.meta?.vehicle_name ||
    "Vehicle Booking"
  );
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

function bookingAmount(b) {
  return (
    b?.estimated_total ||
    b?.price_total ||
    b?.total ||
    b?.amount_total ||
    b?.meta?.price_total ||
    0
  );
}

function pickupValue(b) {
  return (
    b?.departure ||
    b?.pickup_location ||
    b?.pickup ||
    b?.pickup_address ||
    b?.meta?.pickup_address ||
    "—"
  );
}

function dropoffValue(b) {
  return (
    b?.destination ||
    b?.dropoff_location ||
    b?.dropoff ||
    b?.dropoff_address ||
    b?.meta?.dropoff_address ||
    "—"
  );
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

function isRequestStatus(status) {
  const s = String(status || "").toLowerCase();
  return (
    s.includes("pending") ||
    s.includes("request") ||
    s.includes("new") ||
    s.includes("assigned") ||
    s.includes("await")
  );
}

function isActiveJobStatus(status) {
  const s = String(status || "").toLowerCase();
  return (
    s.includes("confirmed") ||
    s.includes("active") ||
    s.includes("accepted") ||
    s.includes("ongoing") ||
    s.includes("in_progress")
  );
}

function isCompletedJobStatus(status) {
  const s = String(status || "").toLowerCase();
  return s.includes("complete") || s.includes("done") || s.includes("finished");
}

/* ---------------- ui blocks ---------------- */
function StatCard({ icon, label, value, hint }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-slate-700">
          {icon}
          <span className="text-xs font-semibold">{label}</span>
        </div>
        <span className="text-lg font-semibold text-slate-900">{value}</span>
      </div>
      {hint ? <p className="mt-2 text-[11px] text-slate-500">{hint}</p> : null}
    </div>
  );
}

function JobCard({ item }) {
  const status = bookingStatus(item);
  const currency = item?.currency || item?.meta?.currency || "RWF";

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 transition hover:shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-slate-900">
            {bookingTitle(item)}
          </p>
          <p className="mt-0.5 text-[11px] text-slate-500">
            Code: {bookingCode(item)}
          </p>
        </div>

        <span
          className={`shrink-0 rounded-full border px-2.5 py-1 text-[11px] font-semibold ${statusPillClass(
            status
          )}`}
        >
          {pretty(status)}
        </span>
      </div>

      <div className="mt-4 grid gap-2 text-[12px] text-slate-700">
        <div className="flex items-center justify-between gap-2">
          <span className="inline-flex items-center gap-1 text-slate-500">
            <MapPinned size={14} />
            From
          </span>
          <span className="max-w-[70%] truncate font-semibold">
            {pickupValue(item)}
          </span>
        </div>

        <div className="flex items-center justify-between gap-2">
          <span className="inline-flex items-center gap-1 text-slate-500">
            <MapPinned size={14} />
            To
          </span>
          <span className="max-w-[70%] truncate font-semibold">
            {dropoffValue(item)}
          </span>
        </div>

        <div className="flex items-center justify-between gap-2">
          <span className="inline-flex items-center gap-1 text-slate-500">
            <CalendarDays size={14} />
            Pickup Time
          </span>
          <span className="text-right font-semibold">
            {formatDateTime(pickupTimeValue(item))}
          </span>
        </div>
      </div>

      <div className="mt-4 flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
        <span className="text-[11px] font-semibold text-slate-600">
          Job Value
        </span>
        <span className="text-sm font-semibold text-slate-900">
          {formatMoney(bookingAmount(item), currency)}
        </span>
      </div>
    </div>
  );
}

function EmptyState({ title, text }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-6 text-sm text-slate-700">
      <p className="font-semibold">{title}</p>
      <p className="mt-1 text-slate-600">{text}</p>
    </div>
  );
}

/* ---------------- page ---------------- */
export default function DriverDashboard() {
  const location = useLocation();

  const token = useMemo(() => getStoredToken(), []);
  const user = useMemo(() => getStoredUser(), []);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [profileData, setProfileData] = useState(null);
  const [jobs, setJobs] = useState([]);

  const [banner, setBanner] = useState(() => {
    const ok = location?.state?.saved || location?.state?.updated;
    return ok
      ? {
          type: "success",
          message: "Driver dashboard updated successfully.",
        }
      : null;
  });

  const profile = useMemo(() => {
    const source = profileData?.user || profileData || user || {};
    return {
      name: source?.name || source?.full_name || "Driver",
      email: source?.email || "",
      phone: source?.phone || source?.telephone || "",
      status: profileData?.status || source?.status || "active",
      id: profileData?.id || source?.id || "",
      license_no:
        profileData?.license_no ||
        source?.license_no ||
        source?.license_number ||
        "",
    };
  }, [profileData, user]);

  async function loadData() {
    if (!token) return;

    setLoading(true);
    setError("");

    try {
      const [jobsJson, profileJson] = await Promise.all([
        apiRequest("/bookings/me", { token }),
        apiRequest("/drivers/me", { token }),
      ]);

      const jobsPayload = unwrapApiPayload(jobsJson);
      const jobsList = normalizeList(jobsPayload);

      const sorted = [...jobsList].sort((a, b) => {
        const da = toJsDate(a?.created_at || pickupTimeValue(a))?.getTime() || 0;
        const db = toJsDate(b?.created_at || pickupTimeValue(b))?.getTime() || 0;
        return db - da;
      });

      setJobs(sorted);
      setProfileData(unwrapApiPayload(profileJson));
    } catch (e) {
      const status = e?.status;
      const msg = e?.message || "Failed to load driver dashboard.";

      if (status === 401) {
        setError("Your session expired. Please login again.");
      } else if (status === 403) {
        setError("Access denied. Please confirm driver permissions.");
      } else {
        setError(msg);
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (token) loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const stats = useMemo(() => {
    return {
      total: jobs.length,
      requests: jobs.filter((b) => isRequestStatus(bookingStatus(b))).length,
      active: jobs.filter((b) => isActiveJobStatus(bookingStatus(b))).length,
      completed: jobs.filter((b) => isCompletedJobStatus(bookingStatus(b))).length,
    };
  }, [jobs]);

  const requests = useMemo(
    () => jobs.filter((b) => isRequestStatus(bookingStatus(b))),
    [jobs]
  );

  const activeJobs = useMemo(
    () => jobs.filter((b) => isActiveJobStatus(bookingStatus(b))),
    [jobs]
  );

  const completedJobs = useMemo(
    () => jobs.filter((b) => isCompletedJobStatus(bookingStatus(b))),
    [jobs]
  );

  if (!token) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
        <div className="rounded-2xl border border-slate-200 bg-white p-6">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-amber-200 bg-amber-50">
              <AlertTriangle className="text-amber-700" size={18} />
            </div>

            <div>
              <p className="text-sm font-semibold text-slate-900">
                Please login to view your driver dashboard
              </p>
              <p className="mt-1 text-sm text-slate-600">
                Your dashboard needs an authenticated driver account.
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

  const recentRequests = requests.slice(0, 6);
  const recentActiveJobs = activeJobs.slice(0, 6);
  const recentCompletedJobs = completedJobs.slice(0, 6);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
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

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.2fr),minmax(0,0.8fr)]">
        <div className="rounded-2xl border border-slate-200 bg-white p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-slate-900">
                Welcome, {profile.name} 👋
              </p>
              <p className="mt-1 text-sm text-slate-600">
                Here are your assigned requests, active jobs, and completed jobs.
              </p>
            </div>

            <button
              type="button"
              onClick={loadData}
              disabled={loading}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60"
            >
              <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
              Refresh
            </button>
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-4">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <div className="flex items-center gap-2 text-slate-700">
                <User size={16} />
                <p className="text-xs font-semibold">Driver</p>
              </div>
              <p className="mt-2 truncate text-sm font-semibold text-slate-900">
                {profile.name}
              </p>
              <p className="text-xs text-slate-500">
                {profile.id ? `Profile ID: ${profile.id}` : "Driver account"}
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <div className="flex items-center gap-2 text-slate-700">
                <Mail size={16} />
                <p className="text-xs font-semibold">Email</p>
              </div>
              <p className="mt-2 truncate text-sm font-semibold text-slate-900">
                {profile.email || "—"}
              </p>
              <p className="text-xs text-slate-500">Primary contact</p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <div className="flex items-center gap-2 text-slate-700">
                <Phone size={16} />
                <p className="text-xs font-semibold">Phone</p>
              </div>
              <p className="mt-2 truncate text-sm font-semibold text-slate-900">
                {profile.phone || "—"}
              </p>
              <p className="text-xs text-slate-500">Contact number</p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <div className="flex items-center gap-2 text-slate-700">
                <BadgeCheck size={16} />
                <p className="text-xs font-semibold">Status</p>
              </div>
              <p className="mt-2 truncate text-sm font-semibold text-slate-900">
                {pretty(profile.status)}
              </p>
              <p className="text-xs text-slate-500">
                {profile.license_no
                  ? `License: ${profile.license_no}`
                  : "Driver profile status"}
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5">
          <p className="text-sm font-semibold text-slate-900">Driver Summary</p>

          <div className="mt-4 grid gap-3">
            <StatCard
              icon={<ClipboardList size={16} />}
              label="Requests"
              value={stats.requests}
              hint="Pending or newly assigned requests"
            />
            <StatCard
              icon={<BriefcaseBusiness size={16} />}
              label="Active Jobs"
              value={stats.active}
              hint="Accepted or ongoing rides"
            />
            <StatCard
              icon={<CheckCircle2 size={16} />}
              label="Completed Jobs"
              value={stats.completed}
              hint="Finished rides"
            />
            <StatCard
              icon={<Clock3 size={16} />}
              label="All Jobs"
              value={stats.total}
              hint="All jobs from your account"
            />
          </div>
        </div>
      </div>

      {error && (
        <div className="mt-6 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">
          <div className="flex items-start gap-2">
            <AlertTriangle size={18} />
            <div>
              <p className="font-semibold">Could not load driver dashboard data</p>
              <p className="mt-1">{error}</p>
            </div>
          </div>
        </div>
      )}

      {loading && (
        <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="rounded-2xl border border-slate-200 bg-white p-4"
            >
              <div className="h-4 w-2/3 animate-pulse rounded bg-slate-100" />
              <div className="mt-3 h-3 w-1/2 animate-pulse rounded bg-slate-100" />
              <div className="mt-4 h-10 w-full animate-pulse rounded-xl bg-slate-100" />
            </div>
          ))}
        </div>
      )}

      {!loading && (
        <div className="mt-6 grid gap-6 xl:grid-cols-3">
          <div className="rounded-2xl border border-slate-200 bg-white p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-slate-900">My Requests</p>
                <p className="mt-1 text-sm text-slate-600">
                  New and pending requests assigned to you.
                </p>
              </div>
              <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700">
                {stats.requests} request(s)
              </span>
            </div>

            {recentRequests.length === 0 ? (
              <div className="mt-4">
                <EmptyState
                  title="No pending requests"
                  text="New requests assigned to you will appear here."
                />
              </div>
            ) : (
              <div className="mt-4 grid gap-3">
                {recentRequests.map((item) => (
                  <JobCard key={String(bookingCode(item))} item={item} />
                ))}
              </div>
            )}
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-slate-900">Active Jobs</p>
                <p className="mt-1 text-sm text-slate-600">
                  Jobs you are currently handling.
                </p>
              </div>
              <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
                {stats.active} active
              </span>
            </div>

            {recentActiveJobs.length === 0 ? (
              <div className="mt-4">
                <EmptyState
                  title="No active jobs"
                  text="Accepted or ongoing jobs will appear here."
                />
              </div>
            ) : (
              <div className="mt-4 grid gap-3">
                {recentActiveJobs.map((item) => (
                  <JobCard key={String(bookingCode(item))} item={item} />
                ))}
              </div>
            )}
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-slate-900">
                  Completed Jobs
                </p>
                <p className="mt-1 text-sm text-slate-600">
                  Jobs you already finished.
                </p>
              </div>
              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                {stats.completed} completed
              </span>
            </div>

            {recentCompletedJobs.length === 0 ? (
              <div className="mt-4">
                <EmptyState
                  title="No completed jobs"
                  text="Finished jobs will appear here."
                />
              </div>
            ) : (
              <div className="mt-4 grid gap-3">
                {recentCompletedJobs.map((item) => (
                  <JobCard key={String(bookingCode(item))} item={item} />
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {!loading && (
        <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-slate-900">
                Quick Driver Actions
              </p>
              <p className="mt-1 text-sm text-slate-600">
                Fast links for common driver tasks.
              </p>
            </div>
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Link
              to="/driver/requests"
              className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-white hover:shadow-sm"
            >
              <ClipboardList size={16} />
              My Requests
            </Link>

            <Link
              to="/driver/jobs"
              className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-white hover:shadow-sm"
            >
              <BriefcaseBusiness size={16} />
              My Jobs
            </Link>

            <Link
              to="/driver/profile"
              className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-white hover:shadow-sm"
            >
              <User size={16} />
              Profile
            </Link>

            <Link
              to="/vehicles"
              className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-white hover:shadow-sm"
            >
              <CarFront size={16} />
              Vehicles
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}