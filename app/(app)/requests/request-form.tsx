"use client";

import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { useRouter } from "next/navigation";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { SearchableSelect } from "@/components/app/searchable-select";
import { formatMoney } from "@/lib/format";
import { computeSelling } from "@/lib/selling-price";
import type { Tables } from "@/lib/database.types";
import { REQUEST_FIELD_DEFS, type RequiredFields } from "@/lib/request-fields";
import { createRequest, updateRequest } from "./actions";

type Lookup = { id: string; name: string };
type ServiceType = { id: string; name: string; requires_quantity: boolean };
type Loc = {
  id: string;
  client_id: string;
  kind: "pickup" | "delivery";
  name: string;
  city_id: string | null;
  receiver_name: string | null;
  receiver_phone: string | null;
};
type RouteRow = {
  id: string;
  from_city_id: string;
  to_city_id: string;
  distance_km: number | null;
};
type ContractRate = {
  service_type_id: string | null;
  route_id: string | null;
  rate: number;
  currency: string;
  client_id?: string | null;
};
type Stop = {
  location_id: string | null;
  receiver_name: string;
  receiver_phone: string;
};
type PickupStop = {
  location_id: string | null;
  contact_name: string;
  contact_phone: string;
};
type ItemRow = {
  item_name: string;
  description: string;
  quantity: string;
  unit_price: string;
};

const blankItem = (): ItemRow => ({
  item_name: "",
  description: "",
  quantity: "",
  unit_price: "",
});
const blankStop = (): Stop => ({
  location_id: null,
  receiver_name: "",
  receiver_phone: "",
});
const blankPickup = (): PickupStop => ({
  location_id: null,
  contact_name: "",
  contact_phone: "",
});

export function RequestForm({
  mode,
  request,
  clients,
  locations,
  shipmentTypes,
  serviceTypes = [],
  cities = [],
  routes = [],
  contractRates = [],
  standardRates = [],
  deliveries = [],
  pickupStops = [],
  multiLocationCharge = 0,
  clientMultiCharge = {},
  canSetPricing = false,
  isClient = false,
  requiredFields = {},
  lockClientId,
  onDone,
  onCancel,
}: {
  mode: "create" | "edit";
  request?: Tables<"transport_requests">;
  clients: Lookup[];
  locations: Loc[];
  shipmentTypes: Lookup[];
  serviceTypes?: ServiceType[];
  cities?: Lookup[];
  routes?: RouteRow[];
  contractRates?: ContractRate[];
  standardRates?: ContractRate[];
  deliveries?: { location_id: string | null; receiver_name: string | null; receiver_phone: string | null }[];
  pickupStops?: { location_id: string | null; contact_name: string | null; contact_phone: string | null }[];
  multiLocationCharge?: number;
  clientMultiCharge?: Record<string, number>;
  canSetPricing?: boolean;
  isClient?: boolean;
  requiredFields?: RequiredFields;
  lockClientId?: string | null;
  onDone?: () => void;
  onCancel?: () => void;
}) {
  const router = useRouter();
  const req = (key: string) => requiredFields[key as keyof RequiredFields] === true;

  const [clientId, setClientId] = useState<string | null>(
    request?.client_id ?? lockClientId ?? null,
  );
  const [pickups, setPickups] = useState<PickupStop[]>(
    pickupStops.length > 0
      ? pickupStops.map((p) => ({
          location_id: p.location_id,
          contact_name: p.contact_name ?? "",
          contact_phone: p.contact_phone ?? "",
        }))
      : [
          {
            location_id: request?.pickup_location_id ?? null,
            contact_name: "",
            contact_phone: "",
          },
        ],
  );
  const [stops, setStops] = useState<Stop[]>(
    deliveries.length > 0
      ? deliveries.map((d) => ({
          location_id: d.location_id,
          receiver_name: d.receiver_name ?? "",
          receiver_phone: d.receiver_phone ?? "",
        }))
      : [
          {
            location_id: request?.delivery_location_id ?? null,
            receiver_name: "",
            receiver_phone: "",
          },
        ],
  );
  const [items, setItems] = useState<ItemRow[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { register, handleSubmit, watch, setValue } = useForm({
    defaultValues: {
      shipment_type_id: request?.shipment_type_id ?? "",
      service_type_id: request?.service_type_id ?? "",
      route_id: request?.route_id ?? "",
      quantity: request?.quantity?.toString() ?? "",
      weight: request?.weight?.toString() ?? "",
      pallets: request?.pallets?.toString() ?? "",
      distance_km: request?.distance_km?.toString() ?? "",
      additional_services: request?.additional_services ?? "",
      additional_services_price:
        request?.additional_services_price?.toString() ?? "",
      request_source:
        request?.request_source ?? (isClient ? "portal" : "inhouse"),
      selling_price: request?.selling_price?.toString() ?? "",
      required_pickup_at: request?.required_pickup_at?.slice(0, 16) ?? "",
      delivery_date: request?.delivery_date?.slice(0, 10) ?? "",
      special_instructions: request?.special_instructions ?? "",
      po_reference: request?.po_reference ?? "",
    },
  });

  const locById = useMemo(
    () => new Map(locations.map((l) => [l.id, l])),
    [locations],
  );
  const cityName = useMemo(
    () => new Map(cities.map((c) => [c.id, c.name])),
    [cities],
  );
  const cityOf = (locId: string | null) => {
    const cid = locId ? locById.get(locId)?.city_id ?? null : null;
    return cid ? cityName.get(cid) ?? null : null;
  };

  const pickupOptions = locations
    .filter((l) => l.client_id === clientId && l.kind === "pickup")
    .map((l) => ({ value: l.id, label: l.name }));
  const deliveryOptions = locations
    .filter((l) => l.client_id === clientId && l.kind === "delivery")
    .map((l) => ({ value: l.id, label: l.name }));

  const onClientChange = (id: string | null) => {
    setClientId(id);
    setPickups([blankPickup()]);
    setStops([blankStop()]);
  };

  // --- Service type → conditional quantity --------------------------------------
  const serviceTypeId = watch("service_type_id");
  const activeService = serviceTypes.find((s) => s.id === serviceTypeId);
  const needsQuantity = activeService?.requires_quantity ?? false;

  // --- Auto route + distance from pickup city → first delivery city -------------
  const firstDeliveryId = stops[0]?.location_id ?? null;
  const firstPickupId = pickups[0]?.location_id ?? null;
  const matchedRoute = useMemo(() => {
    const toCityId = firstDeliveryId
      ? locById.get(firstDeliveryId)?.city_id ?? null
      : null;
    const fromCityId = firstPickupId
      ? locById.get(firstPickupId)?.city_id ?? null
      : null;
    if (!fromCityId || !toCityId) return null;
    return routes.find(
      (r) => r.from_city_id === fromCityId && r.to_city_id === toCityId,
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [firstPickupId, firstDeliveryId, routes, locById]);

  useEffect(() => {
    if (matchedRoute) {
      setValue("route_id", matchedRoute.id);
      if (matchedRoute.distance_km != null)
        setValue("distance_km", matchedRoute.distance_km.toString());
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [matchedRoute]);

  // --- Suggested selling price (admin) ------------------------------------------
  const additionalPrice = watch("additional_services_price");
  const mlc =
    (clientId ? clientMultiCharge[clientId] : undefined) ??
    multiLocationCharge ??
    0;
  const suggested = useMemo(() => {
    if (!canSetPricing) return null;
    const routeId = matchedRoute?.id ?? null;
    // Contract rates may carry a client_id (create passes all clients); keep
    // only those for the selected client (rows without a client_id are global).
    const ownContract = contractRates.filter(
      (r) => !r.client_id || r.client_id === clientId,
    );
    return computeSelling({
      contractRates: ownContract,
      standardRates,
      serviceTypeId: serviceTypeId || null,
      routeId,
      stops: stops.filter((s) => s.location_id).length || 1,
      multiLocationCharge: mlc,
      additional: Number(additionalPrice) || 0,
    });
  }, [
    canSetPricing,
    contractRates,
    standardRates,
    clientId,
    serviceTypeId,
    matchedRoute,
    stops,
    additionalPrice,
    mlc,
  ]);

  // Auto-fill the selling price from the suggestion while it is still blank.
  useEffect(() => {
    if (canSetPricing && suggested && !watch("selling_price")) {
      setValue("selling_price", suggested.total.toString());
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [suggested]);

  const setStop = (i: number, patch: Partial<Stop>) =>
    setStops((prev) =>
      prev.map((row, idx) => (idx === i ? { ...row, ...patch } : row)),
    );
  const onStopLocation = (i: number, locId: string | null) => {
    const loc = locId ? locById.get(locId) : undefined;
    setStops((prev) =>
      prev.map((row, idx) =>
        idx === i
          ? {
              location_id: locId,
              // Prefill receiver from the location, keep any manual override.
              receiver_name: row.receiver_name || (loc?.receiver_name ?? ""),
              receiver_phone: row.receiver_phone || (loc?.receiver_phone ?? ""),
            }
          : row,
      ),
    );
  };

  const setPickup = (i: number, patch: Partial<PickupStop>) =>
    setPickups((prev) =>
      prev.map((row, idx) => (idx === i ? { ...row, ...patch } : row)),
    );
  const onPickupLocation = (i: number, locId: string | null) => {
    const loc = locId ? locById.get(locId) : undefined;
    setPickups((prev) =>
      prev.map((row, idx) =>
        idx === i
          ? {
              location_id: locId,
              contact_name: row.contact_name || (loc?.receiver_name ?? ""),
              contact_phone: row.contact_phone || (loc?.receiver_phone ?? ""),
            }
          : row,
      ),
    );
  };

  const setItem = (i: number, patch: Partial<ItemRow>) =>
    setItems((prev) =>
      prev.map((row, idx) => (idx === i ? { ...row, ...patch } : row)),
    );

  const submit = handleSubmit(async (values) => {
    setError(null);
    if (!clientId) return setError("Select a client.");
    const cleanPickups = pickups.filter((p) => p.location_id);
    if (cleanPickups.length === 0)
      return setError("Add at least one pickup location.");
    const cleanStops = stops.filter((s) => s.location_id);
    if (cleanStops.length === 0)
      return setError("Add at least one delivery location.");

    // Enforce admin-configured mandatory fields. Quantity only counts when the
    // selected service actually asks for it.
    for (const def of REQUEST_FIELD_DEFS) {
      if (!req(def.key)) continue;
      if (def.key === "quantity" && !needsQuantity) continue;
      const value = (values as Record<string, string>)[def.key];
      if (!value || value.trim() === "")
        return setError(`${def.label} is required.`);
    }
    setSaving(true);

    const payload = {
      client_id: clientId,
      pickup_location_id: cleanPickups[0].location_id, // primary pickup
      delivery_location_id: cleanStops[0].location_id, // primary stop
      shipment_type_id: values.shipment_type_id,
      service_type_id: values.service_type_id,
      route_id: values.route_id,
      quantity: needsQuantity ? values.quantity : "",
      weight: values.weight,
      pallets: values.pallets,
      distance_km: values.distance_km,
      additional_services: values.additional_services,
      additional_services_price: canSetPricing
        ? values.additional_services_price
        : "",
      request_source: values.request_source,
      selling_price: canSetPricing ? values.selling_price : "",
      required_pickup_at: values.required_pickup_at,
      delivery_date: values.delivery_date,
      special_instructions: values.special_instructions,
      po_reference: values.po_reference,
    };
    const stopRows = cleanStops.map((s) => ({
      location_id: s.location_id,
      receiver_name: s.receiver_name,
      receiver_phone: s.receiver_phone,
    }));
    const pickupRows = cleanPickups.map((p) => ({
      location_id: p.location_id,
      contact_name: p.contact_name,
      contact_phone: p.contact_phone,
    }));

    if (mode === "create") {
      const cleanItems = items.filter((it) => it.item_name.trim());
      const res = await createRequest(payload, cleanItems, stopRows, pickupRows);
      setSaving(false);
      if (res.error) return setError(res.error);
      if (res.id) router.push(`/requests/${res.id}`);
    } else if (request) {
      const res = await updateRequest(request.id, payload, stopRows, pickupRows);
      setSaving(false);
      if (res.error) return setError(res.error);
      onDone?.();
      router.refresh();
    }
  });

  return (
    <form onSubmit={submit} className="space-y-5">
      <Card className="space-y-4 p-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Client" required>
            {lockClientId ? (
              <div className="rounded-md border bg-muted/40 px-3 py-2 text-sm">
                {clients.find((c) => c.id === lockClientId)?.name ??
                  "Your company"}
              </div>
            ) : (
              <SearchableSelect
                options={clients.map((c) => ({ value: c.id, label: c.name }))}
                value={clientId}
                onChange={onClientChange}
                placeholder="Select a client…"
              />
            )}
          </Field>
          <Field label="PO reference" required={req("po_reference")}>
            <Input {...register("po_reference")} placeholder="Optional" />
          </Field>

          <Field label="Service type" required={req("service_type_id")}>
            <Select {...register("service_type_id")}>
              <option value="">— None —</option>
              {serviceTypes.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </Select>
          </Field>

          <Field label="Shipment type" required={req("shipment_type_id")}>
            <Select {...register("shipment_type_id")}>
              <option value="">— None —</option>
              {shipmentTypes.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </Select>
          </Field>
        </div>

        {/* Pickup stops (multi-pickup) */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label>Pickup locations</Label>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={!clientId}
              onClick={() => setPickups((p) => [...p, blankPickup()])}
            >
              <Plus className="h-4 w-4" /> Add pickup
            </Button>
          </div>
          {pickups.map((pk, i) => (
            <div
              key={i}
              className="rounded-lg border bg-muted/20 p-3 space-y-2"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-brand-navy">
                  Pickup {i + 1}
                  {cityOf(pk.location_id)
                    ? ` · ${cityOf(pk.location_id)}`
                    : ""}
                </span>
                {pickups.length > 1 ? (
                  <button
                    type="button"
                    onClick={() =>
                      setPickups((p) => p.filter((_, idx) => idx !== i))
                    }
                    className="rounded p-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                    aria-label="Remove pickup"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                ) : null}
              </div>
              <SearchableSelect
                options={pickupOptions}
                value={pk.location_id}
                onChange={(v) => onPickupLocation(i, v)}
                disabled={!clientId}
                placeholder={clientId ? "Select pickup…" : "Pick a client first"}
                emptyText="No pickup locations for this client"
              />
              <div className="grid gap-2 sm:grid-cols-2">
                <Input
                  value={pk.contact_name}
                  onChange={(e) => setPickup(i, { contact_name: e.target.value })}
                  placeholder="Pickup contact name"
                />
                <Input
                  value={pk.contact_phone}
                  onChange={(e) =>
                    setPickup(i, { contact_phone: e.target.value })
                  }
                  placeholder="Pickup contact phone"
                />
              </div>
            </div>
          ))}
        </div>

        {/* Delivery stops (multi-stop) */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label>Delivery locations</Label>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={!clientId}
              onClick={() => setStops((p) => [...p, blankStop()])}
            >
              <Plus className="h-4 w-4" /> Add stop
            </Button>
          </div>
          {stops.map((stop, i) => (
            <div
              key={i}
              className="rounded-lg border bg-muted/20 p-3 space-y-2"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-brand-navy">
                  Stop {i + 1}
                  {cityOf(stop.location_id)
                    ? ` · ${cityOf(stop.location_id)}`
                    : ""}
                </span>
                {stops.length > 1 ? (
                  <button
                    type="button"
                    onClick={() =>
                      setStops((p) => p.filter((_, idx) => idx !== i))
                    }
                    className="rounded p-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                    aria-label="Remove stop"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                ) : null}
              </div>
              <SearchableSelect
                options={deliveryOptions}
                value={stop.location_id}
                onChange={(v) => onStopLocation(i, v)}
                disabled={!clientId}
                placeholder={clientId ? "Select delivery…" : "Pick a client first"}
                emptyText="No delivery locations for this client"
              />
              <div className="grid gap-2 sm:grid-cols-2">
                <Input
                  value={stop.receiver_name}
                  onChange={(e) => setStop(i, { receiver_name: e.target.value })}
                  placeholder="Receiver in-charge name"
                />
                <Input
                  value={stop.receiver_phone}
                  onChange={(e) =>
                    setStop(i, { receiver_phone: e.target.value })
                  }
                  placeholder="Receiver in-charge phone"
                />
              </div>
            </div>
          ))}
          {multiLocationCharge > 0 && stops.length > 1 ? (
            <p className="text-xs text-muted-foreground">
              Multiple-locations charge applies to {stops.length - 1} extra
              stop(s): {formatMoney(multiLocationCharge)} each.
            </p>
          ) : null}
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          {needsQuantity ? (
            <Field label="Quantity" required={req("quantity")}>
              <Input type="number" step="0.01" {...register("quantity")} />
              <p className="text-xs text-muted-foreground">
                Applies to {activeService?.name} service.
              </p>
            </Field>
          ) : null}
          <Field label="Weight" required={req("weight")}>
            <Input type="number" step="0.01" {...register("weight")} />
          </Field>
          <Field label="Distance (km)" required={req("distance_km")}>
            <Input
              type="number"
              step="0.1"
              min="0"
              {...register("distance_km")}
            />
            <p className="text-xs text-muted-foreground">
              {matchedRoute
                ? "Auto-filled from the route — you can override."
                : "Set a pickup + delivery with cities on a defined route to auto-fill."}
            </p>
          </Field>
          <Field
            label="Required pickup (date & time)"
            required={req("required_pickup_at")}
          >
            <Input type="datetime-local" {...register("required_pickup_at")} />
          </Field>
          <Field label="Delivery date" required={req("delivery_date")}>
            <Input type="date" {...register("delivery_date")} />
          </Field>
        </div>

        <Field
          label="Additional services"
          required={req("additional_services")}
        >
          <Textarea
            {...register("additional_services")}
            placeholder="Loading/unloading, waiting time, packaging, etc."
          />
        </Field>

        <Field
          label="Special instructions"
          required={req("special_instructions")}
        >
          <Textarea
            {...register("special_instructions")}
            placeholder="Handling notes, access details, etc."
          />
        </Field>

        {/* Request source */}
        <Field label="Request source">
          {isClient ? (
            <div className="rounded-md border bg-muted/40 px-3 py-2 text-sm">
              Customer portal
            </div>
          ) : (
            <Select {...register("request_source")}>
              <option value="inhouse">In-house (on behalf of client)</option>
              <option value="portal">Customer portal</option>
            </Select>
          )}
        </Field>
      </Card>

      {/* Admin pricing */}
      {canSetPricing ? (
        <Card className="space-y-3 p-5">
          <h3 className="text-sm font-semibold text-brand-navy">
            Pricing (admin)
          </h3>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Additional services price">
              <Input
                type="number"
                step="0.01"
                min="0"
                {...register("additional_services_price")}
                placeholder="0"
              />
            </Field>
            <Field label="Trip selling price (override)">
              <Input
                type="number"
                step="0.01"
                min="0"
                {...register("selling_price")}
                placeholder="Leave blank to use the contract rate"
              />
            </Field>
          </div>
          {suggested ? (
            <div className="flex items-center justify-between rounded-md bg-brand-blue/5 px-3 py-2 text-sm">
              <span className="text-muted-foreground">
                Suggested (contract rate + extra stops + additional):{" "}
                {formatMoney(suggested.total, suggested.currency)}
              </span>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() =>
                  setValue("selling_price", suggested.total.toString())
                }
              >
                Use suggested
              </Button>
            </div>
          ) : null}
        </Card>
      ) : null}

      {mode === "create" ? (
        <Card className="space-y-3 p-5">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-brand-navy">Items</h3>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setItems((p) => [...p, blankItem()])}
            >
              <Plus className="h-4 w-4" /> Add item
            </Button>
          </div>
          {items.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No items yet. Items are optional and can also be added later while
              the request is a draft.
            </p>
          ) : (
            <div className="space-y-2">
              {items.map((it, i) => (
                <div
                  key={i}
                  className="grid items-end gap-2 sm:grid-cols-[2fr_2fr_1fr_1fr_auto]"
                >
                  <Field label={i === 0 ? "Item" : ""}>
                    <Input
                      value={it.item_name}
                      onChange={(e) => setItem(i, { item_name: e.target.value })}
                      placeholder="Name"
                    />
                  </Field>
                  <Field label={i === 0 ? "Description" : ""}>
                    <Input
                      value={it.description}
                      onChange={(e) =>
                        setItem(i, { description: e.target.value })
                      }
                    />
                  </Field>
                  <Field label={i === 0 ? "Qty" : ""}>
                    <Input
                      type="number"
                      step="0.01"
                      value={it.quantity}
                      onChange={(e) => setItem(i, { quantity: e.target.value })}
                    />
                  </Field>
                  <Field label={i === 0 ? "Unit price" : ""}>
                    <Input
                      type="number"
                      step="0.01"
                      value={it.unit_price}
                      onChange={(e) =>
                        setItem(i, { unit_price: e.target.value })
                      }
                    />
                  </Field>
                  <button
                    type="button"
                    onClick={() =>
                      setItems((p) => p.filter((_, idx) => idx !== i))
                    }
                    className="mb-1 rounded p-2 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                    aria-label="Remove item"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </Card>
      ) : null}

      {error ? (
        <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      ) : null}

      <div className="flex justify-end gap-2">
        <Button
          type="button"
          variant="outline"
          onClick={() => (onCancel ? onCancel() : router.push("/requests"))}
        >
          Cancel
        </Button>
        <Button type="submit" disabled={saving}>
          {saving
            ? "Saving…"
            : mode === "create"
              ? "Create request"
              : "Save changes"}
        </Button>
      </div>
    </form>
  );
}

function Field({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      {label ? (
        <Label>
          {label}
          {required ? <span className="text-destructive"> *</span> : null}
        </Label>
      ) : null}
      {children}
    </div>
  );
}
