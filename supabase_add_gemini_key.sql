-- Shared Gemini API key for the Content Calendar "AI Sheet Import".
-- The Developer saves it once from the Content Calendar; every user then uses it.
-- Run once in the Supabase SQL Editor. Safe to re-run.

alter table if exists public.system_settings
  add column if not exists gemini_api_key text;

notify pgrst, 'reload schema';
