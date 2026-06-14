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
  const { profile } = await requireRole(["admin", "operations", "client"]);
  const isAdmin = profile.role === "admin";
  const isStaff = profile.role === "admin" || profile.role === "operations";
  const supabase = await createClient();

  const { data: request } = await supabase
    .from("transport_requests")
    .select("*")
    .eq("id", params.id)
    .maybeSingle();
  if (!request) notFound();

  const [
    items,
    history,
    clients,
    locations,
    shipmentTypes,
    truckTypes,
    people,
    dispatchRes,
  ] = await Promise.all([
    supabase
      .from("request_items")
      .select("*")
      .eq("request_id", params.id)
      .order("created_at"),
    supabase
      .from("status_history")
      .select("id, entity, from_status, to_status, changed_by, changed_at")
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
    supabase
      .from("dispatches")
      .select(
        "id, status, assignment_type, truck_id, driver_id, supplier_id, truck_type_id, supplier_truck, notes",
      )
      .eq("request_id", params.id)
      .maybeSingle(),
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

  // Resolve the dispatch assignment (driver / truck / supplier) + its history.
  const dispatch = dispatchRes.data ?? null;
  let dispatchInfo: {
    id: string;
    status: string;
    assignmentType: string;
    driver: string | null;
    truck: string | null;
    truckType: string | null;
    supplier: string | null;
    supplierTruck: string | null;
  } | null = null;
  let dispatchHistory: typeof history.data = [];

  if (dispatch) {
    const [driverRes, truckRes, supplierRes, dispHist] = await Promise.all([
      dispatch.driver_id
        ? supabase
            .from("drivers")
            .select("name")
            .eq("id", dispatch.driver_id)
            .maybeSingle()
        : Promise.resolve({ data: null }),
      dispatch.truck_id
        ? supabase
            .from("trucks")
            .select("code, plate_number")
            .eq("id", dispatch.truck_id)
            .maybeSingle()
        : Promise.resolve({ data: null }),
      dispatch.supplier_id
        ? supabase
            .from("suppliers")
            .select("name")
            .eq("id", dispatch.supplier_id)
            .maybeSingle()
        : Promise.resolve({ data: null }),
      supabase
        .from("status_history")
        .select("id, entity, from_status, to_status, changed_by, changed_at")
        .eq("entity", "dispatch")
        .eq("entity_id", dispatch.id)
        .order("changed_at"),
    ]);

    const truck = truckRes.data as { code: string; plate_number: string } | null;
    dispatchInfo = {
      id: dispatch.id,
      status: dispatch.status,
      assignmentType: dispatch.assignment_type,
      driver: (driverRes.data as { name: string } | null)?.name ?? null,
      truck: truck ? `${truck.code} · ${truck.plate_number}` : null,
      truckType:
        truckTypes.data?.find((t) => t.id === dispatch.truck_type_id)?.name ??
        null,
      supplier: (supplierRes.data as { name: string } | null)?.name ?? null,
      supplierTruck: dispatch.supplier_truck ?? null,
    };
    dispatchHistory = dispHist.data ?? [];
  }

  // Merge request + dispatch history into a single, time-ordered timeline.
  const timeline = [...(history.data ?? []), ...(dispatchHistory ?? [])]
    .map((h) => ({
      id: h.id,
      entity: h.entity as string,
      from_status: h.from_status,
      to_status: h.to_status,
      changed_at: h.changed_at,
      by: personName(h.changed_by),
    }))
    .sort((a, b) => a.changed_at.localeCompare(b.changed_at));

  // Internal comments (staff only).
  let comments: {
    id: string;
    body: string;
    created_at: string;
    author: string;
  }[] = [];
  if (isStaff) {
    const { data: rc } = await supabase
      .from("request_comments")
      .select("id, body, created_at, author_id")
      .eq("request_id", params.id)
      .order("created_at", { ascending: false });
    comments = (rc ?? []).map((c) => ({
      id: c.id,
      body: c.body,
      created_at: c.created_at,
      author: personName(c.author_id),
    }));
  }

  const lockClientId = profile.role === "client" ? request.client_id : null;

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
      lockClientId={lockClientId}
      dispatchInfo={dispatchInfo}
      comments={comments}
      canComment={isStaff}
    />
  );
}
