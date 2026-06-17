-- =============================================================================
-- FastLane TMS (2026-06-17): make truck_types manageable + align vehicle list
-- =============================================================================
-- truck_types is the PHYSICAL vehicle list used by fleet trucks + dispatch
-- (distinct from service_types, the client-facing rate/request vocabulary).
-- This adds soft-delete so it can be managed from the Setup page, and aligns
-- the demo seed with the real vehicle list. Pallet/Box stay in service_types
-- only (they are cargo units, not vehicles). Idempotent.
-- =============================================================================

alter table truck_types add column if not exists deleted_at timestamptz;

-- Retire the old generic demo seed (kept, not deleted, to preserve any FKs).
update truck_types set is_active = false
  where lower(name) in ('5 ton', '10 ton', 'van');

-- Align with the spec's real vehicle types (Flatbed + Curtain Side already seeded).
insert into truck_types (name, code, description) values
  ('Chiller',      'CHL', 'Refrigerated truck'),
  ('Lorry-12 Ton', 'L12', '12-tonne lorry'),
  ('Lorry-10 Ton', 'L10', '10-tonne lorry'),
  ('Dyna-6 Ton',   'D6',  '6-tonne Dyna'),
  ('Dyna-5 Ton',   'D5',  '5-tonne Dyna'),
  ('Dyna-4 Ton',   'D4',  '4-tonne Dyna')
on conflict do nothing;
