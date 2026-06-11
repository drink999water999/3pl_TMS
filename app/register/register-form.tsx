"use client";

import { useFormState, useFormStatus } from "react-dom";
import Link from "next/link";
import { ArrowRight, Loader2, CheckCircle2 } from "lucide-react";
import { registerClient, type RegisterState } from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const initialState: RegisterState = { error: null };

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="lg" className="w-full" disabled={pending}>
      {pending ? (
        <>
          <Loader2 className="animate-spin" /> Creating account…
        </>
      ) : (
        <>
          Create account <ArrowRight />
        </>
      )}
    </Button>
  );
}

export function RegisterForm() {
  const [state, formAction] = useFormState(registerClient, initialState);

  if (state.success) {
    return (
      <div className="space-y-4 text-center">
        <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
          <CheckCircle2 className="h-6 w-6" />
        </span>
        <div>
          <h3 className="text-lg font-semibold text-brand-navy">
            Account created
          </h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Your account is now pending administrator approval. You&apos;ll be
            able to sign in once it&apos;s approved.
          </p>
        </div>
        <Button asChild variant="outline" className="w-full">
          <Link href="/login">Back to sign in</Link>
        </Button>
      </div>
    );
  }

  return (
    <form action={formAction} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="full_name">Your name</Label>
        <Input id="full_name" name="full_name" autoComplete="name" required />
      </div>
      <div className="space-y-2">
        <Label htmlFor="company_name">Company</Label>
        <Input id="company_name" name="company_name" required />
      </div>
      <div className="space-y-2">
        <Label htmlFor="email">Work email</Label>
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="phone">Phone (optional)</Label>
        <Input id="phone" name="phone" type="tel" autoComplete="tel" />
      </div>
      <div className="space-y-2">
        <Label htmlFor="password">Password</Label>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="new-password"
          placeholder="At least 8 characters"
          required
        />
      </div>

      {state.error ? (
        <p
          role="alert"
          className="rounded-lg border border-destructive/20 bg-destructive/10 px-3 py-2 text-sm text-destructive"
        >
          {state.error}
        </p>
      ) : null}

      <SubmitButton />
    </form>
  );
}
