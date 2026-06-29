-- =============================================================================
-- FastLane TMS (2026-06-29): allow overwriting / removing storage objects
-- =============================================================================
-- The original storage policies only granted INSERT on the private 'waybills'
-- and 'pods' buckets. Regenerating a waybill PDF re-uploads with upsert=true,
-- which is an UPDATE on storage.objects — with no UPDATE policy that failed with
-- "new row violates row-level security policy". This adds UPDATE + DELETE
-- policies (same role checks as the existing write policies). Idempotent.
-- =============================================================================

-- --- Waybills bucket: staff (admin/dispatch) may overwrite + delete ----------
drop policy if exists "staff update waybill files" on storage.objects;
create policy "staff update waybill files" on storage.objects
  for update to authenticated
  using (
    bucket_id = 'waybills'
    and has_role(array['admin','dispatch']::user_role[])
  )
  with check (
    bucket_id = 'waybills'
    and has_role(array['admin','dispatch']::user_role[])
  );

drop policy if exists "staff delete waybill files" on storage.objects;
create policy "staff delete waybill files" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'waybills'
    and has_role(array['admin','dispatch']::user_role[])
  );

-- --- Pods bucket: staff or the owning driver may overwrite + delete ----------
drop policy if exists "staff update pod files" on storage.objects;
create policy "staff update pod files" on storage.objects
  for update to authenticated
  using (
    bucket_id = 'pods'
    and (
      has_role(array['admin','dispatch']::user_role[])
      or current_driver_id() is not null
    )
  )
  with check (
    bucket_id = 'pods'
    and (
      has_role(array['admin','dispatch']::user_role[])
      or current_driver_id() is not null
    )
  );

drop policy if exists "staff delete pod files" on storage.objects;
create policy "staff delete pod files" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'pods'
    and (
      has_role(array['admin','dispatch']::user_role[])
      or current_driver_id() is not null
    )
  );
