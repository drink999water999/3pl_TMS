"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Truck as TruckIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Dialog } from "@/components/ui/dialog";
import { Card } from "@/components/ui/card";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/table";
import { SearchableSelect } from "@/components/app/searchable-select";
import {
  DataFilter,
  matchesFilters,
  ANY_COLUMN,
  type ActiveFilter,
  type FilterColumn,
} from "@/components/app/data-filter";
import { formatDate, dispatchStatusVariant } from "@/lib/format";
import { createDispatch } from "./actions";

const DISPATCH_FILTER_COLUMNS: FilterColumn[] = [
  { key: "request_no", label: "Request #" },
  { key: "client", label: "Client" },
  { key: "who", label: "Assigned to" },
  { key: "route", label: "Route" },
  { key: "status", label: "Status" },
];
const boardFilterValue = (r: BoardItem, column: string) => {
  if (column === ANY_COLUMN)
    return DISPATCH_FILTER_COLUMNS.map(
      (c) => String((r as Record<string, unknown>)[c.key] ?? ""),
    ).join(" ");
  return String((r as Record<string, unknown>)[column] ?? "");
};

type Awaiting = {
  id: string;
  request_no: string;
  client: string;
  route: string;
  serviceType: string;
  deliveryDate: string | null;
  routeId: string | null;
  serviceTypeId: string | null;
  sellingPrice: number | null;
};
type BoardItem = {
  id: string;
  request_no: string;
  client: string;
  status: string;
  hasIssue: boolean;
  who: string;
  route: string;
};
type Truck = {
  id: string;
  label: string;
  service_type_id: string | null;
  service_type: string;
  default_driver_id: string | null;
};
type Lookup = { id: string; name: string };
type SupplierType = { supplier_id: string; service_type_id: string };
type SupplierTruck = {
  id: string;
  supplier_id: string;
  plate_number: string;
  driver_name: string | null;
  driver_id_no: string | null;
  driver_mobile: string | null;
  service_type_id: string | null;
};
type SupplierRate = {
  supplier_id: string;
  route_id: string | null;
  service_type_id: string | null;
  rate: number;
};

export function DispatchBoard({
  awaiting,
  dispatches,
  trucks,
  drivers,
  suppliers,
  serviceTypes,
  supplierTypes,
  supplierTrucks,
  supplierRates,
}: {
  awaiting: Awaiting[];
  dispatches: BoardItem[];
  trucks: Truck[];
  drivers: Lookup[];
  suppliers: Lookup[];
  serviceTypes: Lookup[];
  supplierTypes: SupplierType[];
  supplierTrucks: SupplierTruck[];
  supplierRates: SupplierRate[];
}) {
  const [target, setTarget] = useState<Awaiting | null>(null);
  const [dispFilters, setDispFilters] = useState<ActiveFilter[]>([]);
  const [dispStatus, setDispStatus] = useState("");

  const filteredDispatches = dispatches.filter((d) => {
    if (dispStatus && d.status !== dispStatus) return false;
    return matchesFilters(d, dispFilters, boardFilterValue);
  });
  const DISPATCH_STATUSES = [
    "Assigned",
    "Dispatched",
    "Picked Up",
    "In Transit",
    "Delivered",
    "Confirmed",
  ];

  return (
    <div className="space-y-6">
      <section>
        <h2 className="mb-3 text-sm font-semibold text-brand-navy">
          Awaiting dispatch
          <span className="ml-2 text-xs text-muted-foreground">
            {awaiting.length}
          </span>
        </h2>
        <Card className="p-0">
          <Table>
            <THead>
              <TR>
                <TH>Request #</TH>
                <TH>Client</TH>
                <TH>Route</TH>
                <TH>Service type</TH>
                <TH>Delivery date</TH>
                <TH></TH>
              </TR>
            </THead>
            <TBody>
              {awaiting.length === 0 ? (
                <TR>
                  <TD colSpan={6} className="text-center text-muted-foreground">
                    No approved requests waiting. Approve a request first.
                  </TD>
                </TR>
              ) : (
                awaiting.map((r) => (
                  <TR key={r.id}>
                    <TD className="font-medium">{r.request_no}</TD>
                    <TD>{r.client}</TD>
                    <TD className="text-sm text-muted-foreground">{r.route}</TD>
                    <TD>{r.serviceType}</TD>
                    <TD>{formatDate(r.deliveryDate)}</TD>
                    <TD className="text-right">
                      <Button size="sm" onClick={() => setTarget(r)}>
                        <TruckIcon className="h-4 w-4" /> Dispatch
                      </Button>
                    </TD>
                  </TR>
                ))
              )}
            </TBody>
          </Table>
        </Card>
      </section>

      <section>
        <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-sm font-semibold text-brand-navy">
            Dispatches
            <span className="ml-2 text-xs text-muted-foreground">
              {filteredDispatches.length}
            </span>
          </h2>
          <Select
            value={dispStatus}
            onChange={(e) => setDispStatus(e.target.value)}
            className="sm:w-40"
          >
            <option value="">All statuses</option>
            {DISPATCH_STATUSES.map((st) => (
              <option key={st} value={st}>
                {st}
              </option>
            ))}
          </Select>
        </div>
        <div className="mb-3">
          <DataFilter
            columns={DISPATCH_FILTER_COLUMNS}
            filters={dispFilters}
            onChange={setDispFilters}
          />
        </div>
        <Card className="p-0">
          <Table>
            <THead>
              <TR>
                <TH>Request #</TH>
                <TH>Client</TH>
                <TH>Assigned to</TH>
                <TH>Status</TH>
              </TR>
            </THead>
            <TBody>
              {filteredDispatches.length === 0 ? (
                <TR>
                  <TD colSpan={4} className="text-center text-muted-foreground">
                    No matching dispatches.
                  </TD>
                </TR>
              ) : (
                filteredDispatches.map((d) => (
                  <TR key={d.id}>
                    <TD>
                      <Link
                        href={`/dispatch/${d.id}`}
                        className="font-medium text-brand-navy hover:underline"
                      >
                        {d.request_no}
                      </Link>
                    </TD>
                    <TD>{d.client}</TD>
                    <TD className="text-sm text-muted-foreground">{d.who}</TD>
                    <TD>
                      <div className="flex items-center gap-2">
                        <Badge variant={dispatchStatusVariant(d.status)}>
                          {d.status}
                        </Badge>
                        {d.hasIssue ? (
                          <Badge variant="danger">Issue</Badge>
                        ) : null}
                      </div>
                    </TD>
                  </TR>
                ))
              )}
            </TBody>
          </Table>
        </Card>
      </section>

      {target ? (
        <DispatchDialog
          request={target}
          trucks={trucks}
          drivers={drivers}
          suppliers={suppliers}
          serviceTypes={serviceTypes}
          supplierTypes={supplierTypes}
          supplierTrucks={supplierTrucks}
          supplierRates={supplierRates}
          onClose={() => setTarget(null)}
        />
      ) : null}
    </div>
  );
}

function DispatchDialog({
  request,
  trucks,
  drivers,
  suppliers,
  serviceTypes,
  supplierTypes,
  supplierTrucks,
  supplierRates,
  onClose,
}: {
  request: Awaiting;
  trucks: Truck[];
  drivers: Lookup[];
  suppliers: Lookup[];
  serviceTypes: Lookup[];
  supplierTypes: SupplierType[];
  supplierTrucks: SupplierTruck[];
  supplierRates: SupplierRate[];
  onClose: () => void;
}) {
  const router = useRouter();
  const [assignment, setAssignment] = useState<"own" | "outsourced">("own");
  const [truckId, setTruckId] = useState<string | null>(null);
  const [driverId, setDriverId] = useState<string | null>(null);
  const [supplierId, setSupplierId] = useState<string | null>(null);
  const [supplierTruckId, setSupplierTruckId] = useState("");
  const [supplierPlate, setSupplierPlate] = useState("");
  const [outDriverName, setOutDriverName] = useState("");
  const [outDriverId, setOutDriverId] = useState("");
  const [serviceTypeId, setServiceTypeId] = useState("");
  const [carrierCost, setCarrierCost] = useState("");
  const [customerCharge, setCustomerCharge] = useState(
    request.sellingPrice != null ? request.sellingPrice.toString() : "",
  );
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedTruck = trucks.find((t) => t.id === truckId);
  const supplierPlates = useMemo(
    () => supplierTrucks.filter((t) => t.supplier_id === supplierId),
    [supplierTrucks, supplierId],
  );

  const onTruckChange = (id: string | null) => {
    setTruckId(id);
    const t = trucks.find((x) => x.id === id);
    if (t?.default_driver_id && !driverId) setDriverId(t.default_driver_id);
  };

  // Best-match supplier cost for this request's route / service type.
  const matchCarrierCost = (sid: string) => {
    const rates = supplierRates.filter((r) => r.supplier_id === sid);
    const exact = rates.find(
      (r) =>
        r.route_id === request.routeId &&
        r.service_type_id === request.serviceTypeId,
    );
    const byRoute = rates.find((r) => r.route_id === request.routeId);
    const bySvc = rates.find(
      (r) => r.service_type_id === request.serviceTypeId,
    );
    return exact ?? byRoute ?? bySvc ?? null;
  };

  const onSupplierChange = (id: string | null) => {
    setSupplierId(id);
    setSupplierTruckId("");
    setSupplierPlate("");
    setOutDriverName("");
    setOutDriverId("");
    setServiceTypeId("");
    const match = id ? matchCarrierCost(id) : null;
    setCarrierCost(match ? match.rate.toString() : "");
  };

  // Selecting a plate auto-fills driver + service type (all editable).
  const onPlateChange = (stId: string) => {
    setSupplierTruckId(stId);
    const t = supplierPlates.find((x) => x.id === stId);
    if (t) {
      setSupplierPlate(t.plate_number);
      setOutDriverName(t.driver_name ?? "");
      setOutDriverId(t.driver_id_no ?? "");
      setServiceTypeId(t.service_type_id ?? "");
    }
  };

  // Constrain outsourced service types to what the supplier offers (if any).
  const offered = supplierId
    ? supplierTypes
        .filter((s) => s.supplier_id === supplierId)
        .map((s) => s.service_type_id)
    : [];
  const typeOptions =
    offered.length > 0
      ? serviceTypes.filter((t) => offered.includes(t.id))
      : serviceTypes;

  const submit = async () => {
    setError(null);
    setSaving(true);
    const res = await createDispatch({
      request_id: request.id,
      assignment_type: assignment,
      truck_id: assignment === "own" ? truckId : null,
      driver_id: assignment === "own" ? driverId : null,
      supplier_id: assignment === "outsourced" ? supplierId : null,
      supplier_truck: assignment === "outsourced" ? supplierPlate : null,
      supplier_truck_id:
        assignment === "outsourced" ? supplierTruckId || null : null,
      outsourced_driver_name:
        assignment === "outsourced" ? outDriverName : null,
      outsourced_driver_id: assignment === "outsourced" ? outDriverId : null,
      service_type_id: assignment === "outsourced" ? serviceTypeId : null,
      carrier_cost: assignment === "outsourced" ? carrierCost : "",
      customer_charge: customerCharge,
      notes,
    });
    setSaving(false);
    if (res.error) return setError(res.error);
    if (res.id) router.push(`/dispatch/${res.id}`);
  };

  return (
    <Dialog
      open
      onClose={onClose}
      title={`Dispatch ${request.request_no}`}
      description={`${request.client} · ${request.route}`}
    >
      <div className="space-y-4">
        <div className="flex gap-1 rounded-lg border bg-card p-1">
          {(["own", "outsourced"] as const).map((a) => (
            <button
              key={a}
              type="button"
              onClick={() => setAssignment(a)}
              className={
                "flex-1 rounded-md px-3 py-1.5 text-sm font-medium transition-colors " +
                (assignment === a
                  ? "bg-brand-navy text-white"
                  : "text-muted-foreground hover:bg-muted")
              }
            >
              {a === "own" ? "Own fleet" : "Outsourced"}
            </button>
          ))}
        </div>

        {assignment === "own" ? (
          <>
            <div className="space-y-1.5">
              <Label>Truck</Label>
              <SearchableSelect
                options={trucks.map((t) => ({
                  value: t.id,
                  label: t.label,
                  hint: t.service_type,
                }))}
                value={truckId}
                onChange={onTruckChange}
                placeholder="Select a truck…"
              />
              {selectedTruck ? (
                <p className="text-xs text-muted-foreground">
                  Service type: {selectedTruck.service_type}
                </p>
              ) : null}
            </div>
            <div className="space-y-1.5">
              <Label>Driver</Label>
              <SearchableSelect
                options={drivers.map((d) => ({ value: d.id, label: d.name }))}
                value={driverId}
                onChange={setDriverId}
                placeholder="Select a driver…"
              />
            </div>
          </>
        ) : (
          <>
            <div className="space-y-1.5">
              <Label>Supplier</Label>
              <SearchableSelect
                options={suppliers.map((s) => ({ value: s.id, label: s.name }))}
                value={supplierId}
                onChange={onSupplierChange}
                placeholder="Select a supplier…"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Truck plate</Label>
              <Select
                value={supplierTruckId}
                onChange={(e) => onPlateChange(e.target.value)}
                disabled={!supplierId}
              >
                <option value="">
                  {supplierId
                    ? supplierPlates.length > 0
                      ? "— Select a plate —"
                      : "No trucks on file for this supplier"
                    : "Pick a supplier first"}
                </option>
                {supplierPlates.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.plate_number}
                    {t.driver_name ? ` · ${t.driver_name}` : ""}
                  </option>
                ))}
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Driver name</Label>
                <Input
                  value={outDriverName}
                  onChange={(e) => setOutDriverName(e.target.value)}
                  placeholder="Driver name"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Driver ID</Label>
                <Input
                  value={outDriverId}
                  onChange={(e) => setOutDriverId(e.target.value)}
                  placeholder="Driver ID"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Service type</Label>
              <Select
                value={serviceTypeId}
                onChange={(e) => setServiceTypeId(e.target.value)}
              >
                <option value="">— Select —</option>
                {typeOptions.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Carrier cost</Label>
              <Input
                type="number"
                step="0.01"
                min="0"
                value={carrierCost}
                onChange={(e) => setCarrierCost(e.target.value)}
                placeholder="Auto-filled from the supplier rate (editable)"
              />
              <p className="text-xs text-muted-foreground">
                Auto-filled from the supplier&apos;s cost list for this route /
                service. You can override it.
              </p>
            </div>
          </>
        )}

        <div className="space-y-1.5">
          <Label>Customer charge</Label>
          <Input
            type="number"
            step="0.01"
            min="0"
            value={customerCharge}
            onChange={(e) => setCustomerCharge(e.target.value)}
            placeholder="Auto-filled from the request (editable)"
          />
          <p className="text-xs text-muted-foreground">
            What the customer is billed for this trip. Pre-filled from the
            request&apos;s selling price; overriding here affects only this trip.
          </p>
        </div>

        <div className="space-y-1.5">
          <Label>Notes</Label>
          <Textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Optional notes for this dispatch"
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
          <Button type="button" disabled={saving} onClick={submit}>
            {saving ? "Creating…" : "Create dispatch"}
          </Button>
        </div>
      </div>
    </Dialog>
  );
}
