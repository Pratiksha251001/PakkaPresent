-- Permit secure attendance management for either exact-class or all-divisions assignments.
begin;

create or replace function public.can_manage_attendance(
  requested_student uuid, requested_subject uuid
) returns boolean language sql stable security definer
set search_path = pg_catalog as $$
  select exists (
    select 1
    from public.students s
    join public.subjects subject
      on subject.id = requested_subject
     and subject.department_id = s.department_id
     and subject.semester = s.semester
     and subject.institution_id = s.institution_id
    join public.teacher_subjects assignment
      on assignment.subject_id = subject.id
    join public.teachers teacher
      on teacher.id = assignment.teacher_id
     and teacher.user_id = auth.uid()
     and teacher.department_id = s.department_id
     and teacher.institution_id = s.institution_id
     and teacher.status = 'active'
    where s.id = requested_student
      and s.status = 'active'
      and s.institution_id = public.current_user_institution_id()
      and exists (
        select 1
        from public.user_roles role_record
        where role_record.user_id = auth.uid()
          and role_record.department_id = s.department_id
          and role_record.institution_id = s.institution_id
          and role_record.role in ('teacher', 'hod', 'class_coordinator')
      )
      and (
        (
          assignment.class_id is null
          and nullif(assignment.class_name, '') is null
        )
        or exists (
          select 1
          from public.academic_classes class_record
          where class_record.department_id = s.department_id
            and class_record.institution_id = s.institution_id
            and class_record.status = 'active'
            and class_record.semester = s.semester
            and (s.year is null or class_record.year = s.year)
            and class_record.name = nullif(to_jsonb(s) ->> 'class_name', '')
            and (
              class_record.id = assignment.class_id
              or (
                assignment.class_id is null
                and nullif(assignment.class_name, '') = class_record.name
              )
            )
        )
      )
  );
$$;

comment on function public.can_manage_attendance(uuid, uuid) is
  'Authorizes active institution-scoped faculty for exact-class or all-divisions subject assignments.';

commit;
