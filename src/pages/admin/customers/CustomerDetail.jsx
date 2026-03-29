// src/pages/admin/customers/CustomerDetail.jsx
import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { api } from "../../../lib/api";

const EMPTY_ORDER = {
  id: "",
  status: "pending",
  owner_name: "",
  showroom_name: "",
  car_id: "",
  car_label: "",
  driver_id: "",
  driver_label: "",
  departure: "",
  pickup_location: "",
  destination: "",
  trip_date: "",
  pickup_time: "",
  passengers: "1",
  trip_type: "one_way",
  estimated_km: "",
  rate_per_km: "",
  estimated_total: "",
  notes: "",
};

function unwrap(out) {
  return out?.success !== undefined ? out.data : out;
}

function extractList(payload) {
  const data = unwrap(payload);
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.data)) return data.data;
  if (Array.isArray(data?.items)) return data.items;
  return [];
}

function formatMoney(value) {
  if (value == null || value === "") return "—";
  const num = Number(value);
  if (Number.isNaN(num)) return String(value);
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency: "RWF",
    maximumFractionDigits: 0,
  }).format(num);
}

function toInput(value) {
  return value == null ? "" : String(value);
}

function prettyLabel(value) {
  if (!value) return "—";
  return String(value)
    .replaceAll("_", " ")
    .replace(/\b\w/g, (m) => m.toUpperCase());
}

function normalizeCustomer(raw) {
  const c = unwrap(raw) || {};
  return {
    ...c,
    id: c?.id ?? "",
    code: c?.code || `CUS-${c?.id ?? ""}`,
    name: c?.user?.name || c?.name || c?.customer_name || "Unknown customer",
    email: c?.user?.email || c?.email || "—",
    phone: c?.user?.phone || c?.phone || "—",
    status: c?.status || "active",
    document_no: c?.document_no || "",
    preferences: c?.preferences || {},
  };
}

function normalizeOrder(item) {
  const o = unwrap(item) || {};
  return {
    id: o?.id ?? "",
    status: o?.status || "pending",
    owner_name: o?.owner_name || "",
    showroom_name: o?.showroom_name || "",
    car_id: toInput(o?.car_id),
    car_label: o?.car_label || "",
    driver_id: toInput(o?.driver_id),
    driver_label: o?.driver_label || "",
    departure: o?.departure || o?.pickup_location || "",
    pickup_location: o?.pickup_location || o?.departure || "",
    destination: o?.destination || "",
    trip_date: o?.trip_date || "",
    pickup_time: o?.pickup_time || "",
    passengers: toInput(o?.passengers ?? 1),
    trip_type: o?.trip_type || "one_way",
    estimated_km: toInput(o?.estimated_km),
    rate_per_km: toInput(o?.rate_per_km),
    estimated_total: toInput(o?.estimated_total),
    notes: o?.notes || "",
    raw: o,
  };
}

function DraftBadge() {
  return (
    <span className="inline-flex rounded-full bg-amber-100 px-2.5 py-1 text-[11px] font-semibold text-amber-700">
      Draft
    </span>
  );
}

function StatusBadge({ value }) {
  const v = String(value || "").toLowerCase();
  const klass =
    v === "active" || v === "completed" || v === "confirmed"
      ? "bg-emerald-100 text-emerald-700"
      : v === "pending"
      ? "bg-amber-100 text-amber-700"
      : v === "cancelled" || v === "inactive"
      ? "bg-rose-100 text-rose-700"
      : "bg-slate-100 text-slate-700";

  return (
    <span className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold ${klass}`}>
      {prettyLabel(value)}
    </span>
  );
}

function Field({ label, value }) {
  return (
    <div className="rounded-2xl bg-slate-50 px-4 py-3">
      <div className="text-[11px] uppercase tracking-[0.14em] text-slate-400">{label}</div>
      <div className="mt-1 text-sm font-semibold text-slate-900">{value || "—"}</div>
    </div>
  );
}

function Input({ label, className = "", ...props }) {
  return (
    <label className="block">
      <div className="mb-2 text-sm font-medium text-slate-700">{label}</div>
      <input
        {...props}
        className={`w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100 ${className}`}
      />
    </label>
  );
}

function Select({ label, children, className = "", ...props }) {
  return (
    <label className="block">
      <div className="mb-2 text-sm font-medium text-slate-700">{label}</div>
      <select
        {...props}
        className={`w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100 ${className}`}
      >
        {children}
      </select>
    </label>
  );
}

function Textarea({ label, className = "", ...props }) {
  return (
    <label className="block">
      <div className="mb-2 text-sm font-medium text-slate-700">{label}</div>
      <textarea
        {...props}
        className={`w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100 ${className}`}
      />
    </label>
  );
}

export default function CustomerDetail() {
  const { id } = useParams();
  const nav = useNavigate();

  const [loading, setLoading] = useState(true);
  const [customer, setCustomer] = useState(null);
  const [orders, setOrders] = useState([]);
  const [selectedOrderId, setSelectedOrderId] = useState("");
  const [orderForm, setOrderForm] = useState(EMPTY_ORDER);

  const [savingCustomer, setSavingCustomer] = useState(false);
  const [savingOrder, setSavingOrder] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [err, setErr] = useState("");
  const [notice, setNotice] = useState("");

  const selectedOrder = useMemo(
    () => orders.find((item) => String(item.id) === String(selectedOrderId)) || null,
    [orders, selectedOrderId]
  );

  async function load() {
    setLoading(true);
    setErr("");
    setNotice("");

    try {
      const customerOut = await api(`/customers/${id}`);
      const customerData = normalizeCustomer(customerOut);

      let bookingRows = [];
      try {
        const bookingsOut = await api(`/bookings?customer_id=${id}`);
        bookingRows = extractList(bookingsOut);
      } catch (_) {
        bookingRows = [];
      }

      const normalizedOrders = bookingRows
        .filter((item) => String(item?.customer_id ?? "") === String(id) || !item?.customer_id)
        .map(normalizeOrder);

      setCustomer(customerData);
      setOrders(normalizedOrders);

      if (normalizedOrders.length > 0) {
        setSelectedOrderId(String(normalizedOrders[0].id));
        setOrderForm(normalizedOrders[0]);
      } else {
        const draft = customerData?.preferences?.booking_draft;
        if (draft) {
          const normalizedDraft = normalizeOrder({ ...draft, id: "draft" });
          setSelectedOrderId("draft");
          setOrderForm(normalizedDraft);
        } else {
          setSelectedOrderId("");
          setOrderForm(EMPTY_ORDER);
        }
      }
    } catch (e) {
      setErr(e.message || "Failed to load customer");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, [id]);

  function syncOrderForm(nextId) {
    if (String(nextId) === "draft") {
      const draft = customer?.preferences?.booking_draft;
      if (draft) {
        setSelectedOrderId("draft");
        setOrderForm(normalizeOrder({ ...draft, id: "draft" }));
      }
      return;
    }

    const picked = orders.find((item) => String(item.id) === String(nextId));
    if (picked) {
      setSelectedOrderId(String(nextId));
      setOrderForm({ ...picked });
    }
  }

  function updateOrderField(key, value) {
    setOrderForm((prev) => {
      const next = { ...prev, [key]: value };

      const km = Number(next.estimated_km);
      const rate = Number(next.rate_per_km);
      if (!Number.isNaN(km) && !Number.isNaN(rate) && km > 0 && rate > 0) {
        next.estimated_total = String(Math.round(km * rate));
      }

      return next;
    });
  }

  async function updateCustomerStatus(status) {
    setSavingCustomer(true);
    setErr("");
    setNotice("");

    try {
      const updated = await api(`/customers/${id}`, { method: "PUT", body: { status } });
      const next = normalizeCustomer(updated);
      setCustomer((prev) => ({ ...prev, ...next }));
      setNotice("Customer status updated.");
    } catch (e) {
      setErr(e.message || "Customer update failed");
    } finally {
      setSavingCustomer(false);
    }
  }

  async function saveOrder() {
    setSavingOrder(true);
    setErr("");
    setNotice("");

    const payload = {
      customer_id: Number(id),
      status: orderForm.status || "pending",
      owner_name: orderForm.owner_name || null,
      showroom_name: orderForm.showroom_name || null,
      car_id: orderForm.car_id ? Number(orderForm.car_id) : null,
      car_label: orderForm.car_label || null,
      driver_id: orderForm.driver_id ? Number(orderForm.driver_id) : null,
      driver_label: orderForm.driver_label || null,
      departure: orderForm.departure || null,
      pickup_location: orderForm.pickup_location || orderForm.departure || null,
      destination: orderForm.destination || null,
      trip_date: orderForm.trip_date || null,
      pickup_time: orderForm.pickup_time || null,
      passengers: orderForm.passengers ? Number(orderForm.passengers) : 1,
      trip_type: orderForm.trip_type || "one_way",
      estimated_km: orderForm.estimated_km ? Number(orderForm.estimated_km) : null,
      rate_per_km: orderForm.rate_per_km ? Number(orderForm.rate_per_km) : null,
      estimated_total: orderForm.estimated_total ? Number(orderForm.estimated_total) : null,
      notes: orderForm.notes || null,
      customer_name: customer?.name || null,
      customer_phone: customer?.phone && customer.phone !== "—" ? customer.phone : null,
    };

    try {
      let out;
      if (selectedOrderId && selectedOrderId !== "draft") {
        out = await api(`/bookings/${selectedOrderId}`, { method: "PUT", body: payload });
        const updated = normalizeOrder(out);

        setOrders((prev) =>
          prev.map((item) => (String(item.id) === String(selectedOrderId) ? updated : item))
        );
        setOrderForm(updated);
        setNotice("Order updated successfully.");
      } else {
        out = await api(`/bookings`, { method: "POST", body: payload });
        const created = normalizeOrder(out);
        setOrders((prev) => [created, ...prev]);
        setSelectedOrderId(String(created.id));
        setOrderForm(created);
        setNotice("Order created successfully from draft.");
      }
    } catch (e) {
      setErr(e.message || "Order save failed");
    } finally {
      setSavingOrder(false);
    }
  }

  async function removeCustomer() {
    if (!window.confirm("Delete this customer? This cannot be undone.")) return;

    setDeleting(true);
    setErr("");
    setNotice("");

    try {
      await api(`/customers/${id}`, { method: "DELETE" });
      nav("/admin/customers");
    } catch (e) {
      setErr(e.message || "Delete failed");
    } finally {
      setDeleting(false);
    }
  }

  if (loading) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-600">
        {err ? err : "Loading customer..."}
      </div>
    );
  }

  if (!customer) {
    return (
      <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
        {err || "Customer not found."}
      </div>
    );
  }

  const hasDraftOnly = !orders.length && customer?.preferences?.booking_draft;

  return (
    <div className="space-y-6">
      {(err || notice) && (
        <div
          className={`rounded-2xl px-4 py-3 text-sm ${
            err
              ? "border border-rose-200 bg-rose-50 text-rose-700"
              : "border border-emerald-200 bg-emerald-50 text-emerald-700"
          }`}
        >
          {err || notice}
        </div>
      )}

      <div className="grid gap-6 xl:grid-cols-[1.05fr_1.35fr]">
        <div className="space-y-6">
          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                  Customer Profile
                </div>
                <h2 className="mt-2 text-2xl font-bold text-slate-950">{customer.name}</h2>
                <p className="mt-1 text-sm text-slate-500">{customer.email}</p>
              </div>
              <StatusBadge value={customer.status} />
            </div>

            <div className="mt-5 grid gap-3 md:grid-cols-2">
              <Field label="Code" value={customer.code} />
              <Field label="Phone" value={customer.phone} />
              <Field label="Document No" value={customer.document_no || "—"} />
              <Field label="Source" value={prettyLabel(customer.preferences?.customer_source)} />
            </div>

            <div className="mt-5 flex flex-wrap items-center gap-3">
              <Select
                label="Customer Status"
                value={customer.status}
                onChange={(e) => updateCustomerStatus(e.target.value)}
                className="min-w-[180px]"
              >
                <option value="active">active</option>
                <option value="inactive">inactive</option>
              </Select>

              <button
                type="button"
                onClick={removeCustomer}
                disabled={deleting || savingCustomer}
                className="mt-7 inline-flex items-center justify-center rounded-2xl border border-rose-300 px-4 py-3 text-sm font-semibold text-rose-700 hover:bg-rose-50 disabled:opacity-60"
              >
                {deleting ? "Deleting..." : "Delete Customer"}
              </button>
            </div>

            {savingCustomer ? (
              <div className="mt-3 text-xs text-slate-500">Saving customer...</div>
            ) : null}
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                  Orders / Bookings
                </div>
                <h3 className="mt-2 text-lg font-semibold text-slate-950">
                  Click a card to edit
                </h3>
              </div>
              <div className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                {orders.length} saved
              </div>
            </div>

            <div className="mt-4 space-y-3">
              {orders.map((order) => {
                const active = String(selectedOrderId) === String(order.id);
                return (
                  <button
                    key={order.id}
                    type="button"
                    onClick={() => syncOrderForm(order.id)}
                    className={`w-full rounded-2xl border p-4 text-left transition ${
                      active
                        ? "border-blue-300 bg-blue-50 shadow-sm"
                        : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <div className="text-sm font-semibold text-slate-900">
                          {order.car_label || order.destination || `Order #${order.id}`}
                        </div>
                        <div className="mt-1 text-xs text-slate-500">
                          {order.trip_date || "No date"} • {order.pickup_time || "No time"}
                        </div>
                      </div>
                      <StatusBadge value={order.status} />
                    </div>

                    <div className="mt-3 grid gap-2 md:grid-cols-2">
                      <div className="text-xs text-slate-600">
                        <span className="font-semibold text-slate-800">From:</span>{" "}
                        {order.departure || order.pickup_location || "—"}
                      </div>
                      <div className="text-xs text-slate-600">
                        <span className="font-semibold text-slate-800">To:</span>{" "}
                        {order.destination || "—"}
                      </div>
                    </div>
                  </button>
                );
              })}

              {hasDraftOnly ? (
                <button
                  type="button"
                  onClick={() => syncOrderForm("draft")}
                  className={`w-full rounded-2xl border p-4 text-left transition ${
                    selectedOrderId === "draft"
                      ? "border-amber-300 bg-amber-50 shadow-sm"
                      : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50"
                  }`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <div className="text-sm font-semibold text-slate-900">Draft Order</div>
                      <div className="mt-1 text-xs text-slate-500">
                        No saved booking yet. Click to create from draft.
                      </div>
                    </div>
                    <DraftBadge />
                  </div>
                </button>
              ) : null}

              {!orders.length && !hasDraftOnly ? (
                <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-sm text-slate-500">
                  No order found for this customer.
                </div>
              ) : null}
            </div>
          </div>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                Order Editor
              </div>
              <h2 className="mt-2 text-xl font-semibold text-slate-950">
                {selectedOrderId === "draft"
                  ? "Draft Order"
                  : selectedOrderId
                  ? `Order #${selectedOrderId}`
                  : "Select an order"}
              </h2>
            </div>

            {selectedOrderId === "draft" ? <DraftBadge /> : <StatusBadge value={orderForm.status} />}
          </div>

          {!selectedOrderId ? (
            <div className="mt-6 rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-sm text-slate-500">
              Select a booking card on the left to edit it.
            </div>
          ) : (
            <>
              <div className="mt-6 grid gap-4 md:grid-cols-2">
                <Select
                  label="Order Status"
                  value={orderForm.status}
                  onChange={(e) => updateOrderField("status", e.target.value)}
                >
                  <option value="pending">pending</option>
                  <option value="confirmed">confirmed</option>
                  <option value="completed">completed</option>
                  <option value="cancelled">cancelled</option>
                </Select>

                <Input
                  label="Owner Name"
                  value={orderForm.owner_name}
                  onChange={(e) => updateOrderField("owner_name", e.target.value)}
                  placeholder="Owner name"
                />

                <Input
                  label="Showroom Name"
                  value={orderForm.showroom_name}
                  onChange={(e) => updateOrderField("showroom_name", e.target.value)}
                  placeholder="Showroom name"
                />

                <Input
                  label="Car ID"
                  value={orderForm.car_id}
                  onChange={(e) => updateOrderField("car_id", e.target.value)}
                  placeholder="Car id"
                />

                <Input
                  label="Car Label"
                  value={orderForm.car_label}
                  onChange={(e) => updateOrderField("car_label", e.target.value)}
                  placeholder="Example: Toyota RAV4"
                />

                <Input
                  label="Driver ID"
                  value={orderForm.driver_id}
                  onChange={(e) => updateOrderField("driver_id", e.target.value)}
                  placeholder="Driver id"
                />

                <Input
                  label="Driver Label"
                  value={orderForm.driver_label}
                  onChange={(e) => updateOrderField("driver_label", e.target.value)}
                  placeholder="Driver name"
                />

                <Input
                  label="Trip Date"
                  type="date"
                  value={orderForm.trip_date}
                  onChange={(e) => updateOrderField("trip_date", e.target.value)}
                />

                <Input
                  label="Pickup Time"
                  type="time"
                  value={orderForm.pickup_time}
                  onChange={(e) => updateOrderField("pickup_time", e.target.value)}
                />

                <Input
                  label="Departure"
                  value={orderForm.departure}
                  onChange={(e) => {
                    updateOrderField("departure", e.target.value);
                    updateOrderField("pickup_location", e.target.value);
                  }}
                  placeholder="Pickup location"
                />

                <Input
                  label="Destination"
                  value={orderForm.destination}
                  onChange={(e) => updateOrderField("destination", e.target.value)}
                  placeholder="Destination"
                />

                <Input
                  label="Passengers"
                  type="number"
                  min="1"
                  value={orderForm.passengers}
                  onChange={(e) => updateOrderField("passengers", e.target.value)}
                />

                <Select
                  label="Trip Type"
                  value={orderForm.trip_type}
                  onChange={(e) => updateOrderField("trip_type", e.target.value)}
                >
                  <option value="one_way">one_way</option>
                  <option value="round_trip">round_trip</option>
                </Select>

                <Input
                  label="Estimated KM"
                  type="number"
                  min="0"
                  step="0.1"
                  value={orderForm.estimated_km}
                  onChange={(e) => updateOrderField("estimated_km", e.target.value)}
                />

                <Input
                  label="Rate per KM"
                  type="number"
                  min="0"
                  step="1"
                  value={orderForm.rate_per_km}
                  onChange={(e) => updateOrderField("rate_per_km", e.target.value)}
                />

                <Input
                  label="Estimated Total"
                  type="number"
                  min="0"
                  step="1"
                  value={orderForm.estimated_total}
                  onChange={(e) => updateOrderField("estimated_total", e.target.value)}
                />
              </div>

              <div className="mt-4">
                <Textarea
                  label="Notes"
                  rows={4}
                  value={orderForm.notes}
                  onChange={(e) => updateOrderField("notes", e.target.value)}
                  placeholder="Additional order notes"
                />
              </div>

              <div className="mt-6 grid gap-3 md:grid-cols-3">
                <Field label="Car" value={orderForm.car_label || "—"} />
                <Field label="Route" value={`${orderForm.departure || "—"} → ${orderForm.destination || "—"}`} />
                <Field label="Estimated Value" value={formatMoney(orderForm.estimated_total)} />
              </div>

              <div className="mt-6 flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={saveOrder}
                  disabled={savingOrder}
                  className={`inline-flex items-center justify-center rounded-2xl px-5 py-3 text-sm font-semibold text-white ${
                    savingOrder
                      ? "cursor-not-allowed bg-slate-400"
                      : "bg-blue-600 hover:bg-blue-700"
                  }`}
                >
                  {savingOrder
                    ? "Saving..."
                    : selectedOrderId === "draft"
                    ? "Create Order"
                    : "Save Order Changes"}
                </button>

                <button
                  type="button"
                  onClick={() => syncOrderForm(selectedOrderId)}
                  disabled={savingOrder}
                  className="inline-flex items-center justify-center rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60"
                >
                  Reset
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}