begin;
do $$
begin
  if exists (
    select 1 from public.institution_onboarding_attempts
    where access_request_id is not null or invitation_id is not null
      or recovery_status is not null or recovery_notes is not null
      or recovery_resolved_at is not null or recovery_resolved_by is not null
  ) then
    raise exception 'Phase 7D Stage 2B rollback refused: recovery linkage or resolution data exists';
  end if;
end $$;
drop function if exists public.platform_get_onboarding_recovery(uuid);
drop function if exists public.platform_list_onboarding_recovery(integer,integer);
drop index if exists public.institution_onboarding_attempts_recovery_status_idx;
drop index if exists public.institution_onboarding_attempts_access_request_id_idx;
drop index if exists public.institution_onboarding_attempts_invitation_id_key;
alter table public.institution_onboarding_attempts
  drop constraint if exists institution_onboarding_attempts_recovery_notes_check,
  drop constraint if exists institution_onboarding_attempts_recovery_status_check,
  drop column if exists recovery_resolved_by,
  drop column if exists recovery_resolved_at,
  drop column if exists recovery_notes,
  drop column if exists recovery_status,
  drop column if exists invitation_id,
  drop column if exists access_request_id;
notify pgrst,'reload schema';
commit;
