import { notFound } from "next/navigation";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { ClientDetail } from "./client-detail";

export const metadata = { title: "Client" };

export default async function ClientDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const { profile } = await requireRole(["admin", "operations"]);
  const canEdit = profile.role === "admin";
  const supabase = await createClient();

  const { data: client } = await supabase
    .from("clients")
    .select("*")
    .eq("id", params.id)
    .is("deleted_at", null)
    .maybeSingle();
  if (!client) notFound();

  const [
    contacts,
    locations,
    rates,
    truckTypes,
    shipmentTypes,
    serviceTypes,
    cities,
    routes,
    standardRates,
  ] = await Promise.all([
    supabase
      .from("client_contacts")
      .select("*")
      .eq("client_id", params.id)
      .order("created_at"),
    supabase
      .from("locations")
      .select("*")
      .eq("client_id", params.id)
      .is("deleted_at", null)
      .order("kind"),
    supabase
      .from("contract_rates")
      .select("*")
      .eq("client_id", params.id)
      .is("deleted_at", null)
      .order("created_at"),
    supabase
      .from("truck_types")
      .select("id, name")
      .eq("is_active", true)
      .order("name"),
    supabase
      .from("shipment_types")
      .select("id, name")
      .eq("is_active", true)
      .order("name"),
    supabase
      .from("service_types")
      .select("id, name")
      .eq("is_active", true)
      .order("sort_order"),
    supabase
      .from("cities")
      .select("id, name")
      .eq("is_active", true)
      .order("name"),
    supabase
      .from("routes")
      .select("id, from_city_id, to_city_id")
      .eq("is_active", true)
      .is("deleted_at", null),
    supabase
      .from("standard_rates")
      .select("service_type_id, route_id, rate, currency")
      .eq("is_active", true)
      .is("deleted_at", null),
  ]);

  // Build "From -> To" labels for routes from the city list.
  const cityName = new Map((cities.data ?? []).map((c) => [c.id, c.name]));
  const routeOptions = (routes.data ?? []).map((r) => ({
    id: r.id,
    label: `${cityName.get(r.from_city_id) ?? "?"} → ${
      cityName.get(r.to_city_id) ?? "?"
    }`,
  }));

  return (
    <ClientDetail
      client={client}
      contacts={contacts.data ?? []}
      locations={locations.data ?? []}
      rates={rates.data ?? []}
      truckTypes={truckTypes.data ?? []}
      shipmentTypes={shipmentTypes.data ?? []}
      serviceTypes={serviceTypes.data ?? []}
      cities={cities.data ?? []}
      routeOptions={routeOptions}
      standardRates={standardRates.data ?? []}
      canEdit={canEdit}
    />
  );
}
