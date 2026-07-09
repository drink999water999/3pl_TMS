import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/app/page-header";
import { RealtimeRefresh } from "@/components/app/realtime-refresh";
import { CurrentDelivery } from "./current-delivery";

export const metadata = { title: "Current Delivery" };

export default async function CurrentDeliveryPage() {
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
        "dispatch_id, waybill_no, client_name, pickup_address, pickup_name, pickup_city, pickup_maps_url, delivery_address, delivery_city, delivery_maps_url, receiver_name, pickup_date, truck_number",
      ),
    supabase.from("pods").select("dispatch_id, stage"),
  ]);

  const wbBy = new Map(
    (waybills.data ?? []).map((w) => [w.dispatch_id, w] as const),
  );
  const podRows = pods.data ?? [];

  // The "current" delivery is the most recent dispatch that is still in flight
  // (anything not yet Delivered/Confirmed). Drivers work one order at a time.
  const active = (dispatches.data ?? []).find(
    (d) => d.status !== "Delivered" && d.status !== "Confirmed",
  );

  const item = active
    ? (() => {
        const wb = wbBy.get(active.id);
        const mine = podRows.filter((p) => p.dispatch_id === active.id);
        return {
          id: active.id,
          status: active.status,
          version: active.version,
          hasIssue: active.has_issue,
          isOwnFleet: active.assignment_type === "own",
          hasPickupPod: mine.some((p) => p.stage === "pickup"),
          hasDeliveryPod: mine.some((p) => p.stage === "delivery"),
          waybillNo: wb?.waybill_no ?? null,
          client: wb?.client_name ?? null,
          pickup: {
            name: wb?.pickup_name ?? null,
            city: wb?.pickup_city ?? null,
            address: wb?.pickup_address ?? null,
            mapsUrl: wb?.pickup_maps_url ?? null,
          },
          delivery: {
            name: wb?.receiver_name ?? null,
            city: wb?.delivery_city ?? null,
            address: wb?.delivery_address ?? null,
            mapsUrl: wb?.delivery_maps_url ?? null,
          },
          pickupDate: wb?.pickup_date ?? null,
          truck: wb?.truck_number ?? null,
        };
      })()
    : null;

  return (
    <div>
      <RealtimeRefresh table="dispatches" />
      <PageHeader
        title="Current Delivery"
        description="Your active order. Trip details appear once you mark it as dispatched."
      />
      <CurrentDelivery item={item} />
    </div>
  );
}
