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
  // Upsert: a billing row may not exist yet for an unpriced waybill, so create
  // one on first payment-status change instead of silently updating 0 rows.
  const { error } = await admin.from("waybill_billing").upsert(
    {
      waybill_id: waybillId,
      payment_status: status,
      invoice_no: invoiceNo.trim() || null,
      paid_at: status === "paid" ? new Date().toISOString() : null,
    },
    { onConflict: "waybill_id" },
  );
  if (error) return { error: error.message };

  revalidatePath("/finance");
  return {};
}
