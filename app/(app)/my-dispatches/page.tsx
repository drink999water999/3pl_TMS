import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/app/page-header";
import { RealtimeRefresh } from "@/components/app/realtime-refresh";
import { MyDispatches } from "./my-dispatches";

export const metadata = { title: "My Deliveries" };

export default async function MyDispatchesPage() {
  await requireRole(["driver"]);
  const supabase = await createClient();

  // RLS scopes every one of these to the signed-in driver's own rows.
  const [dispatches, waybills, pods] = await Promise.all([
    supabase
      .from("dispatches")
      .select("id, status, version, has_issue, assignment_type")
      .order("created_at", { ascending: false }),
    supabase
      .from("waybills")
      .select(
        "dispatch_id, waybill_no, client_name, pickup_address, delivery_address, truck_number",
      ),
    supabase.from("pods").select("dispatch_id"),
  ]);

  const wbBy = new Map(
    (waybills.data ?? []).map((w) => [w.dispatch_id, w] as const),
  );
  const podSet = new Set((pods.data ?? []).map((p) => p.dispatch_id));

  const items = (dispatches.data ?? []).map((d) => {
    const wb = wbBy.get(d.id);
    return {
      id: d.id,
      status: d.status,
      version: d.version,
      hasIssue: d.has_issue,
      hasPod: podSet.has(d.id),
      waybillNo: wb?.waybill_no ?? null,
      client: wb?.client_name ?? null,
      pickup: wb?.pickup_address ?? null,
      delivery: wb?.delivery_address ?? null,
      truck: wb?.truck_number ?? null,
    };
  });

  return (
    <div>
      <RealtimeRefresh table="dispatches" />
      <PageHeader
        title="My Deliveries"
        description="Update each shipment's status and upload proof of delivery."
      />
      <MyDispatches items={items} />
    </div>
  );
}
