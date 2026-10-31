-- Roll back attendance class/division context only when no persisted values remain.
begin;

do $$
begin
  if exists (
    select 1 from public.attendance
    where class_id is not null or class_name is not null
  ) then
    raise exception 'Clear attendance class_id and class_name values before rollback';
  end if;
end $$;

drop index if exists public.attendance_class_id_idx;
alter table public.attendance drop constraint if exists attendance_class_id_fkey;
alter table public.attendance drop column if exists class_id;
alter table public.attendance drop column if exists class_name;
notify pgrst, 'reload schema';
commit;
