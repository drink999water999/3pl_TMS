import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/app/page-header";
import { RequestForm } from "../request-form";

export const metadata = { title: "New request" };

export default async function NewRequestPage() {
  const { profile } = await requireRole(["admin", "operations", "client"]);
  const lockClientId = profile.role === "client" ? profile.client_id : null;
  const supabase = await createClient();

  const [clients, locations, shipmentTypes, truckTypes] = await Promise.all([
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
  ]);

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
        truckTypes={truckTypes.data ?? []}
        lockClientId={lockClientId}
      />
    </div>
  );
}
