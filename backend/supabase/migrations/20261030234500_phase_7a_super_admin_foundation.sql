begin;

-- Phase 7A: explicit platform-level Super Admin identity.
alter table public.profiles alter column institution_id drop not null;
alter table public.user_roles alter column institution_id drop not null;

-- Replace the generated role check without assuming its name.
do $$
declare constraint_record record;
begin
  for constraint_record in
    select c.conname
    from pg_constraint c
    join pg_class t on t.oid=c.conrelid
    join pg_namespace n on n.oid=t.relnamespace
    where n.nspname='public' and t.relname='user_roles' and c.contype='c'
      and pg_get_constraintdef(c.oid) ilike '%role%admin%student%'
  loop
    execute format('alter table public.user_roles drop constraint %I',constraint_record.conname);
  end loop;
end $$;

-- Permit safe re-execution by replacing only the named Phase 7A constraints.
alter table public.user_roles
  drop constraint if exists user_roles_role_allowed,
  drop constraint if exists user_roles_scope_valid;

alter table public.user_roles
  add constraint user_roles_role_allowed check (role in ('super_admin','admin','hod','teacher','class_coordinator','student')),
  add constraint user_roles_scope_valid check (
    (role='super_admin' and institution_id is null and department_id is null)
    or
    (role<>'super_admin' and institution_id is not null)
  );

create or replace function public.enforce_platform_profile_scope()
returns trigger language plpgsql security definer set search_path=public as $$
begin
  if new.institution_id is null and not exists (
    select 1 from public.user_roles ur
    where ur.user_id=new.id and ur.role='super_admin'
      and ur.institution_id is null and ur.department_id is null
  ) then
    raise exception 'A null profile institution requires an explicit platform-scoped super_admin role';
  end if;
  return new;
end $$;
revoke all on function public.enforce_platform_profile_scope() from public,anon,authenticated;
drop trigger if exists enforce_platform_profile_scope on public.profiles;
create trigger enforce_platform_profile_scope
before insert or update of institution_id on public.profiles
for each row execute function public.enforce_platform_profile_scope();

create unique index if not exists one_super_admin_role_per_user
  on public.user_roles(user_id) where role='super_admin';

create or replace function public.is_current_user_super_admin() returns boolean
language sql stable security definer set search_path=public as $$
  select exists(
    select 1 from public.user_roles ur
    where ur.user_id=auth.uid() and ur.role='super_admin'
      and ur.institution_id is null and ur.department_id is null
  );
$$;
revoke all on function public.is_current_user_super_admin() from public;
grant execute on function public.is_current_user_super_admin() to authenticated;

create or replace function public.current_platform_identity()
returns table(user_id uuid, email text, full_name text, role text)
language sql stable security definer set search_path=public,auth as $$
  select u.id, u.email::text, p.full_name, ur.role
  from auth.users u
  join public.profiles p on p.id=u.id
  join public.user_roles ur on ur.user_id=u.id
  where u.id=auth.uid() and ur.role='super_admin'
    and ur.institution_id is null and ur.department_id is null
  limit 1;
$$;
revoke all on function public.current_platform_identity() from public;
grant execute on function public.current_platform_identity() to authenticated;

comment on function public.is_current_user_super_admin() is 'Returns true only for an explicit platform-scoped super_admin role.';
comment on function public.current_platform_identity() is 'Returns the authenticated platform identity without granting institution scope.';
commit;
