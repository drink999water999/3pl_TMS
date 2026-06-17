import { notFound } from "next/navigation";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { SupplierDetail } from "./supplier-detail";

export const metadata = { title: "Supplier" };

export default async function SupplierDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const { profile } = await requireRole(["admin", "dispatch"]);
  const canEdit = profile.role === "admin";
  const supabase = await createClient();

  const { data: supplier } = await supabase
    .from("suppliers")
    .select("*")
    .eq("id", params.id)
    .is("deleted_at", null)
    .maybeSingle();
  if (!supplier) notFound();

  const [trucks, rates, truckTypes, serviceTypes, cities, routes] =
    await Promise.all([
      supabase
        .from("supplier_trucks")
        .select("*")
        .eq("supplier_id", params.id)
        .is("deleted_at", null)
        .order("created_at"),
      supabase
        .from("supplier_rates")
        .select("*")
        .eq("supplier_id", params.id)
        .is("deleted_at", null)
        .order("created_at"),
      supabase
        .from("truck_types")
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
    ]);

  const cityName = new Map((cities.data ?? []).map((c) => [c.id, c.name]));
  const routeOptions = (routes.data ?? []).map((r) => ({
    id: r.id,
    label: `${cityName.get(r.from_city_id) ?? "?"} → ${
      cityName.get(r.to_city_id) ?? "?"
    }`,
  }));

  return (
    <SupplierDetail
      supplier={supplier}
      trucks={trucks.data ?? []}
      rates={rates.data ?? []}
      truckTypes={truckTypes.data ?? []}
      serviceTypes={serviceTypes.data ?? []}
      routeOptions={routeOptions}
      canEdit={canEdit}
    />
  );
}
