-- Roll back the Phase 7E JSON traversal hotfix to the original implementation
begin;

create or replace function public.platform_audit_json_is_safe(payload jsonb)
returns boolean language sql immutable security invoker set search_path = pg_catalog as $$
  select not exists (
    select 1
    from jsonb_path_query(payload, 'strict $.**.keyvalue()') item
    where lower(item->>'key') in (
      'password','token','token_digest','invitation_token','onboarding_code',
      'code_digest','administrator_email_digest','service_role_key','access_token','refresh_token'
    )
  )
$$;

revoke all on function public.platform_audit_json_is_safe(jsonb)
  from public, anon, authenticated, service_role;

notify pgrst, 'reload schema';
commit;
