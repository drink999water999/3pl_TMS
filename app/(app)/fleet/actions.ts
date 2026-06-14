"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/auth";
import {
  truckSchema,
  driverSchema,
  supplierSchema,
  driverLoginSchema,
} from "@/lib/validation";
import { createAdminClient } from "@/lib/supabase/admin";

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


// --- Driver login provisioning (the "driver gate") ----------------------------
// Admin creates an app login for a driver and links it to the driver record, so
// the driver can sign in and see only their own dispatches (/my-dispatches) and
// progress them through to Delivered with proof of delivery.
export async function createDriverLogin(
  driverId: string,
  input: unknown,
): Promise<Result> {
  await requireRole(["admin"]);
  const parsed = driverLoginSchema.safeParse(input);
  if (!parsed.success)
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  const { email, password } = parsed.data;

  const admin = createAdminClient();

  const { data: driver } = await admin
    .from("drivers")
    .select("id, name, user_id")
    .eq("id", driverId)
    .maybeSingle();
  if (!driver) return { error: "Driver not found." };
  if (driver.user_id)
    return { error: "This driver already has a login." };

  // Create the auth user (email pre-confirmed so they can sign in immediately).
  const { data: created, error: cErr } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: driver.name },
  });
  if (cErr) return { error: cErr.message };
  const userId = created.user.id;

  // The signup trigger makes a pending client profile — promote it to driver.
  // driver_id is the key link: current_driver_id() (used by every driver RLS
  // policy) reads profiles.driver_id, so without it the driver sees nothing.
  const { error: pErr } = await admin
    .from("profiles")
    .update({
      full_name: driver.name,
      role: "driver",
      active: true,
      driver_id: driverId,
    })
    .eq("id", userId);
  if (pErr) return { error: pErr.message };

  // Link the login to the driver record.
  const { error: lErr } = await admin
    .from("drivers")
    .update({ user_id: userId })
    .eq("id", driverId);
  if (lErr) return { error: lErr.message };

  revalidatePath("/fleet");
  return {};
}

// Unlink a driver's login (revokes their access; keeps the driver record).
export async function unlinkDriverLogin(driverId: string): Promise<Result> {
  await requireRole(["admin"]);
  const admin = createAdminClient();

  const { data: driver } = await admin
    .from("drivers")
    .select("user_id")
    .eq("id", driverId)
    .maybeSingle();
  if (!driver?.user_id) return { error: "No login linked to this driver." };

  // Deactivate the profile + drop the driver link so the account can no longer
  // sign in or resolve to a driver.
  await admin
    .from("profiles")
    .update({ active: false, driver_id: null })
    .eq("id", driver.user_id);

  const { error } = await admin
    .from("drivers")
    .update({ user_id: null })
    .eq("id", driverId);
  if (error) return { error: error.message };

  revalidatePath("/fleet");
  return {};
}

// Reset a driver's login password.
export async function resetDriverPassword(
  driverId: string,
  password: string,
): Promise<Result> {
  await requireRole(["admin"]);
  if (!password || password.length < 8)
    return { error: "Password must be at least 8 characters." };
  const admin = createAdminClient();
  const { data: driver } = await admin
    .from("drivers")
    .select("user_id")
    .eq("id", driverId)
    .maybeSingle();
  if (!driver?.user_id) return { error: "No login linked to this driver." };
  const { error } = await admin.auth.admin.updateUserById(driver.user_id, {
    password,
  });
  if (error) return { error: error.message };
  return {};
}
