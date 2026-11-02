begin;
do $$
begin
  if to_regclass('public.institution_lifecycle_events') is not null
     and exists(select 1 from public.institution_lifecycle_events) then
    raise exception 'Phase 7D Stage 2A rollback refused: lifecycle audit events exist';
  end if;
end $$;
drop function if exists public.platform_transition_institution_status(uuid,text,text);
drop table if exists public.institution_lifecycle_events;
create or replace function public.current_user_institution_id()
returns uuid language sql stable security definer set search_path = public as $$
  select ur.institution_id
  from public.user_roles ur
  where ur.user_id = auth.uid()
    and ur.institution_id is not null
  order by ur.created_at asc
  limit 1
$$;
revoke all on function public.current_user_institution_id() from public, anon;
grant execute on function public.current_user_institution_id() to authenticated;

notify pgrst, 'reload schema';
commit;
