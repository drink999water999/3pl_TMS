import Link from "next/link";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/app/page-header";
import { SearchInput } from "@/components/app/search-input";
import { Badge } from "@/components/ui/badge";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { formatDate } from "@/lib/format";

export const metadata = { title: "Waybills" };

const STATUSES = ["draft", "approved"] as const;
type WbStatus = (typeof STATUSES)[number];

export default async function WaybillsPage({
  searchParams,
}: {
  searchParams: { q?: string; status?: string };
}) {
  await requireRole(["admin", "operations", "dispatch"]);
  const q = searchParams.q?.trim();
  const status = STATUSES.includes(searchParams.status as WbStatus)
    ? (searchParams.status as WbStatus)
    : undefined;

  const supabase = await createClient();
  let query = supabase
    .from("waybills")
    .select("id, waybill_no, request_id, client_name, status, issued_at");
  if (status) query = query.eq("status", status);
  if (q)
    query = query.or(`waybill_no.ilike.%${q}%,client_name.ilike.%${q}%`);
  const { data: waybills } = await query.order("issued_at", {
    ascending: false,
  });

  const { data: requests } = await supabase
    .from("transport_requests")
    .select("id, request_no");
  const requestNo = (id: string) =>
    requests?.find((r) => r.id === id)?.request_no ?? "—";

  const chipHref = (s?: string) => {
    const p = new URLSearchParams();
    if (q) p.set("q", q);
    if (s) p.set("status", s);
    const qs = p.toString();
    return qs ? `/waybills?${qs}` : "/waybills";
  };

  return (
    <div>
      <PageHeader
        title="Waybills"
        description="Approve, download, print, and email shipment waybills."
      />

      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <SearchInput placeholder="Search by waybill # or client…" />
        <div className="flex flex-wrap gap-1.5">
          <Chip label="All" href={chipHref()} active={!status} />
          <Chip
            label="Draft"
            href={chipHref("draft")}
            active={status === "draft"}
          />
          <Chip
            label="Approved"
            href={chipHref("approved")}
            active={status === "approved"}
          />
        </div>
      </div>

      <Table>
        <THead>
          <TR>
            <TH>Waybill #</TH>
            <TH>Request #</TH>
            <TH>Client</TH>
            <TH>Issued</TH>
            <TH>Status</TH>
          </TR>
        </THead>
        <TBody>
          {(waybills ?? []).length === 0 ? (
            <TR>
              <TD colSpan={5} className="text-center text-muted-foreground">
                No waybills yet. They appear automatically when a dispatch is
                marked Dispatched.
              </TD>
            </TR>
          ) : (
            (waybills ?? []).map((w) => (
              <TR key={w.id}>
                <TD>
                  <Link
                    href={`/waybills/${w.id}`}
                    className="font-medium text-brand-navy hover:underline"
                  >
                    {w.waybill_no}
                  </Link>
                </TD>
                <TD>{requestNo(w.request_id)}</TD>
                <TD>{w.client_name ?? "—"}</TD>
                <TD>{formatDate(w.issued_at)}</TD>
                <TD>
                  <Badge
                    variant={w.status === "approved" ? "success" : "default"}
                  >
                    {w.status === "approved" ? "Approved" : "Draft"}
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

function Chip({
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
