"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  AlertTriangle,
  Check,
  Plus,
  Upload,
  FileText,
  ExternalLink,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Dialog } from "@/components/ui/dialog";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { formatDate, dispatchStatusVariant } from "@/lib/format";
import { DISPATCH_FLOW, nextDispatchStatus } from "@/lib/dispatch";
import type { Tables } from "@/lib/database.types";
import {
  advanceDispatch,
  setDispatchPricing,
  flagIssue,
  resolveIssue,
  uploadPod,
  addException,
  resolveException,
  closeShipment,
} from "../actions";

type Pod = {
  id: string;
  kind: string;
  note: string | null;
  uploaded_at: string;
  by: string;
  url: string | null;
};
type ExceptionItem = {
  id: string;
  kind: string;
  description: string | null;
  resolved_at: string | null;
  created_at: string;
  by: string;
};

type Dispatch = Tables<"dispatches">;
type Labels = {
  requestNo: string;
  client: string;
  route: string;
  truck: string;
  driver: string;
  supplier: string;
  truckType: string;
};
type TimelineEntry = {
  id: string;
  from_status: string | null;
  to_status: string;
  changed_at: string;
  by: string;
};

export function DispatchDetail({
  dispatch,
  requestId,
  labels,
  waybill,
  timeline,
  pods,
  exceptions,
}: {
  dispatch: Dispatch;
  requestId: string;
  labels: Labels;
  waybill: { id: string; waybill_no: string; status: string } | null;
  timeline: TimelineEntry[];
  pods: Pod[];
  exceptions: ExceptionItem[];
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [flagging, setFlagging] = useState(false);
  const [addingException, setAddingException] = useState(false);

  const status = dispatch.status;
  const next = nextDispatchStatus(status);
  const isOwn = dispatch.assignment_type === "own";
  const isDelivered = status === "Delivered";
  const hasPod = pods.length > 0;
  const currentIndex = DISPATCH_FLOW.indexOf(status as (typeof DISPATCH_FLOW)[number]);

  const run = async (fn: () => Promise<{ error?: string }>) => {
    setError(null);
    setPending(true);
    const res = await fn();
    setPending(false);
    if (res?.error) return setError(res.error);
    router.refresh();
  };

  return (
    <div>
      <Link
        href="/dispatch"
        className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> Back to board
      </Link>

      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <Link
            href={`/requests/${requestId}`}
            className="text-2xl font-bold tracking-tight text-brand-navy hover:underline"
          >
            {labels.requestNo}
          </Link>
          <Badge variant={dispatchStatusVariant(status)}>{status}</Badge>
          {dispatch.has_issue ? <Badge variant="danger">Issue</Badge> : null}
          {dispatch.ready_for_billing ? (
            <Badge variant="info">Ready for billing</Badge>
          ) : null}
        </div>
        <div className="flex flex-wrap gap-2">
          {next ? (
            <Button
              disabled={pending || (next === "Delivered" && !hasPod)}
              title={
                next === "Delivered" && !hasPod
                  ? "Add a proof of delivery first"
                  : undefined
              }
              onClick={() =>
                run(() => advanceDispatch(dispatch.id, status, dispatch.version))
              }
            >
              Mark as {next} <ArrowRight className="h-4 w-4" />
            </Button>
          ) : null}
          {isDelivered && !dispatch.ready_for_billing ? (
            <Button
              variant="outline"
              disabled={pending}
              onClick={() =>
                run(() => closeShipment(dispatch.id, dispatch.version))
              }
            >
              <Check className="h-4 w-4" /> Close shipment
            </Button>
          ) : null}
          {dispatch.has_issue ? (
            <Button
              variant="outline"
              disabled={pending}
              onClick={() => run(() => resolveIssue(dispatch.id, dispatch.version))}
            >
              <Check className="h-4 w-4" /> Resolve issue
            </Button>
          ) : (
            <Button
              variant="outline"
              disabled={pending}
              onClick={() => setFlagging(true)}
            >
              <AlertTriangle className="h-4 w-4" /> Flag issue
            </Button>
          )}
        </div>
      </div>

      {error ? (
        <p className="mb-4 rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      ) : null}

      {/* Stepper */}
      <Card className="mb-5 p-5">
        <ol className="flex flex-wrap items-center gap-2">
          {DISPATCH_FLOW.map((s, i) => (
            <li key={s} className="flex items-center gap-2">
              <span
                className={cn(
                  "rounded-full px-3 py-1 text-xs font-medium",
                  i < currentIndex && "bg-green-100 text-green-800",
                  i === currentIndex && "bg-brand-navy text-white",
                  i > currentIndex && "bg-muted text-muted-foreground",
                )}
              >
                {s}
              </span>
              {i < DISPATCH_FLOW.length - 1 ? (
                <ArrowRight className="h-3 w-3 text-muted-foreground" />
              ) : null}
            </li>
          ))}
        </ol>
        {status === "In Transit" ? (
          <p className="mt-3 text-xs text-muted-foreground">
            Marking <span className="font-medium">Delivered</span> requires a
            proof of delivery, which is added in the Tracking/POD module
            (Phase 7).
          </p>
        ) : null}
      </Card>

      {dispatch.has_issue && dispatch.issue_note ? (
        <p className="mb-5 rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm">
          <span className="font-medium text-destructive">Issue:</span>{" "}
          {dispatch.issue_note}
        </p>
      ) : null}

      <div className="grid gap-5 lg:grid-cols-3">
        <Card className="space-y-4 p-5 lg:col-span-2">
          <h2 className="text-sm font-semibold text-brand-navy">Assignment</h2>
          <dl className="grid gap-x-6 gap-y-3 sm:grid-cols-2">
            <Detail label="Client" value={labels.client} />
            <Detail label="Route" value={labels.route} />
            <Detail
              label="Type"
              value={isOwn ? "Own fleet" : "Outsourced"}
            />
            <Detail label="Truck type" value={labels.truckType} />
            {isOwn ? (
              <>
                <Detail label="Truck" value={labels.truck} />
                <Detail label="Driver" value={labels.driver} />
              </>
            ) : (
              <>
                <Detail label="Supplier" value={labels.supplier} />
                <Detail
                  label="Supplier truck"
                  value={dispatch.supplier_truck ?? "—"}
                />
              </>
            )}
            <Detail
              label="Dispatched"
              value={formatDate(dispatch.dispatched_at)}
            />
            <Detail
              label="Picked up"
              value={formatDate(dispatch.picked_up_at)}
            />
            <Detail
              label="Delivered"
              value={formatDate(dispatch.delivered_at)}
            />
          </dl>
          {dispatch.notes ? (
            <div>
              <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Notes
              </dt>
              <dd className="mt-1 whitespace-pre-wrap text-sm">
                {dispatch.notes}
              </dd>
            </div>
          ) : null}
        </Card>

        <div className="space-y-5">
          <Card className="space-y-2 p-5">
            <h2 className="text-sm font-semibold text-brand-navy">Waybill</h2>
            {waybill ? (
              <div className="flex items-center gap-2 text-sm">
                <Link
                  href={`/waybills/${waybill.id}`}
                  className="font-medium text-brand-navy hover:underline"
                >
                  {waybill.waybill_no}
                </Link>
                <Badge
                  variant={waybill.status === "approved" ? "success" : "default"}
                >
                  {waybill.status}
                </Badge>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                Created automatically once this dispatch is marked Dispatched.
              </p>
            )}
          </Card>

          <DispatchPricingCard dispatch={dispatch} />

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
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-2">
        <Card className="space-y-3 p-5">
          <h2 className="text-sm font-semibold text-brand-navy">
            Proof of delivery
          </h2>
          {pods.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No POD yet. Add one to allow marking the shipment Delivered.
            </p>
          ) : (
            <ul className="space-y-2">
              {pods.map((p) => (
                <li
                  key={p.id}
                  className="rounded-md border p-3 text-sm"
                >
                  <div className="flex items-center gap-2">
                    <Badge variant="default">
                      {p.kind === "photo" ? "Photo" : "Signed note"}
                    </Badge>
                    {p.url ? (
                      <a
                        href={p.url}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-brand-navy hover:underline"
                      >
                        <ExternalLink className="h-3 w-3" /> View file
                      </a>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-muted-foreground">
                        <FileText className="h-3 w-3" /> Note only
                      </span>
                    )}
                  </div>
                  {p.note ? <p className="mt-1">{p.note}</p> : null}
                  <p className="mt-1 text-xs text-muted-foreground">
                    {formatDate(p.uploaded_at)} · {p.by}
                  </p>
                </li>
              ))}
            </ul>
          )}
          <PodUpload dispatchId={dispatch.id} />
        </Card>

        <Card className="space-y-3 p-5">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-brand-navy">
              Exceptions
            </h2>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setAddingException(true)}
            >
              <Plus className="h-4 w-4" /> Add
            </Button>
          </div>
          {exceptions.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No exceptions logged.
            </p>
          ) : (
            <ul className="space-y-2">
              {exceptions.map((e) => (
                <li key={e.id} className="rounded-md border p-3 text-sm">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <Badge variant={e.resolved_at ? "default" : "danger"}>
                        {e.kind}
                      </Badge>
                      {e.resolved_at ? (
                        <span className="text-xs text-muted-foreground">
                          Resolved
                        </span>
                      ) : null}
                    </div>
                    {!e.resolved_at ? (
                      <button
                        type="button"
                        disabled={pending}
                        onClick={() =>
                          run(() => resolveException(dispatch.id, e.id))
                        }
                        className="text-xs text-brand-navy hover:underline"
                      >
                        Resolve
                      </button>
                    ) : null}
                  </div>
                  {e.description ? (
                    <p className="mt-1">{e.description}</p>
                  ) : null}
                  <p className="mt-1 text-xs text-muted-foreground">
                    {formatDate(e.created_at)} · {e.by}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      {flagging ? (
        <FlagDialog
          dispatchId={dispatch.id}
          version={dispatch.version}
          onClose={() => setFlagging(false)}
        />
      ) : null}
      {addingException ? (
        <ExceptionDialog
          dispatchId={dispatch.id}
          requestId={requestId}
          onClose={() => setAddingException(false)}
        />
      ) : null}
    </div>
  );
}

function PodUpload({ dispatchId }: { dispatchId: string }) {
  const router = useRouter();
  const [kind, setKind] = useState<"photo" | "signed_note">("photo");
  const [note, setNote] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    const fd = new FormData();
    fd.set("dispatch_id", dispatchId);
    fd.set("kind", kind);
    fd.set("note", note);
    if (file) fd.set("file", file);
    const res = await uploadPod(fd);
    setSaving(false);
    if (res.error) return setError(res.error);
    setNote("");
    setFile(null);
    router.refresh();
  };

  return (
    <form onSubmit={submit} className="space-y-2 border-t pt-3">
      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-1.5">
          <Label>Type</Label>
          <Select
            value={kind}
            onChange={(e) => setKind(e.target.value as "photo" | "signed_note")}
          >
            <option value="photo">Photo</option>
            <option value="signed_note">Signed note</option>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label>File</Label>
          <Input
            type="file"
            accept="image/*,application/pdf"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          />
        </div>
      </div>
      <div className="space-y-1.5">
        <Label>Note</Label>
        <Input
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Recipient name, remarks…"
        />
      </div>
      {error ? (
        <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      ) : null}
      <Button type="submit" size="sm" disabled={saving}>
        <Upload className="h-4 w-4" /> {saving ? "Uploading…" : "Add POD"}
      </Button>
    </form>
  );
}

function ExceptionDialog({
  dispatchId,
  requestId,
  onClose,
}: {
  dispatchId: string;
  requestId: string;
  onClose: () => void;
}) {
  const router = useRouter();
  const [kind, setKind] = useState<"delay" | "damage" | "complaint">("delay");
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    setSaving(true);
    setError(null);
    const res = await addException(dispatchId, requestId, { kind, description });
    setSaving(false);
    if (res.error) return setError(res.error);
    onClose();
    router.refresh();
  };

  return (
    <Dialog open onClose={onClose} title="Log an exception">
      <div className="space-y-3">
        <div className="space-y-1.5">
          <Label>Type</Label>
          <Select
            value={kind}
            onChange={(e) =>
              setKind(e.target.value as "delay" | "damage" | "complaint")
            }
          >
            <option value="delay">Delay</option>
            <option value="damage">Damage</option>
            <option value="complaint">Complaint</option>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label>Description</Label>
          <Textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="What happened?"
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
          <Button type="button" disabled={saving} onClick={submit}>
            {saving ? "Saving…" : "Log exception"}
          </Button>
        </div>
      </div>
    </Dialog>
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

function FlagDialog({
  dispatchId,
  version,
  onClose,
}: {
  dispatchId: string;
  version: number;
  onClose: () => void;
}) {
  const router = useRouter();
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    setSaving(true);
    setError(null);
    const res = await flagIssue(dispatchId, version, note);
    setSaving(false);
    if (res.error) return setError(res.error);
    onClose();
    router.refresh();
  };

  return (
    <Dialog open onClose={onClose} title="Flag an issue">
      <div className="space-y-3">
        <div className="space-y-1.5">
          <Label>What went wrong?</Label>
          <Textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Delay, damage, wrong address, customer not reachable…"
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
          <Button type="button" disabled={saving} onClick={submit}>
            {saving ? "Saving…" : "Flag issue"}
          </Button>
        </div>
      </div>
    </Dialog>
  );
}

function DispatchPricingCard({ dispatch }: { dispatch: Dispatch }) {
  const router = useRouter();
  const [cost, setCost] = useState(dispatch.carrier_cost?.toString() ?? "");
  const [charge, setCharge] = useState(
    dispatch.customer_charge?.toString() ?? "",
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const save = async () => {
    setBusy(true);
    setError(null);
    const res = await setDispatchPricing(
      dispatch.id,
      dispatch.version,
      cost,
      charge,
    );
    setBusy(false);
    if (res.error) return setError(res.error);
    router.refresh();
  };

  return (
    <Card className="space-y-3 p-5">
      <h2 className="text-sm font-semibold text-brand-navy">Pricing</h2>
      <div className="space-y-1.5">
        <Label>Carrier cost (what we pay)</Label>
        <Input
          type="number"
          step="0.01"
          min="0"
          value={cost}
          onChange={(e) => setCost(e.target.value)}
          placeholder="Optional"
        />
      </div>
      <div className="space-y-1.5">
        <Label>Customer charge (what we bill)</Label>
        <Input
          type="number"
          step="0.01"
          min="0"
          value={charge}
          onChange={(e) => setCharge(e.target.value)}
          placeholder="Blank = auto from client pricing"
        />
      </div>
      {error ? (
        <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      ) : null}
      <Button size="sm" disabled={busy} onClick={save}>
        Save & reprice
      </Button>
      <p className="text-xs text-muted-foreground">
        Updates the waybill amount and margin. Leave the charge blank to use the
        client&apos;s configured pricing.
      </p>
    </Card>
  );
}
