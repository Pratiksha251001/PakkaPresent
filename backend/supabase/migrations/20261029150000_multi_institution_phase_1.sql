-- Multi-institution Phase 1: guarded MITCORER ownership transition.
-- The MITCORER default is temporary compatibility for the current application.
-- Do not onboard another institution until Phase 2 removes this default and lands tenant RLS.
begin;

create table if not exists public.institutions (
 id uuid primary key default uuid_generate_v4(), official_name text not null,
 display_name text not null, code text not null, dte_code text,
 city text, district text, state text, country text not null default 'India',
 status text not null default 'active' check(status in ('pending','active','inactive','suspended')),
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 constraint institutions_code_nonempty check(btrim(code)<>''),
 constraint institutions_official_name_nonempty check(btrim(official_name)<>''),
 constraint institutions_display_name_nonempty check(btrim(display_name)<>'')
);
create unique index if not exists institutions_code_unique_ci on public.institutions(lower(code));
create unique index if not exists institutions_dte_code_unique on public.institutions(dte_code) where dte_code is not null;

do $$ declare matches integer; conflicting integer; begin
 select count(*) into matches from public.institutions
  where id='6f5f8c70-8b95-5f20-a567-43f379c38ec8'::uuid or lower(code)='mitcorer' or dte_code='06901';
 select count(*) into conflicting from public.institutions
  where (lower(code)='mitcorer' or dte_code='06901') and id<>'6f5f8c70-8b95-5f20-a567-43f379c38ec8'::uuid;
 if conflicting>0 or matches>1 then raise exception 'Phase 1 refused: conflicting MITCORER identity'; end if;
 if exists(select 1 from public.institutions where id='6f5f8c70-8b95-5f20-a567-43f379c38ec8'::uuid and
   (lower(code)<>'mitcorer' or dte_code is distinct from '06901')) then
   raise exception 'Phase 1 refused: fixed MITCORER id has conflicting identity';
 end if;
end $$;

insert into public.institutions(id,official_name,display_name,code,dte_code,city,district,state,country,status)
values('6f5f8c70-8b95-5f20-a567-43f379c38ec8'::uuid,'MAEER''s MIT College of Railway Engineering and Research, Barshi','MITCORER Barshi','MITCORER','06901','Barshi','Solapur','Maharashtra','India','active')
on conflict(id) do update set official_name=excluded.official_name,display_name=excluded.display_name,
 code=excluded.code,dte_code=excluded.dte_code,city=excluded.city,district=excluded.district,
 state=excluded.state,country=excluded.country,status=excluded.status,updated_at=now();

do $$ declare t text; begin
 foreach t in array array['departments', 'profiles', 'user_roles', 'teachers', 'students', 'academic_classes', 'class_coordinator_assignments', 'subjects', 'teacher_subjects', 'attendance', 'notices', 'sms_logs', 'parent_notification_attempts'] loop
  execute format('alter table public.%I add column if not exists institution_id uuid',t);
  execute format('alter table public.%I alter column institution_id set default %L::uuid',t,'6f5f8c70-8b95-5f20-a567-43f379c38ec8');
  begin execute format('alter table public.%I add constraint %I foreign key(institution_id) references public.institutions(id) on delete restrict not valid',t,t||'_institution_id_fkey');
  exception when duplicate_object then null; end;
 end loop;
end $$;

do $$ declare t text; n bigint; begin
 foreach t in array array['departments', 'profiles', 'user_roles', 'teachers', 'students', 'academic_classes', 'class_coordinator_assignments', 'subjects', 'teacher_subjects', 'attendance', 'notices', 'sms_logs', 'parent_notification_attempts'] loop
  execute format('select count(*) from public.%I where institution_id is not null and institution_id<>$1',t) into n using '6f5f8c70-8b95-5f20-a567-43f379c38ec8'::uuid;
  if n>0 then raise exception 'Phase 1 refused: %.institution_id has % conflicting rows',t,n; end if;
  execute format('update public.%I set institution_id=$1 where institution_id is null',t) using '6f5f8c70-8b95-5f20-a567-43f379c38ec8'::uuid;
 end loop;
end $$;

update public.departments set institution_name='MITCORER Barshi'
 where institution_id='6f5f8c70-8b95-5f20-a567-43f379c38ec8'::uuid and institution_name is distinct from 'MITCORER Barshi';
comment on column public.departments.institution_name is 'Compatibility display field; institution_id is authoritative.';

-- Verify every confirmed tenant relationship from the live schema.
do $$ begin
 if exists(select 1 from public.user_roles r join public.profiles p on p.id=r.user_id where r.institution_id<>p.institution_id) then raise exception 'profile and role institution mismatch'; end if;
 if exists(select 1 from public.user_roles r join public.departments d on d.id=r.department_id where r.institution_id<>d.institution_id) then raise exception 'role and department institution mismatch'; end if;
 if exists(select 1 from public.departments d join public.user_roles r on r.user_id=d.hod_id where d.hod_id is not null and d.institution_id<>r.institution_id) then raise exception 'department HOD institution mismatch'; end if;
 if exists(select 1 from public.teachers t join public.departments d on d.id=t.department_id where t.institution_id<>d.institution_id) then raise exception 'teacher and department institution mismatch'; end if;
 if exists(select 1 from public.teachers t join public.profiles p on p.id=t.user_id where t.user_id is not null and t.institution_id<>p.institution_id) then raise exception 'teacher and account institution mismatch'; end if;
 if exists(select 1 from public.students s join public.departments d on d.id=s.department_id where s.institution_id<>d.institution_id) then raise exception 'student and department institution mismatch'; end if;
 if exists(select 1 from public.students s join public.profiles p on p.id=s.user_id where s.user_id is not null and s.institution_id<>p.institution_id) then raise exception 'student and account institution mismatch'; end if;
 if exists(select 1 from public.subjects s join public.departments d on d.id=s.department_id where s.department_id is not null and s.institution_id<>d.institution_id) then raise exception 'subject and department institution mismatch'; end if;
 if exists(select 1 from public.academic_classes c join public.departments d on d.id=c.department_id where c.institution_id<>d.institution_id) then raise exception 'class and department institution mismatch'; end if;
 if exists(select 1 from public.academic_classes c join public.teachers t on t.id=c.coordinator_teacher_id where c.coordinator_teacher_id is not null and c.institution_id<>t.institution_id) then raise exception 'class and coordinator institution mismatch'; end if;
 if exists(select 1 from public.class_coordinator_assignments a join public.teachers t on t.id=a.teacher_id join public.departments d on d.id=a.department_id left join public.academic_classes c on c.id=a.class_id where a.institution_id<>t.institution_id or a.institution_id<>d.institution_id or (c.id is not null and a.institution_id<>c.institution_id)) then raise exception 'coordinator assignment institution mismatch'; end if;
 if exists(select 1 from public.teacher_subjects x join public.teachers t on t.id=x.teacher_id join public.subjects s on s.id=x.subject_id left join public.academic_classes c on c.id=x.class_id where x.institution_id<>t.institution_id or x.institution_id<>s.institution_id or (c.id is not null and x.institution_id<>c.institution_id)) then raise exception 'teacher subject institution mismatch'; end if;
 if exists(select 1 from public.attendance a join public.students s on s.id=a.student_id join public.subjects x on x.id=a.subject_id where a.institution_id<>s.institution_id or a.institution_id<>x.institution_id) then raise exception 'attendance institution mismatch'; end if;
 if exists(select 1 from public.sms_logs l left join public.students s on s.id=l.student_id left join public.subjects x on x.id=l.subject_id where (s.id is not null and l.institution_id<>s.institution_id) or (x.id is not null and l.institution_id<>x.institution_id)) then raise exception 'communication log institution mismatch'; end if;
 if exists(select 1 from public.parent_notification_attempts a join public.students s on s.id=a.student_id where a.institution_id<>s.institution_id) then raise exception 'parent notification institution mismatch'; end if;
end $$;

do $$ declare t text; n bigint; begin
 foreach t in array array['departments', 'profiles', 'user_roles', 'teachers', 'students', 'academic_classes', 'class_coordinator_assignments', 'subjects', 'teacher_subjects', 'attendance', 'notices', 'sms_logs', 'parent_notification_attempts'] loop
  execute format('select count(*) from public.%I where institution_id is null',t) into n;
  if n>0 then raise exception 'Phase 1 refused: %.institution_id has % unclassified rows',t,n; end if;
  execute format('alter table public.%I alter column institution_id set not null',t);
  execute format('alter table public.%I validate constraint %I',t,t||'_institution_id_fkey');
  execute format('create index if not exists %I on public.%I(institution_id)',t||'_institution_id_idx',t);
 end loop;
end $$;

-- Business identifiers are unique within an institution, not globally.
alter table public.departments drop constraint if exists departments_code_key;
alter table public.teachers drop constraint if exists teachers_employee_id_key;
alter table public.students drop constraint if exists students_roll_number_key;
alter table public.subjects drop constraint if exists subjects_code_key;
create unique index if not exists departments_institution_code_key on public.departments(institution_id,code);
create unique index if not exists teachers_institution_employee_id_key on public.teachers(institution_id,employee_id);
create unique index if not exists students_institution_roll_number_key on public.students(institution_id,roll_number);
create unique index if not exists subjects_institution_code_key on public.subjects(institution_id,code);

drop index if exists public.one_admin_per_institution;
create unique index one_admin_per_institution on public.user_roles(institution_id) where role='admin';
alter table public.institutions enable row level security;
revoke all on public.institutions from anon,authenticated;
comment on table public.institutions is 'Phase 1 ownership registry. Additional onboarding is blocked until Phase 2.';
notify pgrst,'reload schema';
commit;
