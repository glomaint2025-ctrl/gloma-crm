-- Gloma CRM — Add: employee time clock (Start/Stop work hours + overtime)
-- Date: 2026-08-11
--
-- Office hours: Mon-Fri 08:30-17:00, Saturday 08:30-15:30, Sunday off.
-- Anything worked past the day's closing time (or on a Sunday/holiday) is
-- computed client-side (src/workHours.js) as overtime when the employee clocks
-- out, and stored on the row so history/reporting don't need to recompute it.
--
-- How to run: Supabase Dashboard -> SQL Editor -> New query -> paste this
-- whole file -> Run. Safe to run multiple times.

create table if not exists public.time_logs (
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

create index if not exists idx_time_logs_user_id on public.time_logs(user_id);
create index if not exists idx_time_logs_work_date on public.time_logs(work_date);

alter table public.time_logs enable row level security;

-- Everyone can see their own logs; Admin/Developer/Manager can see everyone's
-- (matching the same visibility rule already used for Final Deliveries history).
drop policy if exists time_logs_select on public.time_logs;
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

-- Anyone can clock themselves in/out; nobody clocks in/out on someone else's behalf.
drop policy if exists time_logs_insert on public.time_logs;
create policy time_logs_insert on public.time_logs
  for insert
  with check (auth.uid() = user_id);

drop policy if exists time_logs_update on public.time_logs;
create policy time_logs_update on public.time_logs
  for update
  using (auth.uid() = user_id);

notify pgrst, 'reload schema';
