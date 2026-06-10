"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/auth";
import {
  clientSchema,
  contactSchema,
  locationSchema,
  contractRateSchema,
} from "@/lib/validation";

type Result = { error?: string };

async function db() {
  await requireRole(["admin"]); // master-data writes are admin-only (matches RLS)
  return createClient();
}

// --- Client core --------------------------------------------------------------
export async function saveClient(
  input: unknown,
  id?: string,
): Promise<Result> {
  const parsed = clientSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const supabase = await db();
  const values = parsed.data;

  if (id) {
    const { error } = await supabase
      .from("clients")
      .update(values)
      .eq("id", id);
    if (error) return { error: error.message };
  } else {
    const { error } = await supabase.from("clients").insert(values);
    if (error) return { error: error.message };
  }
  revalidatePath("/clients");
  if (id) revalidatePath(`/clients/${id}`);
  return {};
}

export async function setClientActive(
  id: string,
  is_active: boolean,
): Promise<Result> {
  const supabase = await db();
  const { error } = await supabase
    .from("clients")
    .update({ is_active })
    .eq("id", id);
  if (error) return { error: error.message };
  revalidatePath("/clients");
  revalidatePath(`/clients/${id}`);
  return {};
}

export async function deleteClient(id: string): Promise<Result> {
  const supabase = await db();
  // soft delete: keep history, free the code via partial unique index
  const { error } = await supabase
    .from("clients")
    .update({ deleted_at: new Date().toISOString(), is_active: false })
    .eq("id", id);
  if (error) return { error: error.message };
  revalidatePath("/clients");
  return {};
}

// --- Contacts -----------------------------------------------------------------
export async function saveContact(
  clientId: string,
  input: unknown,
  id?: string,
): Promise<Result> {
  const parsed = contactSchema.safeParse(input);
  if (!parsed.success)
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  const supabase = await db();
  const values = { ...parsed.data, client_id: clientId };
  const { error } = id
    ? await supabase.from("client_contacts").update(values).eq("id", id)
    : await supabase.from("client_contacts").insert(values);
  if (error) return { error: error.message };
  revalidatePath(`/clients/${clientId}`);
  return {};
}

export async function deleteContact(
  clientId: string,
  id: string,
): Promise<Result> {
  const supabase = await db();
  const { error } = await supabase
    .from("client_contacts")
    .delete()
    .eq("id", id);
  if (error) return { error: error.message };
  revalidatePath(`/clients/${clientId}`);
  return {};
}

// --- Locations ----------------------------------------------------------------
export async function saveLocation(
  clientId: string,
  input: unknown,
  id?: string,
): Promise<Result> {
  const parsed = locationSchema.safeParse(input);
  if (!parsed.success)
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  const supabase = await db();
  const values = { ...parsed.data, client_id: clientId };
  const { error } = id
    ? await supabase.from("locations").update(values).eq("id", id)
    : await supabase.from("locations").insert(values);
  if (error) return { error: error.message };
  revalidatePath(`/clients/${clientId}`);
  return {};
}

export async function deleteLocation(
  clientId: string,
  id: string,
): Promise<Result> {
  const supabase = await db();
  const { error } = await supabase
    .from("locations")
    .update({ deleted_at: new Date().toISOString(), is_active: false })
    .eq("id", id);
  if (error) return { error: error.message };
  revalidatePath(`/clients/${clientId}`);
  return {};
}

// --- Contract rates -----------------------------------------------------------
export async function saveRate(
  clientId: string,
  input: unknown,
  id?: string,
): Promise<Result> {
  const parsed = contractRateSchema.safeParse(input);
  if (!parsed.success)
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  const supabase = await db();
  const values = { ...parsed.data, client_id: clientId };
  const { error } = id
    ? await supabase.from("contract_rates").update(values).eq("id", id)
    : await supabase.from("contract_rates").insert(values);
  if (error) return { error: error.message };
  revalidatePath(`/clients/${clientId}`);
  return {};
}

export async function deleteRate(
  clientId: string,
  id: string,
): Promise<Result> {
  const supabase = await db();
  const { error } = await supabase
    .from("contract_rates")
    .delete()
    .eq("id", id);
  if (error) return { error: error.message };
  revalidatePath(`/clients/${clientId}`);
  return {};
}
