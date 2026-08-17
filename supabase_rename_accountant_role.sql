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
-- the app code and blocked the rename below with a 23514 violation. Re-adding it
-- with an updated list also failed, because some existing row already holds a
-- role value outside that list (likely an older/legacy value). Rather than guess
-- the full historical list -- and hit this again every time a role is renamed or
-- added -- just drop the constraint and don't recreate it. Valid roles are
-- already controlled by the app's own UI (src/components/ManageRoles.jsx), so a
-- rigid DB-level whitelist is redundant and fragile.
--
-- How to run: Supabase Dashboard -> SQL Editor -> New query -> paste this whole
-- file -> Run. Safe to run multiple times.

alter table public.profiles drop constraint if exists profiles_role_check;

update public.profiles
set role = 'Coordinator & Accountant'
where role = 'Accountant';

notify pgrst, 'reload schema';
