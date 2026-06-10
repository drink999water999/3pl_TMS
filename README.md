# FastLane TMS

Transport Management System for **FastLane Logistics** (company name + logo are placeholders).

**Stack:** Next.js 14 (App Router, TypeScript) · Tailwind CSS + shadcn/ui · Supabase (Postgres, Auth, Storage, Realtime, RLS) · Resend (email, Phase 6) · Vercel (Phase 9).

Progress so far: **Phase 0** scaffold, **Phase 1** database (20 tables + triggers + RLS), **Phase 2** auth/roles/app shell, **Phase 3** master-data CRUD (Clients + Fleet), **Phase 4** Transport Requests (create → submit → approve/reject, items, status history), **Phase 5** Dispatch (own/outsourced assignment, version-guarded status flow, issue flagging), **Phase 6** Waybills (view, approve, PDF generate/download/print, email), **Phase 7** Tracking/POD/exceptions (POD upload unlocks Delivered, exception logging, close→ready-for-billing, realtime, driver mobile view), **Phase 8** Reporting dashboard (live KPIs + charts, date/client filters). Only production deploy (Phase 9) remains — see `docs/TMS_Build_Plan.md`.

---

## 1. Install the toolchain (one time)

You already have **Docker Desktop** ✅ (required — it runs the local Supabase stack). You still need:

| Tool | Why | Install |
|---|---|---|
| **Node 20+** | Runs Next.js | https://nodejs.org (LTS) — verify: `node -v` |
| **pnpm** | Package manager | `npm install -g pnpm` — verify: `pnpm -v` |
| **Supabase CLI** | Local Postgres/Auth/Studio | `npm install -g supabase` (or `scoop install supabase`) — verify: `supabase --version` |

> Make sure **Docker Desktop is running** before `supabase start`.

---

## 2. First run

```bash
# 1. install dependencies
pnpm install

# 2. start the local Supabase stack (Postgres + Auth + Studio + Storage)
#    Docker Desktop must be running. First run downloads images (~1–2 min).
supabase start

# 3. copy the printed keys into your env file
cp .env.local.example .env.local
#    From the `supabase start` (or `supabase status`) output, map the keys.
#    Newer CLIs label them "Publishable" / "Secret"; older ones "anon" / "service_role":
#      API URL ................. NEXT_PUBLIC_SUPABASE_URL   (usually http://127.0.0.1:54321)
#      Publishable / anon ...... NEXT_PUBLIC_SUPABASE_ANON_KEY   (public, browser-safe)
#      Secret / service_role ... SUPABASE_SERVICE_ROLE_KEY       (server only — never NEXT_PUBLIC)
#    Do NOT swap these two: the Secret key must not go in a NEXT_PUBLIC_ var.

# 4. run the app
pnpm dev
```

Open **http://localhost:3000** — you should see the branded FastLane landing page.
Supabase Studio runs at **http://127.0.0.1:54323** and the local email inbox at **http://127.0.0.1:54324**.

If you ever need the keys again: `supabase status`.

### Apply the database schema (Phase 1)

The schema lives as versioned SQL in `supabase/migrations/`. To build your local DB
from scratch (migrations + seed data):

```bash
supabase db reset      # applies all migrations, then runs supabase/seed.sql
pnpm db:types          # regenerate lib/database.types.ts from your local schema
```

Open Studio (`127.0.0.1:54323`) to browse the 20 tables, lookups, and seeded
sample clients/trucks/drivers/suppliers. The migrations were validated end-to-end
against Postgres 16 (numbering, auto-waybill, the no-POD delivery guard, status
propagation, and history logging all verified).

### Create your first admin & sign in (Phase 2)

```bash
pnpm seed:admin        # creates the first Admin user (needs SUPABASE_SERVICE_ROLE_KEY)
```

Default credentials are `admin@fastlane.local` / `ChangeMe123!` (override with
`ADMIN_EMAIL` / `ADMIN_PASSWORD` in `.env.local`). Then sign in at
**http://localhost:3000/login**. You'll land on a role-aware dashboard with a
sidebar; Admins see every module.

### Manage master data (Phase 3)

As an Admin, use **Clients** (accounts, contacts, locations, contract rates) and
**Fleet** (trucks, drivers, suppliers + the truck types each supplier offers).
Operations/Dispatch roles get read access; only Admin can edit. Soft-deletes keep
history and free up codes/plates for reuse.

### Create & track requests (Phase 4)

Open **Requests** (Admin or Operations). "New request" creates a **Draft** —
pick a client and the pickup/delivery dropdowns fill with that client's
locations; add optional line items. The lifecycle is a guarded state machine:

`Draft → Submitted → Approved → Assigned → Delivered`, with `Rejected` (from
Submitted) and `Cancelled` (any time before dispatch) branches.

Operations create/edit/submit/cancel; **approve and reject are Admin-only**.
Drafts are editable (core fields + items); everything locks once submitted.
Every status change is written to the request's **History** timeline. The
request number (`TR-0001`) is assigned automatically by the database.

### Dispatch shipments (Phase 5)

Open **Dispatch** (Admin or Dispatch). Approved requests appear under "Awaiting
dispatch." Hit **Dispatch** to assign one:

- **Own fleet** → pick a truck (its type is auto-filled) and a driver (prefilled
  from the truck's default driver).
- **Outsourced** → pick a supplier, a truck type (limited to what that supplier
  offers), and an optional supplier plate.

Creating the dispatch automatically flips the request to **Assigned** and marks
an own truck **busy** (database triggers). From the dispatch page you advance it
one step at a time — `Assigned → Dispatched → Picked Up → In Transit →
Delivered` — each move protected by an optimistic version check, so two
dispatchers can't clobber each other. Marking **Dispatched** auto-creates the
waybill; marking **Delivered** requires a POD and is therefore enabled in
Phase 7. Problems are flagged with **has_issue** at any stage without losing the
shipment's place in the flow.

### Waybills & PDFs (Phase 6)

> **Phase 6 added two dependencies** (`@react-pdf/renderer`, `resend`). Run
> `pnpm install` once before `pnpm dev`.

A waybill is created automatically the moment a dispatch is marked **Dispatched**
(`WB-YYYYMMDD-<RequestNo>`), with all its details snapshotted so the document
never changes if master data is edited later. Open **Waybills** to find it.

On the waybill page you can **Approve** it (Admin/Dispatch) — which renders the
PDF (four sections: E-Way details, address, goods, transportation) and stores it
in the private `waybills` bucket — then **Download**, **Print**, or **Email** it.

Email uses Resend and is optional: without `RESEND_API_KEY` the Email button
tells you it's not configured; everything else works. See `.env.local.example`
for how to enable it (including a no-domain option for local testing).

### Tracking, POD & exceptions (Phase 7)

> **New migrations** (Realtime publication, a driver waybill-read policy, and a
> `profiles.phone` column for Settings). Apply them without wiping data:
>
> ```bash
> supabase migration up      # applies any pending migrations only
> ```
>
> (`supabase db reset` also works but rebuilds the DB from scratch and re-seeds.)

On a dispatch you can now upload **proof of delivery** (photo or signed note) and
log **exceptions** (delay / damage / complaint) that can later be resolved. The
database blocks **Delivered** until at least one POD exists — so the "Mark as
Delivered" button stays disabled until you add one. Once delivered, **Close
shipment** flags it `ready_for_billing`. The board gained Active / Delivered /
All filters, and dispatch views refresh **live** via Supabase Realtime.

Drivers get a mobile-friendly **My Deliveries** page: their assigned shipments
with pickup/delivery addresses (read from the waybill snapshot), a one-tap status
advance, and camera POD upload. To test it, sign in as a user whose profile role
is `driver` and whose `drivers.user_id` is linked to that account (set via
Studio for now — user management UI comes later).

### Operations dashboard (Phase 8)

> **Phase 8 added one dependency** (`recharts`). Run `pnpm install` before
> `pnpm dev`.

The landing **Dashboard** (Admin / Operations / Dispatch — drivers go straight to
My Deliveries) is now a live reporting view. KPI cards show active shipments,
deliveries, requests awaiting action, and open issues; charts cover shipments
created vs delivered over time, fleet utilization, own-vs-outsourced split,
requests by status, top clients by volume, and exceptions by type. Filter by
**date range** (7 / 30 / 90 days) and **client**, and the numbers refresh live as
dispatches change.

> **Supabase package versions are pinned** (`@supabase/supabase-js` and
> `@supabase/ssr`) because newer supabase-js releases changed an internal type
> path that breaks `@supabase/ssr@0.5.2` and collapses all typed queries to
> `never`. Don't bump these without testing `pnpm typecheck` / `pnpm build`.

---

## 3. Handy scripts

| Command | Does |
|---|---|
| `pnpm dev` | Run the app at localhost:3000 |
| `pnpm build` | Production build |
| `pnpm lint` | ESLint |
| `pnpm typecheck` | TypeScript check, no emit |
| `pnpm format` | Prettier write |
| `supabase start` / `supabase stop` | Start/stop the local DB stack |
| `supabase db reset` | Rebuild local DB from migrations + seed |
| `pnpm db:types` | Regenerate `lib/database.types.ts` from the local schema |
| `pnpm seed:admin` | Create/promote the first Admin user |

---

## 4. Project structure

```
app/                 App Router (layout, landing page, globals.css)
components/ui/        shadcn/ui primitives (Button so far)
lib/
  supabase/          browser + server clients, middleware session refresh
  constants.ts       app name / logo
  utils.ts           cn() helper
supabase/
  config.toml        local stack config
  migrations/        versioned SQL (schema lands in Phase 1)
  seed.sql           sample data (Phase 1)
middleware.ts        refreshes auth session; route protection in Phase 2
public/logo.png      FastLane logo (placeholder)
docs/                build plan + source SOW/TRM documents
```

---

## 5. Roadmap

✅ 0 Scaffold → ✅ 1 Schema → ✅ 2 Auth & shell → ✅ 3 Master data → ✅ 4 Requests → ✅ 5 Dispatch → ✅ 6 Waybill+PDF+email → ✅ 7 Tracking/POD → ✅ 8 Reporting → 9 Production deploy. Full detail in `docs/TMS_Build_Plan.md`.

GitHub + Vercel are deferred for now (building locally first).
