import { notFound } from "next/navigation";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { RequestDetail } from "./request-detail";

export const metadata = { title: "Request" };

export default async function RequestDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const { profile } = await requireRole(["admin", "operations"]);
  const isAdmin = profile.role === "admin";
  const supabase = await createClient();

  const { data: request } = await supabase
    .from("transport_requests")
    .select("*")
    .eq("id", params.id)
    .maybeSingle();
  if (!request) notFound();

  const [items, history, clients, locations, shipmentTypes, truckTypes, people] =
    await Promise.all([
      supabase
        .from("request_items")
        .select("*")
        .eq("request_id", params.id)
        .order("created_at"),
      supabase
        .from("status_history")
        .select("id, from_status, to_status, changed_by, changed_at")
        .eq("entity", "request")
        .eq("entity_id", params.id)
        .order("changed_at"),
      supabase
        .from("clients")
        .select("id, name")
        .is("deleted_at", null)
        .eq("is_active", true)
        .order("name"),
      supabase
        .from("locations")
        .select("id, client_id, kind, name")
        .is("deleted_at", null)
        .order("name"),
      supabase
        .from("shipment_types")
        .select("id, name")
        .eq("is_active", true)
        .order("name"),
      supabase
        .from("truck_types")
        .select("id, name")
        .eq("is_active", true)
        .order("name"),
      supabase.from("profiles").select("id, full_name"),
    ]);

  const allLocations = locations.data ?? [];
  const personName = (id: string | null) =>
    id ? (people.data?.find((p) => p.id === id)?.full_name ?? "—") : "—";
  const locName = (id: string | null) =>
    id ? (allLocations.find((l) => l.id === id)?.name ?? "—") : "—";

  const labels = {
    client: clients.data?.find((c) => c.id === request.client_id)?.name ?? "—",
    pickup: locName(request.pickup_location_id),
    delivery: locName(request.delivery_location_id),
    shipmentType:
      shipmentTypes.data?.find((s) => s.id === request.shipment_type_id)?.name ??
      "—",
    truckType:
      truckTypes.data?.find((t) => t.id === request.truck_type_id)?.name ?? "—",
  };

  const timeline = (history.data ?? []).map((h) => ({
    id: h.id,
    from_status: h.from_status,
    to_status: h.to_status,
    changed_at: h.changed_at,
    by: personName(h.changed_by),
  }));

  return (
    <RequestDetail
      request={request}
      items={items.data ?? []}
      timeline={timeline}
      labels={labels}
      isAdmin={isAdmin}
      clients={clients.data ?? []}
      locations={allLocations}
      shipmentTypes={shipmentTypes.data ?? []}
      truckTypes={truckTypes.data ?? []}
    />
  );
}
