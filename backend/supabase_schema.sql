-- ============================================================================
-- EduTrack Smart Attendance Management System
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
  institution_name text default null,
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
  message text not null,
  status text not null check (status in ('sent', 'failed')),
  attendance_date date not null,
  language text default 'trilingual',
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
-- EduTrack role-aware RLS hardening.
-- Validated in the isolated EduTrack-Integration-Test Supabase project.

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
revoke all on function public.can_manage_attendance(uuid,uuid) from public,anon;
grant execute on function public.can_manage_attendance(uuid,uuid) to authenticated;

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
create policy attendance_assigned_teacher_read on public.attendance for select to authenticated
  using(public.can_manage_attendance(student_id,subject_id));
create policy attendance_assigned_teacher_insert on public.attendance for insert to authenticated
  with check(public.can_manage_attendance(student_id,subject_id));
create policy attendance_assigned_teacher_update on public.attendance for update to authenticated
  using(public.can_manage_attendance(student_id,subject_id))
  with check(public.can_manage_attendance(student_id,subject_id));

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
