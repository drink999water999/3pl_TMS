"use client";

import { useState } from "react";
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
import { formatDate, dispatchStatusVariant } from "@/lib/format";
import { createDispatch } from "./actions";

type Awaiting = {
  id: string;
  request_no: string;
  client: string;
  route: string;
  truckType: string;
  deliveryDate: string | null;
};
type BoardItem = {
  id: string;
  request_no: string;
  client: string;
  status: string;
  hasIssue: boolean;
  who: string;
};
type Truck = {
  id: string;
  label: string;
  truck_type_id: string | null;
  truck_type: string;
  default_driver_id: string | null;
};
type Lookup = { id: string; name: string };
type SupplierType = { supplier_id: string; truck_type_id: string };

export function DispatchBoard({
  awaiting,
  dispatches,
  trucks,
  drivers,
  suppliers,
  truckTypes,
  supplierTypes,
}: {
  awaiting: Awaiting[];
  dispatches: BoardItem[];
  trucks: Truck[];
  drivers: Lookup[];
  suppliers: Lookup[];
  truckTypes: Lookup[];
  supplierTypes: SupplierType[];
}) {
  const [target, setTarget] = useState<Awaiting | null>(null);

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
                <TH>Truck type</TH>
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
                    <TD>{r.truckType}</TD>
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
        <h2 className="mb-3 text-sm font-semibold text-brand-navy">
          Dispatches
          <span className="ml-2 text-xs text-muted-foreground">
            {dispatches.length}
          </span>
        </h2>
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
              {dispatches.length === 0 ? (
                <TR>
                  <TD colSpan={4} className="text-center text-muted-foreground">
                    Nothing in transit.
                  </TD>
                </TR>
              ) : (
                dispatches.map((d) => (
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
          truckTypes={truckTypes}
          supplierTypes={supplierTypes}
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
  truckTypes,
  supplierTypes,
  onClose,
}: {
  request: Awaiting;
  trucks: Truck[];
  drivers: Lookup[];
  suppliers: Lookup[];
  truckTypes: Lookup[];
  supplierTypes: SupplierType[];
  onClose: () => void;
}) {
  const router = useRouter();
  const [assignment, setAssignment] = useState<"own" | "outsourced">("own");
  const [truckId, setTruckId] = useState<string | null>(null);
  const [driverId, setDriverId] = useState<string | null>(null);
  const [supplierId, setSupplierId] = useState<string | null>(null);
  const [supplierTruck, setSupplierTruck] = useState("");
  const [truckTypeId, setTruckTypeId] = useState("");
  const [carrierCost, setCarrierCost] = useState("");
  const [customerCharge, setCustomerCharge] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedTruck = trucks.find((t) => t.id === truckId);

  const onTruckChange = (id: string | null) => {
    setTruckId(id);
    const t = trucks.find((x) => x.id === id);
    if (t?.default_driver_id && !driverId) setDriverId(t.default_driver_id);
  };

  const onSupplierChange = (id: string | null) => {
    setSupplierId(id);
    setTruckTypeId("");
  };

  // Constrain outsourced truck types to what the supplier offers (if any).
  const offered = supplierId
    ? supplierTypes
        .filter((s) => s.supplier_id === supplierId)
        .map((s) => s.truck_type_id)
    : [];
  const typeOptions =
    offered.length > 0
      ? truckTypes.filter((t) => offered.includes(t.id))
      : truckTypes;

  const submit = async () => {
    setError(null);
    setSaving(true);
    const res = await createDispatch({
      request_id: request.id,
      assignment_type: assignment,
      truck_id: assignment === "own" ? truckId : null,
      driver_id: assignment === "own" ? driverId : null,
      supplier_id: assignment === "outsourced" ? supplierId : null,
      supplier_truck: assignment === "outsourced" ? supplierTruck : null,
      truck_type_id: assignment === "outsourced" ? truckTypeId : null,
      carrier_cost: carrierCost,
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
                  hint: t.truck_type,
                }))}
                value={truckId}
                onChange={onTruckChange}
                placeholder="Select a truck…"
              />
              {selectedTruck ? (
                <p className="text-xs text-muted-foreground">
                  Truck type: {selectedTruck.truck_type}
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
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Truck type</Label>
                <Select
                  value={truckTypeId}
                  onChange={(e) => setTruckTypeId(e.target.value)}
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
                <Label>Supplier truck / plate</Label>
                <Input
                  value={supplierTruck}
                  onChange={(e) => setSupplierTruck(e.target.value)}
                  placeholder="Optional"
                />
              </div>
            </div>
          </>
        )}

        <div className="space-y-1.5">
          <Label>Carrier cost</Label>
          <Input
            type="number"
            step="0.01"
            min="0"
            value={carrierCost}
            onChange={(e) => setCarrierCost(e.target.value)}
            placeholder="What you pay the carrier (optional)"
          />
          <p className="text-xs text-muted-foreground">
            Used to compute margin. Leave blank to use the client&apos;s markup
            rule. Admin/finance can also set this later on the waybill.
          </p>
        </div>

        <div className="space-y-1.5">
          <Label>Customer charge</Label>
          <Input
            type="number"
            step="0.01"
            min="0"
            value={customerCharge}
            onChange={(e) => setCustomerCharge(e.target.value)}
            placeholder="Override the client's pricing (optional)"
          />
          <p className="text-xs text-muted-foreground">
            What the customer is billed. Leave blank to auto-price from the
            client&apos;s rate (fixed or per-km).
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
