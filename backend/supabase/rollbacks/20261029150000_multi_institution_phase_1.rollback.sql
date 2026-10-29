-- Guarded rollback for Multi-institution Phase 1.
begin;
do $$ declare t text; n bigint; begin
 if to_regclass('public.institutions') is null then raise exception 'Rollback refused: institutions table missing'; end if;
 if exists(select 1 from public.institutions where id<>'6f5f8c70-8b95-5f20-a567-43f379c38ec8'::uuid) then raise exception 'Rollback refused: additional institutions exist'; end if;
 if exists(select 1 from information_schema.routines where routine_schema='public' and routine_name like '%institution%') then raise exception 'Rollback refused: later institution security functions exist'; end if;
 foreach t in array array['departments', 'profiles', 'user_roles', 'teachers', 'students', 'academic_classes', 'class_coordinator_assignments', 'subjects', 'teacher_subjects', 'attendance', 'notices', 'sms_logs', 'parent_notification_attempts'] loop
  if not exists(select 1 from information_schema.columns where table_schema='public' and table_name=t and column_name='institution_id') then raise exception 'Rollback refused: %.institution_id missing',t; end if;
  execute format('select count(*) from public.%I where institution_id is distinct from $1',t) into n using '6f5f8c70-8b95-5f20-a567-43f379c38ec8'::uuid;
  if n>0 then raise exception 'Rollback refused: % has % non-MITCORER or null rows',t,n; end if;
 end loop;
 if (select count(*) from public.user_roles where role='admin')>1 then raise exception 'Rollback refused: multiple admins cannot restore global uniqueness'; end if;
end $$;

drop index if exists public.one_admin_per_institution;
drop index if exists public.departments_institution_code_key;
drop index if exists public.teachers_institution_employee_id_key;
drop index if exists public.students_institution_roll_number_key;
drop index if exists public.subjects_institution_code_key;
alter table public.departments add constraint departments_code_key unique(code);
alter table public.teachers add constraint teachers_employee_id_key unique(employee_id);
alter table public.students add constraint students_roll_number_key unique(roll_number);
alter table public.subjects add constraint subjects_code_key unique(code);
create unique index one_admin_per_institution on public.user_roles(role) where role='admin';

do $$ declare t text; begin
 foreach t in array array['parent_notification_attempts', 'sms_logs', 'notices', 'attendance', 'teacher_subjects', 'subjects', 'class_coordinator_assignments', 'academic_classes', 'students', 'teachers', 'user_roles', 'profiles', 'departments'] loop
  execute format('drop index if exists public.%I',t||'_institution_id_idx');
  execute format('alter table public.%I drop constraint if exists %I',t,t||'_institution_id_fkey');
  execute format('alter table public.%I drop column institution_id',t);
 end loop;
end $$;
comment on column public.departments.institution_name is null;
drop table public.institutions;
notify pgrst,'reload schema';
commit;
