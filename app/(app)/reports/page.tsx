import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/app/page-header";
import { ReportsView, type Report } from "./reports-view";

export const metadata = { title: "Reports" };

export default async function ReportsPage() {
  await requireRole(["admin", "operations", "finance"]);
  const supabase = await createClient();

  const [
    dispatchesRes,
    requestsRes,
    clientsRes,
    trucksRes,
    driversRes,
    suppliersRes,
    locationsRes,
    citiesRes,
    waybillsRes,
  ] = await Promise.all([
    supabase
      .from("dispatches")
      .select(
        "id, status, truck_id, driver_id, supplier_id, supplier_truck, outsourced_driver_name, request_id, delivered_at, carrier_cost",
      ),
    supabase
      .from("transport_requests")
      .select("id, client_id, delivery_location_id"),
    supabase.from("clients").select("id, name, client_type"),
    supabase.from("trucks").select("id, code, plate_number"),
    supabase.from("drivers").select("id, name"),
    supabase.from("suppliers").select("id, name"),
    supabase.from("locations").select("id, city_id"),
    supabase.from("cities").select("id, name"),
    supabase.from("waybills").select("dispatch_id, freight_amount"),
  ]);

  const dispatches = dispatchesRes.data ?? [];
  const reqById = new Map((requestsRes.data ?? []).map((r) => [r.id, r]));
  const clientById = new Map((clientsRes.data ?? []).map((c) => [c.id, c]));
  const truckById = new Map((trucksRes.data ?? []).map((t) => [t.id, t]));
  const driverById = new Map((driversRes.data ?? []).map((d) => [d.id, d]));
  const supplierById = new Map((suppliersRes.data ?? []).map((s) => [s.id, s]));
  const locCity = new Map((locationsRes.data ?? []).map((l) => [l.id, l.city_id]));
  const cityName = new Map((citiesRes.data ?? []).map((c) => [c.id, c.name]));
  const freightByDispatch = new Map(
    (waybillsRes.data ?? []).map((w) => [w.dispatch_id, w.freight_amount]),
  );

  // Completed shipments = Delivered or Confirmed.
  const delivered = dispatches.filter(
    (d) => d.status === "Delivered" || d.status === "Confirmed",
  );

  type Agg = { count: number; revenue: number };
  const group = (keyFn: (d: (typeof delivered)[number]) => string) => {
    const m = new Map<string, Agg>();
    for (const d of delivered) {
      const key = keyFn(d) || "—";
      const a = m.get(key) ?? { count: 0, revenue: 0 };
      a.count++;
      a.revenue += freightByDispatch.get(d.id) ?? 0;
      m.set(key, a);
    }
    return Array.from(m.entries())
      .map(([label, a]) => [label, a.count, Math.round(a.revenue)] as (string | number)[])
      .sort((x, y) => Number(y[1]) - Number(x[1]));
  };

  const truckLabel = (d: (typeof delivered)[number]) => {
    if (d.truck_id) {
      const t = truckById.get(d.truck_id);
      return t ? `${t.code} · ${t.plate_number}` : "Own truck";
    }
    return d.supplier_truck ? `${d.supplier_truck} (outsourced)` : "Outsourced";
  };
  const driverLabel = (d: (typeof delivered)[number]) =>
    d.driver_id
      ? driverById.get(d.driver_id)?.name ?? "—"
      : d.outsourced_driver_name ?? "—";
  const clientLabel = (d: (typeof delivered)[number]) => {
    const r = reqById.get(d.request_id);
    return r ? clientById.get(r.client_id)?.name ?? "—" : "—";
  };
  const clientTypeLabel = (d: (typeof delivered)[number]) => {
    const r = reqById.get(d.request_id);
    return (r ? clientById.get(r.client_id)?.client_type : null) ?? "Unspecified";
  };
  const supplierLabel = (d: (typeof delivered)[number]) =>
    d.supplier_id ? supplierById.get(d.supplier_id)?.name ?? "—" : "Own fleet";
  const areaLabel = (d: (typeof delivered)[number]) => {
    const r = reqById.get(d.request_id);
    const cid = r?.delivery_location_id ? locCity.get(r.delivery_location_id) : null;
    return cid ? cityName.get(cid) ?? "—" : "Unassigned";
  };

  // Month closing statement.
  const monthMap = new Map<
    string,
    { count: number; revenue: number; cost: number }
  >();
  for (const d of delivered) {
    if (!d.delivered_at) continue;
    const month = d.delivered_at.slice(0, 7);
    const m = monthMap.get(month) ?? { count: 0, revenue: 0, cost: 0 };
    m.count++;
    m.revenue += freightByDispatch.get(d.id) ?? 0;
    m.cost += d.carrier_cost ?? 0;
    monthMap.set(month, m);
  }
  const monthRows = Array.from(monthMap.entries())
    .sort((a, b) => b[0].localeCompare(a[0]))
    .map(
      ([month, m]) =>
        [
          month,
          m.count,
          Math.round(m.revenue),
          Math.round(m.cost),
          Math.round(m.revenue - m.cost),
        ] as (string | number)[],
    );

  const reports: Report[] = [
    { id: "truck", label: "Deliveries per truck", columns: ["Truck", "Deliveries", "Revenue"], rows: group(truckLabel) },
    { id: "driver", label: "Deliveries per driver", columns: ["Driver", "Deliveries", "Revenue"], rows: group(driverLabel) },
    { id: "client", label: "Deliveries per client", columns: ["Client", "Deliveries", "Revenue"], rows: group(clientLabel) },
    { id: "supplier", label: "Deliveries per supplier", columns: ["Supplier", "Deliveries", "Revenue"], rows: group(supplierLabel) },
    { id: "clientType", label: "Deliveries per client type", columns: ["Client type", "Deliveries", "Revenue"], rows: group(clientTypeLabel) },
    { id: "area", label: "Deliveries per area", columns: ["Area / city", "Deliveries", "Revenue"], rows: group(areaLabel) },
    {
      id: "month",
      label: "Month closing statement",
      columns: ["Month", "Deliveries", "Revenue", "Carrier cost", "Margin"],
      rows: monthRows,
    },
  ];

  return (
    <div>
      <PageHeader
        title="Reports"
        description="Delivery performance and month-end summaries. Export any view to CSV."
      />
      <ReportsView reports={reports} />
    </div>
  );
}
