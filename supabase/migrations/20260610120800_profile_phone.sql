-- =============================================================================
-- Add an optional phone number to profiles (editable from Settings).
-- =============================================================================
alter table public.profiles add column if not exists phone text;
