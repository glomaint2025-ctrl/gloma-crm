-- ============================================================================
-- Gloma CRM -- Phase 2: payroll, attendance, leave, expenses + receipt storage
-- ============================================================================
-- Run AFTER supabase_phase1_clients_invoices_plans.sql (it defines
-- public.is_finance_role()). Safe to re-run: every statement is guarded.
--
--   1. employee_salaries : basic salary + fixed allowance per employee
--   2. attendance_marks  : per-day attendance / leave marked by admin or accountant
--   3. payroll_runs      : one saved payslip per employee per month
--   4. expenses          : company expenses with an optional receipt file
--   5. time_logs         : auto-start support + admin/accountant corrections
--   6. storage           : private 'finance-docs' bucket for receipts
-- ============================================================================

-- Salary data is stricter than general finance: Developer, Admin and the
-- Coordinator & Accountant only (Managers are intentionally excluded).
create or replace function public.is_payroll_role()
returns boolean
language sql stable security definer
set search_path = public
as $$
  select public.is_developer()
    or coalesce(public.current_user_role(), '') in ('Admin', 'Coordinator & Accountant');
$$;

-- ---- 1. employee_salaries --------------------------------------------------
create table if not exists public.employee_salaries (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null unique references public.profiles(id) on delete cascade,
  basic_salary numeric not null default 0,
  fixed_allowance numeric not null default 0,
  notes text,
  updated_at timestamptz default now()
);

alter table public.employee_salaries enable row level security;
drop policy if exists employee_salaries_all on public.employee_salaries;
create policy employee_salaries_all on public.employee_salaries
  for all to authenticated
  using (public.is_payroll_role())
  with check (public.is_payroll_role());

-- ---- 2. attendance_marks ---------------------------------------------------
-- A mark overrides what the time clock says for that day. Days with no mark are
-- "Present" when the employee has a time log, otherwise shown as unmarked.
create table if not exists public.attendance_marks (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references public.profiles(id) on delete cascade,
  work_date date not null,
  status text not null,        -- Present | Absent | Annual Leave | Casual Leave | Sick Leave | No Pay Leave | Half Day
  notes text,
  marked_by uuid,
  created_at timestamptz default now(),
  unique (employee_id, work_date)
);

create index if not exists idx_attendance_marks_date on public.attendance_marks(work_date);

alter table public.attendance_marks enable row level security;
drop policy if exists attendance_marks_select on public.attendance_marks;
drop policy if exists attendance_marks_write on public.attendance_marks;
-- Employees can read their own marks (the time clock needs this to skip leave days).
create policy attendance_marks_select on public.attendance_marks
  for select to authenticated
  using (employee_id = auth.uid() or public.is_payroll_role());
create policy attendance_marks_write on public.attendance_marks
  for all to authenticated
  using (public.is_payroll_role())
  with check (public.is_payroll_role());

-- ---- 3. payroll_runs -------------------------------------------------------
create table if not exists public.payroll_runs (
  id uuid primary key default gen_random_uuid(),
  month text not null,                      -- 'YYYY-MM'
  employee_id uuid not null references public.profiles(id) on delete cascade,
  employee_name text,
  basic_salary numeric not null default 0,
  fixed_allowance numeric not null default 0,
  ot_hours numeric not null default 0,
  ot_amount numeric not null default 0,
  no_pay_days numeric not null default 0,
  no_pay_deduction numeric not null default 0,
  additions jsonb not null default '[]'::jsonb,     -- [{ label, amount }] manual bonuses etc.
  deductions jsonb not null default '[]'::jsonb,    -- [{ label, amount }] manual EPF, advances etc.
  gross_pay numeric not null default 0,
  total_deductions numeric not null default 0,
  net_pay numeric not null default 0,
  status text not null default 'Draft',     -- Draft | Finalized | Paid
  paid_date date,
  notes text,
  created_by uuid,
  updated_at timestamptz default now(),
  unique (month, employee_id)
);

create index if not exists idx_payroll_runs_month on public.payroll_runs(month);

alter table public.payroll_runs enable row level security;
drop policy if exists payroll_runs_select on public.payroll_runs;
drop policy if exists payroll_runs_write on public.payroll_runs;
-- Staff can read their own payslip once it has been finalized.
create policy payroll_runs_select on public.payroll_runs
  for select to authenticated
  using (
    public.is_payroll_role()
    or (employee_id = auth.uid() and status in ('Finalized', 'Paid'))
  );
create policy payroll_runs_write on public.payroll_runs
  for all to authenticated
  using (public.is_payroll_role())
  with check (public.is_payroll_role());

-- ---- 4. expenses -----------------------------------------------------------
create table if not exists public.expenses (
  id uuid primary key default gen_random_uuid(),
  expense_date date not null default current_date,
  category text not null default 'General',
  vendor text,
  description text,
  amount numeric not null default 0,
  payment_method text,
  receipt_path text,                         -- object path inside the finance-docs bucket
  receipt_name text,
  created_by uuid,
  created_at timestamptz default now()
);

create index if not exists idx_expenses_date on public.expenses(expense_date);

alter table public.expenses enable row level security;
drop policy if exists expenses_all on public.expenses;
create policy expenses_all on public.expenses
  for all to authenticated
  using (public.is_finance_role())
  with check (public.is_finance_role());

-- ---- 5. time_logs ----------------------------------------------------------
-- 'source' tells automatic 08:30 starts apart from manual Start button clicks;
-- 'auto_closed' marks sessions the app closed because the employee forgot to Stop.
alter table public.time_logs add column if not exists source text default 'manual';
alter table public.time_logs add column if not exists auto_closed boolean default false;

-- At most one automatic start per employee per day (guards against two open tabs).
create unique index if not exists uq_time_logs_auto_per_day
  on public.time_logs(user_id, work_date) where source = 'auto';

-- Finance roles read everyone's logs; only payroll roles (Developer/Admin/Accountant) correct them.
drop policy if exists time_logs_select on public.time_logs;
drop policy if exists time_logs_update on public.time_logs;
drop policy if exists time_logs_insert on public.time_logs;
drop policy if exists time_logs_delete on public.time_logs;

create policy time_logs_select on public.time_logs
  for select to authenticated
  using (auth.uid() = user_id or public.is_finance_role());
create policy time_logs_insert on public.time_logs
  for insert to authenticated
  with check (auth.uid() = user_id or public.is_payroll_role());
create policy time_logs_update on public.time_logs
  for update to authenticated
  using (auth.uid() = user_id or public.is_payroll_role());
create policy time_logs_delete on public.time_logs
  for delete to authenticated
  using (public.is_payroll_role());

-- ---- 6. receipt storage ----------------------------------------------------
insert into storage.buckets (id, name, public)
values ('finance-docs', 'finance-docs', false)
on conflict (id) do nothing;

drop policy if exists finance_docs_select on storage.objects;
drop policy if exists finance_docs_insert on storage.objects;
drop policy if exists finance_docs_update on storage.objects;
drop policy if exists finance_docs_delete on storage.objects;

create policy finance_docs_select on storage.objects
  for select to authenticated
  using (bucket_id = 'finance-docs' and public.is_finance_role());
create policy finance_docs_insert on storage.objects
  for insert to authenticated
  with check (bucket_id = 'finance-docs' and public.is_finance_role());
create policy finance_docs_update on storage.objects
  for update to authenticated
  using (bucket_id = 'finance-docs' and public.is_finance_role());
create policy finance_docs_delete on storage.objects
  for delete to authenticated
  using (bucket_id = 'finance-docs' and public.is_finance_role());

notify pgrst, 'reload schema';
