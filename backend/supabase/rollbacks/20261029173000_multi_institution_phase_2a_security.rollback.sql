-- Guarded rollback for Phase 2A tenant security only.
begin;
do $$ declare t text; begin
  foreach t in array array['departments', 'profiles', 'user_roles', 'teachers', 'students', 'academic_classes', 'class_coordinator_assignments', 'subjects', 'teacher_subjects', 'attendance', 'notices', 'sms_logs', 'parent_notification_attempts'] loop
    execute format('drop trigger if exists enforce_immutable_institution_id on public.%I',t);
    execute format('drop policy if exists tenant_isolation_restrictive on public.%I',t);
  end loop;
end $$;
drop policy if exists institutions_read_own on public.institutions;
revoke select on public.institutions from authenticated;
drop function if exists public.enforce_immutable_institution_id();
drop function if exists public.current_user_institution_id();
notify pgrst, 'reload schema';
commit;
