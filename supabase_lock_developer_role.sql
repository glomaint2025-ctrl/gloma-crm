-- Gloma CRM — Lock the 'Developer' role to a single owner account
-- Date: 2026-08-08
--
-- Context: 'Developer' is meant to be the one full-control account
-- (capcutproforeveryone@gmail.com), hidden from Admin and everyone else. It is
-- NOT the same thing as the 'SMM & Developer' role, which is an ordinary
-- employee-tier role (a Web Developer), ranked below Admin and Manager like
-- any other normal role.
--
-- The app UI no longer offers 'Developer' as an assignable option to anyone
-- (see src/components/ManageRoles.jsx / src/App.jsx), but accounts could still
-- end up with role = 'Developer' if someone edited the row directly in the
-- Supabase Table Editor, or from before this fix shipped. This migration:
--   1. Demotes any existing row that wrongly holds 'Developer' back to
--      'Employee' (review and re-assign their real role afterward in
--      Manage Roles).
--   2. Adds a trigger that blocks any future insert/update from setting
--      role = 'Developer' on a row whose email isn't the owner account,
--      even via direct SQL/Table Editor edits.
--
-- How to run: Supabase Dashboard -> SQL Editor -> New query -> paste this
-- whole file -> Run. Safe to run multiple times.

-- 1. Fix any account that is wrongly marked Developer today.
update public.profiles
set role = 'Employee'
where role = 'Developer'
  and lower(email) <> 'capcutproforeveryone@gmail.com';

-- 2. Prevent it from happening again, at the database level.
create or replace function public.enforce_single_developer()
returns trigger as $$
begin
  if new.role = 'Developer' and lower(new.email) <> 'capcutproforeveryone@gmail.com' then
    raise exception 'The Developer role is reserved for capcutproforeveryone@gmail.com only.';
  end if;
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_enforce_single_developer on public.profiles;

create trigger trg_enforce_single_developer
before insert or update on public.profiles
for each row execute function public.enforce_single_developer();

notify pgrst, 'reload schema';
