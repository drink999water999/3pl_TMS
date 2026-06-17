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

// --- Excel import -------------------------------------------------------------
// Accepts parsed rows (header→value). Upserts clients, matching an existing
// record by EMAIL or PHONE first (these are treated as unique identifiers),
// then by code. Lenient on header casing/spacing. Returns how many rows were
// created vs. updated so the UI can alert the user.
export async function importClients(
  rows: Record<string, string>[],
): Promise<Result & { count?: number; created?: number; updated?: number }> {
  const supabase = await db();
  const norm = (r: Record<string, string>) => {
    const m: Record<string, string> = {};
    for (const [k, v] of Object.entries(r))
      m[k.trim().toLowerCase().replace(/\s+/g, "_")] = (v ?? "").toString().trim();
    return m;
  };
  let created = 0;
  let updated = 0;
  for (const raw of rows) {
    const r = norm(raw);
    const name = r.name || r.client || r.client_name;
    const code = r.code || r.client_code;
    const email = (r.email || "").toLowerCase();
    const phone = r.phone || "";
    if (!name || !code) continue;
    const ct = r.client_type || r.type;
    const values = {
      name,
      code,
      phone: phone || null,
      email: email || null,
      tax_id: r.tax_id || r.taxid || null,
      billing_address: r.billing_address || r.address || null,
      client_type:
        ct && /ware/i.test(ct)
          ? "Warehouse"
          : ct && /trans/i.test(ct)
            ? "Transportation"
            : null,
      multi_location_charge: r.multi_location_charge
        ? Number(r.multi_location_charge) || 0
        : 0,
    };

    // Match an existing client: email > phone > code (all amongst non-deleted).
    let existing: { id: string } | null = null;
    if (email) {
      const { data } = await supabase
        .from("clients")
        .select("id")
        .ilike("email", email)
        .is("deleted_at", null)
        .maybeSingle();
      existing = data ?? null;
    }
    if (!existing && phone) {
      const { data } = await supabase
        .from("clients")
        .select("id")
        .eq("phone", phone)
        .is("deleted_at", null)
        .maybeSingle();
      existing = data ?? null;
    }
    if (!existing) {
      const { data } = await supabase
        .from("clients")
        .select("id")
        .ilike("code", code)
        .is("deleted_at", null)
        .maybeSingle();
      existing = data ?? null;
    }

    if (existing) {
      const { error } = await supabase
        .from("clients")
        .update(values)
        .eq("id", existing.id);
      if (error) return { error: `Row "${name}": ${error.message}`, count: created + updated };
      updated++;
    } else {
      const { error } = await supabase.from("clients").insert(values);
      if (error) return { error: `Row "${name}": ${error.message}`, count: created + updated };
      created++;
    }
  }
  revalidatePath("/clients");
  return { count: created + updated, created, updated };
}
