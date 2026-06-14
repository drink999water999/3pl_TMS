"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Check,
  Download,
  Printer,
  Mail,
  RefreshCw,
  Pencil,
  Receipt,
  Ban,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { formatDate, formatMoney } from "@/lib/format";
import type { Tables } from "@/lib/database.types";
import {
  approveWaybill,
  getWaybillPdfUrl,
  emailWaybill,
  regenerateWaybillPdf,
  recalcWaybillPrice,
  setWaybillBilling,
  amendWaybill,
  issueCreditNote,
  voidCreditNote,
} from "../actions";

type Waybill = Tables<"waybills">;
type Item = Tables<"request_items">;
type CreditNote = {
  id: string;
  credit_no: string;
  amount: number;
  currency: string | null;
  reason: string | null;
  status: string;
  created_at: string;
};
type Billing = {
  freight_amount: number | null;
  carrier_cost: number | null;
  margin_amount: number | null;
  currency: string | null;
  basis: string | null;
} | null;

export function WaybillView({
  waybill,
  items,
  requestNo,
  dispatchId,
  hasPdf,
  canManage,
  canEmail,
  canSeeMargin,
  canManageCredit,
  creditNotes,
  billing,
  customerCharge,
  defaultEmail,
}: {
  waybill: Waybill;
  items: Item[];
  requestNo: string;
  dispatchId: string;
  hasPdf: boolean;
  canManage: boolean;
  canEmail: boolean;
  canSeeMargin: boolean;
  canManageCredit: boolean;
  creditNotes: CreditNote[];
  billing: Billing;
  customerCharge: number | null;
  defaultEmail: string;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [emailing, setEmailing] = useState(false);
  const [amending, setAmending] = useState(false);
  const isApproved = waybill.status === "approved";

  const approve = async () => {
    setBusy(true);
    setError(null);
    const res = await approveWaybill(waybill.id);
    setBusy(false);
    if (res.error) return setError(res.error);
    router.refresh();
  };

  const download = async () => {
    setBusy(true);
    setError(null);
    const res = await getWaybillPdfUrl(waybill.id);
    setBusy(false);
    if (res.error) return setError(res.error);
    if (res.url) window.open(res.url, "_blank");
  };

  const regenerate = async () => {
    setBusy(true);
    setError(null);
    const res = await regenerateWaybillPdf(waybill.id);
    setBusy(false);
    if (res.error) return setError(res.error);
    router.refresh();
  };

  return (
    <div>
      <Link
        href="/waybills"
        className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground print:hidden"
      >
        <ArrowLeft className="h-4 w-4" /> Back to waybills
      </Link>

      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold tracking-tight text-brand-navy">
            {waybill.waybill_no}
          </h1>
          <Badge variant={isApproved ? "success" : "default"}>
            {isApproved ? "Approved" : "Draft"}
          </Badge>
          {waybill.revision > 0 ? (
            <Badge variant="warning">Rev {waybill.revision}</Badge>
          ) : null}
        </div>
        <div className="flex flex-wrap gap-2 print:hidden">
          {canManage && !isApproved ? (
            <Button disabled={busy} onClick={approve}>
              <Check className="h-4 w-4" /> Approve
            </Button>
          ) : null}
          <Button
            variant="outline"
            disabled={busy || !hasPdf}
            onClick={download}
            title={hasPdf ? undefined : "Approve the waybill to generate its PDF"}
          >
            <Download className="h-4 w-4" /> Download PDF
          </Button>
          <Button variant="outline" onClick={() => window.print()}>
            <Printer className="h-4 w-4" /> Print
          </Button>
          {canEmail ? (
            <Button
              variant="outline"
              disabled={busy || !hasPdf}
              onClick={() => setEmailing(true)}
              title={hasPdf ? undefined : "Approve the waybill first"}
            >
              <Mail className="h-4 w-4" /> Email
            </Button>
          ) : null}
          {canManage ? (
            <Button variant="outline" onClick={() => setAmending(true)}>
              <Pencil className="h-4 w-4" /> Amend
            </Button>
          ) : null}
          {canManage && isApproved ? (
            <Button variant="ghost" disabled={busy} onClick={regenerate}>
              <RefreshCw className="h-4 w-4" /> Regenerate
            </Button>
          ) : null}
        </div>
      </div>

      {error ? (
        <p className="mb-4 rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive print:hidden">
          {error}
        </p>
      ) : null}

      <div className="mb-4 text-sm text-muted-foreground print:hidden">
        Request{" "}
        <Link
          href={`/requests/${waybill.request_id}`}
          className="text-brand-navy hover:underline"
        >
          {requestNo}
        </Link>
        {canManage ? (
          <>
            {" "}
            ·{" "}
            <Link
              href={`/dispatch/${dispatchId}`}
              className="text-brand-navy hover:underline"
            >
              View dispatch
            </Link>
          </>
        ) : null}
      </div>

      <div className="space-y-4">
        <Section title="E-Way Details">
          <Grid>
            <Field label="Waybill No." value={waybill.waybill_no} />
            <Field label="Issued" value={formatDate(waybill.issued_at)} />
            <Field label="Shipment type" value={waybill.shipment_type_name} />
            <Field label="Pickup date" value={formatDate(waybill.pickup_date)} />
          </Grid>
        </Section>

        <Section title="Address">
          <Grid>
            <Field label="Client" value={waybill.client_name} />
          </Grid>
          <div className="mt-3 grid gap-4 sm:grid-cols-2">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Pickup address
              </p>
              <p className="mt-1 whitespace-pre-wrap text-sm">
                {waybill.pickup_address || "—"}
              </p>
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Delivery address
              </p>
              <p className="mt-1 whitespace-pre-wrap text-sm">
                {waybill.delivery_address || "—"}
              </p>
            </div>
          </div>
        </Section>

        <Section title="Goods">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-xs uppercase text-muted-foreground">
                <th className="py-2 font-medium">Item</th>
                <th className="py-2 font-medium">Description</th>
                <th className="py-2 text-right font-medium">Qty</th>
                <th className="py-2 text-right font-medium">Unit price</th>
              </tr>
            </thead>
            <tbody>
              {items.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-3 text-muted-foreground">
                    No itemized goods. Total quantity:{" "}
                    {waybill.quantity ?? "—"}
                  </td>
                </tr>
              ) : (
                items.map((it) => (
                  <tr key={it.id} className="border-b last:border-0">
                    <td className="py-2 font-medium">{it.item_name}</td>
                    <td className="py-2">{it.description ?? "—"}</td>
                    <td className="py-2 text-right">
                      {it.quantity ?? "—"}
                    </td>
                    <td className="py-2 text-right">
                      {it.unit_price != null ? formatMoney(it.unit_price) : "—"}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </Section>

        <Section title="Transportation">
          <Grid>
            <Field label="Truck number" value={waybill.truck_number} />
            <Field label="Truck type" value={waybill.truck_type_name} />
            <Field label="Driver" value={waybill.driver_name} />
            <Field label="Supplier" value={waybill.supplier_name} />
          </Grid>
        </Section>

        <Section title="Charges">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-muted-foreground">
              Total freight charge
            </span>
            <span className="text-lg font-bold text-brand-navy">
              {waybill.freight_amount != null
                ? formatMoney(
                    waybill.freight_amount,
                    waybill.currency ?? "SAR",
                  )
                : "Not priced yet"}
            </span>
          </div>
        </Section>
      </div>

      {canSeeMargin ? (
        <BillingPanel
          waybillId={waybill.id}
          billing={billing}
          customerCharge={customerCharge}
          currency={waybill.currency ?? billing?.currency ?? "SAR"}
        />
      ) : null}

      <CreditNotesSection
        waybillId={waybill.id}
        currency={waybill.currency ?? "SAR"}
        notes={creditNotes}
        canManage={canManageCredit}
      />

      {emailing ? (
        <EmailDialog
          waybillId={waybill.id}
          defaultEmail={defaultEmail}
          onClose={() => setEmailing(false)}
        />
      ) : null}
      {amending ? (
        <AmendDialog
          waybill={waybill}
          onClose={() => setAmending(false)}
        />
      ) : null}
    </div>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <Card className="overflow-hidden">
      <div className="border-b bg-muted/50 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-brand-navy">
        {title}
      </div>
      <div className="p-4">{children}</div>
    </Card>
  );
}

function Grid({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid gap-x-6 gap-y-3 sm:grid-cols-2 lg:grid-cols-4">
      {children}
    </div>
  );
}

function Field({ label, value }: { label: string; value?: string | null }) {
  return (
    <div>
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <p className="mt-0.5 text-sm">{value && value !== "" ? value : "—"}</p>
    </div>
  );
}

function BillingPanel({
  waybillId,
  billing,
  currency,
  customerCharge,
}: {
  waybillId: string;
  billing: Billing;
  currency: string;
  customerCharge: number | null;
}) {
  const router = useRouter();
  const [charge, setCharge] = useState(customerCharge?.toString() ?? "");
  const [cost, setCost] = useState(billing?.carrier_cost?.toString() ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const saveCost = async () => {
    setBusy(true);
    setError(null);
    const res = await setWaybillBilling(waybillId, charge, cost);
    setBusy(false);
    if (res.error) return setError(res.error);
    router.refresh();
  };

  const recalc = async () => {
    setBusy(true);
    setError(null);
    const res = await recalcWaybillPrice(waybillId);
    setBusy(false);
    if (res.error) return setError(res.error);
    router.refresh();
  };

  const money = (v: number | null | undefined) =>
    v != null ? formatMoney(v, currency) : "—";

  return (
    <Card className="mt-4 border-brand-navy/20 bg-brand-navy/[0.03] p-4 print:hidden">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-brand-navy">
          Billing &amp; margin{" "}
          <span className="font-normal text-muted-foreground">
            · internal only
          </span>
        </h2>
        <Button variant="ghost" size="sm" disabled={busy} onClick={recalc}>
          <RefreshCw className="h-4 w-4" /> Recalculate
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Freight (revenue)
          </p>
          <p className="mt-0.5 text-base font-semibold">
            {money(billing?.freight_amount)}
          </p>
        </div>
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Carrier cost
          </p>
          <p className="mt-0.5 text-base font-semibold">
            {money(billing?.carrier_cost)}
          </p>
        </div>
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Margin (take)
          </p>
          <p className="mt-0.5 text-base font-semibold text-emerald-700">
            {money(billing?.margin_amount)}
            {billing?.margin_amount != null &&
            billing?.freight_amount != null &&
            billing.freight_amount > 0
              ? ` · ${Math.round(
                  (billing.margin_amount / billing.freight_amount) * 100,
                )}%`
              : ""}
          </p>
        </div>
      </div>

      {billing?.basis ? (
        <p className="mt-2 text-xs text-muted-foreground">{billing.basis}</p>
      ) : null}

      <div className="mt-4 grid gap-3 border-t pt-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label>Customer charge ({currency})</Label>
          <Input
            type="number"
            step="0.01"
            min="0"
            value={charge}
            onChange={(e) => setCharge(e.target.value)}
            placeholder="Blank = auto from client pricing"
          />
        </div>
        <div className="space-y-1.5">
          <Label>Carrier cost ({currency})</Label>
          <Input
            type="number"
            step="0.01"
            min="0"
            value={cost}
            onChange={(e) => setCost(e.target.value)}
            placeholder="What you pay the carrier"
          />
        </div>
      </div>
      <div className="mt-2 flex justify-end">
        <Button disabled={busy} onClick={saveCost}>
          Save &amp; reprice
        </Button>
      </div>

      {error ? (
        <p className="mt-2 rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      ) : null}
    </Card>
  );
}

function EmailDialog({
  waybillId,
  defaultEmail,
  onClose,
}: {
  waybillId: string;
  defaultEmail: string;
  onClose: () => void;
}) {
  const router = useRouter();
  const [to, setTo] = useState(defaultEmail ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  const submit = async () => {
    setSaving(true);
    setError(null);
    const res = await emailWaybill(waybillId, to);
    setSaving(false);
    if (res.error) return setError(res.error);
    setSent(true);
    router.refresh();
  };

  return (
    <Dialog open onClose={onClose} title="Email waybill">
      <div className="space-y-3">
        {sent ? (
          <p className="rounded-md bg-green-100 px-3 py-2 text-sm text-green-800">
            Sent to {to}.
          </p>
        ) : (
          <>
            <div className="space-y-1.5">
              <Label>Recipient email</Label>
              <Input
                type="email"
                value={to}
                onChange={(e) => setTo(e.target.value)}
                placeholder="customer@example.com"
              />
            </div>
            {error ? (
              <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {error}
              </p>
            ) : null}
          </>
        )}
        <div className="flex justify-end gap-2 pt-1">
          <Button type="button" variant="outline" onClick={onClose}>
            {sent ? "Close" : "Cancel"}
          </Button>
          {!sent ? (
            <Button type="button" disabled={saving} onClick={submit}>
              {saving ? "Sending…" : "Send"}
            </Button>
          ) : null}
        </div>
      </div>
    </Dialog>
  );
}

function AmendDialog({
  waybill,
  onClose,
}: {
  waybill: Waybill;
  onClose: () => void;
}) {
  const router = useRouter();
  const [form, setForm] = useState({
    client_name: waybill.client_name ?? "",
    pickup_address: waybill.pickup_address ?? "",
    delivery_address: waybill.delivery_address ?? "",
    truck_number: waybill.truck_number ?? "",
    truck_type_name: waybill.truck_type_name ?? "",
    shipment_type_name: waybill.shipment_type_name ?? "",
    driver_name: waybill.driver_name ?? "",
    supplier_name: waybill.supplier_name ?? "",
    quantity: waybill.quantity?.toString() ?? "",
    pickup_date: waybill.pickup_date ?? "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const set = (k: keyof typeof form, v: string) =>
    setForm((f) => ({ ...f, [k]: v }));

  const submit = async () => {
    setSaving(true);
    setError(null);
    const res = await amendWaybill(waybill.id, form);
    setSaving(false);
    if (res.error) return setError(res.error);
    onClose();
    router.refresh();
  };

  const field = (label: string, k: keyof typeof form, type = "text") => (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      <Input
        type={type}
        value={form[k]}
        onChange={(e) => set(k, e.target.value)}
      />
    </div>
  );

  return (
    <Dialog open onClose={onClose} title={`Amend ${waybill.waybill_no}`}>
      <div className="space-y-3">
        <p className="rounded-md bg-amber-50 px-3 py-2 text-xs text-amber-800">
          Corrects the waybill in place — the number stays the same, the revision
          increases, and the PDF is regenerated.
        </p>
        {field("Client", "client_name")}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label>Pickup address</Label>
            <Textarea
              value={form.pickup_address}
              onChange={(e) => set("pickup_address", e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Delivery address</Label>
            <Textarea
              value={form.delivery_address}
              onChange={(e) => set("delivery_address", e.target.value)}
            />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          {field("Truck number", "truck_number")}
          {field("Truck type", "truck_type_name")}
          {field("Driver", "driver_name")}
          {field("Supplier", "supplier_name")}
          {field("Quantity", "quantity", "number")}
          {field("Pickup date", "pickup_date", "date")}
          {field("Shipment type", "shipment_type_name")}
        </div>
        {error ? (
          <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {error}
          </p>
        ) : null}
        <div className="flex justify-end gap-2 pt-1">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="button" disabled={saving} onClick={submit}>
            {saving ? "Saving…" : "Save & regenerate"}
          </Button>
        </div>
      </div>
    </Dialog>
  );
}

function CreditNotesSection({
  waybillId,
  currency,
  notes,
  canManage,
}: {
  waybillId: string;
  currency: string;
  notes: CreditNote[];
  canManage: boolean;
}) {
  const router = useRouter();
  const [amount, setAmount] = useState("");
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!canManage && notes.length === 0) return null;

  const issue = async () => {
    setBusy(true);
    setError(null);
    const res = await issueCreditNote(waybillId, { amount, reason });
    setBusy(false);
    if (res.error) return setError(res.error);
    setAmount("");
    setReason("");
    router.refresh();
  };

  const voidNote = async (id: string) => {
    setBusy(true);
    setError(null);
    const res = await voidCreditNote(id, waybillId);
    setBusy(false);
    if (res.error) return setError(res.error);
    router.refresh();
  };

  const money = (v: number) => formatMoney(v, currency);

  return (
    <Card className="mt-4 p-4 print:hidden">
      <div className="mb-3 flex items-center gap-2">
        <Receipt className="h-4 w-4 text-brand-navy" />
        <h2 className="text-sm font-semibold text-brand-navy">Credit notes</h2>
      </div>

      {notes.length === 0 ? (
        <p className="text-sm text-muted-foreground">No credit notes issued.</p>
      ) : (
        <div className="divide-y">
          {notes.map((n) => (
            <div
              key={n.id}
              className="flex items-center justify-between gap-3 py-2 text-sm"
            >
              <div className="min-w-0">
                <span className="font-medium">{n.credit_no}</span>
                <span className="ml-2 font-semibold text-red-600">
                  −{money(n.amount)}
                </span>
                {n.reason ? (
                  <p className="truncate text-xs text-muted-foreground">
                    {n.reason}
                  </p>
                ) : null}
              </div>
              <div className="flex items-center gap-2">
                {n.status === "void" ? (
                  <Badge variant="default">Void</Badge>
                ) : (
                  <Badge variant="success">Issued</Badge>
                )}
                {canManage && n.status !== "void" ? (
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={busy}
                    onClick={() => voidNote(n.id)}
                    title="Void credit note"
                  >
                    <Ban className="h-4 w-4" />
                  </Button>
                ) : null}
              </div>
            </div>
          ))}
        </div>
      )}

      {canManage ? (
        <div className="mt-4 grid gap-3 border-t pt-3 sm:grid-cols-[8rem,1fr,auto] sm:items-end">
          <div className="space-y-1.5">
            <Label>Amount ({currency})</Label>
            <Input
              type="number"
              step="0.01"
              min="0"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Reason</Label>
            <Input
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. overcharge, partial return"
            />
          </div>
          <Button disabled={busy || !amount} onClick={issue}>
            Issue credit
          </Button>
        </div>
      ) : null}

      {error ? (
        <p className="mt-2 rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      ) : null}
    </Card>
  );
}
