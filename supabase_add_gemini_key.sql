-- Shared Gemini API key for the Content Calendar "AI Sheet Import".
-- The Developer saves it once from the Content Calendar; every user then uses it.
-- Run once in the Supabase SQL Editor. Safe to re-run.
-- No "if exists" on the table on purpose: if system_settings is missing you get an error
-- instead of a silent no-op.

alter table public.system_settings
  add column if not exists gemini_api_key text;

notify pgrst, 'reload schema';

-- Should list one row named gemini_api_key. If it is empty, this project is not the one the CRM uses.
select table_schema, table_name, column_name
from information_schema.columns
where table_name = 'system_settings' and column_name = 'gemini_api_key';
