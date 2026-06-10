// Seed the first Admin user into the LOCAL Supabase stack.
//
// Usage (loads .env.local for the keys):
//   pnpm seed:admin
// Override the credentials with env vars or in .env.local:
//   ADMIN_EMAIL=me@example.com ADMIN_PASSWORD='Secret123!' pnpm seed:admin
//
// Requires NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY in .env.local.
// SUPABASE_SERVICE_ROLE_KEY must be the *Secret* / service_role key (NOT the
// Publishable / anon key) or Supabase returns "User not allowed".

import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const email = process.env.ADMIN_EMAIL ?? "admin@fastlane.local";
const password = process.env.ADMIN_PASSWORD ?? "ChangeMe123!";
const fullName = process.env.ADMIN_NAME ?? "FastLane Admin";

if (!url || !serviceKey) {
  console.error(
    "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.\n" +
      "Run after `supabase start` and after filling in .env.local.",
  );
  process.exit(1);
}

const supabase = createClient(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function findUserByEmail(targetEmail) {
  for (let page = 1; page <= 20; page++) {
    const { data, error } = await supabase.auth.admin.listUsers({
      page,
      perPage: 200,
    });
    if (error) throw error;
    const found = data.users.find((u) => u.email === targetEmail);
    if (found) return found;
    if (data.users.length < 200) break;
  }
  return null;
}

async function main() {
  let userId;

  const { data: created, error: createErr } =
    await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: fullName },
    });

  if (createErr) {
    // "User not allowed" almost always means SUPABASE_SERVICE_ROLE_KEY holds the
    // Publishable/anon key instead of the Secret/service_role key.
    if (/not allowed|not_admin|forbidden/i.test(createErr.message)) {
      console.error(
        '\n"User not allowed" — SUPABASE_SERVICE_ROLE_KEY is probably the wrong key.\n' +
          "It must be the Secret / service_role key from `supabase status`,\n" +
          "and NEXT_PUBLIC_SUPABASE_ANON_KEY must be the Publishable / anon key.\n" +
          "It looks like the two keys may be swapped in .env.local.\n",
      );
      process.exit(1);
    }
    // Otherwise: likely already registered — look the user up and continue.
    const existing = await findUserByEmail(email);
    if (!existing) throw createErr;
    userId = existing.id;
    console.log(`User ${email} already exists — promoting to admin.`);
  } else {
    userId = created.user.id;
    console.log(`Created auth user ${email}.`);
  }

  const { error: profileErr } = await supabase.from("profiles").upsert(
    { id: userId, full_name: fullName, role: "admin", active: true },
    { onConflict: "id" },
  );
  if (profileErr) throw profileErr;

  console.log("\n✅ Admin ready. Sign in at http://localhost:3000/login");
  console.log(`   Email:    ${email}`);
  console.log(`   Password: ${password}`);
  console.log("   (change the password after first login)");
}

main()
  .then(() => {
    // supabase-js (undici) leaves a keep-alive socket open. Letting Node drain
    // it on its own trips a libuv assertion (`UV_HANDLE_CLOSING`) on Windows +
    // Node 22 during the graceful teardown. Exit abruptly instead — the work is
    // already committed, so skipping the async handle close is safe.
    process.exit(0);
  })
  .catch((err) => {
    console.error("Failed to seed admin:", err.message ?? err);
    process.exit(1);
  });
