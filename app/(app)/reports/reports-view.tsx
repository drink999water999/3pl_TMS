"use client";

import { useMemo, useState } from "react";
import { Download, RotateCcw, Filter } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Select } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/table";
import { dispatchStatusVariant } from "@/lib/format";
import {
  DataFilter,
  matchesFilters,
  ANY_COLUMN,
  type ActiveFilter,
  type FilterColumn,
} from "@/components/app/data-filter";

export type Option = { value: string; label: string };

export type DeliveryRow = {
  dispatchId: string;
  requestNo: string;
  status: string;
  orderDate: string | null;
  deliveredDate: string | null;
  dispatchedDate: string | null;
  truckId: string | null;
  truckLabel: string;
  serviceTypeId: string | null;
  serviceType: string;
  from: string;
  to: string;
  clientId: string | null;
  client: string;
  clientType: string;
  driverId: string | null;
  driver: string;
  supplierId: string | null;
  supplier: string;
  revenue: number;
  cost: number;
  margin: number;
};

type DateBasis = "deliveredDate" | "orderDate" | "dispatchedDate";

const VIEWS = [
  { id: "detail", label: "Detailed log" },
  { id: "truck", label: "Per truck" },
  { id: "driver", label: "Per driver" },
  { id: "client", label: "Per client" },
  { id: "supplier", label: "Per supplier" },
  { id: "service", label: "Per service type" },
  { id: "area", label: "Per area (to)" },
  { id: "clientType", label: "Per client type" },
  { id: "month", label: "Month closing" },
] as const;
type ViewId = (typeof VIEWS)[number]["id"];

const money = (n: number) => new Intl.NumberFormat().format(Math.round(n));

// Columns available to the free-form multi-column filter on the detailed log.
const FILTER_COLUMNS: FilterColumn[] = [
  { key: "requestNo", label: "Request #" },
  { key: "truckLabel", label: "Truck" },
  { key: "serviceType", label: "Service type" },
  { key: "from", label: "From (pickup city)" },
  { key: "to", label: "To (drop city)" },
  { key: "client", label: "Client" },
  { key: "driver", label: "Driver" },
  { key: "supplier", label: "Supplier" },
  { key: "status", label: "Status" },
];

const rowFilterValue = (r: DeliveryRow, column: string) => {
  if (column === ANY_COLUMN)
    return FILTER_COLUMNS.map((c) => String((r as Record<string, unknown>)[c.key] ?? "")).join(" ");
  return String((r as Record<string, unknown>)[column] ?? "");
};

const distinct = (vals: string[]): Option[] =>
  Array.from(new Set(vals.filter((v) => v && v !== "—")))
    .sort((a, b) => a.localeCompare(b))
    .map((v) => ({ value: v, label: v }));

export function ReportsView({
  rows,
  truckOptions,
  driverOptions,
  clientOptions,
  supplierOptions,
  serviceTypeOptions,
  statusOptions,
}: {
  rows: DeliveryRow[];
  truckOptions: Option[];
  driverOptions: Option[];
  clientOptions: Option[];
  supplierOptions: Option[];
  serviceTypeOptions: Option[];
  statusOptions: Option[];
}) {
  const [view, setView] = useState<ViewId>("detail");
  const [dateBasis, setDateBasis] = useState<DateBasis>("deliveredDate");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [truck, setTruck] = useState("");
  const [driver, setDriver] = useState("");
  const [client, setClient] = useState("");
  const [supplier, setSupplier] = useState("");
  const [serviceType, setServiceType] = useState("");
  const [status, setStatus] = useState("");
  const [fromCity, setFromCity] = useState("");
  const [toCity, setToCity] = useState("");
  const [colFilters, setColFilters] = useState<ActiveFilter[]>([]);

  const fromCityOptions = useMemo(() => distinct(rows.map((r) => r.from)), [rows]);
  const toCityOptions = useMemo(() => distinct(rows.map((r) => r.to)), [rows]);

  const filtered = useMemo(() => {
    return rows.filter((r) => {
      const d = r[dateBasis];
      if (from && (!d || d < from)) return false;
      if (to && (!d || d > to)) return false;
      if (truck && r.truckId !== truck) return false;
      if (driver && r.driverId !== driver) return false;
      if (client && r.clientId !== client) return false;
      if (supplier && r.supplierId !== supplier) return false;
      if (serviceType && r.serviceTypeId !== serviceType) return false;
      if (status && r.status !== status) return false;
      if (fromCity && r.from !== fromCity) return false;
      if (toCity && r.to !== toCity) return false;
      if (!matchesFilters(r, colFilters, rowFilterValue)) return false;
      return true;
    });
  }, [
    rows,
    dateBasis,
    from,
    to,
    truck,
    driver,
    client,
    supplier,
    serviceType,
    status,
    fromCity,
    toCity,
    colFilters,
  ]);

  const kpis = useMemo(() => {
    let revenue = 0;
    let cost = 0;
    let margin = 0;
    for (const r of filtered) {
      revenue += r.revenue;
      cost += r.cost;
      margin += r.margin;
    }
    return {
      count: filtered.length,
      revenue,
      cost,
      margin,
    };
  }, [filtered]);

  const hasFilters =
    !!from ||
    !!to ||
    !!truck ||
    !!driver ||
    !!client ||
    !!supplier ||
    !!serviceType ||
    !!status ||
    !!fromCity ||
    !!toCity ||
    colFilters.length > 0;

  const reset = () => {
    setFrom("");
    setTo("");
    setTruck("");
    setDriver("");
    setClient("");
    setSupplier("");
    setServiceType("");
    setStatus("");
    setFromCity("");
    setToCity("");
    setColFilters([]);
  };

  // Build the table currently displayed (detail or a summary) for render + CSV.
  const table = useMemo(
    () => buildTable(view, filtered),
    [view, filtered],
  );

  const exportCsv = () => {
    const esc = (v: string | number) => {
      const s = String(v ?? "");
      return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    };
    const lines = [
      table.columns.map(esc).join(","),
      ...table.rows.map((row) => row.cells.map(esc).join(",")),
    ];
    const blob = new Blob([lines.join("\n")], {
      type: "text/csv;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${view}-report.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-4">
      {/* Filter bar */}
      <Card className="space-y-3 p-4">
        <div className="flex items-center gap-2 text-sm font-semibold text-brand-navy">
          <Filter className="h-4 w-4" /> Filters
        </div>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
          <Field label="Date basis">
            <Select
              value={dateBasis}
              onChange={(e) => setDateBasis(e.target.value as DateBasis)}
            >
              <option value="deliveredDate">Delivered date</option>
              <option value="orderDate">Order date</option>
              <option value="dispatchedDate">Dispatched date</option>
            </Select>
          </Field>
          <Field label="From">
            <Input
              type="date"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
            />
          </Field>
          <Field label="To">
            <Input
              type="date"
              value={to}
              onChange={(e) => setTo(e.target.value)}
            />
          </Field>
          <Field label="Truck code">
            <Select value={truck} onChange={(e) => setTruck(e.target.value)}>
              <option value="">All trucks</option>
              {truckOptions.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Driver">
            <Select value={driver} onChange={(e) => setDriver(e.target.value)}>
              <option value="">All drivers</option>
              {driverOptions.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Client">
            <Select value={client} onChange={(e) => setClient(e.target.value)}>
              <option value="">All clients</option>
              {clientOptions.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Supplier">
            <Select
              value={supplier}
              onChange={(e) => setSupplier(e.target.value)}
            >
              <option value="">All suppliers</option>
              {supplierOptions.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Service type">
            <Select
              value={serviceType}
              onChange={(e) => setServiceType(e.target.value)}
            >
              <option value="">All service types</option>
              {serviceTypeOptions.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Status">
            <Select value={status} onChange={(e) => setStatus(e.target.value)}>
              <option value="">All statuses</option>
              {statusOptions.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Pickup city">
            <Select value={fromCity} onChange={(e) => setFromCity(e.target.value)}>
              <option value="">All pickup cities</option>
              {fromCityOptions.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Drop city">
            <Select value={toCity} onChange={(e) => setToCity(e.target.value)}>
              <option value="">All drop cities</option>
              {toCityOptions.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </Select>
          </Field>
          <div className="flex items-end">
            <Button
              variant="outline"
              onClick={reset}
              disabled={!hasFilters}
              className="w-full"
            >
              <RotateCcw className="h-4 w-4" /> Reset
            </Button>
          </div>
        </div>

        {/* Free-form multi-column filter (add as many as you like) */}
        <div className="border-t pt-3">
          <DataFilter
            columns={FILTER_COLUMNS}
            filters={colFilters}
            onChange={setColFilters}
          />
        </div>
      </Card>

      {/* KPI summary */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi label="Deliveries" value={money(kpis.count)} />
        <Kpi label="Revenue" value={`SAR ${money(kpis.revenue)}`} />
        <Kpi label="Carrier cost" value={`SAR ${money(kpis.cost)}`} />
        <Kpi label="Margin" value={`SAR ${money(kpis.margin)}`} />
      </div>

      {/* View switcher + export */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <Select
          value={view}
          onChange={(e) => setView(e.target.value as ViewId)}
          className="sm:w-64"
        >
          {VIEWS.map((v) => (
            <option key={v.id} value={v.id}>
              {v.label}
            </option>
          ))}
        </Select>
        <Button variant="outline" onClick={exportCsv}>
          <Download className="h-4 w-4" /> Export CSV
        </Button>
      </div>

      {/* Table */}
      <Card className="p-0">
        <div className="overflow-x-auto">
          <Table>
            <THead>
              <TR>
                {table.columns.map((c, i) => (
                  <TH key={c} className={i === 0 ? "" : "text-right"}>
                    {c}
                  </TH>
                ))}
              </TR>
            </THead>
            <TBody>
              {table.rows.length === 0 ? (
                <TR>
                  <TD
                    colSpan={table.columns.length}
                    className="text-center text-muted-foreground"
                  >
                    No deliveries match these filters.
                  </TD>
                </TR>
              ) : (
                table.rows.map((row) => (
                  <TR key={row.key}>
                    {row.cells.map((cell, ci) => (
                      <TD
                        key={ci}
                        className={ci === 0 ? "font-medium" : "text-right"}
                      >
                        {row.statusCell && ci === row.statusCell.index ? (
                          <Badge variant={dispatchStatusVariant(String(cell))}>
                            {cell}
                          </Badge>
                        ) : (
                          cell
                        )}
                      </TD>
                    ))}
                  </TR>
                ))
              )}
            </TBody>
          </Table>
        </div>
      </Card>
      <p className="text-xs text-muted-foreground">
        Showing {table.rows.length}{" "}
        {view === "detail" ? "deliveries" : "groups"} of {rows.length} total
        dispatches.
      </p>
    </div>
  );
}

// ---------------------------------------------------------------------------

type BuiltRow = {
  key: string;
  cells: (string | number)[];
  statusCell?: { index: number };
};
type BuiltTable = { columns: string[]; rows: BuiltRow[] };

function buildTable(view: ViewId, rows: DeliveryRow[]): BuiltTable {
  if (view === "detail") {
    return {
      columns: [
        "Request #",
        "Truck",
        "Service",
        "From",
        "To",
        "Client",
        "Driver",
        "Supplier",
        "Status",
        "Order date",
        "Delivered",
        "Revenue",
      ],
      rows: rows
        .slice()
        .sort((a, b) =>
          (b.deliveredDate ?? b.orderDate ?? "").localeCompare(
            a.deliveredDate ?? a.orderDate ?? "",
          ),
        )
        .map((r) => ({
          key: r.dispatchId,
          statusCell: { index: 8 },
          cells: [
            r.requestNo,
            r.truckLabel,
            r.serviceType,
            r.from,
            r.to,
            r.client,
            r.driver,
            r.supplier,
            r.status,
            r.orderDate ?? "—",
            r.deliveredDate ?? "—",
            money(r.revenue),
          ],
        })),
    };
  }

  // Month closing: revenue / cost / margin by delivered month.
  if (view === "month") {
    const m = new Map<
      string,
      { count: number; rev: number; cost: number; margin: number }
    >();
    for (const r of rows) {
      const month = (r.deliveredDate ?? r.orderDate ?? "").slice(0, 7) || "—";
      const a = m.get(month) ?? { count: 0, rev: 0, cost: 0, margin: 0 };
      a.count++;
      a.rev += r.revenue;
      a.cost += r.cost;
      a.margin += r.margin;
      m.set(month, a);
    }
    return {
      columns: ["Month", "Deliveries", "Revenue", "Carrier cost", "Margin"],
      rows: Array.from(m.entries())
        .sort((a, b) => b[0].localeCompare(a[0]))
        .map(([month, a]) => ({
          key: month,
          cells: [month, a.count, money(a.rev), money(a.cost), money(a.margin)],
        })),
    };
  }

  // Generic "deliveries + revenue" breakdown by a chosen key.
  const keyFns: Record<string, (r: DeliveryRow) => string> = {
    truck: (r) => r.truckLabel,
    driver: (r) => r.driver,
    client: (r) => r.client,
    supplier: (r) => r.supplier,
    service: (r) => r.serviceType,
    area: (r) => r.to,
    clientType: (r) => r.clientType,
  };
  const label: Record<string, string> = {
    truck: "Truck",
    driver: "Driver",
    client: "Client",
    supplier: "Supplier",
    service: "Service type",
    area: "Area (to)",
    clientType: "Client type",
  };
  const keyFn = keyFns[view];
  const m = new Map<string, { count: number; rev: number }>();
  for (const r of rows) {
    const k = keyFn(r) || "—";
    const a = m.get(k) ?? { count: 0, rev: 0 };
    a.count++;
    a.rev += r.revenue;
    m.set(k, a);
  }
  return {
    columns: [label[view], "Deliveries", "Revenue"],
    rows: Array.from(m.entries())
      .sort((a, b) => b[1].count - a[1].count)
      .map(([k, a]) => ({
        key: k,
        cells: [k, a.count, money(a.rev)],
      })),
  };
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}

function Kpi({ label, value }: { label: string; value: string }) {
  return (
    <Card className="p-4">
      <p className="text-xs uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <p className="mt-1 text-2xl font-bold text-brand-navy">{value}</p>
    </Card>
  );
}
