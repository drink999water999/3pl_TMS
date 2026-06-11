"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";

type Result = { error?: string };
const STATUSES = ["unbilled", "invoiced", "paid"] as const;

export async function setPaymentStatus(
  waybillId: string,
  status: string,
  invoiceNo: string,
): Promise<Result> {
  await requireRole(["admin", "finance"]);
  if (!STATUSES.includes(status as (typeof STATUSES)[number]))
    return { error: "Invalid payment status." };

  const admin = createAdminClient();
  const { error } = await admin
    .from("waybill_billing")
    .update({
      payment_status: status,
      invoice_no: invoiceNo.trim() || null,
      paid_at: status === "paid" ? new Date().toISOString() : null,
    })
    .eq("waybill_id", waybillId);
  if (error) return { error: error.message };

  revalidatePath("/finance");
  return {};
}
