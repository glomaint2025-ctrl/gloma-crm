-- Gloma CRM — Fix: Team Members tab shows only the Developer account
-- Date: 2026-08-08
--
-- Why this happens (three causes, all handled below):
--   1. Accounts that existed in the OFFLINE SANDBOX (Bishwa Admin, Devin Editor,
--      Sanjeewa SME...) were demo rows in the browser's localStorage only.
--      They were NEVER in the live database. Real accounts must be created via
--      System Settings -> Manage Roles -> "Add New Team Member Account".
--   2. Users who signed up in Supabase Auth may have NO row in public.profiles
--      (nothing auto-creates one). Section B backfills them; Section C adds a
--      trigger so every future signup gets a profile row automatically.
--   3. RLS policies may only let a user SELECT their own row, so the directory
--      shows just yourself. Section D adds policies matching the app's RBAC:
--      everyone sees all profiles EXCEPT the Developer row (hidden from
--      non-developers), Developer sees everything.
--
-- Run the whole file in: Supabase Dashboard -> SQL Editor -> Run.
-- Safe to re-run (idempotent).

-- ============================================================
-- A. DIAGNOSTIC (optional) — run these two lines alone first to
--    see what the live DB really contains:
--
--   select count(*) as auth_users from auth.users;
--   select id, email, full_name, role from public.profiles;
--
-- If auth_users = 1, the live DB genuinely has only your account:
-- create the team via Manage Roles -> Add New Team Member (the old
-- sandbox names were demo data and won't come back on their own).
-- ============================================================

-- ============================================================
-- B. Backfill: create a profile row for every Auth user missing one
-- ============================================================
insert into public.profiles (id, email, full_name, role, language, avatar_url)
select
  u.id,
  u.email,
  coalesce(u.raw_user_meta_data ->> 'full_name', split_part(u.email, '@', 1)),
  case
    when u.email = 'capcutproforeveryone@gmail.com' then 'Developer'
    else coalesce(u.raw_user_meta_data ->> 'role', 'Employee')
  end,
  'en',
  'https://api.dicebear.com/7.x/initials/svg?seed=' ||
    coalesce(u.raw_user_meta_data ->> 'full_name', split_part(u.email, '@', 1))
from auth.users u
where not exists (select 1 from public.profiles p where p.id = u.id);

-- ============================================================
-- C. Auto-create a profile row on every future signup
-- ============================================================
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name, role, language, avatar_url)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'full_name', split_part(new.email, '@', 1)),
    case
      when new.email = 'capcutproforeveryone@gmail.com' then 'Developer'
      else coalesce(new.raw_user_meta_data ->> 'role', 'Employee')
    end,
    'en',
    'https://api.dicebear.com/7.x/initials/svg?seed=' ||
      coalesce(new.raw_user_meta_data ->> 'full_name', split_part(new.email, '@', 1))
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============================================================
-- D. RLS policies matching the app's RBAC rules
-- ============================================================
alter table public.profiles enable row level security;

-- Helper: is the current requester the Developer? (by JWT email)
create or replace function public.is_developer()
returns boolean
language sql stable security definer
set search_path = public
as $$
  select coalesce(auth.jwt() ->> 'email', '') = 'capcutproforeveryone@gmail.com';
$$;

-- Helper: current requester's role, read without triggering recursive RLS
create or replace function public.current_user_role()
returns text
language sql stable security definer
set search_path = public
as $$
  select role from public.profiles where id = auth.uid();
$$;

-- SELECT: everyone sees all profiles except the Developer row;
--         Developer sees everything; you always see your own row.
drop policy if exists "gloma_select_profiles" on public.profiles;
create policy "gloma_select_profiles" on public.profiles
  for select to authenticated
  using (
    public.is_developer()
    or id = auth.uid()
    or coalesce(role, 'Employee') <> 'Developer'
  );

-- UPDATE: own row always; Developer any row; Admin any non-Developer row.
drop policy if exists "gloma_update_profiles" on public.profiles;
create policy "gloma_update_profiles" on public.profiles
  for update to authenticated
  using (
    id = auth.uid()
    or public.is_developer()
    or (public.current_user_role() = 'Admin' and coalesce(role, 'Employee') <> 'Developer')
  );

-- INSERT: own row (signup fallback), or Admin/Developer creating members.
drop policy if exists "gloma_insert_profiles" on public.profiles;
create policy "gloma_insert_profiles" on public.profiles
  for insert to authenticated
  with check (
    id = auth.uid()
    or public.is_developer()
    or public.current_user_role() = 'Admin'
  );

-- Refresh PostgREST schema cache
notify pgrst, 'reload schema';
