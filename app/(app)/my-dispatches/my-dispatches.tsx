"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Upload, MapPin, Check, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Card } from "@/components/ui/card";
import { dispatchStatusVariant, formatDate } from "@/lib/format";
import { nextDispatchStatus } from "@/lib/dispatch";
import type { DispatchStatus } from "@/lib/dispatch";
import { uploadPod } from "../dispatch/actions";
import { driverAdvanceDispatch } from "./actions";

type Place = {
  name: string | null;
  city: string | null;
  address: string | null;
  mapsUrl: string | null;
};

type Item = {
  id: string;
  status: string;
  version: number;
  hasIssue: boolean;
  hasPod: boolean;
  waybillNo: string | null;
  client: string | null;
  pickup: Place;
  delivery: Place;
  pickupDate: string | null;
  truck: string | null;
};

// Prefer the saved Google Maps URL; otherwise build a search link from the
// place's name/city/address so the driver always gets a clickable location.
function mapsHref(p: Place): string | null {
  if (p.mapsUrl) return p.mapsUrl;
  const q = [p.name, p.city, p.address].filter(Boolean).join(", ");
  if (!q) return null;
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q)}`;
}

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

function PlaceBlock({
  label,
  place,
  color,
}: {
  label: string;
  place: Place;
  color: string;
}) {
  const href = mapsHref(place);
  return (
    <div className="flex items-start gap-2">
      <MapPin className={`mt-0.5 h-4 w-4 shrink-0 ${color}`} />
      <div className="min-w-0">
        <p className="text-xs uppercase text-muted-foreground">{label}</p>
        <p className="font-medium">{place.name || place.address || "—"}</p>
        {place.city ? (
          <p className="text-sm text-muted-foreground">{place.city}</p>
        ) : null}
        {href ? (
          <a
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-0.5 inline-flex items-center gap-1 text-sm text-brand-blue hover:underline"
          >
            <ExternalLink className="h-3.5 w-3.5" /> Open in Google Maps
          </a>
        ) : null}
      </div>
    </div>
  );
}

function DispatchCard({ item }: { item: Item }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPod, setShowPod] = useState(false);

  const next = nextDispatchStatus(item.status);
  // Drivers finish at "Delivered"; the office handles "Confirmed".
  const showAdvance = next != null && next !== "Confirmed";
  const deliverNeedsPod = next === "Delivered" && !item.hasPod;
  const isDelivered = item.status === "Delivered" || item.status === "Confirmed";

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

      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <PlaceBlock label="Pickup" place={item.pickup} color="text-green-600" />
        <PlaceBlock
          label="Delivery"
          place={item.delivery}
          color="text-brand-blue"
        />
      </div>
      <div className="mt-2 space-y-1 text-xs text-muted-foreground">
        {item.pickupDate ? <p>Pickup date: {formatDate(item.pickupDate)}</p> : null}
        {item.truck ? <p>Truck: {item.truck}</p> : null}
      </div>

      {error ? (
        <p className="mt-3 rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      ) : null}

      <div className="mt-4 flex flex-wrap gap-2">
        {showAdvance ? (
          <Button
            disabled={pending || deliverNeedsPod}
            title={deliverNeedsPod ? "Upload delivery proof first" : undefined}
            onClick={advance}
          >
            Mark as {next} <ArrowRight className="h-4 w-4" />
          </Button>
        ) : isDelivered ? (
          <Badge variant="success">Delivered</Badge>
        ) : null}
        <Button variant="outline" onClick={() => setShowPod((v) => !v)}>
          <Upload className="h-4 w-4" /> Upload photos
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
  const [stage, setStage] = useState<"pickup" | "delivery">("delivery");
  const [note, setNote] = useState("");
  const [files, setFiles] = useState<FileList | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!files || files.length === 0)
      return setError("Choose at least one photo.");
    setSaving(true);
    setError(null);
    const fd = new FormData();
    fd.set("dispatch_id", dispatchId);
    fd.set("stage", stage);
    fd.set("note", note);
    Array.from(files).forEach((f) => fd.append("files", f));
    const res = await uploadPod(fd);
    setSaving(false);
    if (res.error) return setError(res.error);
    onDone();
  };

  return (
    <form onSubmit={submit} className="mt-3 space-y-2 border-t pt-3">
      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-1.5">
          <Label>Proof for</Label>
          <Select
            value={stage}
            onChange={(e) => setStage(e.target.value as "pickup" | "delivery")}
          >
            <option value="pickup">Pickup</option>
            <option value="delivery">Delivery</option>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label>Photos (one or more)</Label>
          <Input
            type="file"
            accept="image/*"
            capture="environment"
            multiple
            onChange={(e) => setFiles(e.target.files)}
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
        <Check className="h-4 w-4" /> {saving ? "Uploading…" : "Save photos"}
      </Button>
    </form>
  );
}
