"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { UserPlus, KeyRound, CheckCircle2, Building2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Dialog } from "@/components/ui/dialog";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/table";
import { ROLE_LABELS, type Role } from "@/lib/types";
import type { UserRow } from "./page";
import {
  createStaffUser,
  approveClient,
  setUserActive,
  resetUserPassword,
} from "./actions";

type Lookup = { id: string; name: string };
const STAFF_ROLES: Role[] = [
  "admin",
  "operations",
  "dispatch",
  "driver",
  "finance",
];

export function UsersManager({
  users,
  pending,
  clients,
}: {
  users: UserRow[];
  pending: UserRow[];
  clients: Lookup[];
}) {
  const [creating, setCreating] = useState(false);
  const [approve, setApprove] = useState<UserRow | null>(null);
  const [reset, setReset] = useState<UserRow | null>(null);

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <Button onClick={() => setCreating(true)}>
          <UserPlus className="h-4 w-4" /> Create user
        </Button>
      </div>

      {pending.length > 0 ? (
        <Card className="space-y-3 p-5">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-semibold text-brand-navy">
              Pending client approvals
            </h2>
            <Badge variant="warning">{pending.length}</Badge>
          </div>
          <div className="space-y-2">
            {pending.map((u) => (
              <div
                key={u.id}
                className="flex flex-col gap-2 rounded-lg border bg-amber-50/40 p-3 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0 text-sm">
                  <p className="font-medium">{u.full_name ?? u.email}</p>
                  <p className="text-muted-foreground">
                    {u.email}
                    {u.company_name ? (
                      <>
                        {" · "}
                        <span className="inline-flex items-center gap-1">
                          <Building2 className="h-3 w-3" />
                          {u.company_name}
                        </span>
                      </>
                    ) : null}
                  </p>
                </div>
                <Button size="sm" onClick={() => setApprove(u)}>
                  <CheckCircle2 className="h-4 w-4" /> Review &amp; approve
                </Button>
              </div>
            ))}
          </div>
        </Card>
      ) : null}

      <Table>
        <THead>
          <TR>
            <TH>Name</TH>
            <TH>Email</TH>
            <TH>Role</TH>
            <TH>Company</TH>
            <TH>Status</TH>
            <TH></TH>
          </TR>
        </THead>
        <TBody>
          {users.length === 0 ? (
            <TR>
              <TD colSpan={6} className="text-center text-muted-foreground">
                No users yet.
              </TD>
            </TR>
          ) : (
            users.map((u) => (
              <UserRowView
                key={u.id}
                user={u}
                onApprove={() => setApprove(u)}
                onReset={() => setReset(u)}
              />
            ))
          )}
        </TBody>
      </Table>

      {creating ? (
        <CreateUserDialog onClose={() => setCreating(false)} />
      ) : null}
      {approve ? (
        <ApproveDialog
          user={approve}
          clients={clients}
          onClose={() => setApprove(null)}
        />
      ) : null}
      {reset ? (
        <ResetDialog user={reset} onClose={() => setReset(null)} />
      ) : null}
    </div>
  );
}

function UserRowView({
  user,
  onApprove,
  onReset,
}: {
  user: UserRow;
  onApprove: () => void;
  onReset: () => void;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const isPendingClient = user.role === "client" && !user.active;

  const toggleActive = async () => {
    setBusy(true);
    await setUserActive(user.id, !user.active);
    setBusy(false);
    router.refresh();
  };

  return (
    <TR>
      <TD className="font-medium">{user.full_name ?? "—"}</TD>
      <TD className="text-sm text-muted-foreground">{user.email ?? "—"}</TD>
      <TD>
        <Badge variant={user.role === "admin" ? "navy" : "default"}>
          {ROLE_LABELS[user.role as Role] ?? user.role}
        </Badge>
      </TD>
      <TD className="text-sm">
        {user.client_name ?? (user.role === "client" ? "—" : "")}
      </TD>
      <TD>
        {user.active ? (
          <Badge variant="success">Active</Badge>
        ) : (
          <Badge variant="warning">{isPendingClient ? "Pending" : "Inactive"}</Badge>
        )}
      </TD>
      <TD className="text-right">
        <div className="flex justify-end gap-1.5">
          {isPendingClient ? (
            <Button size="sm" variant="outline" onClick={onApprove}>
              Approve
            </Button>
          ) : (
            <Button
              size="sm"
              variant="outline"
              disabled={busy}
              onClick={toggleActive}
            >
              {user.active ? "Deactivate" : "Activate"}
            </Button>
          )}
          <Button size="sm" variant="ghost" onClick={onReset} title="Reset password">
            <KeyRound className="h-4 w-4" />
          </Button>
        </div>
      </TD>
    </TR>
  );
}

function CreateUserDialog({ onClose }: { onClose: () => void }) {
  const router = useRouter();
  const [form, setForm] = useState({
    full_name: "",
    email: "",
    password: "",
    role: "operations" as Role,
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    setSaving(true);
    setError(null);
    const res = await createStaffUser(form);
    setSaving(false);
    if (res.error) return setError(res.error);
    onClose();
    router.refresh();
  };

  return (
    <Dialog open onClose={onClose} title="Create user">
      <div className="space-y-3">
        <div className="space-y-1.5">
          <Label>Full name</Label>
          <Input
            value={form.full_name}
            onChange={(e) => setForm({ ...form, full_name: e.target.value })}
          />
        </div>
        <div className="space-y-1.5">
          <Label>Email</Label>
          <Input
            type="email"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
          />
        </div>
        <div className="space-y-1.5">
          <Label>Temporary password</Label>
          <Input
            type="text"
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            placeholder="At least 8 characters"
          />
        </div>
        <div className="space-y-1.5">
          <Label>Role</Label>
          <Select
            value={form.role}
            onChange={(e) =>
              setForm({ ...form, role: e.target.value as Role })
            }
          >
            {STAFF_ROLES.map((r) => (
              <option key={r} value={r}>
                {ROLE_LABELS[r]}
              </option>
            ))}
          </Select>
          <p className="text-xs text-muted-foreground">
            Clients sign up themselves and are approved here — create staff
            accounts only.
          </p>
        </div>
        {error ? (
          <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {error}
          </p>
        ) : null}
        <div className="flex justify-end gap-2 pt-1">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="button" disabled={saving} onClick={submit}>
            {saving ? "Creating…" : "Create user"}
          </Button>
        </div>
      </div>
    </Dialog>
  );
}

function ApproveDialog({
  user,
  clients,
  onClose,
}: {
  user: UserRow;
  clients: Lookup[];
  onClose: () => void;
}) {
  const router = useRouter();
  const [choice, setChoice] = useState<string>("__new__");
  const [newCompany, setNewCompany] = useState(user.company_name ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    setSaving(true);
    setError(null);
    const res = await approveClient(user.id, {
      clientId: choice === "__new__" ? undefined : choice,
      newCompanyName: choice === "__new__" ? newCompany : undefined,
    });
    setSaving(false);
    if (res.error) return setError(res.error);
    onClose();
    router.refresh();
  };

  return (
    <Dialog open onClose={onClose} title={`Approve ${user.full_name ?? "client"}`}>
      <div className="space-y-3">
        <p className="text-sm text-muted-foreground">
          {user.email}
          {user.company_name ? ` · requested company: ${user.company_name}` : ""}
        </p>
        <div className="space-y-1.5">
          <Label>Link to company</Label>
          <Select value={choice} onChange={(e) => setChoice(e.target.value)}>
            <option value="__new__">+ Create a new company…</option>
            {clients.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </Select>
        </div>
        {choice === "__new__" ? (
          <div className="space-y-1.5">
            <Label>New company name</Label>
            <Input
              value={newCompany}
              onChange={(e) => setNewCompany(e.target.value)}
              placeholder="Company name"
            />
          </div>
        ) : null}
        {error ? (
          <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {error}
          </p>
        ) : null}
        <div className="flex justify-end gap-2 pt-1">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="button" disabled={saving} onClick={submit}>
            {saving ? "Approving…" : "Approve & activate"}
          </Button>
        </div>
      </div>
    </Dialog>
  );
}

function ResetDialog({
  user,
  onClose,
}: {
  user: UserRow;
  onClose: () => void;
}) {
  const [password, setPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const submit = async () => {
    setSaving(true);
    setError(null);
    const res = await resetUserPassword(user.id, password);
    setSaving(false);
    if (res.error) return setError(res.error);
    setDone(true);
  };

  return (
    <Dialog open onClose={onClose} title={`Reset password — ${user.email}`}>
      <div className="space-y-3">
        {done ? (
          <p className="rounded-md bg-green-100 px-3 py-2 text-sm text-green-800">
            Password updated. Share the new password with the user securely.
          </p>
        ) : (
          <>
            <div className="space-y-1.5">
              <Label>New password</Label>
              <Input
                type="text"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="At least 8 characters"
              />
            </div>
            {error ? (
              <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {error}
              </p>
            ) : null}
          </>
        )}
        <div className="flex justify-end gap-2 pt-1">
          <Button type="button" variant="outline" onClick={onClose}>
            {done ? "Close" : "Cancel"}
          </Button>
          {!done ? (
            <Button type="button" disabled={saving} onClick={submit}>
              {saving ? "Saving…" : "Set password"}
            </Button>
          ) : null}
        </div>
      </div>
    </Dialog>
  );
}
