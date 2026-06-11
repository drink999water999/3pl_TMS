"use server";

import { revalidatePath } from "next/cache";
import { renderToBuffer } from "@react-pdf/renderer";
import { Resend } from "resend";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { priceWaybill } from "@/lib/pricing-server";
import { requireRole } from "@/lib/auth";
import { APP_NAME } from "@/lib/constants";
import { waybillDocument } from "@/lib/waybill-document";

type Result = { error?: string };
type SupabaseServer = Awaited<ReturnType<typeof createClient>>;

const nowIso = () => new Date().toISOString();

// Waybill writes (approve / generate / email) are Admin / Dispatch.
async function ctx() {
  const { profile } = await requireRole(["admin", "dispatch"]);
  const supabase = await createClient();
  return { supabase, uid: profile.id };
}

// Render the waybill from its snapshot + items and store it in the private
// 'waybills' bucket, recording the path in waybill_pdfs.
async function buildAndStorePdf(
  supabase: SupabaseServer,
  waybillId: string,
): Promise<Result> {
  const { data: wb } = await supabase
    .from("waybills")
    .select("*")
    .eq("id", waybillId)
    .maybeSingle();
  if (!wb) return { error: "Waybill not found." };

  const { data: items } = await supabase
    .from("request_items")
    .select("*")
    .eq("request_id", wb.request_id)
    .order("created_at");

  const buffer = await renderToBuffer(
    waybillDocument({ waybill: wb, items: items ?? [], appName: APP_NAME }),
  );

  const path = `${waybillId}/${wb.waybill_no}.pdf`;
  const { error: upErr } = await supabase.storage
    .from("waybills")
    .upload(path, buffer, { contentType: "application/pdf", upsert: true });
  if (upErr) return { error: upErr.message };

  await supabase.from("waybill_pdfs").delete().eq("waybill_id", waybillId);
  const { error: insErr } = await supabase.from("waybill_pdfs").insert({
    waybill_id: waybillId,
    storage_path: path,
    file_name: `${wb.waybill_no}.pdf`,
  });
  if (insErr) return { error: insErr.message };
  return {};
}

export async function approveWaybill(id: string): Promise<Result> {
  const { supabase, uid } = await ctx();

  // A waybill cannot go out without a freight amount.
  const { data: priced } = await supabase
    .from("waybills")
    .select("freight_amount")
    .eq("id", id)
    .maybeSingle();
  if (!priced || priced.freight_amount == null || priced.freight_amount <= 0)
    return {
      error:
        "This waybill has no freight amount yet. Set the client's pricing (or a carrier cost) and Recalculate the price before approving.",
    };

  const { data, error } = await supabase
    .from("waybills")
    .update({ status: "approved", approved_by: uid, approved_at: nowIso() })
    .eq("id", id)
    .eq("status", "draft")
    .select("id");
  if (error) return { error: error.message };
  if (!data || data.length === 0)
    return { error: "Waybill is already approved or was changed — refresh." };

  const pdf = await buildAndStorePdf(supabase, id);
  if (pdf.error)
    return { error: `Approved, but PDF generation failed: ${pdf.error}` };

  revalidatePath("/waybills");
  revalidatePath(`/waybills/${id}`);
  return {};
}

export async function regenerateWaybillPdf(id: string): Promise<Result> {
  const { supabase } = await ctx();
  const res = await buildAndStorePdf(supabase, id);
  if (res.error) return res;
  revalidatePath(`/waybills/${id}`);
  return {};
}

// Read access for download. Staff and the owning client. RLS on `waybills`
// authorizes the caller; storage IO runs through the service role so clients
// (no storage RLS grant) can still fetch their own PDF.
export async function getWaybillPdfUrl(
  id: string,
): Promise<{ url?: string; error?: string }> {
  await requireRole(["admin", "operations", "dispatch", "client"]);
  const supabase = await createClient();

  const { data: wb } = await supabase
    .from("waybills")
    .select("id")
    .eq("id", id)
    .maybeSingle();
  if (!wb) return { error: "Waybill not found." };

  const admin = createAdminClient();
  const { data: rec } = await admin
    .from("waybill_pdfs")
    .select("storage_path")
    .eq("waybill_id", id)
    .order("generated_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!rec?.storage_path)
    return { error: "No PDF yet — approve the waybill to generate it." };

  const { data, error } = await admin.storage
    .from("waybills")
    .createSignedUrl(rec.storage_path, 120);
  if (error) return { error: error.message };
  return { url: data.signedUrl };
}

// Recompute freight + margin from current data (admin / finance).
export async function recalcWaybillPrice(id: string): Promise<Result> {
  await requireRole(["admin", "finance"]);
  try {
    await priceWaybill(id);
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Could not price waybill." };
  }
  revalidatePath(`/waybills/${id}`);
  return {};
}

// Set carrier cost on the underlying dispatch and re-price (admin / finance).
export async function setWaybillCarrierCost(
  id: string,
  cost: string,
): Promise<Result> {
  await requireRole(["admin", "finance"]);
  const admin = createAdminClient();
  const { data: wb } = await admin
    .from("waybills")
    .select("dispatch_id")
    .eq("id", id)
    .maybeSingle();
  if (!wb) return { error: "Waybill not found." };

  const trimmed = (cost ?? "").trim();
  const value = trimmed === "" ? null : Number(trimmed);
  if (value != null && (Number.isNaN(value) || value < 0))
    return { error: "Enter a valid carrier cost." };

  const { error } = await admin
    .from("dispatches")
    .update({ carrier_cost: value })
    .eq("id", wb.dispatch_id);
  if (error) return { error: error.message };

  try {
    await priceWaybill(id);
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Could not price waybill." };
  }
  revalidatePath(`/waybills/${id}`);
  return {};
}

export async function emailWaybill(id: string, to: string): Promise<Result> {
  await requireRole(["admin", "operations", "dispatch", "client"]);
  const supabase = await createClient();

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey)
    return {
      error:
        "Email isn't configured. Add RESEND_API_KEY and RESEND_FROM_EMAIL to .env.local to enable sending.",
    };

  const email = (to ?? "").trim();
  if (!email) return { error: "Enter a recipient email address." };

  const { data: wb } = await supabase
    .from("waybills")
    .select("waybill_no, client_name")
    .eq("id", id)
    .maybeSingle();
  if (!wb) return { error: "Waybill not found." };

  const admin = createAdminClient();
  const { data: rec } = await admin
    .from("waybill_pdfs")
    .select("storage_path, file_name")
    .eq("waybill_id", id)
    .order("generated_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!rec?.storage_path)
    return { error: "Generate the PDF first by approving the waybill." };

  const { data: file, error: dlErr } = await admin.storage
    .from("waybills")
    .download(rec.storage_path);
  if (dlErr || !file) return { error: dlErr?.message ?? "Could not read the PDF." };
  const content = Buffer.from(await file.arrayBuffer());

  const resend = new Resend(apiKey);
  const from =
    process.env.RESEND_FROM_EMAIL ??
    "FastLane Logistics <onboarding@resend.dev>";
  const { error: sendErr } = await resend.emails.send({
    from,
    to: email,
    subject: `Waybill ${wb.waybill_no}`,
    text: `Please find attached waybill ${wb.waybill_no} for ${
      wb.client_name ?? "your shipment"
    }.`,
    attachments: [
      { filename: rec.file_name ?? `${wb.waybill_no}.pdf`, content },
    ],
  });
  if (sendErr) return { error: sendErr.message };

  revalidatePath(`/waybills/${id}`);
  return {};
}
