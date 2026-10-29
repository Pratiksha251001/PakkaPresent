-- Multi-institution Phase 4E3: platform approval and invitation authorization.
begin;
do $$ begin
 if to_regclass('public.institution_access_requests') is null then raise exception 'Phase 4E3 refused: institution_access_requests is missing'; end if;
 if to_regclass('public.institution_onboarding_invitations') is not null then raise exception 'Phase 4E3 refused: invitation table already exists'; end if;
end $$;
-- Multi-institution Phase 4E3 invitation authorization
create table public.institution_onboarding_invitations (
  id uuid primary key default uuid_generate_v4(),
  request_id uuid not null references public.institution_access_requests(id) on delete restrict,
  token_digest text not null,
  code_digest text not null,
  status text not null default 'active' check (status in ('active','consumed','revoked','expired','recovery_required')),
  expires_at timestamptz not null,
  created_at timestamptz not null default now(),
  consumed_at timestamptz,
  revoked_at timestamptz,
  institution_id uuid references public.institutions(id) on delete set null,
  constraint institution_onboarding_invitation_token_digest_format check (token_digest ~ '^[a-f0-9]{64}$'),
  constraint institution_onboarding_invitation_code_digest_format check (code_digest ~ '^[a-f0-9]{64}$'),
  constraint institution_onboarding_invitation_expiry check (expires_at > created_at)
);
create unique index if not exists institution_onboarding_invitations_token_digest_key on public.institution_onboarding_invitations(token_digest);
create unique index if not exists institution_onboarding_invitations_code_digest_key on public.institution_onboarding_invitations(code_digest);
create unique index if not exists institution_onboarding_invitations_one_active_per_request on public.institution_onboarding_invitations(request_id) where status = 'active';
create index if not exists institution_onboarding_invitations_status_expiry_idx on public.institution_onboarding_invitations(status, expires_at);
alter table public.institution_onboarding_invitations enable row level security;
revoke all on public.institution_onboarding_invitations from public, anon, authenticated;
grant select, insert, update, delete on public.institution_onboarding_invitations to service_role;
comment on table public.institution_onboarding_invitations is 'Service-role-only invitation authorization. Stores SHA-256 digests only; plain invitation credentials must never be persisted.';

create or replace function public.approve_institution_access_request(
  target_request_id uuid,
  invitation_token_digest text,
  onboarding_code_digest text,
  invitation_expires_at timestamptz
) returns table(invitation_id uuid)
language plpgsql security definer set search_path = public
as $$
declare current_status text; new_invitation_id uuid;
begin
  if auth.role() <> 'service_role' then raise exception using errcode='42501', message='Service role required'; end if;
  if invitation_token_digest !~ '^[a-f0-9]{64}$' or onboarding_code_digest !~ '^[a-f0-9]{64}$' then
    raise exception using errcode='22023', message='Invalid invitation digest';
  end if;
  if invitation_expires_at <= now() then raise exception using errcode='22023', message='Invitation expiry must be in the future'; end if;
  select status into current_status from public.institution_access_requests where id=target_request_id for update;
  if not found then raise exception using errcode='P0002', message='Access request not found.'; end if;
  if current_status not in ('pending','contacted') then raise exception using errcode='P0001', message='Access request is not eligible for approval.'; end if;
  insert into public.institution_onboarding_invitations(request_id,token_digest,code_digest,expires_at)
    values(target_request_id,invitation_token_digest,onboarding_code_digest,invitation_expires_at)
    returning id into new_invitation_id;
  update public.institution_access_requests set status='approved', reviewed_at=coalesce(reviewed_at,now()), approved_at=now(), rejected_at=null where id=target_request_id;
  return query select new_invitation_id;
end $$;
revoke all on function public.approve_institution_access_request(uuid,text,text,timestamptz) from public, anon, authenticated;
grant execute on function public.approve_institution_access_request(uuid,text,text,timestamptz) to service_role;
notify pgrst,'reload schema';
commit;
