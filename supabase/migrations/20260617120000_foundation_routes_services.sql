-- =============================================================================
-- FastLane TMS — Foundation batch (2026-06-17): cities, routes, service types,
-- supplier trucks, standard rates, + master-data field additions.
-- =============================================================================
-- Adds the master-data backbone the new spec needs:
--   • Cities + Routes (From -> To) as first-class master data
--   • Service Types (client-facing rate/request vocabulary; e.g. Pallet/Box)
--   • Matrix pricing: contract_rates + supplier_rates gain route + service type
--   • Supplier trucks (multiple per supplier, with driver details)
--   • Standard rates (Rate Page) for auto-filling new client prices
--   • Clients: client_type, multiple-locations charge, rate basis (Trip)
--   • Locations: city + receiver in-charge name/phone
-- Idempotent where practical. RLS follows the existing staff-read/admin-write
-- pattern; lookups also get a client-read policy. Grants re-applied at the end.
-- =============================================================================

-- --- Cities -------------------------------------------------------------------
create table if not exists cities (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  code       text,
  region     text,
  is_active  boolean not null default true,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index if not exists cities_name_key on cities (lower(name)) where deleted_at is null;
create unique index if not exists cities_code_key on cities (lower(code)) where deleted_at is null and code is not null;

-- --- Routes (From city -> To city) -------------------------------------------
create table if not exists routes (
  id           uuid primary key default gen_random_uuid(),
  from_city_id uuid not null references cities (id),
  to_city_id   uuid not null references cities (id),
  distance_km  numeric(10, 2),
  is_active    boolean not null default true,
  deleted_at   timestamptz,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create unique index if not exists routes_pair_key on routes (from_city_id, to_city_id) where deleted_at is null;
create index if not exists routes_from_idx on routes (from_city_id);
create index if not exists routes_to_idx on routes (to_city_id);

-- --- Service types (client-facing; replaces "Truck Type" on the rate side) -----
-- requires_quantity flags services where quantity is meaningful (Pallet, Box).
create table if not exists service_types (
  id                uuid primary key default gen_random_uuid(),
  name              text not null,
  code              text,
  requires_quantity boolean not null default false,
  sort_order        integer not null default 0,
  is_active         boolean not null default true,
  deleted_at        timestamptz,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);
create unique index if not exists service_types_name_key on service_types (lower(name)) where deleted_at is null;

insert into service_types (name, requires_quantity, sort_order) values
  ('Flatbed',      false, 1),
  ('Curtain Side', false, 2),
  ('Chiller',      false, 3),
  ('Lorry-12 Ton', false, 4),
  ('Lorry-10 Ton', false, 5),
  ('Dyna-6 Ton',   false, 6),
  ('Dyna-5 Ton',   false, 7),
  ('Dyna-4 Ton',   false, 8),
  ('Pallet',       true,  9),
  ('Box',          true,  10)
on conflict do nothing;

-- --- Shipment types: add Ambient (Dry/Cold/Frozen already seeded) -------------
insert into shipment_types (name, code, description) values
  ('Ambient', 'AMB', 'Ambient temperature goods')
on conflict do nothing;

-- --- Clients: client type, multiple-locations charge, rate basis ---------------
alter table clients add column if not exists client_type text;
alter table clients add column if not exists multi_location_charge numeric(12, 2) not null default 0;
alter table clients add column if not exists rate_basis text not null default 'trip';
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'clients_client_type_chk'
  ) then
    alter table clients
      add constraint clients_client_type_chk
      check (client_type is null or client_type in ('Warehouse', 'Transportation'));
  end if;
end;
$$;

-- --- Locations: city + receiver in-charge -------------------------------------
alter table locations add column if not exists city_id uuid references cities (id);
alter table locations add column if not exists receiver_name text;
alter table locations add column if not exists receiver_phone text;
create index if not exists locations_city_idx on locations (city_id);

-- --- Matrix pricing on contract & supplier rates ------------------------------
alter table contract_rates add column if not exists route_id uuid references routes (id);
alter table contract_rates add column if not exists service_type_id uuid references service_types (id);
create index if not exists contract_rates_route_idx on contract_rates (route_id);

alter table supplier_rates add column if not exists route_id uuid references routes (id);
alter table supplier_rates add column if not exists service_type_id uuid references service_types (id);
create index if not exists supplier_rates_route_idx on supplier_rates (route_id);

-- --- Supplier trucks (multiple per supplier, with driver details) -------------
create table if not exists supplier_trucks (
  id            uuid primary key default gen_random_uuid(),
  supplier_id   uuid not null references suppliers (id) on delete cascade,
  plate_number  text not null,
  driver_name   text,
  driver_id_no  text,
  driver_mobile text,
  truck_type_id uuid references truck_types (id),
  service_type_id uuid references service_types (id),
  is_active     boolean not null default true,
  deleted_at    timestamptz,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index if not exists supplier_trucks_supplier_idx on supplier_trucks (supplier_id);
create unique index if not exists supplier_trucks_plate_key
  on supplier_trucks (supplier_id, lower(plate_number)) where deleted_at is null;

-- --- Standard rates (Rate Page): default price per service + route ------------
create table if not exists standard_rates (
  id              uuid primary key default gen_random_uuid(),
  service_type_id uuid references service_types (id),
  route_id        uuid references routes (id),
  rate            numeric(12, 2) not null,
  currency        text not null default 'SAR',
  is_active       boolean not null default true,
  deleted_at      timestamptz,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create unique index if not exists standard_rates_key
  on standard_rates (service_type_id, route_id) where deleted_at is null;

-- --- updated_at triggers for new tables ---------------------------------------
do $$
declare t text;
  new_tables text[] := array['cities','routes','service_types','supplier_trucks','standard_rates'];
begin
  foreach t in array new_tables loop
    execute format('drop trigger if exists set_updated_at on public.%I', t);
    execute format(
      'create trigger set_updated_at before update on public.%I
       for each row execute function set_updated_at()', t);
  end loop;
end;
$$;

-- =============================================================================
-- RLS: staff read + admin write (mirrors 20260610120500 master-data loop)
-- =============================================================================
do $$
declare t text;
  master_tables text[] := array['cities','routes','service_types','supplier_trucks','standard_rates'];
begin
  foreach t in array master_tables loop
    execute format('alter table public.%I enable row level security', t);
    execute format('drop policy if exists %I on public.%I', t || '_read', t);
    execute format(
      'create policy %I on public.%I for select to authenticated
       using (has_role(array[''admin'',''operations'',''dispatch'',''finance'']::user_role[]))',
      t || '_read', t);
    execute format('drop policy if exists %I on public.%I', t || '_admin_write', t);
    execute format(
      'create policy %I on public.%I for all to authenticated
       using (is_admin()) with check (is_admin())',
      t || '_admin_write', t);
  end loop;
end;
$$;

-- Client-role read for the request-form lookups (cities, routes, service types)
create policy cities_client_read on cities
  for select to authenticated using (has_role(array['client']::user_role[]));
create policy routes_client_read on routes
  for select to authenticated using (has_role(array['client']::user_role[]));
create policy service_types_client_read on service_types
  for select to authenticated using (has_role(array['client']::user_role[]));

-- =============================================================================
-- Grants (re-applied; default privileges from 20260612150000 also cover these)
-- =============================================================================
grant select, insert, update, delete on all tables in schema public to authenticated;
grant all on all tables in schema public to service_role;
grant usage, select on all sequences in schema public to authenticated, service_role;
