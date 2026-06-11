import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/app/page-header";
import { Card } from "@/components/ui/card";
import { formatMoney } from "@/lib/format";
import { FinanceTable, type FinanceRow } from "./finance-table";

export const metadata = { title: "Finance" };

export default async function FinancePage() {
  await requireRole(["admin", "finance"]);
  const supabase = await createClient();

  const [billingRes, waybillsRes] = await Promise.all([
    supabase
      .from("waybill_billing")
      .select(
        "waybill_id, freight_amount, carrier_cost, margin_amount, currency, payment_status, invoice_no",
      ),
    supabase
      .from("waybills")
      .select("id, waybill_no, client_name, issued_at"),
  ]);

  const wbById = new Map((waybillsRes.data ?? []).map((w) => [w.id, w]));
  const rows: FinanceRow[] = (billingRes.data ?? []).map((b) => ({
    waybill_id: b.waybill_id,
    waybill_no: wbById.get(b.waybill_id)?.waybill_no ?? "—",
    client_name: wbById.get(b.waybill_id)?.client_name ?? "—",
    issued_at: wbById.get(b.waybill_id)?.issued_at ?? null,
    freight_amount: b.freight_amount,
    carrier_cost: b.carrier_cost,
    margin_amount: b.margin_amount,
    currency: b.currency ?? "SAR",
    payment_status: b.payment_status,
    invoice_no: b.invoice_no,
  }));

  const currency = rows.find((r) => r.currency)?.currency ?? "SAR";
  const sum = (f: (r: FinanceRow) => number | null) =>
    rows.reduce((s, r) => s + (f(r) ?? 0), 0);
  const revenue = sum((r) => r.freight_amount);
  const cost = sum((r) => r.carrier_cost);
  const margin = sum((r) => r.margin_amount);
  const marginPct = revenue > 0 ? Math.round((margin / revenue) * 100) : 0;
  const outstanding = rows
    .filter((r) => r.payment_status !== "paid")
    .reduce((s, r) => s + (r.freight_amount ?? 0), 0);

  const kpis: { label: string; value: string; accent?: boolean }[] = [
    { label: "Revenue", value: formatMoney(revenue, currency) },
    { label: "Carrier cost", value: formatMoney(cost, currency) },
    {
      label: "Margin",
      value: `${formatMoney(margin, currency)} · ${marginPct}%`,
      accent: true,
    },
    { label: "Outstanding", value: formatMoney(outstanding, currency) },
  ];

  return (
    <div>
      <PageHeader
        title="Finance"
        description="Revenue, cost, and margin across priced waybills."
      />

      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        {kpis.map((k) => (
          <Card key={k.label} className="relative overflow-hidden p-4">
            <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-brand-blue to-brand-sky" />
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              {k.label}
            </p>
            <p
              className={
                "mt-1 text-xl font-bold " +
                (k.accent ? "text-emerald-700" : "text-brand-navy")
              }
            >
              {k.value}
            </p>
          </Card>
        ))}
      </div>

      <FinanceTable rows={rows} />
    </div>
  );
}
