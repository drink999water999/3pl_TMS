-- =============================================================================
-- FastLane TMS — Internal comments on transport requests
-- =============================================================================
-- Staff can leave notes/comments on a request (e.g. coordination, follow-ups).
-- Internal only: clients do NOT get a read grant.
-- =============================================================================
create table if not exists request_comments (
  id          uuid primary key default gen_random_uuid(),
  request_id  uuid not null references transport_requests (id) on delete cascade,
  author_id   uuid references profiles (id),
  body        text not null,
  created_at  timestamptz not null default now()
);

create index if not exists request_comments_request_idx
  on request_comments (request_id);

alter table request_comments enable row level security;

-- Staff read.
drop policy if exists rc_staff_read on request_comments;
create policy rc_staff_read on request_comments
  for select to authenticated
  using (has_role(array['admin','operations','dispatch','finance']::user_role[]));

-- Admin + operations can add comments.
drop policy if exists rc_insert on request_comments;
create policy rc_insert on request_comments
  for insert to authenticated
  with check (has_role(array['admin','operations']::user_role[]));

-- An author can remove their own comment; admin can remove any.
drop policy if exists rc_delete on request_comments;
create policy rc_delete on request_comments
  for delete to authenticated
  using (is_admin() or author_id = auth.uid());
