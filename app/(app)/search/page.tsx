import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/app/page-header";
import { SearchResults, type SearchHit } from "./search-results";

export const metadata = { title: "Search" };

const like = (q: string) => `%${q.replace(/[%,]/g, " ")}%`;

export default async function SearchPage({
  searchParams,
}: {
  searchParams: { q?: string };
}) {
  await requireRole(["admin", "operations", "dispatch", "finance"]);
  const q = (searchParams.q ?? "").trim();
  const supabase = await createClient();

  let hits: SearchHit[] = [];

  if (q.length >= 2) {
    const p = like(q);
    const [
      requests,
      waybills,
      drivers,
      trucks,
      suppliers,
      supplierTrucks,
      clients,
      cities,
    ] = await Promise.all([
      supabase
        .from("transport_requests")
        .select("id, request_no, po_reference")
        .or(`request_no.ilike.${p},po_reference.ilike.${p}`)
        .limit(25),
      supabase
        .from("waybills")
        .select("id, waybill_no, po_reference, client_name")
        .or(`waybill_no.ilike.${p},po_reference.ilike.${p},client_name.ilike.${p}`)
        .limit(25),
      supabase
        .from("drivers")
        .select("id, name, phone")
        .is("deleted_at", null)
        .or(`name.ilike.${p},phone.ilike.${p}`)
        .limit(25),
      supabase
        .from("trucks")
        .select("id, code, plate_number")
        .is("deleted_at", null)
        .or(`plate_number.ilike.${p},code.ilike.${p}`)
        .limit(25),
      supabase
        .from("suppliers")
        .select("id, name")
        .is("deleted_at", null)
        .ilike("name", p)
        .limit(25),
      supabase
        .from("supplier_trucks")
        .select("id, supplier_id, plate_number, driver_name, driver_mobile")
        .is("deleted_at", null)
        .or(
          `plate_number.ilike.${p},driver_name.ilike.${p},driver_mobile.ilike.${p}`,
        )
        .limit(25),
      supabase
        .from("clients")
        .select("id, name, code")
        .is("deleted_at", null)
        .or(`name.ilike.${p},code.ilike.${p}`)
        .limit(25),
      supabase
        .from("cities")
        .select("id, name")
        .ilike("name", p)
        .limit(25),
    ]);

    const push = (arr: SearchHit[]) => {
      hits = hits.concat(arr);
    };
    push(
      (requests.data ?? []).map((r) => ({
        type: "Request",
        label: r.request_no,
        sub: r.po_reference ? `PO ${r.po_reference}` : "",
        href: `/requests/${r.id}`,
      })),
    );
    push(
      (waybills.data ?? []).map((w) => ({
        type: "Waybill",
        label: w.waybill_no,
        sub: [w.client_name, w.po_reference && `PO ${w.po_reference}`]
          .filter(Boolean)
          .join(" · "),
        href: `/waybills/${w.id}`,
      })),
    );
    push(
      (clients.data ?? []).map((c) => ({
        type: "Customer",
        label: c.name,
        sub: c.code ?? "",
        href: `/clients/${c.id}`,
      })),
    );
    push(
      (suppliers.data ?? []).map((s) => ({
        type: "Supplier",
        label: s.name,
        sub: "",
        href: `/fleet/suppliers/${s.id}`,
      })),
    );
    push(
      (drivers.data ?? []).map((d) => ({
        type: "Driver",
        label: d.name,
        sub: d.phone ?? "",
        href: `/fleet`,
      })),
    );
    push(
      (trucks.data ?? []).map((t) => ({
        type: "Truck",
        label: `${t.code} · ${t.plate_number}`,
        sub: "",
        href: `/fleet`,
      })),
    );
    push(
      (supplierTrucks.data ?? []).map((t) => ({
        type: "Supplier truck",
        label: t.plate_number,
        sub: [t.driver_name, t.driver_mobile].filter(Boolean).join(" · "),
        href: `/fleet/suppliers/${t.supplier_id}`,
      })),
    );
    push(
      (cities.data ?? []).map((c) => ({
        type: "City / route",
        label: c.name,
        sub: "",
        href: `/setup`,
      })),
    );
  }

  return (
    <div>
      <PageHeader
        title="Search everywhere"
        description="Find a trip by request #, waybill #, PO, customer, supplier, truck plate, driver, mobile, or city."
      />
      <SearchResults q={q} hits={hits} />
    </div>
  );
}
