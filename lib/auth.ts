import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Profile, Role } from "@/lib/types";

/** Current auth user + their profile (or nulls if signed out). */
export async function getUserAndProfile() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { user: null, profile: null };

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();

  return { user, profile: profile as Profile | null };
}

/** Redirects to /login if not signed in. */
export async function requireUser() {
  const result = await getUserAndProfile();
  if (!result.user) redirect("/login");
  return result;
}

/** Redirects to /login if signed out, or /dashboard if role not allowed. */
export async function requireRole(roles: Role[]) {
  const { user, profile } = await requireUser();
  if (!profile || !profile.active || !roles.includes(profile.role)) {
    redirect("/dashboard");
  }
  return { user, profile };
}
