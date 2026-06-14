-- =============================================================================
-- FastLane TMS — Credit notes + waybill amendment
-- =============================================================================
-- 1) Waybills can be AMENDED after approval (mistakes happen). We keep the same
--    waybill number but track a revision counter + who/when amended, and the PDF
--    is regenerated. RLS already lets admin/dispatch write waybills.
-- 2) CREDIT NOTES let finance/admin issue a billing correction against a waybill
--    (e.g. overcharge, partial refund). They net down revenue + outstanding.
-- =============================================================================

-- --- Waybill amendment tracking ----------------------------------------------
alter table waybills
  add column if not exists revision   integer not null default 0,
  add column if not exists amended_at timestamptz,
  add column if not exists amended_by uuid references profiles (id);

-- --- Credit notes -------------------------------------------------------------
create sequence if not exists credit_note_seq;

create table if not exists credit_notes (
  id          uuid primary key default gen_random_uuid(),
  credit_no   text not null unique,                 -- CN-YYYYMMDD-0001
  waybill_id  uuid not null references waybills (id) on delete cascade,
  amount      numeric(12, 2) not null check (amount > 0),
  currency    text not null default 'SAR',
  reason      text,
  status      text not null default 'issued' check (status in ('issued', 'void')),
  created_by  uuid references profiles (id),
  created_at  timestamptz not null default now(),
  voided_at   timestamptz
);

create index if not exists credit_notes_waybill_idx on credit_notes (waybill_id);

-- Auto-number on insert (CN-YYYYMMDD-NNNN), mirroring the waybill_no pattern.
create or replace function set_credit_no()
returns trigger language plpgsql as $$
begin
  if new.credit_no is null or new.credit_no = '' then
    new.credit_no := 'CN-' || to_char(now(), 'YYYYMMDD') || '-' ||
                     lpad(nextval('credit_note_seq')::text, 4, '0');
  end if;
  return new;
end;
$$;

drop trigger if exists trg_set_credit_no on credit_notes;
create trigger trg_set_credit_no
  before insert on credit_notes
  for each row execute function set_credit_no();

-- --- RLS ----------------------------------------------------------------------
alter table credit_notes enable row level security;

-- Staff who deal with billing/ops can read; admin + finance can write.
drop policy if exists cn_staff_read on credit_notes;
create policy cn_staff_read on credit_notes
  for select to authenticated
  using (has_role(array['admin','operations','dispatch','finance']::user_role[]));

drop policy if exists cn_write on credit_notes;
create policy cn_write on credit_notes
  for all to authenticated
  using (has_role(array['admin','finance']::user_role[]))
  with check (has_role(array['admin','finance']::user_role[]));

-- A client can read credit notes raised against their own waybills.
drop policy if exists cn_client_read on credit_notes;
create policy cn_client_read on credit_notes
  for select to authenticated
  using (
    exists (
      select 1
      from waybills w
      join transport_requests tr on tr.id = w.request_id
      where w.id = credit_notes.waybill_id
        and tr.client_id = current_client_id()
    )
  );
