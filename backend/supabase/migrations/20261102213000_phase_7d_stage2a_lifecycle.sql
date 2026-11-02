-- Phase 7D Stage 2A: institution lifecycle controls and active-tenant enforcement
begin;

do $$
begin
  if to_regprocedure('public.is_current_user_super_admin()') is null then
    raise exception 'Phase 7D Stage 2A refused: super-admin authorization is missing';
  end if;
end $$;

create table if not exists public.institution_lifecycle_events (
  id uuid primary key default uuid_generate_v4(),
  institution_id uuid not null references public.institutions(id) on delete restrict,
  actor_user_id uuid not null references auth.users(id) on delete restrict,
  previous_status text not null,
  new_status text not null,
  reason text not null,
  created_at timestamptz not null default now(),
  constraint institution_lifecycle_events_status_check check (
    previous_status in ('pending','active','inactive','suspended') and
    new_status in ('pending','active','inactive','suspended')
  ),
  constraint institution_lifecycle_events_reason_check
    check (char_length(btrim(reason)) between 5 and 1000)
);
create index if not exists institution_lifecycle_events_institution_created_idx
  on public.institution_lifecycle_events(institution_id, created_at desc);
alter table public.institution_lifecycle_events enable row level security;
revoke all on public.institution_lifecycle_events from public, anon, authenticated;
grant select, insert on public.institution_lifecycle_events to service_role;

create or replace function public.current_user_institution_id()
returns uuid language sql stable security definer set search_path = public as $$
  select ur.institution_id
  from public.user_roles ur
  join public.institutions i on i.id = ur.institution_id
  where ur.user_id = auth.uid()
    and ur.institution_id is not null
    and i.status = 'active'
  order by ur.created_at asc
  limit 1
$$;
revoke all on function public.current_user_institution_id() from public, anon;
grant execute on function public.current_user_institution_id() to authenticated;

create or replace function public.platform_transition_institution_status(
  target_institution_id uuid,
  target_status text,
  change_reason text
)
returns table(institution_id uuid, previous_status text, new_status text, changed_at timestamptz)
language plpgsql security definer set search_path = public as $$
declare
  existing_status text;
  event_time timestamptz := now();
begin
  if not public.is_current_user_super_admin() then
    raise exception using errcode='42501', message='Platform access requires an explicit super_admin role.';
  end if;
  if target_status not in ('active','inactive','suspended') then
    raise exception using errcode='22023', message='Invalid institution lifecycle target.';
  end if;
  if nullif(btrim(change_reason),'') is null or char_length(btrim(change_reason)) not between 5 and 1000 then
    raise exception using errcode='22023', message='A lifecycle reason between 5 and 1000 characters is required.';
  end if;
  select i.status into existing_status from public.institutions i
  where i.id=target_institution_id for update;
  if existing_status is null then
    raise exception using errcode='P0002', message='Institution not found.';
  end if;
  if existing_status=target_status then
    raise exception using errcode='P0001', message='Institution already has the requested status.';
  end if;
  if not (
    (existing_status='pending' and target_status='active') or
    (existing_status='active' and target_status in ('inactive','suspended')) or
    (existing_status in ('inactive','suspended') and target_status='active')
  ) then
    raise exception using errcode='P0001', message='The requested institution lifecycle transition is not allowed.';
  end if;
  update public.institutions set status=target_status, updated_at=event_time
  where id=target_institution_id;
  insert into public.institution_lifecycle_events(
    institution_id,actor_user_id,previous_status,new_status,reason,created_at
  ) values (
    target_institution_id,auth.uid(),existing_status,target_status,btrim(change_reason),event_time
  );
  return query select target_institution_id,existing_status,target_status,event_time;
end $$;
revoke all on function public.platform_transition_institution_status(uuid,text,text)
  from public, anon, service_role;
grant execute on function public.platform_transition_institution_status(uuid,text,text)
  to authenticated;
notify pgrst, 'reload schema';
commit;
