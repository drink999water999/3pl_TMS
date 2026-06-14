"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/auth";
import { requestSchema, requestItemSchema } from "@/lib/validation";

type Result = { error?: string };

// Operations + Admin manage all requests; clients manage their own (RLS scopes
// every client query to their linked company).
async function staffCtx() {
  const { profile } = await requireRole(["admin", "operations", "client"]);
  const supabase = await createClient();
  return {
    supabase,
    uid: profile.id,
    role: profile.role,
    clientId: profile.client_id,
  };
}

// Approve / reject is a manager action — Admin only.
async function adminCtx() {
  const { profile } = await requireRole(["admin"]);
  const supabase = await createClient();
  return { supabase, uid: profile.id };
}

const nowIso = () => new Date().toISOString();

// --- Create / edit ------------------------------------------------------------
export async function createRequest(
  input: unknown,
  items: unknown[],
): Promise<Result & { id?: string }> {
  const parsed = requestSchema.safeParse(input);
  if (!parsed.success)
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };

  const parsedItems = [];
  for (const raw of items ?? []) {
    const r = requestItemSchema.safeParse(raw);
    if (!r.success)
      return { error: r.error.issues[0]?.message ?? "Invalid item" };
    parsedItems.push(r.data);
  }

  const { supabase, uid, role, clientId } = await staffCtx();
  // Clients can only create requests for their own linked company.
  const effectiveClientId =
    role === "client" ? clientId : parsed.data.client_id;
  if (!effectiveClientId)
    return {
      error:
        role === "client"
          ? "Your account isn't linked to a company yet — contact an administrator."
          : "Select a client.",
    };

  const { data, error } = await supabase
    .from("transport_requests")
    .insert({
      ...parsed.data,
      client_id: effectiveClientId,
      request_no: "", // trigger fills TR-0001
      status: "Draft",
      created_by: uid,
      updated_by: uid,
    })
    .select("id")
    .single();
  if (error) return { error: error.message };

  if (parsedItems.length > 0) {
    const rows = parsedItems.map((it) => ({ ...it, request_id: data.id }));
    const { error: itemsErr } = await supabase
      .from("request_items")
      .insert(rows);
    if (itemsErr) return { error: itemsErr.message };
  }

  revalidatePath("/requests");
  return { id: data.id };
}

export async function updateRequest(
  id: string,
  input: unknown,
): Promise<Result> {
  const parsed = requestSchema.safeParse(input);
  if (!parsed.success)
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };

  const { supabase, uid, role, clientId } = await staffCtx();
  const payload =
    role === "client" && clientId
      ? { ...parsed.data, client_id: clientId, updated_by: uid }
      : { ...parsed.data, updated_by: uid };
  const { data, error } = await supabase
    .from("transport_requests")
    .update(payload)
    .eq("id", id)
    .eq("status", "Draft") // only drafts are editable
    .select("id");
  if (error) return { error: error.message };
  if (!data || data.length === 0)
    return { error: "Only draft requests can be edited." };

  revalidatePath("/requests");
  revalidatePath(`/requests/${id}`);
  return {};
}

// --- Items (only while Draft) -------------------------------------------------
async function assertDraft(
  supabase: Awaited<ReturnType<typeof createClient>>,
  requestId: string,
): Promise<string | null> {
  const { data } = await supabase
    .from("transport_requests")
    .select("status")
    .eq("id", requestId)
    .maybeSingle();
  if (!data) return "Request not found.";
  if (data.status !== "Draft")
    return "Items can only be changed while the request is a draft.";
  return null;
}

export async function saveItem(
  requestId: string,
  input: unknown,
  id?: string,
): Promise<Result> {
  const parsed = requestItemSchema.safeParse(input);
  if (!parsed.success)
    return { error: parsed.error.issues[0]?.message ?? "Invalid item" };

  const { supabase } = await staffCtx();
  const guard = await assertDraft(supabase, requestId);
  if (guard) return { error: guard };

  const { error } = id
    ? await supabase.from("request_items").update(parsed.data).eq("id", id)
    : await supabase
        .from("request_items")
        .insert({ ...parsed.data, request_id: requestId });
  if (error) return { error: error.message };
  revalidatePath(`/requests/${requestId}`);
  return {};
}

export async function deleteItem(
  requestId: string,
  id: string,
): Promise<Result> {
  const { supabase } = await staffCtx();
  const guard = await assertDraft(supabase, requestId);
  if (guard) return { error: guard };
  const { error } = await supabase.from("request_items").delete().eq("id", id);
  if (error) return { error: error.message };
  revalidatePath(`/requests/${requestId}`);
  return {};
}

// --- Status transitions (compare-and-swap on status) --------------------------
export async function submitRequest(id: string): Promise<Result> {
  const { supabase, uid } = await staffCtx();
  const { data: req } = await supabase
    .from("transport_requests")
    .select("status, pickup_location_id, delivery_location_id")
    .eq("id", id)
    .maybeSingle();
  if (!req) return { error: "Request not found." };
  if (req.status !== "Draft")
    return { error: "Only draft requests can be submitted." };
  if (!req.pickup_location_id || !req.delivery_location_id)
    return {
      error: "Set both a pickup and a delivery location before submitting.",
    };

  const { data, error } = await supabase
    .from("transport_requests")
    .update({ status: "Submitted", updated_by: uid })
    .eq("id", id)
    .eq("status", "Draft")
    .select("id");
  if (error) return { error: error.message };
  if (!data || data.length === 0)
    return { error: "Request changed — refresh and try again." };

  revalidatePath("/requests");
  revalidatePath(`/requests/${id}`);
  return {};
}

export async function approveRequest(id: string): Promise<Result> {
  const { supabase, uid } = await adminCtx();
  const { data, error } = await supabase
    .from("transport_requests")
    .update({
      status: "Approved",
      approved_by: uid,
      approved_at: nowIso(),
      updated_by: uid,
    })
    .eq("id", id)
    .eq("status", "Submitted")
    .select("id");
  if (error) return { error: error.message };
  if (!data || data.length === 0)
    return { error: "Request is no longer awaiting approval — refresh." };

  revalidatePath("/requests");
  revalidatePath(`/requests/${id}`);
  return {};
}

export async function rejectRequest(
  id: string,
  reason: string,
): Promise<Result> {
  const trimmed = (reason ?? "").trim();
  if (!trimmed) return { error: "A rejection reason is required." };

  const { supabase, uid } = await adminCtx();
  const { data, error } = await supabase
    .from("transport_requests")
    .update({ status: "Rejected", rejected_reason: trimmed, updated_by: uid })
    .eq("id", id)
    .eq("status", "Submitted")
    .select("id");
  if (error) return { error: error.message };
  if (!data || data.length === 0)
    return { error: "Request is no longer awaiting approval — refresh." };

  revalidatePath("/requests");
  revalidatePath(`/requests/${id}`);
  return {};
}

export async function cancelRequest(id: string): Promise<Result> {
  const { supabase, uid } = await staffCtx();
  const { data, error } = await supabase
    .from("transport_requests")
    .update({ status: "Cancelled", cancelled_at: nowIso(), updated_by: uid })
    .eq("id", id)
    .in("status", ["Draft", "Submitted", "Approved"])
    .select("id");
  if (error) return { error: error.message };
  if (!data || data.length === 0)
    return { error: "Only requests before dispatch can be cancelled." };

  revalidatePath("/requests");
  revalidatePath(`/requests/${id}`);
  return {};
}

export async function deleteRequest(id: string): Promise<Result> {
  const { supabase } = await staffCtx();
  const { data, error } = await supabase
    .from("transport_requests")
    .delete()
    .eq("id", id)
    .eq("status", "Draft")
    .select("id");
  if (error) return { error: error.message };
  if (!data || data.length === 0)
    return { error: "Only draft requests can be deleted." };

  revalidatePath("/requests");
  return {};
}

// --- Internal comments on a request -------------------------------------------
export async function addComment(
  requestId: string,
  body: string,
): Promise<Result> {
  const { profile } = await requireRole(["admin", "operations"]);
  const supabase = await createClient();
  const text = (body ?? "").trim();
  if (!text) return { error: "Write a comment first." };

  const { error } = await supabase.from("request_comments").insert({
    request_id: requestId,
    author_id: profile.id,
    body: text,
  });
  if (error) return { error: error.message };

  revalidatePath(`/requests/${requestId}`);
  return {};
}

export async function deleteComment(
  requestId: string,
  id: string,
): Promise<Result> {
  await requireRole(["admin", "operations"]);
  const supabase = await createClient();
  // RLS allows admin (any) or the author to delete.
  const { error } = await supabase.from("request_comments").delete().eq("id", id);
  if (error) return { error: error.message };
  revalidatePath(`/requests/${requestId}`);
  return {};
}
