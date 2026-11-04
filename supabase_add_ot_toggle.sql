-- Overtime is now switched on by hand (Dashboard clock "Overtime" button, or the OT checkbox
-- when HR / the employee enters times). Run once in the Supabase SQL Editor. Safe to re-run.

alter table public.time_logs
  add column if not exists ot_enabled boolean not null default false;

-- Keep overtime that was already recorded under the old automatic rule, so past payslips
-- and Work Hours history do not change when those logs are edited.
update public.time_logs
set ot_enabled = true
where coalesce(overtime_minutes, 0) > 0 and ot_enabled = false;

notify pgrst, 'reload schema';
