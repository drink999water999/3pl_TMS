// Configurable "mandatory field" list for the new-request form. Admins toggle
// which of these are required (persisted in request_field_config); the request
// form reads the config and enforces it. Core fields (client, pickup, delivery)
// are always required and are intentionally NOT listed here.
export type RequestFieldKey =
  | "po_reference"
  | "service_type_id"
  | "shipment_type_id"
  | "quantity"
  | "weight"
  | "distance_km"
  | "required_pickup_at"
  | "delivery_date"
  | "additional_services"
  | "special_instructions";

export const REQUEST_FIELD_DEFS: { key: RequestFieldKey; label: string }[] = [
  { key: "po_reference", label: "PO reference" },
  { key: "service_type_id", label: "Service type" },
  { key: "shipment_type_id", label: "Shipment type" },
  { key: "quantity", label: "Quantity" },
  { key: "weight", label: "Weight" },
  { key: "distance_km", label: "Distance (km)" },
  { key: "required_pickup_at", label: "Required pickup (date & time)" },
  { key: "delivery_date", label: "Delivery date" },
  { key: "additional_services", label: "Additional services" },
  { key: "special_instructions", label: "Special instructions" },
];

export type RequiredFields = Partial<Record<RequestFieldKey, boolean>>;

// Turn config rows into a lookup the form can consume.
export function toRequiredMap(
  rows: { field_key: string; required: boolean }[] | null | undefined,
): RequiredFields {
  const map: RequiredFields = {};
  for (const r of rows ?? []) map[r.field_key as RequestFieldKey] = r.required;
  return map;
}
