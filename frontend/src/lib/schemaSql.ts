export const SUPABASE_SCHEMA_SQL = `-- ============================================================================
-- PakkaPresent Smart Attendance Management System
-- Supabase PostgreSQL Database Schema
-- Run this entire script in your Supabase SQL Editor (SQL Editor -> New Query -> Run)
-- ============================================================================

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- 1. Departments Table
create table if not exists public.departments (
  id uuid default uuid_generate_v4() primary key,
  name text not null,
  code text not null,
  institution_name text default 'PakkaPresent',
  hod_id uuid,
  status text not null default 'active' check (status in ('active', 'inactive')),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 2. Teachers Table
create table if not exists public.teachers (
  id uuid default uuid_generate_v4() primary key,
  employee_id text not null,
  full_name text not null,
  designation text,
  qualification text,
  date_of_birth date,
  experience_years text,
  email text unique,
  mobile text,
  password text,
  department_id uuid references public.departments(id) on delete set null,
  user_id uuid,
  is_class_coordinator boolean default false,
  year integer check (year between 1 and 4),
  assigned_year integer check (assigned_year between 1 and 4),
  assigned_semester integer check (assigned_semester between 1 and 8),
  role text not null default 'lecturer' check (role in ('hod', 'class_coordinator', 'lecturer')),
  status text not null default 'active' check (status in ('active', 'inactive')),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 3. Profiles Table
create table if not exists public.profiles (
  id uuid references auth.users on delete cascade primary key,
  full_name text not null,
  email text,
  avatar_url text,
  mobile text,
  must_change_password boolean not null default false,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 4. User Roles Table
create table if not exists public.user_roles (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users on delete cascade not null,
  role text not null check (role in ('admin', 'hod', 'teacher', 'class_coordinator', 'student')),
  department_id uuid references public.departments(id) on delete set null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique(user_id, role)
);

-- 5. Academic Classes
create table if not exists public.academic_classes (
  id uuid default uuid_generate_v4() primary key,
  name text not null,
  department_id uuid references public.departments(id) on delete cascade not null,
  year integer check (year between 1 and 4),
  semester integer not null check (semester between 1 and 8),
  coordinator_teacher_id uuid references public.teachers(id) on delete set null,
  status text not null default 'active' check (status in ('active', 'inactive')),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique(name, department_id)
);

-- 6. Class Coordinator Assignments Table (Supports mapping a single coordinator to multiple classes, years, and semesters concurrently)
create table if not exists public.class_coordinator_assignments (
  id uuid default uuid_generate_v4() primary key,
  teacher_id uuid references public.teachers(id) on delete cascade not null,
  department_id uuid references public.departments(id) on delete cascade not null,
  year integer check (year between 1 and 4),
  semester integer not null check (semester between 1 and 8),
  class_id uuid references public.academic_classes(id) on delete set null,
  class_name text,
  assigned_by uuid references auth.users(id) on delete set null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique(teacher_id, department_id, semester, class_name)
);

-- 7. Subjects Table
create table if not exists public.subjects (
  id uuid default uuid_generate_v4() primary key,
  code text not null,
  name text not null,
  department_id uuid references public.departments(id) on delete cascade,
  year integer check (year between 1 and 4),
  semester integer not null check (semester between 1 and 8),
  credits integer default 3,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 8. Teacher-Subject Assignments (Supports mapping a teacher to multiple subjects, years, semesters, and class divisions concurrently)
create table if not exists public.teacher_subjects (
  id uuid default uuid_generate_v4() primary key,
  teacher_id uuid references public.teachers(id) on delete cascade not null,
  subject_id uuid references public.subjects(id) on delete cascade not null,
  class_id uuid references public.academic_classes(id) on delete set null,
  class_name text,
  year integer check (year between 1 and 4),
  semester integer check (semester between 1 and 8),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique(teacher_id, subject_id, class_name)
);

-- 9. Students Table (Stores all student rosters and guardian contact numbers)
create table if not exists public.students (
  id uuid default uuid_generate_v4() primary key,
  roll_number text not null,
  prn_number text,
  reg_number text,
  class_name text,
  full_name text not null,
  department_id uuid references public.departments(id) on delete cascade,
  year integer check (year between 1 and 4),
  semester integer not null check (semester between 1 and 8),
  parent_name text,
  parent_mobile text not null,
  student_mobile text,
  email text,
  user_id uuid references auth.users(id) on delete set null,
  photo_url text,
  address text,
  date_of_birth date,
  gender text check (gender in ('male', 'female', 'other')),
  status text not null default 'active' check (status in ('active', 'inactive')),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 10. Attendance Records Table
create table if not exists public.attendance (
  id uuid default uuid_generate_v4() primary key,
  student_id uuid references public.students(id) on delete cascade not null,
  subject_id uuid references public.subjects(id) on delete cascade not null,
  class_name text,
  class_id uuid references public.academic_classes(id) on delete set null,
  date date not null,
  status text not null check (status in ('present', 'absent')),
  marked_by text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique(student_id, subject_id, date)
);

-- 11. SMS Logs Table
create table if not exists public.sms_logs (
  id uuid default uuid_generate_v4() primary key,
  student_id uuid references public.students(id) on delete set null,
  subject_id uuid references public.subjects(id) on delete set null,
  student_name text not null,
  parent_mobile text,
  recipient_email text,
  channel text not null default 'sms' check (channel in ('sms', 'email')),
  is_defaulter_alert boolean not null default false,
  attendance_rate integer check (attendance_rate is null or attendance_rate between 0 and 100),
  email_subject text,
  message text not null,
  status text not null check (status in ('sent', 'failed')),
  attendance_date date not null,
  language text default 'trilingual',
  gateway text,
  gateway_response text,
  sent_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 12. Notices Table
create table if not exists public.notices (
  id uuid default uuid_generate_v4() primary key,
  title text not null,
  message text not null,
  audience text not null check (audience in ('all', 'teachers', 'students', 'parents')),
  status text not null default 'draft' check (status in ('published', 'draft')),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- ============================================================================
-- Role-aware Row Level Security (RLS) policies
-- ============================================================================
-- PakkaPresent role-aware RLS hardening.
-- Validated in the isolated PakkaPresent-Integration-Test Supabase project.

alter table public.students add column if not exists class_name text;

alter table public.departments enable row level security;
alter table public.teachers enable row level security;
alter table public.profiles enable row level security;
alter table public.user_roles enable row level security;
alter table public.academic_classes enable row level security;
alter table public.class_coordinator_assignments enable row level security;
alter table public.subjects enable row level security;
alter table public.teacher_subjects enable row level security;
alter table public.attendance enable row level security;
alter table public.notices enable row level security;

revoke all privileges on table public.academic_classes, public.attendance,
  public.class_coordinator_assignments, public.departments, public.notices,
  public.profiles, public.subjects, public.teacher_subjects, public.teachers,
  public.user_roles from anon;


-- Remove legacy and replacement policies idempotently.
do $$ declare p record; begin
  for p in select schemaname,tablename,policyname from pg_policies
    where schemaname='public' and tablename in
      ('academic_classes','attendance','class_coordinator_assignments','departments',
       'notices','profiles','subjects','teacher_subjects','teachers','user_roles')
  loop execute format('drop policy %I on %I.%I',p.policyname,p.schemaname,p.tablename); end loop;
end $$;

-- Direct client role writes are forbidden; privileged backend provisioning is used.
revoke insert,update,delete on public.user_roles from authenticated;
create policy user_roles_read_own on public.user_roles for select to authenticated
  using (user_id=auth.uid());
create policy user_roles_admin_read on public.user_roles for select to authenticated
  using (public.current_user_has_role(array['admin']));

revoke update on public.profiles from public,anon,authenticated;
do $$ declare cols text; begin
  select string_agg(format('%I',attname),', ') into cols from pg_attribute
   where attrelid='public.profiles'::regclass and attnum>0 and not attisdropped;
  execute format('revoke update (%s) on public.profiles from public,anon,authenticated',cols);
end $$;
grant update(full_name,avatar_url,mobile,must_change_password) on public.profiles to authenticated;
create policy profiles_read_own on public.profiles for select to authenticated using(id=auth.uid());
create policy profiles_admin_read on public.profiles for select to authenticated
  using(public.current_user_has_role(array['admin']));
create policy profiles_update_own on public.profiles for update to authenticated
  using(id=auth.uid()) with check(id=auth.uid());

create policy departments_authenticated_read on public.departments for select to authenticated using(true);
create policy departments_admin_manage on public.departments for all to authenticated
  using(public.current_user_has_role(array['admin']))
  with check(public.current_user_has_role(array['admin']));

create policy teachers_read_by_role on public.teachers for select to authenticated using(
  public.current_user_has_role(array['admin']) or user_id=auth.uid() or
  (public.current_user_has_role(array['hod','class_coordinator'])
   and department_id=public.current_user_department_id()));
create policy teachers_manage_by_role on public.teachers for all to authenticated using(
  public.current_user_has_role(array['admin']) or
  (public.current_user_has_role(array['hod']) and department_id=public.current_user_department_id()))
  with check(public.current_user_has_role(array['admin']) or
  (public.current_user_has_role(array['hod']) and department_id=public.current_user_department_id()));

create policy classes_authenticated_read on public.academic_classes for select to authenticated using(true);
create policy classes_manage_by_role on public.academic_classes for all to authenticated using(
  public.current_user_has_role(array['admin']) or
  (public.current_user_has_role(array['hod','class_coordinator']) and department_id=public.current_user_department_id()))
  with check(public.current_user_has_role(array['admin']) or
  (public.current_user_has_role(array['hod','class_coordinator']) and department_id=public.current_user_department_id()));

create policy coordinator_assignments_read on public.class_coordinator_assignments for select to authenticated using(true);
create policy coordinator_assignments_manage on public.class_coordinator_assignments for all to authenticated using(
  public.current_user_has_role(array['admin']) or
  (public.current_user_has_role(array['hod']) and department_id=public.current_user_department_id()))
  with check(public.current_user_has_role(array['admin']) or
  (public.current_user_has_role(array['hod']) and department_id=public.current_user_department_id()));

create policy subjects_authenticated_read on public.subjects for select to authenticated using(true);
create policy subjects_manage_by_role on public.subjects for all to authenticated using(
  public.current_user_has_role(array['admin']) or
  (public.current_user_has_role(array['hod','class_coordinator']) and department_id=public.current_user_department_id()))
  with check(public.current_user_has_role(array['admin']) or
  (public.current_user_has_role(array['hod','class_coordinator']) and department_id=public.current_user_department_id()));

create policy teacher_subjects_read_by_role on public.teacher_subjects for select to authenticated using(
  public.current_user_has_role(array['admin']) or exists(select 1 from public.teachers t
   where t.id=teacher_subjects.teacher_id and (t.user_id=auth.uid() or
    (public.current_user_has_role(array['hod','class_coordinator']) and t.department_id=public.current_user_department_id()))));
create policy teacher_subjects_insert_by_role on public.teacher_subjects for insert to authenticated with check(
  public.current_user_has_role(array['admin']) or
  (public.current_user_has_role(array['hod','class_coordinator']) and exists(
    select 1 from public.teachers t join public.subjects s on s.id=teacher_subjects.subject_id
    where t.id=teacher_subjects.teacher_id and t.department_id=public.current_user_department_id()
      and s.department_id=public.current_user_department_id()) and
   (teacher_subjects.class_id is null or exists(select 1 from public.academic_classes c
     where c.id=teacher_subjects.class_id and c.department_id=public.current_user_department_id()))));
create policy teacher_subjects_update_by_role on public.teacher_subjects for update to authenticated using(
  public.current_user_has_role(array['admin']) or
  (public.current_user_has_role(array['hod','class_coordinator']) and exists(select 1 from public.teachers t
    where t.id=teacher_subjects.teacher_id and t.department_id=public.current_user_department_id())))
  with check(public.current_user_has_role(array['admin']) or
  (public.current_user_has_role(array['hod','class_coordinator']) and exists(
    select 1 from public.teachers t join public.subjects s on s.id=teacher_subjects.subject_id
    where t.id=teacher_subjects.teacher_id and t.department_id=public.current_user_department_id()
      and s.department_id=public.current_user_department_id()) and
   (teacher_subjects.class_id is null or exists(select 1 from public.academic_classes c
     where c.id=teacher_subjects.class_id and c.department_id=public.current_user_department_id()))));
create policy teacher_subjects_delete_by_role on public.teacher_subjects for delete to authenticated using(
  public.current_user_has_role(array['admin']) or
  (public.current_user_has_role(array['hod','class_coordinator']) and exists(select 1 from public.teachers t
    where t.id=teacher_subjects.teacher_id and t.department_id=public.current_user_department_id())));

create policy attendance_admin_manage on public.attendance for all to authenticated
 using(public.current_user_has_role(array['admin'])) with check(public.current_user_has_role(array['admin']));
create policy attendance_student_read on public.attendance for select to authenticated using(
  exists(select 1 from public.students s where s.id=attendance.student_id and s.user_id=auth.uid()));

create policy notices_published_read on public.notices for select to authenticated using(status='published');
create policy notices_admin_manage on public.notices for all to authenticated
 using(public.current_user_has_role(array['admin'])) with check(public.current_user_has_role(array['admin']));

-- Ensure columns exist if tables were created previously
alter table public.profiles add column if not exists must_change_password boolean not null default false;
alter table public.academic_classes add column if not exists year integer check (year between 1 and 4);
alter table public.teacher_subjects add column if not exists class_id uuid references public.academic_classes(id) on delete set null;
alter table public.students add column if not exists year integer check (year between 1 and 4);
alter table public.teachers add column if not exists designation text;
alter table public.teachers add column if not exists qualification text;
alter table public.teachers add column if not exists date_of_birth date;
alter table public.teachers add column if not exists experience_years text;
alter table public.teachers add column if not exists password text;
alter table public.teachers add column if not exists year integer;
alter table public.teachers add column if not exists assigned_year integer;
alter table public.academic_classes add column if not exists coordinator_teacher_id uuid references public.teachers(id) on delete set null;


-- Multi-institution Phase 1 baseline compatibility
create table if not exists public.institutions (
  id uuid default uuid_generate_v4() primary key,
  official_name text not null,
  display_name text not null,
  code text not null,
  dte_code text,
  city text,
  district text,
  state text,
  country text not null default 'India',
  status text not null default 'active' check (status in ('pending', 'active', 'inactive', 'suspended')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint institutions_code_nonempty check (btrim(code) <> ''),
  constraint institutions_official_name_nonempty check (btrim(official_name) <> ''),
  constraint institutions_display_name_nonempty check (btrim(display_name) <> '')
);
create unique index if not exists institutions_code_unique_ci on public.institutions (lower(code));
create unique index if not exists institutions_dte_code_unique on public.institutions (dte_code) where dte_code is not null;
do $$
declare matches integer; conflicting integer;
begin
  select count(*) into matches from public.institutions where id = '6f5f8c70-8b95-5f20-a567-43f379c38ec8'::uuid or lower(code) = 'mitcorer' or dte_code = '06901';
  select count(*) into conflicting from public.institutions where (lower(code) = 'mitcorer' or dte_code = '06901') and id <> '6f5f8c70-8b95-5f20-a567-43f379c38ec8'::uuid;
  if conflicting > 0 or matches > 1 then raise exception 'Baseline refused: conflicting MITCORER identity'; end if;
  if exists (select 1 from public.institutions where id = '6f5f8c70-8b95-5f20-a567-43f379c38ec8'::uuid and (lower(code) <> 'mitcorer' or dte_code is distinct from '06901')) then
    raise exception 'Baseline refused: fixed MITCORER id has conflicting identity';
  end if;
end $$;
insert into public.institutions (id, official_name, display_name, code, dte_code, city, district, state, country, status)
values ('6f5f8c70-8b95-5f20-a567-43f379c38ec8'::uuid, 'MAEER''s MIT College of Railway Engineering and Research, Barshi', 'MITCORER Barshi', 'MITCORER', '06901', 'Barshi', 'Solapur', 'Maharashtra', 'India', 'active')
on conflict (id) do update set official_name = excluded.official_name, display_name = excluded.display_name, code = excluded.code, dte_code = excluded.dte_code, city = excluded.city, district = excluded.district, state = excluded.state, country = excluded.country, status = excluded.status, updated_at = now();
alter table public.departments add column if not exists institution_id uuid not null references public.institutions(id) on delete restrict;
create index if not exists departments_institution_id_idx on public.departments (institution_id);
alter table public.profiles add column if not exists institution_id uuid not null references public.institutions(id) on delete restrict;
create index if not exists profiles_institution_id_idx on public.profiles (institution_id);
alter table public.user_roles add column if not exists institution_id uuid not null references public.institutions(id) on delete restrict;
create index if not exists user_roles_institution_id_idx on public.user_roles (institution_id);
alter table public.teachers add column if not exists institution_id uuid not null references public.institutions(id) on delete restrict;
create index if not exists teachers_institution_id_idx on public.teachers (institution_id);
alter table public.students add column if not exists institution_id uuid not null references public.institutions(id) on delete restrict;
create index if not exists students_institution_id_idx on public.students (institution_id);
alter table public.academic_classes add column if not exists institution_id uuid not null references public.institutions(id) on delete restrict;
create index if not exists academic_classes_institution_id_idx on public.academic_classes (institution_id);
alter table public.class_coordinator_assignments add column if not exists institution_id uuid not null references public.institutions(id) on delete restrict;
create index if not exists class_coordinator_assignments_institution_id_idx on public.class_coordinator_assignments (institution_id);
alter table public.subjects add column if not exists institution_id uuid not null references public.institutions(id) on delete restrict;
create index if not exists subjects_institution_id_idx on public.subjects (institution_id);
alter table public.teacher_subjects add column if not exists institution_id uuid not null references public.institutions(id) on delete restrict;
create index if not exists teacher_subjects_institution_id_idx on public.teacher_subjects (institution_id);
alter table public.attendance add column if not exists institution_id uuid not null references public.institutions(id) on delete restrict;
create index if not exists attendance_institution_id_idx on public.attendance (institution_id);
alter table public.notices add column if not exists institution_id uuid not null references public.institutions(id) on delete restrict;
create index if not exists notices_institution_id_idx on public.notices (institution_id);
alter table public.sms_logs add column if not exists institution_id uuid not null references public.institutions(id) on delete restrict;
create index if not exists sms_logs_institution_id_idx on public.sms_logs (institution_id);
update public.departments set institution_name = 'MITCORER Barshi' where institution_name is distinct from 'MITCORER Barshi';
comment on column public.departments.institution_name is 'Compatibility display field; institution_id is authoritative.';
drop index if exists public.one_admin_per_institution;
create unique index if not exists one_admin_per_institution on public.user_roles (institution_id) where role = 'admin';
create unique index if not exists departments_institution_code_key on public.departments (institution_id, code);
create unique index if not exists teachers_institution_employee_id_key on public.teachers (institution_id, employee_id);
create unique index if not exists students_institution_roll_number_key on public.students (institution_id, roll_number);
create unique index if not exists subjects_institution_code_key on public.subjects (institution_id, code);
alter table public.institutions enable row level security;
revoke all on public.institutions from anon, authenticated;
comment on table public.institutions is 'Institution ownership registry. New institutions are created only by the trusted onboarding backend.';

-- Ensure single institutional admin index
-- Replaced below by institution-scoped admin uniqueness.

-- Enable realtime updates for staff and department screens.
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime')
     and not exists (
       select 1 from pg_publication_tables
       where pubname = 'supabase_realtime'
         and schemaname = 'public'
         and tablename = 'teachers'
     ) then
    alter publication supabase_realtime add table public.teachers;
  end if;
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime')
     and not exists (
       select 1 from pg_publication_tables
       where pubname = 'supabase_realtime'
         and schemaname = 'public'
         and tablename = 'departments'
     ) then
    alter publication supabase_realtime add table public.departments;
  end if;
end $$;

-- Enable tenant-owned operational tables in Supabase Realtime.
do $$
declare realtime_table text;
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    foreach realtime_table in array array[
      'departments','teachers','students','academic_classes',
      'class_coordinator_assignments','subjects','teacher_subjects',
      'attendance','notices','sms_logs'
    ] loop
      if not exists (
        select 1 from pg_publication_tables
        where pubname='supabase_realtime' and schemaname='public'
          and tablename=realtime_table
      ) then
        execute format('alter publication supabase_realtime add table public.%I', realtime_table);
      end if;
    end loop;
  end if;
end $$;
-- Parent notification ledger compatibility and institution-scoped RPCs
create table if not exists public.parent_notification_attempts (
  student_id uuid not null references public.students(id) on delete cascade,
  kind text not null check(kind in ('daily_attendance','low_attendance')),
  notice_date date not null,
  recipient_email text not null,
  status text not null check(status in ('claimed','provider_accepted','provider_rejected','unknown')),
  created_at timestamptz not null default now(), completed_at timestamptz,
  institution_id uuid not null references public.institutions(id) on delete restrict,
  primary key(student_id,kind,notice_date)
);
alter table public.parent_notification_attempts add column if not exists institution_id uuid references public.institutions(id) on delete restrict;
update public.parent_notification_attempts a set institution_id=s.institution_id
from public.students s where s.id=a.student_id and a.institution_id is null;
do $$ begin
  if exists(select 1 from public.parent_notification_attempts where institution_id is null) then
    raise exception 'Parent notification attempts contain rows without institution ownership.';
  end if;
end $$;
alter table public.parent_notification_attempts alter column institution_id set not null;
create index if not exists parent_notification_attempts_institution_id_idx on public.parent_notification_attempts(institution_id);
alter table public.parent_notification_attempts enable row level security;
revoke all on public.parent_notification_attempts from public,anon,authenticated;

-- Institution-scoped parent notification ledger RPCs
create or replace function public.claim_parent_notification(
  p_student_id uuid, p_kind text, p_date date, p_recipient text
) returns boolean language plpgsql security definer set search_path = '' as $$
declare stored_email text; approved_at timestamptz; student_institution uuid;
begin
  if p_kind not in ('daily_attendance','low_attendance') or p_date is null then return false; end if;
  select parent_email,parent_email_approved_at,institution_id
    into stored_email,approved_at,student_institution
    from public.students where id=p_student_id for update;
  if student_institution is null or approved_at is null or stored_email is null
     or lower(btrim(stored_email)) <> lower(btrim(p_recipient)) then return false; end if;
  insert into public.parent_notification_attempts(
    student_id,kind,notice_date,recipient_email,status,institution_id
  ) values (
    p_student_id,p_kind,p_date,lower(btrim(p_recipient)),'claimed',student_institution
  ) on conflict do nothing;
  return found;
end;$$;
create or replace function public.complete_parent_notification(
  p_student_id uuid,p_kind text,p_date date,p_status text
) returns boolean language plpgsql security definer set search_path = '' as $$
declare student_institution uuid;
begin
  if p_status not in ('provider_accepted','provider_rejected','unknown') then return false; end if;
  select institution_id into student_institution from public.students where id=p_student_id;
  if student_institution is null then return false; end if;
  update public.parent_notification_attempts set status=p_status,completed_at=now()
   where student_id=p_student_id and institution_id=student_institution
     and kind=p_kind and notice_date=p_date and status='claimed';
  return found;
end;$$;
revoke all on function public.claim_parent_notification(uuid,text,date,text) from public,anon,authenticated;
revoke all on function public.complete_parent_notification(uuid,text,date,text) from public,anon,authenticated;
grant execute on function public.claim_parent_notification(uuid,text,date,text) to service_role;
grant execute on function public.complete_parent_notification(uuid,text,date,text) to service_role;

-- Multi-institution Phase 4A onboarding schema foundation
-- Tenant ownership remains mandatory, but no table silently defaults to MITCORER.
do $$ declare t text; begin
  foreach t in array array['departments', 'profiles', 'user_roles', 'teachers', 'students', 'academic_classes', 'class_coordinator_assignments', 'subjects', 'teacher_subjects', 'attendance', 'notices', 'sms_logs', 'parent_notification_attempts'] loop
    execute format('alter table public.%I alter column institution_id drop default', t);
  end loop;
end $$;
create table if not exists public.institution_onboarding_attempts (
  request_id uuid primary key default uuid_generate_v4(),
  institution_id uuid references public.institutions(id) on delete set null,
  administrator_user_id uuid references auth.users(id) on delete set null,
  administrator_email_digest text,
  status text not null check (status in ('started','completed','failed','recovery_required')),
  failure_phase text, created_at timestamptz not null default now(), completed_at timestamptz,
  constraint institution_onboarding_email_digest_format check (administrator_email_digest is null or administrator_email_digest ~ '^[a-f0-9]{64}$')
);
alter table public.institution_onboarding_attempts enable row level security;
revoke all on public.institution_onboarding_attempts from public, anon, authenticated;
grant select, insert, update, delete on public.institution_onboarding_attempts to service_role;
comment on table public.institution_onboarding_attempts is 'Service-role-only onboarding recovery ledger. Passwords and onboarding tokens must never be stored.';
comment on table public.institutions is 'Institution ownership registry. New institutions are created only by the trusted onboarding backend.';
-- Multi-institution Phase 4E2 institution access-request ledger
create table if not exists public.institution_access_requests (
 id uuid primary key default uuid_generate_v4(), institution_name text not null,
 institution_type text not null check (institution_type in ('college','university','school','training institute','other')),
 institution_code text, dte_code text, contact_name text not null, designation text not null,
 official_email text not null, phone text not null, city text not null, state text not null,
 student_count integer check (student_count is null or student_count between 1 and 10000000),
 message text not null, consent_to_contact boolean not null check (consent_to_contact),
 consented_at timestamptz not null, status text not null default 'pending' check (status in ('pending','contacted','approved','rejected','expired','onboarding','onboarded')),
 review_notes text, created_at timestamptz not null default now(), reviewed_at timestamptz, approved_at timestamptz, rejected_at timestamptz,
 constraint institution_access_requests_name_length check (char_length(institution_name) between 2 and 200),
 constraint institution_access_requests_email_normalized check (official_email=lower(btrim(official_email))),
 constraint institution_access_requests_message_length check (char_length(message) between 10 and 2000)
);
create index if not exists institution_access_requests_status_created_idx on public.institution_access_requests(status,created_at desc);
create index if not exists institution_access_requests_duplicate_idx on public.institution_access_requests(official_email,institution_name,created_at desc);
alter table public.institution_access_requests enable row level security;
revoke all on public.institution_access_requests from public, anon, authenticated;
grant select, insert, update, delete on public.institution_access_requests to service_role;
comment on table public.institution_access_requests is 'Service-role-only public institution access request ledger. Stores no passwords, invitation credentials, or client IP addresses.';

-- Multi-institution Phase 4E3 invitation authorization
create table if not exists public.institution_onboarding_invitations (
  id uuid primary key default uuid_generate_v4(),
  request_id uuid not null references public.institution_access_requests(id) on delete restrict,
  token_digest text not null,
  code_digest text not null,
  status text not null default 'active' check (status in ('active','consumed','revoked','expired','recovery_required')),
  expires_at timestamptz not null,
  created_at timestamptz not null default now(),
  consumed_at timestamptz,
  revoked_at timestamptz,
  institution_id uuid references public.institutions(id) on delete set null,
  constraint institution_onboarding_invitation_token_digest_format check (token_digest ~ '^[a-f0-9]{64}$'),
  constraint institution_onboarding_invitation_code_digest_format check (code_digest ~ '^[a-f0-9]{64}$'),
  constraint institution_onboarding_invitation_expiry check (expires_at > created_at)
);
create unique index if not exists institution_onboarding_invitations_token_digest_key on public.institution_onboarding_invitations(token_digest);
create unique index if not exists institution_onboarding_invitations_code_digest_key on public.institution_onboarding_invitations(code_digest);
create unique index if not exists institution_onboarding_invitations_one_active_per_request on public.institution_onboarding_invitations(request_id) where status = 'active';
create index if not exists institution_onboarding_invitations_status_expiry_idx on public.institution_onboarding_invitations(status, expires_at);
alter table public.institution_onboarding_invitations enable row level security;
revoke all on public.institution_onboarding_invitations from public, anon, authenticated;
grant select, insert, update, delete on public.institution_onboarding_invitations to service_role;
comment on table public.institution_onboarding_invitations is 'Service-role-only invitation authorization. Stores SHA-256 digests only; plain invitation credentials must never be persisted.';

create or replace function public.approve_institution_access_request(
  target_request_id uuid,
  invitation_token_digest text,
  onboarding_code_digest text,
  invitation_expires_at timestamptz
) returns table(invitation_id uuid)
language plpgsql security definer set search_path = public
as $$
declare current_status text; new_invitation_id uuid;
begin
  if auth.role() <> 'service_role' then raise exception using errcode='42501', message='Service role required'; end if;
  if invitation_token_digest !~ '^[a-f0-9]{64}$' or onboarding_code_digest !~ '^[a-f0-9]{64}$' then
    raise exception using errcode='22023', message='Invalid invitation digest';
  end if;
  if invitation_expires_at <= now() then raise exception using errcode='22023', message='Invitation expiry must be in the future'; end if;
  select status into current_status from public.institution_access_requests where id=target_request_id for update;
  if not found then raise exception using errcode='P0002', message='Access request not found.'; end if;
  if current_status not in ('pending','contacted') then raise exception using errcode='P0001', message='Access request is not eligible for approval.'; end if;
  insert into public.institution_onboarding_invitations(request_id,token_digest,code_digest,expires_at)
    values(target_request_id,invitation_token_digest,onboarding_code_digest,invitation_expires_at)
    returning id into new_invitation_id;
  update public.institution_access_requests set status='approved', reviewed_at=coalesce(reviewed_at,now()), approved_at=now(), rejected_at=null where id=target_request_id;
  return query select new_invitation_id;
end $$;
revoke all on function public.approve_institution_access_request(uuid,text,text,timestamptz) from public, anon, authenticated;
grant execute on function public.approve_institution_access_request(uuid,text,text,timestamptz) to service_role;

-- Multi-institution Phase 4E4 invitation-bound onboarding
alter table public.institution_onboarding_invitations drop constraint if exists institution_onboarding_invitations_status_check;
alter table public.institution_onboarding_invitations add constraint institution_onboarding_invitations_status_check check (status in ('active','onboarding','consumed','revoked','expired','recovery_required'));
create or replace function public.reserve_institution_onboarding(invitation_token_digest text,onboarding_code_digest text)
returns table(invitation_id uuid,request_id uuid,institution_name text,institution_code text,dte_code text,official_email text)
language plpgsql security definer set search_path=public as $$
declare row_inv public.institution_onboarding_invitations%rowtype; transitioned_request_id uuid;
begin
 if auth.role()<>'service_role' then raise exception using errcode='42501',message='Service role required'; end if;
 select * into row_inv from public.institution_onboarding_invitations where token_digest=invitation_token_digest for update;
 if not found or row_inv.code_digest<>onboarding_code_digest then raise exception using errcode='P0002',message='Invalid onboarding invitation.'; end if;
 if row_inv.status<>'active' then raise exception using errcode='P0001',message='Onboarding invitation is not active.'; end if;
 if row_inv.expires_at<=now() then raise exception using errcode='P0001',message='Onboarding invitation has expired.'; end if;
 update public.institution_access_requests set status='onboarding' where id=row_inv.request_id and status='approved' returning id into transitioned_request_id;
 if transitioned_request_id is null then raise exception using errcode='P0001',message='Access request is no longer approved for onboarding.'; end if;
 update public.institution_onboarding_invitations set status='onboarding' where id=row_inv.id and status='active';
 if not found then raise exception using errcode='P0001',message='Onboarding invitation is no longer active.'; end if;
 return query select row_inv.id,r.id,r.institution_name,r.institution_code,r.dte_code,r.official_email from public.institution_access_requests r where r.id=transitioned_request_id;
end $$;
create or replace function public.complete_institution_onboarding(target_invitation_id uuid,target_institution_id uuid)
returns void language plpgsql security definer set search_path=public as $$ declare rid uuid; transitioned_request_id uuid; begin
 if auth.role()<>'service_role' then raise exception using errcode='42501',message='Service role required'; end if;
 select request_id into rid from public.institution_onboarding_invitations where id=target_invitation_id and status='onboarding' for update;
 if rid is null then raise exception using errcode='P0001',message='Invitation reservation is no longer valid.'; end if;
 update public.institution_access_requests set status='onboarded' where id=rid and status='onboarding' returning id into transitioned_request_id;
 if transitioned_request_id is null then raise exception using errcode='P0001',message='Access request is no longer in onboarding.'; end if;
 update public.institution_onboarding_invitations set status='consumed',consumed_at=now(),institution_id=target_institution_id where id=target_invitation_id and status='onboarding';
 if not found then raise exception using errcode='P0001',message='Invitation reservation is no longer valid.'; end if;
end $$;
create or replace function public.release_institution_onboarding(target_invitation_id uuid,recovery_required boolean)
returns void language plpgsql security definer set search_path=public as $$ declare rid uuid; begin
 if auth.role()<>'service_role' then raise exception using errcode='42501',message='Service role required'; end if;
 update public.institution_onboarding_invitations set status=case when recovery_required then 'recovery_required' else 'active' end where id=target_invitation_id and status='onboarding' returning request_id into rid;
 if rid is not null then update public.institution_access_requests set status=case when recovery_required then 'onboarding' else 'approved' end where id=rid; end if;
end $$;
revoke all on function public.reserve_institution_onboarding(text,text),public.complete_institution_onboarding(uuid,uuid),public.release_institution_onboarding(uuid,boolean) from public,anon,authenticated;
grant execute on function public.reserve_institution_onboarding(text,text),public.complete_institution_onboarding(uuid,uuid),public.release_institution_onboarding(uuid,boolean) to service_role;

-- Multi-institution Phase 2A restrictive tenant security
create or replace function public.current_user_institution_id()
returns uuid language sql stable security definer set search_path = public
as $$ select institution_id from public.user_roles where user_id = auth.uid() order by created_at asc limit 1 $$;
revoke all on function public.current_user_institution_id() from public, anon;
grant execute on function public.current_user_institution_id() to authenticated;

-- Attendance authorization depends on tenant columns and the institution helper above.
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
revoke all on function public.can_manage_attendance(uuid,uuid) from public,anon;
grant execute on function public.can_manage_attendance(uuid,uuid) to authenticated;

create policy attendance_assigned_teacher_read on public.attendance for select to authenticated
  using(public.can_manage_attendance(student_id,subject_id));
create policy attendance_assigned_teacher_insert on public.attendance for insert to authenticated
  with check(public.can_manage_attendance(student_id,subject_id));
create policy attendance_assigned_teacher_update on public.attendance for update to authenticated
  using(public.can_manage_attendance(student_id,subject_id))
  with check(public.can_manage_attendance(student_id,subject_id));

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

-- Phase 6B institution branding
begin;

alter table public.institutions
  add column if not exists logo_path text,
  add column if not exists logo_updated_at timestamptz,
  add column if not exists logo_updated_by uuid references auth.users(id) on delete set null;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('institution-assets','institution-assets',false,2097152,array['image/png','image/jpeg','image/webp'])
on conflict (id) do update set public=false,file_size_limit=excluded.file_size_limit,allowed_mime_types=excluded.allowed_mime_types;

create or replace function public.is_current_user_institution_admin() returns boolean
language sql stable security definer set search_path=public as $$
 select exists(select 1 from public.user_roles ur where ur.user_id=auth.uid() and ur.role='admin' and ur.institution_id=public.current_user_institution_id());
$$;
revoke all on function public.is_current_user_institution_admin() from public;
grant execute on function public.is_current_user_institution_admin() to authenticated;

drop policy if exists institution_assets_read_own on storage.objects;
create policy institution_assets_read_own on storage.objects for select to authenticated using (bucket_id='institution-assets' and (storage.foldername(name))[1]=public.current_user_institution_id()::text);
drop policy if exists institution_assets_admin_insert_own on storage.objects;
create policy institution_assets_admin_insert_own on storage.objects for insert to authenticated with check (bucket_id='institution-assets' and public.is_current_user_institution_admin() and (storage.foldername(name))[1]=public.current_user_institution_id()::text and name ~ ('^'||public.current_user_institution_id()::text||'/logo\.(png|jpg|jpeg|webp)$'));
drop policy if exists institution_assets_admin_update_own on storage.objects;
create policy institution_assets_admin_update_own on storage.objects for update to authenticated using (bucket_id='institution-assets' and public.is_current_user_institution_admin() and (storage.foldername(name))[1]=public.current_user_institution_id()::text) with check (bucket_id='institution-assets' and public.is_current_user_institution_admin() and (storage.foldername(name))[1]=public.current_user_institution_id()::text);
drop policy if exists institution_assets_admin_delete_own on storage.objects;
create policy institution_assets_admin_delete_own on storage.objects for delete to authenticated using (bucket_id='institution-assets' and public.is_current_user_institution_admin() and (storage.foldername(name))[1]=public.current_user_institution_id()::text);

create or replace function public.update_own_institution_logo(p_logo_path text) returns public.institutions
language plpgsql security definer set search_path=public,storage as $$
declare v_id uuid:=public.current_user_institution_id(); v_row public.institutions;
begin
 if auth.uid() is null or v_id is null or not public.is_current_user_institution_admin() then raise exception 'not authorized'; end if;
 if p_logo_path is not null and p_logo_path !~ ('^'||v_id::text||'/logo\.(png|jpg|jpeg|webp)$') then raise exception 'invalid logo path'; end if;
 update public.institutions set logo_path=p_logo_path,logo_updated_at=now(),logo_updated_by=auth.uid() where id=v_id returning * into v_row;
 return v_row;
end;$$;
revoke all on function public.update_own_institution_logo(text) from public;
grant execute on function public.update_own_institution_logo(text) to authenticated;
commit;

-- Phase 7A Super Admin foundation
begin;

-- Phase 7A: explicit platform-level Super Admin identity.
alter table public.profiles alter column institution_id drop not null;
alter table public.user_roles alter column institution_id drop not null;

-- Replace the generated role check without assuming its name.
do $$
declare constraint_record record;
begin
  for constraint_record in
    select c.conname
    from pg_constraint c
    join pg_class t on t.oid=c.conrelid
    join pg_namespace n on n.oid=t.relnamespace
    where n.nspname='public' and t.relname='user_roles' and c.contype='c'
      and pg_get_constraintdef(c.oid) ilike '%role%admin%student%'
  loop
    execute format('alter table public.user_roles drop constraint %I',constraint_record.conname);
  end loop;
end $$;

-- Permit safe re-execution by replacing only the named Phase 7A constraints.
alter table public.user_roles
  drop constraint if exists user_roles_role_allowed,
  drop constraint if exists user_roles_scope_valid;

alter table public.user_roles
  add constraint user_roles_role_allowed check (role in ('super_admin','admin','hod','teacher','class_coordinator','student')),
  add constraint user_roles_scope_valid check (
    (role='super_admin' and institution_id is null and department_id is null)
    or
    (role<>'super_admin' and institution_id is not null)
  );

create or replace function public.enforce_platform_profile_scope()
returns trigger language plpgsql security definer set search_path=public as $$
begin
  if new.institution_id is null and not exists (
    select 1 from public.user_roles ur
    where ur.user_id=new.id and ur.role='super_admin'
      and ur.institution_id is null and ur.department_id is null
  ) then
    raise exception 'A null profile institution requires an explicit platform-scoped super_admin role';
  end if;
  return new;
end $$;
revoke all on function public.enforce_platform_profile_scope() from public,anon,authenticated;
drop trigger if exists enforce_platform_profile_scope on public.profiles;
create trigger enforce_platform_profile_scope
before insert or update of institution_id on public.profiles
for each row execute function public.enforce_platform_profile_scope();

create unique index if not exists one_super_admin_role_per_user
  on public.user_roles(user_id) where role='super_admin';

create or replace function public.is_current_user_super_admin() returns boolean
language sql stable security definer set search_path=public as $$
  select exists(
    select 1 from public.user_roles ur
    where ur.user_id=auth.uid() and ur.role='super_admin'
      and ur.institution_id is null and ur.department_id is null
  );
$$;
revoke all on function public.is_current_user_super_admin() from public;
grant execute on function public.is_current_user_super_admin() to authenticated;

create or replace function public.current_platform_identity()
returns table(user_id uuid, email text, full_name text, role text)
language sql stable security definer set search_path=public,auth as $$
  select u.id, u.email::text, p.full_name, ur.role
  from auth.users u
  join public.profiles p on p.id=u.id
  join public.user_roles ur on ur.user_id=u.id
  where u.id=auth.uid() and ur.role='super_admin'
    and ur.institution_id is null and ur.department_id is null
  limit 1;
$$;
revoke all on function public.current_platform_identity() from public;
grant execute on function public.current_platform_identity() to authenticated;

comment on function public.is_current_user_super_admin() is 'Returns true only for an explicit platform-scoped super_admin role.';
comment on function public.current_platform_identity() is 'Returns the authenticated platform identity without granting institution scope.';
commit;

-- Phase 7B read-only platform metrics and institution directory
begin;

create or replace function public.platform_dashboard_metrics()
returns table(
  total_institutions bigint,
  pending_institutions bigint,
  active_institutions bigint,
  inactive_institutions bigint,
  suspended_institutions bigint,
  pending_access_requests bigint,
  approved_access_requests bigint,
  onboarding_access_requests bigint,
  active_invitations bigint,
  expired_invitations bigint,
  recovery_required_invitations bigint,
  recovery_required_attempts bigint
)
language plpgsql stable security definer set search_path = pg_catalog
as $$
begin
  if not public.is_current_user_super_admin() then
    raise exception using errcode = '42501', message = 'Platform read access requires an explicit super_admin role.';
  end if;
  return query
  select
    count(*)::bigint,
    count(*) filter (where i.status = 'pending')::bigint,
    count(*) filter (where i.status = 'active')::bigint,
    count(*) filter (where i.status = 'inactive')::bigint,
    count(*) filter (where i.status = 'suspended')::bigint,
    (select count(*) from public.institution_access_requests r where r.status = 'pending')::bigint,
    (select count(*) from public.institution_access_requests r where r.status = 'approved')::bigint,
    (select count(*) from public.institution_access_requests r where r.status = 'onboarding')::bigint,
    (select count(*) from public.institution_onboarding_invitations v where v.status = 'active' and v.expires_at > now())::bigint,
    (select count(*) from public.institution_onboarding_invitations v where v.status = 'expired' or (v.status = 'active' and v.expires_at <= now()))::bigint,
    (select count(*) from public.institution_onboarding_invitations v where v.status = 'recovery_required')::bigint,
    (select count(*) from public.institution_onboarding_attempts a where a.status = 'recovery_required')::bigint
  from public.institutions i;
end;
$$;

create or replace function public.platform_list_institutions(
  search_text text default null,
  status_filter text default null,
  page_limit integer default 25,
  page_offset integer default 0
)
returns table(
  institution_id uuid, official_name text, display_name text, institution_code text,
  dte_code text, city text, district text, state text, country text, status text,
  logo_configured boolean, admin_count bigint, created_at timestamptz,
  updated_at timestamptz, total_count bigint
)
language plpgsql stable security definer set search_path = pg_catalog
as $$
declare normalized_search text := nullif(btrim(search_text), '');
begin
  if not public.is_current_user_super_admin() then
    raise exception using errcode = '42501', message = 'Platform read access requires an explicit super_admin role.';
  end if;
  if status_filter is not null and status_filter not in ('pending','active','inactive','suspended') then
    raise exception using errcode = '22023', message = 'Invalid institution status filter.';
  end if;
  if page_limit < 1 or page_limit > 100 or page_offset < 0 then
    raise exception using errcode = '22023', message = 'Invalid platform directory pagination.';
  end if;
  return query
  select i.id, i.official_name, i.display_name, i.code, i.dte_code, i.city,
    i.district, i.state, i.country, i.status, i.logo_path is not null,
    (select count(*) from public.user_roles ur where ur.institution_id=i.id and ur.role='admin')::bigint,
    i.created_at, i.updated_at, count(*) over()::bigint
  from public.institutions i
  where (status_filter is null or i.status=status_filter)
    and (normalized_search is null or concat_ws(' ',i.official_name,i.display_name,i.code,i.dte_code,i.city,i.district,i.state) ilike '%'||normalized_search||'%')
  order by lower(i.display_name), i.id
  limit page_limit offset page_offset;
end;
$$;

create or replace function public.platform_get_institution(requested_institution_id uuid)
returns table(
  institution_id uuid, official_name text, display_name text, institution_code text,
  dte_code text, city text, district text, state text, country text, status text,
  logo_path text, logo_updated_at timestamptz, created_at timestamptz, updated_at timestamptz,
  admin_count bigint, has_institution_admin boolean, access_request_status text,
  official_email text, invitation_status text, invitation_expires_at timestamptz,
  onboarding_status text, onboarding_failure_phase text
)
language plpgsql stable security definer set search_path = pg_catalog
as $$
begin
  if not public.is_current_user_super_admin() then
    raise exception using errcode = '42501', message = 'Platform read access requires an explicit super_admin role.';
  end if;
  return query
  select i.id, i.official_name, i.display_name, i.code, i.dte_code, i.city,
    i.district, i.state, i.country, i.status, i.logo_path, i.logo_updated_at,
    i.created_at, i.updated_at, coalesce(admins.admin_count,0),
    coalesce(admins.admin_count,0)>0, request_row.status, request_row.official_email,
    invitation_row.status, invitation_row.expires_at, attempt_row.status, attempt_row.failure_phase
  from public.institutions i
  left join lateral (
    select count(*)::bigint admin_count from public.user_roles ur
    where ur.institution_id=i.id and ur.role='admin'
  ) admins on true
  left join lateral (
    select r.status, r.official_email
    from public.institution_onboarding_invitations v
    join public.institution_access_requests r on r.id=v.request_id
    where v.institution_id=i.id order by v.created_at desc limit 1
  ) request_row on true
  left join lateral (
    select v.status, v.expires_at from public.institution_onboarding_invitations v
    where v.institution_id=i.id order by v.created_at desc limit 1
  ) invitation_row on true
  left join lateral (
    select a.status, a.failure_phase from public.institution_onboarding_attempts a
    where a.institution_id=i.id order by a.created_at desc limit 1
  ) attempt_row on true
  where i.id=requested_institution_id;
end;
$$;

revoke all on function public.platform_dashboard_metrics() from public, anon;
revoke all on function public.platform_list_institutions(text,text,integer,integer) from public, anon;
revoke all on function public.platform_get_institution(uuid) from public, anon;
grant execute on function public.platform_dashboard_metrics() to authenticated;
grant execute on function public.platform_list_institutions(text,text,integer,integer) to authenticated;
grant execute on function public.platform_get_institution(uuid) to authenticated;

comment on function public.platform_dashboard_metrics() is 'Read-only platform metrics for explicit super_admin identities.';
comment on function public.platform_list_institutions(text,text,integer,integer) is 'Bounded read-only institution directory for explicit super_admin identities.';
comment on function public.platform_get_institution(uuid) is 'Read-only institution detail without invitation or administrator credential digests.';
commit;

-- Phase 7C access-request and invitation operations
begin;
do $$ begin
 if to_regprocedure('public.is_current_user_super_admin()') is null then raise exception 'Phase 7C refused: Phase 7A authorization foundation is missing'; end if;
 if to_regclass('public.institution_access_requests') is null or to_regclass('public.institution_onboarding_invitations') is null then raise exception 'Phase 7C refused: request or invitation ledger is missing'; end if;
end $$;
create or replace function public.platform_list_access_requests(search_text text default null,status_filter text default null,page_limit integer default 25,page_offset integer default 0)
returns table(request_id uuid,institution_name text,institution_type text,institution_code text,dte_code text,contact_name text,designation text,official_email text,phone text,city text,state text,student_count integer,status text,created_at timestamptz,reviewed_at timestamptz,duplicate_count bigint,active_invitation_count bigint,total_count bigint)
language plpgsql stable security definer set search_path=pg_catalog as $$ declare q text:=nullif(btrim(search_text),''); begin
 if not public.is_current_user_super_admin() then raise exception using errcode='42501',message='Platform access requires an explicit super_admin role.'; end if;
 if status_filter is not null and status_filter not in ('pending','contacted','approved','rejected','expired','onboarding','onboarded') then raise exception using errcode='22023',message='Invalid request status filter.'; end if;
 if page_limit<1 or page_limit>100 or page_offset<0 then raise exception using errcode='22023',message='Invalid request pagination.'; end if;
 return query select r.id,r.institution_name,r.institution_type,r.institution_code,r.dte_code,r.contact_name,r.designation,r.official_email,r.phone,r.city,r.state,r.student_count,r.status,r.created_at,r.reviewed_at,
 (select count(*) from public.institution_access_requests d where d.id<>r.id and (d.official_email=r.official_email or (d.institution_code is not null and lower(d.institution_code)=lower(r.institution_code)) or (d.dte_code is not null and d.dte_code=r.dte_code)))::bigint,
 (select count(*) from public.institution_onboarding_invitations v where v.request_id=r.id and v.status='active' and v.expires_at>now())::bigint,count(*) over()::bigint
 from public.institution_access_requests r where (status_filter is null or r.status=status_filter) and (q is null or concat_ws(' ',r.institution_name,r.institution_code,r.dte_code,r.contact_name,r.official_email,r.city,r.state) ilike '%'||q||'%') order by r.created_at desc,r.id limit page_limit offset page_offset;
end $$;
create or replace function public.platform_get_access_request(requested_request_id uuid)
returns table(request_id uuid,institution_name text,institution_type text,institution_code text,dte_code text,contact_name text,designation text,official_email text,phone text,city text,state text,student_count integer,message text,status text,review_notes text,consented_at timestamptz,created_at timestamptz,reviewed_at timestamptz,approved_at timestamptz,rejected_at timestamptz,invitation_id uuid,invitation_status text,invitation_expires_at timestamptz,invitation_created_at timestamptz)
language plpgsql stable security definer set search_path=pg_catalog as $$ begin
 if not public.is_current_user_super_admin() then raise exception using errcode='42501',message='Platform access requires an explicit super_admin role.'; end if;
 return query select r.id,r.institution_name,r.institution_type,r.institution_code,r.dte_code,r.contact_name,r.designation,r.official_email,r.phone,r.city,r.state,r.student_count,r.message,r.status,r.review_notes,r.consented_at,r.created_at,r.reviewed_at,r.approved_at,r.rejected_at,v.id,v.status,v.expires_at,v.created_at from public.institution_access_requests r left join lateral(select x.id,x.status,x.expires_at,x.created_at from public.institution_onboarding_invitations x where x.request_id=r.id order by x.created_at desc limit 1)v on true where r.id=requested_request_id;
end $$;
create or replace function public.platform_mark_access_request_contacted(target_request_id uuid,notes text default null) returns void language plpgsql security definer set search_path=pg_catalog as $$ begin
 if not public.is_current_user_super_admin() then raise exception using errcode='42501',message='Platform access requires an explicit super_admin role.'; end if;
 if notes is not null and char_length(notes)>2000 then raise exception using errcode='22023',message='Review notes are too long.'; end if;
 update public.institution_access_requests set status='contacted',review_notes=nullif(btrim(notes),''),reviewed_at=now(),rejected_at=null where id=target_request_id and status in ('pending','contacted'); if not found then raise exception using errcode='P0001',message='Access request is not eligible to be contacted.'; end if;
end $$;
create or replace function public.platform_reject_access_request(target_request_id uuid,notes text) returns void language plpgsql security definer set search_path=pg_catalog as $$ begin
 if not public.is_current_user_super_admin() then raise exception using errcode='42501',message='Platform access requires an explicit super_admin role.'; end if;
 if nullif(btrim(notes),'') is null or char_length(notes)>2000 then raise exception using errcode='22023',message='Rejection notes are required and must be at most 2000 characters.'; end if;
 update public.institution_onboarding_invitations set status='revoked',revoked_at=now() where request_id=target_request_id and status='active';
 update public.institution_access_requests set status='rejected',review_notes=btrim(notes),reviewed_at=now(),approved_at=null,rejected_at=now() where id=target_request_id and status in ('pending','contacted','approved'); if not found then raise exception using errcode='P0001',message='Access request is not eligible for rejection.'; end if;
end $$;
create or replace function public.platform_issue_access_request_invitation(target_request_id uuid,invitation_token_digest text,onboarding_code_digest text,invitation_expires_at timestamptz,reissue boolean default false)
returns table(invitation_id uuid) language plpgsql security definer set search_path=pg_catalog as $$ declare current_status text; new_id uuid; begin
 if not public.is_current_user_super_admin() then raise exception using errcode='42501',message='Platform access requires an explicit super_admin role.'; end if;
 if invitation_token_digest!~'^[a-f0-9]{64}$' or onboarding_code_digest!~'^[a-f0-9]{64}$' or invitation_expires_at<=now() then raise exception using errcode='22023',message='Invalid invitation credentials or expiry.'; end if;
 select status into current_status from public.institution_access_requests where id=target_request_id for update; if not found then raise exception using errcode='P0002',message='Access request not found.'; end if;
 if (not reissue and current_status not in ('pending','contacted')) or (reissue and current_status<>'approved') then raise exception using errcode='P0001',message='Access request is not eligible for invitation issuance.'; end if;
 if reissue then update public.institution_onboarding_invitations set status='revoked',revoked_at=now() where request_id=target_request_id and status='active'; end if;
 insert into public.institution_onboarding_invitations(request_id,token_digest,code_digest,expires_at) values(target_request_id,invitation_token_digest,onboarding_code_digest,invitation_expires_at) returning id into new_id;
 update public.institution_access_requests set status='approved',reviewed_at=coalesce(reviewed_at,now()),approved_at=coalesce(approved_at,now()),rejected_at=null where id=target_request_id; return query select new_id;
end $$;
create or replace function public.platform_revoke_access_request_invitation(target_request_id uuid) returns void language plpgsql security definer set search_path=pg_catalog as $$ begin
 if not public.is_current_user_super_admin() then raise exception using errcode='42501',message='Platform access requires an explicit super_admin role.'; end if;
 update public.institution_onboarding_invitations set status='revoked',revoked_at=now() where request_id=target_request_id and status='active'; if not found then raise exception using errcode='P0001',message='No active invitation is available to revoke.'; end if;
end $$;
revoke all on function public.platform_list_access_requests(text,text,integer,integer),public.platform_get_access_request(uuid),public.platform_mark_access_request_contacted(uuid,text),public.platform_reject_access_request(uuid,text),public.platform_issue_access_request_invitation(uuid,text,text,timestamptz,boolean),public.platform_revoke_access_request_invitation(uuid) from public,anon,service_role;
grant execute on function public.platform_list_access_requests(text,text,integer,integer),public.platform_get_access_request(uuid),public.platform_mark_access_request_contacted(uuid,text),public.platform_reject_access_request(uuid,text),public.platform_issue_access_request_invitation(uuid,text,text,timestamptz,boolean),public.platform_revoke_access_request_invitation(uuid) to authenticated;
notify pgrst,'reload schema'; commit;

-- Phase 7D Stage 2A: institution lifecycle controls and active-tenant enforcement
begin;

do $$
begin
  if to_regprocedure('public.is_current_user_super_admin()') is null then
    raise exception 'Phase 7D Stage 2A refused: super-admin authorization is missing';
  end if;
end $$;

create table if not exists public.institution_lifecycle_events (
  id uuid primary key default uuid_generate_v4(),
  institution_id uuid not null references public.institutions(id) on delete restrict,
  actor_user_id uuid not null references auth.users(id) on delete restrict,
  previous_status text not null,
  new_status text not null,
  reason text not null,
  created_at timestamptz not null default now(),
  constraint institution_lifecycle_events_status_check check (
    previous_status in ('pending','active','inactive','suspended') and
    new_status in ('pending','active','inactive','suspended')
  ),
  constraint institution_lifecycle_events_reason_check
    check (char_length(btrim(reason)) between 5 and 1000)
);
create index if not exists institution_lifecycle_events_institution_created_idx
  on public.institution_lifecycle_events(institution_id, created_at desc);
alter table public.institution_lifecycle_events enable row level security;
revoke all on public.institution_lifecycle_events from public, anon, authenticated;
grant select, insert on public.institution_lifecycle_events to service_role;

create or replace function public.current_user_institution_id()
returns uuid language sql stable security definer set search_path = public as $$
  select ur.institution_id
  from public.user_roles ur
  join public.institutions i on i.id = ur.institution_id
  where ur.user_id = auth.uid()
    and ur.institution_id is not null
    and i.status = 'active'
  order by ur.created_at asc
  limit 1
$$;
revoke all on function public.current_user_institution_id() from public, anon;
grant execute on function public.current_user_institution_id() to authenticated;

create or replace function public.platform_transition_institution_status(
  target_institution_id uuid,
  target_status text,
  change_reason text
)
returns table(institution_id uuid, previous_status text, new_status text, changed_at timestamptz)
language plpgsql security definer set search_path = public as $$
declare
  existing_status text;
  event_time timestamptz := now();
begin
  if not public.is_current_user_super_admin() then
    raise exception using errcode='42501', message='Platform access requires an explicit super_admin role.';
  end if;
  if target_status not in ('active','inactive','suspended') then
    raise exception using errcode='22023', message='Invalid institution lifecycle target.';
  end if;
  if nullif(btrim(change_reason),'') is null or char_length(btrim(change_reason)) not between 5 and 1000 then
    raise exception using errcode='22023', message='A lifecycle reason between 5 and 1000 characters is required.';
  end if;
  select i.status into existing_status from public.institutions i
  where i.id=target_institution_id for update;
  if existing_status is null then
    raise exception using errcode='P0002', message='Institution not found.';
  end if;
  if existing_status=target_status then
    raise exception using errcode='P0001', message='Institution already has the requested status.';
  end if;
  if not (
    (existing_status='pending' and target_status='active') or
    (existing_status='active' and target_status in ('inactive','suspended')) or
    (existing_status in ('inactive','suspended') and target_status='active')
  ) then
    raise exception using errcode='P0001', message='The requested institution lifecycle transition is not allowed.';
  end if;
  update public.institutions set status=target_status, updated_at=event_time
  where id=target_institution_id;
  insert into public.institution_lifecycle_events(
    institution_id,actor_user_id,previous_status,new_status,reason,created_at
  ) values (
    target_institution_id,auth.uid(),existing_status,target_status,btrim(change_reason),event_time
  );
  return query select target_institution_id,existing_status,target_status,event_time;
end $$;
revoke all on function public.platform_transition_institution_status(uuid,text,text)
  from public, anon, service_role;
grant execute on function public.platform_transition_institution_status(uuid,text,text)
  to authenticated;
notify pgrst, 'reload schema';
commit;

-- Phase 7D Stage 2B: immutable onboarding recovery linkage and read-only diagnosis
begin;

do $$
begin
  if to_regprocedure('public.is_current_user_super_admin()') is null then
    raise exception 'Phase 7D Stage 2B refused: super-admin authorization is missing';
  end if;
  if to_regclass('public.institution_onboarding_attempts') is null
     or to_regclass('public.institution_onboarding_invitations') is null
     or to_regclass('public.institution_access_requests') is null then
    raise exception 'Phase 7D Stage 2B refused: onboarding recovery prerequisites are missing';
  end if;
end $$;

alter table public.institution_onboarding_attempts
  add column if not exists access_request_id uuid references public.institution_access_requests(id) on delete restrict,
  add column if not exists invitation_id uuid references public.institution_onboarding_invitations(id) on delete restrict,
  add column if not exists recovery_status text,
  add column if not exists recovery_notes text,
  add column if not exists recovery_resolved_at timestamptz,
  add column if not exists recovery_resolved_by uuid references auth.users(id) on delete restrict;

alter table public.institution_onboarding_attempts
  drop constraint if exists institution_onboarding_attempts_recovery_status_check,
  add constraint institution_onboarding_attempts_recovery_status_check
    check (recovery_status is null or recovery_status in ('required','inspected','resolved')),
  drop constraint if exists institution_onboarding_attempts_recovery_notes_check,
  add constraint institution_onboarding_attempts_recovery_notes_check
    check (recovery_notes is null or char_length(recovery_notes) between 5 and 2000);

create unique index if not exists institution_onboarding_attempts_invitation_id_key
  on public.institution_onboarding_attempts(invitation_id)
  where invitation_id is not null;
create index if not exists institution_onboarding_attempts_access_request_id_idx
  on public.institution_onboarding_attempts(access_request_id, created_at desc);
create index if not exists institution_onboarding_attempts_recovery_status_idx
  on public.institution_onboarding_attempts(recovery_status, created_at asc);

create or replace function public.platform_list_onboarding_recovery(
  page_limit integer default 25,
  page_offset integer default 0
)
returns table(
  attempt_id uuid,
  access_request_id uuid,
  invitation_id uuid,
  institution_id uuid,
  administrator_user_id uuid,
  failure_phase text,
  recovery_status text,
  created_at timestamptz,
  completed_at timestamptz,
  total_count bigint
)
language plpgsql stable security definer set search_path = pg_catalog as $$
begin
  if not public.is_current_user_super_admin() then
    raise exception using errcode='42501', message='Platform access requires an explicit super_admin role.';
  end if;
  if page_limit < 1 or page_limit > 100 or page_offset < 0 then
    raise exception using errcode='22023', message='Invalid recovery pagination.';
  end if;
  return query
  select a.request_id, a.access_request_id, a.invitation_id, a.institution_id,
    a.administrator_user_id, a.failure_phase, coalesce(a.recovery_status,'required'),
    a.created_at, a.completed_at, count(*) over()::bigint
  from public.institution_onboarding_attempts a
  where a.status='recovery_required'
  order by a.created_at asc, a.request_id
  limit page_limit offset page_offset;
end $$;

create or replace function public.platform_get_onboarding_recovery(requested_attempt_id uuid)
returns table(
  attempt_id uuid,
  access_request_id uuid,
  invitation_id uuid,
  institution_id uuid,
  administrator_user_id uuid,
  failure_phase text,
  recovery_status text,
  invitation_status text,
  access_request_status text,
  institution_exists boolean,
  administrator_profile_exists boolean,
  administrator_role_exists boolean,
  linkage_valid boolean,
  created_at timestamptz,
  completed_at timestamptz
)
language plpgsql stable security definer set search_path = pg_catalog as $$
begin
  if not public.is_current_user_super_admin() then
    raise exception using errcode='42501', message='Platform access requires an explicit super_admin role.';
  end if;
  return query
  select a.request_id, a.access_request_id, a.invitation_id, a.institution_id,
    a.administrator_user_id, a.failure_phase, coalesce(a.recovery_status,'required'),
    v.status, r.status,
    exists(select 1 from public.institutions i where i.id=a.institution_id),
    exists(select 1 from public.profiles p where p.id=a.administrator_user_id and p.institution_id=a.institution_id),
    exists(select 1 from public.user_roles ur where ur.user_id=a.administrator_user_id and ur.institution_id=a.institution_id and ur.role='admin'),
    (a.access_request_id is not null and a.invitation_id is not null
      and v.request_id=a.access_request_id
      and a.status='recovery_required'
      and v.status='recovery_required'
      and r.status='onboarding'),
    a.created_at, a.completed_at
  from public.institution_onboarding_attempts a
  left join public.institution_onboarding_invitations v on v.id=a.invitation_id
  left join public.institution_access_requests r on r.id=a.access_request_id
  where a.request_id=requested_attempt_id;
end $$;

revoke all on function public.platform_list_onboarding_recovery(integer,integer) from public,anon,service_role;
revoke all on function public.platform_get_onboarding_recovery(uuid) from public,anon,service_role;
grant execute on function public.platform_list_onboarding_recovery(integer,integer) to authenticated;
grant execute on function public.platform_get_onboarding_recovery(uuid) to authenticated;
comment on function public.platform_get_onboarding_recovery(uuid) is 'Read-only recovery diagnosis. Returns artifact existence booleans and no credential digests or secrets.';
notify pgrst,'reload schema';
commit;

-- Phase 7D Stage 2C: guarded idempotent onboarding recovery resolution
begin;
create or replace function public.platform_resolve_clean_onboarding_recovery(target_attempt_id uuid,resolution_notes text)
returns table(attempt_id uuid,recovery_status text,invitation_status text,access_request_status text)
language plpgsql security definer set search_path=public as $$
declare a public.institution_onboarding_attempts%rowtype; v public.institution_onboarding_invitations%rowtype; request_status text;
begin
 if not public.is_current_user_super_admin() then raise exception using errcode='42501',message='Platform access requires an explicit super_admin role.'; end if;
 if nullif(btrim(resolution_notes),'') is null or char_length(btrim(resolution_notes)) not between 5 and 2000 then raise exception using errcode='22023',message='Recovery notes between 5 and 2000 characters are required.'; end if;
 select * into a from public.institution_onboarding_attempts where request_id=target_attempt_id for update;
 if not found then raise exception using errcode='P0002',message='Recovery attempt not found.'; end if;
 if a.recovery_status='resolved' then return query select a.request_id,'resolved'::text,'active'::text,'approved'::text; return; end if;
 if a.status<>'recovery_required' or a.access_request_id is null or a.invitation_id is null then raise exception using errcode='P0001',message='Recovery attempt is not eligible for resolution.'; end if;
 select * into v from public.institution_onboarding_invitations where id=a.invitation_id for update;
 if not found or v.request_id<>a.access_request_id or v.status<>'recovery_required' then raise exception using errcode='P0001',message='Recovery invitation linkage is invalid.'; end if;
 select status into request_status from public.institution_access_requests where id=a.access_request_id for update;
 if request_status<>'onboarding' then raise exception using errcode='P0001',message='Recovery access request linkage is invalid.'; end if;
 if a.institution_id is not null and exists(select 1 from public.institutions where id=a.institution_id) then raise exception using errcode='P0001',message='Recovery still contains an institution artifact and requires manual investigation.'; end if;
 if a.administrator_user_id is not null and (exists(select 1 from public.profiles where id=a.administrator_user_id) or exists(select 1 from public.user_roles where user_id=a.administrator_user_id)) then raise exception using errcode='P0001',message='Recovery still contains administrator artifacts and requires manual investigation.'; end if;
 update public.institution_onboarding_invitations set status='active',institution_id=null,consumed_at=null,revoked_at=null where id=a.invitation_id and status='recovery_required';
 update public.institution_access_requests set status='approved' where id=a.access_request_id and status='onboarding';
 update public.institution_onboarding_attempts set status='failed',recovery_status='resolved',recovery_notes=btrim(resolution_notes),recovery_resolved_at=now(),recovery_resolved_by=auth.uid(),completed_at=coalesce(completed_at,now()) where request_id=target_attempt_id;
 return query select target_attempt_id,'resolved'::text,'active'::text,'approved'::text;
end $$;
revoke all on function public.platform_resolve_clean_onboarding_recovery(uuid,text) from public,anon,service_role;
grant execute on function public.platform_resolve_clean_onboarding_recovery(uuid,text) to authenticated;
notify pgrst,'reload schema';
commit;

-- Phase 7D Stage 2D: atomic Institution Admin transfer
begin;
create table if not exists public.institution_admin_transfer_events (
  id uuid primary key default uuid_generate_v4(),
  institution_id uuid not null references public.institutions(id) on delete restrict,
  previous_admin_user_id uuid not null references auth.users(id) on delete restrict,
  new_admin_user_id uuid not null references auth.users(id) on delete restrict,
  actor_user_id uuid not null references auth.users(id) on delete restrict,
  reason text not null,
  created_at timestamptz not null default now(),
  constraint institution_admin_transfer_distinct_users check (previous_admin_user_id <> new_admin_user_id),
  constraint institution_admin_transfer_reason_check check (char_length(btrim(reason)) between 5 and 1000)
);
create index if not exists institution_admin_transfer_events_institution_created_idx
  on public.institution_admin_transfer_events(institution_id, created_at desc);
alter table public.institution_admin_transfer_events enable row level security;
revoke all on public.institution_admin_transfer_events from public,anon,authenticated;
grant select,insert on public.institution_admin_transfer_events to service_role;

create or replace function public.platform_transfer_institution_admin(
  target_institution_id uuid,
  successor_user_id uuid,
  transfer_reason text
)
returns table(institution_id uuid,previous_admin_user_id uuid,new_admin_user_id uuid,transferred_at timestamptz)
language plpgsql security definer set search_path=public as $$
declare
  current_admin_id uuid;
  admin_count integer;
  event_time timestamptz:=now();
begin
  if not public.is_current_user_super_admin() then
    raise exception using errcode='42501',message='Platform access requires an explicit super_admin role.';
  end if;
  if nullif(btrim(transfer_reason),'') is null or char_length(btrim(transfer_reason)) not between 5 and 1000 then
    raise exception using errcode='22023',message='A transfer reason between 5 and 1000 characters is required.';
  end if;
  perform 1 from public.institutions where id=target_institution_id for update;
  if not found then raise exception using errcode='P0002',message='Institution not found.'; end if;

  select count(*)::integer,min(user_id) into admin_count,current_admin_id
  from public.user_roles where institution_id=target_institution_id and role='admin';
  if admin_count<>1 then
    raise exception using errcode='P0001',message='Institution must have exactly one current administrator.';
  end if;
  perform 1 from public.user_roles where institution_id=target_institution_id and role='admin' for update;
  if successor_user_id=current_admin_id then
    raise exception using errcode='P0001',message='The successor is already the Institution Admin.';
  end if;
  if not exists(select 1 from public.profiles p where p.id=successor_user_id and p.institution_id=target_institution_id) then
    raise exception using errcode='P0001',message='The successor must have a profile in the same institution.';
  end if;
  if not exists(select 1 from public.user_roles ur where ur.user_id=successor_user_id and ur.institution_id=target_institution_id and ur.role<>'super_admin') then
    raise exception using errcode='P0001',message='The successor must already hold an institution-scoped role.';
  end if;
  if exists(select 1 from public.user_roles ur where ur.user_id=successor_user_id and ur.role='super_admin') then
    raise exception using errcode='P0001',message='A platform Super Admin cannot become an Institution Admin.';
  end if;

  delete from public.user_roles
    where user_id=current_admin_id and institution_id=target_institution_id and role='admin';
  insert into public.user_roles(user_id,institution_id,role,department_id)
    values(successor_user_id,target_institution_id,'admin',null);
  insert into public.institution_admin_transfer_events(
    institution_id,previous_admin_user_id,new_admin_user_id,actor_user_id,reason,created_at
  ) values(
    target_institution_id,current_admin_id,successor_user_id,auth.uid(),btrim(transfer_reason),event_time
  );
  return query select target_institution_id,current_admin_id,successor_user_id,event_time;
end $$;
revoke all on function public.platform_transfer_institution_admin(uuid,uuid,text) from public,anon,service_role;
grant execute on function public.platform_transfer_institution_admin(uuid,uuid,text) to authenticated;
comment on function public.platform_transfer_institution_admin(uuid,uuid,text) is 'Atomically transfers the single Institution Admin role to an existing same-institution account and records immutable audit evidence.';
notify pgrst,'reload schema';
commit;

-- Phase 7E: unified append-only platform audit ledger
begin;
create table if not exists public.platform_audit_events (
  id uuid primary key default gen_random_uuid(),
  actor_user_id uuid references auth.users(id) on delete restrict,
  action text not null,
  target_type text not null,
  target_id uuid,
  institution_id uuid references public.institutions(id) on delete restrict,
  previous_state jsonb,
  new_state jsonb,
  safe_metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint platform_audit_action_check check (char_length(btrim(action)) between 3 and 100),
  constraint platform_audit_target_check check (char_length(btrim(target_type)) between 3 and 100),
  constraint platform_audit_metadata_check check (jsonb_typeof(safe_metadata) = 'object')
);
create index if not exists platform_audit_events_created_idx on public.platform_audit_events(created_at desc, id desc);
create index if not exists platform_audit_events_institution_idx on public.platform_audit_events(institution_id, created_at desc);
alter table public.platform_audit_events enable row level security;
revoke all on public.platform_audit_events from public, anon, authenticated, service_role;
comment on table public.platform_audit_events is 'Append-only platform audit evidence; authenticated direct table access is forbidden.';

create or replace function public.platform_audit_json_is_safe(payload jsonb)
returns boolean language sql immutable security invoker set search_path = pg_catalog as $$
  with recursive json_nodes(value) as (
    select coalesce(payload, 'null'::jsonb)
    union all
    select child.value
    from json_nodes node
    cross join lateral (
      select object_child.value
      from jsonb_each(
        case when jsonb_typeof(node.value) = 'object' then node.value else '{}'::jsonb end
      ) object_child
      union all
      select array_child.value
      from jsonb_array_elements(
        case when jsonb_typeof(node.value) = 'array' then node.value else '[]'::jsonb end
      ) array_child
    ) child
  ), object_keys(key) as (
    select object_key.key
    from json_nodes node
    cross join lateral jsonb_object_keys(
      case when jsonb_typeof(node.value) = 'object' then node.value else '{}'::jsonb end
    ) as object_key(key)
  )
  select not exists (
    select 1
    from object_keys
    where lower(key) in (
      'password','token','token_digest','invitation_token','onboarding_code',
      'code_digest','administrator_email_digest','service_role_key','access_token','refresh_token'
    )
  )
$$;
revoke all on function public.platform_audit_json_is_safe(jsonb) from public, anon, authenticated, service_role;

alter table public.platform_audit_events
  add constraint platform_audit_previous_state_safe check (public.platform_audit_json_is_safe(coalesce(previous_state,'{}'::jsonb))),
  add constraint platform_audit_new_state_safe check (public.platform_audit_json_is_safe(coalesce(new_state,'{}'::jsonb))),
  add constraint platform_audit_metadata_safe check (public.platform_audit_json_is_safe(safe_metadata));


create or replace function public.capture_platform_audit_event()
returns trigger language plpgsql security definer set search_path = pg_catalog as $$
declare old_safe jsonb; new_safe jsonb; target uuid; institution uuid; event_action text; actor uuid;
begin
  if tg_table_name = 'institution_access_requests' then
    old_safe := case when tg_op='INSERT' then null else jsonb_build_object('status',old.status,'reviewed_at',old.reviewed_at,'approved_at',old.approved_at,'rejected_at',old.rejected_at) end;
    new_safe := case when tg_op='DELETE' then null else jsonb_build_object('status',new.status,'reviewed_at',new.reviewed_at,'approved_at',new.approved_at,'rejected_at',new.rejected_at) end;
    target := coalesce(new.id,old.id);  event_action := 'access_request_' || lower(tg_op);
  elsif tg_table_name = 'institution_onboarding_invitations' then
    old_safe := case when tg_op='INSERT' then null else jsonb_build_object('status',old.status,'expires_at',old.expires_at,'consumed_at',old.consumed_at,'revoked_at',old.revoked_at) end;
    new_safe := case when tg_op='DELETE' then null else jsonb_build_object('status',new.status,'expires_at',new.expires_at,'consumed_at',new.consumed_at,'revoked_at',new.revoked_at) end;
    target := coalesce(new.id,old.id); institution := coalesce(new.institution_id,old.institution_id); event_action := 'invitation_' || lower(tg_op);
  elsif tg_table_name = 'institution_onboarding_attempts' then
    old_safe := case when tg_op='INSERT' then null else jsonb_build_object('status',old.status,'failure_phase',old.failure_phase,'recovery_status',old.recovery_status,'recovery_resolved_at',old.recovery_resolved_at) end;
    new_safe := case when tg_op='DELETE' then null else jsonb_build_object('status',new.status,'failure_phase',new.failure_phase,'recovery_status',new.recovery_status,'recovery_resolved_at',new.recovery_resolved_at) end;
    target := coalesce(new.request_id,old.request_id); institution := coalesce(new.institution_id,old.institution_id); actor := coalesce(new.recovery_resolved_by,old.recovery_resolved_by); event_action := 'onboarding_attempt_' || lower(tg_op);
  elsif tg_table_name = 'institution_lifecycle_events' then
    target := new.id; institution := new.institution_id; actor := new.actor_user_id; event_action := 'institution_status_transition';
    new_safe := jsonb_build_object('previous_status',new.previous_status,'new_status',new.new_status,'reason',new.reason);
  elsif tg_table_name = 'institution_admin_transfer_events' then
    target := new.id; institution := new.institution_id; actor := new.actor_user_id; event_action := 'institution_admin_transfer';
    new_safe := jsonb_build_object('previous_admin_user_id',new.previous_admin_user_id,'new_admin_user_id',new.new_admin_user_id,'reason',new.reason);
  else raise exception 'Unsupported platform audit source'; end if;
  insert into public.platform_audit_events(actor_user_id,action,target_type,target_id,institution_id,previous_state,new_state,safe_metadata)
  values(coalesce(auth.uid(),actor),event_action,tg_table_name,target,institution,old_safe,new_safe,jsonb_build_object('operation',tg_op));
  return coalesce(new,old);
end $$;
revoke all on function public.capture_platform_audit_event() from public, anon, authenticated;

do $$ declare source_table text; begin
  foreach source_table in array array['institution_access_requests','institution_onboarding_invitations','institution_onboarding_attempts','institution_lifecycle_events','institution_admin_transfer_events'] loop
    execute format('drop trigger if exists capture_platform_audit_event on public.%I',source_table);
    execute format('create trigger capture_platform_audit_event after insert or update or delete on public.%I for each row execute function public.capture_platform_audit_event()',source_table);
  end loop;
end $$;

create or replace function public.platform_list_audit_events(action_filter text default null,institution_filter uuid default null,page_limit integer default 25,page_offset integer default 0)
returns table(event_id uuid,actor_user_id uuid,action text,target_type text,target_id uuid,institution_id uuid,previous_state jsonb,new_state jsonb,safe_metadata jsonb,created_at timestamptz,total_count bigint)
language plpgsql stable security definer set search_path = pg_catalog as $$
begin
  if not public.is_current_user_super_admin() then raise exception using errcode='42501',message='Platform audit access requires an explicit super_admin role.'; end if;
  if page_limit < 1 or page_limit > 100 or page_offset < 0 then raise exception using errcode='22023',message='Invalid audit pagination.'; end if;
  if action_filter is not null and (char_length(action_filter)>100 or action_filter !~ '^[a-z0-9_]+$') then raise exception using errcode='22023',message='Invalid audit action filter.'; end if;
  return query select e.id,e.actor_user_id,e.action,e.target_type,e.target_id,e.institution_id,e.previous_state,e.new_state,e.safe_metadata,e.created_at,count(*) over()::bigint
  from public.platform_audit_events e where (action_filter is null or e.action=action_filter) and (institution_filter is null or e.institution_id=institution_filter)
  order by e.created_at desc,e.id desc limit page_limit offset page_offset;
end $$;
revoke all on function public.platform_list_audit_events(text,uuid,integer,integer) from public, anon, service_role;
grant execute on function public.platform_list_audit_events(text,uuid,integer,integer) to authenticated;
notify pgrst, 'reload schema';
commit;


-- Phase 7F: legacy institution administrator email fallback
begin;
create or replace function public.platform_get_institution(requested_institution_id uuid)
returns table(
  institution_id uuid, official_name text, display_name text, institution_code text,
  dte_code text, city text, district text, state text, country text, status text,
  logo_path text, logo_updated_at timestamptz, created_at timestamptz, updated_at timestamptz,
  admin_count bigint, has_institution_admin boolean, access_request_status text,
  official_email text, invitation_status text, invitation_expires_at timestamptz,
  onboarding_status text, onboarding_failure_phase text
)
language plpgsql stable security definer set search_path = pg_catalog
as $$
begin
  if not public.is_current_user_super_admin() then
    raise exception using errcode = '42501', message = 'Platform read access requires an explicit super_admin role.';
  end if;
  return query
  select i.id, i.official_name, i.display_name, i.code, i.dte_code, i.city,
    i.district, i.state, i.country, i.status, i.logo_path, i.logo_updated_at,
    i.created_at, i.updated_at, coalesce(admins.admin_count,0),
    coalesce(admins.admin_count,0)>0, request_row.status,
    coalesce(request_row.official_email, admin_profile.email),
    invitation_row.status, invitation_row.expires_at, attempt_row.status, attempt_row.failure_phase
  from public.institutions i
  left join lateral (
    select count(*)::bigint admin_count from public.user_roles ur
    where ur.institution_id=i.id and ur.role='admin'
  ) admins on true
  left join lateral (
    select r.status, r.official_email
    from public.institution_onboarding_invitations v
    join public.institution_access_requests r on r.id=v.request_id
    where v.institution_id=i.id order by v.created_at desc limit 1
  ) request_row on true
  left join lateral (
    select nullif(btrim(p.email),'') email
    from public.user_roles ur
    join public.profiles p on p.id=ur.user_id and p.institution_id=ur.institution_id
    where ur.institution_id=i.id and ur.role='admin'
    order by ur.created_at asc, ur.user_id
    limit 1
  ) admin_profile on true
  left join lateral (
    select v.status, v.expires_at from public.institution_onboarding_invitations v
    where v.institution_id=i.id order by v.created_at desc limit 1
  ) invitation_row on true
  left join lateral (
    select a.status, a.failure_phase from public.institution_onboarding_attempts a
    where a.institution_id=i.id order by a.created_at desc limit 1
  ) attempt_row on true
  where i.id=requested_institution_id;
end;
$$;
revoke all on function public.platform_get_institution(uuid) from public, anon, service_role;
grant execute on function public.platform_get_institution(uuid) to authenticated;
comment on function public.platform_get_institution(uuid) is 'Read-only institution detail with access-request email and institution-admin profile fallback; exposes no credential digests.';
notify pgrst, 'reload schema';
commit;

-- Persist each student's authoritative academic-class relationship.
alter table public.students
  add column if not exists class_id uuid references public.academic_classes(id) on delete set null;
create index if not exists idx_students_class_id on public.students(class_id);
`;
