import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/app/page-header";
import { RequestForm } from "../request-form";

export const metadata = { title: "New request" };

export default async function NewRequestPage() {
  const { profile } = await requireRole(["admin", "operations", "client"]);
  const isClient = profile.role === "client";
  const lockClientId = isClient ? profile.client_id : null;
  const supabase = await createClient();

  const [
    clients,
    locations,
    shipmentTypes,
    serviceTypes,
    cities,
    routes,
    contractRates,
    standardRates,
  ] = await Promise.all([
      supabase
        .from("clients")
        .select("id, name, multi_location_charge")
        .is("deleted_at", null)
        .eq("is_active", true)
        .order("name"),
      supabase
        .from("locations")
        .select(
          "id, client_id, kind, name, city_id, receiver_name, receiver_phone",
        )
        .is("deleted_at", null)
        .order("name"),
      supabase
        .from("shipment_types")
        .select("id, name")
        .eq("is_active", true)
        .order("name"),
      supabase
        .from("service_types")
        .select("id, name, requires_quantity")
        .eq("is_active", true)
        .order("sort_order"),
      supabase
        .from("cities")
        .select("id, name")
        .eq("is_active", true)
        .order("name"),
      supabase
        .from("routes")
        .select("id, from_city_id, to_city_id, distance_km")
        .eq("is_active", true)
        .is("deleted_at", null),
      supabase
        .from("contract_rates")
        .select("client_id, service_type_id, route_id, rate, currency")
        .is("deleted_at", null),
      supabase
        .from("standard_rates")
        .select("service_type_id, route_id, rate, currency")
        .eq("is_active", true)
        .is("deleted_at", null),
    ]);

  const clientMultiCharge: Record<string, number> = {};
  for (const c of clients.data ?? [])
    clientMultiCharge[c.id] = c.multi_location_charge ?? 0;

  return (
    <div>
      <Link
        href="/requests"
        className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> Back to requests
      </Link>
      <PageHeader
        title="New transport request"
        description="Create a draft. You can edit it and add items until it's submitted."
      />
      <RequestForm
        mode="create"
        clients={clients.data ?? []}
        locations={locations.data ?? []}
        shipmentTypes={shipmentTypes.data ?? []}
        serviceTypes={serviceTypes.data ?? []}
        cities={cities.data ?? []}
        routes={routes.data ?? []}
        contractRates={contractRates.data ?? []}
        standardRates={standardRates.data ?? []}
        clientMultiCharge={clientMultiCharge}
        canSetPricing={!isClient}
        isClient={isClient}
        lockClientId={lockClientId}
      />
    </div>
  );
}
