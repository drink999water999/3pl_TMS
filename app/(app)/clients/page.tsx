import Link from "next/link";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/app/page-header";
import { SearchInput } from "@/components/app/search-input";
import { Badge } from "@/components/ui/badge";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/table";
import { ClientsActions } from "./clients-table";

export const metadata = { title: "Clients" };

export default async function ClientsPage({
  searchParams,
}: {
  searchParams: { q?: string };
}) {
  const { profile } = await requireRole(["admin", "operations"]);
  const canEdit = profile.role === "admin";
  const q = searchParams.q?.trim();

  const supabase = await createClient();
  let query = supabase
    .from("clients")
    .select("id, name, code, phone, email, is_active")
    .is("deleted_at", null);
  if (q) query = query.or(`name.ilike.%${q}%,code.ilike.%${q}%`);
  const { data: clients } = await query.order("name");

  return (
    <div>
      <PageHeader
        title="Clients"
        description="Client accounts, contacts, locations, and contract rates."
      >
        {canEdit ? <ClientsActions /> : null}
      </PageHeader>

      <div className="mb-4">
        <SearchInput placeholder="Search by name or code…" />
      </div>

      <Table>
        <THead>
          <TR>
            <TH>Name</TH>
            <TH>Code</TH>
            <TH>Phone</TH>
            <TH>Email</TH>
            <TH>Status</TH>
          </TR>
        </THead>
        <TBody>
          {(clients ?? []).length === 0 ? (
            <TR>
              <TD colSpan={5} className="text-center text-muted-foreground">
                No clients found.
              </TD>
            </TR>
          ) : (
            (clients ?? []).map((c) => (
              <TR key={c.id}>
                <TD>
                  <Link
                    href={`/clients/${c.id}`}
                    className="font-medium text-brand-navy hover:underline"
                  >
                    {c.name}
                  </Link>
                </TD>
                <TD>{c.code}</TD>
                <TD>{c.phone ?? "—"}</TD>
                <TD>{c.email ?? "—"}</TD>
                <TD>
                  <Badge variant={c.is_active ? "success" : "default"}>
                    {c.is_active ? "Active" : "Inactive"}
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
