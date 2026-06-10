-- =============================================================================
-- Reference lookups required in EVERY environment (local AND production).
-- These live in a migration (not seed.sql) so `supabase db push` ships them to
-- the cloud — without them you can't create requests/dispatches. Demo master
-- data (sample clients, trucks, drivers) stays in seed.sql for local only.
-- Idempotent.
-- =============================================================================
insert into truck_types (name, code, description) values
  ('Flatbed',      'FLAT', 'Open flatbed trailer'),
  ('Curtain Side', 'CURT', 'Curtain-sided trailer'),
  ('5 Ton',        '5T',   '5-tonne rigid truck'),
  ('10 Ton',       '10T',  '10-tonne rigid truck'),
  ('Van',          'VAN',  'Panel/box van')
on conflict do nothing;

insert into shipment_types (name, code, description) values
  ('Dry',    'DRY',  'Ambient / dry goods'),
  ('Cold',   'COLD', 'Chilled / refrigerated'),
  ('Frozen', 'FRZ',  'Frozen goods')
on conflict do nothing;
