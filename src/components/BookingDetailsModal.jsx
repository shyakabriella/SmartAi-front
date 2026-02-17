// src/components/BookingDetailsModal.jsx
import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { RENTER_DAYS } from "./demoBookingData";

/* ✅ API base (/api) */
const API_BASE =
  import.meta.env.VITE_API_BASE_URL ||
  import.meta.env.VITE_API_URL ||
  import.meta.env.VITE_API ||
  "";

/* ✅ API origin for resolving /storage links */
const API_ORIGIN = (() => {
  try {
    return API_BASE ? new URL(API_BASE).origin : "";
  } catch {
    return "";
  }
})();

/* ✅ Google Maps key (support multiple env names) */
const GMAPS_KEY =
  import.meta.env.VITE_GOOGLE_MAPS_KEY ||
  import.meta.env.VITE_GOOGLE_MAP_KEY ||
  import.meta.env.VITE_GOOGLE_MAPS_API_KEY ||
  "";

/* ✅ fallbacks */
const FALLBACK_CAR =
  "data:image/svg+xml;charset=UTF-8," +
  encodeURIComponent(`
  <svg xmlns="http://www.w3.org/2000/svg" width="900" height="500">
    <rect width="100%" height="100%" fill="#f1f5f9"/>
    <text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle"
      font-family="Arial" font-size="22" fill="#64748b">
      No car image
    </text>
  </svg>`);

const FALLBACK_AVATAR =
  "data:image/svg+xml;charset=UTF-8," +
  encodeURIComponent(`
  <svg xmlns="http://www.w3.org/2000/svg" width="200" height="200">
    <rect width="100%" height="100%" fill="#e2e8f0"/>
    <text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle"
      font-family="Arial" font-size="18" fill="#475569">
      Driver
    </text>
  </svg>`);

/* ✅ Normalize laravel/storage paths */
function normalizeRelativePath(u) {
  if (!u) return "";
  let p = String(u).trim();
  p = p.replace(/^https?:\/\/[^/]+/i, "");
  p = p.replace(/^\/?storage\/app\/public\//i, "/storage/");
  p = p.replace(/^\/?public\/storage\//i, "/storage/");
  p = p.replace(/^\/?public\//i, "/");
  if (!p.startsWith("/")) p = `/${p}`;
  return p;
}

/* ✅ Resolve image url (handles absolute storage paths too) */
function resolveImageUrl(u) {
  if (!u) return "";
  const s = String(u).trim();

  // absolute url
  if (/^https?:\/\//i.test(s)) {
    try {
      const url = new URL(s);
      const pathname = url.pathname || "";
      const isStorage =
        pathname.includes("/storage/") ||
        /^\/?storage\//i.test(pathname.replace(/^\//, ""));
      if (isStorage && API_ORIGIN) return `${API_ORIGIN}${pathname}`;
      return s;
    } catch {
      return s;
    }
  }

  // relative
  const clean = normalizeRelativePath(s);
  return API_ORIGIN ? `${API_ORIGIN}${clean}` : clean;
}

/* ✅ If image item is object or string, extract a usable string */
function pickMediaUrl(x) {
  if (!x) return "";
  if (typeof x === "string") return x;
  if (typeof x === "object") {
    return (
      x?.url ||
      x?.original_url ||
      x?.path ||
      x?.file ||
      x?.src ||
      x?.image ||
      ""
    );
  }
  return "";
}

/* ✅ Extract vehicle image from any backend shape (supports object images) */
function getVehicleImageRaw(v) {
  if (!v) return "";

  const img0 = Array.isArray(v?.images) ? pickMediaUrl(v.images?.[0]) : "";
  const media0 = Array.isArray(v?.media) ? pickMediaUrl(v.media?.[0]) : "";

  const rawMedia0 = Array.isArray(v?.raw?.media)
    ? pickMediaUrl(v.raw.media?.[0])
    : "";

  const rawImg0 = Array.isArray(v?.raw?.images)
    ? pickMediaUrl(v.raw.images?.[0])
    : "";

  return (
    img0 ||
    v?.image_url ||
    v?.primary_image_url ||
    v?.primaryImageUrl ||
    media0 ||
    rawImg0 ||
    v?.raw?.image_url ||
    rawMedia0 ||
    ""
  );
}

/* ✅ Extract driver avatar from any backend shape */
function getDriverAvatarRaw(d) {
  if (!d) return "";
  return (
    d?.avatar ||
    d?.profile_image_url ||
    d?.profile_image ||
    d?.image_url ||
    ""
  );
}

/* ✅ Name helpers */
function vehicleName(v) {
  return (
    v?.name ||
    v?.display_name ||
    `${v?.year || ""} ${v?.make || ""} ${v?.model || ""}`.trim() ||
    "Vehicle"
  );
}
function driverName(d) {
  return d?.name || d?.user?.name || d?.full_name || "Driver";
}

function getVehicleId(v) {
  return v?.id ?? v?.vehicle_id ?? v?.vehicleId ?? v?.raw?.id ?? null;
}
function getDriverId(d) {
  return d?.id ?? d?.driver_id ?? d?.driverId ?? d?.raw?.id ?? null;
}

/* ✅ Google map embed URL helper */
function mapEmbedUrl(q) {
  if (!GMAPS_KEY || !q) return "";
  return `https://www.google.com/maps/embed/v1/place?key=${encodeURIComponent(
    GMAPS_KEY
  )}&q=${encodeURIComponent(q)}`;
}

/* ✅ simple validators */
function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/i.test(String(email || "").trim());
}
function isValidPhone(phone) {
  const cleaned = String(phone || "").replace(/[^\d]/g, "");
  return cleaned.length >= 7;
}

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

function persistAuth(token, user) {
  if (typeof window === "undefined") return;
  if (token) window.localStorage.setItem("token", token);
  if (user) window.localStorage.setItem("user", JSON.stringify(user));
}

function clearAuth() {
  if (typeof window === "undefined") return;
  [...TOKEN_KEYS, ...USER_KEYS].forEach((k) => window.localStorage.removeItem(k));
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

/* ✅ date helpers */
function pad2(n) {
  return String(n).padStart(2, "0");
}
function toDateInput(d) {
  const yyyy = d.getFullYear();
  const mm = pad2(d.getMonth() + 1);
  const dd = pad2(d.getDate());
  return `${yyyy}-${mm}-${dd}`;
}
function addDays(date, days) {
  const d = new Date(date);
  d.setDate(d.getDate() + Number(days || 0));
  return d;
}
function combineMysqlDatetime(dateStr, timeStr) {
  const d = String(dateStr || "").trim();
  const t = String(timeStr || "").trim();
  if (!d) return "";
  if (!t) return `${d} 08:30:00`;
  return /^\d{2}:\d{2}:\d{2}$/.test(t) ? `${d} ${t}` : `${d} ${t}:00`;
}
function isAfter(mysqlA, mysqlB) {
  const a = new Date(String(mysqlA).replace(" ", "T"));
  const b = new Date(String(mysqlB).replace(" ", "T"));
  if (Number.isNaN(a.getTime()) || Number.isNaN(b.getTime())) return true;
  return a.getTime() > b.getTime();
}

/** ✅ tiny helper: let React paint a frame (so success message shows before navigate) */
function nextPaint() {
  return new Promise((resolve) => requestAnimationFrame(() => resolve(true)));
}

export default function BookingDetailsModal({ booking, onClose }) {
  const navigate = useNavigate();

  const { vehicle, driver, trip } = booking || {};
  const withDriver = !!driver;

  // Step control
  const [step, setStep] = useState("details"); // "details" | "customer"

  // Trip inputs (addresses)
  const [pickup, setPickup] = useState(trip?.pickup || "");
  const [dropoff, setDropoff] = useState(trip?.dropoff || "");
  const [promo, setPromo] = useState("");

  // ✅ trip date + time inputs
  const [pickupDate, setPickupDate] = useState(() => {
    const fromTrip = trip?.startDate || trip?.pickup_date || "";
    if (fromTrip && /^\d{4}-\d{2}-\d{2}$/.test(fromTrip)) return fromTrip;
    return toDateInput(new Date());
  });

  const [pickupTime, setPickupTime] = useState(() => {
    return trip?.pickup_time_only || trip?.startTime || "08:30";
  });

  const [dropoffDate, setDropoffDate] = useState(() => {
    const fromTrip = trip?.endDate || trip?.dropoff_date || "";
    if (fromTrip && /^\d{4}-\d{2}-\d{2}$/.test(fromTrip)) return fromTrip;
    return toDateInput(addDays(new Date(), RENTER_DAYS || 1));
  });

  const [dropoffTime, setDropoffTime] = useState(() => {
    return trip?.dropoff_time_only || trip?.endTime || "14:15";
  });

  // ✅ Auth state
  const [auth, setAuth] = useState(() => {
    const token = getStoredToken();
    const user = getStoredUser();
    return { token, user };
  });

  const isLoggedIn = !!auth?.token;

  // authMode: "logged" | "login" | "register"
  const [authMode, setAuthMode] = useState(() =>
    isLoggedIn ? "logged" : "login"
  );

  // Login fields
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginError, setLoginError] = useState("");

  // Register fields (guest creating account)
  const [registerName, setRegisterName] = useState("");
  const [registerEmail, setRegisterEmail] = useState("");
  const [registerPhone, setRegisterPhone] = useState("");
  const [registerLoading, setRegisterLoading] = useState(false);
  const [registerError, setRegisterError] = useState("");
  const [registerSuccess, setRegisterSuccess] = useState("");

  // Booking save states
  const [bookingSaving, setBookingSaving] = useState(false);
  const [bookingSaveError, setBookingSaveError] = useState("");

  // ✅ NEW: success message + overlay stage
  const [bookingSavedOk, setBookingSavedOk] = useState(false);
  const [bookingSavedMsg, setBookingSavedMsg] = useState("");

  // Customer info (confirm before payment)
  const initialCustomerName =
    booking?.customer?.name ||
    auth?.user?.name ||
    auth?.user?.full_name ||
    "";

  const initialCustomerEmail = booking?.customer?.email || auth?.user?.email || "";
  const initialCustomerPhone =
    booking?.customer?.phone || auth?.user?.phone || auth?.user?.telephone || "";

  const [customerName, setCustomerName] = useState(initialCustomerName);
  const [customerEmail, setCustomerEmail] = useState(initialCustomerEmail);
  const [customerPhone, setCustomerPhone] = useState(initialCustomerPhone);
  const [formError, setFormError] = useState("");

  // Pricing
  const pricePerDay = Number(vehicle?.pricePerDay ?? vehicle?.base_daily_rate ?? 0);
  const insurancePerDay = Number(vehicle?.insurancePerDay ?? 0);

  const base = pricePerDay * RENTER_DAYS;
  const insurance = insurancePerDay * RENTER_DAYS;

  const driverFeePerDay = 2;
  const driverFee = withDriver ? driverFeePerDay * RENTER_DAYS : 0;

  const taxesFees = Math.round((base + insurance + driverFee) * 0.08);
  const total = base + insurance + driverFee + taxesFees;

  const bookingIdFallback = booking?.bookingId || "#SC-2241117-0042";
  const vName = vehicleName(vehicle);
  const dName = withDriver ? driverName(driver) : "Self Drive";

  const vImg = useMemo(() => {
    const raw = getVehicleImageRaw(vehicle);
    const resolved = raw ? resolveImageUrl(raw) : "";
    return resolved || FALLBACK_CAR;
  }, [vehicle]);

  const dAvatar = useMemo(() => {
    if (!withDriver) return FALLBACK_AVATAR;
    const raw = getDriverAvatarRaw(driver);
    return raw ? resolveImageUrl(raw) : FALLBACK_AVATAR;
  }, [driver, withDriver]);

  const pickupMap = useMemo(() => mapEmbedUrl(pickup), [pickup]);
  const dropoffMap = useMemo(() => mapEmbedUrl(dropoff), [dropoff]);

  const api = String(API_BASE || "").replace(/\/+$/, "");

  function resetSaveUI() {
    setBookingSaveError("");
    setBookingSavedOk(false);
    setBookingSavedMsg("");
  }

  function handleProceedToCustomerStep() {
    setFormError("");
    setLoginError("");
    setRegisterError("");
    setRegisterSuccess("");
    resetSaveUI();

    const pickMysql = combineMysqlDatetime(pickupDate, pickupTime);
    const dropMysql = combineMysqlDatetime(dropoffDate, dropoffTime);

    if (!pickupDate) return setFormError("Please select pickup date.");
    if (!pickupTime) return setFormError("Please select pickup time.");
    if (!dropoffDate) return setFormError("Please select drop-off date.");
    if (!dropoffTime) return setFormError("Please select drop-off time.");
    if (!isAfter(dropMysql, pickMysql))
      return setFormError("Drop-off must be after pickup.");

    setStep("customer");
    setAuthMode(isLoggedIn ? "logged" : "login");
  }

  function handleGoBackToDetails() {
    setFormError("");
    setLoginError("");
    setRegisterError("");
    setRegisterSuccess("");
    resetSaveUI();
    setStep("details");
  }

  async function apiRequest(path, { method = "GET", token = "", body } = {}) {
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

  async function handleLogin() {
    setLoginError("");
    setFormError("");
    setRegisterError("");
    setRegisterSuccess("");
    resetSaveUI();

    const email = String(loginEmail || "").trim();
    const password = String(loginPassword || "").trim();

    if (!email) return setLoginError("Enter your email.");
    if (!isValidEmail(email)) return setLoginError("Enter a valid email.");
    if (!password) return setLoginError("Enter your password.");

    setLoginLoading(true);
    try {
      const json = await apiRequest("/login", {
        method: "POST",
        body: { email, password },
      });

      const payload = unwrapApiPayload(json);
      const token = payload?.token || "";
      const user = payload?.user || null;

      if (!token) {
        setLoginError("Login succeeded but token is missing from response.");
        return;
      }

      const enrichedUser = {
        ...(user || { email }),
        roles: payload?.roles || user?.roles || [],
        permissions: payload?.permissions || [],
        customer_id: payload?.customer_id || user?.customer_id || null,
      };

      persistAuth(token, enrichedUser);
      setAuth({ token, user: enrichedUser });

      setCustomerName(enrichedUser?.name || enrichedUser?.full_name || "");
      setCustomerEmail(enrichedUser?.email || email);
      setCustomerPhone(enrichedUser?.phone || enrichedUser?.telephone || "");

      setAuthMode("logged");
    } catch (e) {
      setLoginError(e?.message || "Network error while logging in. Please try again.");
    } finally {
      setLoginLoading(false);
    }
  }

  async function handleRegisterAsGuest() {
    setRegisterError("");
    setRegisterSuccess("");
    setLoginError("");
    setFormError("");
    resetSaveUI();

    const name = String(registerName || "").trim();
    const email = String(registerEmail || "").trim();
    const phone = String(registerPhone || "").trim();

    if (!name) return setRegisterError("Please enter your full name.");
    if (!email) return setRegisterError("Please enter your email.");
    if (!isValidEmail(email)) return setRegisterError("Please enter a valid email.");
    if (phone && !isValidPhone(phone))
      return setRegisterError("Please enter a valid phone number.");

    setRegisterLoading(true);
    try {
      const json = await apiRequest("/register", {
        method: "POST",
        body: {
          name,
          email,
          phone: phone || null,
          role: "customer",
          notify: true,
        },
      });

      const msg = json?.message || "Account created successfully.";
      setRegisterSuccess(`${msg} ✅ Check your email for your password.`);

      // ✅ redirect to login tab
      setAuthMode("login");
      setLoginEmail(email);
      setLoginPassword("");
    } catch (e) {
      setRegisterError(
        e?.message || "Network error while creating account. Please try again."
      );
    } finally {
      setRegisterLoading(false);
    }
  }

  function handleSwitchAccount() {
    clearAuth();
    setAuth({ token: "", user: null });
    setAuthMode("login");
    setLoginEmail("");
    setLoginPassword("");
    setLoginError("");
    resetSaveUI();
  }

  function buildOrderPayload({ customer, savedBooking }) {
    const finalBookingId =
      savedBooking?.code ||
      savedBooking?.id ||
      savedBooking?.booking_id ||
      bookingIdFallback;

    return {
      id: finalBookingId,
      title: "SmartCar AI Rental",
      subtitle: `${pickupDate} ${pickupTime} → ${dropoffDate} ${dropoffTime} • ${vName} ${
        withDriver ? `with ${dName}` : "(Drive Yourself)"
      }`,
      vehicleRental: base,
      driverFee,
      insurance,
      taxes: taxesFees,
      pickup,
      dropoff,
      withDriver,
      customer,
      promo,
      pickup_datetime: combineMysqlDatetime(pickupDate, pickupTime),
      dropoff_datetime: combineMysqlDatetime(dropoffDate, dropoffTime),
      savedBooking,
    };
  }

  // ✅ IMPORTANT: DO NOT SEND customer_id
  // Backend will resolve customer from auth user and auto-create Customer row if missing.
  async function saveBookingToApiOrFail({ customer }) {
    if (!auth?.token) throw new Error("You must be logged in to save booking.");
    setBookingSaveError("");

    const pickup_time = combineMysqlDatetime(pickupDate, pickupTime);
    const dropoff_time = combineMysqlDatetime(dropoffDate, dropoffTime);

    if (!pickup_time) throw new Error("Pickup time is missing.");
    if (!dropoff_time) throw new Error("Drop-off time is missing.");
    if (!isAfter(dropoff_time, pickup_time))
      throw new Error("Drop-off must be after pickup.");

    const vehicle_id = getVehicleId(vehicle);
    const driver_id = withDriver ? getDriverId(driver) : null;

    if (!vehicle_id) throw new Error("Vehicle id is missing.");

    const payload = {
      vehicle_id,
      driver_id,

      pickup_time,
      dropoff_time,

      pickup_location_id: null,
      dropoff_location_id: null,

      currency: "RWF",

      price_subtotal: Number(base + insurance).toFixed(2),
      price_driver_fee: Number(driverFee).toFixed(2),
      price_taxes: Number(taxesFees).toFixed(2),
      price_total: Number(total).toFixed(2),

      meta: {
        renter_days: RENTER_DAYS,
        with_driver: withDriver,
        pickup_address: pickup,
        dropoff_address: dropoff,
        vehicle_name: vName,
        driver_name: withDriver ? dName : null,
        promo: promo || null,
        customer: {
          name: customer?.name,
          email: customer?.email,
          phone: customer?.phone,
        },
      },
    };

    const json = await apiRequest("/bookings", {
      method: "POST",
      token: auth?.token || "",
      body: payload,
    });

    return unwrapApiPayload(json);
  }

  async function handleContinueToPaymentWithCustomer() {
    setFormError("");
    resetSaveUI();

    const name = String(customerName || "").trim();
    const email = String(customerEmail || "").trim();
    const phone = String(customerPhone || "").trim();

    if (!name) return setFormError("Please enter your full name.");
    if (!email) return setFormError("Please enter your email address.");
    if (!isValidEmail(email)) return setFormError("Please enter a valid email.");
    if (!phone) return setFormError("Please enter your phone number.");
    if (!isValidPhone(phone)) return setFormError("Please enter a valid phone number.");

    const pickMysql = combineMysqlDatetime(pickupDate, pickupTime);
    const dropMysql = combineMysqlDatetime(dropoffDate, dropoffTime);

    if (!pickupDate) return setFormError("Please select pickup date.");
    if (!pickupTime) return setFormError("Please select pickup time.");
    if (!dropoffDate) return setFormError("Please select drop-off date.");
    if (!dropoffTime) return setFormError("Please select drop-off time.");
    if (!isAfter(dropMysql, pickMysql))
      return setFormError("Drop-off must be after pickup.");

    if (!isLoggedIn) {
      setFormError("Please login first to continue.");
      setAuthMode("login");
      return;
    }

    const customer = { name, email, phone };

    setBookingSaving(true);
    try {
      // ✅ show loading overlay
      setBookingSavedOk(false);
      setBookingSavedMsg("");

      const savedBooking = await saveBookingToApiOrFail({ customer });

      // ✅ show success overlay/message
      setBookingSavedOk(true);
      setBookingSavedMsg("Booking saved successfully ✅ Redirecting to payment...");

      // let React paint the success UI at least once
      await nextPaint();

      const orderForPayment = buildOrderPayload({ customer, savedBooking });

      navigate("/payment", {
        state: {
          order: orderForPayment,
          authToken: auth?.token || "",
          savedBooking,
          bookingSaved: true, // ✅ optional flag for payment page
        },
      });
    } catch (e) {
      setBookingSaveError(e?.message || "Failed to save booking. Please try again.");
    } finally {
      setBookingSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm">
      <div className="relative mx-4 w-full max-w-5xl rounded-3xl bg-slate-50 p-4 sm:p-5 shadow-2xl shadow-slate-900/40">
        {/* ✅ NEW: Saving / Success overlay */}
        {(bookingSaving || bookingSavedOk) && (
          <div className="absolute inset-0 z-50 flex items-center justify-center rounded-3xl bg-slate-900/30 backdrop-blur-[2px]">
            <div className="w-[92%] max-w-md rounded-2xl border border-slate-200 bg-white p-5 shadow-xl">
              <div className="flex items-center gap-3">
                {bookingSavedOk ? (
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-50 border border-emerald-200">
                    <span className="text-emerald-700 text-xl animate-bounce">✓</span>
                  </div>
                ) : (
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-50 border border-slate-200">
                    <span className="inline-block h-5 w-5 rounded-full border-2 border-slate-400 border-t-transparent animate-spin" />
                  </div>
                )}

                <div className="min-w-0">
                  <p className="text-sm font-semibold text-slate-900">
                    {bookingSavedOk ? "Saved!" : "Saving your booking..."}
                  </p>
                  <p className="mt-0.5 text-[12px] text-slate-500">
                    {bookingSavedOk
                      ? bookingSavedMsg || "Booking saved successfully ✅"
                      : "Please wait, do not close this window."}
                  </p>
                </div>
              </div>

              {/* tiny progress shimmer */}
              {!bookingSavedOk && (
                <div className="mt-4 h-2 w-full overflow-hidden rounded-full bg-slate-100">
                  <div className="h-full w-1/2 rounded-full bg-slate-300 animate-pulse" />
                </div>
              )}
            </div>
          </div>
        )}

        {/* Close */}
        <button
          type="button"
          onClick={onClose}
          className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 hover:bg-slate-50"
          aria-label="Close"
          disabled={bookingSaving}
          title={bookingSaving ? "Saving booking..." : "Close"}
        >
          ✕
        </button>

        {/* Header */}
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold text-slate-900">
              {step === "details" ? "Your Booking Details" : "Customer"}
            </h2>
            <p className="text-[11px] text-slate-500 mt-1">
              {step === "details"
                ? "Confirm trip details before payment."
                : isLoggedIn
                ? "You are already logged in. Confirm your details and continue."
                : authMode === "login"
                ? "Login to continue to payment."
                : "Create a quick account (password will be sent to your email)."}
            </p>
          </div>

          {/* Step pills */}
          <div className="flex items-center gap-2">
            <span
              className={`rounded-full px-3 py-1 text-[11px] font-semibold border ${
                step === "details"
                  ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                  : "bg-white text-slate-600 border-slate-200"
              }`}
            >
              1) Details
            </span>
            <span
              className={`rounded-full px-3 py-1 text-[11px] font-semibold border ${
                step === "customer"
                  ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                  : "bg-white text-slate-600 border-slate-200"
              }`}
            >
              2) Customer
            </span>
          </div>
        </div>

        <div className="grid gap-4 lg:grid-cols-[minmax(0,1.2fr),minmax(0,1.1fr)]">
          {/* LEFT */}
          <div className="space-y-3">
            <div className="rounded-2xl bg-white p-3 shadow-sm shadow-slate-900/10 border border-slate-200">
              <div className="overflow-hidden rounded-xl mb-3">
                <div className="relative h-40 w-full bg-white border border-slate-200 rounded-xl overflow-hidden">
                  <img
                    src={vImg}
                    alt={vName}
                    className="h-full w-full object-contain p-2"
                    onError={(e) => (e.currentTarget.src = FALLBACK_CAR)}
                  />
                  {withDriver && (
                    <div className="absolute left-3 bottom-3 flex items-center gap-2 rounded-full bg-white/90 px-3 py-1 shadow-sm">
                      <div className="h-7 w-7 rounded-full overflow-hidden bg-slate-200">
                        <img
                          src={dAvatar}
                          alt={dName}
                          className="h-full w-full object-cover"
                          onError={(e) => (e.currentTarget.src = FALLBACK_AVATAR)}
                        />
                      </div>
                      <span className="text-[11px] font-semibold text-slate-800">
                        {dName}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {step === "details" ? (
                <>
                  <p className="text-xs font-semibold text-slate-800 mb-2">
                    Trip Overview
                  </p>

                  <div className="space-y-3 text-xs text-slate-700">
                    {/* Pickup */}
                    <div className="grid grid-cols-1 md:grid-cols-[minmax(0,1.4fr),minmax(0,1fr)] gap-3">
                      <div>
                        <label className="mb-1 block text-[11px] font-medium text-slate-600">
                          Pickup
                        </label>
                        <input
                          type="text"
                          value={pickup}
                          onChange={(e) => setPickup(e.target.value)}
                          className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs text-slate-900 shadow-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500/40"
                          placeholder="Pickup address"
                        />

                        <div className="mt-2 grid grid-cols-2 gap-2">
                          <div>
                            <label className="mb-1 block text-[11px] font-medium text-slate-600">
                              Pickup Date <span className="text-rose-500">*</span>
                            </label>
                            <input
                              type="date"
                              value={pickupDate}
                              onChange={(e) => setPickupDate(e.target.value)}
                              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs text-slate-900 shadow-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500/40"
                            />
                          </div>
                          <div>
                            <label className="mb-1 block text-[11px] font-medium text-slate-600">
                              Pickup Time <span className="text-rose-500">*</span>
                            </label>
                            <input
                              type="time"
                              value={pickupTime}
                              onChange={(e) => setPickupTime(e.target.value)}
                              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs text-slate-900 shadow-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500/40"
                            />
                          </div>
                        </div>

                        <p className="mt-1 text-[11px] text-slate-400">
                          {pickupDate} • {pickupTime}
                        </p>
                      </div>

                      <div className="overflow-hidden rounded-lg border border-slate-200 bg-slate-50 h-44">
                        {pickup && pickupMap ? (
                          <iframe
                            title="Pickup map"
                            src={pickupMap}
                            className="h-full w-full"
                            loading="lazy"
                            referrerPolicy="no-referrer-when-downgrade"
                          />
                        ) : (
                          <div className="h-full w-full flex items-center justify-center text-[11px] text-slate-400">
                            {GMAPS_KEY
                              ? "Type pickup address to show map"
                              : "Missing Google Maps key (set VITE_GOOGLE_MAPS_KEY)"}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Drop-off */}
                    <div className="grid grid-cols-1 md:grid-cols-[minmax(0,1.4fr),minmax(0,1fr)] gap-3">
                      <div>
                        <label className="mb-1 block text-[11px] font-medium text-slate-600">
                          Drop-off
                        </label>
                        <input
                          type="text"
                          value={dropoff}
                          onChange={(e) => setDropoff(e.target.value)}
                          className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs text-slate-900 shadow-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500/40"
                          placeholder="Drop-off address"
                        />

                        <div className="mt-2 grid grid-cols-2 gap-2">
                          <div>
                            <label className="mb-1 block text-[11px] font-medium text-slate-600">
                              Drop-off Date <span className="text-rose-500">*</span>
                            </label>
                            <input
                              type="date"
                              value={dropoffDate}
                              onChange={(e) => setDropoffDate(e.target.value)}
                              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs text-slate-900 shadow-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500/40"
                            />
                          </div>
                          <div>
                            <label className="mb-1 block text-[11px] font-medium text-slate-600">
                              Drop-off Time <span className="text-rose-500">*</span>
                            </label>
                            <input
                              type="time"
                              value={dropoffTime}
                              onChange={(e) => setDropoffTime(e.target.value)}
                              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs text-slate-900 shadow-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500/40"
                            />
                          </div>
                        </div>

                        <p className="mt-1 text-[11px] text-slate-400">
                          {dropoffDate} • {dropoffTime}
                        </p>
                      </div>

                      <div className="overflow-hidden rounded-lg border border-slate-200 bg-slate-50 h-44">
                        {dropoff && dropoffMap ? (
                          <iframe
                            title="Dropoff map"
                            src={dropoffMap}
                            className="h-full w-full"
                            loading="lazy"
                            referrerPolicy="no-referrer-when-downgrade"
                          />
                        ) : (
                          <div className="h-full w-full flex items-center justify-center text-[11px] text-slate-400">
                            {GMAPS_KEY
                              ? "Type drop-off address to show map"
                              : "Missing Google Maps key (set VITE_GOOGLE_MAPS_KEY)"}
                          </div>
                        )}
                      </div>
                    </div>

                    {formError && (
                      <div className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-[11px] text-rose-700">
                        {formError}
                      </div>
                    )}
                  </div>
                </>
              ) : (
                <>
                  {/* CUSTOMER STEP */}
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-xs font-semibold text-slate-800">Customer</p>

                    {!isLoggedIn && (
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setAuthMode("login");
                            setLoginError("");
                            setRegisterError("");
                            setRegisterSuccess("");
                            resetSaveUI();
                          }}
                          className={`rounded-full px-3 py-1 text-[11px] font-semibold border ${
                            authMode === "login"
                              ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                              : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                          }`}
                        >
                          Login
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            setAuthMode("register");
                            setLoginError("");
                            setRegisterError("");
                            setRegisterSuccess("");
                            resetSaveUI();
                          }}
                          className={`rounded-full px-3 py-1 text-[11px] font-semibold border ${
                            authMode === "register"
                              ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                              : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                          }`}
                        >
                          Create account
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Logged in view */}
                  {isLoggedIn && authMode === "logged" && (
                    <div className="mb-3 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-[11px] text-emerald-800">
                      ✅ You’re logged in as{" "}
                      <span className="font-semibold">
                        {auth?.user?.email || "Customer"}
                      </span>
                      <button
                        type="button"
                        onClick={handleSwitchAccount}
                        className="ml-2 underline font-semibold"
                      >
                        Switch account
                      </button>
                    </div>
                  )}

                  {/* REGISTER view */}
                  {!isLoggedIn && authMode === "register" && (
                    <div className="grid grid-cols-1 gap-3">
                      <div>
                        <label className="mb-1 block text-[11px] font-medium text-slate-600">
                          Full Name <span className="text-rose-500">*</span>
                        </label>
                        <input
                          type="text"
                          value={registerName}
                          onChange={(e) => setRegisterName(e.target.value)}
                          className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs text-slate-900 shadow-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500/40"
                          placeholder="Your full name"
                        />
                      </div>

                      <div>
                        <label className="mb-1 block text-[11px] font-medium text-slate-600">
                          Email <span className="text-rose-500">*</span>
                        </label>
                        <input
                          type="email"
                          value={registerEmail}
                          onChange={(e) => setRegisterEmail(e.target.value)}
                          className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs text-slate-900 shadow-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500/40"
                          placeholder="you@example.com"
                        />
                      </div>

                      <div>
                        <label className="mb-1 block text-[11px] font-medium text-slate-600">
                          Phone (optional)
                        </label>
                        <input
                          type="tel"
                          value={registerPhone}
                          onChange={(e) => setRegisterPhone(e.target.value)}
                          className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs text-slate-900 shadow-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500/40"
                          placeholder="+250 78xxxxxxx"
                        />
                      </div>

                      {registerError && (
                        <div className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-[11px] text-rose-700">
                          {registerError}
                        </div>
                      )}

                      {registerSuccess && (
                        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-[11px] text-emerald-800">
                          {registerSuccess}
                        </div>
                      )}

                      <button
                        type="button"
                        onClick={handleRegisterAsGuest}
                        disabled={registerLoading}
                        className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-md shadow-emerald-500/30 hover:bg-emerald-700 disabled:opacity-60"
                      >
                        {registerLoading && (
                          <span className="inline-block h-4 w-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
                        )}
                        {registerLoading ? "Creating account..." : "Create Account"}
                      </button>

                      <p className="text-[11px] text-slate-500">
                        After creating account, you will be redirected to{" "}
                        <span className="font-semibold">Login</span> and use the
                        password sent to your email.
                      </p>
                    </div>
                  )}

                  {/* LOGIN view */}
                  {!isLoggedIn && authMode === "login" && (
                    <div className="grid grid-cols-1 gap-3">
                      {registerSuccess && (
                        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-[11px] text-emerald-800">
                          ✅ Account created! Now login using the password sent to your email.
                        </div>
                      )}

                      <div>
                        <label className="mb-1 block text-[11px] font-medium text-slate-600">
                          Email <span className="text-rose-500">*</span>
                        </label>
                        <input
                          type="email"
                          value={loginEmail}
                          onChange={(e) => setLoginEmail(e.target.value)}
                          className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs text-slate-900 shadow-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500/40"
                          placeholder="you@example.com"
                        />
                      </div>

                      <div>
                        <label className="mb-1 block text-[11px] font-medium text-slate-600">
                          Password <span className="text-rose-500">*</span>
                        </label>
                        <input
                          type="password"
                          value={loginPassword}
                          onChange={(e) => setLoginPassword(e.target.value)}
                          className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs text-slate-900 shadow-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500/40"
                          placeholder="••••••••"
                        />
                      </div>

                      {loginError && (
                        <div className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-[11px] text-rose-700">
                          {loginError}
                        </div>
                      )}

                      <button
                        type="button"
                        onClick={handleLogin}
                        disabled={loginLoading}
                        className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-md shadow-emerald-500/30 hover:bg-emerald-700 disabled:opacity-60"
                      >
                        {loginLoading && (
                          <span className="inline-block h-4 w-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
                        )}
                        {loginLoading ? "Logging in..." : "Login"}
                      </button>
                    </div>
                  )}

                  {/* Confirm + SAVE BOOKING + continue */}
                  {isLoggedIn && authMode === "logged" && (
                    <div className="grid grid-cols-1 gap-3 mt-3">
                      <p className="text-[11px] text-slate-500">
                        Confirm your details before going to payment:
                      </p>

                      <div>
                        <label className="mb-1 block text-[11px] font-medium text-slate-600">
                          Full Name <span className="text-rose-500">*</span>
                        </label>
                        <input
                          type="text"
                          value={customerName}
                          onChange={(e) => setCustomerName(e.target.value)}
                          className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs text-slate-900 shadow-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500/40"
                          placeholder="Your name"
                        />
                      </div>

                      <div>
                        <label className="mb-1 block text-[11px] font-medium text-slate-600">
                          Email <span className="text-rose-500">*</span>
                        </label>
                        <input
                          type="email"
                          value={customerEmail}
                          onChange={(e) => setCustomerEmail(e.target.value)}
                          className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs text-slate-900 shadow-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500/40"
                          placeholder="you@example.com"
                        />
                      </div>

                      <div>
                        <label className="mb-1 block text-[11px] font-medium text-slate-600">
                          Phone <span className="text-rose-500">*</span>
                        </label>
                        <input
                          type="tel"
                          value={customerPhone}
                          onChange={(e) => setCustomerPhone(e.target.value)}
                          className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs text-slate-900 shadow-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500/40"
                          placeholder="+250 78xxxxxxx"
                        />
                      </div>

                      {bookingSaveError && (
                        <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-[11px] text-amber-900">
                          ⚠️ {bookingSaveError}
                          <div className="mt-1 text-[11px] text-amber-800">
                            If you see <b>403</b>, update Laravel routes to allow customers
                            to POST <b>/api/bookings</b>.
                          </div>
                        </div>
                      )}

                      <div className="flex items-center gap-2 pt-1">
                        <button
                          type="button"
                          onClick={handleGoBackToDetails}
                          className="inline-flex flex-1 items-center justify-center rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                          disabled={bookingSaving}
                        >
                          ← Back
                        </button>

                        <button
                          type="button"
                          onClick={handleContinueToPaymentWithCustomer}
                          disabled={bookingSaving}
                          className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-md shadow-emerald-500/30 hover:bg-emerald-700 disabled:opacity-60"
                        >
                          {bookingSaving && (
                            <span className="inline-block h-4 w-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
                          )}
                          {bookingSaving ? "Saving booking..." : "Continue to Payment →"}
                        </button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>

          {/* RIGHT */}
          <div className="rounded-2xl bg-white p-4 shadow-sm shadow-slate-900/10 border border-slate-200">
            <p className="text-sm font-semibold text-slate-900 mb-2">Order Summary</p>

            <div className="space-y-1 text-xs text-slate-700 mb-3">
              <div className="flex items-center justify-between">
                <span>Vehicle Rental</span>
                <span>${base.toFixed(2)}</span>
              </div>

              {withDriver && (
                <div className="flex items-center justify-between">
                  <span>Driver Fee</span>
                  <span>${driverFee.toFixed(2)}</span>
                </div>
              )}

              <div className="flex items-center justify-between">
                <span>Insurance</span>
                <span>${insurance.toFixed(2)}</span>
              </div>

              <div className="flex items-center justify-between">
                <span>Taxes &amp; Fees</span>
                <span>${taxesFees.toFixed(2)}</span>
              </div>
            </div>

            <div className="mt-2 flex items-center justify-between border-t border-slate-200 pt-3">
              <span className="text-xs font-semibold text-slate-900">Total Price</span>
              <span className="text-lg font-semibold text-slate-900">
                ${total.toFixed(2)}
              </span>
            </div>

            {step === "details" ? (
              <button
                type="button"
                onClick={handleProceedToCustomerStep}
                className="mt-4 inline-flex w-full items-center justify-center rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-md shadow-emerald-500/30 hover:bg-emerald-700"
              >
                Proceed to Payment
              </button>
            ) : (
              <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-3 text-[11px] text-slate-600">
                ✅ Next: Login → Save booking → Continue to payment.
              </div>
            )}

            <p className="mt-2 text-[11px] text-slate-500">
              By continuing, you agree to SmartCar AI&apos;s rental terms and safety guidelines.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
