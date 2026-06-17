-- =============================================================================
-- FastLane TMS (2026-06-17): dispatch §6 — outsourced trucks/drivers, own-fleet
-- base city, confirmation timestamp; waybill snapshot picks up outsourced
-- driver + plate. Idempotent.
-- =============================================================================

-- Own-fleet base city ("Available on City X" + dashboard area views).
alter table trucks add column if not exists current_city_id uuid references cities (id);

-- Outsourced assignment details captured on the dispatch.
alter table dispatches add column if not exists supplier_truck_id uuid references supplier_trucks (id);
alter table dispatches add column if not exists outsourced_driver_name text;
alter table dispatches add column if not exists outsourced_driver_id text;
alter table dispatches add column if not exists confirmed_at timestamptz;

-- Waybill snapshot: fall back to the outsourced driver name / supplier plate so
-- the document is complete regardless of own vs outsourced.
create or replace function dispatch_after_update()
returns trigger language plpgsql
security definer set search_path = public as $$
declare
  v_req     transport_requests%rowtype;
  v_client  text;
  v_pickup  text;
  v_deliver text;
  v_truckno text;
  v_trucktp text;
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

    select name    into v_client  from clients        where id = v_req.client_id;
    select address into v_pickup  from locations       where id = v_req.pickup_location_id;
    select address into v_deliver from locations       where id = v_req.delivery_location_id;
    select name    into v_shiptp  from shipment_types  where id = v_req.shipment_type_id;
    select name    into v_trucktp from truck_types
      where id = coalesce(new.truck_type_id, v_req.truck_type_id);

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
      client_name, pickup_address, delivery_address, truck_number,
      truck_type_name, shipment_type_name, quantity, pickup_date,
      supplier_name, driver_name, created_by
    ) values (
      v_wb_no, new.id, new.request_id, 'draft', now(),
      v_client, v_pickup, v_deliver, v_truckno,
      v_trucktp, v_shiptp, v_req.quantity,
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

grant select, insert, update, delete on all tables in schema public to authenticated;
grant all on all tables in schema public to service_role;
