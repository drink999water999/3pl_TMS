"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { formatMoney } from "@/lib/format";
import { setPaymentStatus } from "./actions";

export type FinanceRow = {
  waybill_id: string;
  waybill_no: string;
  client_name: string;
  issued_at: string | null;
  freight_amount: number | null;
  carrier_cost: number | null;
  margin_amount: number | null;
  currency: string;
  payment_status: string;
  invoice_no: string | null;
};

const STATUS_VARIANT: Record<string, "default" | "warning" | "success"> = {
  unbilled: "default",
  invoiced: "warning",
  paid: "success",
};
const STATUS_LABEL: Record<string, string> = {
  unbilled: "Unbilled",
  invoiced: "Invoiced",
  paid: "Paid",
};

export function FinanceTable({ rows }: { rows: FinanceRow[] }) {
  const [filter, setFilter] = useState<string>("all");

  const filtered =
    filter === "all"
      ? rows
      : rows.filter((r) => r.payment_status === filter);

  const chips = ["all", "unbilled", "invoiced", "paid"];

  return (
    <div>
      <div className="mb-4 flex flex-wrap gap-1.5">
        {chips.map((c) => (
          <button
            key={c}
            type="button"
            onClick={() => setFilter(c)}
            className={cn(
              "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
              filter === c
                ? "border-brand-navy bg-brand-navy text-white"
                : "border-input text-muted-foreground hover:bg-muted",
            )}
          >
            {c === "all" ? "All" : STATUS_LABEL[c]}
          </button>
        ))}
      </div>

      <Table>
        <THead>
          <TR>
            <TH>Waybill #</TH>
            <TH>Client</TH>
            <TH>Revenue</TH>
            <TH>Cost</TH>
            <TH>Margin</TH>
            <TH>Payment</TH>
            <TH>Update</TH>
          </TR>
        </THead>
        <TBody>
          {filtered.length === 0 ? (
            <TR>
              <TD colSpan={7} className="text-center text-muted-foreground">
                No priced waybills{filter === "all" ? " yet" : ` (${STATUS_LABEL[filter]})`}.
              </TD>
            </TR>
          ) : (
            filtered.map((r) => <Row key={r.waybill_id} row={r} />)
          )}
        </TBody>
      </Table>
    </div>
  );
}

function Row({ row }: { row: FinanceRow }) {
  const router = useRouter();
  const [status, setStatus] = useState(row.payment_status);
  const [invoice, setInvoice] = useState(row.invoice_no ?? "");
  const [busy, setBusy] = useState(false);
  const money = (v: number | null) =>
    v != null ? formatMoney(v, row.currency) : "—";
  const dirty = status !== row.payment_status || invoice !== (row.invoice_no ?? "");

  const save = async () => {
    setBusy(true);
    await setPaymentStatus(row.waybill_id, status, invoice);
    setBusy(false);
    router.refresh();
  };

  return (
    <TR>
      <TD>
        <Link
          href={`/waybills/${row.waybill_id}`}
          className="font-medium text-brand-navy hover:underline"
        >
          {row.waybill_no}
        </Link>
      </TD>
      <TD>{row.client_name}</TD>
      <TD>{money(row.freight_amount)}</TD>
      <TD>{money(row.carrier_cost)}</TD>
      <TD className="font-medium text-emerald-700">{money(row.margin_amount)}</TD>
      <TD>
        <Badge variant={STATUS_VARIANT[row.payment_status] ?? "default"}>
          {STATUS_LABEL[row.payment_status] ?? row.payment_status}
        </Badge>
      </TD>
      <TD>
        <div className="flex items-center gap-1.5">
          <Select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="h-8 w-28"
          >
            <option value="unbilled">Unbilled</option>
            <option value="invoiced">Invoiced</option>
            <option value="paid">Paid</option>
          </Select>
          <Input
            value={invoice}
            onChange={(e) => setInvoice(e.target.value)}
            placeholder="Invoice #"
            className="h-8 w-28"
          />
          <Button size="sm" disabled={busy || !dirty} onClick={save}>
            Save
          </Button>
        </div>
      </TD>
    </TR>
  );
}
