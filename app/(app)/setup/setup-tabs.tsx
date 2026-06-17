"use client";

import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { useRouter } from "next/navigation";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { Dialog } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/table";
import { formatMoney } from "@/lib/format";
import type { Tables } from "@/lib/database.types";
import {
  saveCity,
  deleteCity,
  saveRoute,
  deleteRoute,
  saveServiceType,
  deleteServiceType,
  saveTruckType,
  deleteTruckType,
  saveStandardRate,
  deleteStandardRate,
} from "./actions";

type City = Tables<"cities">;
type Route = Tables<"routes">;
type ServiceType = Tables<"service_types">;
type TruckType = Tables<"truck_types">;
type StandardRate = Tables<"standard_rates">;

const TABS = [
  { key: "cities", label: "Cities" },
  { key: "routes", label: "Routes" },
  { key: "services", label: "Service Types" },
  { key: "trucks", label: "Truck Types" },
  { key: "rates", label: "Standard Rates" },
] as const;
type TabKey = (typeof TABS)[number]["key"];

export function SetupTabs({
  cities,
  routes,
  serviceTypes,
  truckTypes,
  standardRates,
}: {
  cities: City[];
  routes: Route[];
  serviceTypes: ServiceType[];
  truckTypes: TruckType[];
  standardRates: StandardRate[];
}) {
  const [tab, setTab] = useState<TabKey>("cities");
  const cityById = useMemo(
    () => new Map(cities.map((c) => [c.id, c])),
    [cities],
  );
  const serviceById = useMemo(
    () => new Map(serviceTypes.map((s) => [s.id, s])),
    [serviceTypes],
  );
  const routeLabel = (id: string | null) => {
    if (!id) return "Any route";
    const r = routes.find((x) => x.id === id);
    if (!r) return "—";
    const from = cityById.get(r.from_city_id)?.name ?? "?";
    const to = cityById.get(r.to_city_id)?.name ?? "?";
    return `${from} → ${to}`;
  };

  return (
    <div>
      <div className="mb-4 flex flex-wrap gap-1 border-b">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={
              "rounded-t-md px-4 py-2 text-sm font-medium transition-colors " +
              (tab === t.key
                ? "border-b-2 border-brand-blue text-brand-navy"
                : "text-muted-foreground hover:text-foreground")
            }
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "cities" && <CitiesTab cities={cities} />}
      {tab === "routes" && <RoutesTab routes={routes} cities={cities} routeLabel={routeLabel} />}
      {tab === "services" && <ServicesTab serviceTypes={serviceTypes} />}
      {tab === "trucks" && <TruckTypesTab truckTypes={truckTypes} />}
      {tab === "rates" && (
        <RatesTab
          standardRates={standardRates}
          serviceTypes={serviceTypes}
          routes={routes}
          routeLabel={routeLabel}
          serviceById={serviceById}
        />
      )}
    </div>
  );
}

function YesNo({ value }: { value: boolean }) {
  return (
    <Badge variant={value ? "success" : "default"}>{value ? "Yes" : "No"}</Badge>
  );
}

function ErrorBox({ error }: { error: string | null }) {
  if (!error) return null;
  return (
    <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
      {error}
    </p>
  );
}

// ============================ Cities ==========================================
function CitiesTab({ cities }: { cities: City[] }) {
  const [open, setOpen] = useState(false);
  const [edit, setEdit] = useState<City | undefined>(undefined);
  const router = useRouter();

  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <Button
          onClick={() => {
            setEdit(undefined);
            setOpen(true);
          }}
        >
          <Plus className="mr-1.5 h-4 w-4" /> Add city
        </Button>
      </div>
      <Table>
        <THead>
          <TR>
            <TH>Name</TH>
            <TH>Code</TH>
            <TH>Region</TH>
            <TH>Active</TH>
            <TH className="text-right">Actions</TH>
          </TR>
        </THead>
        <TBody>
          {cities.length === 0 ? (
            <TR>
              <TD colSpan={5} className="text-center text-muted-foreground">
                No cities yet.
              </TD>
            </TR>
          ) : (
            cities.map((c) => (
              <TR key={c.id}>
                <TD className="font-medium">{c.name}</TD>
                <TD>{c.code ?? "—"}</TD>
                <TD>{c.region ?? "—"}</TD>
                <TD>
                  <YesNo value={c.is_active} />
                </TD>
                <TD className="text-right">
                  <RowActions
                    onEdit={() => {
                      setEdit(c);
                      setOpen(true);
                    }}
                    onDelete={async () => {
                      await deleteCity(c.id);
                      router.refresh();
                    }}
                    label={c.name}
                  />
                </TD>
              </TR>
            ))
          )}
        </TBody>
      </Table>
      {open && (
        <CityDialog
          city={edit}
          onClose={() => setOpen(false)}
        />
      )}
    </div>
  );
}

function CityDialog({ city, onClose }: { city?: City; onClose: () => void }) {
  const router = useRouter();
  const { register, handleSubmit } = useForm({
    defaultValues: {
      name: city?.name ?? "",
      code: city?.code ?? "",
      region: city?.region ?? "",
      is_active: city?.is_active ?? true,
    },
  });
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const onSubmit = handleSubmit(async (values) => {
    setSaving(true);
    setError(null);
    const res = await saveCity(values, city?.id);
    setSaving(false);
    if (res.error) return setError(res.error);
    onClose();
    router.refresh();
  });
  return (
    <Dialog open onClose={onClose} title={city ? "Edit city" : "New city"}>
      <form onSubmit={onSubmit} className="space-y-3">
        <div className="space-y-1.5">
          <Label htmlFor="name">Name</Label>
          <Input id="name" {...register("name", { required: true })} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="code">Code</Label>
            <Input id="code" placeholder="RUH" {...register("code")} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="region">Region</Label>
            <Input id="region" {...register("region")} />
          </div>
        </div>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" {...register("is_active")} /> Active
        </label>
        <ErrorBox error={error} />
        <DialogFooter onClose={onClose} saving={saving} />
      </form>
    </Dialog>
  );
}

// ============================ Routes ==========================================
function RoutesTab({
  routes,
  cities,
  routeLabel,
}: {
  routes: Route[];
  cities: City[];
  routeLabel: (id: string | null) => string;
}) {
  const [open, setOpen] = useState(false);
  const [edit, setEdit] = useState<Route | undefined>(undefined);
  const router = useRouter();
  const activeCities = cities.filter((c) => c.is_active);

  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <Button
          disabled={activeCities.length < 2}
          onClick={() => {
            setEdit(undefined);
            setOpen(true);
          }}
        >
          <Plus className="mr-1.5 h-4 w-4" /> Add route
        </Button>
      </div>
      {activeCities.length < 2 && (
        <p className="text-sm text-muted-foreground">
          Add at least two cities before creating routes.
        </p>
      )}
      <Table>
        <THead>
          <TR>
            <TH>Route</TH>
            <TH>Distance (km)</TH>
            <TH>Active</TH>
            <TH className="text-right">Actions</TH>
          </TR>
        </THead>
        <TBody>
          {routes.length === 0 ? (
            <TR>
              <TD colSpan={4} className="text-center text-muted-foreground">
                No routes yet.
              </TD>
            </TR>
          ) : (
            routes.map((r) => (
              <TR key={r.id}>
                <TD className="font-medium">{routeLabel(r.id)}</TD>
                <TD>{r.distance_km ?? "—"}</TD>
                <TD>
                  <YesNo value={r.is_active} />
                </TD>
                <TD className="text-right">
                  <RowActions
                    onEdit={() => {
                      setEdit(r);
                      setOpen(true);
                    }}
                    onDelete={async () => {
                      await deleteRoute(r.id);
                      router.refresh();
                    }}
                    label={routeLabel(r.id)}
                  />
                </TD>
              </TR>
            ))
          )}
        </TBody>
      </Table>
      {open && (
        <RouteDialog
          route={edit}
          cities={activeCities}
          onClose={() => setOpen(false)}
        />
      )}
    </div>
  );
}

function RouteDialog({
  route,
  cities,
  onClose,
}: {
  route?: Route;
  cities: City[];
  onClose: () => void;
}) {
  const router = useRouter();
  const { register, handleSubmit } = useForm({
    defaultValues: {
      from_city_id: route?.from_city_id ?? "",
      to_city_id: route?.to_city_id ?? "",
      distance_km: route?.distance_km?.toString() ?? "",
      is_active: route?.is_active ?? true,
    },
  });
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const onSubmit = handleSubmit(async (values) => {
    setSaving(true);
    setError(null);
    const res = await saveRoute(values, route?.id);
    setSaving(false);
    if (res.error) return setError(res.error);
    onClose();
    router.refresh();
  });
  return (
    <Dialog open onClose={onClose} title={route ? "Edit route" : "New route"}>
      <form onSubmit={onSubmit} className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="from_city_id">From</Label>
            <Select id="from_city_id" {...register("from_city_id", { required: true })}>
              <option value="">Select…</option>
              {cities.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="to_city_id">To</Label>
            <Select id="to_city_id" {...register("to_city_id", { required: true })}>
              <option value="">Select…</option>
              {cities.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </Select>
          </div>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="distance_km">Distance (km, optional)</Label>
          <Input
            id="distance_km"
            type="number"
            step="0.1"
            min="0"
            {...register("distance_km")}
          />
        </div>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" {...register("is_active")} /> Active
        </label>
        <ErrorBox error={error} />
        <DialogFooter onClose={onClose} saving={saving} />
      </form>
    </Dialog>
  );
}

// ============================ Service Types ===================================
function ServicesTab({ serviceTypes }: { serviceTypes: ServiceType[] }) {
  const [open, setOpen] = useState(false);
  const [edit, setEdit] = useState<ServiceType | undefined>(undefined);
  const router = useRouter();
  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <Button
          onClick={() => {
            setEdit(undefined);
            setOpen(true);
          }}
        >
          <Plus className="mr-1.5 h-4 w-4" /> Add service type
        </Button>
      </div>
      <Table>
        <THead>
          <TR>
            <TH>Name</TH>
            <TH>Code</TH>
            <TH>Quantity?</TH>
            <TH>Order</TH>
            <TH>Active</TH>
            <TH className="text-right">Actions</TH>
          </TR>
        </THead>
        <TBody>
          {serviceTypes.length === 0 ? (
            <TR>
              <TD colSpan={6} className="text-center text-muted-foreground">
                No service types yet.
              </TD>
            </TR>
          ) : (
            serviceTypes.map((s) => (
              <TR key={s.id}>
                <TD className="font-medium">{s.name}</TD>
                <TD>{s.code ?? "—"}</TD>
                <TD>
                  <YesNo value={s.requires_quantity} />
                </TD>
                <TD>{s.sort_order}</TD>
                <TD>
                  <YesNo value={s.is_active} />
                </TD>
                <TD className="text-right">
                  <RowActions
                    onEdit={() => {
                      setEdit(s);
                      setOpen(true);
                    }}
                    onDelete={async () => {
                      await deleteServiceType(s.id);
                      router.refresh();
                    }}
                    label={s.name}
                  />
                </TD>
              </TR>
            ))
          )}
        </TBody>
      </Table>
      {open && (
        <ServiceTypeDialog
          serviceType={edit}
          onClose={() => setOpen(false)}
        />
      )}
    </div>
  );
}

function ServiceTypeDialog({
  serviceType,
  onClose,
}: {
  serviceType?: ServiceType;
  onClose: () => void;
}) {
  const router = useRouter();
  const { register, handleSubmit } = useForm({
    defaultValues: {
      name: serviceType?.name ?? "",
      code: serviceType?.code ?? "",
      requires_quantity: serviceType?.requires_quantity ?? false,
      sort_order: serviceType?.sort_order?.toString() ?? "0",
      is_active: serviceType?.is_active ?? true,
    },
  });
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const onSubmit = handleSubmit(async (values) => {
    setSaving(true);
    setError(null);
    const res = await saveServiceType(values, serviceType?.id);
    setSaving(false);
    if (res.error) return setError(res.error);
    onClose();
    router.refresh();
  });
  return (
    <Dialog
      open
      onClose={onClose}
      title={serviceType ? "Edit service type" : "New service type"}
    >
      <form onSubmit={onSubmit} className="space-y-3">
        <div className="space-y-1.5">
          <Label htmlFor="name">Name</Label>
          <Input id="name" {...register("name", { required: true })} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="code">Code</Label>
            <Input id="code" {...register("code")} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="sort_order">Sort order</Label>
            <Input
              id="sort_order"
              type="number"
              step="1"
              {...register("sort_order")}
            />
          </div>
        </div>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" {...register("requires_quantity")} /> Requires
          quantity (e.g. Pallet, Box)
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" {...register("is_active")} /> Active
        </label>
        <ErrorBox error={error} />
        <DialogFooter onClose={onClose} saving={saving} />
      </form>
    </Dialog>
  );
}

// ============================ Standard Rates (Rate Page) ======================
function RatesTab({
  standardRates,
  serviceTypes,
  routes,
  routeLabel,
  serviceById,
}: {
  standardRates: StandardRate[];
  serviceTypes: ServiceType[];
  routes: Route[];
  routeLabel: (id: string | null) => string;
  serviceById: Map<string, ServiceType>;
}) {
  const [open, setOpen] = useState(false);
  const [edit, setEdit] = useState<StandardRate | undefined>(undefined);
  const router = useRouter();
  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">
        Standard prices per service type and route. These pre-fill new client
        contract rates (you can still change them per client).
      </p>
      <div className="flex justify-end">
        <Button
          onClick={() => {
            setEdit(undefined);
            setOpen(true);
          }}
        >
          <Plus className="mr-1.5 h-4 w-4" /> Add standard rate
        </Button>
      </div>
      <Table>
        <THead>
          <TR>
            <TH>Service type</TH>
            <TH>Route</TH>
            <TH>Rate</TH>
            <TH>Active</TH>
            <TH className="text-right">Actions</TH>
          </TR>
        </THead>
        <TBody>
          {standardRates.length === 0 ? (
            <TR>
              <TD colSpan={5} className="text-center text-muted-foreground">
                No standard rates yet.
              </TD>
            </TR>
          ) : (
            standardRates.map((r) => (
              <TR key={r.id}>
                <TD className="font-medium">
                  {r.service_type_id
                    ? serviceById.get(r.service_type_id)?.name ?? "—"
                    : "Any service"}
                </TD>
                <TD>{routeLabel(r.route_id)}</TD>
                <TD>{formatMoney(r.rate, r.currency)}</TD>
                <TD>
                  <YesNo value={r.is_active} />
                </TD>
                <TD className="text-right">
                  <RowActions
                    onEdit={() => {
                      setEdit(r);
                      setOpen(true);
                    }}
                    onDelete={async () => {
                      await deleteStandardRate(r.id);
                      router.refresh();
                    }}
                    label="this rate"
                  />
                </TD>
              </TR>
            ))
          )}
        </TBody>
      </Table>
      {open && (
        <StandardRateDialog
          rate={edit}
          serviceTypes={serviceTypes}
          routes={routes}
          routeLabel={routeLabel}
          onClose={() => setOpen(false)}
        />
      )}
    </div>
  );
}

function StandardRateDialog({
  rate,
  serviceTypes,
  routes,
  routeLabel,
  onClose,
}: {
  rate?: StandardRate;
  serviceTypes: ServiceType[];
  routes: Route[];
  routeLabel: (id: string | null) => string;
  onClose: () => void;
}) {
  const router = useRouter();
  const { register, handleSubmit } = useForm({
    defaultValues: {
      service_type_id: rate?.service_type_id ?? "",
      route_id: rate?.route_id ?? "",
      rate: rate?.rate?.toString() ?? "",
      currency: rate?.currency ?? "SAR",
      is_active: rate?.is_active ?? true,
    },
  });
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const onSubmit = handleSubmit(async (values) => {
    setSaving(true);
    setError(null);
    const res = await saveStandardRate(values, rate?.id);
    setSaving(false);
    if (res.error) return setError(res.error);
    onClose();
    router.refresh();
  });
  return (
    <Dialog
      open
      onClose={onClose}
      title={rate ? "Edit standard rate" : "New standard rate"}
    >
      <form onSubmit={onSubmit} className="space-y-3">
        <div className="space-y-1.5">
          <Label htmlFor="service_type_id">Service type</Label>
          <Select id="service_type_id" {...register("service_type_id")}>
            <option value="">Any service</option>
            {serviceTypes
              .filter((s) => s.is_active)
              .map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="route_id">Route</Label>
          <Select id="route_id" {...register("route_id")}>
            <option value="">Any route</option>
            {routes
              .filter((r) => r.is_active)
              .map((r) => (
                <option key={r.id} value={r.id}>
                  {routeLabel(r.id)}
                </option>
              ))}
          </Select>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="rate">Rate</Label>
            <Input
              id="rate"
              type="number"
              step="0.01"
              min="0"
              {...register("rate", { required: true })}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="currency">Currency</Label>
            <Input id="currency" {...register("currency")} />
          </div>
        </div>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" {...register("is_active")} /> Active
        </label>
        <ErrorBox error={error} />
        <DialogFooter onClose={onClose} saving={saving} />
      </form>
    </Dialog>
  );
}

// ============================ Truck Types =====================================
function TruckTypesTab({ truckTypes }: { truckTypes: TruckType[] }) {
  const [open, setOpen] = useState(false);
  const [edit, setEdit] = useState<TruckType | undefined>(undefined);
  const router = useRouter();
  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">
        Physical vehicle types used by Fleet trucks and dispatch (separate from
        Service Types, which drive client pricing).
      </p>
      <div className="flex justify-end">
        <Button
          onClick={() => {
            setEdit(undefined);
            setOpen(true);
          }}
        >
          <Plus className="mr-1.5 h-4 w-4" /> Add truck type
        </Button>
      </div>
      <Table>
        <THead>
          <TR>
            <TH>Name</TH>
            <TH>Code</TH>
            <TH>Description</TH>
            <TH>Active</TH>
            <TH className="text-right">Actions</TH>
          </TR>
        </THead>
        <TBody>
          {truckTypes.length === 0 ? (
            <TR>
              <TD colSpan={5} className="text-center text-muted-foreground">
                No truck types yet.
              </TD>
            </TR>
          ) : (
            truckTypes.map((t) => (
              <TR key={t.id}>
                <TD className="font-medium">{t.name}</TD>
                <TD>{t.code ?? "—"}</TD>
                <TD>{t.description ?? "—"}</TD>
                <TD>
                  <YesNo value={t.is_active} />
                </TD>
                <TD className="text-right">
                  <RowActions
                    onEdit={() => {
                      setEdit(t);
                      setOpen(true);
                    }}
                    onDelete={async () => {
                      await deleteTruckType(t.id);
                      router.refresh();
                    }}
                    label={t.name}
                  />
                </TD>
              </TR>
            ))
          )}
        </TBody>
      </Table>
      {open && <TruckTypeDialog truckType={edit} onClose={() => setOpen(false)} />}
    </div>
  );
}

function TruckTypeDialog({
  truckType,
  onClose,
}: {
  truckType?: TruckType;
  onClose: () => void;
}) {
  const router = useRouter();
  const { register, handleSubmit } = useForm({
    defaultValues: {
      name: truckType?.name ?? "",
      code: truckType?.code ?? "",
      description: truckType?.description ?? "",
      is_active: truckType?.is_active ?? true,
    },
  });
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const onSubmit = handleSubmit(async (values) => {
    setSaving(true);
    setError(null);
    const res = await saveTruckType(values, truckType?.id);
    setSaving(false);
    if (res.error) return setError(res.error);
    onClose();
    router.refresh();
  });
  return (
    <Dialog
      open
      onClose={onClose}
      title={truckType ? "Edit truck type" : "New truck type"}
    >
      <form onSubmit={onSubmit} className="space-y-3">
        <div className="space-y-1.5">
          <Label htmlFor="name">Name</Label>
          <Input id="name" {...register("name", { required: true })} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="code">Code</Label>
          <Input id="code" {...register("code")} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="description">Description</Label>
          <Input id="description" {...register("description")} />
        </div>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" {...register("is_active")} /> Active
        </label>
        <ErrorBox error={error} />
        <DialogFooter onClose={onClose} saving={saving} />
      </form>
    </Dialog>
  );
}

// ============================ Shared bits =====================================
function DialogFooter({
  onClose,
  saving,
}: {
  onClose: () => void;
  saving: boolean;
}) {
  return (
    <div className="flex justify-end gap-2 pt-1">
      <Button type="button" variant="outline" onClick={onClose}>
        Cancel
      </Button>
      <Button type="submit" disabled={saving}>
        {saving ? "Saving…" : "Save"}
      </Button>
    </div>
  );
}

function RowActions({
  onEdit,
  onDelete,
  label,
}: {
  onEdit: () => void;
  onDelete: () => void | Promise<void>;
  label: string;
}) {
  return (
    <div className="flex justify-end gap-1">
      <Button variant="ghost" size="sm" onClick={onEdit} aria-label="Edit">
        <Pencil className="h-4 w-4" />
      </Button>
      <Button
        variant="ghost"
        size="sm"
        aria-label="Delete"
        onClick={() => {
          if (confirm(`Remove ${label}?`)) onDelete();
        }}
      >
        <Trash2 className="h-4 w-4 text-destructive" />
      </Button>
    </div>
  );
}
