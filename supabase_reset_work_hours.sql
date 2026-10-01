-- ============================================================================
-- Gloma CRM -- reset EVERYONE's work hours (time clock history)
-- ============================================================================
-- Run in Supabase -> SQL Editor. This clears public.time_logs for all employees
-- so the time clock starts fresh. Before deleting, every row is copied into
-- public.time_logs_archive, so nothing is lost permanently and it can be restored.
--
-- What is NOT touched: salaries, payroll payslips, attendance marks (leave /
-- absent), expenses, invoices. If a payslip for a month was already calculated
-- from the old hours, use Finance -> Payroll -> Reset month and calculate again.
--
-- To undo (put the old rows back), run:
--   insert into public.time_logs
--   select id, user_id, employee_name, work_date, clock_in, clock_out, regular_minutes,
--          overtime_minutes, is_holiday, created_at, source, auto_closed
--   from public.time_logs_archive
--   on conflict (id) do nothing;
-- ============================================================================

create table if not exists public.time_logs_archive (like public.time_logs including defaults);
alter table public.time_logs_archive add column if not exists archived_at timestamptz default now();

-- No policies on purpose: with RLS on, only the dashboard/service role can read it.
alter table public.time_logs_archive enable row level security;

insert into public.time_logs_archive
select * from public.time_logs;

delete from public.time_logs;

select
  (select count(*) from public.time_logs_archive) as archived_rows,
  (select count(*) from public.time_logs) as remaining_rows;
