-- =============================================================================
-- FastLane TMS — Manual customer-charge override on the dispatch
-- =============================================================================
-- When set, this is the price billed to the customer (overrides the client's
-- automatic pricing). Lets admins set/edit the charge directly for flexibility.
-- =============================================================================
alter table dispatches
  add column if not exists customer_charge numeric(12, 2);
