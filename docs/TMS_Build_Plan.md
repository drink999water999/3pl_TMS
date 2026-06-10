# TMS Build Plan — Transport Management System

**Stack:** Next.js (App Router, TypeScript) · Tailwind CSS + shadcn/ui · Supabase (Postgres, Auth, Storage, Realtime, RLS) · Resend (email) · Vercel (hosting)
**Workflow:** Build & test locally → commit → push to GitHub → Vercel auto-deploys
**Scope:** All Phase 1 (core) modules. Phase 2 items (WhatsApp API, Zoho Books, GPS, SMS, supplier performance) are **deferred but architected for** — see §9.

---

## 0. Decisions (locked)

| Decision | Choice |
|---|---|
| Who logs in (v1) | Internal staff only (Admin / Operations / Dispatch / Driver). Schema built multi-tenant-ready so a **client portal** can be added later with no rewrite. |
| Driver access | Responsive **mobile web** + a Driver role (status updates + POD upload). No native app. |
| Waybill delivery | Generate PDF → store → **download/print + email** (Resend). WhatsApp = Phase 2. |
| UI | Next.js + Tailwind + shadcn/ui. |
| Automations | Data-integrity status propagation = **Postgres triggers** (atomic, reliable). PDF + email = **Next.js Server Actions** only — **never** in triggers or Edge Functions, for simpler debugging. Status **transitions** are validated in the app as a state machine. |
| Status modeling | **Postgres enums** for `request_status` / `dispatch_status` (system logic, developer-managed). **Lookup tables** for truck & shipment types (business config, ops can extend). |
| Concurrency | Multi-user dispatch protected by **optimistic status guards** — compare-and-swap updates + a `version` column on `dispatches`. |
| Data hygiene | `created_at` / `updated_at` on **every** table (shared `set_updated_at()` trigger). `created_by` / `updated_by` on transactional tables. **Soft delete** (`deleted_at`) + **`is_active`** on master data, as distinct concepts. |

---

## 1. Source-document mapping

Both uploaded docs describe a Zoho Creator app. This plan re-implements every form and workflow natively:

| Original (Zoho) | This build |
|---|---|
| Transport Request Form | `transport_requests` + Request module (§5 Phase 4) |
| Dispatch Form + hide/show, show-transport, show-truck workflows | `dispatches` + conditional Dispatch form (§5 Phase 5) |
| Truck Master / Driver / Supplier forms | Fleet master data (§5 Phase 3) |
| Items form | `request_items` (goods details on waybill) |
| Waybill + Waybill PDF | `waybills` + `waybill_pdfs` + PDF generator (§5 Phase 6) |
| "Dispatch request" workflow (req → Assigned) | DB trigger |
| "Create waybill" workflow (Dispatched → waybill, `WB-YYYYMMDD-RequestID`) | DB trigger + sequence |
| "Create waybill PDF" workflow (Approved → PDF) | Server Action (react-pdf) |
| "Update transport request" workflow (Delivered + POD → req Delivered) | Server Action + trigger guard |

**Request status flow** (`request_status` enum): `Draft → Submitted → Approved → Assigned → Delivered`, with `Rejected` (from Submitted) and `Cancelled` (any pre-Delivered state) branches.

**Dispatch status flow** (`dispatch_status` enum): `Assigned → Dispatched → Picked Up → In Transit → Delivered`. **"Issue" is not a status** — exceptions are tracked with `has_issue` / `issue_note` / `issue_resolved_at` flags so a dispatch can be flagged at *any* stage without losing its position in the flow. Transitions between statuses are enforced in the app as a state machine.

---

## 2. Architecture at a glance

```
Browser (desktop + mobile web)
   │  Next.js App Router (RSC + Server Actions)
   ▼
Vercel  ──────────────►  Resend (waybill email)
   │
   ▼
Supabase: Postgres (+RLS, triggers, sequences) · Auth · Storage (POD, waybill PDFs) · Realtime (dashboard)
```

---

## 3. Local-first toolchain (what you install once)

- **Node 20+**, **pnpm**, **Git**
- **Docker Desktop** (runs the full Supabase stack locally)
- **Supabase CLI** (`supabase start` = local Postgres + Auth + Studio at localhost)
- **Vercel CLI** (optional, for `vercel` previews)

Every feature is developed against the **local Supabase stack** (`supabase start` + `next dev`), verified in the browser, then committed. Migrations are versioned SQL files, so local and cloud stay identical.

---

## 4. Data model (Postgres)

**Design principles:**
- **Statuses = Postgres enums** (`request_status`, `dispatch_status`) — system logic, rarely changed, transitions enforced in the app. **Business config = lookup tables** (`truck_types`, `shipment_types`) — ops add rows, no migration. *(Tradeoff noted: enums are slightly rigid; if a status ever needs display metadata like color/sort-order, promote it to a lookup. Not needed for v1.)*
- **Timestamps everywhere:** every table has `created_at` + `updated_at`; a shared `set_updated_at()` BEFORE-UPDATE trigger keeps `updated_at` current.
- **Audit columns:** transactional tables carry `created_by` / `updated_by` (→ `profiles.id`).
- **Soft delete on master data** (clients, trucks, drivers, suppliers): `deleted_at` (retired — preserved for historical FK integrity) and `is_active` (temporarily unavailable but still reportable) are **distinct**. Unique constraints use **partial unique indexes** (`… WHERE deleted_at IS NULL`) so retired records don't block reusing a code/plate.
- **Concurrency:** multi-user dispatch uses **optimistic status guards** — compare-and-swap (`UPDATE … WHERE id = ? AND status = ?`, verify rows-affected = 1) plus a `version` column on `dispatches`.
- **PDFs only in the app layer** (Next.js Server Actions) — never in DB triggers or Edge Functions.

**Master data** *(clients/trucks/drivers/suppliers all carry `is_active`, `deleted_at`, `created_at`, `updated_at`)*
- `clients` (id, name, code, is_active, deleted_at, …)
- `client_contacts` (client_id, name, phone, email, role)
- `locations` (client_id, kind `pickup|delivery`, name, address, lat, lng, maps_url)
- `contract_rates` (client_id, delivery_location_id, truck_type_id, shipment_type_id, rate, currency, effective_from/to)
- `trucks` (code, plate_number, truck_type_id, capacity, status `available|busy|maintenance`, default_driver_id, is_active, deleted_at)
- `drivers` (name, phone, license_no, status, user_id → nullable auth link, is_active, deleted_at)
- `suppliers` (name, contacts, status, is_active, deleted_at)
- `supplier_truck_types` (supplier_id, truck_type_id)
- `supplier_rates` (optional rate card)

**Lookups** (business config, ops-extensible) — `truck_types` (Flatbed/Curtain/5T/10T/Van), `shipment_types` (Dry/Cold/Frozen). Statuses are **enums**, not lookups (see design principles).

**Transactional** *(all carry `created_at`, `updated_at`, `created_by`, `updated_by`)*
- `transport_requests` (`request_no` auto human-readable, client_id, pickup_location_id, delivery_location_id, shipment_type_id, truck_type_id, quantity, weight, pallets, required_pickup_at, delivery_date, special_instructions, po_reference, `status` (`request_status` enum), approved_by, cancelled_at)
- `request_items` (request_id, item_name, description, quantity, unit_price)
- `dispatches` (request_id, assignment_type `own|outsourced`, truck_id, driver_id, supplier_id, supplier_truck, `status` (`dispatch_status` enum), `version` (optimistic lock), `has_issue`, `issue_note`, `issue_resolved_at`, dispatched_at, picked_up_at, delivered_at)
- `waybills` (`waybill_no` unique human-readable, dispatch_id, request_id, status `draft|approved`, issued_at, **+ persisted snapshot fields — see below**)
- `waybill_pdfs` (waybill_id, storage_path, file_name, generated_at)
- `pods` (dispatch_id, kind `signed_note|photo`, storage_path, uploaded_by, uploaded_at)
- `exceptions` (request_id, dispatch_id, kind `delay|damage|complaint`, description, reported_by)
- `status_history` (entity, entity_id, from_status, to_status, changed_by, changed_at) — operational visibility + audit

**Waybill snapshot (persisted on the `waybills` row — never joined to live master data):**
`waybill_no`, `issued_at`, `client_name`, `pickup_address`, `delivery_address`, `truck_number`, `truck_type_name`, `shipment_type_name`, `quantity`, `pickup_date`, `supplier_name`, `driver_name`.
These are copied in at waybill-creation time so that **historical waybills never change if master data changes later**. The generated PDF's location lives in `waybill_pdfs.storage_path`, so re-downloads serve the stored file rather than re-rendering.

**Auth**
- `profiles` (id = auth.users.id, full_name, role `admin|operations|dispatch|driver`, driver_id nullable, active)

**Automations — triggers & sequences (data integrity only; never PDFs/email)**
1. `request_no` auto-generated **human-readable** (`TR-0001…`) via sequence on insert.
2. Dispatch insert → parent request `status = Assigned`; assigned truck → `busy`.
3. Dispatch `status = Dispatched` → auto-create `waybill` with **human-readable** `WB-YYYYMMDD-<RequestNo>`, **copying the snapshot fields** so the waybill is self-contained.
4. Dispatch `status = Delivered` **and** POD exists → request `status = Delivered`; truck → `available` (guard blocks Delivered without POD).
5. Every status change writes to `status_history`.
6. Shared `set_updated_at()` BEFORE-UPDATE trigger on every table.

Status **transition rules** (which status may follow which) are enforced in the **app layer** as a state machine; the DB enforces only the critical guards above plus the optimistic `version` check on `dispatches`. **PDF generation and email stay entirely in Next.js Server Actions** — no triggers, no Edge Functions.

**RLS:** every table protected; policies keyed on `profiles.role`. Admin = full; Operations = requests/tracking; Dispatch = dispatch/execution; Driver = only own assigned dispatches (status + POD). Tenant column reserved on master tables for the future client portal.

---

## 5. Phased delivery (each phase = local build → verify → commit → push)

**Phase 0 — Scaffold & local stack**
Create Next.js app, Tailwind, shadcn/ui, ESLint/Prettier. `supabase init` + `supabase start`. Wire `@supabase/ssr` (browser + server clients). `.env.local` with local keys. Verify app + Studio run locally. → first GitHub push + Vercel project connect (empty shell deploys).

**Phase 1 — Schema & migrations**
All tables/enums/lookups/sequences/triggers (incl. `set_updated_at()`)/RLS + partial unique indexes as versioned SQL migrations. Seed lookups + sample clients/trucks/drivers/suppliers. Generate TypeScript types. Verify in local Studio.

**Phase 2 — Auth, roles, app shell**
Email/password auth, login page, route-protection middleware, `profiles` + role-based sidebar nav, responsive mobile layout, seed first Admin.

**Phase 3 — Master data CRUD (Client Mgmt + Fleet)**
Clients + contacts + locations + contract rates; trucks; drivers; suppliers + truck types. Reusable searchable-dropdown component (used everywhere later).

**Phase 4 — Transport Request module**
Create/edit form (react-hook-form + zod), all required fields, client-dependent location dropdowns, Items subform. Draft → Submit → Approve/Reject (manager/admin). List with search + filters.

**Phase 5 — Dispatch module**
Open-requests dispatch board. Create dispatch with **conditional fields** (Own Fleet → driver+truck; Outsourced → supplier+truck) replicating the hide/show workflow; auto-fetch truck type. Status updates following the dispatch flow (Assigned → Dispatched → Picked Up → In Transit → Delivered), protected by **optimistic guards** (compare-and-swap + `version`) so two dispatchers can't clobber each other. Issues flagged via `has_issue` at any stage. Triggers fire (req→Assigned, truck→busy).

**Phase 6 — Waybill + PDF + Email**
Auto-waybill on Dispatched. Waybill view + Approve action. On Approve → generate PDF (react-pdf) with the 4 sections from the doc (E-Way details, address, goods, transportation), store in Storage + `waybill_pdfs`. Download/print + email via Resend with attachment.

**Phase 7 — Tracking, POD, Exceptions**
Realtime status updates. POD upload (mobile + office) to Storage, linked to dispatch/waybill; Delivered guard requires POD. Exception capture (delay/damage/complaint). "Close shipment → ready for billing" flag.

**Phase 8 — Reporting dashboard**
KPI cards + charts (recharts): active shipments, completed, delays, fleet utilization, own-vs-outsourced ratio. Date/client/status filters.

**Phase 9 — Production deploy**
Create cloud Supabase project, `supabase db push` (same migrations), create Storage buckets + policies. Configure Vercel env vars, deploy, smoke-test full lifecycle on production URL.

---

## 6. Local → GitHub → Vercel workflow (your requirement)

For every phase:
1. `supabase start` + `pnpm dev` → build & test the feature at `localhost:3000` against local DB.
2. Apply schema changes as a new migration; test locally in Studio.
3. When it works locally → `git commit` → `git push`.
4. Vercel builds a **preview deployment** automatically on push (and Production on merge to `main`).
5. Cloud DB changes are applied with `supabase db push` (same migration files — no drift).

You always see it working on your machine before anything reaches GitHub or Vercel.

---

## 7. Roles & permissions (v1)

| Role | Can do |
|---|---|
| Admin | Everything, incl. master data + user management |
| Operations | Create/track requests, view dashboards |
| Dispatch | Assign trucks/drivers/suppliers, manage execution & status |
| Driver (mobile) | Update status + upload POD/photos for own dispatches only |
| Finance | **Phase 2** (Zoho Books invoicing) — role reserved |

---

## 8. Key external services

- **Resend** — transactional email (waybill PDF). Free tier covers v1.
- **react-pdf** (`@react-pdf/renderer`) — serverless-friendly PDF generation (no headless Chrome needed on Vercel).
- **Supabase Storage** — POD images/notes + waybill PDFs.
- Google Maps links = plain URL fields in v1 (no paid API key needed).

---

## 9. Built for change — Phase 2 hooks

Deferred now, but the architecture leaves clean seams so they slot in without rework:

- **WhatsApp / SMS:** a `notifications` table + a single "send" dispatcher; adding a WhatsApp channel = one adapter.
- **Zoho Books / invoicing:** "ready for billing" flag + closed-shipment data already captured; add a sync job + Finance role.
- **GPS tracking:** `dispatches` can take live location columns / a `tracking_events` table later.
- **Supplier performance:** all dispatch + delay + POD timing data is already recorded for later analytics.
- **Client portal:** RLS + reserved tenant columns mean external client logins can be enabled without touching the core schema.
- **Extensible config:** lookup tables let ops add truck/shipment types with no code change. (Statuses are enums — developer-managed by design, since they carry system logic.)

---

## 10. What I need from you before we start coding

1. **Company name + logo** (for waybill PDF header/branding) — can be a placeholder for now.
2. **Supabase account** + a free **Resend** account (I'll guide you when we reach those phases).
3. Confirm GitHub is connected (it is) and which account/org the repo should live under.
4. Approve this plan, or tell me what to adjust.

Once you approve, we start at **Phase 0** and work phase-by-phase, testing locally at each step.
