"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { registerSchema } from "@/lib/validation";

export type RegisterState = { error: string | null; success?: boolean };

export async function registerClient(
  _prev: RegisterState,
  formData: FormData,
): Promise<RegisterState> {
  const parsed = registerSchema.safeParse({
    full_name: formData.get("full_name"),
    company_name: formData.get("company_name"),
    email: formData.get("email"),
    phone: formData.get("phone"),
    password: formData.get("password"),
  });
  if (!parsed.success)
    return { error: parsed.error.issues[0]?.message ?? "Invalid input." };

  const { full_name, company_name, email, phone, password } = parsed.data;

  let admin;
  try {
    admin = createAdminClient();
  } catch {
    return {
      error:
        "Sign-up isn't available right now. Please contact the administrator.",
    };
  }

  // Create the account up-front (email pre-confirmed). The DB signup trigger
  // provisions an INACTIVE 'client' profile that an admin must approve.
  const { error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: {
      full_name,
      company_name,
      phone: phone ?? undefined,
    },
  });

  if (error) {
    if (/already|registered|exists|duplicate/i.test(error.message))
      return { error: "An account with this email already exists." };
    return { error: error.message };
  }

  return { error: null, success: true };
}
