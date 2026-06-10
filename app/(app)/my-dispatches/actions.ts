"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/auth";
import { nextDispatchStatus, type DispatchStatus } from "@/lib/dispatch";

type Result = { error?: string };

// A driver advances their OWN dispatch. RLS (disp_driver_update) guarantees they
// can only touch dispatches assigned to them; the version check prevents clobber.
export async function driverAdvanceDispatch(
  id: string,
  expected: DispatchStatus,
  version: number,
): Promise<Result> {
  const to = nextDispatchStatus(expected);
  if (!to) return { error: "This delivery is already complete." };

  const { profile } = await requireRole(["driver"]);
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("dispatches")
    .update({ status: to, updated_by: profile.id })
    .eq("id", id)
    .eq("status", expected)
    .eq("version", version)
    .select("id");
  // Delivered is blocked by the DB until a POD exists — that error surfaces here.
  if (error) return { error: error.message };
  if (!data || data.length === 0)
    return { error: "This delivery changed — pull to refresh and retry." };

  revalidatePath("/my-dispatches");
  return {};
}
