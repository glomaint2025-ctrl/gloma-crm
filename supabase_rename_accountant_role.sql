-- Gloma CRM — Rename role: 'Accountant' -> 'Coordinator & Accountant'
-- Date: 2026-08-15
--
-- The app UI (src/components/ManageRoles.jsx) now offers 'Coordinator & Accountant'
-- instead of 'Accountant' in the role dropdown. This updates any existing profiles
-- rows still holding the old value so their access (task assignment, Company
-- Finance) matches the new role checks in the app. Unrelated to the separate
-- 'Coordinator' role, which is untouched.
--
-- How to run: Supabase Dashboard -> SQL Editor -> New query -> paste this whole
-- file -> Run. Safe to run multiple times.

update public.profiles
set role = 'Coordinator & Accountant'
where role = 'Accountant';

notify pgrst, 'reload schema';
