-- Gloma CRM — Add: online/last-seen presence tracking (Developer-only feature)
-- Date: 2026-08-08
--
-- Adds a last_seen timestamp to profiles. The app updates each logged-in
-- user's own last_seen every ~60s while the app is open (see App.jsx). The
-- Manage Roles page (Developer only) uses this to show an Online/Offline
-- dot and a "last seen X ago" label per team member.
--
-- How to run: Supabase Dashboard -> SQL Editor -> New query -> paste this
-- whole file -> Run. Safe to run multiple times (IF NOT EXISTS guard).

alter table if exists public.profiles
  add column if not exists last_seen timestamptz;

notify pgrst, 'reload schema';
