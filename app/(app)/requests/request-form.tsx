"use client";

import { useState } from "react";
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
import type { Tables } from "@/lib/database.types";
import { createRequest, updateRequest } from "./actions";

type Lookup = { id: string; name: string };
type Loc = {
  id: string;
  client_id: string;
  kind: "pickup" | "delivery";
  name: string;
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

export function RequestForm({
  mode,
  request,
  clients,
  locations,
  shipmentTypes,
  truckTypes,
  onDone,
  onCancel,
}: {
  mode: "create" | "edit";
  request?: Tables<"transport_requests">;
  clients: Lookup[];
  locations: Loc[];
  shipmentTypes: Lookup[];
  truckTypes: Lookup[];
  onDone?: () => void;
  onCancel?: () => void;
}) {
  const router = useRouter();

  const [clientId, setClientId] = useState<string | null>(
    request?.client_id ?? null,
  );
  const [pickupId, setPickupId] = useState<string | null>(
    request?.pickup_location_id ?? null,
  );
  const [deliveryId, setDeliveryId] = useState<string | null>(
    request?.delivery_location_id ?? null,
  );
  const [items, setItems] = useState<ItemRow[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { register, handleSubmit } = useForm({
    defaultValues: {
      shipment_type_id: request?.shipment_type_id ?? "",
      truck_type_id: request?.truck_type_id ?? "",
      quantity: request?.quantity?.toString() ?? "",
      weight: request?.weight?.toString() ?? "",
      pallets: request?.pallets?.toString() ?? "",
      required_pickup_at: request?.required_pickup_at?.slice(0, 16) ?? "",
      delivery_date: request?.delivery_date?.slice(0, 10) ?? "",
      special_instructions: request?.special_instructions ?? "",
      po_reference: request?.po_reference ?? "",
    },
  });

  const pickupOptions = locations
    .filter((l) => l.client_id === clientId && l.kind === "pickup")
    .map((l) => ({ value: l.id, label: l.name }));
  const deliveryOptions = locations
    .filter((l) => l.client_id === clientId && l.kind === "delivery")
    .map((l) => ({ value: l.id, label: l.name }));

  const onClientChange = (id: string | null) => {
    setClientId(id);
    setPickupId(null);
    setDeliveryId(null);
  };

  const setItem = (i: number, patch: Partial<ItemRow>) =>
    setItems((prev) =>
      prev.map((row, idx) => (idx === i ? { ...row, ...patch } : row)),
    );

  const submit = handleSubmit(async (values) => {
    setError(null);
    if (!clientId) return setError("Select a client.");
    setSaving(true);

    const payload = {
      client_id: clientId,
      pickup_location_id: pickupId,
      delivery_location_id: deliveryId,
      shipment_type_id: values.shipment_type_id,
      truck_type_id: values.truck_type_id,
      quantity: values.quantity,
      weight: values.weight,
      pallets: values.pallets,
      required_pickup_at: values.required_pickup_at,
      delivery_date: values.delivery_date,
      special_instructions: values.special_instructions,
      po_reference: values.po_reference,
    };

    if (mode === "create") {
      const cleanItems = items.filter((it) => it.item_name.trim());
      const res = await createRequest(payload, cleanItems);
      setSaving(false);
      if (res.error) return setError(res.error);
      if (res.id) router.push(`/requests/${res.id}`);
    } else if (request) {
      const res = await updateRequest(request.id, payload);
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
            <SearchableSelect
              options={clients.map((c) => ({ value: c.id, label: c.name }))}
              value={clientId}
              onChange={onClientChange}
              placeholder="Select a client…"
            />
          </Field>
          <Field label="PO reference">
            <Input {...register("po_reference")} placeholder="Optional" />
          </Field>
          <Field label="Pickup location">
            <SearchableSelect
              options={pickupOptions}
              value={pickupId}
              onChange={setPickupId}
              disabled={!clientId}
              placeholder={clientId ? "Select pickup…" : "Pick a client first"}
              emptyText="No pickup locations for this client"
            />
          </Field>
          <Field label="Delivery location">
            <SearchableSelect
              options={deliveryOptions}
              value={deliveryId}
              onChange={setDeliveryId}
              disabled={!clientId}
              placeholder={clientId ? "Select delivery…" : "Pick a client first"}
              emptyText="No delivery locations for this client"
            />
          </Field>
          <Field label="Shipment type">
            <Select {...register("shipment_type_id")}>
              <option value="">— None —</option>
              {shipmentTypes.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Truck type">
            <Select {...register("truck_type_id")}>
              <option value="">— None —</option>
              {truckTypes.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </Select>
          </Field>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Quantity">
            <Input type="number" step="0.01" {...register("quantity")} />
          </Field>
          <Field label="Weight">
            <Input type="number" step="0.01" {...register("weight")} />
          </Field>
          <Field label="Pallets">
            <Input type="number" step="1" min="0" {...register("pallets")} />
          </Field>
          <Field label="Required pickup (date & time)">
            <Input type="datetime-local" {...register("required_pickup_at")} />
            <p className="text-xs text-muted-foreground">
              In the calendar, tap the month/year at the top to jump around, then
              tap a day to go back.
            </p>
          </Field>
          <Field label="Delivery date">
            <Input type="date" {...register("delivery_date")} />
            <p className="text-xs text-muted-foreground">
              Pick year → month → day.
            </p>
          </Field>
        </div>

        <Field label="Special instructions">
          <Textarea
            {...register("special_instructions")}
            placeholder="Handling notes, access details, etc."
          />
        </Field>
      </Card>

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
                      onChange={(e) =>
                        setItem(i, { item_name: e.target.value })
                      }
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
