-- =============================================================================
-- FastLane TMS — Phase 1.6: RLS policies + storage buckets
-- =============================================================================
-- Every table is RLS-protected; policies are keyed on profiles.role via the
-- SECURITY DEFINER helpers (has_role / is_admin / current_driver_id).
--   Admin       → full access incl. master data + user management
--   Operations  → requests + tracking
--   Dispatch    → dispatch/execution + waybills
--   Driver      → only own assigned dispatches (status + POD)
-- System propagation runs in SECURITY DEFINER triggers, so it bypasses RLS.
-- =============================================================================

-- --- Base grants (RLS still gates row visibility) -----------------------------
grant usage on schema public to authenticated, service_role;
grant select, insert, update, delete on all tables in schema public to authenticated;
grant all on all tables in schema public to service_role;
grant usage, select on all sequences in schema public to authenticated, service_role;

-- =============================================================================
-- MASTER DATA + LOOKUPS: staff read, admin write
-- =============================================================================
do $$
declare
  t text;
  master_tables text[] := array[
    'clients', 'client_contacts', 'locations', 'contract_rates',
    'trucks', 'drivers', 'suppliers', 'supplier_truck_types',
    'supplier_rates', 'truck_types', 'shipment_types'
  ];
begin
  foreach t in array master_tables loop
    execute format('alter table public.%I enable row level security', t);
    execute format(
      'create policy %I on public.%I for select to authenticated
       using (has_role(array[''admin'',''operations'',''dispatch'']::user_role[]))',
      t || '_read', t);
    execute format(
      'create policy %I on public.%I for all to authenticated
       using (is_admin()) with check (is_admin())',
      t || '_admin_write', t);
  end loop;
end;
$$;

-- =============================================================================
-- PROFILES: self read/update; admin full
-- =============================================================================
alter table profiles enable row level security;

create policy profiles_self_read on profiles
  for select to authenticated using (id = auth.uid() or is_admin());

create policy profiles_self_update on profiles
  for update to authenticated using (id = auth.uid() or is_admin())
  with check (id = auth.uid() or is_admin());

create policy profiles_admin_insert on profiles
  for insert to authenticated with check (is_admin());

create policy profiles_admin_delete on profiles
  for delete to authenticated using (is_admin());

-- =============================================================================
-- TRANSPORT REQUESTS + ITEMS: staff read, ops/admin write
-- =============================================================================
alter table transport_requests enable row level security;

create policy tr_read on transport_requests
  for select to authenticated
  using (has_role(array['admin','operations','dispatch']::user_role[]));

create policy tr_write on transport_requests
  for all to authenticated
  using (has_role(array['admin','operations']::user_role[]))
  with check (has_role(array['admin','operations']::user_role[]));

alter table request_items enable row level security;

create policy ri_read on request_items
  for select to authenticated
  using (has_role(array['admin','operations','dispatch']::user_role[]));

create policy ri_write on request_items
  for all to authenticated
  using (has_role(array['admin','operations']::user_role[]))
  with check (has_role(array['admin','operations']::user_role[]));

-- =============================================================================
-- DISPATCHES: staff read (driver sees own); dispatch/admin write; driver own
-- =============================================================================
alter table dispatches enable row level security;

create policy disp_read on dispatches
  for select to authenticated
  using (
    has_role(array['admin','operations','dispatch']::user_role[])
    or driver_id = current_driver_id()
  );

create policy disp_staff_write on dispatches
  for all to authenticated
  using (has_role(array['admin','dispatch']::user_role[]))
  with check (has_role(array['admin','dispatch']::user_role[]));

create policy disp_driver_update on dispatches
  for update to authenticated
  using (driver_id = current_driver_id())
  with check (driver_id = current_driver_id());

-- =============================================================================
-- WAYBILLS + PDFS: staff read, dispatch/admin write
-- =============================================================================
alter table waybills enable row level security;

create policy wb_read on waybills
  for select to authenticated
  using (has_role(array['admin','operations','dispatch']::user_role[]));

create policy wb_write on waybills
  for all to authenticated
  using (has_role(array['admin','dispatch']::user_role[]))
  with check (has_role(array['admin','dispatch']::user_role[]));

alter table waybill_pdfs enable row level security;

create policy wbpdf_read on waybill_pdfs
  for select to authenticated
  using (has_role(array['admin','operations','dispatch']::user_role[]));

create policy wbpdf_write on waybill_pdfs
  for all to authenticated
  using (has_role(array['admin','dispatch']::user_role[]))
  with check (has_role(array['admin','dispatch']::user_role[]));

-- =============================================================================
-- PODS: staff + own-driver read/insert
-- =============================================================================
alter table pods enable row level security;

create policy pods_read on pods
  for select to authenticated
  using (
    has_role(array['admin','operations','dispatch']::user_role[])
    or exists (
      select 1 from dispatches d
      where d.id = pods.dispatch_id and d.driver_id = current_driver_id()
    )
  );

create policy pods_insert on pods
  for insert to authenticated
  with check (
    has_role(array['admin','dispatch']::user_role[])
    or exists (
      select 1 from dispatches d
      where d.id = pods.dispatch_id and d.driver_id = current_driver_id()
    )
  );

-- =============================================================================
-- EXCEPTIONS: staff read/write
-- =============================================================================
alter table exceptions enable row level security;

create policy exc_read on exceptions
  for select to authenticated
  using (has_role(array['admin','operations','dispatch']::user_role[]));

create policy exc_write on exceptions
  for all to authenticated
  using (has_role(array['admin','operations','dispatch']::user_role[]))
  with check (has_role(array['admin','operations','dispatch']::user_role[]));

-- =============================================================================
-- STATUS HISTORY: staff read (writes come from SECURITY DEFINER triggers)
-- =============================================================================
alter table status_history enable row level security;

create policy sh_read on status_history
  for select to authenticated
  using (has_role(array['admin','operations','dispatch']::user_role[]));

create policy sh_admin_all on status_history
  for all to authenticated
  using (is_admin()) with check (is_admin());

-- =============================================================================
-- STORAGE BUCKETS: pods + waybills (private)
-- =============================================================================
insert into storage.buckets (id, name, public)
values ('pods', 'pods', false), ('waybills', 'waybills', false)
on conflict (id) do nothing;

create policy "staff read pod files" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'pods'
    and (
      has_role(array['admin','operations','dispatch']::user_role[])
      or current_driver_id() is not null
    )
  );

create policy "staff write pod files" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'pods'
    and (
      has_role(array['admin','dispatch']::user_role[])
      or current_driver_id() is not null
    )
  );

create policy "staff read waybill files" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'waybills'
    and has_role(array['admin','operations','dispatch']::user_role[])
  );

create policy "staff write waybill files" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'waybills'
    and has_role(array['admin','dispatch']::user_role[])
  );
