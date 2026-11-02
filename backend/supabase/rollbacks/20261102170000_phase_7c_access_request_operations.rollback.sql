begin;
drop function if exists public.platform_revoke_access_request_invitation(uuid);
drop function if exists public.platform_issue_access_request_invitation(uuid,text,text,timestamptz,boolean);
drop function if exists public.platform_reject_access_request(uuid,text);
drop function if exists public.platform_mark_access_request_contacted(uuid,text);
drop function if exists public.platform_get_access_request(uuid);
drop function if exists public.platform_list_access_requests(text,text,integer,integer);
notify pgrst,'reload schema'; commit;
