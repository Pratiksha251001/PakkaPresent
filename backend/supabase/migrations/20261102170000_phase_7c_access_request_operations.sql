-- Phase 7C access-request and invitation operations
begin;
do $$ begin
 if to_regprocedure('public.is_current_user_super_admin()') is null then raise exception 'Phase 7C refused: Phase 7A authorization foundation is missing'; end if;
 if to_regclass('public.institution_access_requests') is null or to_regclass('public.institution_onboarding_invitations') is null then raise exception 'Phase 7C refused: request or invitation ledger is missing'; end if;
end $$;
create or replace function public.platform_list_access_requests(search_text text default null,status_filter text default null,page_limit integer default 25,page_offset integer default 0)
returns table(request_id uuid,institution_name text,institution_type text,institution_code text,dte_code text,contact_name text,designation text,official_email text,phone text,city text,state text,student_count integer,status text,created_at timestamptz,reviewed_at timestamptz,duplicate_count bigint,active_invitation_count bigint,total_count bigint)
language plpgsql stable security definer set search_path=pg_catalog as $$ declare q text:=nullif(btrim(search_text),''); begin
 if not public.is_current_user_super_admin() then raise exception using errcode='42501',message='Platform access requires an explicit super_admin role.'; end if;
 if status_filter is not null and status_filter not in ('pending','contacted','approved','rejected','expired','onboarding','onboarded') then raise exception using errcode='22023',message='Invalid request status filter.'; end if;
 if page_limit<1 or page_limit>100 or page_offset<0 then raise exception using errcode='22023',message='Invalid request pagination.'; end if;
 return query select r.id,r.institution_name,r.institution_type,r.institution_code,r.dte_code,r.contact_name,r.designation,r.official_email,r.phone,r.city,r.state,r.student_count,r.status,r.created_at,r.reviewed_at,
 (select count(*) from public.institution_access_requests d where d.id<>r.id and (d.official_email=r.official_email or (d.institution_code is not null and lower(d.institution_code)=lower(r.institution_code)) or (d.dte_code is not null and d.dte_code=r.dte_code)))::bigint,
 (select count(*) from public.institution_onboarding_invitations v where v.request_id=r.id and v.status='active' and v.expires_at>now())::bigint,count(*) over()::bigint
 from public.institution_access_requests r where (status_filter is null or r.status=status_filter) and (q is null or concat_ws(' ',r.institution_name,r.institution_code,r.dte_code,r.contact_name,r.official_email,r.city,r.state) ilike '%'||q||'%') order by r.created_at desc,r.id limit page_limit offset page_offset;
end $$;
create or replace function public.platform_get_access_request(requested_request_id uuid)
returns table(request_id uuid,institution_name text,institution_type text,institution_code text,dte_code text,contact_name text,designation text,official_email text,phone text,city text,state text,student_count integer,message text,status text,review_notes text,consented_at timestamptz,created_at timestamptz,reviewed_at timestamptz,approved_at timestamptz,rejected_at timestamptz,invitation_id uuid,invitation_status text,invitation_expires_at timestamptz,invitation_created_at timestamptz)
language plpgsql stable security definer set search_path=pg_catalog as $$ begin
 if not public.is_current_user_super_admin() then raise exception using errcode='42501',message='Platform access requires an explicit super_admin role.'; end if;
 return query select r.id,r.institution_name,r.institution_type,r.institution_code,r.dte_code,r.contact_name,r.designation,r.official_email,r.phone,r.city,r.state,r.student_count,r.message,r.status,r.review_notes,r.consented_at,r.created_at,r.reviewed_at,r.approved_at,r.rejected_at,v.id,v.status,v.expires_at,v.created_at from public.institution_access_requests r left join lateral(select x.id,x.status,x.expires_at,x.created_at from public.institution_onboarding_invitations x where x.request_id=r.id order by x.created_at desc limit 1)v on true where r.id=requested_request_id;
end $$;
create or replace function public.platform_mark_access_request_contacted(target_request_id uuid,notes text default null) returns void language plpgsql security definer set search_path=pg_catalog as $$ begin
 if not public.is_current_user_super_admin() then raise exception using errcode='42501',message='Platform access requires an explicit super_admin role.'; end if;
 if notes is not null and char_length(notes)>2000 then raise exception using errcode='22023',message='Review notes are too long.'; end if;
 update public.institution_access_requests set status='contacted',review_notes=nullif(btrim(notes),''),reviewed_at=now(),rejected_at=null where id=target_request_id and status in ('pending','contacted'); if not found then raise exception using errcode='P0001',message='Access request is not eligible to be contacted.'; end if;
end $$;
create or replace function public.platform_reject_access_request(target_request_id uuid,notes text) returns void language plpgsql security definer set search_path=pg_catalog as $$ begin
 if not public.is_current_user_super_admin() then raise exception using errcode='42501',message='Platform access requires an explicit super_admin role.'; end if;
 if nullif(btrim(notes),'') is null or char_length(notes)>2000 then raise exception using errcode='22023',message='Rejection notes are required and must be at most 2000 characters.'; end if;
 update public.institution_onboarding_invitations set status='revoked',revoked_at=now() where request_id=target_request_id and status='active';
 update public.institution_access_requests set status='rejected',review_notes=btrim(notes),reviewed_at=now(),approved_at=null,rejected_at=now() where id=target_request_id and status in ('pending','contacted','approved'); if not found then raise exception using errcode='P0001',message='Access request is not eligible for rejection.'; end if;
end $$;
create or replace function public.platform_issue_access_request_invitation(target_request_id uuid,invitation_token_digest text,onboarding_code_digest text,invitation_expires_at timestamptz,reissue boolean default false)
returns table(invitation_id uuid) language plpgsql security definer set search_path=pg_catalog as $$ declare current_status text; new_id uuid; begin
 if not public.is_current_user_super_admin() then raise exception using errcode='42501',message='Platform access requires an explicit super_admin role.'; end if;
 if invitation_token_digest!~'^[a-f0-9]{64}$' or onboarding_code_digest!~'^[a-f0-9]{64}$' or invitation_expires_at<=now() then raise exception using errcode='22023',message='Invalid invitation credentials or expiry.'; end if;
 select status into current_status from public.institution_access_requests where id=target_request_id for update; if not found then raise exception using errcode='P0002',message='Access request not found.'; end if;
 if (not reissue and current_status not in ('pending','contacted')) or (reissue and current_status<>'approved') then raise exception using errcode='P0001',message='Access request is not eligible for invitation issuance.'; end if;
 if reissue then update public.institution_onboarding_invitations set status='revoked',revoked_at=now() where request_id=target_request_id and status='active'; end if;
 insert into public.institution_onboarding_invitations(request_id,token_digest,code_digest,expires_at) values(target_request_id,invitation_token_digest,onboarding_code_digest,invitation_expires_at) returning id into new_id;
 update public.institution_access_requests set status='approved',reviewed_at=coalesce(reviewed_at,now()),approved_at=coalesce(approved_at,now()),rejected_at=null where id=target_request_id; return query select new_id;
end $$;
create or replace function public.platform_revoke_access_request_invitation(target_request_id uuid) returns void language plpgsql security definer set search_path=pg_catalog as $$ begin
 if not public.is_current_user_super_admin() then raise exception using errcode='42501',message='Platform access requires an explicit super_admin role.'; end if;
 update public.institution_onboarding_invitations set status='revoked',revoked_at=now() where request_id=target_request_id and status='active'; if not found then raise exception using errcode='P0001',message='No active invitation is available to revoke.'; end if;
end $$;
revoke all on function public.platform_list_access_requests(text,text,integer,integer),public.platform_get_access_request(uuid),public.platform_mark_access_request_contacted(uuid,text),public.platform_reject_access_request(uuid,text),public.platform_issue_access_request_invitation(uuid,text,text,timestamptz,boolean),public.platform_revoke_access_request_invitation(uuid) from public,anon,service_role;
grant execute on function public.platform_list_access_requests(text,text,integer,integer),public.platform_get_access_request(uuid),public.platform_mark_access_request_contacted(uuid,text),public.platform_reject_access_request(uuid,text),public.platform_issue_access_request_invitation(uuid,text,text,timestamptz,boolean),public.platform_revoke_access_request_invitation(uuid) to authenticated;
notify pgrst,'reload schema'; commit;
