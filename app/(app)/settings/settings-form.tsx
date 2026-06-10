"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { updateProfile, updateEmail, updatePassword } from "./actions";

type Msg = { error?: string; ok?: string } | null;

function Note({ msg }: { msg: Msg }) {
  if (!msg) return null;
  if (msg.error)
    return (
      <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
        {msg.error}
      </p>
    );
  return (
    <p className="rounded-md bg-green-100 px-3 py-2 text-sm text-green-800">
      {msg.ok}
    </p>
  );
}

function Section({
  title,
  description,
  children,
  onSubmit,
  saving,
  msg,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
  onSubmit: () => void;
  saving: boolean;
  msg: Msg;
}) {
  return (
    <Card className="p-5">
      <h2 className="text-sm font-semibold text-brand-navy">{title}</h2>
      {description ? (
        <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>
      ) : null}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          onSubmit();
        }}
        className="mt-4 space-y-3"
      >
        {children}
        <Note msg={msg} />
        <div className="flex justify-end">
          <Button type="submit" disabled={saving}>
            {saving ? "Saving…" : "Save"}
          </Button>
        </div>
      </form>
    </Card>
  );
}

export function SettingsForm({
  fullName,
  phone,
  email,
}: {
  fullName: string;
  phone: string;
  email: string;
}) {
  const router = useRouter();

  // Profile
  const [name, setName] = useState(fullName);
  const [phoneVal, setPhoneVal] = useState(phone);
  const [pSaving, setPSaving] = useState(false);
  const [pMsg, setPMsg] = useState<Msg>(null);

  // Email
  const [emailVal, setEmailVal] = useState(email);
  const [eSaving, setESaving] = useState(false);
  const [eMsg, setEMsg] = useState<Msg>(null);

  // Password
  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");
  const [pwSaving, setPwSaving] = useState(false);
  const [pwMsg, setPwMsg] = useState<Msg>(null);

  const saveProfile = async () => {
    setPSaving(true);
    setPMsg(null);
    const res = await updateProfile({ full_name: name, phone: phoneVal });
    setPSaving(false);
    setPMsg(res);
    if (res.ok) router.refresh();
  };

  const saveEmail = async () => {
    setESaving(true);
    setEMsg(null);
    const res = await updateEmail(emailVal);
    setESaving(false);
    setEMsg(res);
  };

  const savePassword = async () => {
    setPwMsg(null);
    if (pw !== pw2) return setPwMsg({ error: "Passwords don't match." });
    setPwSaving(true);
    const res = await updatePassword(pw);
    setPwSaving(false);
    setPwMsg(res);
    if (res.ok) {
      setPw("");
      setPw2("");
    }
  };

  return (
    <div className="space-y-5">
      <Section
        title="Profile"
        description="Your name and phone number."
        onSubmit={saveProfile}
        saving={pSaving}
        msg={pMsg}
      >
        <div className="space-y-1.5">
          <Label>Full name</Label>
          <Input value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label>Phone</Label>
          <Input
            value={phoneVal}
            onChange={(e) => setPhoneVal(e.target.value)}
            placeholder="Optional"
          />
        </div>
      </Section>

      <Section
        title="Email"
        description="Changing your email sends a confirmation link to the new address. The change applies only after you click it."
        onSubmit={saveEmail}
        saving={eSaving}
        msg={eMsg}
      >
        <div className="space-y-1.5">
          <Label>Email address</Label>
          <Input
            type="email"
            value={emailVal}
            onChange={(e) => setEmailVal(e.target.value)}
          />
        </div>
      </Section>

      <Section
        title="Password"
        description="At least 8 characters."
        onSubmit={savePassword}
        saving={pwSaving}
        msg={pwMsg}
      >
        <div className="space-y-1.5">
          <Label>New password</Label>
          <Input
            type="password"
            value={pw}
            onChange={(e) => setPw(e.target.value)}
            autoComplete="new-password"
          />
        </div>
        <div className="space-y-1.5">
          <Label>Confirm new password</Label>
          <Input
            type="password"
            value={pw2}
            onChange={(e) => setPw2(e.target.value)}
            autoComplete="new-password"
          />
        </div>
      </Section>
    </div>
  );
}
