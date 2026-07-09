-- =============================================================================
-- FastLane TMS (2026-07-09): "TMS-Adjusts Comments 2" batch
-- =============================================================================
--   • Waybill: snapshot the driver's license/ID number (shown on the PDF's
--     Transportation table). own fleet -> drivers.license_no; outsourced ->
--     dispatches.outsourced_driver_id.
--   • Configurable mandatory fields on the new-request form: request_field_config
--     (admin toggles which fields are required; the form reads it).
-- Idempotent.
-- =============================================================================

-- --- 1. Waybill driver license snapshot --------------------------------------
alter table waybills add column if not exists driver_license text;

create or replace function dispatch_after_update()
returns trigger language plpgsql
security definer set search_path = public as $$
declare
  v_req        transport_requests%rowtype;
  v_client     text;
  v_pickup     text;
  v_pickup_nm  text;
  v_pickup_ct  text;
  v_pickup_mp  text;
  v_deliver    text;
  v_deliver_ct text;
  v_recv       text;
  v_maps       text;
  v_truckno    text;
  v_svctp      text;
  v_shiptp     text;
  v_supp       text;
  v_driver     text;
  v_driver_lic text;
  v_wb_no      text;
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

    -- Driver name + license/ID number.
    if new.driver_id is not null then
      select name, license_no into v_driver, v_driver_lic
        from drivers where id = new.driver_id;
    else
      v_driver := new.outsourced_driver_name;
      v_driver_lic := new.outsourced_driver_id;
    end if;

    v_wb_no := 'WB-' || to_char(now(), 'YYYYMMDD') || '-' || v_req.request_no;

    insert into waybills (
      waybill_no, dispatch_id, request_id, status, issued_at,
      client_name, pickup_address, pickup_name, pickup_city, pickup_maps_url,
      delivery_address, delivery_city, receiver_name,
      po_reference, delivery_maps_url, truck_number,
      service_type_name, shipment_type_name, quantity, pickup_date,
      supplier_name, driver_name, driver_license, created_by
    ) values (
      v_wb_no, new.id, new.request_id, 'draft', now(),
      v_client, v_pickup, v_pickup_nm, v_pickup_ct, v_pickup_mp,
      v_deliver, v_deliver_ct, v_recv,
      v_req.po_reference, v_maps, v_truckno,
      v_svctp, v_shiptp, v_req.quantity,
      coalesce(v_req.required_pickup_at::date, v_req.delivery_date),
      v_supp, v_driver, v_driver_lic, new.updated_by
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

-- Backfill license on existing waybills (best-effort).
update waybills w set driver_license = coalesce(dr.license_no, d.outsourced_driver_id)
from dispatches d
  left join drivers dr on dr.id = d.driver_id
where w.dispatch_id = d.id
  and w.driver_license is null;

-- --- 2. Configurable mandatory request fields --------------------------------
create table if not exists request_field_config (
  field_key   text primary key,
  required    boolean not null default false,
  updated_at  timestamptz not null default now(),
  updated_by  uuid references profiles (id)
);

alter table request_field_config enable row level security;

-- Everyone signed in can READ the config (the request form needs it, including
-- portal clients); only admins can change it.
drop policy if exists rfc_read on request_field_config;
create policy rfc_read on request_field_config
  for select to authenticated using (true);

drop policy if exists rfc_write on request_field_config;
create policy rfc_write on request_field_config
  for all to authenticated
  using (is_admin())
  with check (is_admin());

-- Seed the known configurable fields (all optional by default; admin opts in).
insert into request_field_config (field_key, required) values
  ('po_reference', false),
  ('service_type_id', false),
  ('shipment_type_id', false),
  ('quantity', false),
  ('weight', false),
  ('distance_km', false),
  ('required_pickup_at', false),
  ('delivery_date', false),
  ('additional_services', false),
  ('special_instructions', false)
on conflict (field_key) do nothing;

drop trigger if exists set_updated_at on request_field_config;
create trigger set_updated_at before update on request_field_config
  for each row execute function set_updated_at();

-- --- 3. Grants (RLS != grants; cover the new table) --------------------------
grant select, insert, update, delete on all tables in schema public to authenticated;
grant all on all tables in schema public to service_role;
