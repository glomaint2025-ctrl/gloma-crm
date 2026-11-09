-- Employee ID: typed in by hand by the accountant (HR & Payroll -> Employees) and printed on the
-- payslip. It is stored once and never regenerated; it only changes when someone edits it.
-- Run once in the Supabase SQL Editor. Safe to re-run.

alter table public.employees
  add column if not exists employee_code text;

-- No two employees can share an ID (ignoring upper/lower case). Empty IDs are fine.
create unique index if not exists employees_employee_code_unique
  on public.employees (lower(employee_code))
  where employee_code is not null;

notify pgrst, 'reload schema';

-- Should list one row named employee_code.
select table_schema, table_name, column_name
from information_schema.columns
where table_name = 'employees' and column_name = 'employee_code';
