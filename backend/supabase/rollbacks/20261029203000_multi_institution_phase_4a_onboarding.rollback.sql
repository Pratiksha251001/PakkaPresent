-- Guarded rollback for Multi-institution Phase 4A.
begin;
do $$ declare t text;n bigint; begin
 if to_regclass('public.institutions') is null then raise exception 'Phase 4A rollback refused: institutions table missing'; end if;
 if exists(select 1 from public.institutions where id<>'6f5f8c70-8b95-5f20-a567-43f379c38ec8'::uuid) then raise exception 'Phase 4A rollback refused: additional institutions exist'; end if;
 if to_regclass('public.institution_onboarding_attempts') is not null and exists(select 1 from public.institution_onboarding_attempts) then raise exception 'Phase 4A rollback refused: onboarding attempts exist'; end if;
 foreach t in array array['departments', 'profiles', 'user_roles', 'teachers', 'students', 'academic_classes', 'class_coordinator_assignments', 'subjects', 'teacher_subjects', 'attendance', 'notices', 'sms_logs', 'parent_notification_attempts'] loop
  execute format('select count(*) from public.%I where institution_id is distinct from $1',t) into n using '6f5f8c70-8b95-5f20-a567-43f379c38ec8'::uuid;
  if n>0 then raise exception 'Phase 4A rollback refused: % contains non-baseline ownership',t; end if;
  execute format('alter table public.%I alter column institution_id set default %L::uuid',t,'6f5f8c70-8b95-5f20-a567-43f379c38ec8');
 end loop;
end $$;
drop table if exists public.institution_onboarding_attempts;
comment on table public.institutions is 'Phase 1 ownership registry. Additional onboarding is blocked until Phase 4.';
notify pgrst,'reload schema';
commit;
