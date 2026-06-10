-- =============================================================================
-- FastLane TMS — Phase 1.5: automation triggers (DATA INTEGRITY ONLY)
-- =============================================================================
-- These triggers handle atomic, reliable data propagation. They do NOT generate
-- PDFs or send email — that stays entirely in Next.js Server Actions. Status
-- *transition* rules are enforced in the app as a state machine; the DB enforces
-- only the critical guards below plus the optimistic `version` bump on dispatches.
-- =============================================================================

-- 1) request_no auto-generation (TR-0001, TR-0002, …) -------------------------
create or replace function gen_request_no()
returns trigger language plpgsql as $$
begin
  if new.request_no is null or new.request_no = '' then
    new.request_no := 'TR-' || lpad(nextval('request_no_seq')::text, 4, '0');
  end if;
  return new;
end;
$$;

create trigger trg_request_no
  before insert on transport_requests
  for each row execute function gen_request_no();

-- 2) Dispatch insert → request = Assigned; assigned truck → busy --------------
create or replace function on_dispatch_insert()
returns trigger language plpgsql
security definer set search_path = public as $$
begin
  update transport_requests
    set status = 'Assigned'
    where id = new.request_id and status = 'Approved';

  if new.truck_id is not null then
    update trucks set status = 'busy' where id = new.truck_id;
  end if;

  return new;
end;
$$;

create trigger trg_dispatch_insert
  after insert on dispatches
  for each row execute function on_dispatch_insert();

-- 3) Dispatch BEFORE UPDATE: version bump, timestamp stamping, Delivered guard -
create or replace function dispatch_before_update()
returns trigger language plpgsql
security definer set search_path = public as $$
begin
  -- optimistic-lock version bump on every change
  new.version := old.version + 1;

  if new.status is distinct from old.status then
    if new.status = 'Dispatched' and new.dispatched_at is null then
      new.dispatched_at := now();
    elsif new.status = 'Picked Up' and new.picked_up_at is null then
      new.picked_up_at := now();
    elsif new.status = 'Delivered' then
      -- GUARD: cannot deliver without proof of delivery
      if not exists (select 1 from pods where dispatch_id = new.id) then
        raise exception 'Dispatch % cannot be marked Delivered without a POD', new.id
          using errcode = 'check_violation';
      end if;
      if new.delivered_at is null then
        new.delivered_at := now();
      end if;
    end if;
  end if;

  return new;
end;
$$;

create trigger trg_dispatch_before_update
  before update on dispatches
  for each row execute function dispatch_before_update();

-- 4) Dispatch AFTER UPDATE: auto-waybill on Dispatched; propagate Delivered ----
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

  -- 4a) On Dispatched → create the waybill with a self-contained snapshot
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

  -- 4b) On Delivered → request = Delivered; truck → available
  if new.status = 'Delivered' then
    update transport_requests set status = 'Delivered' where id = new.request_id;
    if new.truck_id is not null then
      update trucks set status = 'available' where id = new.truck_id;
    end if;
  end if;

  return null;
end;
$$;

create trigger trg_dispatch_after_update
  after update on dispatches
  for each row execute function dispatch_after_update();

-- 5) Status-history logging (requests + dispatches) ---------------------------
create or replace function log_request_status()
returns trigger language plpgsql
security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    insert into status_history (entity, entity_id, from_status, to_status, changed_by)
    values ('request', new.id, null, new.status::text, new.created_by);
  elsif new.status is distinct from old.status then
    insert into status_history (entity, entity_id, from_status, to_status, changed_by)
    values ('request', new.id, old.status::text, new.status::text, new.updated_by);
  end if;
  return null;
end;
$$;

create trigger trg_log_request_status
  after insert or update on transport_requests
  for each row execute function log_request_status();

create or replace function log_dispatch_status()
returns trigger language plpgsql
security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    insert into status_history (entity, entity_id, from_status, to_status, changed_by)
    values ('dispatch', new.id, null, new.status::text, new.created_by);
  elsif new.status is distinct from old.status then
    insert into status_history (entity, entity_id, from_status, to_status, changed_by)
    values ('dispatch', new.id, old.status::text, new.status::text, new.updated_by);
  end if;
  return null;
end;
$$;

create trigger trg_log_dispatch_status
  after insert or update on dispatches
  for each row execute function log_dispatch_status();

-- 6) Shared set_updated_at() on EVERY table with an updated_at column ----------
do $$
declare
  r record;
begin
  for r in
    select table_name
    from information_schema.columns
    where table_schema = 'public' and column_name = 'updated_at'
  loop
    execute format('drop trigger if exists set_updated_at on public.%I', r.table_name);
    execute format(
      'create trigger set_updated_at before update on public.%I
       for each row execute function set_updated_at()', r.table_name);
  end loop;
end;
$$;
