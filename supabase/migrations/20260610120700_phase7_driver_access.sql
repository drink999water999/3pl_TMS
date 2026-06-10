-- =============================================================================
-- FastLane TMS — Phase 7: driver read access to their waybills
-- =============================================================================
-- Drivers have no master-data / request read access by design. The waybill is a
-- self-contained SNAPSHOT (client, pickup/delivery address, truck, driver), so
-- giving a driver read access to the waybill for a dispatch assigned to them is
-- enough to power the mobile "My Deliveries" view — no joins to protected tables.
-- Idempotent.
-- =============================================================================
drop policy if exists wb_driver_read on waybills;
create policy wb_driver_read on waybills
  for select to authenticated
  using (
    exists (
      select 1 from dispatches d
      where d.id = waybills.dispatch_id
        and d.driver_id = current_driver_id()
    )
  );
