-- Work Hours -> "Reset overtime" / "Reset working time" (Developer only, one employee at a time).
-- The reset runs as a database function so it does not depend on the time_logs row-level
-- security policies, which only let employees edit their own rows. Run once in the Supabase
-- SQL Editor. Safe to re-run.

alter table public.time_logs
  add column if not exists ot_enabled boolean not null default false;

create or replace function public.dev_reset_hours(target_user uuid, kind text)
returns integer
language plpgsql security definer
set search_path = public
as $$
declare
  changed integer;
begin
  if not (coalesce(public.current_user_role(), '') = 'Developer' or public.is_developer()) then
    raise exception 'Only the Developer can reset hours.';
  end if;

  if kind = 'overtime' then
    update public.time_logs
    set overtime_minutes = 0, ot_enabled = false
    where user_id = target_user and (coalesce(overtime_minutes, 0) > 0 or ot_enabled);
  elsif kind = 'regular' then
    update public.time_logs
    set regular_minutes = 0
    where user_id = target_user and coalesce(regular_minutes, 0) > 0;
  else
    raise exception 'Unknown reset type: %', kind;
  end if;

  get diagnostics changed = row_count;
  return changed;
end;
$$;

revoke all on function public.dev_reset_hours(uuid, text) from public, anon;
grant execute on function public.dev_reset_hours(uuid, text) to authenticated;

notify pgrst, 'reload schema';
