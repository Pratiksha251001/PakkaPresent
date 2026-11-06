-- Repair HOD attendance authorization without weakening tenant isolation.
-- Backfill derived academic years for active and inactive student rows.
begin;

-- This administrative backfill runs through the Supabase Management API, which has
-- no application auth.uid() context. Disable only the verified tenant trigger for
-- this bounded update; transactional DDL restores it automatically on failure.
alter table public.students disable trigger enforce_immutable_institution_id;

update public.students
set year = ceiling(semester::numeric / 2)::integer
where year is null
  and semester between 1 and 8;

alter table public.students enable trigger enforce_immutable_institution_id;

create or replace function public.can_manage_attendance(
  requested_student uuid,
  requested_subject uuid
) returns boolean
language sql
stable
security definer
set search_path = pg_catalog
as $$
  select exists (
    select 1
    from public.students student
    join public.subjects subject
      on subject.id = requested_subject
     and subject.department_id = student.department_id
     and subject.semester = student.semester
     and subject.institution_id = student.institution_id
    where student.id = requested_student
      and student.status = 'active'
      and student.institution_id = public.current_user_institution_id()
      and exists (
        select 1
        from public.user_roles role_record
        where role_record.user_id = auth.uid()
          and role_record.institution_id = student.institution_id
          and role_record.department_id = student.department_id
          and (
            role_record.role = 'hod'
            or (
              role_record.role in ('teacher', 'class_coordinator')
              and exists (
                select 1
                from public.teachers teacher
                join public.teacher_subjects assignment
                  on assignment.teacher_id = teacher.id
                 and assignment.subject_id = subject.id
                where teacher.user_id = auth.uid()
                  and teacher.department_id = student.department_id
                  and teacher.institution_id = student.institution_id
                  and teacher.status = 'active'
                  and (
                    (
                      assignment.class_id is null
                      and nullif(assignment.class_name, '') is null
                    )
                    or exists (
                      select 1
                      from public.academic_classes class_record
                      where class_record.department_id = student.department_id
                        and class_record.institution_id = student.institution_id
                        and class_record.status = 'active'
                        and class_record.semester = student.semester
                        and class_record.year = ceiling(student.semester::numeric / 2)::integer
                        and class_record.name = nullif(to_jsonb(student) ->> 'class_name', '')
                        and (
                          class_record.id = assignment.class_id
                          or (
                            assignment.class_id is null
                            and nullif(assignment.class_name, '') = class_record.name
                          )
                        )
                    )
                  )
              )
            )
          )
      )
  );
$$;

revoke all on function public.can_manage_attendance(uuid, uuid) from public, anon;
grant execute on function public.can_manage_attendance(uuid, uuid) to authenticated;

comment on function public.can_manage_attendance(uuid, uuid) is
  'Allows institution-and-department-scoped HOD attendance management; teachers and coordinators remain subject/class-assignment scoped.';

notify pgrst, 'reload schema';
commit;
