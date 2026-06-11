-- =============================================================================
-- FastLane TMS — Pricing & billing
-- =============================================================================
-- Two pricing layers:
--   • Client price (REVENUE)  → set per client: 'fixed' (contract_rates per lane)
--     or 'per_km' (base_charge + rate_per_km × request.distance_km).
--   • Carrier cost            → dispatches.carrier_cost (what we pay).
--   • Margin / "take"         → revenue − cost when a cost exists, else a
--     per-client markup rule (percent or fixed amount).
--
-- The client-facing FREIGHT amount snapshots onto the waybill. The internal
-- carrier cost + margin live in waybill_billing, which clients have NO RLS
-- grant to (RLS is row-level, not column-level, so margin must not sit on the
-- waybill row the client can read).
-- =============================================================================

-- --- Client pricing configuration --------------------------------------------
alter table clients
  add column if not exists pricing_mode text not null default 'fixed',
  add column if not exists currency     text not null default 'USD',
  add column if not exists rate_per_km  numeric(12, 2),
  add column if not exists base_charge  numeric(12, 2) not null default 0,
  add column if not exists margin_type  text,
  add column if not exists margin_value numeric(12, 2);

alter table clients drop constraint if exists clients_pricing_mode_chk;
alter table clients add constraint clients_pricing_mode_chk
  check (pricing_mode in ('fixed', 'per_km'));

alter table clients drop constraint if exists clients_margin_type_chk;
alter table clients add constraint clients_margin_type_chk
  check (margin_type is null or margin_type in ('percent', 'fixed'));

-- --- Distance on the request (manual now; Google Maps later) ------------------
alter table transport_requests
  add column if not exists distance_km numeric(12, 2);

-- --- Carrier cost on the dispatch (what we pay supplier / own fleet) ----------
alter table dispatches
  add column if not exists carrier_cost numeric(12, 2);

-- --- Client-facing freight amount snapshotted onto the waybill ----------------
alter table waybills
  add column if not exists freight_amount numeric(12, 2),
  add column if not exists currency       text;

-- --- Internal billing record (carrier cost + margin) — admin/finance only -----
create table if not exists waybill_billing (
  waybill_id   uuid primary key references waybills (id) on delete cascade,
  freight_amount numeric(12, 2),
  carrier_cost numeric(12, 2),
  margin_amount numeric(12, 2),
  currency     text,
  pricing_mode text,
  basis        text,                      -- human note: how it was computed
  computed_at  timestamptz not null default now()
);

alter table waybill_billing enable row level security;

create policy wbbill_read on waybill_billing
  for select to authenticated
  using (has_role(array['admin', 'finance']::user_role[]));

create policy wbbill_write on waybill_billing
  for all to authenticated
  using (has_role(array['admin', 'finance']::user_role[]))
  with check (has_role(array['admin', 'finance']::user_role[]));

-- =============================================================================
-- Finance role: read-only access to the billing context (waybills, dispatches,
-- requests, clients) so they can see amounts + margin. Additive policies.
-- =============================================================================
create policy wb_finance_read on waybills
  for select to authenticated using (has_role(array['finance']::user_role[]));
create policy wbpdf_finance_read on waybill_pdfs
  for select to authenticated using (has_role(array['finance']::user_role[]));
create policy tr_finance_read on transport_requests
  for select to authenticated using (has_role(array['finance']::user_role[]));
create policy ri_finance_read on request_items
  for select to authenticated using (has_role(array['finance']::user_role[]));
create policy disp_finance_read on dispatches
  for select to authenticated using (has_role(array['finance']::user_role[]));
create policy clients_finance_read on clients
  for select to authenticated using (has_role(array['finance']::user_role[]));
create policy locations_finance_read on locations
  for select to authenticated using (has_role(array['finance']::user_role[]));
