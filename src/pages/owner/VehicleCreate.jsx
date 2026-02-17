// src/pages/owner/VehicleCreate.jsx
import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../lib/api";

import {
  useJsApiLoader,
  Autocomplete,
  GoogleMap,
  MarkerF,
} from "@react-google-maps/api";

/**
 * ✅ IMPORTANT:
 * - Owners MUST use /showroom/vehicles (allowed by role middleware)
 * - /vehicles is only for admin/manager/agent
 */
const SHOWROOM_BASE = "/showroom/vehicles";

// Prefer Maps key but fallback to Places key (you can use 1 key for both)
const GOOGLE_KEY =
  import.meta.env.VITE_GOOGLE_MAPS_API_KEY ||
  import.meta.env.VITE_GOOGLE_PLACES_KEY ||
  "";

const MAP_LIBS = ["places"];

const STEPS = [
  { key: "basic", title: "Basic details", desc: "Plate, vehicle type & model" },
  { key: "specs", title: "Specifications", desc: "Year, seats, fuel & gearbox" },
  { key: "pricing", title: "Pricing, location & photos", desc: "Rates + map + images" },
  { key: "review", title: "Review & submit", desc: "Confirm everything" },
];

/**
 * Hard-coded vehicle types and allowed makes
 * (mirrors your VehicleTypeSeeder)
 */
const VEHICLE_TYPES = [
  {
    id: 1,
    name: "Sedan",
    attributes: {
      allowed_makes: ["Toyota", "Honda", "Nissan", "Ford", "Hyundai", "Kia", "Volkswagen", "Mercedes", "BMW", "Tesla"],
    },
  },
  {
    id: 2,
    name: "SUV / Crossover",
    attributes: {
      allowed_makes: ["Toyota", "Honda", "Nissan", "Ford", "Hyundai", "Kia", "Volkswagen", "Mercedes", "BMW", "Tesla"],
    },
  },
  {
    id: 3,
    name: "Hatchback",
    attributes: {
      allowed_makes: ["Toyota", "Honda", "Nissan", "Ford", "Hyundai", "Kia", "Volkswagen", "Mercedes", "BMW", "Tesla"],
    },
  },
  {
    id: 4,
    name: "Pickup / Truck",
    attributes: { allowed_makes: ["Toyota", "Nissan", "Ford"] },
  },
  {
    id: 5,
    name: "Van / Minibus",
    attributes: { allowed_makes: ["Toyota", "Hyundai", "Kia", "Ford"] },
  },
  {
    id: 6,
    name: "Luxury",
    attributes: { allowed_makes: ["Mercedes", "BMW", "Tesla"] },
  },
  {
    id: 7,
    name: "Electric",
    attributes: { allowed_makes: ["Tesla"] },
  },
];

/**
 * Hard-coded make → models catalog
 * (mirrors your VehicleMakeModelSeeder)
 */
const VEHICLE_CATALOG = {
  Toyota: ["Corolla", "Camry", "RAV4", "Hilux", "Yaris"],
  Honda: ["Civic", "Accord", "CR-V", "Fit", "HR-V"],
  Nissan: ["Sentra", "Altima", "X-Trail", "Navara", "Micra"],
  Ford: ["Fiesta", "Focus", "Explorer", "Ranger", "Mustang"],
  Hyundai: ["i10", "i20", "Elantra", "Tucson", "Santa Fe"],
  Kia: ["Rio", "Cerato", "Sportage", "Sorento", "Picanto"],
  Volkswagen: ["Polo", "Golf", "Passat", "Tiguan", "Jetta"],
  Mercedes: ["C-Class", "E-Class", "GLC", "GLE", "A-Class"],
  BMW: ["3 Series", "5 Series", "X3", "X5", "1 Series"],
  Tesla: ["Model 3", "Model Y", "Model S", "Model X"],
};

export default function VehicleCreate({
  embedded = false,
  onSuccess,
  onCancel,

  // ✅ NEW props for edit support
  mode = "create",               // "create" | "edit"
  vehicleId = null,              // number | null

  // ✅ FIX: owner default is showroom base
  resourceBase = SHOWROOM_BASE,  // "/showroom/vehicles" OR "/vehicles"

  initialValues = null,          // object to prefill
}) {
  const navigate = useNavigate();

  const isEdit = mode === "edit" && !!vehicleId;

  // ✅ Always use ONE base for all requests (create/edit/images upload)
  const BASE = (String(resourceBase || "").trim().replace(/\/+$/, "") || SHOWROOM_BASE);

  const [step, setStep] = useState(0);
  const [busy, setBusy] = useState(false);
  const [flash, setFlash] = useState(null);
  const [errors, setErrors] = useState({});

  const [types] = useState(VEHICLE_TYPES);
  const [catalog] = useState(VEHICLE_CATALOG);

  const [makeOptions, setMakeOptions] = useState([]);
  const [modelOptions, setModelOptions] = useState([]);

  // ✅ Images (cover + gallery 3)
  const coverInputRef = useRef(null);
  const galleryInputRef = useRef(null);

  const [coverFile, setCoverFile] = useState(null);
  const [galleryFiles, setGalleryFiles] = useState([]); // up to 3

  const [existingImages, setExistingImages] = useState([]); // for edit
  const [imagesLoading, setImagesLoading] = useState(false);

  const [form, setForm] = useState({
    vehicle_type_id: "",
    plate_no: "",
    make: "",
    model: "",
    year: "",
    seats: "",
    fuel_type: "",
    transmission: "",
    odometer_km: "",
    base_daily_rate: "",
    base_hourly_rate: "",
    status: "available",

    // keep location_id hidden (in case backend requires it)
    location_id: "",

    // map values (we store them in media.map_location)
    location_address: "",
    location_lat: "",
    location_lng: "",
    google_place_id: "",
  });

  // ✅ Prefill on edit (main fix)
  useEffect(() => {
    if (!initialValues) return;
    setForm((prev) => ({ ...prev, ...initialValues }));
  }, [initialValues]);

  // ✅ load existing images when editing
  useEffect(() => {
    if (!isEdit) return;

    (async () => {
      try {
        setImagesLoading(true);
        // ✅ IMPORTANT: use BASE (not hardcoded showroom)
        const res = await api(`${BASE}/${vehicleId}/images`);
        const list = res?.data || res || [];
        setExistingImages(Array.isArray(list) ? list : []);
      } catch (e) {
        console.warn("Failed to load vehicle images", e);
      } finally {
        setImagesLoading(false);
      }
    })();
  }, [isEdit, vehicleId, BASE]);

  const currentStep = STEPS[step];

  const updateField = (name, value) => {
    setForm((f) => {
      const next = { ...f, [name]: value };

      if (name === "vehicle_type_id") {
        next.make = "";
        next.model = "";
      }
      if (name === "make") {
        next.model = "";
      }

      return next;
    });
    setErrors((e) => ({ ...e, [name]: undefined }));
  };

  // type -> make options
  useEffect(() => {
    const typeId = form.vehicle_type_id;
    if (!typeId) {
      setMakeOptions([]);
      setModelOptions([]);
      return;
    }

    let brands = Object.keys(catalog || {});
    const selectedType = (types || []).find(
      (t) => String(t.id) === String(typeId)
    );

    const allowedMakes = selectedType?.attributes?.allowed_makes || null;

    if (Array.isArray(allowedMakes) && allowedMakes.length) {
      const filtered = brands.filter((b) => allowedMakes.includes(b));
      if (filtered.length) brands = filtered;
    }

    const makeOpts = brands.map((b) => ({ value: b, label: b }));
    setMakeOptions(makeOpts);
    setModelOptions([]);

    setForm((prev) => {
      const next = { ...prev };
      if (
        next.make &&
        !makeOpts.some((o) => String(o.value) === String(next.make))
      ) {
        next.make = "";
        next.model = "";
      }
      if (!next.make && makeOpts.length === 1) next.make = makeOpts[0].value;
      return next;
    });
  }, [form.vehicle_type_id, catalog, types]);

  // make -> model options
  useEffect(() => {
    const make = form.make;
    if (!make) {
      setModelOptions([]);
      return;
    }
    const models = (catalog && catalog[make]) || [];
    const opts = models.map((m) => ({ value: m, label: m }));
    setModelOptions(opts);

    setForm((prev) => {
      const next = { ...prev };
      if (
        next.model &&
        !opts.some((o) => String(o.value) === String(next.model))
      ) {
        next.model = "";
      }
      return next;
    });
  }, [form.make, catalog]);

  const validateStep = () => {
    const e = {};

    if (currentStep.key === "basic") {
      if (!form.vehicle_type_id) e.vehicle_type_id = "Select vehicle type";
      if (!form.plate_no.trim()) e.plate_no = "Plate number is required";
      if (!form.make.trim()) e.make = "Make is required";
      if (!form.model.trim()) e.model = "Model is required";
    }

    if (currentStep.key === "specs") {
      if (!form.year) e.year = "Year is required";
      if (!form.seats) e.seats = "Seats is required";
      if (!form.fuel_type) e.fuel_type = "Select fuel type";
      if (!form.transmission) e.transmission = "Select transmission";
    }

    if (currentStep.key === "pricing") {
      if (!form.base_daily_rate) e.base_daily_rate = "Daily rate is required";
      if (!String(form.location_address || "").trim()) {
        e.location_address = "Pick location on Google Maps or type address";
      }
    }

    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const next = () => {
    if (step < STEPS.length - 1) {
      if (!validateStep()) return;
      setStep((s) => s + 1);
    }
  };

  const prev = () => {
    if (step > 0) setStep((s) => s - 1);
  };

  const handleBackOrCancel = () => {
    if (step === 0) {
      if (embedded) onCancel && onCancel();
      else navigate(-1);
    } else {
      prev();
    }
  };

  // image pick
  const pickCover = () => coverInputRef.current?.click();
  const pickGallery = () => galleryInputRef.current?.click();

  const onCoverChange = (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setCoverFile(file);
  };

  const onGalleryChange = (e) => {
    const files = Array.from(e.target.files || []);
    e.target.value = "";
    if (!files.length) return;

    const merged = [...galleryFiles, ...files].slice(0, 3); // max 3
    setGalleryFiles(merged);
  };

  const removeGalleryIndex = (idx) => {
    setGalleryFiles((prev) => prev.filter((_, i) => i !== idx));
  };

  async function uploadImagesAfterSave(id) {
    // ✅ cover first (primary)
    if (coverFile) {
      const fd = new FormData();
      fd.append("image", coverFile);
      fd.append("is_primary", "1");

      // ✅ IMPORTANT: use BASE
      await api(`${BASE}/${id}/images`, {
        method: "POST",
        body: fd,
      });
    }

    // ✅ gallery (up to 3)
    for (const file of galleryFiles) {
      const fd = new FormData();
      fd.append("image", file);
      fd.append("is_primary", "0");

      // ✅ IMPORTANT: use BASE
      await api(`${BASE}/${id}/images`, {
        method: "POST",
        body: fd,
      });
    }
  }

  const submit = async () => {
    if (!validateStep()) return;

    setBusy(true);
    setFlash(null);
    setErrors({});

    // ✅ ONLY send REAL columns (avoid image_url SQL error)
    // ✅ store map info inside "media.map_location" (safe)
    const payload = {
      vehicle_type_id: form.vehicle_type_id ? Number(form.vehicle_type_id) : null,
      plate_no: String(form.plate_no || "").toUpperCase().replace(/\s+/g, ""),
      make: String(form.make || ""),
      model: String(form.model || ""),
      year: form.year ? Number(form.year) : null,
      seats: form.seats ? Number(form.seats) : null,
      fuel_type: String(form.fuel_type || ""),
      transmission: String(form.transmission || ""),
      odometer_km: form.odometer_km ? Number(form.odometer_km) : null,
      base_daily_rate: form.base_daily_rate ? Number(form.base_daily_rate) : null,
      base_hourly_rate: form.base_hourly_rate ? Number(form.base_hourly_rate) : null,
      status: String(form.status || "available"),

      ...(form.location_id ? { location_id: Number(form.location_id) } : {}),

      media: {
        map_location: {
          address: String(form.location_address || ""),
          lat: form.location_lat ? Number(form.location_lat) : null,
          lng: form.location_lng ? Number(form.location_lng) : null,
          place_id: String(form.google_place_id || ""),
        },
      },
    };

    // clean nulls
    Object.keys(payload).forEach((k) => payload[k] == null && delete payload[k]);

    try {
      if (isEdit) {
        // ✅ PATCH edit (BASE!)
        await api(`${BASE}/${vehicleId}`, {
          method: "PATCH",
          body: payload,
        });

        const hasNewImages = !!coverFile || galleryFiles.length > 0;
        if (hasNewImages) {
          await uploadImagesAfterSave(vehicleId);
        }
      } else {
        // ✅ POST create (BASE!)
        const res = await api(`${BASE}`, {
          method: "POST",
          body: payload,
        });

        const created = res?.data || res || {};
        const createdId = created?.id || created?.data?.id;

        if (!createdId) {
          throw new Error("Vehicle created but no ID returned.");
        }

        // upload cover + gallery after create
        await uploadImagesAfterSave(createdId);
      }

      setFlash({
        type: "success",
        text: isEdit ? "Vehicle updated successfully!" : "Vehicle created successfully!",
      });

      onSuccess && onSuccess();
    } catch (e) {
      console.error(e);
      const data = e?.data || {};
      const serverErrors = data?.errors || data || {};
      setErrors(normalizeLaravelErrors(serverErrors));
      setFlash({
        type: "error",
        text: data?.message || e?.message || "Could not save vehicle.",
      });
    } finally {
      setBusy(false);
    }
  };

  const progress = ((step + 1) / STEPS.length) * 100;

  return (
    <div className="max-w-4xl mx-auto py-8 px-4 sm:px-6">
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">
            {isEdit ? "Edit vehicle" : "Add a new vehicle"}
          </h1>
          <p className="text-sm text-slate-500">
            Step {step + 1} of {STEPS.length} • {currentStep.title}
          </p>
          <p className="mt-1 text-xs text-slate-400">
            API base: <span className="font-semibold">{BASE}</span>
          </p>
        </div>
      </div>

      <div className="mb-6">
        <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
          <span>{STEPS[0].title}</span>
          <span>{STEPS[STEPS.length - 1].title}</span>
        </div>
        <div className="h-2 w-full rounded-full bg-slate-200 overflow-hidden">
          <div
            className="h-full rounded-full bg-emerald-500 transition-all"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {flash && (
        <div
          className={[
            "mb-4 rounded-lg px-3 py-2 text-sm",
            flash.type === "success"
              ? "border border-emerald-500/30 bg-emerald-50 text-emerald-800"
              : "border border-rose-500/30 bg-rose-50 text-rose-800",
          ].join(" ")}
        >
          {flash.text}
        </div>
      )}

      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm shadow-slate-900/5">
        {currentStep.key === "basic" && (
          <StepBasic
            form={form}
            errors={errors}
            onChange={updateField}
            types={types}
            makes={makeOptions}
            models={modelOptions}
          />
        )}

        {currentStep.key === "specs" && (
          <StepSpecs form={form} errors={errors} onChange={updateField} />
        )}

        {currentStep.key === "pricing" && (
          <StepPricing
            form={form}
            errors={errors}
            onChange={updateField}
            onPickCover={pickCover}
            onPickGallery={pickGallery}
            coverFile={coverFile}
            galleryFiles={galleryFiles}
            removeGalleryIndex={removeGalleryIndex}
            coverInputRef={coverInputRef}
            galleryInputRef={galleryInputRef}
            onCoverChange={onCoverChange}
            onGalleryChange={onGalleryChange}
            existingImages={existingImages}
            imagesLoading={imagesLoading}
          />
        )}

        {currentStep.key === "review" && (
          <StepReview form={form} types={types} />
        )}

        <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
          <button
            type="button"
            onClick={handleBackOrCancel}
            className="inline-flex items-center justify-center rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            {step === 0 ? "Cancel" : "Back"}
          </button>

          <div className="flex gap-3">
            {step < STEPS.length - 1 && (
              <button
                type="button"
                onClick={next}
                className="inline-flex items-center justify-center rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700"
              >
                Next step
              </button>
            )}

            {step === STEPS.length - 1 && (
              <button
                type="button"
                onClick={submit}
                disabled={busy}
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {busy ? (
                  <>
                    <span className="h-4 w-4 rounded-full border-2 border-white border-r-transparent animate-spin" />
                    Saving…
                  </>
                ) : isEdit ? (
                  "Update vehicle"
                ) : (
                  "Create vehicle"
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ---------------- steps ---------------- */

function StepBasic({ form, errors, onChange, types, makes, models }) {
  return (
    <div className="space-y-4">
      <StepTitle
        title="Basic details"
        desc="Identify the car and pick the right category."
      />

      <div className="grid gap-4 sm:grid-cols-2">
        <FieldSelect
          label="Vehicle type"
          name="vehicle_type_id"
          value={form.vehicle_type_id}
          onChange={onChange}
          error={errors.vehicle_type_id}
          options={[
            { value: "", label: "Select type…" },
            ...(types || []).map((t) => ({
              value: t.id,
              label: t.name || `Type: ${t.id}`,
            })),
          ]}
        />

        <FieldInput
          label="Plate number"
          name="plate_no"
          value={form.plate_no}
          onChange={onChange}
          error={errors.plate_no}
          placeholder="RAB 123 C"
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <FieldSelect
          label="Make"
          name="make"
          value={form.make}
          onChange={onChange}
          error={errors.make}
          disabled={!form.vehicle_type_id || !makes.length}
          options={[
            {
              value: "",
              label: !form.vehicle_type_id
                ? "Select type first…"
                : makes.length
                ? "Select make…"
                : "No makes available",
            },
            ...makes,
          ]}
        />

        <FieldSelect
          label="Model"
          name="model"
          value={form.model}
          onChange={onChange}
          error={errors.model}
          disabled={!form.make || !models.length}
          options={[
            {
              value: "",
              label: !form.make
                ? "Select make first…"
                : models.length
                ? "Select model…"
                : "No models for this make",
            },
            ...models,
          ]}
        />
      </div>
    </div>
  );
}

function StepSpecs({ form, errors, onChange }) {
  return (
    <div className="space-y-4">
      <StepTitle
        title="Specifications"
        desc="Tell us more about the vehicle’s capabilities."
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <FieldInput
          label="Year"
          type="number"
          name="year"
          value={form.year}
          onChange={onChange}
          error={errors.year}
          min={1980}
          max={new Date().getFullYear() + 1}
        />
        <FieldInput
          label="Number of seats"
          type="number"
          name="seats"
          value={form.seats}
          onChange={onChange}
          error={errors.seats}
          min={1}
          max={20}
        />
        <FieldInput
          label="Odometer (km)"
          type="number"
          name="odometer_km"
          value={form.odometer_km}
          onChange={onChange}
          error={errors.odometer_km}
          min={0}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <FieldSelect
          label="Fuel type"
          name="fuel_type"
          value={form.fuel_type}
          onChange={onChange}
          error={errors.fuel_type}
          options={[
            { value: "", label: "Select fuel…" },
            { value: "petrol", label: "Petrol" },
            { value: "diesel", label: "Diesel" },
            { value: "hybrid", label: "Hybrid" },
            { value: "electric", label: "Electric" },
          ]}
        />
        <FieldSelect
          label="Transmission"
          name="transmission"
          value={form.transmission}
          onChange={onChange}
          error={errors.transmission}
          options={[
            { value: "", label: "Select transmission…" },
            { value: "automatic", label: "Automatic" },
            { value: "manual", label: "Manual" },
          ]}
        />
      </div>
    </div>
  );
}

function StepPricing({
  form,
  errors,
  onChange,

  onPickCover,
  onPickGallery,
  coverFile,
  galleryFiles,
  removeGalleryIndex,
  coverInputRef,
  galleryInputRef,
  onCoverChange,
  onGalleryChange,

  existingImages,
  imagesLoading,
}) {
  const coverPreview = coverFile ? URL.createObjectURL(coverFile) : "";
  const galleryPreviews = galleryFiles.map((f) => URL.createObjectURL(f));

  const primaryExisting =
    (existingImages || []).find((x) => x.is_primary) || existingImages?.[0];

  const galleryExisting =
    (existingImages || []).filter((x) => !x.is_primary).slice(0, 3);

  return (
    <div className="space-y-4">
      <StepTitle
        title="Pricing, location & photos"
        desc="Rates + Google map location + vehicle images."
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <FieldInput
          label="Daily rate (RWF)"
          type="number"
          name="base_daily_rate"
          value={form.base_daily_rate}
          onChange={onChange}
          error={errors.base_daily_rate}
          min={0}
        />
        <FieldInput
          label="Hourly rate (RWF)"
          type="number"
          name="base_hourly_rate"
          value={form.base_hourly_rate}
          onChange={onChange}
          error={errors.base_hourly_rate}
          min={0}
        />
        <FieldSelect
          label="Status"
          name="status"
          value={form.status}
          onChange={onChange}
          error={errors.status}
          options={[
            { value: "available", label: "Available" },
            { value: "in_service", label: "In service" },
            { value: "booked", label: "Booked" },
            { value: "maintenance", label: "Maintenance" },
            { value: "inactive", label: "Inactive" },
          ]}
        />
      </div>

      {/* ✅ Google Maps picker */}
      <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
        <MapLocationPicker form={form} errors={errors} onChange={onChange} />
        {errors.location_address && (
          <p className="mt-2 text-[11px] text-rose-600">
            {errors.location_address}
          </p>
        )}
      </div>

      {/* ✅ Photos */}
      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="text-sm font-semibold text-slate-900">Vehicle photos</div>
            <div className="text-xs text-slate-500">
              Cover image + up to 3 additional images.
            </div>
          </div>
        </div>

        {/* cover */}
        <div className="mt-4">
          <div className="flex items-center justify-between">
            <div className="text-xs font-medium text-slate-700">Cover image</div>
            <button
              type="button"
              onClick={onPickCover}
              className="rounded-lg bg-emerald-600 px-3 py-2 text-xs font-semibold text-white hover:bg-emerald-700"
            >
              Upload cover
            </button>
          </div>

          <input
            ref={coverInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={onCoverChange}
          />

          <div className="mt-2 grid gap-3 sm:grid-cols-2">
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-2">
              <div className="text-[11px] text-slate-500 mb-2">Selected cover</div>
              {coverPreview ? (
                <img
                  src={coverPreview}
                  alt="Cover preview"
                  className="h-36 w-full object-cover rounded-md border border-slate-200"
                />
              ) : (
                <div className="h-36 w-full grid place-items-center text-xs text-slate-400">
                  No new cover selected
                </div>
              )}
            </div>

            <div className="rounded-lg border border-slate-200 bg-slate-50 p-2">
              <div className="text-[11px] text-slate-500 mb-2">Current cover</div>
              {imagesLoading ? (
                <div className="h-36 w-full grid place-items-center text-xs text-slate-400">
                  Loading…
                </div>
              ) : primaryExisting?.image_url ? (
                <img
                  src={primaryExisting.image_url}
                  alt="Existing cover"
                  className="h-36 w-full object-cover rounded-md border border-slate-200"
                />
              ) : (
                <div className="h-36 w-full grid place-items-center text-xs text-slate-400">
                  No cover uploaded yet
                </div>
              )}
            </div>
          </div>
        </div>

        {/* gallery */}
        <div className="mt-5">
          <div className="flex items-center justify-between">
            <div className="text-xs font-medium text-slate-700">
              Gallery images (max 3)
            </div>
            <button
              type="button"
              onClick={onPickGallery}
              className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
            >
              Add gallery images
            </button>
          </div>

          <input
            ref={galleryInputRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={onGalleryChange}
          />

          <div className="mt-3 grid gap-3 sm:grid-cols-3">
            {galleryPreviews.map((src, idx) => (
              <div
                key={idx}
                className="relative rounded-lg border border-slate-200 overflow-hidden bg-slate-50"
              >
                <img src={src} alt="Gallery preview" className="h-28 w-full object-cover" />
                <button
                  type="button"
                  onClick={() => removeGalleryIndex(idx)}
                  className="absolute top-2 right-2 rounded-full bg-black/70 text-white text-xs px-2 py-1"
                >
                  ✕
                </button>
              </div>
            ))}

            {galleryPreviews.length === 0 &&
              galleryExisting?.map((img) => (
                <div
                  key={img.id}
                  className="rounded-lg border border-slate-200 overflow-hidden bg-slate-50"
                >
                  <img
                    src={img.image_url}
                    alt="Existing gallery"
                    className="h-28 w-full object-cover"
                  />
                </div>
              ))}
          </div>

          <p className="mt-2 text-[11px] text-slate-500">
            New images will upload when you submit.
          </p>
        </div>
      </div>
    </div>
  );
}

function StepReview({ form, types }) {
  const type = (types || []).find(
    (t) => String(t.id) === String(form.vehicle_type_id)
  );

  const rows = [
    ["Vehicle type", type ? type.name : "—"],
    ["Plate number", form.plate_no || "—"],
    ["Make / Model", `${form.make || "—"} ${form.model || ""}`.trim()],
    ["Year", form.year || "—"],
    ["Seats", form.seats || "—"],
    ["Fuel", form.fuel_type || "—"],
    ["Transmission", form.transmission || "—"],
    ["Odometer (km)", form.odometer_km || "—"],
    ["Daily rate", form.base_daily_rate ? `${form.base_daily_rate} RWF` : "—"],
    ["Hourly rate", form.base_hourly_rate ? `${form.base_hourly_rate} RWF` : "—"],
    ["Status", form.status || "available"],
    ["Location", form.location_address || "—"],
  ];

  return (
    <div className="space-y-4">
      <StepTitle
        title="Review & submit"
        desc="Confirm the details below before saving."
      />

      <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm">
        <dl className="grid gap-3 sm:grid-cols-2">
          {rows.map(([label, value]) => (
            <div key={label} className="flex flex-col">
              <dt className="text-xs font-medium uppercase text-slate-500">
                {label}
              </dt>
              <dd className="text-sm text-slate-900">{value}</dd>
            </div>
          ))}
        </dl>
      </div>

      <p className="text-xs text-slate-500">
        By submitting, you confirm that this vehicle is correctly registered and
        legally allowed to be rented in your country.
      </p>
    </div>
  );
}

/* ✅ Google Maps + Places location picker */
function MapLocationPicker({ form, errors, onChange }) {
  const libraries = useMemo(() => MAP_LIBS, []);
  const { isLoaded, loadError } = useJsApiLoader({
    googleMapsApiKey: GOOGLE_KEY,
    libraries,
  });

  const [auto, setAuto] = useState(null);

  // Default Kigali center
  const fallbackCenter = { lat: -1.9441, lng: 30.0619 };

  const center = useMemo(() => {
    const lat = form.location_lat ? Number(form.location_lat) : null;
    const lng = form.location_lng ? Number(form.location_lng) : null;
    if (lat && lng) return { lat, lng };
    return fallbackCenter;
  }, [form.location_lat, form.location_lng]);

  const markerPos =
    form.location_lat && form.location_lng
      ? { lat: Number(form.location_lat), lng: Number(form.location_lng) }
      : null;

  const onPlaceChanged = () => {
    if (!auto) return;
    const place = auto.getPlace();
    const geom = place?.geometry?.location;
    if (!geom) return;

    const lat = geom.lat();
    const lng = geom.lng();
    const address = place?.formatted_address || place?.name || "";

    onChange("location_address", address);
    onChange("location_lat", String(lat));
    onChange("location_lng", String(lng));
    onChange("google_place_id", place?.place_id || "");
  };

  const handleMapClick = (e) => {
    const lat = e?.latLng?.lat?.();
    const lng = e?.latLng?.lng?.();
    if (!lat || !lng) return;

    onChange("location_lat", String(lat));
    onChange("location_lng", String(lng));

    if (window.google?.maps?.Geocoder) {
      const geocoder = new window.google.maps.Geocoder();
      geocoder.geocode({ location: { lat, lng } }, (results, status) => {
        if (status === "OK" && results?.[0]) {
          onChange("location_address", results[0].formatted_address || "");
          onChange("google_place_id", results[0].place_id || "");
        }
      });
    }
  };

  if (!GOOGLE_KEY) {
    return (
      <div className="text-sm text-slate-700">
        <p className="font-semibold text-slate-900 mb-1">Location address</p>
        <input
          type="text"
          value={form.location_address ?? ""}
          onChange={(e) => onChange("location_address", e.target.value)}
          placeholder="Type address manually…"
          className={[
            "w-full rounded-lg border px-3 py-2 text-sm outline-none",
            errors.location_address
              ? "border-rose-300 focus:ring-2 focus:ring-rose-400"
              : "border-slate-200 focus:ring-2 focus:ring-emerald-400",
          ].join(" ")}
        />
        <p className="mt-2 text-[11px] text-slate-500">
          Google Maps key missing. Add <b>VITE_GOOGLE_MAPS_API_KEY</b>.
        </p>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="text-sm text-rose-800">
        Failed to load Google Maps. Check your API key / billing / restrictions.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div>
        <h3 className="text-sm font-semibold text-slate-900">
          Pick location on Google Maps
        </h3>
        <p className="text-xs text-slate-500">
          Search a place, or click the map to drop a pin.
        </p>
      </div>

      {isLoaded ? (
        <>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600">
                Search place
              </label>
              <Autocomplete onLoad={setAuto} onPlaceChanged={onPlaceChanged}>
                <input
                  type="text"
                  placeholder="Type location (Kigali, Kacyiru, Airport...)"
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-emerald-400"
                />
              </Autocomplete>
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600">
                Selected address
              </label>
              <input
                type="text"
                value={form.location_address ?? ""}
                onChange={(e) => onChange("location_address", e.target.value)}
                placeholder="Address will appear here…"
                className={[
                  "w-full rounded-lg border px-3 py-2 text-sm outline-none",
                  errors.location_address
                    ? "border-rose-300 focus:ring-2 focus:ring-rose-400"
                    : "border-slate-200 focus:ring-2 focus:ring-emerald-400",
                ].join(" ")}
              />
            </div>
          </div>

          <div className="overflow-hidden rounded-2xl border border-slate-200">
            <GoogleMap
              mapContainerStyle={{ width: "100%", height: "320px" }}
              center={center}
              zoom={markerPos ? 14 : 12}
              onClick={handleMapClick}
              options={{
                streetViewControl: false,
                mapTypeControl: false,
                fullscreenControl: false,
              }}
            >
              {markerPos && <MarkerF position={markerPos} />}
            </GoogleMap>
          </div>
        </>
      ) : (
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">
          Loading Google Maps…
        </div>
      )}
    </div>
  );
}

/* ---------------- small UI components ---------------- */

function StepTitle({ title, desc }) {
  return (
    <div className="mb-2">
      <h2 className="text-base font-semibold text-slate-900">{title}</h2>
      {desc && <p className="text-xs text-slate-500">{desc}</p>}
    </div>
  );
}

function FieldInput({
  label,
  name,
  value,
  onChange,
  error,
  type = "text",
  ...rest
}) {
  return (
    <div>
      <label
        htmlFor={name}
        className="mb-1 block text-xs font-medium text-slate-600"
      >
        {label}
      </label>
      <input
        id={name}
        name={name}
        type={type}
        value={value ?? ""}
        onChange={(e) => onChange(name, e.target.value)}
        className={[
          "w-full rounded-lg border px-3 py-2 text-sm outline-none",
          error
            ? "border-rose-400 focus:ring-2 focus:ring-rose-400"
            : "border-slate-200 focus:ring-2 focus:ring-emerald-400",
        ].join(" ")}
        {...rest}
      />
      {error && <p className="mt-1 text-[11px] text-rose-600">{error}</p>}
    </div>
  );
}

function FieldSelect({
  label,
  name,
  value,
  onChange,
  options,
  error,
  disabled = false,
}) {
  return (
    <div>
      <label
        htmlFor={name}
        className="mb-1 block text-xs font-medium text-slate-600"
      >
        {label}
      </label>
      <select
        id={name}
        name={name}
        value={value ?? ""}
        disabled={disabled}
        onChange={(e) => onChange(name, e.target.value)}
        className={[
          "w-full rounded-lg border px-3 py-2 text-sm outline-none bg-white",
          disabled ? "bg-slate-50 text-slate-400 cursor-not-allowed" : "",
          error
            ? "border-rose-400 focus:ring-2 focus:ring-rose-400"
            : "border-slate-200 focus:ring-2 focus:ring-emerald-400",
        ].join(" ")}
      >
        {options.map((opt) => (
          <option key={opt.value ?? opt.label} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
      {error && <p className="mt-1 text-[11px] text-rose-600">{error}</p>}
    </div>
  );
}

/* ---------------- error normalizer ---------------- */
function normalizeLaravelErrors(e) {
  const out = {};
  if (!e) return out;
  if (typeof e === "string") {
    out._ = e;
    return out;
  }
  Object.entries(e).forEach(([k, v]) => {
    if (Array.isArray(v)) out[k] = v[0];
    else if (typeof v === "string") out[k] = v;
    else out[k] = JSON.stringify(v);
  });
  return out;
}
