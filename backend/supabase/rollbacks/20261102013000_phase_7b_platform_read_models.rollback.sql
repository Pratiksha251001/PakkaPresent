begin;
do $$ begin
  if to_regprocedure('public.is_current_user_super_admin()') is null then
    raise exception 'Phase 7B rollback refused: Phase 7A authorization foundation is missing';
  end if;
end $$;
drop function if exists public.platform_get_institution(uuid);
drop function if exists public.platform_list_institutions(text,text,integer,integer);
drop function if exists public.platform_dashboard_metrics();
commit;
