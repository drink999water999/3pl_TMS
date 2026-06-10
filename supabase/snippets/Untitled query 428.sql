-- =============================================================================
-- FastLane TMS — Phase 1.1: enums, lookup tables, shared functions
-- =============================================================================
-- Design: request/dispatch STATUSES are Postgres enums (system logic, developer-
-- managed). Truck & shipment TYPES are lookup tables (business config, ops-
-- extensible). Small fixed categorical fields are enums for integrity.
-- =============================================================================

-- --- Status enums (state machines; transitions enforced in the app layer) -----
create type request_status as enum (
  'Draft', 'Submitted', 'Approved', 'Assigned', 'Delivered', 'Rejected', 'Cancelled'
);

create type dispatch_status as enum (
  'Assigned', 'Dispatched', 'Picked Up', 'In Transit', 'Delivered'
);

-- --- Other fixed system vocab -------------------------------------------------
create type user_role as enum ('admin', 'operations', 'dispatch', 'driver', 'finance');
create type assignment_type as enum ('own', 'outsourced');
create type truck_status as enum ('available', 'busy', 'maintenance');
create type driver_status as enum ('available', 'on_trip', 'off_duty', 'inactive');
create type supplier_status as enum ('active', 'inactive');
create type location_kind as enum ('pickup', 'delivery');
create type waybill_status as enum ('draft', 'approved');
create type pod_kind as enum ('signed_note', 'photo');
create type exception_kind as enum ('delay', 'damage', 'complaint');

-- --- Shared BEFORE-UPDATE trigger fn: keeps updated_at current ----------------
create or replace function set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- --- Lookup tables (ops can add rows; no migration needed) --------------------
create table truck_types (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  code        text,
  description text,
  is_active   boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create unique index truck_types_name_key on truck_types (lower(name));

create table shipment_types (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  code        text,
  description text,
  is_active   boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create unique index shipment_types_name_key on shipment_types (lower(name));

comment on table truck_types is 'Business config lookup — ops-extensible (Flatbed, Curtain, 5T, 10T, Van, ...).';
comment on table shipment_types is 'Business config lookup — ops-extensible (Dry, Cold, Frozen, ...).';
