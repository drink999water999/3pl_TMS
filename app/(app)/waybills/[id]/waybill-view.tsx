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
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog } from "@/components/ui/dialog";
import { Card } from "@/components/ui/card";
import { formatDate, formatMoney } from "@/lib/format";
import type { Tables } from "@/lib/database.types";
import {
  approveWaybill,
  getWaybillPdfUrl,
  emailWaybill,
  regenerateWaybillPdf,
} from "../actions";

type Waybill = Tables<"waybills">;
type Item = Tables<"request_items">;

export function WaybillView({
  waybill,
  items,
  requestNo,
  dispatchId,
  hasPdf,
  canManage,
}: {
  waybill: Waybill;
  items: Item[];
  requestNo: string;
  dispatchId: string;
  hasPdf: boolean;
  canManage: boolean;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [emailing, setEmailing] = useState(false);
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
          {canManage ? (
            <Button
              variant="outline"
              disabled={busy || !hasPdf}
              onClick={() => setEmailing(true)}
              title={hasPdf ? undefined : "Approve the waybill first"}
            >
              <Mail className="h-4 w-4" /> Email
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
        </Link>{" "}
        ·{" "}
        <Link
          href={`/dispatch/${dispatchId}`}
          className="text-brand-navy hover:underline"
        >
          View dispatch
        </Link>
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
      </div>

      {emailing ? (
        <EmailDialog waybillId={waybill.id} onClose={() => setEmailing(false)} />
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

function EmailDialog({
  waybillId,
  onClose,
}: {
  waybillId: string;
  onClose: () => void;
}) {
  const router = useRouter();
  const [to, setTo] = useState("");
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
