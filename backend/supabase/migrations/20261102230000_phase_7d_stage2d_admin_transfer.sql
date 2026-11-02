-- Phase 7D Stage 2D: atomic Institution Admin transfer
begin;
create table if not exists public.institution_admin_transfer_events (
  id uuid primary key default uuid_generate_v4(),
  institution_id uuid not null references public.institutions(id) on delete restrict,
  previous_admin_user_id uuid not null references auth.users(id) on delete restrict,
  new_admin_user_id uuid not null references auth.users(id) on delete restrict,
  actor_user_id uuid not null references auth.users(id) on delete restrict,
  reason text not null,
  created_at timestamptz not null default now(),
  constraint institution_admin_transfer_distinct_users check (previous_admin_user_id <> new_admin_user_id),
  constraint institution_admin_transfer_reason_check check (char_length(btrim(reason)) between 5 and 1000)
);
create index if not exists institution_admin_transfer_events_institution_created_idx
  on public.institution_admin_transfer_events(institution_id, created_at desc);
alter table public.institution_admin_transfer_events enable row level security;
revoke all on public.institution_admin_transfer_events from public,anon,authenticated;
grant select,insert on public.institution_admin_transfer_events to service_role;

create or replace function public.platform_transfer_institution_admin(
  target_institution_id uuid,
  successor_user_id uuid,
  transfer_reason text
)
returns table(institution_id uuid,previous_admin_user_id uuid,new_admin_user_id uuid,transferred_at timestamptz)
language plpgsql security definer set search_path=public as $$
declare
  current_admin_id uuid;
  admin_count integer;
  event_time timestamptz:=now();
begin
  if not public.is_current_user_super_admin() then
    raise exception using errcode='42501',message='Platform access requires an explicit super_admin role.';
  end if;
  if nullif(btrim(transfer_reason),'') is null or char_length(btrim(transfer_reason)) not between 5 and 1000 then
    raise exception using errcode='22023',message='A transfer reason between 5 and 1000 characters is required.';
  end if;
  perform 1 from public.institutions where id=target_institution_id for update;
  if not found then raise exception using errcode='P0002',message='Institution not found.'; end if;

  select count(*)::integer,min(user_id) into admin_count,current_admin_id
  from public.user_roles where institution_id=target_institution_id and role='admin';
  if admin_count<>1 then
    raise exception using errcode='P0001',message='Institution must have exactly one current administrator.';
  end if;
  perform 1 from public.user_roles where institution_id=target_institution_id and role='admin' for update;
  if successor_user_id=current_admin_id then
    raise exception using errcode='P0001',message='The successor is already the Institution Admin.';
  end if;
  if not exists(select 1 from public.profiles p where p.id=successor_user_id and p.institution_id=target_institution_id) then
    raise exception using errcode='P0001',message='The successor must have a profile in the same institution.';
  end if;
  if not exists(select 1 from public.user_roles ur where ur.user_id=successor_user_id and ur.institution_id=target_institution_id and ur.role<>'super_admin') then
    raise exception using errcode='P0001',message='The successor must already hold an institution-scoped role.';
  end if;
  if exists(select 1 from public.user_roles ur where ur.user_id=successor_user_id and ur.role='super_admin') then
    raise exception using errcode='P0001',message='A platform Super Admin cannot become an Institution Admin.';
  end if;

  delete from public.user_roles
    where user_id=current_admin_id and institution_id=target_institution_id and role='admin';
  insert into public.user_roles(user_id,institution_id,role,department_id)
    values(successor_user_id,target_institution_id,'admin',null);
  insert into public.institution_admin_transfer_events(
    institution_id,previous_admin_user_id,new_admin_user_id,actor_user_id,reason,created_at
  ) values(
    target_institution_id,current_admin_id,successor_user_id,auth.uid(),btrim(transfer_reason),event_time
  );
  return query select target_institution_id,current_admin_id,successor_user_id,event_time;
end $$;
revoke all on function public.platform_transfer_institution_admin(uuid,uuid,text) from public,anon,service_role;
grant execute on function public.platform_transfer_institution_admin(uuid,uuid,text) to authenticated;
comment on function public.platform_transfer_institution_admin(uuid,uuid,text) is 'Atomically transfers the single Institution Admin role to an existing same-institution account and records immutable audit evidence.';
notify pgrst,'reload schema';
commit;
