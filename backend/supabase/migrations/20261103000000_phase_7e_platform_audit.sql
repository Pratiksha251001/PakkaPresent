-- Phase 7E: unified append-only platform audit ledger
begin;
create table if not exists public.platform_audit_events (
  id uuid primary key default gen_random_uuid(),
  actor_user_id uuid references auth.users(id) on delete restrict,
  action text not null,
  target_type text not null,
  target_id uuid,
  institution_id uuid references public.institutions(id) on delete restrict,
  previous_state jsonb,
  new_state jsonb,
  safe_metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint platform_audit_action_check check (char_length(btrim(action)) between 3 and 100),
  constraint platform_audit_target_check check (char_length(btrim(target_type)) between 3 and 100),
  constraint platform_audit_metadata_check check (jsonb_typeof(safe_metadata) = 'object')
);
create index if not exists platform_audit_events_created_idx on public.platform_audit_events(created_at desc, id desc);
create index if not exists platform_audit_events_institution_idx on public.platform_audit_events(institution_id, created_at desc);
alter table public.platform_audit_events enable row level security;
revoke all on public.platform_audit_events from public, anon, authenticated, service_role;
comment on table public.platform_audit_events is 'Append-only platform audit evidence; authenticated direct table access is forbidden.';

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
revoke all on function public.platform_audit_json_is_safe(jsonb) from public, anon, authenticated, service_role;

alter table public.platform_audit_events
  add constraint platform_audit_previous_state_safe check (public.platform_audit_json_is_safe(coalesce(previous_state,'{}'::jsonb))),
  add constraint platform_audit_new_state_safe check (public.platform_audit_json_is_safe(coalesce(new_state,'{}'::jsonb))),
  add constraint platform_audit_metadata_safe check (public.platform_audit_json_is_safe(safe_metadata));


create or replace function public.capture_platform_audit_event()
returns trigger language plpgsql security definer set search_path = pg_catalog as $$
declare old_safe jsonb; new_safe jsonb; target uuid; institution uuid; event_action text; actor uuid;
begin
  if tg_table_name = 'institution_access_requests' then
    old_safe := case when tg_op='INSERT' then null else jsonb_build_object('status',old.status,'reviewed_at',old.reviewed_at,'approved_at',old.approved_at,'rejected_at',old.rejected_at) end;
    new_safe := case when tg_op='DELETE' then null else jsonb_build_object('status',new.status,'reviewed_at',new.reviewed_at,'approved_at',new.approved_at,'rejected_at',new.rejected_at) end;
    target := coalesce(new.id,old.id);  event_action := 'access_request_' || lower(tg_op);
  elsif tg_table_name = 'institution_onboarding_invitations' then
    old_safe := case when tg_op='INSERT' then null else jsonb_build_object('status',old.status,'expires_at',old.expires_at,'consumed_at',old.consumed_at,'revoked_at',old.revoked_at) end;
    new_safe := case when tg_op='DELETE' then null else jsonb_build_object('status',new.status,'expires_at',new.expires_at,'consumed_at',new.consumed_at,'revoked_at',new.revoked_at) end;
    target := coalesce(new.id,old.id); institution := coalesce(new.institution_id,old.institution_id); event_action := 'invitation_' || lower(tg_op);
  elsif tg_table_name = 'institution_onboarding_attempts' then
    old_safe := case when tg_op='INSERT' then null else jsonb_build_object('status',old.status,'failure_phase',old.failure_phase,'recovery_status',old.recovery_status,'recovery_resolved_at',old.recovery_resolved_at) end;
    new_safe := case when tg_op='DELETE' then null else jsonb_build_object('status',new.status,'failure_phase',new.failure_phase,'recovery_status',new.recovery_status,'recovery_resolved_at',new.recovery_resolved_at) end;
    target := coalesce(new.request_id,old.request_id); institution := coalesce(new.institution_id,old.institution_id); actor := coalesce(new.recovery_resolved_by,old.recovery_resolved_by); event_action := 'onboarding_attempt_' || lower(tg_op);
  elsif tg_table_name = 'institution_lifecycle_events' then
    target := new.id; institution := new.institution_id; actor := new.actor_user_id; event_action := 'institution_status_transition';
    new_safe := jsonb_build_object('previous_status',new.previous_status,'new_status',new.new_status,'reason',new.reason);
  elsif tg_table_name = 'institution_admin_transfer_events' then
    target := new.id; institution := new.institution_id; actor := new.actor_user_id; event_action := 'institution_admin_transfer';
    new_safe := jsonb_build_object('previous_admin_user_id',new.previous_admin_user_id,'new_admin_user_id',new.new_admin_user_id,'reason',new.reason);
  else raise exception 'Unsupported platform audit source'; end if;
  insert into public.platform_audit_events(actor_user_id,action,target_type,target_id,institution_id,previous_state,new_state,safe_metadata)
  values(coalesce(auth.uid(),actor),event_action,tg_table_name,target,institution,old_safe,new_safe,jsonb_build_object('operation',tg_op));
  return coalesce(new,old);
end $$;
revoke all on function public.capture_platform_audit_event() from public, anon, authenticated;

do $$ declare source_table text; begin
  foreach source_table in array array['institution_access_requests','institution_onboarding_invitations','institution_onboarding_attempts','institution_lifecycle_events','institution_admin_transfer_events'] loop
    execute format('drop trigger if exists capture_platform_audit_event on public.%I',source_table);
    execute format('create trigger capture_platform_audit_event after insert or update or delete on public.%I for each row execute function public.capture_platform_audit_event()',source_table);
  end loop;
end $$;

create or replace function public.platform_list_audit_events(action_filter text default null,institution_filter uuid default null,page_limit integer default 25,page_offset integer default 0)
returns table(event_id uuid,actor_user_id uuid,action text,target_type text,target_id uuid,institution_id uuid,previous_state jsonb,new_state jsonb,safe_metadata jsonb,created_at timestamptz,total_count bigint)
language plpgsql stable security definer set search_path = pg_catalog as $$
begin
  if not public.is_current_user_super_admin() then raise exception using errcode='42501',message='Platform audit access requires an explicit super_admin role.'; end if;
  if page_limit < 1 or page_limit > 100 or page_offset < 0 then raise exception using errcode='22023',message='Invalid audit pagination.'; end if;
  if action_filter is not null and (char_length(action_filter)>100 or action_filter !~ '^[a-z0-9_]+$') then raise exception using errcode='22023',message='Invalid audit action filter.'; end if;
  return query select e.id,e.actor_user_id,e.action,e.target_type,e.target_id,e.institution_id,e.previous_state,e.new_state,e.safe_metadata,e.created_at,count(*) over()::bigint
  from public.platform_audit_events e where (action_filter is null or e.action=action_filter) and (institution_filter is null or e.institution_id=institution_filter)
  order by e.created_at desc,e.id desc limit page_limit offset page_offset;
end $$;
revoke all on function public.platform_list_audit_events(text,uuid,integer,integer) from public, anon, service_role;
grant execute on function public.platform_list_audit_events(text,uuid,integer,integer) to authenticated;
notify pgrst, 'reload schema';
commit;
