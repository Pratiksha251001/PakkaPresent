begin;
do $$ begin if exists(select 1 from public.institution_onboarding_attempts where recovery_status='resolved') then raise exception 'Phase 7D Stage 2C rollback refused: resolved recovery records exist'; end if; end $$;
drop function if exists public.platform_resolve_clean_onboarding_recovery(uuid,text);
notify pgrst,'reload schema';
commit;
