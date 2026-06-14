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

  // Drive Finance from WAYBILLS (one per dispatched shipment) and left-join the
  // internal billing row. This way every shipment shows up — unpriced ones as
  // "Needs pricing" — instead of the page being blank when waybill_billing is
  // empty (which happens if pricing never ran).
  const [waybillsRes, billingRes, creditRes] = await Promise.all([
    supabase
      .from("waybills")
      .select("id, waybill_no, client_name, issued_at, freight_amount, currency")
      .order("issued_at", { ascending: false }),
    supabase
      .from("waybill_billing")
      .select(
        "waybill_id, freight_amount, carrier_cost, margin_amount, currency, payment_status, invoice_no",
      ),
    supabase
      .from("credit_notes")
      .select("waybill_id, amount, status")
      .eq("status", "issued"),
  ]);

  const billingByWb = new Map(
    (billingRes.data ?? []).map((b) => [b.waybill_id, b]),
  );

  // Sum issued credit notes per waybill (they net down revenue + margin).
  const creditByWb = new Map<string, number>();
  for (const c of creditRes.data ?? []) {
    creditByWb.set(
      c.waybill_id,
      (creditByWb.get(c.waybill_id) ?? 0) + (c.amount ?? 0),
    );
  }

  const rows: FinanceRow[] = (waybillsRes.data ?? []).map((w) => {
    const b = billingByWb.get(w.id);
    const credit = creditByWb.get(w.id) ?? 0;
    const freight = b?.freight_amount ?? w.freight_amount;
    const priced = freight != null && freight > 0;
    return {
      waybill_id: w.id,
      waybill_no: w.waybill_no ?? "—",
      client_name: w.client_name ?? "—",
      issued_at: w.issued_at ?? null,
      freight_amount: freight,
      carrier_cost: b?.carrier_cost ?? null,
      margin_amount: b?.margin_amount ?? null,
      credit_amount: credit,
      currency: b?.currency ?? w.currency ?? "SAR",
      payment_status: b?.payment_status ?? "unbilled",
      invoice_no: b?.invoice_no ?? null,
      needs_pricing: !priced,
    };
  });

  const currency = rows.find((r) => r.currency)?.currency ?? "SAR";
  const sum = (f: (r: FinanceRow) => number | null) =>
    rows.reduce((s, r) => s + (f(r) ?? 0), 0);
  const credits = sum((r) => r.credit_amount);
  const revenue = sum((r) => r.freight_amount) - credits;
  const cost = sum((r) => r.carrier_cost);
  const margin = sum((r) => r.margin_amount) - credits;
  const marginPct = revenue > 0 ? Math.round((margin / revenue) * 100) : 0;
  const outstanding = rows
    .filter((r) => r.payment_status !== "paid")
    .reduce((s, r) => s + (r.freight_amount ?? 0) - (r.credit_amount ?? 0), 0);
  const needsPricing = rows.filter((r) => r.needs_pricing).length;

  const kpis: { label: string; value: string; accent?: boolean }[] = [
    { label: "Revenue (net)", value: formatMoney(revenue, currency) },
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
        description="Revenue, cost, and margin across shipments."
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

      {credits > 0 ? (
        <p className="mb-4 text-xs text-muted-foreground">
          Net of {formatMoney(credits, currency)} in issued credit notes.
        </p>
      ) : null}

      <FinanceTable rows={rows} needsPricing={needsPricing} />
    </div>
  );
}
