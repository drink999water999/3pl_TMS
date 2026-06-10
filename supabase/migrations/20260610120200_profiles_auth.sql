-- =============================================================================
-- FastLane TMS — Phase 1.3: profiles + auth helper functions
-- =============================================================================
-- profiles.id == auth.users.id. A profile is auto-created on signup. Helper
-- functions are SECURITY DEFINER so RLS policies can read a user's role without
-- recursing into profiles' own RLS.
-- =============================================================================

create table profiles (
  id         uuid primary key references auth.users (id) on delete cascade,
  full_name  text,
  role       user_role not null default 'operations',
  driver_id  uuid references drivers (id) on delete set null,
  active     boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index profiles_role_idx on profiles (role);

-- --- Role helpers (used throughout RLS) ---------------------------------------
create or replace function current_app_role()
returns user_role
language sql stable security definer set search_path = public
as $$
  select role from profiles where id = auth.uid() and active;
$$;

create or replace function has_role(roles user_role[])
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from profiles
    where id = auth.uid() and active and role = any (roles)
  );
$$;

create or replace function is_admin()
returns boolean
language sql stable security definer set search_path = public
as $$
  select has_role(array['admin']::user_role[]);
$$;

create or replace function current_driver_id()
returns uuid
language sql stable security definer set search_path = public
as $$
  select driver_id from profiles where id = auth.uid();
$$;

-- --- Auto-provision a profile when an auth user is created --------------------
create or replace function handle_new_user()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', new.email),
    'operations'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();
