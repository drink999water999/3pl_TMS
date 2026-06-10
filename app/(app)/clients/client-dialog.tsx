"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { useRouter } from "next/navigation";
import { Dialog } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  const { register, handleSubmit } = useForm<FormValues>({
    defaultValues: {
      name: client?.name ?? "",
      code: client?.code ?? "",
      tax_id: client?.tax_id ?? "",
      phone: client?.phone ?? "",
      email: client?.email ?? "",
      billing_address: client?.billing_address ?? "",
      notes: client?.notes ?? "",
      is_active: client?.is_active ?? true,
    },
  });
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

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
