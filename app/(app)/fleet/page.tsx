import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { PageHeader } from "@/components/app/page-header";
import { FleetTabs, type DriverLogin } from "./fleet-tabs";
import { ExcelTools } from "@/components/app/excel-tools";
import { importSuppliers } from "./actions";

export const metadata = { title: "Fleet" };

export default async function FleetPage() {
  const { profile } = await requireRole(["admin", "dispatch"]);
  const canEdit = profile.role === "admin";
  const supabase = await createClient();

  const [trucks, drivers, suppliers, truckTypes, supplierTypes, cities] =
    await Promise.all([
      supabase.from("trucks").select("*").is("deleted_at", null).order("code"),
      supabase.from("drivers").select("*").is("deleted_at", null).order("name"),
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
      supabase
        .from("cities")
        .select("id, name")
        .eq("is_active", true)
        .order("name"),
    ]);

  // Resolve linked logins (email + active) for drivers — admin only.
  const driverLogins: Record<string, DriverLogin> = {};
  if (canEdit) {
    const linked = (drivers.data ?? []).filter((d) => d.user_id);
    if (linked.length > 0) {
      const admin = createAdminClient();
      const userIds = linked.map((d) => d.user_id as string);
      const [{ data: usersList }, { data: profs }] = await Promise.all([
        admin.auth.admin.listUsers({ page: 1, perPage: 1000 }),
        admin.from("profiles").select("id, active").in("id", userIds),
      ]);
      const emailByUser = new Map(
        (usersList?.users ?? []).map((u) => [u.id, u.email ?? ""]),
      );
      const activeByUser = new Map((profs ?? []).map((p) => [p.id, p.active]));
      for (const d of linked) {
        driverLogins[d.id] = {
          email: emailByUser.get(d.user_id as string) ?? "—",
          active: activeByUser.get(d.user_id as string) ?? false,
        };
      }
    }
  }

  return (
    <div>
      <PageHeader
        title="Fleet"
        description="Trucks, drivers, and outsourced suppliers."
      />
      {canEdit ? (
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-muted-foreground">
            Import or export your suppliers in bulk.
          </p>
          <ExcelTools
            rows={(suppliers.data ?? []).map((s) => ({
              name: s.name,
              code: s.code ?? "",
              phone: s.phone ?? "",
              email: s.email ?? "",
              address: s.address ?? "",
            }))}
            filename="suppliers"
            templateColumns={["name", "code", "phone", "email", "address"]}
            onImport={importSuppliers}
          />
        </div>
      ) : null}
      <FleetTabs
        trucks={trucks.data ?? []}
        drivers={drivers.data ?? []}
        suppliers={suppliers.data ?? []}
        truckTypes={truckTypes.data ?? []}
        supplierTypes={supplierTypes.data ?? []}
        cities={cities.data ?? []}
        driverLogins={driverLogins}
        canEdit={canEdit}
      />
    </div>
  );
}
