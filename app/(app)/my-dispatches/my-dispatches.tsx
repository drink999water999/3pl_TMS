"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Upload, MapPin, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Card } from "@/components/ui/card";
import { dispatchStatusVariant } from "@/lib/format";
import { nextDispatchStatus } from "@/lib/dispatch";
import type { DispatchStatus } from "@/lib/dispatch";
import { uploadPod } from "../dispatch/actions";
import { driverAdvanceDispatch } from "./actions";

type Item = {
  id: string;
  status: string;
  version: number;
  hasIssue: boolean;
  hasPod: boolean;
  waybillNo: string | null;
  client: string | null;
  pickup: string | null;
  delivery: string | null;
  truck: string | null;
};

export function MyDispatches({ items }: { items: Item[] }) {
  if (items.length === 0) {
    return (
      <Card className="p-10 text-center text-sm text-muted-foreground">
        You have no deliveries assigned right now.
      </Card>
    );
  }
  return (
    <div className="space-y-4">
      {items.map((it) => (
        <DispatchCard key={it.id} item={it} />
      ))}
    </div>
  );
}

function DispatchCard({ item }: { item: Item }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPod, setShowPod] = useState(false);

  const next = nextDispatchStatus(item.status);
  const deliverNeedsPod = next === "Delivered" && !item.hasPod;

  const advance = async () => {
    setPending(true);
    setError(null);
    const res = await driverAdvanceDispatch(
      item.id,
      item.status as DispatchStatus,
      item.version,
    );
    setPending(false);
    if (res.error) return setError(res.error);
    router.refresh();
  };

  return (
    <Card className="p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-semibold text-brand-navy">
            {item.client ?? "Awaiting dispatch"}
          </p>
          {item.waybillNo ? (
            <p className="text-xs text-muted-foreground">{item.waybillNo}</p>
          ) : null}
        </div>
        <div className="flex flex-wrap items-center justify-end gap-2">
          <Badge variant={dispatchStatusVariant(item.status)}>
            {item.status}
          </Badge>
          {item.hasIssue ? <Badge variant="danger">Issue</Badge> : null}
        </div>
      </div>

      <div className="mt-3 space-y-2 text-sm">
        <div className="flex items-start gap-2">
          <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-green-600" />
          <div>
            <p className="text-xs uppercase text-muted-foreground">Pickup</p>
            <p>{item.pickup ?? "—"}</p>
          </div>
        </div>
        <div className="flex items-start gap-2">
          <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-brand-blue" />
          <div>
            <p className="text-xs uppercase text-muted-foreground">Delivery</p>
            <p>{item.delivery ?? "—"}</p>
          </div>
        </div>
        {item.truck ? (
          <p className="text-xs text-muted-foreground">Truck: {item.truck}</p>
        ) : null}
      </div>

      {error ? (
        <p className="mt-3 rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      ) : null}

      <div className="mt-4 flex flex-wrap gap-2">
        {next ? (
          <Button
            disabled={pending || deliverNeedsPod}
            title={deliverNeedsPod ? "Upload a POD first" : undefined}
            onClick={advance}
          >
            Mark as {next} <ArrowRight className="h-4 w-4" />
          </Button>
        ) : (
          <Badge variant="success">Delivered</Badge>
        )}
        <Button
          variant="outline"
          onClick={() => setShowPod((v) => !v)}
        >
          <Upload className="h-4 w-4" /> Proof of delivery
        </Button>
      </div>

      {showPod ? (
        <PodForm
          dispatchId={item.id}
          onDone={() => {
            setShowPod(false);
            router.refresh();
          }}
        />
      ) : null}
    </Card>
  );
}

function PodForm({
  dispatchId,
  onDone,
}: {
  dispatchId: string;
  onDone: () => void;
}) {
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
    onDone();
  };

  return (
    <form onSubmit={submit} className="mt-3 space-y-2 border-t pt-3">
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
          <Label>Photo / file</Label>
          <Input
            type="file"
            accept="image/*,application/pdf"
            capture="environment"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          />
        </div>
      </div>
      <div className="space-y-1.5">
        <Label>Note</Label>
        <Input
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Received by…"
        />
      </div>
      {error ? (
        <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      ) : null}
      <Button type="submit" size="sm" disabled={saving}>
        <Check className="h-4 w-4" /> {saving ? "Uploading…" : "Save POD"}
      </Button>
    </form>
  );
}
