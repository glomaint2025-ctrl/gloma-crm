-- ============================================================================
-- Gloma CRM -- Phase 3: HR employee registry + advanced payroll
-- ============================================================================
-- Run AFTER phase 1 and phase 2 (uses public.is_payroll_role()). Safe to re-run.
--
--   1. employees           : HR registry; an employee does NOT need a login account
--   2. payroll tables      : salary / attendance / payslips now point at employees
--   3. salary structure    : multiple allowances + EPF / ETF / APIT switches
--   4. payroll_settings    : statutory rates, overtime rules, leave entitlements
--   5. employee_loans      : salary advances and loans, repaid through payroll
--   6. employee_documents  : contracts, NIC copies etc. (stored in finance-docs)
--   7. auto-link           : creating a login with the employee's email links it
-- Existing salaries, payslips and attendance marks are kept: every current profile
-- becomes an employee that reuses the same id.
-- ============================================================================

-- ---- 1. employees ----------------------------------------------------------
create table if not exists public.employees (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid unique references public.profiles(id) on delete set null,
  full_name text not null,
  nic text,
  date_of_birth date,
  phone text,
  email text,
  address text,
  emergency_contact_name text,
  emergency_contact_phone text,
  designation text,
  department text,
  employment_type text not null default 'Permanent',   -- Permanent | Probation | Contract | Part-time | Intern
  join_date date,
  probation_end_date date,
  contract_end_date date,
  status text not null default 'Active',               -- Active | Resigned | Terminated
  end_date date,
  end_reason text,
  bank_name text,
  bank_branch text,
  bank_account_no text,
  bank_account_name text,
  epf_no text,
  notes text,
  created_at timestamptz default now()
);

create index if not exists idx_employees_status on public.employees(status);

-- The employee record that belongs to the logged-in account, if any.
create or replace function public.my_employee_id()
returns uuid
language sql stable security definer
set search_path = public
as $$
  select id from public.employees where profile_id = auth.uid() limit 1;
$$;

alter table public.employees enable row level security;
drop policy if exists employees_select on public.employees;
drop policy if exists employees_write on public.employees;
create policy employees_select on public.employees
  for select to authenticated
  using (public.is_payroll_role() or profile_id = auth.uid());
create policy employees_write on public.employees
  for all to authenticated
  using (public.is_payroll_role())
  with check (public.is_payroll_role());

-- ---- 2. point the payroll tables at employees ------------------------------
-- Every profile that already has payroll data (and every non-Developer profile)
-- becomes an employee with the SAME id, so no existing row needs to change.
insert into public.employees (id, profile_id, full_name, email, designation, join_date, status)
select p.id, p.id, coalesce(nullif(p.full_name, ''), split_part(p.email, '@', 1)), p.email, p.role,
       coalesce(p.created_at::date, current_date), 'Active'
from public.profiles p
where coalesce(p.role, '') <> 'Developer'
   or p.id in (select employee_id from public.employee_salaries)
   or p.id in (select employee_id from public.attendance_marks)
   or p.id in (select employee_id from public.payroll_runs)
on conflict (id) do nothing;

do $$
declare
  r record;
begin
  for r in
    select c.conname, c.conrelid::regclass as tbl
    from pg_constraint c
    where c.contype = 'f'
      and c.confrelid = 'public.profiles'::regclass
      and c.conrelid in (
        'public.employee_salaries'::regclass,
        'public.attendance_marks'::regclass,
        'public.payroll_runs'::regclass
      )
  loop
    execute format('alter table %s drop constraint %I', r.tbl, r.conname);
  end loop;
end $$;

alter table public.employee_salaries drop constraint if exists employee_salaries_employee_fk;
alter table public.employee_salaries
  add constraint employee_salaries_employee_fk foreign key (employee_id) references public.employees(id) on delete cascade;
alter table public.attendance_marks drop constraint if exists attendance_marks_employee_fk;
alter table public.attendance_marks
  add constraint attendance_marks_employee_fk foreign key (employee_id) references public.employees(id) on delete cascade;
alter table public.payroll_runs drop constraint if exists payroll_runs_employee_fk;
alter table public.payroll_runs
  add constraint payroll_runs_employee_fk foreign key (employee_id) references public.employees(id) on delete cascade;

-- Staff read their own marks / finalized payslips through their employee record.
drop policy if exists attendance_marks_select on public.attendance_marks;
create policy attendance_marks_select on public.attendance_marks
  for select to authenticated
  using (employee_id = public.my_employee_id() or public.is_payroll_role());

drop policy if exists payroll_runs_select on public.payroll_runs;
create policy payroll_runs_select on public.payroll_runs
  for select to authenticated
  using (
    public.is_payroll_role()
    or (employee_id = public.my_employee_id() and status in ('Finalized', 'Paid'))
  );

-- ---- 3. salary structure ---------------------------------------------------
alter table public.employee_salaries add column if not exists allowances jsonb not null default '[]'::jsonb;  -- [{ label, amount, epf }]
alter table public.employee_salaries add column if not exists epf_enabled boolean not null default false;
alter table public.employee_salaries add column if not exists etf_enabled boolean not null default false;
alter table public.employee_salaries add column if not exists apit_enabled boolean not null default false;

-- Carry the old single "fixed allowance" over as the first allowance line.
update public.employee_salaries
set allowances = jsonb_build_array(jsonb_build_object(
      'label', case when coalesce(notes, '') ilike 'Incentive%' then 'Incentive' else 'Allowance' end,
      'amount', fixed_allowance,
      'epf', false))
where allowances = '[]'::jsonb and coalesce(fixed_allowance, 0) > 0;

alter table public.payroll_runs add column if not exists allowances jsonb not null default '[]'::jsonb;
alter table public.payroll_runs add column if not exists epf_base numeric not null default 0;
alter table public.payroll_runs add column if not exists epf_employee numeric not null default 0;
alter table public.payroll_runs add column if not exists epf_employer numeric not null default 0;
alter table public.payroll_runs add column if not exists etf_employer numeric not null default 0;
alter table public.payroll_runs add column if not exists apit numeric not null default 0;
alter table public.payroll_runs add column if not exists loan_deduction numeric not null default 0;
alter table public.payroll_runs add column if not exists loan_details jsonb not null default '[]'::jsonb;

-- ---- 4. payroll_settings (one row) -----------------------------------------
create table if not exists public.payroll_settings (
  id uuid primary key default gen_random_uuid(),
  epf_employee_rate numeric not null default 8,
  epf_employer_rate numeric not null default 12,
  etf_rate numeric not null default 3,
  ot_multiplier numeric not null default 1.5,
  ot_hourly_divisor numeric not null default 240,
  no_pay_divisor numeric not null default 30,
  annual_leave_days numeric not null default 14,
  casual_leave_days numeric not null default 7,
  sick_leave_days numeric not null default 7,
  updated_at timestamptz default now()
);

alter table public.payroll_settings enable row level security;
drop policy if exists payroll_settings_all on public.payroll_settings;
create policy payroll_settings_all on public.payroll_settings
  for all to authenticated
  using (public.is_payroll_role())
  with check (public.is_payroll_role());

insert into public.payroll_settings (epf_employee_rate)
select 8 where not exists (select 1 from public.payroll_settings);

-- ---- 5. loans and salary advances ------------------------------------------
create table if not exists public.employee_loans (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references public.employees(id) on delete cascade,
  loan_type text not null default 'Salary Advance',   -- Salary Advance | Loan
  principal numeric not null,
  installment numeric not null,                       -- deducted from each payslip until repaid
  start_month text not null,                          -- 'YYYY-MM' of the first deduction
  issued_date date not null default current_date,
  reason text,
  status text not null default 'Active',              -- Active | Cancelled
  created_by uuid,
  created_at timestamptz default now()
);

-- One row per payslip deduction. They disappear with their payslip, and only
-- Finalized / Paid payslips count towards the repaid amount.
create table if not exists public.loan_repayments (
  id uuid primary key default gen_random_uuid(),
  loan_id uuid not null references public.employee_loans(id) on delete cascade,
  run_id uuid not null references public.payroll_runs(id) on delete cascade,
  month text not null,
  amount numeric not null,
  created_at timestamptz default now()
);

create index if not exists idx_employee_loans_employee on public.employee_loans(employee_id);
create index if not exists idx_loan_repayments_loan on public.loan_repayments(loan_id);
create index if not exists idx_loan_repayments_run on public.loan_repayments(run_id);

alter table public.employee_loans enable row level security;
alter table public.loan_repayments enable row level security;
drop policy if exists employee_loans_all on public.employee_loans;
drop policy if exists loan_repayments_all on public.loan_repayments;
create policy employee_loans_all on public.employee_loans
  for all to authenticated using (public.is_payroll_role()) with check (public.is_payroll_role());
create policy loan_repayments_all on public.loan_repayments
  for all to authenticated using (public.is_payroll_role()) with check (public.is_payroll_role());

-- ---- 6. employee documents -------------------------------------------------
create table if not exists public.employee_documents (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references public.employees(id) on delete cascade,
  doc_type text not null default 'Other',     -- Contract | NIC | Certificate | Resume | Other
  title text,
  file_path text not null,                    -- object path inside the finance-docs bucket
  file_name text,
  uploaded_by uuid,
  created_at timestamptz default now()
);

create index if not exists idx_employee_documents_employee on public.employee_documents(employee_id);

alter table public.employee_documents enable row level security;
drop policy if exists employee_documents_all on public.employee_documents;
create policy employee_documents_all on public.employee_documents
  for all to authenticated using (public.is_payroll_role()) with check (public.is_payroll_role());

-- ---- 7. auto-link a new login to the employee with the same email ----------
create or replace function public.link_employee_to_new_profile()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.employees
  set profile_id = new.id
  where id = (
    select e.id from public.employees e
    where e.profile_id is null
      and e.email is not null
      and lower(e.email) = lower(new.email)
    order by e.created_at
    limit 1
  );
  return new;
end;
$$;

drop trigger if exists trg_link_employee_profile on public.profiles;
create trigger trg_link_employee_profile
  after insert on public.profiles
  for each row execute function public.link_employee_to_new_profile();

-- ---- 8. starter employees without a login (skipped when the name exists) ---
insert into public.employees (full_name, designation, join_date, status)
select v.name, 'Staff', current_date, 'Active'
from (values ('Osada'), ('Prarthana')) as v(name)
where not exists (
  select 1 from public.employees e where lower(e.full_name) like lower(v.name) || '%'
);

insert into public.employee_salaries (employee_id, basic_salary, fixed_allowance, allowances, notes)
select e.id, 30000, 5000, '[{"label":"Incentive","amount":5000,"epf":false}]'::jsonb, 'Starting salary'
from public.employees e
where (lower(e.full_name) like 'osada%' or lower(e.full_name) like 'prarthana%')
  and not exists (select 1 from public.employee_salaries s where s.employee_id = e.id);

notify pgrst, 'reload schema';
