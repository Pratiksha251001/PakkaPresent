-- Restore the pre-fix class-specific attendance authorization behavior.
begin;

create or replace function public.can_manage_attendance(
  requested_student uuid, requested_subject uuid
) returns boolean language sql stable security definer
set search_path = pg_catalog as $$
  select exists (
    select 1 from public.students s
    join public.subjects subject on subject.id = requested_subject
      and subject.department_id = s.department_id
    join public.teacher_subjects assignment on assignment.subject_id = subject.id
    join public.teachers teacher on teacher.id = assignment.teacher_id
      and teacher.department_id = s.department_id
    join public.academic_classes class on class.id = assignment.class_id
      and class.department_id = s.department_id
    where s.id = requested_student and teacher.user_id = auth.uid()
      and teacher.status = 'active' and s.status = 'active'
      and class.status = 'active' and class.year = s.year
      and class.semester = s.semester and subject.semester = s.semester
      and class.name = nullif(to_jsonb(s)->>'class_name', '')
      and exists (select 1 from public.user_roles r
        where r.user_id = auth.uid() and r.department_id = s.department_id
          and r.role in ('teacher','hod','class_coordinator'))
  );
$$;

comment on function public.can_manage_attendance(uuid, uuid) is
  'Authorizes attendance only through an active exact-class subject assignment.';

commit;
