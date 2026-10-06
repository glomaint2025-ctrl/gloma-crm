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
