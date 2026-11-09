-- Removes ALL overtime that is currently recorded, and re-totals the payslips that had it.
-- Run once in the Supabase SQL Editor (it runs as the database owner, so row-level security
-- does not get in the way). Overtime is no longer calculated by payroll: from now on HR adds
-- it by hand as an "Addition" on a payslip when it is owed.
--
-- What it changes:
--   1. time_logs       every row: overtime_minutes -> 0, ot_enabled -> false (days and clock times stay)
--   2. payroll_runs    every payslip with overtime (Draft, Finalized and Paid): ot_hours / ot_amount -> 0,
--                      APIT re-worked without the overtime, gross_pay / total_deductions / net_pay re-totalled
-- Payslips without overtime are not touched. Takes a backup copy of what it changes first.

-- ---- backup (safe to re-run; keeps the first copy) ----------------------------------
create table if not exists public.backup_overtime_time_logs as
  select * from public.time_logs where coalesce(overtime_minutes, 0) > 0 or ot_enabled;

create table if not exists public.backup_overtime_payroll_runs as
  select * from public.payroll_runs where coalesce(ot_hours, 0) > 0 or coalesce(ot_amount, 0) > 0;

-- The backups hold payroll data: lock them (RLS on, no policies) so the API cannot read them.
alter table public.backup_overtime_time_logs enable row level security;
alter table public.backup_overtime_payroll_runs enable row level security;

-- ---- 1. time clock -------------------------------------------------------------------
update public.time_logs
set overtime_minutes = 0, ot_enabled = false
where coalesce(overtime_minutes, 0) > 0 or ot_enabled;

-- ---- 2. payslips ---------------------------------------------------------------------
with src as (
  select
    id,
    coalesce(basic_salary, 0) as basic,
    coalesce(fixed_allowance, 0) as allowances,
    coalesce(no_pay_deduction, 0) as no_pay,
    coalesce(epf_employee, 0) as epf,
    coalesce(loan_deduction, 0) as loan,
    coalesce(apit, 0) as old_apit,
    coalesce((select sum(nullif(a->>'amount', '')::numeric)
              from jsonb_array_elements(coalesce(additions, '[]'::jsonb)) a), 0) as add_total,
    coalesce((select sum(nullif(d->>'amount', '')::numeric)
              from jsonb_array_elements(coalesce(deductions, '[]'::jsonb)) d), 0) as ded_total
  from public.payroll_runs
  where coalesce(ot_hours, 0) > 0 or coalesce(ot_amount, 0) > 0
),
taxed as (
  select *,
    greatest(0, basic - no_pay + allowances) as taxable
  from src
),
calc as (
  select *,
    case
      when old_apit <= 0 then 0
      -- IRD monthly APIT bands, same as calcApit() in src/payrollUtils.js
      when taxable <= 150000    then 0
      when taxable <= 233333.33 then round(greatest(0, taxable * 0.06 - 9000), 2)
      when taxable <= 275000    then round(greatest(0, taxable * 0.18 - 37000), 2)
      when taxable <= 316666.67 then round(greatest(0, taxable * 0.24 - 53500), 2)
      when taxable <= 358333.33 then round(greatest(0, taxable * 0.30 - 72500), 2)
      else                           round(greatest(0, taxable * 0.36 - 94000), 2)
    end as new_apit
  from taxed
)
update public.payroll_runs r
set ot_hours = 0,
    ot_amount = 0,
    apit = c.new_apit,
    gross_pay = round(c.basic + c.allowances + c.add_total, 2),
    total_deductions = round(c.no_pay + c.epf + c.new_apit + c.loan + c.ded_total, 2),
    net_pay = round((c.basic + c.allowances + c.add_total) - (c.no_pay + c.epf + c.new_apit + c.loan + c.ded_total), 2),
    updated_at = now()
from calc c
where r.id = c.id;

notify pgrst, 'reload schema';

-- ---- check: all three should be 0 --------------------------------------------------
select
  (select count(*) from public.time_logs where coalesce(overtime_minutes, 0) > 0 or ot_enabled) as time_logs_with_ot,
  (select count(*) from public.payroll_runs where coalesce(ot_hours, 0) > 0 or coalesce(ot_amount, 0) > 0) as payslips_with_ot,
  (select count(*) from public.backup_overtime_payroll_runs) as payslips_changed;
