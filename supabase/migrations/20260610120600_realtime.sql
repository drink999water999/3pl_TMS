-- =============================================================================
-- FastLane TMS — Phase 7: enable Realtime on the operational tables
-- =============================================================================
-- The dashboard / dispatch board / dispatch detail subscribe to changes and
-- refresh live. RLS still governs which rows a subscriber actually receives.
-- Idempotent: safe to run more than once.
-- =============================================================================
do $$
begin
  if not exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    create publication supabase_realtime;
  end if;

  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'dispatches'
  ) then
    alter publication supabase_realtime add table public.dispatches;
  end if;

  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'transport_requests'
  ) then
    alter publication supabase_realtime add table public.transport_requests;
  end if;
end $$;
