-- Guarded rollback for Multi-institution Phase 4E2.
begin;
do $$ begin
 if to_regclass('public.institution_access_requests') is null then raise exception 'Phase 4E2 rollback refused: institution_access_requests is missing'; end if;
 if exists(select 1 from public.institution_access_requests) then raise exception 'Phase 4E2 rollback refused: access requests exist'; end if;
end $$;
drop table public.institution_access_requests;
notify pgrst,'reload schema';
commit;
