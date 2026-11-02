-- Phase 7D Stage 2B: immutable onboarding recovery linkage and read-only diagnosis
begin;

do $$
begin
  if to_regprocedure('public.is_current_user_super_admin()') is null then
    raise exception 'Phase 7D Stage 2B refused: super-admin authorization is missing';
  end if;
  if to_regclass('public.institution_onboarding_attempts') is null
     or to_regclass('public.institution_onboarding_invitations') is null
     or to_regclass('public.institution_access_requests') is null then
    raise exception 'Phase 7D Stage 2B refused: onboarding recovery prerequisites are missing';
  end if;
end $$;

alter table public.institution_onboarding_attempts
  add column if not exists access_request_id uuid references public.institution_access_requests(id) on delete restrict,
  add column if not exists invitation_id uuid references public.institution_onboarding_invitations(id) on delete restrict,
  add column if not exists recovery_status text,
  add column if not exists recovery_notes text,
  add column if not exists recovery_resolved_at timestamptz,
  add column if not exists recovery_resolved_by uuid references auth.users(id) on delete restrict;

alter table public.institution_onboarding_attempts
  drop constraint if exists institution_onboarding_attempts_recovery_status_check,
  add constraint institution_onboarding_attempts_recovery_status_check
    check (recovery_status is null or recovery_status in ('required','inspected','resolved')),
  drop constraint if exists institution_onboarding_attempts_recovery_notes_check,
  add constraint institution_onboarding_attempts_recovery_notes_check
    check (recovery_notes is null or char_length(recovery_notes) between 5 and 2000);

create unique index if not exists institution_onboarding_attempts_invitation_id_key
  on public.institution_onboarding_attempts(invitation_id)
  where invitation_id is not null;
create index if not exists institution_onboarding_attempts_access_request_id_idx
  on public.institution_onboarding_attempts(access_request_id, created_at desc);
create index if not exists institution_onboarding_attempts_recovery_status_idx
  on public.institution_onboarding_attempts(recovery_status, created_at asc);

create or replace function public.platform_list_onboarding_recovery(
  page_limit integer default 25,
  page_offset integer default 0
)
returns table(
  attempt_id uuid,
  access_request_id uuid,
  invitation_id uuid,
  institution_id uuid,
  administrator_user_id uuid,
  failure_phase text,
  recovery_status text,
  created_at timestamptz,
  completed_at timestamptz,
  total_count bigint
)
language plpgsql stable security definer set search_path = pg_catalog as $$
begin
  if not public.is_current_user_super_admin() then
    raise exception using errcode='42501', message='Platform access requires an explicit super_admin role.';
  end if;
  if page_limit < 1 or page_limit > 100 or page_offset < 0 then
    raise exception using errcode='22023', message='Invalid recovery pagination.';
  end if;
  return query
  select a.request_id, a.access_request_id, a.invitation_id, a.institution_id,
    a.administrator_user_id, a.failure_phase, coalesce(a.recovery_status,'required'),
    a.created_at, a.completed_at, count(*) over()::bigint
  from public.institution_onboarding_attempts a
  where a.status='recovery_required'
  order by a.created_at asc, a.request_id
  limit page_limit offset page_offset;
end $$;

create or replace function public.platform_get_onboarding_recovery(requested_attempt_id uuid)
returns table(
  attempt_id uuid,
  access_request_id uuid,
  invitation_id uuid,
  institution_id uuid,
  administrator_user_id uuid,
  failure_phase text,
  recovery_status text,
  invitation_status text,
  access_request_status text,
  institution_exists boolean,
  administrator_profile_exists boolean,
  administrator_role_exists boolean,
  linkage_valid boolean,
  created_at timestamptz,
  completed_at timestamptz
)
language plpgsql stable security definer set search_path = pg_catalog as $$
begin
  if not public.is_current_user_super_admin() then
    raise exception using errcode='42501', message='Platform access requires an explicit super_admin role.';
  end if;
  return query
  select a.request_id, a.access_request_id, a.invitation_id, a.institution_id,
    a.administrator_user_id, a.failure_phase, coalesce(a.recovery_status,'required'),
    v.status, r.status,
    exists(select 1 from public.institutions i where i.id=a.institution_id),
    exists(select 1 from public.profiles p where p.id=a.administrator_user_id and p.institution_id=a.institution_id),
    exists(select 1 from public.user_roles ur where ur.user_id=a.administrator_user_id and ur.institution_id=a.institution_id and ur.role='admin'),
    (a.access_request_id is not null and a.invitation_id is not null
      and v.request_id=a.access_request_id
      and a.status='recovery_required'
      and v.status='recovery_required'
      and r.status='onboarding'),
    a.created_at, a.completed_at
  from public.institution_onboarding_attempts a
  left join public.institution_onboarding_invitations v on v.id=a.invitation_id
  left join public.institution_access_requests r on r.id=a.access_request_id
  where a.request_id=requested_attempt_id;
end $$;

revoke all on function public.platform_list_onboarding_recovery(integer,integer) from public,anon,service_role;
revoke all on function public.platform_get_onboarding_recovery(uuid) from public,anon,service_role;
grant execute on function public.platform_list_onboarding_recovery(integer,integer) to authenticated;
grant execute on function public.platform_get_onboarding_recovery(uuid) to authenticated;
comment on function public.platform_get_onboarding_recovery(uuid) is 'Read-only recovery diagnosis. Returns artifact existence booleans and no credential digests or secrets.';
notify pgrst,'reload schema';
commit;
