-- =============================================================================
-- FastLane TMS — Client portal 1/2: add the 'client' role
-- =============================================================================
-- ALTER TYPE ... ADD VALUE must be committed before the new value can be used
-- in later statements, so this lives in its OWN migration file (its own
-- transaction). The policies/functions that reference 'client' are in the
-- next migration (…120100_client_portal.sql).
-- =============================================================================

alter type user_role add value if not exists 'client';
