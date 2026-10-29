begin;
do $$ begin if exists(select 1 from public.institution_onboarding_invitations where status in ('onboarding','consumed','recovery_required')) then raise exception 'Phase 4E4 rollback refused: invitation onboarding activity exists'; end if; end $$;
drop function public.release_institution_onboarding(uuid,boolean);drop function public.complete_institution_onboarding(uuid,uuid);drop function public.reserve_institution_onboarding(text,text);
alter table public.institution_onboarding_invitations drop constraint institution_onboarding_invitations_status_check;
alter table public.institution_onboarding_invitations add constraint institution_onboarding_invitations_status_check check(status in ('active','consumed','revoked','expired','recovery_required'));
notify pgrst,'reload schema';commit;
