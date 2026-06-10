"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/auth";
import { truckSchema, driverSchema, supplierSchema } from "@/lib/validation";

type Result = { error?: string };

async function db() {
  await requireRole(["admin"]);
  return createClient();
}

const nowIso = () => new Date().toISOString();

// --- Trucks -------------------------------------------------------------------
export async function saveTruck(input: unknown, id?: string): Promise<Result> {
  const parsed = truckSchema.safeParse(input);
  if (!parsed.success)
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  const supabase = await db();
  const { error } = id
    ? await supabase.from("trucks").update(parsed.data).eq("id", id)
    : await supabase.from("trucks").insert(parsed.data);
  if (error) return { error: error.message };
  revalidatePath("/fleet");
  return {};
}

export async function deleteTruck(id: string): Promise<Result> {
  const supabase = await db();
  const { error } = await supabase
    .from("trucks")
    .update({ deleted_at: nowIso(), is_active: false })
    .eq("id", id);
  if (error) return { error: error.message };
  revalidatePath("/fleet");
  return {};
}

// --- Drivers ------------------------------------------------------------------
export async function saveDriver(input: unknown, id?: string): Promise<Result> {
  const parsed = driverSchema.safeParse(input);
  if (!parsed.success)
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  const supabase = await db();
  const { error } = id
    ? await supabase.from("drivers").update(parsed.data).eq("id", id)
    : await supabase.from("drivers").insert(parsed.data);
  if (error) return { error: error.message };
  revalidatePath("/fleet");
  return {};
}

export async function deleteDriver(id: string): Promise<Result> {
  const supabase = await db();
  const { error } = await supabase
    .from("drivers")
    .update({ deleted_at: nowIso(), is_active: false })
    .eq("id", id);
  if (error) return { error: error.message };
  revalidatePath("/fleet");
  return {};
}

// --- Suppliers (+ truck types) ------------------------------------------------
export async function saveSupplier(
  input: unknown,
  id?: string,
): Promise<Result> {
  const parsed = supplierSchema.safeParse(input);
  if (!parsed.success)
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  const supabase = await db();
  const { truck_type_ids, ...core } = parsed.data;

  let supplierId = id;
  if (id) {
    const { error } = await supabase.from("suppliers").update(core).eq("id", id);
    if (error) return { error: error.message };
  } else {
    const { data, error } = await supabase
      .from("suppliers")
      .insert(core)
      .select("id")
      .single();
    if (error) return { error: error.message };
    supplierId = data.id;
  }

  if (supplierId) {
    await supabase
      .from("supplier_truck_types")
      .delete()
      .eq("supplier_id", supplierId);
    if (truck_type_ids.length > 0) {
      const rows = truck_type_ids.map((tt) => ({
        supplier_id: supplierId!,
        truck_type_id: tt,
      }));
      const { error } = await supabase
        .from("supplier_truck_types")
        .insert(rows);
      if (error) return { error: error.message };
    }
  }
  revalidatePath("/fleet");
  return {};
}

export async function deleteSupplier(id: string): Promise<Result> {
  const supabase = await db();
  const { error } = await supabase
    .from("suppliers")
    .update({ deleted_at: nowIso(), is_active: false })
    .eq("id", id);
  if (error) return { error: error.message };
  revalidatePath("/fleet");
  return {};
}
