-- Read-only diagnostic. Review results before correcting historical attendance.
select
  attendance.id as attendance_id,
  attendance.date,
  attendance.status,
  attendance.institution_id,
  attendance.student_id,
  student.full_name as student_name,
  student.semester as student_semester,
  student.year as student_year,
  attendance.subject_id,
  subject.code as subject_code,
  subject.name as subject_name,
  subject.semester as subject_semester,
  attendance.class_id,
  attendance.class_name
from public.attendance attendance
join public.students student on student.id = attendance.student_id
join public.subjects subject on subject.id = attendance.subject_id
where student.semester is distinct from subject.semester
order by attendance.date, student.full_name, subject.code;
