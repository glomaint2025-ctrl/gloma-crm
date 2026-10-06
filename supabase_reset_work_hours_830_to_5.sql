-- ============================================================================
-- Gloma CRM -- reset EVERY existing work-hours record to the standard day
--   Mon-Fri 08:30 - 17:00,  Saturday 08:30 - 15:30   (Sri Lanka time, UTC+05:30)
-- ============================================================================
-- Run in Supabase -> SQL Editor.
--
-- What it does
--   * Copies every time_logs row into public.time_logs_archive first (undo below).
--   * For every PAST day that is not a Sunday, sets clock_in = 08:30 and clock_out =
--     17:00 (15:30 on Saturdays), regular_minutes = the full day, overtime_minutes = 0,
--     and clears the auto_closed flag.
--   * Sunday rows (and today / future rows, still-running timers) are NOT touched.
--
-- What is NOT touched: salaries, payslips, attendance marks (leave / absent),
-- expenses, invoices. If a payslip for a month was already calculated from the old
-- hours, use Finance -> Payroll -> Reset month and calculate it again.
--
-- To undo:
--   update public.time_logs t
--   set clock_in = a.clock_in, clock_out = a.clock_out, regular_minutes = a.regular_minutes,
--       overtime_minutes = a.overtime_minutes, is_holiday = a.is_holiday, auto_closed = a.auto_closed
--   from public.time_logs_archive a
--   where a.id = t.id;
-- ============================================================================

create table if not exists public.time_logs_archive (like public.time_logs including defaults);
alter table public.time_logs_archive add column if not exists archived_at timestamptz default now();
alter table public.time_logs_archive enable row level security;

insert into public.time_logs_archive
select t.*, now()
from public.time_logs t
where not exists (select 1 from public.time_logs_archive a where a.id = t.id);

with fixed as (
  select
    id,
    (work_date::timestamp + time '08:30') at time zone 'Asia/Colombo' as new_in,
    (work_date::timestamp +
      case when extract(dow from work_date) = 6 then time '15:30' else time '17:00' end
    ) at time zone 'Asia/Colombo' as new_out,
    case when extract(dow from work_date) = 6 then 420 else 510 end as full_day
  from public.time_logs
  where work_date < (now() at time zone 'Asia/Colombo')::date
    and extract(dow from work_date) <> 0
)
update public.time_logs t
set clock_in = f.new_in,
    clock_out = f.new_out,
    regular_minutes = f.full_day,
    overtime_minutes = 0,
    is_holiday = false,
    auto_closed = false
from fixed f
where t.id = f.id;

select
  (select count(*) from public.time_logs) as time_log_rows,
  (select count(*) from public.time_logs_archive) as archived_rows;
