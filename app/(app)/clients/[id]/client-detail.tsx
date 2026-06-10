"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { ArrowLeft, Pencil, Plus, Trash2, Star } from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Dialog } from "@/components/ui/dialog";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/table";
import { formatMoney } from "@/lib/format";
import type { Tables } from "@/lib/database.types";
import { ClientDialog } from "../client-dialog";
import {
  saveContact,
  deleteContact,
  saveLocation,
  deleteLocation,
  saveRate,
  deleteRate,
  setClientActive,
} from "../actions";

type Client = Tables<"clients">;
type Contact = Tables<"client_contacts">;
type Location = Tables<"locations">;
type Rate = Tables<"contract_rates">;
type Lookup = { id: string; name: string };

export function ClientDetail({
  client,
  contacts,
  locations,
  rates,
  truckTypes,
  shipmentTypes,
  canEdit,
}: {
  client: Client;
  contacts: Contact[];
  locations: Location[];
  rates: Rate[];
  truckTypes: Lookup[];
  shipmentTypes: Lookup[];
  canEdit: boolean;
}) {
  const router = useRouter();
  const [editOpen, setEditOpen] = useState(false);
  const [contact, setContact] = useState<Contact | "new" | null>(null);
  const [location, setLocation] = useState<Location | "new" | null>(null);
  const [rate, setRate] = useState<Rate | "new" | null>(null);

  const nameById = (list: Lookup[], id: string | null) =>
    list.find((x) => x.id === id)?.name ?? "—";
  const locationById = (id: string | null) =>
    locations.find((l) => l.id === id)?.name ?? "—";
  const deliveryLocations = locations.filter((l) => l.kind === "delivery");

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/clients"
          className="mb-3 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-brand-navy"
        >
          <ArrowLeft className="h-4 w-4" /> Clients
        </Link>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-brand-navy">
              {client.name}
            </h1>
            <p className="text-sm text-muted-foreground">
              Code {client.code}{" "}
              <Badge variant={client.is_active ? "success" : "default"}>
                {client.is_active ? "Active" : "Inactive"}
              </Badge>
            </p>
          </div>
          {canEdit ? (
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setEditOpen(true)}>
                <Pencil className="h-4 w-4" /> Edit
              </Button>
              <Button
                variant={client.is_active ? "outline" : "default"}
                onClick={async () => {
                  await setClientActive(client.id, !client.is_active);
                  router.refresh();
                }}
              >
                {client.is_active ? "Deactivate" : "Activate"}
              </Button>
            </div>
          ) : null}
        </div>
      </div>

      <Card>
        <CardContent className="grid grid-cols-1 gap-4 p-6 sm:grid-cols-2 lg:grid-cols-4">
          <Info label="Phone" value={client.phone} />
          <Info label="Email" value={client.email} />
          <Info label="Tax ID" value={client.tax_id} />
          <Info label="Billing address" value={client.billing_address} />
        </CardContent>
      </Card>

      {/* Contacts */}
      <Section
        title="Contacts"
        canEdit={canEdit}
        onAdd={() => setContact("new")}
      >
        <Table>
          <THead>
            <TR>
              <TH>Name</TH>
              <TH>Role</TH>
              <TH>Phone</TH>
              <TH>Email</TH>
              <TH></TH>
            </TR>
          </THead>
          <TBody>
            {contacts.length === 0 ? (
              <EmptyRow cols={5} />
            ) : (
              contacts.map((c) => (
                <TR key={c.id}>
                  <TD className="font-medium">
                    {c.name}
                    {c.is_primary ? (
                      <Star className="ml-1 inline h-3.5 w-3.5 fill-brand-orange text-brand-orange" />
                    ) : null}
                  </TD>
                  <TD>{c.role ?? "—"}</TD>
                  <TD>{c.phone ?? "—"}</TD>
                  <TD>{c.email ?? "—"}</TD>
                  <TD className="text-right">
                    {canEdit ? (
                      <RowActions
                        onEdit={() => setContact(c)}
                        onDelete={async () => {
                          await deleteContact(client.id, c.id);
                          router.refresh();
                        }}
                      />
                    ) : null}
                  </TD>
                </TR>
              ))
            )}
          </TBody>
        </Table>
      </Section>

      {/* Locations */}
      <Section
        title="Locations"
        canEdit={canEdit}
        onAdd={() => setLocation("new")}
      >
        <Table>
          <THead>
            <TR>
              <TH>Name</TH>
              <TH>Kind</TH>
              <TH>Address</TH>
              <TH></TH>
            </TR>
          </THead>
          <TBody>
            {locations.length === 0 ? (
              <EmptyRow cols={4} />
            ) : (
              locations.map((l) => (
                <TR key={l.id}>
                  <TD className="font-medium">{l.name}</TD>
                  <TD>
                    <Badge variant={l.kind === "pickup" ? "info" : "navy"}>
                      {l.kind}
                    </Badge>
                  </TD>
                  <TD>{l.address ?? "—"}</TD>
                  <TD className="text-right">
                    {canEdit ? (
                      <RowActions
                        onEdit={() => setLocation(l)}
                        onDelete={async () => {
                          await deleteLocation(client.id, l.id);
                          router.refresh();
                        }}
                      />
                    ) : null}
                  </TD>
                </TR>
              ))
            )}
          </TBody>
        </Table>
      </Section>

      {/* Contract rates */}
      <Section
        title="Contract rates"
        canEdit={canEdit}
        onAdd={() => setRate("new")}
      >
        <Table>
          <THead>
            <TR>
              <TH>Delivery location</TH>
              <TH>Truck type</TH>
              <TH>Shipment type</TH>
              <TH>Rate</TH>
              <TH></TH>
            </TR>
          </THead>
          <TBody>
            {rates.length === 0 ? (
              <EmptyRow cols={5} />
            ) : (
              rates.map((r) => (
                <TR key={r.id}>
                  <TD>{locationById(r.delivery_location_id)}</TD>
                  <TD>{nameById(truckTypes, r.truck_type_id)}</TD>
                  <TD>{nameById(shipmentTypes, r.shipment_type_id)}</TD>
                  <TD className="font-medium">
                    {formatMoney(r.rate, r.currency)}
                  </TD>
                  <TD className="text-right">
                    {canEdit ? (
                      <RowActions
                        onEdit={() => setRate(r)}
                        onDelete={async () => {
                          await deleteRate(client.id, r.id);
                          router.refresh();
                        }}
                      />
                    ) : null}
                  </TD>
                </TR>
              ))
            )}
          </TBody>
        </Table>
      </Section>

      {/* Dialogs */}
      <ClientDialog
        open={editOpen}
        onClose={() => setEditOpen(false)}
        client={client}
      />
      {contact ? (
        <ContactDialog
          clientId={client.id}
          contact={contact === "new" ? undefined : contact}
          onClose={() => setContact(null)}
        />
      ) : null}
      {location ? (
        <LocationDialog
          clientId={client.id}
          location={location === "new" ? undefined : location}
          onClose={() => setLocation(null)}
        />
      ) : null}
      {rate ? (
        <RateDialog
          clientId={client.id}
          rate={rate === "new" ? undefined : rate}
          deliveryLocations={deliveryLocations}
          truckTypes={truckTypes}
          shipmentTypes={shipmentTypes}
          onClose={() => setRate(null)}
        />
      ) : null}
    </div>
  );
}

function Info({ label, value }: { label: string; value: string | null }) {
  return (
    <div>
      <p className="text-xs uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <p className="mt-0.5 text-sm text-foreground">{value || "—"}</p>
    </div>
  );
}

function Section({
  title,
  canEdit,
  onAdd,
  children,
}: {
  title: string;
  canEdit: boolean;
  onAdd: () => void;
  children: React.ReactNode;
}) {
  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <CardTitle>{title}</CardTitle>
        {canEdit ? (
          <Button size="sm" variant="outline" onClick={onAdd}>
            <Plus className="h-4 w-4" /> Add
          </Button>
        ) : null}
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

function EmptyRow({ cols }: { cols: number }) {
  return (
    <TR>
      <TD colSpan={cols} className="text-center text-muted-foreground">
        Nothing here yet.
      </TD>
    </TR>
  );
}

function RowActions({
  onEdit,
  onDelete,
}: {
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <div className="flex justify-end gap-1">
      <button
        type="button"
        onClick={onEdit}
        className="rounded p-1.5 text-muted-foreground hover:bg-muted"
        aria-label="Edit"
      >
        <Pencil className="h-4 w-4" />
      </button>
      <button
        type="button"
        onClick={() => {
          if (confirm("Delete this item?")) onDelete();
        }}
        className="rounded p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
        aria-label="Delete"
      >
        <Trash2 className="h-4 w-4" />
      </button>
    </div>
  );
}

// --- Sub-resource dialogs -----------------------------------------------------
function FormShell({
  title,
  onClose,
  onSubmit,
  saving,
  error,
  children,
}: {
  title: string;
  onClose: () => void;
  onSubmit: () => void;
  saving: boolean;
  error: string | null;
  children: React.ReactNode;
}) {
  return (
    <Dialog open onClose={onClose} title={title}>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          onSubmit();
        }}
        className="space-y-3"
      >
        {children}
        {error ? (
          <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {error}
          </p>
        ) : null}
        <div className="flex justify-end gap-2 pt-1">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={saving}>
            {saving ? "Saving…" : "Save"}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}

function ContactDialog({
  clientId,
  contact,
  onClose,
}: {
  clientId: string;
  contact?: Contact;
  onClose: () => void;
}) {
  const router = useRouter();
  const { register, handleSubmit } = useForm({
    defaultValues: {
      name: contact?.name ?? "",
      role: contact?.role ?? "",
      phone: contact?.phone ?? "",
      email: contact?.email ?? "",
      is_primary: contact?.is_primary ?? false,
    },
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const submit = handleSubmit(async (values) => {
    setSaving(true);
    setError(null);
    const res = await saveContact(clientId, values, contact?.id);
    setSaving(false);
    if (res.error) return setError(res.error);
    onClose();
    router.refresh();
  });
  return (
    <FormShell
      title={contact ? "Edit contact" : "Add contact"}
      onClose={onClose}
      onSubmit={submit}
      saving={saving}
      error={error}
    >
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Field label="Name">
          <Input {...register("name", { required: true })} />
        </Field>
        <Field label="Role">
          <Input {...register("role")} />
        </Field>
        <Field label="Phone">
          <Input {...register("phone")} />
        </Field>
        <Field label="Email">
          <Input type="email" {...register("email")} />
        </Field>
      </div>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" {...register("is_primary")} /> Primary contact
      </label>
    </FormShell>
  );
}

function LocationDialog({
  clientId,
  location,
  onClose,
}: {
  clientId: string;
  location?: Location;
  onClose: () => void;
}) {
  const router = useRouter();
  const { register, handleSubmit } = useForm({
    defaultValues: {
      kind: location?.kind ?? "pickup",
      name: location?.name ?? "",
      address: location?.address ?? "",
      maps_url: location?.maps_url ?? "",
      lat: location?.lat?.toString() ?? "",
      lng: location?.lng?.toString() ?? "",
    },
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const submit = handleSubmit(async (values) => {
    setSaving(true);
    setError(null);
    const res = await saveLocation(clientId, values, location?.id);
    setSaving(false);
    if (res.error) return setError(res.error);
    onClose();
    router.refresh();
  });
  return (
    <FormShell
      title={location ? "Edit location" : "Add location"}
      onClose={onClose}
      onSubmit={submit}
      saving={saving}
      error={error}
    >
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Field label="Kind">
          <Select {...register("kind")}>
            <option value="pickup">Pickup</option>
            <option value="delivery">Delivery</option>
          </Select>
        </Field>
        <Field label="Name">
          <Input {...register("name", { required: true })} />
        </Field>
      </div>
      <Field label="Address">
        <Textarea {...register("address")} />
      </Field>
      <Field label="Google Maps URL">
        <Input {...register("maps_url")} />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Latitude">
          <Input {...register("lat")} />
        </Field>
        <Field label="Longitude">
          <Input {...register("lng")} />
        </Field>
      </div>
    </FormShell>
  );
}

function RateDialog({
  clientId,
  rate,
  deliveryLocations,
  truckTypes,
  shipmentTypes,
  onClose,
}: {
  clientId: string;
  rate?: Rate;
  deliveryLocations: Location[];
  truckTypes: Lookup[];
  shipmentTypes: Lookup[];
  onClose: () => void;
}) {
  const router = useRouter();
  const { register, handleSubmit } = useForm({
    defaultValues: {
      delivery_location_id: rate?.delivery_location_id ?? "",
      truck_type_id: rate?.truck_type_id ?? "",
      shipment_type_id: rate?.shipment_type_id ?? "",
      rate: rate?.rate?.toString() ?? "",
      currency: rate?.currency ?? "USD",
      effective_from: rate?.effective_from ?? "",
      effective_to: rate?.effective_to ?? "",
    },
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const submit = handleSubmit(async (values) => {
    setSaving(true);
    setError(null);
    const res = await saveRate(clientId, values, rate?.id);
    setSaving(false);
    if (res.error) return setError(res.error);
    onClose();
    router.refresh();
  });
  return (
    <FormShell
      title={rate ? "Edit rate" : "Add rate"}
      onClose={onClose}
      onSubmit={submit}
      saving={saving}
      error={error}
    >
      <Field label="Delivery location">
        <Select {...register("delivery_location_id")}>
          <option value="">— Any —</option>
          {deliveryLocations.map((l) => (
            <option key={l.id} value={l.id}>
              {l.name}
            </option>
          ))}
        </Select>
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Truck type">
          <Select {...register("truck_type_id")}>
            <option value="">— Any —</option>
            {truckTypes.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Shipment type">
          <Select {...register("shipment_type_id")}>
            <option value="">— Any —</option>
            {shipmentTypes.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </Select>
        </Field>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Rate">
          <Input type="number" step="0.01" {...register("rate", { required: true })} />
        </Field>
        <Field label="Currency">
          <Input {...register("currency")} />
        </Field>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Effective from">
          <Input type="date" {...register("effective_from")} />
        </Field>
        <Field label="Effective to">
          <Input type="date" {...register("effective_to")} />
        </Field>
      </div>
    </FormShell>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      {children}
    </div>
  );
}
