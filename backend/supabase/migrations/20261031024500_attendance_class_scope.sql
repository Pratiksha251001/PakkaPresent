-- Add class/division context required by attendance persistence.
begin;

alter table public.attendance
  add column if not exists class_name text,
  add column if not exists class_id uuid;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.attendance'::regclass
      and conname = 'attendance_class_id_fkey'
  ) then
    alter table public.attendance
      add constraint attendance_class_id_fkey
      foreign key (class_id) references public.academic_classes(id) on delete set null;
  end if;
end $$;

create index if not exists attendance_class_id_idx
  on public.attendance(class_id);

comment on column public.attendance.class_name is 'Class or division label captured when attendance is marked.';
comment on column public.attendance.class_id is 'Optional academic class scope for the attendance record.';

notify pgrst, 'reload schema';
commit;
