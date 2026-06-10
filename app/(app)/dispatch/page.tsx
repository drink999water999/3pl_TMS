import Link from "next/link";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/app/page-header";
import { RealtimeRefresh } from "@/components/app/realtime-refresh";
import { cn } from "@/lib/utils";
import { DispatchBoard } from "./dispatch-board";

export const metadata = { title: "Dispatch" };

const VIEWS = ["active", "delivered", "all"] as const;
type View = (typeof VIEWS)[number];

export default async function DispatchPage({
  searchParams,
}: {
  searchParams: { view?: string };
}) {
  await requireRole(["admin", "dispatch"]);
  const supabase = await createClient();
  const view: View = VIEWS.includes(searchParams.view as View)
    ? (searchParams.view as View)
    : "active";

  let dispQuery = supabase
    .from("dispatches")
    .select(
      "id, request_id, assignment_type, truck_id, driver_id, supplier_id, supplier_truck, status, has_issue, version",
    );
  if (view === "active") dispQuery = dispQuery.neq("status", "Delivered");
  else if (view === "delivered") dispQuery = dispQuery.eq("status", "Delivered");
  const dispatchesQuery = dispQuery.order("created_at", { ascending: false });

  const [
    approved,
    dispatches,
    requests,
    clients,
    locations,
    trucks,
    drivers,
    suppliers,
    truckTypes,
    supplierTypes,
  ] = await Promise.all([
    supabase
      .from("transport_requests")
      .select(
        "id, request_no, client_id, pickup_location_id, delivery_location_id, truck_type_id, delivery_date",
      )
      .eq("status", "Approved")
      .order("created_at"),
    dispatchesQuery,
    supabase
      .from("transport_requests")
      .select("id, request_no, client_id, pickup_location_id, delivery_location_id"),
    supabase.from("clients").select("id, name"),
    supabase.from("locations").select("id, name"),
    supabase
      .from("trucks")
      .select("id, code, plate_number, truck_type_id, default_driver_id")
      .is("deleted_at", null)
      .eq("is_active", true)
      .order("code"),
    supabase
      .from("drivers")
      .select("id, name")
      .is("deleted_at", null)
      .eq("is_active", true)
      .order("name"),
    supabase
      .from("suppliers")
      .select("id, name")
      .is("deleted_at", null)
      .eq("is_active", true)
      .order("name"),
    supabase
      .from("truck_types")
      .select("id, name")
      .eq("is_active", true)
      .order("name"),
    supabase.from("supplier_truck_types").select("supplier_id, truck_type_id"),
  ]);

  const clientName = (id: string | null) =>
    id ? (clients.data?.find((c) => c.id === id)?.name ?? "—") : "—";
  const locName = (id: string | null) =>
    id ? (locations.data?.find((l) => l.id === id)?.name ?? "—") : "—";
  const typeName = (id: string | null) =>
    id ? (truckTypes.data?.find((t) => t.id === id)?.name ?? "—") : "—";
  const truckLabel = (id: string | null) => {
    const t = trucks.data?.find((x) => x.id === id);
    return t ? `${t.code} · ${t.plate_number}` : "—";
  };
  const driverName = (id: string | null) =>
    id ? (drivers.data?.find((d) => d.id === id)?.name ?? "—") : "—";
  const supplierName = (id: string | null) =>
    id ? (suppliers.data?.find((s) => s.id === id)?.name ?? "—") : "—";
  const reqMap = new Map(
    (requests.data ?? []).map((r) => [r.id, r] as const),
  );

  const awaiting = (approved.data ?? []).map((r) => ({
    id: r.id,
    request_no: r.request_no,
    client: clientName(r.client_id),
    route: `${locName(r.pickup_location_id)} → ${locName(r.delivery_location_id)}`,
    truckType: typeName(r.truck_type_id),
    deliveryDate: r.delivery_date,
  }));

  const board = (dispatches.data ?? []).map((d) => {
    const r = reqMap.get(d.request_id);
    return {
      id: d.id,
      request_no: r?.request_no ?? "—",
      client: clientName(r?.client_id ?? null),
      status: d.status,
      hasIssue: d.has_issue,
      who:
        d.assignment_type === "own"
          ? `${truckLabel(d.truck_id)} · ${driverName(d.driver_id)}`
          : `${supplierName(d.supplier_id)}${d.supplier_truck ? ` · ${d.supplier_truck}` : ""}`,
    };
  });

  const chip = (v: View, label: string) => (
    <Link
      href={v === "active" ? "/dispatch" : `/dispatch?view=${v}`}
      className={cn(
        "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
        view === v
          ? "border-brand-navy bg-brand-navy text-white"
          : "border-input text-muted-foreground hover:bg-muted",
      )}
    >
      {label}
    </Link>
  );

  return (
    <div>
      <RealtimeRefresh table="dispatches" />
      <PageHeader
        title="Dispatch Board"
        description="Assign approved requests to your fleet or a supplier, then drive each shipment to delivery."
      />
      <div className="mb-4 flex flex-wrap gap-1.5">
        {chip("active", "Active")}
        {chip("delivered", "Delivered")}
        {chip("all", "All")}
      </div>
      <DispatchBoard
        awaiting={awaiting}
        dispatches={board}
        trucks={(trucks.data ?? []).map((t) => ({
          id: t.id,
          label: `${t.code} · ${t.plate_number}`,
          truck_type_id: t.truck_type_id,
          truck_type: typeName(t.truck_type_id),
          default_driver_id: t.default_driver_id,
        }))}
        drivers={drivers.data ?? []}
        suppliers={suppliers.data ?? []}
        truckTypes={truckTypes.data ?? []}
        supplierTypes={supplierTypes.data ?? []}
      />
    </div>
  );
}
