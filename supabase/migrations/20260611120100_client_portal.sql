-- =============================================================================
-- FastLane TMS — Client portal 2/2: profile links, signup default, guard, RLS
-- =============================================================================
-- A "client" is a logistics CUSTOMER who self-registers and, once an admin
-- approves them and links them to a clients row, can:
--   • create + submit transport requests for their own company only
--   • view / download / email the waybills for their own shipments
-- They never see dispatch, fleet, other clients, or the dashboard.
-- =============================================================================

-- --- Profile: link to a client company + capture signup company name ----------
alter table profiles add column if not exists client_id uuid
  references clients (id) on delete set null;
alter table profiles add column if not exists company_name text;
create index if not exists profiles_client_idx on profiles (client_id);

-- --- Helper: the client company the current user belongs to -------------------
create or replace function current_client_id()
returns uuid
language sql stable security definer set search_path = public
as $$
  select client_id from profiles where id = auth.uid() and active;
$$;

-- --- Signups now default to an INACTIVE client (pending admin approval) --------
-- Staff users are created by an admin via the service role, which overrides
-- role + active right after creation, so this default only affects self-signup.
create or replace function handle_new_user()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, role, active, phone, company_name)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', new.email),
    'client',
    false,
    new.raw_user_meta_data ->> 'phone',
    new.raw_user_meta_data ->> 'company_name'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

-- --- Privilege guard: a normal (non-admin) user can edit their own name/phone
-- but can NEVER change their own role/active/client_id/driver_id. service_role
-- (admin tooling / approval actions) and app admins bypass this. Runs as
-- INVOKER so current_user reflects the real caller.
create or replace function guard_profile_privileges()
returns trigger
language plpgsql
as $$
begin
  if current_user <> 'authenticated' or is_admin() then
    return new;  -- service_role / internal / app admin → allow everything
  end if;
  new.role      := old.role;
  new.active     := old.active;
  new.client_id := old.client_id;
  new.driver_id := old.driver_id;
  return new;
end;
$$;

drop trigger if exists trg_guard_profile_privileges on profiles;
create trigger trg_guard_profile_privileges
  before update on profiles
  for each row execute function guard_profile_privileges();

-- =============================================================================
-- RLS for the client role (additive policies — staff policies are unchanged)
-- =============================================================================

-- Master data the request form needs: own company + own locations + lookups ---
create policy clients_client_read on clients
  for select to authenticated using (id = current_client_id());

create policy locations_client_read on locations
  for select to authenticated using (client_id = current_client_id());

create policy shipment_types_client_read on shipment_types
  for select to authenticated using (has_role(array['client']::user_role[]));

create policy truck_types_client_read on truck_types
  for select to authenticated using (has_role(array['client']::user_role[]));

-- Transport requests: read/insert/update/delete own, drafts only for changes --
create policy tr_client_read on transport_requests
  for select to authenticated
  using (client_id = current_client_id());

create policy tr_client_insert on transport_requests
  for insert to authenticated
  with check (client_id = current_client_id() and status = 'Draft');

create policy tr_client_update on transport_requests
  for update to authenticated
  using (client_id = current_client_id() and status = 'Draft')
  with check (
    client_id = current_client_id()
    and status in ('Draft', 'Submitted', 'Cancelled')   -- never self-approve
  );

create policy tr_client_delete on transport_requests
  for delete to authenticated
  using (client_id = current_client_id() and status = 'Draft');

-- Request items: read own; write only while the parent request is a draft -----
create policy ri_client_read on request_items
  for select to authenticated
  using (exists (
    select 1 from transport_requests tr
    where tr.id = request_items.request_id
      and tr.client_id = current_client_id()
  ));

create policy ri_client_write on request_items
  for all to authenticated
  using (exists (
    select 1 from transport_requests tr
    where tr.id = request_items.request_id
      and tr.client_id = current_client_id()
      and tr.status = 'Draft'
  ))
  with check (exists (
    select 1 from transport_requests tr
    where tr.id = request_items.request_id
      and tr.client_id = current_client_id()
      and tr.status = 'Draft'
  ));

-- Waybills: read the ones for the client's own requests -----------------------
create policy wb_client_read on waybills
  for select to authenticated
  using (exists (
    select 1 from transport_requests tr
    where tr.id = waybills.request_id
      and tr.client_id = current_client_id()
  ));
