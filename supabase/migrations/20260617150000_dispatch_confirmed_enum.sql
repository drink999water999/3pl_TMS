-- =============================================================================
-- FastLane TMS (2026-06-17): add 'Confirmed' to the dispatch lifecycle.
-- Isolated in its own migration so the new enum value commits before any later
-- migration / app code references it (Postgres requires this).
-- =============================================================================
alter type dispatch_status add value if not exists 'Confirmed';
