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
