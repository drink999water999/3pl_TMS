"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { useRouter } from "next/navigation";
import { Dialog } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { saveClient } from "./actions";
import type { Tables } from "@/lib/database.types";

type ClientRow = Tables<"clients">;

type FormValues = {
  name: string;
  code: string;
  tax_id: string;
  phone: string;
  email: string;
  billing_address: string;
  notes: string;
  is_active: boolean;
  pricing_mode: "fixed" | "per_km";
  currency: string;
  rate_per_km: string;
  base_charge: string;
  margin_type: "" | "percent" | "fixed";
  margin_value: string;
};

export function ClientDialog({
  open,
  onClose,
  client,
}: {
  open: boolean;
  onClose: () => void;
  client?: ClientRow;
}) {
  const router = useRouter();
  const { register, handleSubmit, watch } = useForm<FormValues>({
    defaultValues: {
      name: client?.name ?? "",
      code: client?.code ?? "",
      tax_id: client?.tax_id ?? "",
      phone: client?.phone ?? "",
      email: client?.email ?? "",
      billing_address: client?.billing_address ?? "",
      notes: client?.notes ?? "",
      is_active: client?.is_active ?? true,
      pricing_mode: (client?.pricing_mode as "fixed" | "per_km") ?? "fixed",
      currency: client?.currency ?? "SAR",
      rate_per_km: client?.rate_per_km?.toString() ?? "",
      base_charge: client?.base_charge?.toString() ?? "",
      margin_type: (client?.margin_type as "" | "percent" | "fixed") ?? "",
      margin_value: client?.margin_value?.toString() ?? "",
    },
  });
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const pricingMode = watch("pricing_mode");
  const marginType = watch("margin_type");

  const onSubmit = handleSubmit(async (values) => {
    setSaving(true);
    setError(null);
    const res = await saveClient(values, client?.id);
    setSaving(false);
    if (res.error) return setError(res.error);
    onClose();
    router.refresh();
  });

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={client ? "Edit client" : "New client"}
    >
      <form onSubmit={onSubmit} className="space-y-3">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="name">Name</Label>
            <Input id="name" {...register("name", { required: true })} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="code">Code</Label>
            <Input id="code" {...register("code", { required: true })} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="phone">Phone</Label>
            <Input id="phone" {...register("phone")} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" {...register("email")} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="tax_id">Tax ID</Label>
            <Input id="tax_id" {...register("tax_id")} />
          </div>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="billing_address">Billing address</Label>
          <Textarea id="billing_address" {...register("billing_address")} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="notes">Notes</Label>
          <Textarea id="notes" {...register("notes")} />
        </div>
        <div className="rounded-lg border bg-muted/30 p-3">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-brand-navy">
            Pricing
          </p>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="pricing_mode">Rate method</Label>
              <Select id="pricing_mode" {...register("pricing_mode")}>
                <option value="fixed">Fixed (contract rate per lane)</option>
                <option value="per_km">By distance (per km)</option>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="currency">Currency</Label>
              <Input id="currency" {...register("currency")} placeholder="SAR" />
            </div>
            {pricingMode === "per_km" ? (
              <>
                <div className="space-y-1.5">
                  <Label htmlFor="base_charge">Base charge</Label>
                  <Input
                    id="base_charge"
                    type="number"
                    step="0.01"
                    min="0"
                    {...register("base_charge")}
                    placeholder="0"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="rate_per_km">Rate per km</Label>
                  <Input
                    id="rate_per_km"
                    type="number"
                    step="0.01"
                    min="0"
                    {...register("rate_per_km")}
                  />
                </div>
              </>
            ) : (
              <p className="sm:col-span-2 text-xs text-muted-foreground">
                Fixed mode bills the contract rate for the lane (per destination
                + truck type) you add under this client. Only the selected
                method applies &mdash; the per-km fields are ignored in Fixed
                mode, and contract rates are ignored in By-distance mode.
              </p>
            )}
          </div>

          <p className="mb-2 mt-4 text-xs font-semibold uppercase tracking-wide text-brand-navy">
            Margin / take (internal)
          </p>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="margin_type">Markup rule</Label>
              <Select id="margin_type" {...register("margin_type")}>
                <option value="">None (use price - carrier cost)</option>
                <option value="percent">Percent of price</option>
                <option value="fixed">Fixed amount</option>
              </Select>
            </div>
            {marginType ? (
              <div className="space-y-1.5">
                <Label htmlFor="margin_value">
                  {marginType === "percent" ? "Markup %" : "Markup amount"}
                </Label>
                <Input
                  id="margin_value"
                  type="number"
                  step="0.01"
                  min="0"
                  {...register("margin_value")}
                />
              </div>
            ) : null}
            <p className="sm:col-span-2 text-xs text-muted-foreground">
              When a carrier cost is entered on a dispatch, margin = price -
              cost. Otherwise this markup rule is used.
            </p>
          </div>
        </div>

        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" {...register("is_active")} /> Active
        </label>

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
