begin;
do $$ begin
 if to_regclass('public.platform_audit_events') is not null and exists(select 1 from public.platform_audit_events) then raise exception 'Phase 7E rollback refused: platform audit evidence exists'; end if;
end $$;
do $$ declare source_table text; begin
 foreach source_table in array array['institution_access_requests','institution_onboarding_invitations','institution_onboarding_attempts','institution_lifecycle_events','institution_admin_transfer_events'] loop execute format('drop trigger if exists capture_platform_audit_event on public.%I',source_table); end loop;
end $$;
drop function if exists public.platform_list_audit_events(text,uuid,integer,integer);
drop function if exists public.capture_platform_audit_event();
drop function if exists public.platform_audit_json_is_safe(jsonb);
drop table if exists public.platform_audit_events;
notify pgrst, 'reload schema';
commit;
