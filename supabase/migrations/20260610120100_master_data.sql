-- =============================================================================
-- FastLane TMS — Phase 1.2: master data
-- =============================================================================
-- All master tables carry: is_active (temporarily unavailable but reportable)
-- and deleted_at (retired; preserved for historical FK integrity) as DISTINCT
-- concepts. Unique business keys use PARTIAL unique indexes (… WHERE deleted_at
-- IS NULL) so retired records don't block reusing a code/plate.
-- `tenant_id` is reserved (nullable, no FK) for the future client portal.
-- =============================================================================

-- --- Clients ------------------------------------------------------------------
create table clients (
  id              uuid primary key default gen_random_uuid(),
  tenant_id       uuid,                       -- reserved for future client portal
  name            text not null,
  code            text not null,
  tax_id          text,
  phone           text,
  email           text,
  billing_address text,
  notes           text,
  is_active       boolean not null default true,
  deleted_at      timestamptz,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create unique index clients_code_key on clients (lower(code)) where deleted_at is null;

create table client_contacts (
  id         uuid primary key default gen_random_uuid(),
  client_id  uuid not null references clients (id) on delete cascade,
  name       text not null,
  phone      text,
  email      text,
  role       text,
  is_primary boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index client_contacts_client_idx on client_contacts (client_id);

-- --- Locations (pickup / delivery points per client) --------------------------
create table locations (
  id         uuid primary key default gen_random_uuid(),
  client_id  uuid not null references clients (id) on delete cascade,
  kind       location_kind not null,
  name       text not null,
  address    text,
  lat        numeric(9, 6),
  lng        numeric(9, 6),
  maps_url   text,
  is_active  boolean not null default true,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index locations_client_idx on locations (client_id);
create index locations_kind_idx on locations (kind);

-- --- Drivers ------------------------------------------------------------------
-- user_id links to an auth user when the driver logs in (nullable; mobile web).
create table drivers (
  id         uuid primary key default gen_random_uuid(),
  tenant_id  uuid,
  user_id    uuid references auth.users (id) on delete set null,
  name       text not null,
  phone      text,
  license_no text,
  status     driver_status not null default 'available',
  is_active  boolean not null default true,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index drivers_license_key on drivers (lower(license_no))
  where deleted_at is null and license_no is not null;
create unique index drivers_user_id_key on drivers (user_id) where user_id is not null;

-- --- Trucks -------------------------------------------------------------------
create table trucks (
  id                uuid primary key default gen_random_uuid(),
  tenant_id         uuid,
  code              text not null,
  plate_number      text not null,
  truck_type_id     uuid references truck_types (id),
  capacity          numeric(10, 2),
  capacity_unit     text default 'kg',
  status            truck_status not null default 'available',
  default_driver_id uuid references drivers (id) on delete set null,
  is_active         boolean not null default true,
  deleted_at        timestamptz,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);
create unique index trucks_code_key on trucks (lower(code)) where deleted_at is null;
create unique index trucks_plate_key on trucks (lower(plate_number)) where deleted_at is null;
create index trucks_type_idx on trucks (truck_type_id);

-- --- Suppliers (outsourced carriers) ------------------------------------------
create table suppliers (
  id         uuid primary key default gen_random_uuid(),
  tenant_id  uuid,
  name       text not null,
  code       text,
  phone      text,
  email      text,
  address    text,
  status     supplier_status not null default 'active',
  is_active  boolean not null default true,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index suppliers_code_key on suppliers (lower(code))
  where deleted_at is null and code is not null;

create table supplier_truck_types (
  supplier_id   uuid not null references suppliers (id) on delete cascade,
  truck_type_id uuid not null references truck_types (id) on delete cascade,
  created_at    timestamptz not null default now(),
  primary key (supplier_id, truck_type_id)
);

-- --- Contract rates (client-specific price book) ------------------------------
create table contract_rates (
  id                   uuid primary key default gen_random_uuid(),
  client_id            uuid not null references clients (id) on delete cascade,
  delivery_location_id uuid references locations (id) on delete set null,
  truck_type_id        uuid references truck_types (id) on delete set null,
  shipment_type_id     uuid references shipment_types (id) on delete set null,
  rate                 numeric(12, 2) not null,
  currency             text not null default 'USD',
  effective_from       date,
  effective_to         date,
  is_active            boolean not null default true,
  deleted_at           timestamptz,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now()
);
create index contract_rates_client_idx on contract_rates (client_id);

-- --- Supplier rates (optional rate card) --------------------------------------
create table supplier_rates (
  id            uuid primary key default gen_random_uuid(),
  supplier_id   uuid not null references suppliers (id) on delete cascade,
  truck_type_id uuid references truck_types (id) on delete set null,
  lane          text,
  rate          numeric(12, 2) not null,
  currency      text not null default 'USD',
  is_active     boolean not null default true,
  deleted_at    timestamptz,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index supplier_rates_supplier_idx on supplier_rates (supplier_id);
