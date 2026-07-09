import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/app/page-header";
import { ReportsView, type DeliveryRow, type Option } from "./reports-view";

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
    serviceTypesRes,
    locationsRes,
    citiesRes,
    waybillsRes,
    billingRes,
  ] = await Promise.all([
    supabase
      .from("dispatches")
      .select(
        "id, status, truck_id, driver_id, supplier_id, supplier_truck, outsourced_driver_name, service_type_id, request_id, delivered_at, dispatched_at, carrier_cost, created_at",
      ),
    supabase
      .from("transport_requests")
      .select(
        "id, request_no, client_id, pickup_location_id, delivery_location_id, service_type_id, delivery_date, created_at",
      ),
    supabase.from("clients").select("id, name, client_type"),
    supabase.from("trucks").select("id, code, plate_number"),
    supabase.from("drivers").select("id, name"),
    supabase.from("suppliers").select("id, name"),
    supabase.from("service_types").select("id, name"),
    supabase.from("locations").select("id, name, city_id"),
    supabase.from("cities").select("id, name"),
    supabase.from("waybills").select("id, dispatch_id, freight_amount"),
    supabase
      .from("waybill_billing")
      .select("waybill_id, freight_amount, carrier_cost, margin_amount"),
  ]);

  const dispatches = dispatchesRes.data ?? [];
  const reqById = new Map((requestsRes.data ?? []).map((r) => [r.id, r]));
  const clientById = new Map((clientsRes.data ?? []).map((c) => [c.id, c]));
  const truckById = new Map((trucksRes.data ?? []).map((t) => [t.id, t]));
  const driverById = new Map((driversRes.data ?? []).map((d) => [d.id, d]));
  const supplierById = new Map((suppliersRes.data ?? []).map((s) => [s.id, s]));
  const serviceById = new Map(
    (serviceTypesRes.data ?? []).map((s) => [s.id, s.name]),
  );
  const locById = new Map((locationsRes.data ?? []).map((l) => [l.id, l]));
  const cityName = new Map((citiesRes.data ?? []).map((c) => [c.id, c.name]));
  // Authoritative billing (freight / carrier cost / margin) is keyed by waybill;
  // map it back to the dispatch so each delivery row can use it.
  const billingByWaybill = new Map(
    (billingRes.data ?? []).map((b) => [b.waybill_id, b]),
  );
  const billingByDispatch = new Map(
    (waybillsRes.data ?? []).map((w) => [
      w.dispatch_id,
      {
        waybillFreight: w.freight_amount,
        billing: billingByWaybill.get(w.id) ?? null,
      },
    ]),
  );

  // Resolve a location to its city name (falls back to the location name).
  const placeOf = (locId: string | null) => {
    if (!locId) return "—";
    const loc = locById.get(locId);
    if (!loc) return "—";
    const city = loc.city_id ? cityName.get(loc.city_id) : null;
    return city ?? loc.name ?? "—";
  };

  // Build one row per dispatch, denormalised for filtering + display.
  const rows: DeliveryRow[] = dispatches.map((d) => {
    const r = d.request_id ? reqById.get(d.request_id) : undefined;
    const client = r?.client_id ? clientById.get(r.client_id) : undefined;
    const truck = d.truck_id ? truckById.get(d.truck_id) : undefined;
    const serviceTypeId = d.service_type_id ?? r?.service_type_id ?? null;

    // Revenue / cost / margin: prefer the authoritative waybill_billing figures,
    // falling back to the waybill freight + dispatch carrier cost.
    const bill = billingByDispatch.get(d.id);
    const revenue =
      bill?.billing?.freight_amount ?? bill?.waybillFreight ?? 0;
    const cost = bill?.billing?.carrier_cost ?? d.carrier_cost ?? 0;
    const margin = bill?.billing?.margin_amount ?? revenue - cost;
    return {
      dispatchId: d.id,
      requestNo: r?.request_no ?? "—",
      status: d.status,
      orderDate: r?.delivery_date ?? r?.created_at?.slice(0, 10) ?? null,
      deliveredDate: d.delivered_at ? d.delivered_at.slice(0, 10) : null,
      dispatchedDate: d.dispatched_at ? d.dispatched_at.slice(0, 10) : null,
      truckId: d.truck_id ?? null,
      truckLabel: truck
        ? `${truck.code} · ${truck.plate_number}`
        : d.supplier_truck
          ? `${d.supplier_truck} (outsourced)`
          : "Outsourced",
      serviceTypeId,
      serviceType: serviceTypeId ? (serviceById.get(serviceTypeId) ?? "—") : "—",
      from: placeOf(r?.pickup_location_id ?? null),
      to: placeOf(r?.delivery_location_id ?? null),
      clientId: r?.client_id ?? null,
      client: client?.name ?? "—",
      clientType: client?.client_type ?? "Unspecified",
      driverId: d.driver_id ?? null,
      driver: d.driver_id
        ? (driverById.get(d.driver_id)?.name ?? "—")
        : (d.outsourced_driver_name ?? "—"),
      supplierId: d.supplier_id ?? null,
      supplier: d.supplier_id
        ? (supplierById.get(d.supplier_id)?.name ?? "—")
        : "Own fleet",
      revenue,
      cost,
      margin,
    };
  });

  // Filter dropdown options (only values that actually appear).
  const optionsFrom = (
    list: { id: string | null; name: string }[],
  ): Option[] => {
    const seen = new Map<string, string>();
    for (const x of list) if (x.id) seen.set(x.id, x.name);
    return Array.from(seen.entries())
      .map(([value, label]) => ({ value, label }))
      .sort((a, b) => a.label.localeCompare(b.label));
  };

  const truckOptions = optionsFrom(
    rows.map((r) => ({ id: r.truckId, name: r.truckLabel })),
  );
  const driverOptions = optionsFrom(
    rows.map((r) => ({ id: r.driverId, name: r.driver })),
  );
  const clientOptions = optionsFrom(
    rows.map((r) => ({ id: r.clientId, name: r.client })),
  );
  const supplierOptions = optionsFrom(
    rows.map((r) => ({ id: r.supplierId, name: r.supplier })),
  );
  const serviceTypeOptions = optionsFrom(
    rows.map((r) => ({ id: r.serviceTypeId, name: r.serviceType })),
  );
  const statusOptions = Array.from(new Set(rows.map((r) => r.status)))
    .sort()
    .map((s) => ({ value: s, label: s }));

  return (
    <div>
      <PageHeader
        title="Reports"
        description="Filter every delivery by date, driver, client, supplier, service type and status. Switch between the detailed log and summary breakdowns, and export any view to CSV."
      />
      <ReportsView
        rows={rows}
        truckOptions={truckOptions}
        driverOptions={driverOptions}
        clientOptions={clientOptions}
        supplierOptions={supplierOptions}
        serviceTypeOptions={serviceTypeOptions}
        statusOptions={statusOptions}
      />
    </div>
  );
}
