-- Gloma CRM — Rename role: 'Accountant' -> 'Coordinator & Accountant'
-- Date: 2026-08-15
--
-- The app UI (src/components/ManageRoles.jsx) now offers 'Coordinator & Accountant'
-- instead of 'Accountant' in the role dropdown. This updates any existing profiles
-- rows still holding the old value so their access (task assignment, Company
-- Finance) matches the new role checks in the app. Unrelated to the separate
-- 'Coordinator' role, which is untouched.
--
-- The live "profiles" table has a check constraint (profiles_role_check) that
-- only allows a fixed, hardcoded list of role values -- this wasn't visible from
-- the app code and blocked the rename below with a 23514 violation. Rebuilt here
-- to include every role value the app currently uses.
--
-- How to run: Supabase Dashboard -> SQL Editor -> New query -> paste this whole
-- file -> Run. Safe to run multiple times.

alter table public.profiles drop constraint if exists profiles_role_check;

alter table public.profiles add constraint profiles_role_check
  check (role in (
    'Employee',
    'Editor',
    'Social Media Executive',
    'SMM & Developer',
    'Coordinator & Accountant',
    'Coordinator',
    'Marketing Executive',
    'Manager',
    'Admin',
    'Developer'
  ));

update public.profiles
set role = 'Coordinator & Accountant'
where role = 'Accountant';

notify pgrst, 'reload schema';
