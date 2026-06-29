import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/app/page-header";
import { SetupTabs } from "./setup-tabs";

export const metadata = { title: "Setup" };

export default async function SetupPage() {
  await requireRole(["admin"]);
  const supabase = await createClient();

  const [cities, routes, serviceTypes, standardRates] =
    await Promise.all([
    supabase.from("cities").select("*").is("deleted_at", null).order("name"),
    supabase
      .from("routes")
      .select("*")
      .is("deleted_at", null)
      .order("created_at"),
    supabase
      .from("service_types")
      .select("*")
      .is("deleted_at", null)
      .order("sort_order"),
    supabase
      .from("standard_rates")
      .select("*")
      .is("deleted_at", null)
      .order("created_at"),
  ]);

  return (
    <div>
      <PageHeader
        title="Setup"
        description="Cities, routes, service types, and standard rates used across the system."
      />
      <SetupTabs
        cities={cities.data ?? []}
        routes={routes.data ?? []}
        serviceTypes={serviceTypes.data ?? []}
        standardRates={standardRates.data ?? []}
      />
    </div>
  );
}
