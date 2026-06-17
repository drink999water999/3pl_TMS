"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/auth";
import {
  citySchema,
  routeSchema,
  serviceTypeSchema,
  standardRateSchema,
  truckTypeSchema,
} from "@/lib/validation";

type Result = { error?: string };

async function db() {
  await requireRole(["admin"]);
  return createClient();
}

const nowIso = () => new Date().toISOString();

function paths() {
  // Setup data feeds clients, suppliers, requests and dispatch.
  for (const p of ["/setup", "/clients", "/fleet", "/requests", "/dispatch"]) {
    revalidatePath(p);
  }
}

// --- Cities -------------------------------------------------------------------
export async function saveCity(input: unknown, id?: string): Promise<Result> {
  const parsed = citySchema.safeParse(input);
  if (!parsed.success)
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  const supabase = await db();
  const { error } = id
    ? await supabase.from("cities").update(parsed.data).eq("id", id)
    : await supabase.from("cities").insert(parsed.data);
  if (error) return { error: error.message };
  paths();
  return {};
}

export async function deleteCity(id: string): Promise<Result> {
  const supabase = await db();
  const { error } = await supabase
    .from("cities")
    .update({ deleted_at: nowIso(), is_active: false })
    .eq("id", id);
  if (error) return { error: error.message };
  paths();
  return {};
}

// --- Routes -------------------------------------------------------------------
export async function saveRoute(input: unknown, id?: string): Promise<Result> {
  const parsed = routeSchema.safeParse(input);
  if (!parsed.success)
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  if (parsed.data.from_city_id === parsed.data.to_city_id)
    return { error: "Origin and destination must differ" };
  const supabase = await db();
  const { error } = id
    ? await supabase.from("routes").update(parsed.data).eq("id", id)
    : await supabase.from("routes").insert(parsed.data);
  if (error) return { error: error.message };
  paths();
  return {};
}

export async function deleteRoute(id: string): Promise<Result> {
  const supabase = await db();
  const { error } = await supabase
    .from("routes")
    .update({ deleted_at: nowIso(), is_active: false })
    .eq("id", id);
  if (error) return { error: error.message };
  paths();
  return {};
}

// --- Truck types (physical vehicles; used by fleet + dispatch) ----------------
export async function saveTruckType(
  input: unknown,
  id?: string,
): Promise<Result> {
  const parsed = truckTypeSchema.safeParse(input);
  if (!parsed.success)
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  const supabase = await db();
  const { error } = id
    ? await supabase.from("truck_types").update(parsed.data).eq("id", id)
    : await supabase.from("truck_types").insert(parsed.data);
  if (error) return { error: error.message };
  paths();
  return {};
}

export async function deleteTruckType(id: string): Promise<Result> {
  const supabase = await db();
  const { error } = await supabase
    .from("truck_types")
    .update({ deleted_at: nowIso(), is_active: false })
    .eq("id", id);
  if (error) return { error: error.message };
  paths();
  return {};
}

// --- Service types ------------------------------------------------------------
export async function saveServiceType(
  input: unknown,
  id?: string,
): Promise<Result> {
  const parsed = serviceTypeSchema.safeParse(input);
  if (!parsed.success)
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  const supabase = await db();
  const { error } = id
    ? await supabase.from("service_types").update(parsed.data).eq("id", id)
    : await supabase.from("service_types").insert(parsed.data);
  if (error) return { error: error.message };
  paths();
  return {};
}

export async function deleteServiceType(id: string): Promise<Result> {
  const supabase = await db();
  const { error } = await supabase
    .from("service_types")
    .update({ deleted_at: nowIso(), is_active: false })
    .eq("id", id);
  if (error) return { error: error.message };
  paths();
  return {};
}

// --- Standard rates (Rate Page) -----------------------------------------------
export async function saveStandardRate(
  input: unknown,
  id?: string,
): Promise<Result> {
  const parsed = standardRateSchema.safeParse(input);
  if (!parsed.success)
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  const supabase = await db();
  const { error } = id
    ? await supabase.from("standard_rates").update(parsed.data).eq("id", id)
    : await supabase.from("standard_rates").insert(parsed.data);
  if (error) return { error: error.message };
  paths();
  return {};
}

export async function deleteStandardRate(id: string): Promise<Result> {
  const supabase = await db();
  const { error } = await supabase
    .from("standard_rates")
    .update({ deleted_at: nowIso(), is_active: false })
    .eq("id", id);
  if (error) return { error: error.message };
  paths();
  return {};
}
