-- ============================================================================
-- Gloma CRM -- ONE-CLICK SETUP / REPAIR  (run this once in the Supabase SQL Editor)
-- ============================================================================
-- Fixes errors like "Could not find the table 'public.income_entries' in the schema cache",
-- "Could not find the function public.set_gemini_key", missing columns (ot_enabled, caption ...).
-- It only ADDS what is missing; it never deletes data. Safe to run again and again.
--
-- IMPORTANT: run it in the SAME Supabase project the live site uses
-- (Supabase -> your project -> SQL Editor). The last result table shows what exists.
-- ============================================================================

-- 0. The base tables must already exist (created by the original setup / phase 1-3 files).
do $$
declare
  missing text;
begin
  select string_agg(t, ', ') into missing
  from unnest(array['profiles','tasks','daily_updates','time_logs','system_settings',
                    'invoices','employees','employee_salaries','attendance_marks','payroll_runs',
                    'payroll_settings','expenses']) as t
  where to_regclass('public.' || t) is null;

  if missing is not null then
    raise exception 'These base tables are missing: %. Run supabase_phase1_clients_invoices_plans.sql, supabase_phase2_payroll_finance.sql and supabase_phase3_hr_payroll.sql first (in that order), then run this file again.', missing;
  end if;

  if to_regprocedure('public.is_developer()') is null or to_regprocedure('public.current_user_role()') is null
     or to_regprocedure('public.my_employee_id()') is null then
    raise exception 'Helper functions are missing (is_developer / current_user_role / my_employee_id). Run supabase_phase1_clients_invoices_plans.sql and supabase_phase3_hr_payroll.sql first, then run this file again.';
  end if;
end;
$$;

-- ===== 1. Permission helpers (finance / payroll roles) =====
alter table public.profiles drop constraint if exists profiles_role_check;

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
    or coalesce(public.current_user_role(), '') in ('Developer', 'Admin', 'Manager', 'Coordinator & Accountant', 'Accountant');
$$;

create or replace function public.is_payroll_role()
returns boolean
language sql stable security definer
set search_path = public
as $$
  select public.is_developer()
    or coalesce(public.current_user_role(), '') in ('Developer', 'Admin', 'Coordinator & Accountant', 'Accountant');
$$;


-- ===== 2. Company income =====
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

-- ===== 3. Letters =====
-- ============================================================================
-- Gloma CRM -- Letters (official letters & letterheads editor)
-- ============================================================================
-- Run once in Supabase -> SQL Editor. Stores the letters written in the Letters
-- editor. Same people who can see Company Finance can use it.
-- Requires public.is_finance_role() from supabase_phase2_payroll_finance.sql.

create table if not exists public.letters (
  id uuid primary key default gen_random_uuid(),
  title text not null default 'Untitled letter',
  html text not null default '',
  use_letterhead boolean not null default true,
  created_by uuid,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists idx_letters_updated on public.letters(updated_at desc);

alter table public.letters enable row level security;
drop policy if exists letters_all on public.letters;
create policy letters_all on public.letters
  for all to authenticated
  using (public.is_finance_role())
  with check (public.is_finance_role());

-- ===== 4. Time clock columns + overtime switch =====
alter table public.time_logs add column if not exists source text default 'manual';
alter table public.time_logs add column if not exists auto_closed boolean default false;
-- Overtime is now switched on by hand (Dashboard clock "Overtime" button, or the OT checkbox
-- when HR / the employee enters times). Run once in the Supabase SQL Editor. Safe to re-run.

alter table public.time_logs
  add column if not exists ot_enabled boolean not null default false;

-- Keep overtime that was already recorded under the old automatic rule, so past payslips
-- and Work Hours history do not change when those logs are edited.
update public.time_logs
set ot_enabled = true
where coalesce(overtime_minutes, 0) > 0 and ot_enabled = false;

notify pgrst, 'reload schema';

-- ===== 5. Developer reset of overtime / working time =====
-- Work Hours -> "Reset overtime" / "Reset working time" (Developer only, one employee at a time).
-- The reset runs as a database function so it does not depend on the time_logs row-level
-- security policies, which only let employees edit their own rows. Run once in the Supabase
-- SQL Editor. Safe to re-run.

alter table public.time_logs
  add column if not exists ot_enabled boolean not null default false;

create or replace function public.dev_reset_hours(target_user uuid, kind text)
returns integer
language plpgsql security definer
set search_path = public
as $$
declare
  changed integer;
begin
  if not (coalesce(public.current_user_role(), '') = 'Developer' or public.is_developer()) then
    raise exception 'Only the Developer can reset hours.';
  end if;

  if kind = 'overtime' then
    update public.time_logs
    set overtime_minutes = 0, ot_enabled = false
    where user_id = target_user and (coalesce(overtime_minutes, 0) > 0 or ot_enabled);
  elsif kind = 'regular' then
    update public.time_logs
    set regular_minutes = 0
    where user_id = target_user and coalesce(regular_minutes, 0) > 0;
  else
    raise exception 'Unknown reset type: %', kind;
  end if;

  get diagnostics changed = row_count;
  return changed;
end;
$$;

revoke all on function public.dev_reset_hours(uuid, text) from public, anon;
grant execute on function public.dev_reset_hours(uuid, text) to authenticated;

notify pgrst, 'reload schema';

-- ===== 6. Content Calendar fields =====
-- Gloma CRM — Add: richer Content Calendar items (platforms, content type, caption, concept, ...)
-- Date: 2026-11-03
--
-- Adds columns to tasks so a calendar item can carry the full content brief:
--   content_type    : Static Post, Reel / Short Video, Cinematic Ad, BTS Series, ... (free text)
--   platforms       : one or more of Facebook, Instagram, TikTok, LinkedIn
--   content_id      : the client's own code, e.g. POST-001 / REEL-004
--   concept         : concept overview
--   caption         : post caption
--   image_wording   : text on the image, or the video script
--   reference_link  : reference / referral link (YouTube, TikTok, ...)
--   admin_reply     : feedback from the admin / manager
--
-- Until this is run the Content Calendar still shows existing tasks, but saving a
-- content item (or the AI Sheet Import) asks you to run this file first.
--
-- How to run: Supabase Dashboard -> SQL Editor -> New query -> paste -> Run.
-- Safe to run multiple times.

alter table public.tasks add column if not exists content_type text;
alter table public.tasks add column if not exists platforms text[] default '{}';
alter table public.tasks add column if not exists content_id text;
alter table public.tasks add column if not exists concept text;
alter table public.tasks add column if not exists caption text;
alter table public.tasks add column if not exists image_wording text;
alter table public.tasks add column if not exists reference_link text;
alter table public.tasks add column if not exists admin_reply text;

notify pgrst, 'reload schema';

-- ===== 7. EOD report types =====
-- Gloma CRM — Add: role-specific EOD reports (Marketing, Developer, SMM & Developer, Accountant)
-- Date: 2026-10-20
--
-- Adds two columns to daily_updates:
--   report_type : general | marketing | developer | smm_developer | accountant
--   report_data : the numbers of the report (messages, calls, orders, ...) as JSON
--
-- Until this is run the EOD tab still works: reports are saved as plain text in
-- "work_completed" and only the numeric summary table / filters are unavailable.
--
-- How to run: Supabase Dashboard -> SQL Editor -> New query -> paste -> Run.
-- Safe to run multiple times.

alter table public.daily_updates add column if not exists report_type text default 'general';
alter table public.daily_updates add column if not exists report_data jsonb;

create index if not exists idx_daily_updates_report_type on public.daily_updates(report_type);

notify pgrst, 'reload schema';

-- ===== 8. Last seen, payment fields =====
-- Gloma CRM — Add: online/last-seen presence tracking (Developer-only feature)
-- Date: 2026-08-08
--
-- Adds a last_seen timestamp to profiles. The app updates each logged-in
-- user's own last_seen every ~60s while the app is open (see App.jsx). The
-- Manage Roles page (Developer only) uses this to show an Online/Offline
-- dot and a "last seen X ago" label per team member.
--
-- How to run: Supabase Dashboard -> SQL Editor -> New query -> paste this
-- whole file -> Run. Safe to run multiple times (IF NOT EXISTS guard).

alter table if exists public.profiles
  add column if not exists last_seen timestamptz;

notify pgrst, 'reload schema';
-- Gloma CRM — Add: client payment tracking for Website tasks
-- Date: 2026-08-15
--
-- Adds payment_status ('Paid' / 'Not Paid') and payment_amount (LKR) to tasks.
-- Only used/shown by the app for work_type = 'Website' tasks. Editable by
-- Developer, Admin, Manager, and Coordinator & Accountant (see
-- src/components/TaskTracker.jsx and the new Company Finance tab,
-- src/components/Finance.jsx).
--
-- How to run: Supabase Dashboard -> SQL Editor -> New query -> paste this whole
-- file -> Run. Safe to run multiple times.

alter table if exists public.tasks
  add column if not exists payment_status text;

alter table if exists public.tasks
  add column if not exists payment_amount numeric;

notify pgrst, 'reload schema';

-- ===== 9. Employees can mark own attendance =====
-- Gloma CRM — Add: employees can mark their own attendance (sidebar "Attendance")
-- Date: 2026-10-20
--
-- Until now only Admin / Developer / Coordinator & Accountant could write to
-- attendance_marks. This lets every employee insert ONE "Present" mark for
-- themselves (today, allowing a day either side for time zones). Changing or
-- deleting marks, and marking leave/absence or other people, stays HR/admin only.
--
-- How to run: Supabase Dashboard -> SQL Editor -> New query -> paste -> Run.
-- Safe to run multiple times.

drop policy if exists attendance_marks_self_insert on public.attendance_marks;
create policy attendance_marks_self_insert on public.attendance_marks
  for insert to authenticated
  with check (
    employee_id = public.my_employee_id()
    and status = 'Present'
    and work_date between current_date - 1 and current_date + 1
  );

notify pgrst, 'reload schema';

-- ===== 10. Gemini key (server-side only) =====
-- Secure storage for the Gemini API key used by the Content Calendar "AI Sheet Import".
-- The key lives in a table that no browser can read. Only the Vercel function /api/gemini
-- (using the service-role key) reads it. The Developer saves it through set_gemini_key().
-- Run once in the Supabase SQL Editor. Safe to re-run.

create table if not exists public.app_secrets (
  name text primary key,
  value text not null,
  updated_at timestamptz not null default now(),
  updated_by uuid
);

-- RLS on with NO policies = nobody using the anon / logged-in keys can read or write it.
alter table public.app_secrets enable row level security;
revoke all on public.app_secrets from anon, authenticated;

-- Developer only: save (or, with an empty value, remove) the key.
create or replace function public.set_gemini_key(new_key text)
returns void
language plpgsql security definer
set search_path = public
as $$
begin
  if coalesce(public.current_user_role(), '') <> 'Developer' then
    raise exception 'Only the Developer can change the Gemini key.';
  end if;

  if coalesce(trim(new_key), '') = '' then
    delete from public.app_secrets where name = 'gemini_api_key';
  else
    insert into public.app_secrets (name, value, updated_at, updated_by)
    values ('gemini_api_key', trim(new_key), now(), auth.uid())
    on conflict (name) do update
      set value = excluded.value, updated_at = now(), updated_by = auth.uid();
  end if;
end;
$$;

-- Anyone logged in can ask whether a key exists; only the Developer also gets the masked tail.
create or replace function public.gemini_key_status()
returns jsonb
language plpgsql stable security definer
set search_path = public
as $$
declare
  stored text;
begin
  if auth.uid() is null then
    return jsonb_build_object('configured', false);
  end if;

  select value into stored from public.app_secrets where name = 'gemini_api_key';

  return jsonb_build_object(
    'configured', stored is not null,
    'masked', case
      when stored is not null and coalesce(public.current_user_role(), '') = 'Developer'
        then case when length(stored) > 10 then left(stored, 4) || '…' || right(stored, 4) else '••••••••' end
      else null
    end
  );
end;
$$;

revoke all on function public.set_gemini_key(text) from public, anon;
revoke all on function public.gemini_key_status() from public, anon;
grant execute on function public.set_gemini_key(text) to authenticated;
grant execute on function public.gemini_key_status() to authenticated;

-- Move any key saved in the earlier version (system_settings.gemini_api_key) into the secure
-- table, then remove it from the readable table.
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'system_settings' and column_name = 'gemini_api_key'
  ) then
    insert into public.app_secrets (name, value)
    select 'gemini_api_key', gemini_api_key
    from public.system_settings
    where coalesce(trim(gemini_api_key), '') <> ''
    limit 1
    on conflict (name) do nothing;

    alter table public.system_settings drop column gemini_api_key;
  end if;
end;
$$;

notify pgrst, 'reload schema';


-- ===== 11. Receipts bucket =====
insert into storage.buckets (id, name, public)
values ('finance-docs', 'finance-docs', false)
on conflict (id) do nothing;

notify pgrst, 'reload schema';

-- ===== Result: every row should say "OK" =====
select t.name as table_name, case when to_regclass('public.' || t.name) is not null then 'OK' else 'MISSING' end as status
from unnest(array['income_entries','expenses','letters','app_secrets','time_logs','employees',
                  'employee_salaries','attendance_marks','payroll_runs','payroll_settings']) as t(name)
union all
select 'column time_logs.ot_enabled', case when exists (select 1 from information_schema.columns where table_schema='public' and table_name='time_logs' and column_name='ot_enabled') then 'OK' else 'MISSING' end
union all
select 'column tasks.caption', case when exists (select 1 from information_schema.columns where table_schema='public' and table_name='tasks' and column_name='caption') then 'OK' else 'MISSING' end
union all
select 'function dev_reset_hours', case when to_regprocedure('public.dev_reset_hours(uuid,text)') is not null then 'OK' else 'MISSING' end
union all
select 'function set_gemini_key', case when to_regprocedure('public.set_gemini_key(text)') is not null then 'OK' else 'MISSING' end;
