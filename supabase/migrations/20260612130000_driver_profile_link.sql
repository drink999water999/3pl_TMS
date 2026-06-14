-- =============================================================================
-- Fix: driver logins must set profiles.driver_id
-- =============================================================================
-- Driver RLS policies resolve the signed-in driver via current_driver_id(),
-- which reads profiles.driver_id. Logins provisioned from Fleet linked
-- drivers.user_id but did NOT set profiles.driver_id, so those drivers saw none
-- of their assigned dispatches. Backfill the link for every driver that already
-- has a login.
update profiles p
   set driver_id = d.id
  from drivers d
 where d.user_id = p.id
   and p.driver_id is distinct from d.id;
