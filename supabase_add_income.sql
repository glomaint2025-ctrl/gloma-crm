-- Company income you record by hand (client payments, retainers, other income), shown next to
-- Expenses in Company Finance and counted in the Statements. Same access as expenses
-- (Developer / Admin / Manager / Coordinator & Accountant). Run once in the Supabase SQL
-- Editor, after supabase_phase2_payroll_finance.sql. Safe to re-run.

create table if not exists public.income_entries (
  id uuid primary key default gen_random_uuid(),
  income_date date not null default current_date,
  category text not null default 'Other',
  client_name text,
  description text,
  amount numeric not null default 0,
  payment_method text,
  receipt_path text,                         -- object path inside the finance-docs bucket
  receipt_name text,
  created_by uuid,
  created_at timestamptz default now()
);

create index if not exists idx_income_entries_date on public.income_entries(income_date);

alter table public.income_entries enable row level security;
drop policy if exists income_entries_all on public.income_entries;
create policy income_entries_all on public.income_entries
  for all to authenticated
  using (public.is_finance_role())
  with check (public.is_finance_role());

notify pgrst, 'reload schema';
