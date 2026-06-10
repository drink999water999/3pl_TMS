"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/auth";

type Result = { error?: string; ok?: string };

export async function updateProfile(input: {
  full_name: string;
  phone: string;
}): Promise<Result> {
  const { user } = await requireUser();
  if (!user) return { error: "You're not signed in." };

  const full_name = input.full_name.trim();
  if (!full_name) return { error: "Name can't be empty." };

  const supabase = await createClient();
  const { error } = await supabase
    .from("profiles")
    .update({ full_name, phone: input.phone.trim() || null })
    .eq("id", user.id);
  if (error) return { error: error.message };

  revalidatePath("/settings");
  revalidatePath("/", "layout"); // refresh the name shown in the sidebar
  return { ok: "Profile saved." };
}

export async function updateEmail(email: string): Promise<Result> {
  await requireUser();
  const next = email.trim();
  if (!next) return { error: "Enter an email address." };

  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ email: next });
  if (error) return { error: error.message };
  return {
    ok: "Confirmation sent. Open the link in the new inbox to finish the change.",
  };
}

export async function updatePassword(password: string): Promise<Result> {
  await requireUser();
  if (password.length < 8)
    return { error: "Password must be at least 8 characters." };

  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password });
  if (error) return { error: error.message };
  return { ok: "Password updated." };
}
