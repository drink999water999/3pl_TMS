-- =============================================================================
-- FastLane TMS — Default currency to SAR + finance payment tracking
-- =============================================================================

-- --- Default new records to SAR ----------------------------------------------
alter table clients        alter column currency set default 'SAR';
alter table contract_rates alter column currency set default 'SAR';
alter table supplier_rates alter column currency set default 'SAR';

-- --- Relabel existing records (amounts unchanged; currency label only) --------
update clients         set currency = 'SAR' where currency is null or currency = 'USD';
update contract_rates  set currency = 'SAR' where currency = 'USD';
update supplier_rates  set currency = 'SAR' where currency = 'USD';
update waybills         set currency = 'SAR' where currency = 'USD';
update waybill_billing  set currency = 'SAR' where currency = 'USD';

-- --- Finance: payment tracking on the internal billing row -------------------
alter table waybill_billing
  add column if not exists payment_status text not null default 'unbilled',
  add column if not exists invoice_no     text,
  add column if not exists paid_at        timestamptz;

alter table waybill_billing drop constraint if exists wbbill_payment_status_chk;
alter table waybill_billing add constraint wbbill_payment_status_chk
  check (payment_status in ('unbilled', 'invoiced', 'paid'));
