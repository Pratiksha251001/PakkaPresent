-- Phase 7D Stage 2C: guarded idempotent onboarding recovery resolution
begin;
create or replace function public.platform_resolve_clean_onboarding_recovery(target_attempt_id uuid,resolution_notes text)
returns table(attempt_id uuid,recovery_status text,invitation_status text,access_request_status text)
language plpgsql security definer set search_path=public as $$
declare a public.institution_onboarding_attempts%rowtype; v public.institution_onboarding_invitations%rowtype; request_status text;
begin
 if not public.is_current_user_super_admin() then raise exception using errcode='42501',message='Platform access requires an explicit super_admin role.'; end if;
 if nullif(btrim(resolution_notes),'') is null or char_length(btrim(resolution_notes)) not between 5 and 2000 then raise exception using errcode='22023',message='Recovery notes between 5 and 2000 characters are required.'; end if;
 select * into a from public.institution_onboarding_attempts where request_id=target_attempt_id for update;
 if not found then raise exception using errcode='P0002',message='Recovery attempt not found.'; end if;
 if a.recovery_status='resolved' then return query select a.request_id,'resolved'::text,'active'::text,'approved'::text; return; end if;
 if a.status<>'recovery_required' or a.access_request_id is null or a.invitation_id is null then raise exception using errcode='P0001',message='Recovery attempt is not eligible for resolution.'; end if;
 select * into v from public.institution_onboarding_invitations where id=a.invitation_id for update;
 if not found or v.request_id<>a.access_request_id or v.status<>'recovery_required' then raise exception using errcode='P0001',message='Recovery invitation linkage is invalid.'; end if;
 select status into request_status from public.institution_access_requests where id=a.access_request_id for update;
 if request_status<>'onboarding' then raise exception using errcode='P0001',message='Recovery access request linkage is invalid.'; end if;
 if a.institution_id is not null and exists(select 1 from public.institutions where id=a.institution_id) then raise exception using errcode='P0001',message='Recovery still contains an institution artifact and requires manual investigation.'; end if;
 if a.administrator_user_id is not null and (exists(select 1 from public.profiles where id=a.administrator_user_id) or exists(select 1 from public.user_roles where user_id=a.administrator_user_id)) then raise exception using errcode='P0001',message='Recovery still contains administrator artifacts and requires manual investigation.'; end if;
 update public.institution_onboarding_invitations set status='active',institution_id=null,consumed_at=null,revoked_at=null where id=a.invitation_id and status='recovery_required';
 update public.institution_access_requests set status='approved' where id=a.access_request_id and status='onboarding';
 update public.institution_onboarding_attempts set status='failed',recovery_status='resolved',recovery_notes=btrim(resolution_notes),recovery_resolved_at=now(),recovery_resolved_by=auth.uid(),completed_at=coalesce(completed_at,now()) where request_id=target_attempt_id;
 return query select target_attempt_id,'resolved'::text,'active'::text,'approved'::text;
end $$;
revoke all on function public.platform_resolve_clean_onboarding_recovery(uuid,text) from public,anon,service_role;
grant execute on function public.platform_resolve_clean_onboarding_recovery(uuid,text) to authenticated;
notify pgrst,'reload schema';
commit;
