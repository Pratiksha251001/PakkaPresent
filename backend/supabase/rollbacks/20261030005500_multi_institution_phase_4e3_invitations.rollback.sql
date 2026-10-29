-- Guarded rollback for Multi-institution Phase 4E3.
begin;
do $$ begin
 if to_regclass('public.institution_onboarding_invitations') is null then raise exception 'Phase 4E3 rollback refused: invitation table is missing'; end if;
 if exists(select 1 from public.institution_onboarding_invitations) then raise exception 'Phase 4E3 rollback refused: invitations exist'; end if;
 if exists(select 1 from public.institution_access_requests where status in ('approved','onboarding','onboarded')) then raise exception 'Phase 4E3 rollback refused: approved or onboarding requests exist'; end if;
end $$;
drop function public.approve_institution_access_request(uuid,text,text,timestamptz);
drop table public.institution_onboarding_invitations;
notify pgrst,'reload schema';
commit;
