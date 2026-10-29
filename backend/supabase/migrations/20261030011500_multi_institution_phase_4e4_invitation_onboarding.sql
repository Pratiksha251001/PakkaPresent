begin;
do $$ begin if to_regclass('public.institution_onboarding_invitations') is null then raise exception 'Phase 4E4 refused: invitation table missing'; end if; end $$;
-- Multi-institution Phase 4E4 invitation-bound onboarding
alter table public.institution_onboarding_invitations drop constraint if exists institution_onboarding_invitations_status_check;
alter table public.institution_onboarding_invitations add constraint institution_onboarding_invitations_status_check check (status in ('active','onboarding','consumed','revoked','expired','recovery_required'));
create or replace function public.reserve_institution_onboarding(invitation_token_digest text,onboarding_code_digest text)
returns table(invitation_id uuid,request_id uuid,institution_name text,institution_code text,dte_code text,official_email text)
language plpgsql security definer set search_path=public as $$
declare row_inv public.institution_onboarding_invitations%rowtype; transitioned_request_id uuid;
begin
 if auth.role()<>'service_role' then raise exception using errcode='42501',message='Service role required'; end if;
 select * into row_inv from public.institution_onboarding_invitations where token_digest=invitation_token_digest for update;
 if not found or row_inv.code_digest<>onboarding_code_digest then raise exception using errcode='P0002',message='Invalid onboarding invitation.'; end if;
 if row_inv.status<>'active' then raise exception using errcode='P0001',message='Onboarding invitation is not active.'; end if;
 if row_inv.expires_at<=now() then raise exception using errcode='P0001',message='Onboarding invitation has expired.'; end if;
 update public.institution_access_requests set status='onboarding' where id=row_inv.request_id and status='approved' returning id into transitioned_request_id;
 if transitioned_request_id is null then raise exception using errcode='P0001',message='Access request is no longer approved for onboarding.'; end if;
 update public.institution_onboarding_invitations set status='onboarding' where id=row_inv.id and status='active';
 if not found then raise exception using errcode='P0001',message='Onboarding invitation is no longer active.'; end if;
 return query select row_inv.id,r.id,r.institution_name,r.institution_code,r.dte_code,r.official_email from public.institution_access_requests r where r.id=transitioned_request_id;
end $$;
create or replace function public.complete_institution_onboarding(target_invitation_id uuid,target_institution_id uuid)
returns void language plpgsql security definer set search_path=public as $$ declare rid uuid; transitioned_request_id uuid; begin
 if auth.role()<>'service_role' then raise exception using errcode='42501',message='Service role required'; end if;
 select request_id into rid from public.institution_onboarding_invitations where id=target_invitation_id and status='onboarding' for update;
 if rid is null then raise exception using errcode='P0001',message='Invitation reservation is no longer valid.'; end if;
 update public.institution_access_requests set status='onboarded' where id=rid and status='onboarding' returning id into transitioned_request_id;
 if transitioned_request_id is null then raise exception using errcode='P0001',message='Access request is no longer in onboarding.'; end if;
 update public.institution_onboarding_invitations set status='consumed',consumed_at=now(),institution_id=target_institution_id where id=target_invitation_id and status='onboarding';
 if not found then raise exception using errcode='P0001',message='Invitation reservation is no longer valid.'; end if;
end $$;
create or replace function public.release_institution_onboarding(target_invitation_id uuid,recovery_required boolean)
returns void language plpgsql security definer set search_path=public as $$ declare rid uuid; begin
 if auth.role()<>'service_role' then raise exception using errcode='42501',message='Service role required'; end if;
 update public.institution_onboarding_invitations set status=case when recovery_required then 'recovery_required' else 'active' end where id=target_invitation_id and status='onboarding' returning request_id into rid;
 if rid is not null then update public.institution_access_requests set status=case when recovery_required then 'onboarding' else 'approved' end where id=rid; end if;
end $$;
revoke all on function public.reserve_institution_onboarding(text,text),public.complete_institution_onboarding(uuid,uuid),public.release_institution_onboarding(uuid,boolean) from public,anon,authenticated;
grant execute on function public.reserve_institution_onboarding(text,text),public.complete_institution_onboarding(uuid,uuid),public.release_institution_onboarding(uuid,boolean) to service_role;
notify pgrst,'reload schema';
commit;
