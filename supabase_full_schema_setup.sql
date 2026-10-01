-- ============================================================================
-- Gloma CRM — FULL SCHEMA REBUILD for a brand-new Supabase project
-- ============================================================================
-- Why this file exists: the original Supabase project was deleted. The base
-- tables (profiles, clients, tasks, etc.) were originally created by hand in
-- the Supabase Table Editor and were NEVER captured as a CREATE TABLE script
-- in this repo — only later ALTER-style patch files
-- (supabase_fix_profiles.sql, supabase_add_time_logs.sql, etc.) exist here.
--
-- This script reconstructs the entire schema from scratch, in its FINAL
-- known-good shape (i.e. with every one of those later patches already
-- folded in), by reading every `supabase.from('...')` call in src/ and
-- matching columns exactly. Run this ONCE against a brand-new, empty
-- Supabase project.
--
-- How to run:
--   1. Create a new project at https://supabase.com/dashboard
--   2. Project -> SQL Editor -> New query -> paste this whole file -> Run
--   3. Authentication -> Providers -> Email -> turn OFF "Confirm email"
--      (otherwise new accounts can't log in without a real SMTP provider —
--      see EMAILJS_SETUP.md / CRM_SUMMARY.md Problem 7)
--   4. Project Settings -> API -> copy the "Project URL" and "anon public" key
--   5. Put them in .env (VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY) locally,
--      and in Vercel -> Project Settings -> Environment Variables, then
--      redeploy
--   6. Sign up in the app with capcutproforeveryone@gmail.com first — the
--      trigger below automatically makes that account 'Developer'. Everyone
--      else's accounts must be recreated too (old auth.users rows are gone
--      with the old project); use Manage Roles -> Add New Team Member.
--
-- Safe to run only on an EMPTY project — it does not use IF NOT EXISTS
-- everywhere the old patch files did, since there is nothing to collide with
-- on a fresh database.
-- ============================================================================

-- ============================================================================
-- 1. TABLES
-- ============================================================================

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  full_name text,
  role text default 'Employee',
  avatar_url text,
  password text,              -- Developer-only plaintext "Security Password" column (legacy design choice, not this migration's call)
  language text default 'en',
  last_seen timestamptz,
  created_at timestamptz default now()
);

create table public.system_settings (
  id uuid primary key default gen_random_uuid(),
  language text default 'en',
  theme text default 'dark',
  font_size text default 'normal',
  primary_color text default '#d4af37'
);

create table public.clients (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  status text default 'Active',
  created_at timestamptz default now()
);

create table public.tasks (
  id text primary key,          -- app-generated codes like 'GLM-260805-001', not a uuid
  date_assigned date,
  client_id uuid references public.clients(id) on delete set null,
  client_project text,
  work_type text,
  title text,
  employee_id uuid references public.profiles(id) on delete set null,
  employee_name text,
  priority text default 'Normal',
  status text default 'Pending Approval',
  progress numeric default 0,
  todays_update text,
  blockers_notes text,
  work_folder_link text,
  final_delivery_link text,
  start_date date,
  due_date date,
  payment_status text,          -- 'Paid' / 'Not Paid', only used for work_type = 'Website'
  payment_amount numeric,       -- LKR amount, only used for work_type = 'Website'
  last_updated timestamptz default now()
);

create table public.daily_updates (
  id uuid primary key default gen_random_uuid(),
  date date,
  employee_id uuid references public.profiles(id) on delete set null,
  employee_name text,
  task_id text references public.tasks(id) on delete set null,
  client_project text,
  work_completed text,
  hours_spent numeric,
  status_at_end text,
  next_step text,
  blockers text,
  evidence_link text,
  created_at timestamptz default now()
);

create table public.delivered_work (
  id uuid primary key default gen_random_uuid(),
  delivery_date date,
  employee_id uuid references public.profiles(id) on delete set null,
  employee_name text,
  task_id text references public.tasks(id) on delete set null,
  client_project text,
  deliverable_name text,
  final_drive_link text,
  platform_channel text,
  client_approval text default 'Awaiting',
  revision_status text default 'No revision requested',
  notes text,
  created_at timestamptz default now()
);

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete cascade,
  message text,
  read boolean default false,
  created_at timestamptz default now()
);

create table public.user_notes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete cascade,
  content text,
  created_at timestamptz default now()
);

create table public.time_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete cascade,
  employee_name text,
  work_date date not null,
  clock_in timestamptz not null,
  clock_out timestamptz,
  regular_minutes integer,
  overtime_minutes integer,
  is_holiday boolean default false,
  created_at timestamptz default now()
);

create index idx_tasks_employee_id on public.tasks(employee_id);
create index idx_tasks_client_id on public.tasks(client_id);
create index idx_daily_updates_employee_id on public.daily_updates(employee_id);
create index idx_delivered_work_employee_id on public.delivered_work(employee_id);
create index idx_notifications_user_id on public.notifications(user_id);
create index idx_user_notes_user_id on public.user_notes(user_id);
create index idx_time_logs_user_id on public.time_logs(user_id);
create index idx_time_logs_work_date on public.time_logs(work_date);

-- ============================================================================
-- 2. AUTH TRIGGER — auto-create a profiles row on every signup
-- ============================================================================

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
    -- Never trust a role supplied in signup metadata (anyone can call signUp
    -- from the browser). Everyone starts as Employee; the app's Manage Roles
    -- screen (Admin/Developer, protected by the RLS policies below) promotes.
    case
      when new.email = 'capcutproforeveryone@gmail.com' then 'Developer'
      else 'Employee'
    end,
    'en',
    'https://api.dicebear.com/7.x/initials/svg?seed=' ||
      coalesce(new.raw_user_meta_data ->> 'full_name', split_part(new.email, '@', 1))
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============================================================================
-- 3. DEVELOPER-ROLE LOCK — only capcutproforeveryone@gmail.com may hold it
-- ============================================================================

create or replace function public.enforce_single_developer()
returns trigger as $$
begin
  if new.role = 'Developer' and lower(new.email) <> 'capcutproforeveryone@gmail.com' then
    raise exception 'The Developer role is reserved for capcutproforeveryone@gmail.com only.';
  end if;
  return new;
end;
$$ language plpgsql;

create trigger trg_enforce_single_developer
before insert or update on public.profiles
for each row execute function public.enforce_single_developer();

-- ============================================================================
-- 4. ROW LEVEL SECURITY
-- ============================================================================

alter table public.profiles enable row level security;
alter table public.system_settings enable row level security;
alter table public.tasks enable row level security;
alter table public.clients enable row level security;
alter table public.daily_updates enable row level security;
alter table public.delivered_work enable row level security;
alter table public.notifications enable row level security;
alter table public.user_notes enable row level security;
alter table public.time_logs enable row level security;

-- ---- profiles ---------------------------------------------------------

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

-- SELECT: everyone sees all profiles except the Developer row;
--         Developer sees everything; you always see your own row.
create policy "gloma_select_profiles" on public.profiles
  for select to authenticated
  using (
    public.is_developer()
    or id = auth.uid()
    or coalesce(role, 'Employee') <> 'Developer'
  );

-- UPDATE: own row always; Developer any row; Admin any non-Developer row.
create policy "gloma_update_profiles" on public.profiles
  for update to authenticated
  using (
    id = auth.uid()
    or public.is_developer()
    or (public.current_user_role() = 'Admin' and coalesce(role, 'Employee') <> 'Developer')
  );

-- INSERT: own row (signup fallback), or Admin/Developer creating members.
create policy "gloma_insert_profiles" on public.profiles
  for insert to authenticated
  with check (
    id = auth.uid()
    or public.is_developer()
    or public.current_user_role() = 'Admin'
  );

-- ---- system_settings ---------------------------------------------------
-- Any logged-in user can read; only Developer changes global visual/lang
-- defaults in practice, but the app itself doesn't gate this at the DB
-- level (same trust model as tasks/clients below).

create policy system_settings_select on public.system_settings
  for select using (auth.uid() is not null);
create policy system_settings_insert on public.system_settings
  for insert with check (auth.uid() is not null);
create policy system_settings_update on public.system_settings
  for update using (auth.uid() is not null);

-- ---- tasks / clients / daily_updates / delivered_work / notifications /
--      user_notes ---------------------------------------------------------
-- The app enforces who's *allowed* to do what at the UI layer (role checks
-- in TaskTracker.jsx, ManageRoles.jsx, etc.) — any authenticated user can
-- read/write these at the DB level, matching the original project's model
-- (see supabase_fix_rls_policies.sql).

do $$
declare
  tbl text;
begin
  foreach tbl in array array['tasks', 'clients', 'daily_updates', 'delivered_work', 'notifications', 'user_notes']
  loop
    execute format(
      'create policy %I_select on public.%I for select using (auth.uid() is not null);',
      tbl, tbl
    );
    execute format(
      'create policy %I_insert on public.%I for insert with check (auth.uid() is not null);',
      tbl, tbl
    );
    execute format(
      'create policy %I_update on public.%I for update using (auth.uid() is not null);',
      tbl, tbl
    );
    execute format(
      'create policy %I_delete on public.%I for delete using (auth.uid() is not null);',
      tbl, tbl
    );
  end loop;
end $$;

-- ---- time_logs ----------------------------------------------------------
-- Everyone can see their own logs; Admin/Developer/Manager can see everyone's.
-- Anyone can clock themselves in/out; nobody clocks in/out on someone else's
-- behalf.

create policy time_logs_select on public.time_logs
  for select
  using (
    auth.uid() = user_id
    or exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
        and p.role in ('Admin', 'Developer', 'Manager')
    )
  );

create policy time_logs_insert on public.time_logs
  for insert
  with check (auth.uid() = user_id);

create policy time_logs_update on public.time_logs
  for update
  using (auth.uid() = user_id);

-- ============================================================================
-- 5. SEED — one default system_settings row (the app expects exactly one)
-- ============================================================================

insert into public.system_settings (language, theme, font_size, primary_color)
values ('en', 'dark', 'normal', '#d4af37');

-- ============================================================================
-- Refresh PostgREST's schema cache so all of the above is visible immediately
-- ============================================================================
notify pgrst, 'reload schema';
