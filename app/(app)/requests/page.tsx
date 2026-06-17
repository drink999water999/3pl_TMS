import Link from "next/link";
import { Plus } from "lucide-react";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/app/page-header";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { RequestsTable, type RequestRow } from "./requests-table";

export const metadata = { title: "Requests" };

const STATUSES = [
  "Draft",
  "Submitted",
  "Approved",
  "Assigned",
  "Delivered",
  "Rejected",
  "Cancelled",
] as const;
type ReqStatus = (typeof STATUSES)[number];

export default async function RequestsPage({
  searchParams,
}: {
  searchParams: { status?: string };
}) {
  await requireRole(["admin", "operations", "client"]);
  const status = STATUSES.includes(searchParams.status as ReqStatus)
    ? (searchParams.status as ReqStatus)
    : undefined;

  const supabase = await createClient();
  let query = supabase
    .from("transport_requests")
    .select(
      "id, request_no, po_reference, client_id, pickup_location_id, delivery_location_id, route_id, status, delivery_date, created_at",
    );
  if (status) query = query.eq("status", status);
  const { data: requests } = await query.order("created_at", {
    ascending: false,
  });

  const [{ data: clients }, { data: locations }, { data: cities }, { data: routes }] =
    await Promise.all([
      supabase.from("clients").select("id, name, client_type"),
      supabase.from("locations").select("id, name, city_id"),
      supabase.from("cities").select("id, name"),
      supabase.from("routes").select("id, from_city_id, to_city_id"),
    ]);

  const clientById = new Map((clients ?? []).map((c) => [c.id, c]));
  const locById = new Map((locations ?? []).map((l) => [l.id, l]));
  const cityName = new Map((cities ?? []).map((c) => [c.id, c.name]));
  const routeById = new Map((routes ?? []).map((r) => [r.id, r]));

  const cityOfLoc = (id: string | null) => {
    const cid = id ? locById.get(id)?.city_id ?? null : null;
    return cid ? cityName.get(cid) ?? null : null;
  };
  const locName = (id: string | null) =>
    id ? locById.get(id)?.name ?? "—" : "—";

  const routeText = (r: {
    route_id: string | null;
    pickup_location_id: string | null;
    delivery_location_id: string | null;
  }) => {
    const rt = r.route_id ? routeById.get(r.route_id) : null;
    if (rt)
      return `${cityName.get(rt.from_city_id) ?? "?"} → ${
        cityName.get(rt.to_city_id) ?? "?"
      }`;
    const from = cityOfLoc(r.pickup_location_id);
    const to = cityOfLoc(r.delivery_location_id);
    if (from || to) return `${from ?? locName(r.pickup_location_id)} → ${to ?? locName(r.delivery_location_id)}`;
    return `${locName(r.pickup_location_id)} → ${locName(r.delivery_location_id)}`;
  };

  const rows: RequestRow[] = (requests ?? []).map((r) => ({
    id: r.id,
    request_no: r.request_no,
    po: r.po_reference ?? "",
    client: clientById.get(r.client_id)?.name ?? "—",
    clientType: clientById.get(r.client_id)?.client_type ?? "",
    locationName: locName(r.delivery_location_id),
    route: routeText(r),
    deliveryDate: r.delivery_date,
    status: r.status,
  }));

  const chipHref = (s?: string) => {
    const p = new URLSearchParams();
    if (s) p.set("status", s);
    const qs = p.toString();
    return qs ? `/requests?${qs}` : "/requests";
  };

  return (
    <div>
      <PageHeader
        title="Transport Requests"
        description="Create, approve, and track shipment requests."
      >
        <Button asChild>
          <Link href="/requests/new">
            <Plus className="h-4 w-4" /> New request
          </Link>
        </Button>
      </PageHeader>

      <div className="mb-4 flex flex-wrap gap-1.5">
        <FilterChip label="All" href={chipHref()} active={!status} />
        {STATUSES.map((s) => (
          <FilterChip
            key={s}
            label={s}
            href={chipHref(s)}
            active={status === s}
          />
        ))}
      </div>

      <RequestsTable rows={rows} />
    </div>
  );
}

function FilterChip({
  label,
  href,
  active,
}: {
  label: string;
  href: string;
  active: boolean;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
        active
          ? "border-brand-navy bg-brand-navy text-white"
          : "border-input text-muted-foreground hover:bg-muted",
      )}
    >
      {label}
    </Link>
  );
}
