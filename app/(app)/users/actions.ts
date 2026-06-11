"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { staffUserSchema, passwordSchema } from "@/lib/validation";
import type { Role } from "@/lib/types";

type Result = { error?: string };

async function adminOnly() {
  await requireRole(["admin"]);
}

function slugCode(name: string) {
  const base =
    name
      .toUpperCase()
      .replace(/[^A-Z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 10) || "CLIENT";
  return `${base}-${Date.now().toString(36).slice(-4).toUpperCase()}`;
}

// Create a staff (non-client) user directly — admin only.
export async function createStaffUser(input: unknown): Promise<Result> {
  await adminOnly();
  const parsed = staffUserSchema.safeParse(input);
  if (!parsed.success)
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  const { email, full_name, password, role } = parsed.data;

  const admin = createAdminClient();
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name },
  });
  if (error) return { error: error.message };

  // The signup trigger creates a pending client profile; promote it.
  const { error: pErr } = await admin
    .from("profiles")
    .update({ full_name, role, active: true })
    .eq("id", data.user.id);
  if (pErr) return { error: pErr.message };

  revalidatePath("/users");
  return {};
}

// Approve a pending client: link to an existing company or create a new one.
export async function approveClient(
  profileId: string,
  opts: { clientId?: string; newCompanyName?: string },
): Promise<Result> {
  await adminOnly();
  const admin = createAdminClient();

  let clientId = opts.clientId?.trim() || null;
  const newName = opts.newCompanyName?.trim();
  if (!clientId && newName) {
    const { data: c, error: cErr } = await admin
      .from("clients")
      .insert({ name: newName, code: slugCode(newName) })
      .select("id")
      .single();
    if (cErr) return { error: cErr.message };
    clientId = c.id;
  }
  if (!clientId)
    return { error: "Pick an existing company or enter a new company name." };

  const { error } = await admin
    .from("profiles")
    .update({ client_id: clientId, role: "client", active: true })
    .eq("id", profileId);
  if (error) return { error: error.message };

  revalidatePath("/users");
  return {};
}

export async function setUserActive(
  profileId: string,
  active: boolean,
): Promise<Result> {
  await adminOnly();
  const admin = createAdminClient();
  const { error } = await admin
    .from("profiles")
    .update({ active })
    .eq("id", profileId);
  if (error) return { error: error.message };
  revalidatePath("/users");
  return {};
}

export async function setUserRole(
  profileId: string,
  role: Role,
): Promise<Result> {
  await adminOnly();
  const admin = createAdminClient();
  const { error } = await admin
    .from("profiles")
    .update({ role })
    .eq("id", profileId);
  if (error) return { error: error.message };
  revalidatePath("/users");
  return {};
}

export async function resetUserPassword(
  userId: string,
  password: string,
): Promise<Result> {
  await adminOnly();
  const parsed = passwordSchema.safeParse(password);
  if (!parsed.success)
    return { error: parsed.error.issues[0]?.message ?? "Invalid password" };
  const admin = createAdminClient();
  const { error } = await admin.auth.admin.updateUserById(userId, { password });
  if (error) return { error: error.message };
  return {};
}
