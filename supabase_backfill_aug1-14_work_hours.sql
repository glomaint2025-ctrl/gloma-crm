-- Gloma CRM — Backfill: Devin & Bishwa work hours, Aug 1-14 2026
-- Date: 2026-08-15
--
-- One-off data backfill for the period before the Start/Stop time clock feature
-- existed. Regular/overtime minutes below are computed with the same office-hours
-- logic as the app (src/workHours.js): Mon-Fri closes 17:00, Saturday closes
-- 15:30, Sunday is a holiday (100% overtime). Aug 1, 2026 is a Saturday, so
-- Aug 2 and Aug 9 fall on Sunday.
--
-- Devin: 8:30 AM - 5:00 PM every day, Aug 1-14 (14 rows).
-- Bishwa: same for Aug 1, 5-14 (11 rows), except Aug 2/3/4 use the custom times
-- given: Aug 2 08:30 -> Aug 3 02:30 (overnight, lands on the Aug 2 Sunday so it's
-- fully overtime), Aug 3 08:30-21:00, Aug 4 08:30-18:00.
--
-- Bishwa is targeted by exact email (bishwawijesekara19@gmail.com, SMM & Developer)
-- since matching on the name "Bishwa" alone found 2 profiles.
--
-- PREREQUISITE: run supabase_add_time_logs.sql first (creates the time_logs table).
-- SAFE TO RUN: ONCE ONLY. Running this twice will insert duplicate rows -- there's
-- no de-duplication here since it's a one-time historical backfill, not a schema
-- migration.
--
-- How to run: Supabase Dashboard -> SQL Editor -> New query -> paste this whole
-- file -> Run.

do $$
declare
  devin_id uuid;
  devin_name text;
  bishwa_id uuid;
  bishwa_name text;
  devin_count int;
begin
  select count(*) into devin_count from public.profiles where full_name ilike '%devin%';

  if devin_count > 1 then
    raise exception 'More than one profile matches "Devin" (% found) -- edit this script to target the right person by id instead.', devin_count;
  end if;

  -- Bishwa confirmed as bishwawijesekara19@gmail.com (SMM & Developer) -- target
  -- by exact email since "Bishwa" alone matched 2 profiles.
  select id, full_name into bishwa_id, bishwa_name
  from public.profiles
  where lower(email) = 'bishwawijesekara19@gmail.com';

  if bishwa_id is null then
    raise exception 'No profile found with email bishwawijesekara19@gmail.com -- check the email and retry.';
  end if;

  if devin_count = 1 then
    select id, full_name into devin_id, devin_name from public.profiles where full_name ilike '%devin%';

    insert into public.time_logs (user_id, employee_name, work_date, clock_in, clock_out, regular_minutes, overtime_minutes, is_holiday) values
      (devin_id, devin_name, '2026-08-01', '2026-08-01T08:30:00+05:30', '2026-08-01T17:00:00+05:30', 420, 90, false),
      (devin_id, devin_name, '2026-08-02', '2026-08-02T08:30:00+05:30', '2026-08-02T17:00:00+05:30', 0, 510, true),
      (devin_id, devin_name, '2026-08-03', '2026-08-03T08:30:00+05:30', '2026-08-03T17:00:00+05:30', 510, 0, false),
      (devin_id, devin_name, '2026-08-04', '2026-08-04T08:30:00+05:30', '2026-08-04T17:00:00+05:30', 510, 0, false),
      (devin_id, devin_name, '2026-08-05', '2026-08-05T08:30:00+05:30', '2026-08-05T17:00:00+05:30', 510, 0, false),
      (devin_id, devin_name, '2026-08-06', '2026-08-06T08:30:00+05:30', '2026-08-06T17:00:00+05:30', 510, 0, false),
      (devin_id, devin_name, '2026-08-07', '2026-08-07T08:30:00+05:30', '2026-08-07T17:00:00+05:30', 510, 0, false),
      (devin_id, devin_name, '2026-08-08', '2026-08-08T08:30:00+05:30', '2026-08-08T17:00:00+05:30', 420, 90, false),
      (devin_id, devin_name, '2026-08-09', '2026-08-09T08:30:00+05:30', '2026-08-09T17:00:00+05:30', 0, 510, true),
      (devin_id, devin_name, '2026-08-10', '2026-08-10T08:30:00+05:30', '2026-08-10T17:00:00+05:30', 510, 0, false),
      (devin_id, devin_name, '2026-08-11', '2026-08-11T08:30:00+05:30', '2026-08-11T17:00:00+05:30', 510, 0, false),
      (devin_id, devin_name, '2026-08-12', '2026-08-12T08:30:00+05:30', '2026-08-12T17:00:00+05:30', 510, 0, false),
      (devin_id, devin_name, '2026-08-13', '2026-08-13T08:30:00+05:30', '2026-08-13T17:00:00+05:30', 510, 0, false),
      (devin_id, devin_name, '2026-08-14', '2026-08-14T08:30:00+05:30', '2026-08-14T17:00:00+05:30', 510, 0, false);
  else
    raise notice 'No profile found matching "Devin" -- Devin rows skipped.';
  end if;

  -- Bishwa: standard 8:30-17:00 days (Aug 2/3/4 handled separately below)
  insert into public.time_logs (user_id, employee_name, work_date, clock_in, clock_out, regular_minutes, overtime_minutes, is_holiday) values
    (bishwa_id, bishwa_name, '2026-08-01', '2026-08-01T08:30:00+05:30', '2026-08-01T17:00:00+05:30', 420, 90, false),
    (bishwa_id, bishwa_name, '2026-08-05', '2026-08-05T08:30:00+05:30', '2026-08-05T17:00:00+05:30', 510, 0, false),
    (bishwa_id, bishwa_name, '2026-08-06', '2026-08-06T08:30:00+05:30', '2026-08-06T17:00:00+05:30', 510, 0, false),
    (bishwa_id, bishwa_name, '2026-08-07', '2026-08-07T08:30:00+05:30', '2026-08-07T17:00:00+05:30', 510, 0, false),
    (bishwa_id, bishwa_name, '2026-08-08', '2026-08-08T08:30:00+05:30', '2026-08-08T17:00:00+05:30', 420, 90, false),
    (bishwa_id, bishwa_name, '2026-08-09', '2026-08-09T08:30:00+05:30', '2026-08-09T17:00:00+05:30', 0, 510, true),
    (bishwa_id, bishwa_name, '2026-08-10', '2026-08-10T08:30:00+05:30', '2026-08-10T17:00:00+05:30', 510, 0, false),
    (bishwa_id, bishwa_name, '2026-08-11', '2026-08-11T08:30:00+05:30', '2026-08-11T17:00:00+05:30', 510, 0, false),
    (bishwa_id, bishwa_name, '2026-08-12', '2026-08-12T08:30:00+05:30', '2026-08-12T17:00:00+05:30', 510, 0, false),
    (bishwa_id, bishwa_name, '2026-08-13', '2026-08-13T08:30:00+05:30', '2026-08-13T17:00:00+05:30', 510, 0, false),
    (bishwa_id, bishwa_name, '2026-08-14', '2026-08-14T08:30:00+05:30', '2026-08-14T17:00:00+05:30', 510, 0, false);

  -- Bishwa: custom Aug 2/3/4 overrides
  insert into public.time_logs (user_id, employee_name, work_date, clock_in, clock_out, regular_minutes, overtime_minutes, is_holiday) values
    (bishwa_id, bishwa_name, '2026-08-02', '2026-08-02T08:30:00+05:30', '2026-08-03T02:30:00+05:30', 0, 1080, true),
    (bishwa_id, bishwa_name, '2026-08-03', '2026-08-03T08:30:00+05:30', '2026-08-03T21:00:00+05:30', 510, 240, false),
    (bishwa_id, bishwa_name, '2026-08-04', '2026-08-04T08:30:00+05:30', '2026-08-04T18:00:00+05:30', 510, 60, false);
end $$;
