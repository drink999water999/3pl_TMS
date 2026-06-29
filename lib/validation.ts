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
  // Client classification + multi-location surcharge
  client_type: z.preprocess(
    emptyToNull,
    z.enum(["Warehouse", "Transportation"]).nullable(),
  ),
  multi_location_charge: z.preprocess(
    (v) => (v === "" || v === undefined || v === null ? 0 : Number(v)),
    z.number().min(0, "Charge can't be negative"),
  ),
  // Pricing configuration
  pricing_mode: z.enum(["fixed", "per_km"]).default("fixed"),
  currency: z.string().min(1).default("SAR"),
  rate_per_km: optionalNumber,
  base_charge: z.preprocess(
    (v) => (v === "" || v === undefined || v === null ? 0 : Number(v)),
    z.number().min(0, "Base charge can't be negative"),
  ),
  margin_type: z.preprocess(
    emptyToNull,
    z.enum(["percent", "fixed"]).nullable(),
  ),
  margin_value: optionalNumber,
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
  city_id: optionalUuid,
  receiver_name: optionalText,
  receiver_phone: optionalText,
});
export type LocationInput = z.input<typeof locationSchema>;

export const contractRateSchema = z.object({
  delivery_location_id: optionalUuid,
  service_type_id: optionalUuid,
  route_id: optionalUuid,
  shipment_type_id: optionalUuid,
  rate: z.preprocess((v) => Number(v), z.number().positive("Rate must be > 0")),
  currency: z.string().min(1).default("SAR"),
  effective_from: optionalText,
  effective_to: optionalText,
});
export type ContractRateInput = z.input<typeof contractRateSchema>;

// --- Fleet --------------------------------------------------------------------
export const truckSchema = z.object({
  code: z.string().min(1, "Code is required"),
  plate_number: z.string().min(1, "Plate number is required"),
  service_type_id: optionalUuid,
  current_city_id: optionalUuid,
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
  service_type_ids: z.array(z.string().uuid()).default([]),
});
export type SupplierInput = z.input<typeof supplierSchema>;

// --- Transport requests -------------------------------------------------------
export const requestSchema = z.object({
  client_id: z.string().uuid("Select a client"),
  pickup_location_id: optionalUuid,
  delivery_location_id: optionalUuid,
  shipment_type_id: optionalUuid,
  service_type_id: optionalUuid,
  route_id: optionalUuid,
  quantity: optionalNumber,
  weight: optionalNumber,
  pallets: optionalInt,
  distance_km: optionalNumber,
  additional_services: optionalText,
  additional_services_price: optionalNumber,
  request_source: z.preprocess(
    emptyToNull,
    z.enum(["inhouse", "portal"]).nullable(),
  ),
  selling_price: optionalNumber,
  required_pickup_at: optionalText,
  delivery_date: optionalText,
  special_instructions: optionalText,
  po_reference: optionalText,
});
export type RequestInput = z.input<typeof requestSchema>;

// One delivery stop in a multi-stop trip.
export const deliveryStopSchema = z.object({
  location_id: z.string().uuid("Select a delivery location"),
  receiver_name: optionalText,
  receiver_phone: optionalText,
});
export type DeliveryStopInput = z.input<typeof deliveryStopSchema>;

// One pickup stop in a multi-pickup trip.
export const pickupStopSchema = z.object({
  location_id: z.string().uuid("Select a pickup location"),
  contact_name: optionalText,
  contact_phone: optionalText,
});
export type PickupStopInput = z.input<typeof pickupStopSchema>;

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
    supplier_truck_id: optionalUuid,
    outsourced_driver_name: optionalText,
    outsourced_driver_id: optionalText,
    service_type_id: optionalUuid,
    carrier_cost: optionalNumber,
    customer_charge: optionalNumber,
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
      if (!v.service_type_id)
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["service_type_id"],
          message: "Select a service type",
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

// --- Users & registration -----------------------------------------------------
const STAFF_ROLES = [
  "admin",
  "operations",
  "dispatch",
  "driver",
  "finance",
] as const;

export const staffUserSchema = z.object({
  email: z.string().email("Enter a valid email"),
  full_name: z.string().min(1, "Name is required"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  role: z.enum(STAFF_ROLES),
});
export type StaffUserInput = z.input<typeof staffUserSchema>;

export const registerSchema = z.object({
  full_name: z.string().min(1, "Your name is required"),
  company_name: z.string().min(1, "Company name is required"),
  email: z.string().email("Enter a valid email"),
  phone: optionalText,
  password: z.string().min(8, "Password must be at least 8 characters"),
});
export type RegisterInput = z.input<typeof registerSchema>;

export const passwordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters");

// --- Waybill amendment + credit notes -----------------------------------------
// Editable snapshot fields on an approved waybill (corrections). All optional;
// only provided fields are written.
export const amendWaybillSchema = z.object({
  client_name: optionalText,
  pickup_address: optionalText,
  delivery_address: optionalText,
  truck_number: optionalText,
  service_type_name: optionalText,
  shipment_type_name: optionalText,
  driver_name: optionalText,
  supplier_name: optionalText,
  quantity: optionalNumber,
  pickup_date: optionalText,
});
export type AmendWaybillInput = z.input<typeof amendWaybillSchema>;

export const creditNoteSchema = z.object({
  amount: z.preprocess(
    (v) => Number(v),
    z.number().positive("Amount must be greater than 0"),
  ),
  reason: optionalText,
});
export type CreditNoteInput = z.input<typeof creditNoteSchema>;

// --- Driver login provisioning ------------------------------------------------
export const driverLoginSchema = z.object({
  email: z.string().email("Enter a valid email"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});
export type DriverLoginInput = z.input<typeof driverLoginSchema>;

// --- Master data: cities, routes, service types -------------------------------
export const citySchema = z.object({
  name: z.string().min(1, "City name is required"),
  code: optionalText,
  region: optionalText,
  is_active: z.boolean().default(true),
});
export type CityInput = z.input<typeof citySchema>;

export const routeSchema = z.object({
  from_city_id: z.string().uuid("Select the origin city"),
  to_city_id: z.string().uuid("Select the destination city"),
  distance_km: optionalNumber,
  is_active: z.boolean().default(true),
});
export type RouteInput = z.input<typeof routeSchema>;

export const serviceTypeSchema = z.object({
  name: z.string().min(1, "Name is required"),
  code: optionalText,
  requires_quantity: z.boolean().default(false),
  sort_order: z.preprocess(
    (v) => (v === "" || v === undefined || v === null ? 0 : Math.trunc(Number(v))),
    z.number().int(),
  ),
  is_active: z.boolean().default(true),
});
export type ServiceTypeInput = z.input<typeof serviceTypeSchema>;

// --- Supplier trucks ----------------------------------------------------------
export const supplierTruckSchema = z.object({
  plate_number: z.string().min(1, "Plate number is required"),
  driver_name: optionalText,
  driver_id_no: optionalText,
  driver_mobile: optionalText,
  service_type_id: optionalUuid,
  is_active: z.boolean().default(true),
});
export type SupplierTruckInput = z.input<typeof supplierTruckSchema>;

// --- Matrix cost (supplier rate by service type + route) ----------------------
export const supplierRateSchema = z.object({
  service_type_id: optionalUuid,
  route_id: optionalUuid,
  lane: optionalText,
  rate: z.preprocess((v) => Number(v), z.number().positive("Cost must be > 0")),
  currency: z.string().min(1).default("SAR"),
});
export type SupplierRateInput = z.input<typeof supplierRateSchema>;

// --- Standard rates (Rate Page) -----------------------------------------------
export const standardRateSchema = z.object({
  service_type_id: optionalUuid,
  route_id: optionalUuid,
  rate: z.preprocess((v) => Number(v), z.number().positive("Rate must be > 0")),
  currency: z.string().min(1).default("SAR"),
  is_active: z.boolean().default(true),
});
export type StandardRateInput = z.input<typeof standardRateSchema>;
