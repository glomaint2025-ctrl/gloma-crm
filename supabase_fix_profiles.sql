-- Gloma CRM — Fix: "Could not find the 'language' column of 'profiles' in the schema cache"
-- Date: 2026-08-08
--
-- Cause: the app (My Account Profile save, Add New Team Member) writes the columns
-- language / avatar_url / password / full_name to public.profiles, but the live
-- Supabase table was created without some of them. PostgREST then rejects the
-- update with a "schema cache" error.
--
-- How to run: Supabase Dashboard -> SQL Editor -> New query -> paste this whole
-- file -> Run. Safe to run multiple times (IF NOT EXISTS guards everywhere).

alter table if exists public.profiles
  add column if not exists language   text default 'en';

alter table if exists public.profiles
  add column if not exists avatar_url text;          -- stores Base64 data URLs (<2MB), so plain text

alter table if exists public.profiles
  add column if not exists password   text;          -- Developer-only "Security Password" column

alter table if exists public.profiles
  add column if not exists full_name  text;

alter table if exists public.profiles
  add column if not exists email      text;

alter table if exists public.profiles
  add column if not exists role       text default 'Employee';

-- The Settings > Developer Preferences save writes these columns to system_settings.
-- Guarded the same way, in case that table is also missing columns.
alter table if exists public.system_settings
  add column if not exists language      text default 'en';

alter table if exists public.system_settings
  add column if not exists theme         text default 'dark';

alter table if exists public.system_settings
  add column if not exists font_size     text default 'normal';

alter table if exists public.system_settings
  add column if not exists primary_color text default '#d4af37';

-- Make PostgREST pick up the new columns immediately (otherwise it can take up
-- to a schema-cache refresh cycle).
notify pgrst, 'reload schema';
