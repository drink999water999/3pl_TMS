import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";

/**
 * Service-role Supabase client for privileged server-side operations:
 *  - creating auth users / resetting passwords (Admin API)
 *  - reading any user's email
 *  - signing waybill PDFs for the owning client (bypasses storage RLS after
 *    the calling action has authorized the user)
 *
 * NEVER import this into a Client Component. Requires SUPABASE_SERVICE_ROLE_KEY
 * (the Secret / service_role key) in the environment.
 */
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    throw new Error(
      "Admin actions need NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in the environment.",
    );
  }
  return createSupabaseClient<Database>(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
