-- ============================================================================
-- Gloma CRM -- one-off: load the starting salaries into employee_salaries
-- ============================================================================
-- Run in Supabase -> SQL Editor AFTER supabase_phase2_payroll_finance.sql, and
-- after every employee has an account (Manage Roles -> Add New Team Member).
--
-- Each name below is matched against the START of profiles.full_name or the
-- start of the email (case-insensitive). The result grid at the bottom shows how
-- many profiles each name matched: 1 = good, 0 = no account found yet,
-- 2+ = ambiguous (check Finance -> Payroll and correct the extra rows).
--
-- The incentive is stored as the "fixed monthly allowance". Overtime is
-- calculated from the BASIC salary only. Safe to re-run: it updates in place.
-- Salaries can also be edited any time in Finance -> Payroll -> salary setup.
-- ============================================================================

with salary_list (name_prefix, basic, incentive) as (
  values
    ('Ravindi',   30000, 0),
    ('Bishwa',    30000, 40000),
    ('Devin',     30000, 40000),
    ('Heshan',    30000, 40000),
    ('Osada',     30000, 5000),
    ('Prarthana', 30000, 5000),
    ('Seneth',    30000, 10000)
),
matched as (
  select p.id, l.name_prefix, l.basic, l.incentive
  from salary_list l
  join public.profiles p
    on lower(coalesce(p.full_name, '')) like lower(l.name_prefix) || '%'
    or lower(coalesce(p.email, '')) like lower(l.name_prefix) || '%'
),
upserted as (
  insert into public.employee_salaries (employee_id, basic_salary, fixed_allowance, notes)
  select distinct on (id) id, basic, incentive, 'Incentive stored as fixed monthly allowance'
  from matched
  order by id
  on conflict (employee_id) do update
    set basic_salary = excluded.basic_salary,
        fixed_allowance = excluded.fixed_allowance,
        notes = excluded.notes,
        updated_at = now()
  returning employee_id
)
select l.name_prefix, l.basic, l.incentive, count(m.id) as matching_profiles
from salary_list l
left join matched m on m.name_prefix = l.name_prefix
group by l.name_prefix, l.basic, l.incentive
order by l.name_prefix;
