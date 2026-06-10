"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { ArrowLeft, Plus, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog } from "@/components/ui/dialog";
import { Card } from "@/components/ui/card";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/table";
import { formatDate, formatMoney, requestStatusVariant } from "@/lib/format";
import type { Tables } from "@/lib/database.types";
import { RequestForm } from "../request-form";
import {
  saveItem,
  deleteItem,
  submitRequest,
  approveRequest,
  rejectRequest,
  cancelRequest,
  deleteRequest,
} from "../actions";

type Request = Tables<"transport_requests">;
type Item = Tables<"request_items">;
type Lookup = { id: string; name: string };
type Loc = {
  id: string;
  client_id: string;
  kind: "pickup" | "delivery";
  name: string;
};
type TimelineEntry = {
  id: string;
  from_status: string | null;
  to_status: string;
  changed_at: string;
  by: string;
};
type Labels = {
  client: string;
  pickup: string;
  delivery: string;
  shipmentType: string;
  truckType: string;
};

export function RequestDetail({
  request,
  items,
  timeline,
  labels,
  isAdmin,
  clients,
  locations,
  shipmentTypes,
  truckTypes,
}: {
  request: Request;
  items: Item[];
  timeline: TimelineEntry[];
  labels: Labels;
  isAdmin: boolean;
  clients: Lookup[];
  locations: Loc[];
  shipmentTypes: Lookup[];
  truckTypes: Lookup[];
}) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [item, setItem] = useState<Item | "new" | null>(null);
  const [rejecting, setRejecting] = useState(false);

  const status = request.status;
  const isDraft = status === "Draft";
  const canCancel =
    status === "Draft" || status === "Submitted" || status === "Approved";

  const run = async (fn: () => Promise<{ error?: string }>) => {
    setError(null);
    setPending(true);
    const res = await fn();
    setPending(false);
    if (res?.error) {
      setError(res.error);
      return false;
    }
    router.refresh();
    return true;
  };

  if (editing) {
    return (
      <div>
        <BackLink />
        <h1 className="mb-4 text-2xl font-bold tracking-tight text-brand-navy">
          Edit {request.request_no}
        </h1>
        <RequestForm
          mode="edit"
          request={request}
          clients={clients}
          locations={locations}
          shipmentTypes={shipmentTypes}
          truckTypes={truckTypes}
          onDone={() => setEditing(false)}
          onCancel={() => setEditing(false)}
        />
      </div>
    );
  }

  return (
    <div>
      <BackLink />

      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold tracking-tight text-brand-navy">
            {request.request_no}
          </h1>
          <Badge variant={requestStatusVariant(status)}>{status}</Badge>
        </div>
        <div className="flex flex-wrap gap-2">
          {isDraft ? (
            <>
              <Button variant="outline" onClick={() => setEditing(true)}>
                <Pencil className="h-4 w-4" /> Edit
              </Button>
              <Button
                disabled={pending}
                onClick={() => run(() => submitRequest(request.id))}
              >
                Submit
              </Button>
            </>
          ) : null}
          {status === "Submitted" && isAdmin ? (
            <>
              <Button
                disabled={pending}
                onClick={() => run(() => approveRequest(request.id))}
              >
                Approve
              </Button>
              <Button
                variant="destructive"
                disabled={pending}
                onClick={() => setRejecting(true)}
              >
                Reject
              </Button>
            </>
          ) : null}
          {canCancel ? (
            <Button
              variant="outline"
              disabled={pending}
              onClick={() => {
                if (confirm("Cancel this request?"))
                  run(() => cancelRequest(request.id));
              }}
            >
              Cancel request
            </Button>
          ) : null}
          {isDraft ? (
            <Button
              variant="ghost"
              disabled={pending}
              onClick={() => {
                if (confirm("Delete this draft permanently?"))
                  run(() => deleteRequest(request.id)).then((ok) => {
                    if (ok) router.push("/requests");
                  });
              }}
            >
              <Trash2 className="h-4 w-4" /> Delete
            </Button>
          ) : null}
        </div>
      </div>

      {error ? (
        <p className="mb-4 rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      ) : null}

      {status === "Rejected" && request.rejected_reason ? (
        <p className="mb-4 rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm">
          <span className="font-medium text-destructive">Rejected:</span>{" "}
          {request.rejected_reason}
        </p>
      ) : null}

      <div className="grid gap-5 lg:grid-cols-3">
        <Card className="space-y-4 p-5 lg:col-span-2">
          <h2 className="text-sm font-semibold text-brand-navy">Details</h2>
          <dl className="grid gap-x-6 gap-y-3 sm:grid-cols-2">
            <Detail label="Client" value={labels.client} />
            <Detail label="PO reference" value={request.po_reference ?? "—"} />
            <Detail label="Pickup" value={labels.pickup} />
            <Detail label="Delivery" value={labels.delivery} />
            <Detail label="Shipment type" value={labels.shipmentType} />
            <Detail label="Truck type" value={labels.truckType} />
            <Detail
              label="Quantity"
              value={request.quantity?.toString() ?? "—"}
            />
            <Detail label="Weight" value={request.weight?.toString() ?? "—"} />
            <Detail
              label="Pallets"
              value={request.pallets?.toString() ?? "—"}
            />
            <Detail
              label="Required pickup"
              value={formatDate(request.required_pickup_at)}
            />
            <Detail
              label="Delivery date"
              value={formatDate(request.delivery_date)}
            />
          </dl>
          {request.special_instructions ? (
            <div>
              <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Special instructions
              </dt>
              <dd className="mt-1 whitespace-pre-wrap text-sm">
                {request.special_instructions}
              </dd>
            </div>
          ) : null}
        </Card>

        <Card className="space-y-3 p-5">
          <h2 className="text-sm font-semibold text-brand-navy">History</h2>
          {timeline.length === 0 ? (
            <p className="text-sm text-muted-foreground">No history yet.</p>
          ) : (
            <ol className="space-y-3">
              {timeline.map((t) => (
                <li key={t.id} className="flex gap-3 text-sm">
                  <div className="mt-1 h-2 w-2 shrink-0 rounded-full bg-brand-blue" />
                  <div>
                    <p className="font-medium">
                      {t.from_status ? `${t.from_status} → ` : ""}
                      {t.to_status}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatDate(t.changed_at)} · {t.by}
                    </p>
                  </div>
                </li>
              ))}
            </ol>
          )}
        </Card>
      </div>

      <Card className="mt-5 space-y-3 p-5">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-brand-navy">Items</h2>
          {isDraft ? (
            <Button variant="outline" size="sm" onClick={() => setItem("new")}>
              <Plus className="h-4 w-4" /> Add item
            </Button>
          ) : null}
        </div>
        <Table>
          <THead>
            <TR>
              <TH>Item</TH>
              <TH>Description</TH>
              <TH>Qty</TH>
              <TH>Unit price</TH>
              {isDraft ? <TH></TH> : null}
            </TR>
          </THead>
          <TBody>
            {items.length === 0 ? (
              <TR>
                <TD
                  colSpan={isDraft ? 5 : 4}
                  className="text-center text-muted-foreground"
                >
                  No items.
                </TD>
              </TR>
            ) : (
              items.map((it) => (
                <TR key={it.id}>
                  <TD className="font-medium">{it.item_name}</TD>
                  <TD>{it.description ?? "—"}</TD>
                  <TD>{it.quantity?.toString() ?? "—"}</TD>
                  <TD>{formatMoney(it.unit_price)}</TD>
                  {isDraft ? (
                    <TD className="text-right">
                      <div className="flex justify-end gap-1">
                        <button
                          type="button"
                          onClick={() => setItem(it)}
                          className="rounded p-1.5 text-muted-foreground hover:bg-muted"
                          aria-label="Edit item"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            if (confirm("Remove this item?"))
                              run(() => deleteItem(request.id, it.id));
                          }}
                          className="rounded p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                          aria-label="Delete item"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </TD>
                  ) : null}
                </TR>
              ))
            )}
          </TBody>
        </Table>
      </Card>

      {item ? (
        <ItemDialog
          requestId={request.id}
          item={item === "new" ? undefined : item}
          onClose={() => setItem(null)}
        />
      ) : null}

      {rejecting ? (
        <RejectDialog
          requestId={request.id}
          onClose={() => setRejecting(false)}
        />
      ) : null}
    </div>
  );
}

function BackLink() {
  return (
    <Link
      href="/requests"
      className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
    >
      <ArrowLeft className="h-4 w-4" /> Back to requests
    </Link>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </dt>
      <dd className="mt-0.5 text-sm">{value}</dd>
    </div>
  );
}

function ItemDialog({
  requestId,
  item,
  onClose,
}: {
  requestId: string;
  item?: Item;
  onClose: () => void;
}) {
  const router = useRouter();
  const { register, handleSubmit } = useForm({
    defaultValues: {
      item_name: item?.item_name ?? "",
      description: item?.description ?? "",
      quantity: item?.quantity?.toString() ?? "",
      unit_price: item?.unit_price?.toString() ?? "",
    },
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = handleSubmit(async (values) => {
    setSaving(true);
    setError(null);
    const res = await saveItem(requestId, values, item?.id);
    setSaving(false);
    if (res.error) return setError(res.error);
    onClose();
    router.refresh();
  });

  return (
    <Dialog open onClose={onClose} title={item ? "Edit item" : "Add item"}>
      <form onSubmit={submit} className="space-y-3">
        <div className="space-y-1.5">
          <Label>Item name</Label>
          <Input {...register("item_name", { required: true })} />
        </div>
        <div className="space-y-1.5">
          <Label>Description</Label>
          <Textarea {...register("description")} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label>Quantity</Label>
            <Input type="number" step="0.01" {...register("quantity")} />
          </div>
          <div className="space-y-1.5">
            <Label>Unit price</Label>
            <Input type="number" step="0.01" {...register("unit_price")} />
          </div>
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
          <Button type="submit" disabled={saving}>
            {saving ? "Saving…" : "Save"}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}

function RejectDialog({
  requestId,
  onClose,
}: {
  requestId: string;
  onClose: () => void;
}) {
  const router = useRouter();
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    setSaving(true);
    setError(null);
    const res = await rejectRequest(requestId, reason);
    setSaving(false);
    if (res.error) return setError(res.error);
    onClose();
    router.refresh();
  };

  return (
    <Dialog open onClose={onClose} title="Reject request">
      <div className="space-y-3">
        <div className="space-y-1.5">
          <Label>Reason</Label>
          <Textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Explain why this request is being rejected…"
          />
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
          <Button
            type="button"
            variant="destructive"
            disabled={saving}
            onClick={submit}
          >
            {saving ? "Rejecting…" : "Reject"}
          </Button>
        </div>
      </div>
    </Dialog>
  );
}
