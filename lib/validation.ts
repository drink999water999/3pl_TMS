import { z } from "zod";

// Empty form strings should become null in the database.
export const emptyToNull = (v: unknown) =>
  v === "" || v === undefined ? null : v;

const optionalText = z.preprocess(emptyToNull, z.string().nullable());
const optionalEmail = z.preprocess(
  emptyToNull,
  z.string().email("Invalid email").nullable(),
);
const optionalUuid = z.preprocess(emptyToNull, z.string().uuid().nullable());
const optionalNumber = z.preprocess(
  (v) => (v === "" || v === undefined || v === null ? null : Number(v)),
  z.number().nullable(),
);
const optionalInt = z.preprocess(
  (v) =>
    v === "" || v === undefined || v === null ? null : Math.trunc(Number(v)),
  z.number().int().nullable(),
);

// --- Clients ------------------------------------------------------------------
export const clientSchema = z.object({
  name: z.string().min(1, "Name is required"),
  code: z.string().min(1, "Code is required"),
  tax_id: optionalText,
  phone: optionalText,
  email: optionalEmail,
  billing_address: optionalText,
  notes: optionalText,
  is_active: z.boolean().default(true),
});
export type ClientInput = z.input<typeof clientSchema>;

export const contactSchema = z.object({
  name: z.string().min(1, "Name is required"),
  phone: optionalText,
  email: optionalEmail,
  role: optionalText,
  is_primary: z.boolean().default(false),
});
export type ContactInput = z.input<typeof contactSchema>;

export const locationSchema = z.object({
  kind: z.enum(["pickup", "delivery"]),
  name: z.string().min(1, "Name is required"),
  address: optionalText,
  maps_url: optionalText,
  lat: optionalNumber,
  lng: optionalNumber,
});
export type LocationInput = z.input<typeof locationSchema>;

export const contractRateSchema = z.object({
  delivery_location_id: optionalUuid,
  truck_type_id: optionalUuid,
  shipment_type_id: optionalUuid,
  rate: z.preprocess((v) => Number(v), z.number().positive("Rate must be > 0")),
  currency: z.string().min(1).default("USD"),
  effective_from: optionalText,
  effective_to: optionalText,
});
export type ContractRateInput = z.input<typeof contractRateSchema>;

// --- Fleet --------------------------------------------------------------------
export const truckSchema = z.object({
  code: z.string().min(1, "Code is required"),
  plate_number: z.string().min(1, "Plate number is required"),
  truck_type_id: optionalUuid,
  capacity: optionalNumber,
  capacity_unit: z.string().default("kg"),
  status: z.enum(["available", "busy", "maintenance"]).default("available"),
  default_driver_id: optionalUuid,
  is_active: z.boolean().default(true),
});
export type TruckInput = z.input<typeof truckSchema>;

export const driverSchema = z.object({
  name: z.string().min(1, "Name is required"),
  phone: optionalText,
  license_no: optionalText,
  status: z
    .enum(["available", "on_trip", "off_duty", "inactive"])
    .default("available"),
  is_active: z.boolean().default(true),
});
export type DriverInput = z.input<typeof driverSchema>;

export const supplierSchema = z.object({
  name: z.string().min(1, "Name is required"),
  code: optionalText,
  phone: optionalText,
  email: optionalEmail,
  address: optionalText,
  status: z.enum(["active", "inactive"]).default("active"),
  is_active: z.boolean().default(true),
  truck_type_ids: z.array(z.string().uuid()).default([]),
});
export type SupplierInput = z.input<typeof supplierSchema>;

// --- Transport requests -------------------------------------------------------
export const requestSchema = z.object({
  client_id: z.string().uuid("Select a client"),
  pickup_location_id: optionalUuid,
  delivery_location_id: optionalUuid,
  shipment_type_id: optionalUuid,
  truck_type_id: optionalUuid,
  quantity: optionalNumber,
  weight: optionalNumber,
  pallets: optionalInt,
  required_pickup_at: optionalText,
  delivery_date: optionalText,
  special_instructions: optionalText,
  po_reference: optionalText,
});
export type RequestInput = z.input<typeof requestSchema>;

export const requestItemSchema = z.object({
  item_name: z.string().min(1, "Item name is required"),
  description: optionalText,
  quantity: optionalNumber,
  unit_price: optionalNumber,
});
export type RequestItemInput = z.input<typeof requestItemSchema>;

// --- Dispatch -----------------------------------------------------------------
export const dispatchSchema = z
  .object({
    request_id: z.string().uuid("Missing request"),
    assignment_type: z.enum(["own", "outsourced"]),
    truck_id: optionalUuid,
    driver_id: optionalUuid,
    supplier_id: optionalUuid,
    supplier_truck: optionalText,
    truck_type_id: optionalUuid,
    notes: optionalText,
  })
  .superRefine((v, ctx) => {
    if (v.assignment_type === "own") {
      if (!v.truck_id)
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["truck_id"],
          message: "Select a truck",
        });
      if (!v.driver_id)
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["driver_id"],
          message: "Select a driver",
        });
    } else {
      if (!v.supplier_id)
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["supplier_id"],
          message: "Select a supplier",
        });
      if (!v.truck_type_id)
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["truck_type_id"],
          message: "Select a truck type",
        });
    }
  });
export type DispatchInput = z.input<typeof dispatchSchema>;

export const exceptionSchema = z.object({
  kind: z.enum(["delay", "damage", "complaint"]),
  description: z.string().min(1, "Add a short description"),
});
export type ExceptionInput = z.input<typeof exceptionSchema>;

export const podKindSchema = z.enum(["photo", "signed_note"]);
