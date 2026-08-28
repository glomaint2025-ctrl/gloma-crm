-- Gloma CRM — Fix: "new row violates row-level security policy for table tasks"
-- Date: 2026-08-28
--
-- Cause: these tables have Row-Level Security enabled in Supabase, but no
-- policy was ever added permitting inserts/updates/deletes -- RLS defaults to
-- deny-everything until a policy explicitly allows it. This was previously
-- invisible because the app swallowed the error (see the "silent task-save
-- failures" fix); now it surfaces as a real error, which is how this was caught.
--
-- Fix: any authenticated (logged-in) user can read/write these tables. The app
-- already enforces who's *allowed* to do what at the UI layer (role checks in
-- TaskTracker.jsx, ManageRoles.jsx, etc.) -- same trust model already used for
-- every other table in this project (profiles, clients, etc. have no per-role
-- RLS beyond what the client UI restricts). This does NOT touch `profiles` or
-- `time_logs`, which already have their own deliberate, more specific policies
-- from earlier migrations.
--
-- How to run: Supabase Dashboard -> SQL Editor -> New query -> paste this whole
-- file -> Run. Safe to run multiple times.

do $$
declare
  tbl text;
begin
  foreach tbl in array array['tasks', 'clients', 'daily_updates', 'delivered_work', 'notifications', 'user_notes']
  loop
    execute format('alter table if exists public.%I enable row level security;', tbl);

    execute format('drop policy if exists %I_select on public.%I;', tbl, tbl);
    execute format(
      'create policy %I_select on public.%I for select using (auth.uid() is not null);',
      tbl, tbl
    );

    execute format('drop policy if exists %I_insert on public.%I;', tbl, tbl);
    execute format(
      'create policy %I_insert on public.%I for insert with check (auth.uid() is not null);',
      tbl, tbl
    );

    execute format('drop policy if exists %I_update on public.%I;', tbl, tbl);
    execute format(
      'create policy %I_update on public.%I for update using (auth.uid() is not null);',
      tbl, tbl
    );

    execute format('drop policy if exists %I_delete on public.%I;', tbl, tbl);
    execute format(
      'create policy %I_delete on public.%I for delete using (auth.uid() is not null);',
      tbl, tbl
    );
  end loop;
end $$;

notify pgrst, 'reload schema';
