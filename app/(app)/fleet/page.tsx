import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/app/page-header";
import { FleetTabs } from "./fleet-tabs";

export const metadata = { title: "Fleet" };

export default async function FleetPage() {
  const { profile } = await requireRole(["admin", "dispatch"]);
  const canEdit = profile.role === "admin";
  const supabase = await createClient();

  const [trucks, drivers, suppliers, truckTypes, supplierTypes] =
    await Promise.all([
      supabase
        .from("trucks")
        .select("*")
        .is("deleted_at", null)
        .order("code"),
      supabase
        .from("drivers")
        .select("*")
        .is("deleted_at", null)
        .order("name"),
      supabase
        .from("suppliers")
        .select("*")
        .is("deleted_at", null)
        .order("name"),
      supabase
        .from("truck_types")
        .select("id, name")
        .eq("is_active", true)
        .order("name"),
      supabase.from("supplier_truck_types").select("supplier_id, truck_type_id"),
    ]);

  return (
    <div>
      <PageHeader
        title="Fleet"
        description="Trucks, drivers, and outsourced suppliers."
      />
      <FleetTabs
        trucks={trucks.data ?? []}
        drivers={drivers.data ?? []}
        suppliers={suppliers.data ?? []}
        truckTypes={truckTypes.data ?? []}
        supplierTypes={supplierTypes.data ?? []}
        canEdit={canEdit}
      />
    </div>
  );
}
