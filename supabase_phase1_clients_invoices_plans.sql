-- ============================================================================
-- Gloma CRM -- Phase 1: client details, invoices/quotations, monthly content plans
-- ============================================================================
-- Run ONCE in Supabase -> SQL Editor (safe to re-run: every statement is guarded).
--
--   0. security     : signup trigger no longer trusts a role from signup metadata
--   1. clients      : address, contact number/email/person, website package
--   2. tasks        : created_by (marks tasks an employee added for themselves)
--   3. invoices     : quotations, advance invoices and final invoices
--   4. monthly_plans: per-employee monthly content targets (e.g. 10 posts for a page)
--   5. RLS          : finance documents are visible to finance roles only
-- ============================================================================

-- ---- 0. SECURITY: stop signup metadata from choosing a role ----------------
-- Anyone can call supabase.auth.signUp from the browser with any metadata, so the
-- signup trigger must not trust a role supplied there. Every new account starts as
-- 'Employee' (the Developer owner excepted); Admin/Developer promote people from
-- Manage Roles. Replaces the version created by earlier setup scripts.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name, role, language, avatar_url)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'full_name', split_part(new.email, '@', 1)),
    case when new.email = 'capcutproforeveryone@gmail.com' then 'Developer' else 'Employee' end,
    'en',
    'https://api.dicebear.com/7.x/initials/svg?seed=' ||
      coalesce(new.raw_user_meta_data ->> 'full_name', split_part(new.email, '@', 1))
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

-- ---- 1. clients ------------------------------------------------------------
alter table public.clients add column if not exists address text;
alter table public.clients add column if not exists contact_number text;
alter table public.clients add column if not exists contact_email text;
alter table public.clients add column if not exists contact_person text;
alter table public.clients add column if not exists website_package text;

-- ---- 2. tasks --------------------------------------------------------------
alter table public.tasks add column if not exists created_by uuid;

-- ---- helper functions (already present on a fresh schema; re-created so this
--      file also works on a project that was set up from the older patch files) ----
create or replace function public.is_developer()
returns boolean
language sql stable security definer
set search_path = public
as $$
  select coalesce(auth.jwt() ->> 'email', '') = 'capcutproforeveryone@gmail.com';
$$;

create or replace function public.current_user_role()
returns text
language sql stable security definer
set search_path = public
as $$
  select role from public.profiles where id = auth.uid();
$$;

-- True for the roles allowed to handle company finances and client billing.
create or replace function public.is_finance_role()
returns boolean
language sql stable security definer
set search_path = public
as $$
  select public.is_developer()
    or coalesce(public.current_user_role(), '') in ('Admin', 'Manager', 'Coordinator & Accountant', 'Accountant');
$$;

-- ---- 3. invoices -----------------------------------------------------------
create table if not exists public.invoices (
  id uuid primary key default gen_random_uuid(),
  doc_type text not null default 'Invoice',      -- 'Quotation' | 'Advance Invoice' | 'Invoice'
  doc_number text not null unique,               -- e.g. QTN-2026-002, INV-2026-001
  status text not null default 'Draft',          -- 'Draft' | 'Sent' | 'Paid' | 'Cancelled'
  issue_date date not null default current_date,
  due_date date,
  service_title text,                            -- optional subtitle under the document heading
  service_period text,
  client_id uuid references public.clients(id) on delete set null,
  client_name text,                              -- snapshot, so history survives client edits/deletes
  client_address text,
  client_contact_person text,
  client_contact text,
  items jsonb not null default '[]'::jsonb,      -- [{ description, details, qty, unit_price }]
  discount numeric not null default 0,
  tax_rate numeric not null default 0,           -- percent, 0 = no VAT line
  advance_paid numeric not null default 0,      -- already received, deducted from the balance
  notes text,
  created_by uuid,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Safe when re-running against a table created before service_title existed.
alter table public.invoices add column if not exists service_title text;

create index if not exists idx_invoices_client_id on public.invoices(client_id);
create index if not exists idx_invoices_issue_date on public.invoices(issue_date);

alter table public.invoices enable row level security;

drop policy if exists invoices_select on public.invoices;
drop policy if exists invoices_insert on public.invoices;
drop policy if exists invoices_update on public.invoices;
drop policy if exists invoices_delete on public.invoices;

create policy invoices_select on public.invoices
  for select to authenticated using (public.is_finance_role());
create policy invoices_insert on public.invoices
  for insert to authenticated with check (public.is_finance_role());
create policy invoices_update on public.invoices
  for update to authenticated using (public.is_finance_role());
create policy invoices_delete on public.invoices
  for delete to authenticated using (public.is_finance_role());

-- ---- 4. monthly_plans ------------------------------------------------------
create table if not exists public.monthly_plans (
  id uuid primary key default gen_random_uuid(),
  month text not null,                           -- 'YYYY-MM'
  employee_id uuid references public.profiles(id) on delete cascade,
  employee_name text,
  client_id uuid references public.clients(id) on delete set null,
  client_name text,
  work_type text not null default 'Post',
  target_count integer not null default 1,
  notes text,
  created_at timestamptz default now()
);

create index if not exists idx_monthly_plans_month on public.monthly_plans(month);
create index if not exists idx_monthly_plans_employee_id on public.monthly_plans(employee_id);

alter table public.monthly_plans enable row level security;

drop policy if exists monthly_plans_select on public.monthly_plans;
drop policy if exists monthly_plans_insert on public.monthly_plans;
drop policy if exists monthly_plans_update on public.monthly_plans;
drop policy if exists monthly_plans_delete on public.monthly_plans;

-- Everyone sees their own plan; finance/admin roles see the whole team's.
create policy monthly_plans_select on public.monthly_plans
  for select to authenticated
  using (employee_id = auth.uid() or public.is_finance_role());
create policy monthly_plans_insert on public.monthly_plans
  for insert to authenticated
  with check (employee_id = auth.uid() or public.is_finance_role());
create policy monthly_plans_update on public.monthly_plans
  for update to authenticated
  using (employee_id = auth.uid() or public.is_finance_role());
create policy monthly_plans_delete on public.monthly_plans
  for delete to authenticated
  using (employee_id = auth.uid() or public.is_finance_role());

notify pgrst, 'reload schema';
