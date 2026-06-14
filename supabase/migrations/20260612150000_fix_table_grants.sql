-- =============================================================================
-- Fix: base table/sequence GRANTs for tables created after the original grant
-- =============================================================================
-- 20260610120500 granted privileges with `... on all tables in schema public`,
-- which is a ONE-TIME grant covering only the tables that existed then. Tables
-- added by later migrations — waybill_billing, credit_notes, request_comments —
-- and the credit_note_seq sequence never received grants, so on the hosted DB
-- the `authenticated` role hits "permission denied for table ..." (and Finance,
-- which reads waybill_billing, silently returns empty). Local dev masked this
-- because `supabase start` auto-applies default privileges.
--
-- This re-runs the grants for everything that exists now AND sets default
-- privileges so future tables/sequences are covered automatically. RLS still
-- gates row visibility — these are table-level grants only.
-- =============================================================================

grant usage on schema public to authenticated, service_role;

grant select, insert, update, delete on all tables in schema public to authenticated;
grant all on all tables in schema public to service_role;
grant usage, select on all sequences in schema public to authenticated, service_role;

-- Durable: anything created later by the migration role inherits these.
alter default privileges in schema public
  grant select, insert, update, delete on tables to authenticated;
alter default privileges in schema public
  grant all on tables to service_role;
alter default privileges in schema public
  grant usage, select on sequences to authenticated, service_role;
