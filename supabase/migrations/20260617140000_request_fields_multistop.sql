-- =============================================================================
-- FastLane TMS (2026-06-17): transport request fields + multi-stop deliveries
-- =============================================================================
-- Spec §3 (client portal) + §4 (admin portal):
--   • Service Type on the request (drives conditional quantity for Pallet/Box)
--   • Route + auto distance, additional services (description + price addition)
--   • Request source (in-house on behalf / customer portal)
--   • Admin selling-price override
--   • Multiple delivery locations per trip (request_deliveries); the primary
--     stop is also mirrored to transport_requests.delivery_location_id so the
--     existing submit / dispatch / waybill flow keeps working unchanged.
-- Idempotent.
-- =============================================================================

alter table transport_requests add column if not exists service_type_id uuid references service_types (id);
alter table transport_requests add column if not exists route_id uuid references routes (id);
alter table transport_requests add column if not exists additional_services text;
alter table transport_requests add column if not exists additional_services_price numeric(12, 2);
alter table transport_requests add column if not exists request_source text;
alter table transport_requests add column if not exists selling_price numeric(12, 2);

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'transport_requests_source_chk'
  ) then
    alter table transport_requests
      add constraint transport_requests_source_chk
      check (request_source is null or request_source in ('inhouse', 'portal'));
  end if;
end;
$$;

-- --- Multi-stop deliveries ----------------------------------------------------
create table if not exists request_deliveries (
  id             uuid primary key default gen_random_uuid(),
  request_id     uuid not null references transport_requests (id) on delete cascade,
  location_id    uuid references locations (id),
  sequence       integer not null default 1,
  receiver_name  text,
  receiver_phone text,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);
create index if not exists request_deliveries_request_idx on request_deliveries (request_id);

drop trigger if exists set_updated_at on request_deliveries;
create trigger set_updated_at before update on request_deliveries
  for each row execute function set_updated_at();

-- --- RLS (mirrors request_items) ----------------------------------------------
alter table request_deliveries enable row level security;

drop policy if exists rd_read on request_deliveries;
create policy rd_read on request_deliveries
  for select to authenticated
  using (has_role(array['admin','operations','dispatch','finance']::user_role[]));

drop policy if exists rd_write on request_deliveries;
create policy rd_write on request_deliveries
  for all to authenticated
  using (has_role(array['admin','operations']::user_role[]))
  with check (has_role(array['admin','operations']::user_role[]));

drop policy if exists rd_client_read on request_deliveries;
create policy rd_client_read on request_deliveries
  for select to authenticated
  using (exists (
    select 1 from transport_requests tr
    where tr.id = request_deliveries.request_id
      and tr.client_id = current_client_id()
  ));

drop policy if exists rd_client_write on request_deliveries;
create policy rd_client_write on request_deliveries
  for all to authenticated
  using (exists (
    select 1 from transport_requests tr
    where tr.id = request_deliveries.request_id
      and tr.client_id = current_client_id()
      and tr.status = 'Draft'
  ))
  with check (exists (
    select 1 from transport_requests tr
    where tr.id = request_deliveries.request_id
      and tr.client_id = current_client_id()
      and tr.status = 'Draft'
  ));

grant select, insert, update, delete on all tables in schema public to authenticated;
grant all on all tables in schema public to service_role;
