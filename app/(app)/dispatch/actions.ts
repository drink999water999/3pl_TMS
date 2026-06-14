"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/auth";
import {
  dispatchSchema,
  exceptionSchema,
  podKindSchema,
} from "@/lib/validation";
import { nextDispatchStatus, type DispatchStatus } from "@/lib/dispatch";
import { priceWaybill } from "@/lib/pricing-server";
import type { TablesInsert } from "@/lib/database.types";

type Result = { error?: string };

// Dispatch + execution is Admin / Dispatch only (matches RLS).
async function ctx() {
  const { profile } = await requireRole(["admin", "dispatch"]);
  const supabase = await createClient();
  return { supabase, uid: profile.id };
}

const nowIso = () => new Date().toISOString();

// --- Create a dispatch from an Approved request -------------------------------
export async function createDispatch(
  input: unknown,
): Promise<Result & { id?: string }> {
  const parsed = dispatchSchema.safeParse(input);
  if (!parsed.success)
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  const v = parsed.data;

  const { supabase, uid } = await ctx();

  const { data: req } = await supabase
    .from("transport_requests")
    .select("status")
    .eq("id", v.request_id)
    .maybeSingle();
  if (!req) return { error: "Request not found." };
  if (req.status !== "Approved")
    return { error: "Only approved requests can be dispatched." };

  const { data: existing } = await supabase
    .from("dispatches")
    .select("id")
    .eq("request_id", v.request_id)
    .limit(1);
  if (existing && existing.length > 0)
    return { error: "This request already has a dispatch." };

  let row: TablesInsert<"dispatches">;
  if (v.assignment_type === "own") {
    // Auto-fetch the truck's type so the waybill snapshot is authoritative.
    const { data: truck } = await supabase
      .from("trucks")
      .select("truck_type_id")
      .eq("id", v.truck_id as string)
      .maybeSingle();
    row = {
      request_id: v.request_id,
      assignment_type: "own",
      truck_id: v.truck_id,
      driver_id: v.driver_id,
      truck_type_id: truck?.truck_type_id ?? v.truck_type_id,
      carrier_cost: v.carrier_cost,
      customer_charge: v.customer_charge,
      notes: v.notes,
      created_by: uid,
      updated_by: uid,
    };
  } else {
    row = {
      request_id: v.request_id,
      assignment_type: "outsourced",
      supplier_id: v.supplier_id,
      supplier_truck: v.supplier_truck,
      truck_type_id: v.truck_type_id,
      carrier_cost: v.carrier_cost,
      customer_charge: v.customer_charge,
      notes: v.notes,
      created_by: uid,
      updated_by: uid,
    };
  }

  // Insert triggers: request -> Assigned, own truck -> busy (SECURITY DEFINER).
  const { data, error } = await supabase
    .from("dispatches")
    .insert(row)
    .select("id")
    .single();
  if (error) return { error: error.message };

  revalidatePath("/dispatch");
  revalidatePath("/requests");
  return { id: data.id };
}

// --- Advance one step through the flow (optimistic compare-and-swap) ----------
export async function advanceDispatch(
  id: string,
  expected: DispatchStatus,
  version: number,
): Promise<Result> {
  const to = nextDispatchStatus(expected);
  if (!to) return { error: "This dispatch is already delivered." };

  const { supabase, uid } = await ctx();
  const { data, error } = await supabase
    .from("dispatches")
    .update({ status: to, updated_by: uid })
    .eq("id", id)
    .eq("status", expected)
    .eq("version", version)
    .select("id");
  // The DB blocks Delivered without a POD (Phase 7) — surface that message.
  if (error) return { error: error.message };
  if (!data || data.length === 0)
    return {
      error: "Dispatch was updated by someone else — refresh and retry.",
    };

  // On Dispatched the trigger has just created the waybill — price it now. On
  // Delivered we re-price so a completed shipment always lands in Finance (with
  // a billing row, even if it still needs a price set).
  if (to === "Dispatched" || to === "Delivered") {
    const { data: wb } = await supabase
      .from("waybills")
      .select("id")
      .eq("dispatch_id", id)
      .maybeSingle();
    if (wb) {
      try {
        await priceWaybill(wb.id);
      } catch {
        // Pricing is best-effort; admin/finance can recalc on the waybill.
      }
    }
  }

  revalidatePath("/dispatch");
  revalidatePath(`/dispatch/${id}`);
  revalidatePath("/waybills");
  return {};
}

// --- Pricing: edit carrier cost + customer charge, then re-price waybill ------
export async function setDispatchPricing(
  id: string,
  version: number,
  carrierCost: string,
  customerCharge: string,
): Promise<Result> {
  const { supabase, uid } = await ctx();
  const toNum = (x: string) => {
    const t = (x ?? "").trim();
    if (t === "") return null;
    const n = Number(t);
    return Number.isNaN(n) || n < 0 ? null : n;
  };

  const { data, error } = await supabase
    .from("dispatches")
    .update({
      carrier_cost: toNum(carrierCost),
      customer_charge: toNum(customerCharge),
      updated_by: uid,
    })
    .eq("id", id)
    .eq("version", version)
    .select("id");
  if (error) return { error: error.message };
  if (!data || data.length === 0)
    return { error: "Dispatch changed — refresh and retry." };

  const { data: wb } = await supabase
    .from("waybills")
    .select("id")
    .eq("dispatch_id", id)
    .maybeSingle();
  if (wb) {
    try {
      await priceWaybill(wb.id);
    } catch {
      // best-effort
    }
  }

  revalidatePath(`/dispatch/${id}`);
  revalidatePath("/waybills");
  return {};
}

// --- Issues (flag at any stage; does not move the status flow) -----------------
export async function flagIssue(
  id: string,
  version: number,
  note: string,
): Promise<Result> {
  const trimmed = (note ?? "").trim();
  if (!trimmed) return { error: "Describe the issue." };

  const { supabase, uid } = await ctx();
  const { data, error } = await supabase
    .from("dispatches")
    .update({
      has_issue: true,
      issue_note: trimmed,
      issue_resolved_at: null,
      updated_by: uid,
    })
    .eq("id", id)
    .eq("version", version)
    .select("id");
  if (error) return { error: error.message };
  if (!data || data.length === 0)
    return { error: "Dispatch changed — refresh and retry." };

  revalidatePath("/dispatch");
  revalidatePath(`/dispatch/${id}`);
  return {};
}

export async function resolveIssue(
  id: string,
  version: number,
): Promise<Result> {
  const { supabase, uid } = await ctx();
  const { data, error } = await supabase
    .from("dispatches")
    .update({ has_issue: false, issue_resolved_at: nowIso(), updated_by: uid })
    .eq("id", id)
    .eq("version", version)
    .select("id");
  if (error) return { error: error.message };
  if (!data || data.length === 0)
    return { error: "Dispatch changed — refresh and retry." };

  revalidatePath("/dispatch");
  revalidatePath(`/dispatch/${id}`);
  return {};
}

// --- Proof of delivery --------------------------------------------------------
// Office (admin/dispatch) and drivers (own dispatch, enforced by RLS) can add a
// POD. A file is optional for a signed note but required for a photo. Once any
// POD row exists, the DB lets the dispatch be marked Delivered.
export async function uploadPod(formData: FormData): Promise<Result> {
  const { profile } = await requireRole(["admin", "dispatch", "driver"]);
  const supabase = await createClient();

  const dispatchId = String(formData.get("dispatch_id") ?? "");
  if (!dispatchId) return { error: "Missing dispatch." };
  const kindParse = podKindSchema.safeParse(formData.get("kind"));
  if (!kindParse.success) return { error: "Choose a POD type." };
  const kind = kindParse.data;
  const note = String(formData.get("note") ?? "").trim();
  const file = formData.get("file");

  let storagePath: string | null = null;
  if (file instanceof File && file.size > 0) {
    const ext = file.name.includes(".")
      ? file.name.split(".").pop()
      : "bin";
    storagePath = `${dispatchId}/${crypto.randomUUID()}.${ext}`;
    const bytes = Buffer.from(await file.arrayBuffer());
    const { error: upErr } = await supabase.storage
      .from("pods")
      .upload(storagePath, bytes, {
        contentType: file.type || "application/octet-stream",
        upsert: false,
      });
    if (upErr) return { error: upErr.message };
  }

  if (kind === "photo" && !storagePath)
    return { error: "A photo POD needs an image file." };
  if (!storagePath && !note)
    return { error: "Attach a file or write a note." };

  const { error } = await supabase.from("pods").insert({
    dispatch_id: dispatchId,
    kind,
    storage_path: storagePath,
    note: note || null,
    uploaded_by: profile.id,
  });
  if (error) return { error: error.message };

  revalidatePath(`/dispatch/${dispatchId}`);
  revalidatePath("/my-dispatches");
  return {};
}

// --- Exceptions (delay / damage / complaint) ----------------------------------
export async function addException(
  dispatchId: string,
  requestId: string,
  input: unknown,
): Promise<Result> {
  const parsed = exceptionSchema.safeParse(input);
  if (!parsed.success)
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };

  const { profile } = await requireRole(["admin", "operations", "dispatch"]);
  const supabase = await createClient();
  const { error } = await supabase.from("exceptions").insert({
    dispatch_id: dispatchId,
    request_id: requestId,
    kind: parsed.data.kind,
    description: parsed.data.description,
    reported_by: profile.id,
  });
  if (error) return { error: error.message };
  revalidatePath(`/dispatch/${dispatchId}`);
  return {};
}

export async function resolveException(
  dispatchId: string,
  id: string,
): Promise<Result> {
  await requireRole(["admin", "operations", "dispatch"]);
  const supabase = await createClient();
  const { error } = await supabase
    .from("exceptions")
    .update({ resolved_at: nowIso() })
    .eq("id", id);
  if (error) return { error: error.message };
  revalidatePath(`/dispatch/${dispatchId}`);
  return {};
}

// --- Close shipment → ready for billing (after Delivered) ---------------------
export async function closeShipment(
  id: string,
  version: number,
): Promise<Result> {
  const { supabase, uid } = await ctx();
  const { data, error } = await supabase
    .from("dispatches")
    .update({ ready_for_billing: true, closed_at: nowIso(), updated_by: uid })
    .eq("id", id)
    .eq("status", "Delivered")
    .eq("version", version)
    .select("id");
  if (error) return { error: error.message };
  if (!data || data.length === 0)
    return {
      error: "Only a delivered shipment can be closed — refresh and retry.",
    };

  // Ensure the billing row is current now that the shipment is closed.
  const { data: wb } = await supabase
    .from("waybills")
    .select("id")
    .eq("dispatch_id", id)
    .maybeSingle();
  if (wb) {
    try {
      await priceWaybill(wb.id);
    } catch {
      // best-effort
    }
  }

  revalidatePath("/dispatch");
  revalidatePath(`/dispatch/${id}`);
  revalidatePath("/finance");
  return {};
}
