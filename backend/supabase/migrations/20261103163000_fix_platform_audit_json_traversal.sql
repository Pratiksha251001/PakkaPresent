-- Phase 7E hotfix: safely traverse mixed JSON values during audit validation
begin;

create or replace function public.platform_audit_json_is_safe(payload jsonb)
returns boolean language sql immutable security invoker set search_path = pg_catalog as $$
  with recursive json_nodes(value) as (
    select coalesce(payload, 'null'::jsonb)
    union all
    select child.value
    from json_nodes node
    cross join lateral (
      select object_child.value
      from jsonb_each(
        case when jsonb_typeof(node.value) = 'object' then node.value else '{}'::jsonb end
      ) object_child
      union all
      select array_child.value
      from jsonb_array_elements(
        case when jsonb_typeof(node.value) = 'array' then node.value else '[]'::jsonb end
      ) array_child
    ) child
  ), object_keys(key) as (
    select object_key.key
    from json_nodes node
    cross join lateral jsonb_object_keys(
      case when jsonb_typeof(node.value) = 'object' then node.value else '{}'::jsonb end
    ) as object_key(key)
  )
  select not exists (
    select 1
    from object_keys
    where lower(key) in (
      'password','token','token_digest','invitation_token','onboarding_code',
      'code_digest','administrator_email_digest','service_role_key','access_token','refresh_token'
    )
  )
$$;

revoke all on function public.platform_audit_json_is_safe(jsonb)
  from public, anon, authenticated, service_role;

-- Regression probes: scalar leaves must be accepted while nested secret keys remain rejected.
do $$
begin
  if not public.platform_audit_json_is_safe('{"status":"pending","reviewed_at":null}'::jsonb) then
    raise exception 'Phase 7E JSON traversal hotfix refused: ordinary object was rejected';
  end if;
  if not public.platform_audit_json_is_safe('["pending",null,true,7]'::jsonb) then
    raise exception 'Phase 7E JSON traversal hotfix refused: scalar array was rejected';
  end if;
  if public.platform_audit_json_is_safe('{"nested":{"token_digest":"blocked"}}'::jsonb) then
    raise exception 'Phase 7E JSON traversal hotfix refused: nested secret key was accepted';
  end if;
end $$;

notify pgrst, 'reload schema';
commit;
