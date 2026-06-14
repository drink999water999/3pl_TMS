"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/auth";
import { nextDispatchStatus, type DispatchStatus } from "@/lib/dispatch";
import { priceWaybill } from "@/lib/pricing-server";

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

  // When the driver completes delivery, make sure Finance picks it up.
  if (to === "Delivered") {
    const { data: wb } = await supabase
      .from("waybills")
      .select("id")
      .eq("dispatch_id", id)
      .maybeSingle();
    if (wb) {
      try {
        await priceWaybill(wb.id);
      } catch {
        // best-effort; admin/finance can recalc on the waybill.
      }
    }
  }

  revalidatePath("/my-dispatches");
  return {};
}
