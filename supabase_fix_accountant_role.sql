-- ============================================================================
-- Gloma CRM -- fix accounts still stored with the old role name 'Accountant'
-- ============================================================================
-- The role was renamed to 'Coordinator & Accountant', but accounts created or
-- edited under the old name kept 'Accountant', so the finance/invoice/payroll
-- permissions did not recognise them. Run once in Supabase -> SQL Editor.
-- Safe to re-run.
-- ============================================================================

update public.profiles
set role = 'Coordinator & Accountant'
where role = 'Accountant';

-- Also accept the old value in the permission helpers, in case a legacy row appears again.
create or replace function public.is_finance_role()
returns boolean
language sql stable security definer
set search_path = public
as $$
  select public.is_developer()
    or coalesce(public.current_user_role(), '') in ('Admin', 'Manager', 'Coordinator & Accountant', 'Accountant');
$$;

create or replace function public.is_payroll_role()
returns boolean
language sql stable security definer
set search_path = public
as $$
  select public.is_developer()
    or coalesce(public.current_user_role(), '') in ('Admin', 'Coordinator & Accountant', 'Accountant');
$$;

select email, full_name, role from public.profiles where role like '%Accountant%' order by email;
