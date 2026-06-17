"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { ArrowLeft, Pencil, Plus, Trash2 } from "lucide-react";
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
import { Dialog } from "@/components/ui/dialog";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/table";
import { formatMoney } from "@/lib/format";
import type { Tables } from "@/lib/database.types";
import {
  saveSupplierTruck,
  deleteSupplierTruck,
  saveSupplierRate,
  deleteSupplierRate,
} from "../../actions";

type Supplier = Tables<"suppliers">;
type SupplierTruck = Tables<"supplier_trucks">;
type SupplierRate = Tables<"supplier_rates">;
type Lookup = { id: string; name: string };
type RouteOption = { id: string; label: string };

export function SupplierDetail({
  supplier,
  trucks,
  rates,
  truckTypes,
  serviceTypes,
  routeOptions,
  canEdit,
}: {
  supplier: Supplier;
  trucks: SupplierTruck[];
  rates: SupplierRate[];
  truckTypes: Lookup[];
  serviceTypes: Lookup[];
  routeOptions: RouteOption[];
  canEdit: boolean;
}) {
  const router = useRouter();
  const [truck, setTruck] = useState<SupplierTruck | "new" | null>(null);
  const [rate, setRate] = useState<SupplierRate | "new" | null>(null);

  const nameById = (list: Lookup[], id: string | null) =>
    id ? list.find((x) => x.id === id)?.name ?? "—" : "—";
  const routeLabel = (id: string | null) =>
    id ? routeOptions.find((r) => r.id === id)?.label ?? "—" : "Any route";

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/fleet"
          className="mb-3 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-brand-navy"
        >
          <ArrowLeft className="h-4 w-4" /> Fleet
        </Link>
        <h1 className="text-2xl font-bold tracking-tight text-brand-navy">
          {supplier.name}
        </h1>
        <p className="text-sm text-muted-foreground">
          {supplier.code ? `Code ${supplier.code} · ` : ""}
          <Badge variant={supplier.status === "active" ? "success" : "default"}>
            {supplier.status}
          </Badge>
        </p>
      </div>

      <Card>
        <CardContent className="grid grid-cols-1 gap-4 p-6 sm:grid-cols-2 lg:grid-cols-4">
          <Info label="Phone" value={supplier.phone} />
          <Info label="Email" value={supplier.email} />
          <Info label="Address" value={supplier.address} />
          <Info label="Rate basis" value="Per trip" />
        </CardContent>
      </Card>

      {/* Trucks */}
      <Section title="Trucks" canEdit={canEdit} onAdd={() => setTruck("new")}>
        <Table>
          <THead>
            <TR>
              <TH>Plate</TH>
              <TH>Driver</TH>
              <TH>Driver ID</TH>
              <TH>Mobile</TH>
              <TH>Truck type</TH>
              <TH></TH>
            </TR>
          </THead>
          <TBody>
            {trucks.length === 0 ? (
              <EmptyRow cols={6} />
            ) : (
              trucks.map((t) => (
                <TR key={t.id}>
                  <TD className="font-medium">{t.plate_number}</TD>
                  <TD>{t.driver_name ?? "—"}</TD>
                  <TD>{t.driver_id_no ?? "—"}</TD>
                  <TD>{t.driver_mobile ?? "—"}</TD>
                  <TD>{nameById(truckTypes, t.truck_type_id)}</TD>
                  <TD className="text-right">
                    {canEdit ? (
                      <RowActions
                        onEdit={() => setTruck(t)}
                        onDelete={async () => {
                          await deleteSupplierTruck(supplier.id, t.id);
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

      {/* Cost matrix */}
      <Section
        title="Cost list (Service type × Route)"
        canEdit={canEdit}
        onAdd={() => setRate("new")}
      >
        <Table>
          <THead>
            <TR>
              <TH>Service type</TH>
              <TH>Route</TH>
              <TH>Cost</TH>
              <TH></TH>
            </TR>
          </THead>
          <TBody>
            {rates.length === 0 ? (
              <EmptyRow cols={4} />
            ) : (
              rates.map((r) => (
                <TR key={r.id}>
                  <TD className="font-medium">
                    {r.service_type_id
                      ? nameById(serviceTypes, r.service_type_id)
                      : nameById(truckTypes, r.truck_type_id)}
                  </TD>
                  <TD>{r.route_id ? routeLabel(r.route_id) : r.lane ?? "—"}</TD>
                  <TD className="font-medium">
                    {formatMoney(r.rate, r.currency)}
                  </TD>
                  <TD className="text-right">
                    {canEdit ? (
                      <RowActions
                        onEdit={() => setRate(r)}
                        onDelete={async () => {
                          await deleteSupplierRate(supplier.id, r.id);
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

      {truck ? (
        <TruckDialog
          supplierId={supplier.id}
          truck={truck === "new" ? undefined : truck}
          truckTypes={truckTypes}
          serviceTypes={serviceTypes}
          onClose={() => setTruck(null)}
        />
      ) : null}
      {rate ? (
        <RateDialog
          supplierId={supplier.id}
          rate={rate === "new" ? undefined : rate}
          serviceTypes={serviceTypes}
          routeOptions={routeOptions}
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

function TruckDialog({
  supplierId,
  truck,
  truckTypes,
  serviceTypes,
  onClose,
}: {
  supplierId: string;
  truck?: SupplierTruck;
  truckTypes: Lookup[];
  serviceTypes: Lookup[];
  onClose: () => void;
}) {
  const router = useRouter();
  const { register, handleSubmit } = useForm({
    defaultValues: {
      plate_number: truck?.plate_number ?? "",
      driver_name: truck?.driver_name ?? "",
      driver_id_no: truck?.driver_id_no ?? "",
      driver_mobile: truck?.driver_mobile ?? "",
      truck_type_id: truck?.truck_type_id ?? "",
      service_type_id: truck?.service_type_id ?? "",
      is_active: truck?.is_active ?? true,
    },
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const submit = handleSubmit(async (values) => {
    setSaving(true);
    setError(null);
    const res = await saveSupplierTruck(supplierId, values, truck?.id);
    setSaving(false);
    if (res.error) return setError(res.error);
    onClose();
    router.refresh();
  });
  return (
    <FormShell
      title={truck ? "Edit truck" : "Add truck"}
      onClose={onClose}
      onSubmit={submit}
      saving={saving}
      error={error}
    >
      <Field label="Truck plate">
        <Input {...register("plate_number", { required: true })} />
      </Field>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Field label="Driver name">
          <Input {...register("driver_name")} />
        </Field>
        <Field label="Driver ID">
          <Input {...register("driver_id_no")} />
        </Field>
        <Field label="Driver mobile">
          <Input {...register("driver_mobile")} />
        </Field>
        <Field label="Truck type">
          <Select {...register("truck_type_id")}>
            <option value="">— Select —</option>
            {truckTypes.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Service type">
          <Select {...register("service_type_id")}>
            <option value="">— Select —</option>
            {serviceTypes.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </Select>
        </Field>
      </div>
    </FormShell>
  );
}

function RateDialog({
  supplierId,
  rate,
  serviceTypes,
  routeOptions,
  onClose,
}: {
  supplierId: string;
  rate?: SupplierRate;
  serviceTypes: Lookup[];
  routeOptions: RouteOption[];
  onClose: () => void;
}) {
  const router = useRouter();
  const { register, handleSubmit } = useForm({
    defaultValues: {
      service_type_id: rate?.service_type_id ?? "",
      route_id: rate?.route_id ?? "",
      truck_type_id: rate?.truck_type_id ?? "",
      lane: rate?.lane ?? "",
      rate: rate?.rate?.toString() ?? "",
      currency: rate?.currency ?? "SAR",
    },
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const submit = handleSubmit(async (values) => {
    setSaving(true);
    setError(null);
    const res = await saveSupplierRate(supplierId, values, rate?.id);
    setSaving(false);
    if (res.error) return setError(res.error);
    onClose();
    router.refresh();
  });
  return (
    <FormShell
      title={rate ? "Edit cost" : "Add cost"}
      onClose={onClose}
      onSubmit={submit}
      saving={saving}
      error={error}
    >
      <input type="hidden" {...register("truck_type_id")} />
      <input type="hidden" {...register("lane")} />
      <Field label="Service type">
        <Select {...register("service_type_id")}>
          <option value="">— Any —</option>
          {serviceTypes.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </Select>
      </Field>
      <Field label="Route">
        <Select {...register("route_id")}>
          <option value="">— Any —</option>
          {routeOptions.map((r) => (
            <option key={r.id} value={r.id}>
              {r.label}
            </option>
          ))}
        </Select>
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Cost">
          <Input
            type="number"
            step="0.01"
            {...register("rate", { required: true })}
          />
        </Field>
        <Field label="Currency">
          <Input {...register("currency")} />
        </Field>
      </div>
    </FormShell>
  );
}
