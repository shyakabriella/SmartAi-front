// src/lib/api.js
const BASE = import.meta.env.VITE_API_URL || `${window.location.origin}/api`;

export async function api(path, { method = "GET", body, headers = {} } = {}) {
  // pull token from a few common places
  const token =
    localStorage.getItem("token") ||
    localStorage.getItem("auth_token") ||
    (JSON.parse(localStorage.getItem("auth") || "null")?.token ?? null);

  const isForm = typeof FormData !== "undefined" && body instanceof FormData;
  const isStringBody = typeof body === "string";

  // default headers (caller can override)
  const h = {
    Accept: "application/json",
    ...(isForm ? {} : { "Content-Type": "application/json" }),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...headers,
  };

  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: h,
    body:
      body == null
        ? undefined
        : isForm
        ? body
        : isStringBody
        ? body
        : JSON.stringify(body),
    credentials: "omit",
  });

  let json = null;
  try {
    json = await res.json();
  } catch {
    // no body (e.g., 204) is fine
  }

  // Treat non-2xx or { success: false } as errors
  if (!res.ok || json?.success === false) {
    // Extract the first useful validation error if present
    const firstError =
      json?.errors && typeof json.errors === "object"
        ? (() => {
            const k = Object.keys(json.errors)[0];
            const v = k ? json.errors[k] : null;
            return Array.isArray(v) ? v[0] : v;
          })()
        : null;

    const msg =
      json?.message ||
      firstError ||
      (typeof json === "string" ? json : "") ||
      res.statusText ||
      `HTTP ${res.status}`;

    const err = new Error(msg || `HTTP ${res.status}`);
    // attach rich context so callers can branch on .status, .data, etc.
    err.status = res.status;
    err.data = json;
    err.method = method;
    err.path = path;
    err.url = `${BASE}${path}`;
    throw err;
  }

  return json;
}

// Export default too, in case some files do: import api from "..."
export default api;
