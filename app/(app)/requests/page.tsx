import Link from "next/link";
import { Plus } from "lucide-react";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/app/page-header";
import { SearchInput } from "@/components/app/search-input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { formatDate, requestStatusVariant } from "@/lib/format";

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
  searchParams: { q?: string; status?: string };
}) {
  await requireRole(["admin", "operations"]);
  const q = searchParams.q?.trim();
  const status = STATUSES.includes(searchParams.status as ReqStatus)
    ? (searchParams.status as ReqStatus)
    : undefined;

  const supabase = await createClient();
  let query = supabase
    .from("transport_requests")
    .select(
      "id, request_no, client_id, pickup_location_id, delivery_location_id, status, delivery_date, created_at",
    );
  if (status) query = query.eq("status", status);
  if (q) query = query.or(`request_no.ilike.%${q}%,po_reference.ilike.%${q}%`);
  const { data: requests } = await query.order("created_at", {
    ascending: false,
  });

  const [{ data: clients }, { data: locations }] = await Promise.all([
    supabase.from("clients").select("id, name"),
    supabase.from("locations").select("id, name"),
  ]);
  const clientName = (id: string) =>
    clients?.find((c) => c.id === id)?.name ?? "—";
  const locName = (id: string | null) =>
    id ? (locations?.find((l) => l.id === id)?.name ?? "—") : "—";

  const chipHref = (s?: string) => {
    const p = new URLSearchParams();
    if (q) p.set("q", q);
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

      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <SearchInput placeholder="Search by request # or PO…" />
        <div className="flex flex-wrap gap-1.5">
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
      </div>

      <Table>
        <THead>
          <TR>
            <TH>Request #</TH>
            <TH>Client</TH>
            <TH>Route</TH>
            <TH>Delivery date</TH>
            <TH>Status</TH>
          </TR>
        </THead>
        <TBody>
          {(requests ?? []).length === 0 ? (
            <TR>
              <TD colSpan={5} className="text-center text-muted-foreground">
                No requests found.
              </TD>
            </TR>
          ) : (
            (requests ?? []).map((r) => (
              <TR key={r.id}>
                <TD>
                  <Link
                    href={`/requests/${r.id}`}
                    className="font-medium text-brand-navy hover:underline"
                  >
                    {r.request_no}
                  </Link>
                </TD>
                <TD>{clientName(r.client_id)}</TD>
                <TD className="text-sm text-muted-foreground">
                  {locName(r.pickup_location_id)} →{" "}
                  {locName(r.delivery_location_id)}
                </TD>
                <TD>{formatDate(r.delivery_date)}</TD>
                <TD>
                  <Badge variant={requestStatusVariant(r.status)}>
                    {r.status}
                  </Badge>
                </TD>
              </TR>
            ))
          )}
        </TBody>
      </Table>
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
