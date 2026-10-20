-- Gloma CRM — Add: role-specific EOD reports (Marketing, Developer, SMM & Developer, Accountant)
-- Date: 2026-10-20
--
-- Adds two columns to daily_updates:
--   report_type : general | marketing | developer | smm_developer | accountant
--   report_data : the numbers of the report (messages, calls, orders, ...) as JSON
--
-- Until this is run the EOD tab still works: reports are saved as plain text in
-- "work_completed" and only the numeric summary table / filters are unavailable.
--
-- How to run: Supabase Dashboard -> SQL Editor -> New query -> paste -> Run.
-- Safe to run multiple times.

alter table public.daily_updates add column if not exists report_type text default 'general';
alter table public.daily_updates add column if not exists report_data jsonb;

create index if not exists idx_daily_updates_report_type on public.daily_updates(report_type);

notify pgrst, 'reload schema';
