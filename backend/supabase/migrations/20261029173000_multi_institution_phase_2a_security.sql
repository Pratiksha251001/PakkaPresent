-- Phase 2A: restrictive institution isolation layered over existing role policies.
begin;

-- Refuse to run before Phase 1 is complete.
do $$ declare t text; begin
  if to_regclass('public.institutions') is null then raise exception 'Phase 2A refused: institutions table missing'; end if;
  foreach t in array array['departments', 'profiles', 'user_roles', 'teachers', 'students', 'academic_classes', 'class_coordinator_assignments', 'subjects', 'teacher_subjects', 'attendance', 'notices', 'sms_logs', 'parent_notification_attempts'] loop
    if not exists(select 1 from information_schema.columns where table_schema='public' and table_name=t and column_name='institution_id' and is_nullable='NO') then
      raise exception 'Phase 2A refused: %.institution_id missing or nullable', t;
    end if;
  end loop;
end $$;

-- Multi-institution Phase 2A restrictive tenant security
create or replace function public.current_user_institution_id()
returns uuid language sql stable security definer set search_path = public
as $$ select institution_id from public.user_roles where user_id = auth.uid() order by created_at asc limit 1 $$;
revoke all on function public.current_user_institution_id() from public, anon;
grant execute on function public.current_user_institution_id() to authenticated;

create or replace function public.enforce_immutable_institution_id()
returns trigger language plpgsql security definer set search_path = public
as $$ begin
  if auth.role() = 'service_role' then
    return new;
  end if;
  if tg_op = 'UPDATE' and new.institution_id is distinct from old.institution_id then
    raise exception 'institution_id cannot be changed';
  end if;
  if new.institution_id is distinct from public.current_user_institution_id() then
    raise exception 'institution_id must match authenticated institution';
  end if;
  return new;
end $$;
revoke all on function public.enforce_immutable_institution_id() from public, anon, authenticated;

do $$ declare t text; begin
  foreach t in array array['departments', 'profiles', 'user_roles', 'teachers', 'students', 'academic_classes', 'class_coordinator_assignments', 'subjects', 'teacher_subjects', 'attendance', 'notices', 'sms_logs', 'parent_notification_attempts'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('drop policy if exists tenant_isolation_restrictive on public.%I', t);
    execute format('create policy tenant_isolation_restrictive on public.%I as restrictive for all to authenticated using (institution_id = public.current_user_institution_id()) with check (institution_id = public.current_user_institution_id())', t);
    execute format('drop trigger if exists enforce_immutable_institution_id on public.%I', t);
    execute format('create trigger enforce_immutable_institution_id before insert or update on public.%I for each row execute function public.enforce_immutable_institution_id()', t);
  end loop;
end $$;

grant select on public.institutions to authenticated;
drop policy if exists institutions_read_own on public.institutions;
create policy institutions_read_own on public.institutions for select to authenticated
using (id = public.current_user_institution_id());

comment on function public.current_user_institution_id() is 'Returns the authenticated account institution through a security-definer lookup.';
comment on function public.enforce_immutable_institution_id() is 'Rejects cross-institution inserts and institution reassignment by authenticated clients.';

notify pgrst, 'reload schema';
commit;
