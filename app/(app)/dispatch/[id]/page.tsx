import { notFound } from "next/navigation";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { RealtimeRefresh } from "@/components/app/realtime-refresh";
import { DispatchDetail } from "./dispatch-detail";

export const metadata = { title: "Dispatch" };

export default async function DispatchDetailPage({
  params,
}: {
  params: { id: string };
}) {
  await requireRole(["admin", "dispatch"]);
  const supabase = await createClient();

  const { data: dispatch } = await supabase
    .from("dispatches")
    .select("*")
    .eq("id", params.id)
    .maybeSingle();
  if (!dispatch) notFound();

  const [
    request,
    history,
    clients,
    locations,
    trucks,
    drivers,
    suppliers,
    truckTypes,
    people,
    waybill,
    pods,
    exceptions,
  ] = await Promise.all([
    supabase
      .from("transport_requests")
      .select("id, request_no, client_id, pickup_location_id, delivery_location_id")
      .eq("id", dispatch.request_id)
      .maybeSingle(),
    supabase
      .from("status_history")
      .select("id, from_status, to_status, changed_by, changed_at")
      .eq("entity", "dispatch")
      .eq("entity_id", params.id)
      .order("changed_at"),
    supabase.from("clients").select("id, name"),
    supabase.from("locations").select("id, name"),
    supabase.from("trucks").select("id, code, plate_number"),
    supabase.from("drivers").select("id, name"),
    supabase.from("suppliers").select("id, name"),
    supabase.from("truck_types").select("id, name"),
    supabase.from("profiles").select("id, full_name"),
    supabase
      .from("waybills")
      .select("id, waybill_no, status")
      .eq("dispatch_id", params.id)
      .maybeSingle(),
    supabase
      .from("pods")
      .select("id, kind, note, storage_path, uploaded_by, uploaded_at")
      .eq("dispatch_id", params.id)
      .order("uploaded_at", { ascending: false }),
    supabase
      .from("exceptions")
      .select("id, kind, description, reported_by, resolved_at, created_at")
      .eq("dispatch_id", params.id)
      .order("created_at", { ascending: false }),
  ]);

  const req = request.data;
  const name = (
    list: { id: string; name: string }[] | null,
    id: string | null,
  ) => (id ? (list?.find((x) => x.id === id)?.name ?? "—") : "—");
  const truck = trucks.data?.find((t) => t.id === dispatch.truck_id);

  const labels = {
    requestNo: req?.request_no ?? "—",
    client: name(clients.data, req?.client_id ?? null),
    route: `${name(locations.data, req?.pickup_location_id ?? null)} → ${name(
      locations.data,
      req?.delivery_location_id ?? null,
    )}`,
    truck: truck ? `${truck.code} · ${truck.plate_number}` : "—",
    driver: name(drivers.data, dispatch.driver_id),
    supplier: name(suppliers.data, dispatch.supplier_id),
    truckType: name(truckTypes.data, dispatch.truck_type_id),
  };

  const personName = (id: string | null) =>
    id ? (people.data?.find((p) => p.id === id)?.full_name ?? "—") : "—";
  const timeline = (history.data ?? []).map((h) => ({
    id: h.id,
    from_status: h.from_status,
    to_status: h.to_status,
    changed_at: h.changed_at,
    by: personName(h.changed_by),
  }));

  const podList = await Promise.all(
    (pods.data ?? []).map(async (p) => ({
      id: p.id,
      kind: p.kind,
      note: p.note,
      uploaded_at: p.uploaded_at,
      by: personName(p.uploaded_by),
      url: p.storage_path
        ? ((
            await supabase.storage
              .from("pods")
              .createSignedUrl(p.storage_path, 300)
          ).data?.signedUrl ?? null)
        : null,
    })),
  );

  const exceptionList = (exceptions.data ?? []).map((e) => ({
    id: e.id,
    kind: e.kind,
    description: e.description,
    resolved_at: e.resolved_at,
    created_at: e.created_at,
    by: personName(e.reported_by),
  }));

  return (
    <>
      <RealtimeRefresh table="dispatches" channel={`dispatch-${params.id}`} />
      <DispatchDetail
        dispatch={dispatch}
        requestId={dispatch.request_id}
        labels={labels}
        waybill={waybill.data ?? null}
        timeline={timeline}
        pods={podList}
        exceptions={exceptionList}
      />
    </>
  );
}
