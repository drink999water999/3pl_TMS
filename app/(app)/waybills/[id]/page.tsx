import { notFound } from "next/navigation";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { WaybillView } from "./waybill-view";

export const metadata = { title: "Waybill" };

export default async function WaybillDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const { profile } = await requireRole(["admin", "operations", "dispatch"]);
  const canManage = profile.role === "admin" || profile.role === "dispatch";
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
      .select("request_no")
      .eq("id", waybill.request_id)
      .maybeSingle(),
    supabase
      .from("waybill_pdfs")
      .select("id")
      .eq("waybill_id", params.id)
      .limit(1)
      .maybeSingle(),
  ]);

  return (
    <WaybillView
      waybill={waybill}
      items={items.data ?? []}
      requestNo={request.data?.request_no ?? "—"}
      dispatchId={waybill.dispatch_id}
      hasPdf={!!pdf.data}
      canManage={canManage}
    />
  );
}
