-- Secure storage for the Gemini API key used by the Content Calendar "AI Sheet Import".
-- The key lives in a table that no browser can read. Only the Vercel function /api/gemini
-- (using the service-role key) reads it. The Developer saves it through set_gemini_key().
-- Run once in the Supabase SQL Editor. Safe to re-run.

create table if not exists public.app_secrets (
  name text primary key,
  value text not null,
  updated_at timestamptz not null default now(),
  updated_by uuid
);

-- RLS on with NO policies = nobody using the anon / logged-in keys can read or write it.
alter table public.app_secrets enable row level security;
revoke all on public.app_secrets from anon, authenticated;

-- Developer only: save (or, with an empty value, remove) the key.
create or replace function public.set_gemini_key(new_key text)
returns void
language plpgsql security definer
set search_path = public
as $$
begin
  if coalesce(public.current_user_role(), '') <> 'Developer' then
    raise exception 'Only the Developer can change the Gemini key.';
  end if;

  if coalesce(trim(new_key), '') = '' then
    delete from public.app_secrets where name = 'gemini_api_key';
  else
    insert into public.app_secrets (name, value, updated_at, updated_by)
    values ('gemini_api_key', trim(new_key), now(), auth.uid())
    on conflict (name) do update
      set value = excluded.value, updated_at = now(), updated_by = auth.uid();
  end if;
end;
$$;

-- Anyone logged in can ask whether a key exists; only the Developer also gets the masked tail.
create or replace function public.gemini_key_status()
returns jsonb
language plpgsql stable security definer
set search_path = public
as $$
declare
  stored text;
begin
  if auth.uid() is null then
    return jsonb_build_object('configured', false);
  end if;

  select value into stored from public.app_secrets where name = 'gemini_api_key';

  return jsonb_build_object(
    'configured', stored is not null,
    'masked', case
      when stored is not null and coalesce(public.current_user_role(), '') = 'Developer'
        then case when length(stored) > 10 then left(stored, 4) || '…' || right(stored, 4) else '••••••••' end
      else null
    end
  );
end;
$$;

revoke all on function public.set_gemini_key(text) from public, anon;
revoke all on function public.gemini_key_status() from public, anon;
grant execute on function public.set_gemini_key(text) to authenticated;
grant execute on function public.gemini_key_status() to authenticated;

-- Move any key saved in the earlier version (system_settings.gemini_api_key) into the secure
-- table, then remove it from the readable table.
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'system_settings' and column_name = 'gemini_api_key'
  ) then
    insert into public.app_secrets (name, value)
    select 'gemini_api_key', gemini_api_key
    from public.system_settings
    where coalesce(trim(gemini_api_key), '') <> ''
    limit 1
    on conflict (name) do nothing;

    alter table public.system_settings drop column gemini_api_key;
  end if;
end;
$$;

notify pgrst, 'reload schema';

-- Should show: app_secrets / true (row level security on, no policies, so the browser cannot read it)
select 'app_secrets' as object, relrowsecurity as rls_enabled
from pg_class where oid = 'public.app_secrets'::regclass;
