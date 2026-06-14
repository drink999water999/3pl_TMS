"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { useRouter } from "next/navigation";
import { Plus, Pencil, Trash2, KeyRound, UserPlus, Unlink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Dialog } from "@/components/ui/dialog";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { truckStatusVariant, type BadgeVariant } from "@/lib/format";
import type { Tables } from "@/lib/database.types";
import {
  saveTruck,
  deleteTruck,
  saveDriver,
  deleteDriver,
  saveSupplier,
  deleteSupplier,
  createDriverLogin,
  unlinkDriverLogin,
  resetDriverPassword,
} from "./actions";

type Truck = Tables<"trucks">;
type Driver = Tables<"drivers">;
type Supplier = Tables<"suppliers">;
type Lookup = { id: string; name: string };
type SupplierType = { supplier_id: string; truck_type_id: string };
export type DriverLogin = { email: string; active: boolean };

type Tab = "trucks" | "drivers" | "suppliers";

const driverStatusVariant = (s: string): BadgeVariant =>
  s === "available" ? "success" : s === "on_trip" ? "warning" : "default";

export function FleetTabs({
  trucks,
  drivers,
  suppliers,
  truckTypes,
  supplierTypes,
  driverLogins,
  canEdit,
}: {
  trucks: Truck[];
  drivers: Driver[];
  suppliers: Supplier[];
  truckTypes: Lookup[];
  supplierTypes: SupplierType[];
  driverLogins: Record<string, DriverLogin>;
  canEdit: boolean;
}) {
  const [tab, setTab] = useState<Tab>("trucks");
  const [truck, setTruck] = useState<Truck | "new" | null>(null);
  const [driver, setDriver] = useState<Driver | "new" | null>(null);
  const [supplier, setSupplier] = useState<Supplier | "new" | null>(null);
  const [loginFor, setLoginFor] = useState<Driver | null>(null);
  const router = useRouter();

  const typeName = (id: string | null) =>
    truckTypes.find((t) => t.id === id)?.name ?? "—";
  const driverName = (id: string | null) =>
    drivers.find((d) => d.id === id)?.name ?? "—";
  const typesForSupplier = (sid: string) =>
    supplierTypes
      .filter((s) => s.supplier_id === sid)
      .map((s) => typeName(s.truck_type_id));

  const tabs: { key: Tab; label: string; count: number }[] = [
    { key: "trucks", label: "Trucks", count: trucks.length },
    { key: "drivers", label: "Drivers", count: drivers.length },
    { key: "suppliers", label: "Suppliers", count: suppliers.length },
  ];

  const onAdd = () => {
    if (tab === "trucks") setTruck("new");
    if (tab === "drivers") setDriver("new");
    if (tab === "suppliers") setSupplier("new");
  };

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <div className="flex gap-1 rounded-lg border bg-card p-1">
          {tabs.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={cn(
                "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                tab === t.key
                  ? "bg-brand-navy text-white"
                  : "text-muted-foreground hover:bg-muted",
              )}
            >
              {t.label}{" "}
              <span className="ml-1 text-xs opacity-70">{t.count}</span>
            </button>
          ))}
        </div>
        {canEdit ? (
          <Button onClick={onAdd}>
            <Plus className="h-4 w-4" /> Add
          </Button>
        ) : null}
      </div>

      {tab === "trucks" ? (
        <Table>
          <THead>
            <TR>
              <TH>Code</TH>
              <TH>Plate</TH>
              <TH>Type</TH>
              <TH>Capacity</TH>
              <TH>Default driver</TH>
              <TH>Status</TH>
              <TH></TH>
            </TR>
          </THead>
          <TBody>
            {trucks.length === 0 ? (
              <Empty cols={7} />
            ) : (
              trucks.map((t) => (
                <TR key={t.id}>
                  <TD className="font-medium">{t.code}</TD>
                  <TD>{t.plate_number}</TD>
                  <TD>{typeName(t.truck_type_id)}</TD>
                  <TD>
                    {t.capacity ? `${t.capacity} ${t.capacity_unit ?? ""}` : "—"}
                  </TD>
                  <TD>{driverName(t.default_driver_id)}</TD>
                  <TD>
                    <Badge variant={truckStatusVariant(t.status)}>
                      {t.status}
                    </Badge>
                  </TD>
                  <TD className="text-right">
                    {canEdit ? (
                      <Actions
                        onEdit={() => setTruck(t)}
                        onDelete={async () => {
                          await deleteTruck(t.id);
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
      ) : null}

      {tab === "drivers" ? (
        <Table>
          <THead>
            <TR>
              <TH>Name</TH>
              <TH>Phone</TH>
              <TH>License</TH>
              <TH>Status</TH>
              <TH>App login</TH>
              <TH></TH>
            </TR>
          </THead>
          <TBody>
            {drivers.length === 0 ? (
              <Empty cols={6} />
            ) : (
              drivers.map((d) => (
                <TR key={d.id}>
                  <TD className="font-medium">{d.name}</TD>
                  <TD>{d.phone ?? "—"}</TD>
                  <TD>{d.license_no ?? "—"}</TD>
                  <TD>
                    <Badge variant={driverStatusVariant(d.status)}>
                      {d.status.replace("_", " ")}
                    </Badge>
                  </TD>
                  <TD>
                    {driverLogins[d.id] ? (
                      <div className="flex flex-col">
                        <span className="text-xs">{driverLogins[d.id].email}</span>
                        <Badge
                          variant={
                            driverLogins[d.id].active ? "success" : "default"
                          }
                        >
                          {driverLogins[d.id].active ? "Active" : "Disabled"}
                        </Badge>
                      </div>
                    ) : d.user_id ? (
                      <span className="text-xs text-muted-foreground">Linked</span>
                    ) : (
                      <span className="text-xs text-muted-foreground">
                        No login
                      </span>
                    )}
                  </TD>
                  <TD className="text-right">
                    {canEdit ? (
                      <div className="flex items-center justify-end gap-1">
                        <button
                          type="button"
                          onClick={() => setLoginFor(d)}
                          className="rounded p-1.5 text-muted-foreground hover:bg-muted"
                          aria-label="Manage login"
                          title="Manage app login"
                        >
                          <KeyRound className="h-4 w-4" />
                        </button>
                        <Actions
                          onEdit={() => setDriver(d)}
                          onDelete={async () => {
                            await deleteDriver(d.id);
                            router.refresh();
                          }}
                        />
                      </div>
                    ) : null}
                  </TD>
                </TR>
              ))
            )}
          </TBody>
        </Table>
      ) : null}

      {tab === "suppliers" ? (
        <Table>
          <THead>
            <TR>
              <TH>Name</TH>
              <TH>Code</TH>
              <TH>Phone</TH>
              <TH>Truck types</TH>
              <TH>Status</TH>
              <TH></TH>
            </TR>
          </THead>
          <TBody>
            {suppliers.length === 0 ? (
              <Empty cols={6} />
            ) : (
              suppliers.map((s) => (
                <TR key={s.id}>
                  <TD className="font-medium">{s.name}</TD>
                  <TD>{s.code ?? "—"}</TD>
                  <TD>{s.phone ?? "—"}</TD>
                  <TD>
                    {typesForSupplier(s.id).join(", ") || "—"}
                  </TD>
                  <TD>
                    <Badge variant={s.status === "active" ? "success" : "default"}>
                      {s.status}
                    </Badge>
                  </TD>
                  <TD className="text-right">
                    {canEdit ? (
                      <Actions
                        onEdit={() => setSupplier(s)}
                        onDelete={async () => {
                          await deleteSupplier(s.id);
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
      ) : null}

      {truck ? (
        <TruckDialog
          truck={truck === "new" ? undefined : truck}
          truckTypes={truckTypes}
          drivers={drivers}
          onClose={() => setTruck(null)}
        />
      ) : null}
      {driver ? (
        <DriverDialog
          driver={driver === "new" ? undefined : driver}
          onClose={() => setDriver(null)}
        />
      ) : null}
      {loginFor ? (
        <DriverLoginDialog
          driver={loginFor}
          login={driverLogins[loginFor.id]}
          onClose={() => setLoginFor(null)}
        />
      ) : null}
      {supplier ? (
        <SupplierDialog
          supplier={supplier === "new" ? undefined : supplier}
          truckTypes={truckTypes}
          initialTypeIds={
            supplier === "new"
              ? []
              : supplierTypes
                  .filter((st) => st.supplier_id === supplier.id)
                  .map((st) => st.truck_type_id)
          }
          onClose={() => setSupplier(null)}
        />
      ) : null}
    </div>
  );
}

function Empty({ cols }: { cols: number }) {
  return (
    <TR>
      <TD colSpan={cols} className="text-center text-muted-foreground">
        Nothing here yet.
      </TD>
    </TR>
  );
}

function Actions({
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
          if (confirm("Remove this item?")) onDelete();
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
  truck,
  truckTypes,
  drivers,
  onClose,
}: {
  truck?: Truck;
  truckTypes: Lookup[];
  drivers: Driver[];
  onClose: () => void;
}) {
  const router = useRouter();
  const { register, handleSubmit } = useForm({
    defaultValues: {
      code: truck?.code ?? "",
      plate_number: truck?.plate_number ?? "",
      truck_type_id: truck?.truck_type_id ?? "",
      capacity: truck?.capacity?.toString() ?? "",
      capacity_unit: truck?.capacity_unit ?? "kg",
      status: truck?.status ?? "available",
      default_driver_id: truck?.default_driver_id ?? "",
      is_active: truck?.is_active ?? true,
    },
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const submit = handleSubmit(async (values) => {
    setSaving(true);
    setError(null);
    const res = await saveTruck(values, truck?.id);
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
      <div className="grid grid-cols-2 gap-3">
        <Field label="Code">
          <Input {...register("code", { required: true })} />
        </Field>
        <Field label="Plate number">
          <Input {...register("plate_number", { required: true })} />
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
        <Field label="Status">
          <Select {...register("status")}>
            <option value="available">Available</option>
            <option value="busy">Busy</option>
            <option value="maintenance">Maintenance</option>
          </Select>
        </Field>
        <Field label="Capacity">
          <Input type="number" step="0.01" {...register("capacity")} />
        </Field>
        <Field label="Capacity unit">
          <Input {...register("capacity_unit")} />
        </Field>
      </div>
      <Field label="Default driver">
        <Select {...register("default_driver_id")}>
          <option value="">— None —</option>
          {drivers.map((d) => (
            <option key={d.id} value={d.id}>
              {d.name}
            </option>
          ))}
        </Select>
      </Field>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" {...register("is_active")} /> Active
      </label>
    </FormShell>
  );
}

function DriverDialog({
  driver,
  onClose,
}: {
  driver?: Driver;
  onClose: () => void;
}) {
  const router = useRouter();
  const { register, handleSubmit } = useForm({
    defaultValues: {
      name: driver?.name ?? "",
      phone: driver?.phone ?? "",
      license_no: driver?.license_no ?? "",
      status: driver?.status ?? "available",
      is_active: driver?.is_active ?? true,
    },
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const submit = handleSubmit(async (values) => {
    setSaving(true);
    setError(null);
    const res = await saveDriver(values, driver?.id);
    setSaving(false);
    if (res.error) return setError(res.error);
    onClose();
    router.refresh();
  });
  return (
    <FormShell
      title={driver ? "Edit driver" : "Add driver"}
      onClose={onClose}
      onSubmit={submit}
      saving={saving}
      error={error}
    >
      <div className="grid grid-cols-2 gap-3">
        <Field label="Name">
          <Input {...register("name", { required: true })} />
        </Field>
        <Field label="Phone">
          <Input {...register("phone")} />
        </Field>
        <Field label="License no.">
          <Input {...register("license_no")} />
        </Field>
        <Field label="Status">
          <Select {...register("status")}>
            <option value="available">Available</option>
            <option value="on_trip">On trip</option>
            <option value="off_duty">Off duty</option>
            <option value="inactive">Inactive</option>
          </Select>
        </Field>
      </div>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" {...register("is_active")} /> Active
      </label>
    </FormShell>
  );
}

function SupplierDialog({
  supplier,
  truckTypes,
  initialTypeIds,
  onClose,
}: {
  supplier?: Supplier;
  truckTypes: Lookup[];
  initialTypeIds: string[];
  onClose: () => void;
}) {
  const router = useRouter();
  const { register, handleSubmit } = useForm({
    defaultValues: {
      name: supplier?.name ?? "",
      code: supplier?.code ?? "",
      phone: supplier?.phone ?? "",
      email: supplier?.email ?? "",
      address: supplier?.address ?? "",
      status: supplier?.status ?? "active",
      is_active: supplier?.is_active ?? true,
    },
  });
  const [typeIds, setTypeIds] = useState<string[]>(initialTypeIds);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const toggle = (id: string) =>
    setTypeIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );

  const submit = handleSubmit(async (values) => {
    setSaving(true);
    setError(null);
    const res = await saveSupplier(
      { ...values, truck_type_ids: typeIds },
      supplier?.id,
    );
    setSaving(false);
    if (res.error) return setError(res.error);
    onClose();
    router.refresh();
  });
  return (
    <FormShell
      title={supplier ? "Edit supplier" : "Add supplier"}
      onClose={onClose}
      onSubmit={submit}
      saving={saving}
      error={error}
    >
      <div className="grid grid-cols-2 gap-3">
        <Field label="Name">
          <Input {...register("name", { required: true })} />
        </Field>
        <Field label="Code">
          <Input {...register("code")} />
        </Field>
        <Field label="Phone">
          <Input {...register("phone")} />
        </Field>
        <Field label="Email">
          <Input type="email" {...register("email")} />
        </Field>
        <Field label="Status">
          <Select {...register("status")}>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </Select>
        </Field>
      </div>
      <Field label="Address">
        <Textarea {...register("address")} />
      </Field>
      <div className="space-y-1.5">
        <Label>Truck types offered</Label>
        <div className="flex flex-wrap gap-2">
          {truckTypes.map((t) => (
            <label
              key={t.id}
              className={cn(
                "cursor-pointer rounded-md border px-3 py-1.5 text-sm",
                typeIds.includes(t.id)
                  ? "border-brand-blue bg-brand-blue/10 text-brand-blue"
                  : "border-input",
              )}
            >
              <input
                type="checkbox"
                className="sr-only"
                checked={typeIds.includes(t.id)}
                onChange={() => toggle(t.id)}
              />
              {t.name}
            </label>
          ))}
        </div>
      </div>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" {...register("is_active")} /> Active
      </label>
    </FormShell>
  );
}

function DriverLoginDialog({
  driver,
  login,
  onClose,
}: {
  driver: Driver;
  login?: DriverLogin;
  onClose: () => void;
}) {
  const router = useRouter();
  const linked = !!driver.user_id;
  const [email, setEmail] = useState(login?.email ?? "");
  const [password, setPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);

  const create = async () => {
    setSaving(true);
    setError(null);
    const res = await createDriverLogin(driver.id, { email, password });
    setSaving(false);
    if (res.error) return setError(res.error);
    onClose();
    router.refresh();
  };

  const resetPw = async () => {
    setSaving(true);
    setError(null);
    const res = await resetDriverPassword(driver.id, password);
    setSaving(false);
    if (res.error) return setError(res.error);
    setDone("Password updated. Share it with the driver securely.");
    setPassword("");
  };

  const unlink = async () => {
    if (!confirm("Revoke this driver's login? They won't be able to sign in.")) return;
    setSaving(true);
    setError(null);
    const res = await unlinkDriverLogin(driver.id);
    setSaving(false);
    if (res.error) return setError(res.error);
    onClose();
    router.refresh();
  };

  return (
    <Dialog open onClose={onClose} title={`Driver login — ${driver.name}`}>
      <div className="space-y-3">
        {!linked ? (
          <>
            <p className="text-sm text-muted-foreground">
              Create an app login so {driver.name} can sign in, see their assigned
              deliveries, and complete them with proof of delivery.
            </p>
            <div className="space-y-1.5">
              <Label>Email</Label>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="driver@example.com"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Temporary password</Label>
              <Input
                type="text"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="At least 8 characters"
              />
            </div>
            {error ? (
              <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {error}
              </p>
            ) : null}
            <div className="flex justify-end gap-2 pt-1">
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button type="button" disabled={saving} onClick={create}>
                <UserPlus className="h-4 w-4" />
                {saving ? "Creating…" : "Create login"}
              </Button>
            </div>
          </>
        ) : (
          <>
            <div className="rounded-md border bg-muted/40 px-3 py-2 text-sm">
              <span className="text-muted-foreground">Signed-in email: </span>
              <span className="font-medium">{login?.email ?? "linked"}</span>
            </div>
            {done ? (
              <p className="rounded-md bg-green-100 px-3 py-2 text-sm text-green-800">
                {done}
              </p>
            ) : (
              <div className="space-y-1.5">
                <Label>Reset password</Label>
                <Input
                  type="text"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="New password (min 8 characters)"
                />
              </div>
            )}
            {error ? (
              <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {error}
              </p>
            ) : null}
            <div className="flex items-center justify-between pt-1">
              <Button
                type="button"
                variant="ghost"
                disabled={saving}
                onClick={unlink}
                className="text-destructive"
              >
                <Unlink className="h-4 w-4" /> Revoke access
              </Button>
              <div className="flex gap-2">
                <Button type="button" variant="outline" onClick={onClose}>
                  Close
                </Button>
                {!done ? (
                  <Button
                    type="button"
                    disabled={saving || !password}
                    onClick={resetPw}
                  >
                    <KeyRound className="h-4 w-4" /> Set password
                  </Button>
                ) : null}
              </div>
            </div>
          </>
        )}
      </div>
    </Dialog>
  );
}
