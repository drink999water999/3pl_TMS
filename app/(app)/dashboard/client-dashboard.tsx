import Link from "next/link";
import { FileText, Truck, PackageCheck, Receipt } from "lucide-react";
import { PageHeader } from "@/components/app/page-header";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/table";
import { formatDate, formatMoney, requestStatusVariant } from "@/lib/format";

type Req = {
  id: string;
  request_no: string;
  status: string;
  created_at: string;
  delivery_date: string | null;
};
type Wb = {
  id: string;
  waybill_no: string;
  status: string;
  freight_amount: number | null;
  currency: string | null;
  issued_at: string | null;
};

export function ClientDashboard({
  requests,
  waybills,
}: {
  requests: Req[];
  waybills: Wb[];
}) {
  const inProgressStatuses = ["Submitted", "Approved", "Assigned"];
  const total = requests.length;
  const inProgress = requests.filter((r) =>
    inProgressStatuses.includes(r.status),
  ).length;
  const delivered = requests.filter((r) => r.status === "Delivered").length;
  const currency = waybills.find((w) => w.currency)?.currency ?? "SAR";
  const billed = waybills.reduce((s, w) => s + (w.freight_amount ?? 0), 0);

  const stats = [
    { label: "Total requests", value: String(total), icon: FileText },
    { label: "In progress", value: String(inProgress), icon: Truck },
    { label: "Delivered", value: String(delivered), icon: PackageCheck },
    { label: "Total billed", value: formatMoney(billed, currency), icon: Receipt },
  ];

  return (
    <div>
      <PageHeader
        title="My dashboard"
        description="Your transport requests and waybills at a glance."
      />

      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        {stats.map((s) => (
          <Card key={s.label} className="relative overflow-hidden p-4">
            <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-brand-blue to-brand-sky" />
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-brand-navy to-brand-blue text-white">
                <s.icon className="h-5 w-5" />
              </span>
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  {s.label}
                </p>
                <p className="text-xl font-bold text-brand-navy">{s.value}</p>
              </div>
            </div>
          </Card>
        ))}
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <Card className="p-5">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-brand-navy">
              Recent requests
            </h2>
            <Link
              href="/requests"
              className="text-xs font-medium text-brand-blue hover:underline"
            >
              View all
            </Link>
          </div>
          <Table>
            <THead>
              <TR>
                <TH>Request #</TH>
                <TH>Delivery</TH>
                <TH>Status</TH>
              </TR>
            </THead>
            <TBody>
              {requests.length === 0 ? (
                <TR>
                  <TD colSpan={3} className="text-center text-muted-foreground">
                    No requests yet.
                  </TD>
                </TR>
              ) : (
                requests.slice(0, 6).map((r) => (
                  <TR key={r.id}>
                    <TD>
                      <Link
                        href={`/requests/${r.id}`}
                        className="font-medium text-brand-navy hover:underline"
                      >
                        {r.request_no}
                      </Link>
                    </TD>
                    <TD>{formatDate(r.delivery_date)}</TD>
                    <TD>
                      <Badge variant={requestStatusVariant(r.status)}>
                        {r.status}
                      </Badge>
                    </TD>
                  </TR>
                ))
              )}
            </TBody>
          </Table>
        </Card>

        <Card className="p-5">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-brand-navy">
              Recent waybills
            </h2>
            <Link
              href="/waybills"
              className="text-xs font-medium text-brand-blue hover:underline"
            >
              View all
            </Link>
          </div>
          <Table>
            <THead>
              <TR>
                <TH>Waybill #</TH>
                <TH>Amount</TH>
                <TH>Status</TH>
              </TR>
            </THead>
            <TBody>
              {waybills.length === 0 ? (
                <TR>
                  <TD colSpan={3} className="text-center text-muted-foreground">
                    No waybills yet.
                  </TD>
                </TR>
              ) : (
                waybills.slice(0, 6).map((w) => (
                  <TR key={w.id}>
                    <TD>
                      <Link
                        href={`/waybills/${w.id}`}
                        className="font-medium text-brand-navy hover:underline"
                      >
                        {w.waybill_no}
                      </Link>
                    </TD>
                    <TD>
                      {w.freight_amount != null
                        ? formatMoney(w.freight_amount, w.currency ?? "SAR")
                        : "—"}
                    </TD>
                    <TD>
                      <Badge
                        variant={w.status === "approved" ? "success" : "default"}
                      >
                        {w.status === "approved" ? "Approved" : "Draft"}
                      </Badge>
                    </TD>
                  </TR>
                ))
              )}
            </TBody>
          </Table>
        </Card>
      </div>
    </div>
  );
}
