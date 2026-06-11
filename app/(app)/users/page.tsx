import { requireRole } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { PageHeader } from "@/components/app/page-header";
import { UsersManager } from "./users-manager";

export const metadata = { title: "Users" };

export type UserRow = {
  id: string;
  full_name: string | null;
  email: string | null;
  role: string;
  active: boolean;
  client_id: string | null;
  company_name: string | null;
  client_name: string | null;
  created_at: string;
};

export default async function UsersPage() {
  await requireRole(["admin"]);
  const admin = createAdminClient();

  const [{ data: profiles }, authList, { data: clients }] = await Promise.all([
    admin
      .from("profiles")
      .select(
        "id, full_name, role, active, client_id, company_name, created_at",
      )
      .order("created_at", { ascending: false }),
    admin.auth.admin.listUsers({ page: 1, perPage: 1000 }),
    admin
      .from("clients")
      .select("id, name")
      .is("deleted_at", null)
      .order("name"),
  ]);

  const emailById = new Map(
    (authList.data?.users ?? []).map((u) => [u.id, u.email ?? null]),
  );
  const clientNameById = new Map((clients ?? []).map((c) => [c.id, c.name]));

  const users: UserRow[] = (profiles ?? []).map((p) => ({
    id: p.id,
    full_name: p.full_name,
    email: emailById.get(p.id) ?? null,
    role: p.role,
    active: p.active,
    client_id: p.client_id,
    company_name: p.company_name,
    client_name: p.client_id ? (clientNameById.get(p.client_id) ?? null) : null,
    created_at: p.created_at,
  }));

  const pending = users.filter((u) => u.role === "client" && !u.active);

  return (
    <div>
      <PageHeader
        title="Users & access"
        description="Create staff accounts, approve client sign-ups, and manage access."
      />
      <UsersManager
        users={users}
        pending={pending}
        clients={clients ?? []}
      />
    </div>
  );
}
