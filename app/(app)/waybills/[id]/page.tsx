import { notFound } from "next/navigation";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { WaybillView } from "./waybill-view";

export const metadata = { title: "Waybill" };

export default async function WaybillDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const { profile } = await requireRole([
    "admin",
    "operations",
    "dispatch",
    "client",
    "finance",
  ]);
  const canManage = profile.role === "admin" || profile.role === "dispatch";
  const canEmail = canManage || profile.role === "client";
  const canSeeMargin = profile.role === "admin" || profile.role === "finance";
  const canManageCredit = canSeeMargin; // admin + finance issue/void credit notes
  const supabase = await createClient();

  const { data: waybill } = await supabase
    .from("waybills")
    .select("*")
    .eq("id", params.id)
    .maybeSingle();
  if (!waybill) notFound();

  const [items, request, pdf] = await Promise.all([
    supabase
      .from("request_items")
      .select("*")
      .eq("request_id", waybill.request_id)
      .order("created_at"),
    supabase
      .from("transport_requests")
      .select("request_no, client_id")
      .eq("id", waybill.request_id)
      .maybeSingle(),
    supabase
      .from("waybill_pdfs")
      .select("id")
      .eq("waybill_id", params.id)
      .limit(1)
      .maybeSingle(),
  ]);

  // Resolve the client's email so the Email dialog prefills the recipient.
  // Prefer clients.email; fall back to the client's primary contact (or any
  // contact) email. Contacts are read via the service role so the default works
  // for every staff role regardless of client_contacts RLS.
  let defaultEmail = "";
  if (request.data?.client_id) {
    const { data: client } = await supabase
      .from("clients")
      .select("email")
      .eq("id", request.data.client_id)
      .maybeSingle();
    defaultEmail = client?.email ?? "";

    if (!defaultEmail) {
      const admin = createAdminClient();
      const { data: contacts } = await admin
        .from("client_contacts")
        .select("email, is_primary")
        .eq("client_id", request.data.client_id)
        .not("email", "is", null);
      const primary = (contacts ?? []).find((c) => c.is_primary && c.email);
      defaultEmail = primary?.email ?? (contacts ?? []).find((c) => c.email)?.email ?? "";
    }
  }

  // Internal billing (carrier cost + margin) — only fetched for admin/finance.
  let billing: {
    freight_amount: number | null;
    carrier_cost: number | null;
    margin_amount: number | null;
    currency: string | null;
    basis: string | null;
  } | null = null;
  if (canSeeMargin) {
    const { data } = await supabase
      .from("waybill_billing")
      .select("freight_amount, carrier_cost, margin_amount, currency, basis")
      .eq("waybill_id", params.id)
      .maybeSingle();
    billing = data;
  }

  // Current manual charge override (lives on the dispatch) for the billing editor.
  let customerCharge: number | null = null;
  if (canSeeMargin) {
    const { data: disp } = await supabase
      .from("dispatches")
      .select("customer_charge")
      .eq("id", waybill.dispatch_id)
      .maybeSingle();
    customerCharge = disp?.customer_charge ?? null;
  }

  // Credit notes raised against this waybill (RLS scopes visibility).
  const { data: creditNotes } = await supabase
    .from("credit_notes")
    .select("id, credit_no, amount, currency, reason, status, created_at")
    .eq("waybill_id", params.id)
    .order("created_at", { ascending: false });

  return (
    <WaybillView
      waybill={waybill}
      items={items.data ?? []}
      requestNo={request.data?.request_no ?? "—"}
      dispatchId={waybill.dispatch_id}
      hasPdf={!!pdf.data}
      canManage={canManage}
      canEmail={canEmail}
      canSeeMargin={canSeeMargin}
      canManageCredit={canManageCredit}
      creditNotes={creditNotes ?? []}
      billing={billing}
      customerCharge={customerCharge}
      defaultEmail={defaultEmail}
    />
  );
}
