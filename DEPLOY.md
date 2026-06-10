# Deploying 3PL TMS to production (Phase 9)

This app has two halves:

- **Frontend + server logic** → **Vercel** (the Next.js app).
- **Database, Auth, Storage, Realtime** → **cloud Supabase** (a hosted version of
  the local stack you've been using).

The same versioned SQL migrations that build your local database also build the
cloud one, so there's no drift. Plan on ~30–45 minutes the first time.

> Throughout, "publishable / anon key" and "secret / service_role key" are the
> two Supabase API keys. The secret key is **server-only** — it must never go in
> a `NEXT_PUBLIC_*` variable.

---

## 0. Pre-flight (do this locally first)

Make sure it builds cleanly **before** involving the cloud:

```bash
pnpm install
pnpm typecheck
pnpm build      # must succeed — this is what Vercel runs
```

If `pnpm build` passes locally, Vercel will almost certainly succeed too. Use
**Node 20 or 22** (not 24) — `package.json` already pins this via `engines`.

Also confirm these are committed to git: `pnpm-lock.yaml`, everything under
`supabase/migrations/`, and `next.config.mjs`. Confirm `.env.local` is **not**
committed (it's gitignored — that's correct, it holds secrets).

---

## 1. Push the code to GitHub

```bash
git init                # if not already a repo
git add -A
git commit -m "3PL TMS — ready for deploy"
# create an empty repo on github.com, then:
git remote add origin https://github.com/<you>/3pl-tms.git
git branch -M main
git push -u origin main
```

---

## 2. Create the cloud Supabase project

1. Go to https://supabase.com → **New project**. Pick a region close to your
   users, set a strong **database password** (save it), and wait ~2 minutes.
2. Open **Project Settings → API** and copy three values:
   - **Project URL** → `https://<ref>.supabase.co`
   - **anon / publishable key**
   - **service_role / secret key**
3. Note your **project ref** (the `<ref>` in the URL).

---

## 3. Push your schema to the cloud database

From the project folder:

```bash
supabase login                       # opens a browser to authorize the CLI
supabase link --project-ref <ref>    # enter the DB password from step 2
supabase db push                     # applies ALL migrations to the cloud DB
```

`db push` runs every file in `supabase/migrations/` — that creates the 20 tables,
triggers, RLS policies, the `pods` + `waybills` **storage buckets**, the Realtime
publication, and the reference lookups (truck/shipment types). You do **not** need
to create buckets or policies by hand.

> `db push` does **not** run `seed.sql` — that's only demo data for local. The
> lookups production needs were moved into a migration, so they ship automatically.
> Your real clients/trucks/drivers you'll add through the app UI.

---

## 4. Create your first admin on the cloud DB

Easiest — point the seed script at the cloud project. Create a throwaway file
`.env.cloud` (also gitignored) with the cloud values:

```dotenv
NEXT_PUBLIC_SUPABASE_URL=https://<ref>.supabase.co
SUPABASE_SERVICE_ROLE_KEY=<service_role/secret key>
ADMIN_EMAIL=you@yourcompany.com
ADMIN_PASSWORD=ChooseAStrongOne123!
ADMIN_NAME=Your Name
```

Then run:

```bash
node --env-file=.env.cloud scripts/seed-admin.mjs
```

(Alternative, no script: Supabase Dashboard → **Authentication → Users → Add
user** with "Auto Confirm", then in **SQL Editor** run
`update profiles set role='admin', active=true where id=(select id from auth.users where email='you@yourcompany.com');`.)

---

## 5. Deploy to Vercel

1. Go to https://vercel.com → **Add New → Project** → import your GitHub repo.
   Vercel auto-detects Next.js and pnpm — leave build settings default.
2. Before the first deploy, open **Settings → Environment Variables** and add
   (for the **Production** environment):

   | Variable | Value |
   |---|---|
   | `NEXT_PUBLIC_SUPABASE_URL` | `https://<ref>.supabase.co` |
   | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | anon / publishable key |
   | `SUPABASE_SERVICE_ROLE_KEY` | service_role / secret key |
   | `NEXT_PUBLIC_APP_NAME` | `3PL TMS` |
   | `NEXT_PUBLIC_SITE_URL` | `https://<your-app>.vercel.app` |
   | `RESEND_API_KEY` | (optional — only if emailing waybills) |
   | `RESEND_FROM_EMAIL` | (optional — e.g. `3PL TMS <noreply@yourdomain.com>`) |

3. Click **Deploy**. When it finishes you'll get a `https://<your-app>.vercel.app`
   URL. (If you set env vars *after* the first build, hit **Redeploy**.)

---

## 6. Point Supabase Auth at your Vercel URL

In the Supabase Dashboard → **Authentication → URL Configuration**:

- **Site URL**: `https://<your-app>.vercel.app`
- **Redirect URLs**: add `https://<your-app>.vercel.app/**`

This makes email-confirmation and password-reset links point at the live site
instead of localhost.

---

## 7. Email (optional, only if you use the waybill "Email" button)

Supabase's built-in email is rate-limited and meant for testing. For real
sending — both **auth emails** (email change/reset) and **waybill emails** — set
up a real sender:

- **Waybill emails (Resend):** create a key at resend.com, **verify your domain**,
  and set `RESEND_API_KEY` + `RESEND_FROM_EMAIL` (an address on that domain) in
  Vercel. You cannot send *as* `@gmail.com`.
- **Auth emails:** Supabase Dashboard → **Project Settings → Authentication →
  SMTP** → enable custom SMTP (Resend, Postmark, SES, etc.) so confirmation and
  reset emails actually deliver in production.

If you skip this, approve/download/print waybills still work; only the Email
button and auth email flows are affected.

---

## 8. Smoke test the live site

Sign in as your admin, then walk the full lifecycle once:

1. **Clients** → add a client with a pickup + delivery location.
2. **Fleet** → add a truck + driver (or a supplier).
3. **Requests** → create → submit → approve.
4. **Dispatch** → assign it, then advance Dispatched → Picked Up → In Transit.
5. **Waybills** → approve → download the PDF.
6. **Dispatch** → upload a POD → mark Delivered → Close shipment.
7. **Dashboard** → confirm the KPIs and charts reflect what you just did.

---

## 9. Shipping changes after launch

- **Code change:** `git push` → Vercel auto-builds and deploys.
- **Database change:** add a new file in `supabase/migrations/`, test locally
  (`supabase db reset`), then `supabase db push` to apply it to the cloud. Never
  edit the cloud schema by hand — always through a migration, so the two stay
  identical.

---

## Troubleshooting

- **Build fails on Vercel but works locally** — check the Node version
  (Settings → General → Node.js Version = 20.x or 22.x) and that
  `pnpm-lock.yaml` is committed.
- **"relation does not exist" / empty dropdowns in prod** — `supabase db push`
  didn't run, or ran against the wrong project. Re-check `supabase link`.
- **PDF/POD links 404 in prod** — make sure `NEXT_PUBLIC_SUPABASE_URL` points at
  the cloud project, not `127.0.0.1`.
- **Can't sign in after deploy** — you created the admin on the *local* DB, not
  the cloud one. Re-run step 4 against `.env.cloud`.
- **Realtime not updating** — confirm the `20260610120600_realtime.sql` migration
  was pushed; Realtime is enabled per-table via that publication.
