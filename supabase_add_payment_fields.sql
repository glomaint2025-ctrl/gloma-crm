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
