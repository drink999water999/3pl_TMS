-- =============================================================================
-- FastLane TMS (2026-06-29): Merge "Truck Type" into "Service Type".
-- =============================================================================
-- The business confirmed Truck Type and Service Type were always meant to be
-- the same concept. We standardise on SERVICE TYPE everywhere and remove the
-- separate truck_types vocabulary entirely.
--
-- Strategy (idempotent):
--   1. Backfill service_type_id from truck_type_id (matched by name) on every
--      table that still carries a truck_type_id.
--   2. Add service_type_id to the tables that only had truck_type_id
--      (dispatches, trucks) and backfill them.
--   3. Replace the supplier_truck_types junction with supplier_service_types.
--   4. Rename the denormalised waybills.truck_type_name -> service_type_name.
--   5. Rewrite the dispatch trigger to read service types.
--   6. Drop every truck_type_id column, the junction, and the truck_types table.
--
-- service_types was already seeded with the same names as the active
-- truck_types (Flatbed, Curtain Side, Chiller, Lorry-12 Ton, ...), so a
-- name match is a safe, lossless mapping. Retired truck types (5 Ton / 10 Ton
-- / Van) have no service_type match and map to NULL, which is correct since
-- they were already deactivated.
-- =============================================================================

-- Reusable name-match expression:
--   (select s.id from service_types s join truck_types t
--      on lower(t.name) = lower(s.name)
--    where t.id = <tbl>.truck_type_id and s.deleted_at is null limit 1)

-- --- 1 & 2. Add service_type_id where missing, then backfill everywhere -------

alter table dispatches add column if not exists service_type_id uuid references service_types (id);
alter table trucks     add column if not exists service_type_id uuid references service_types (id);

create index if not exists dispatches_service_type_idx on dispatches (service_type_id);
create index if not exists trucks_service_type_idx on trucks (service_type_id);

do $$
declare
  tbl text;
  tables text[] := array[
    'transport_requests', 'contract_rates', 'supplier_rates',
    'supplier_trucks', 'dispatches', 'trucks'
  ];
begin
  foreach tbl in array tables loop
    execute format(
      'update public.%I x
         set service_type_id = (
           select s.id from service_types s
             join truck_types t on lower(t.name) = lower(s.name)
           where t.id = x.truck_type_id and s.deleted_at is null
           limit 1)
       where x.service_type_id is null and x.truck_type_id is not null',
      tbl);
  end loop;
end;
$$;

-- --- 3. supplier_truck_types -> supplier_service_types ------------------------
create table if not exists supplier_service_types (
  supplier_id     uuid not null references suppliers (id) on delete cascade,
  service_type_id uuid not null references service_types (id) on delete cascade,
  created_at      timestamptz not null default now(),
  primary key (supplier_id, service_type_id)
);

insert into supplier_service_types (supplier_id, service_type_id, created_at)
select stt.supplier_id, s.id, stt.created_at
from supplier_truck_types stt
join truck_types t   on t.id = stt.truck_type_id
join service_types s on lower(s.name) = lower(t.name) and s.deleted_at is null
on conflict do nothing;

alter table supplier_service_types enable row level security;
drop policy if exists supplier_service_types_read on supplier_service_types;
create policy supplier_service_types_read on supplier_service_types
  for select to authenticated
  using (has_role(array['admin','operations','dispatch','finance']::user_role[]));
drop policy if exists supplier_service_types_admin_write on supplier_service_types;
create policy supplier_service_types_admin_write on supplier_service_types
  for all to authenticated using (is_admin()) with check (is_admin());

-- --- 4. waybills.truck_type_name -> service_type_name -------------------------
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'waybills'
      and column_name = 'truck_type_name'
  ) and not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'waybills'
      and column_name = 'service_type_name'
  ) then
    alter table waybills rename column truck_type_name to service_type_name;
  end if;
end;
$$;

-- --- 5. Rewrite dispatch trigger to read service types -----------------------
create or replace function dispatch_after_update()
returns trigger language plpgsql
security definer set search_path = public as $$
declare
  v_req     transport_requests%rowtype;
  v_client  text;
  v_pickup  text;
  v_deliver text;
  v_recv    text;
  v_maps    text;
  v_truckno text;
  v_svctp   text;
  v_shiptp  text;
  v_supp    text;
  v_driver  text;
  v_wb_no   text;
begin
  if new.status is not distinct from old.status then
    return null;
  end if;

  if new.status = 'Dispatched' then
    select * into v_req from transport_requests where id = new.request_id;

    select name     into v_client  from clients        where id = v_req.client_id;
    select address  into v_pickup  from locations       where id = v_req.pickup_location_id;
    select address  into v_deliver from locations       where id = v_req.delivery_location_id;
    select name     into v_recv    from locations       where id = v_req.delivery_location_id;
    select maps_url into v_maps     from locations       where id = v_req.delivery_location_id;
    select name     into v_shiptp  from shipment_types  where id = v_req.shipment_type_id;
    select name     into v_svctp   from service_types
      where id = coalesce(new.service_type_id, v_req.service_type_id);

    if new.truck_id is not null then
      select plate_number into v_truckno from trucks where id = new.truck_id;
    else
      v_truckno := new.supplier_truck;
    end if;

    if new.supplier_id is not null then
      select name into v_supp from suppliers where id = new.supplier_id;
    end if;
    if new.driver_id is not null then
      select name into v_driver from drivers where id = new.driver_id;
    else
      v_driver := new.outsourced_driver_name;
    end if;

    v_wb_no := 'WB-' || to_char(now(), 'YYYYMMDD') || '-' || v_req.request_no;

    insert into waybills (
      waybill_no, dispatch_id, request_id, status, issued_at,
      client_name, pickup_address, delivery_address, receiver_name,
      po_reference, delivery_maps_url, truck_number,
      service_type_name, shipment_type_name, quantity, pickup_date,
      supplier_name, driver_name, created_by
    ) values (
      v_wb_no, new.id, new.request_id, 'draft', now(),
      v_client, v_pickup, v_deliver, v_recv,
      v_req.po_reference, v_maps, v_truckno,
      v_svctp, v_shiptp, v_req.quantity,
      coalesce(v_req.required_pickup_at::date, v_req.delivery_date),
      v_supp, v_driver, new.updated_by
    )
    on conflict (dispatch_id) do nothing;
  end if;

  if new.status = 'Delivered' then
    update transport_requests set status = 'Delivered' where id = new.request_id;
    if new.truck_id is not null then
      update trucks set status = 'available' where id = new.truck_id;
    end if;
  end if;

  return null;
end;
$$;

-- --- 6. Drop the old truck_type artefacts ------------------------------------
drop table if exists supplier_truck_types;

alter table transport_requests drop column if exists truck_type_id;
alter table contract_rates     drop column if exists truck_type_id;
alter table supplier_rates     drop column if exists truck_type_id;
alter table supplier_trucks    drop column if exists truck_type_id;
alter table dispatches         drop column if exists truck_type_id;
alter table trucks             drop column if exists truck_type_id;

drop table if exists truck_types;

-- --- Grants (re-applied; mirrors existing migrations) ------------------------
grant select, insert, update, delete on all tables in schema public to authenticated;
grant all on all tables in schema public to service_role;
grant usage, select on all sequences in schema public to authenticated, service_role;
