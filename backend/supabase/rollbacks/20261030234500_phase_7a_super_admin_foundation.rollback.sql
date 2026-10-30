begin;
drop function if exists public.current_platform_identity();
drop function if exists public.is_current_user_super_admin();
drop trigger if exists enforce_platform_profile_scope on public.profiles;
drop function if exists public.enforce_platform_profile_scope();
drop index if exists public.one_super_admin_role_per_user;
alter table public.user_roles drop constraint if exists user_roles_scope_valid;
alter table public.user_roles drop constraint if exists user_roles_role_allowed;
-- Rollback is guarded: remove every super_admin role before restoring tenant-only NOT NULL constraints.
do $$ begin
 if exists(select 1 from public.user_roles where role='super_admin')
    or exists(select 1 from public.profiles where institution_id is null) then
  raise exception 'Remove all super_admin roles and null-institution platform profiles before Phase 7A rollback';
 end if;
end $$;
alter table public.profiles alter column institution_id set not null;
alter table public.user_roles alter column institution_id set not null;
alter table public.user_roles add constraint user_roles_role_allowed check (role in ('admin','hod','teacher','class_coordinator','student'));
commit;
