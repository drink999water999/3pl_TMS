-- =============================================================================
-- FastLane TMS (2026-06-29): PDF follow-ups
-- =============================================================================
--   • Multiple pickup locations per request (request_pickups, mirrors
--     request_deliveries). The primary pickup is still mirrored to
--     transport_requests.pickup_location_id so dispatch/waybill keep working.
--   • POD "stage" (pickup vs delivery) so drivers can attach pickup proof too.
--   • Richer waybill snapshot for the driver app + multi-page waybill:
--     pickup_name / pickup_city / pickup_maps_url / delivery_city.
--   • Trigger updated to snapshot the new fields; existing waybills backfilled.
-- Idempotent.
-- =============================================================================

-- --- 1. Multi-stop pickups ----------------------------------------------------
create table if not exists request_pickups (
  id             uuid primary key default gen_random_uuid(),
  request_id     uuid not null references transport_requests (id) on delete cascade,
  location_id    uuid references locations (id),
  sequence       integer not null default 1,
  contact_name   text,
  contact_phone  text,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);
create index if not exists request_pickups_request_idx on request_pickups (request_id);

drop trigger if exists set_updated_at on request_pickups;
create trigger set_updated_at before update on request_pickups
  for each row execute function set_updated_at();

alter table request_pickups enable row level security;

drop policy if exists rp_read on request_pickups;
create policy rp_read on request_pickups
  for select to authenticated
  using (has_role(array['admin','operations','dispatch','finance']::user_role[]));

drop policy if exists rp_write on request_pickups;
create policy rp_write on request_pickups
  for all to authenticated
  using (has_role(array['admin','operations']::user_role[]))
  with check (has_role(array['admin','operations']::user_role[]));

drop policy if exists rp_client_read on request_pickups;
create policy rp_client_read on request_pickups
  for select to authenticated
  using (exists (
    select 1 from transport_requests tr
    where tr.id = request_pickups.request_id
      and tr.client_id = current_client_id()
  ));

drop policy if exists rp_client_write on request_pickups;
create policy rp_client_write on request_pickups
  for all to authenticated
  using (exists (
    select 1 from transport_requests tr
    where tr.id = request_pickups.request_id
      and tr.client_id = current_client_id()
      and tr.status = 'Draft'
  ))
  with check (exists (
    select 1 from transport_requests tr
    where tr.id = request_pickups.request_id
      and tr.client_id = current_client_id()
      and tr.status = 'Draft'
  ));

-- --- 2. POD stage (pickup vs delivery) ---------------------------------------
alter table pods add column if not exists stage text not null default 'delivery';
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'pods_stage_chk'
  ) then
    alter table pods
      add constraint pods_stage_chk check (stage in ('pickup', 'delivery'));
  end if;
end;
$$;

-- --- 3. Richer waybill snapshot ----------------------------------------------
alter table waybills add column if not exists pickup_name text;
alter table waybills add column if not exists pickup_city text;
alter table waybills add column if not exists pickup_maps_url text;
alter table waybills add column if not exists delivery_city text;

-- --- 4. Trigger: snapshot the new fields on Dispatched -----------------------
create or replace function dispatch_after_update()
returns trigger language plpgsql
security definer set search_path = public as $$
declare
  v_req       transport_requests%rowtype;
  v_client    text;
  v_pickup    text;
  v_pickup_nm text;
  v_pickup_ct text;
  v_pickup_mp text;
  v_deliver   text;
  v_deliver_ct text;
  v_recv      text;
  v_maps      text;
  v_truckno   text;
  v_svctp     text;
  v_shiptp    text;
  v_supp      text;
  v_driver    text;
  v_wb_no     text;
begin
  if new.status is not distinct from old.status then
    return null;
  end if;

  if new.status = 'Dispatched' then
    select * into v_req from transport_requests where id = new.request_id;

    select name into v_client from clients where id = v_req.client_id;

    -- Pickup snapshot (name / address / city / maps)
    select l.name, l.address, l.maps_url, c.name
      into v_pickup_nm, v_pickup, v_pickup_mp, v_pickup_ct
      from locations l
      left join cities c on c.id = l.city_id
      where l.id = v_req.pickup_location_id;

    -- Delivery snapshot (name / address / city / maps)
    select l.name, l.address, l.maps_url, c.name
      into v_recv, v_deliver, v_maps, v_deliver_ct
      from locations l
      left join cities c on c.id = l.city_id
      where l.id = v_req.delivery_location_id;

    select name into v_shiptp from shipment_types where id = v_req.shipment_type_id;
    select name into v_svctp from service_types
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
      client_name, pickup_address, pickup_name, pickup_city, pickup_maps_url,
      delivery_address, delivery_city, receiver_name,
      po_reference, delivery_maps_url, truck_number,
      service_type_name, shipment_type_name, quantity, pickup_date,
      supplier_name, driver_name, created_by
    ) values (
      v_wb_no, new.id, new.request_id, 'draft', now(),
      v_client, v_pickup, v_pickup_nm, v_pickup_ct, v_pickup_mp,
      v_deliver, v_deliver_ct, v_recv,
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

-- --- 5. Backfill new columns on existing waybills (best-effort) ---------------
update waybills w set
  pickup_name = pl.name,
  pickup_city = pc.name,
  pickup_maps_url = pl.maps_url,
  delivery_city = dc.name
from dispatches d
  join transport_requests r on r.id = d.request_id
  left join locations pl on pl.id = r.pickup_location_id
  left join cities pc on pc.id = pl.city_id
  left join locations dl on dl.id = r.delivery_location_id
  left join cities dc on dc.id = dl.city_id
where w.dispatch_id = d.id
  and (w.pickup_name is null and w.pickup_city is null and w.delivery_city is null);

grant select, insert, update, delete on all tables in schema public to authenticated;
grant all on all tables in schema public to service_role;
