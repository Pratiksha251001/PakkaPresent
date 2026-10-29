-- Multi-institution Phase 4A: onboarding-safe ownership and recovery ledger.
begin;
do $$ declare t text; begin
 if to_regclass('public.institutions') is null then raise exception 'Phase 4A refused: institutions table missing'; end if;
 foreach t in array array['departments', 'profiles', 'user_roles', 'teachers', 'students', 'academic_classes', 'class_coordinator_assignments', 'subjects', 'teacher_subjects', 'attendance', 'notices', 'sms_logs', 'parent_notification_attempts'] loop
  if not exists(select 1 from information_schema.columns where table_schema='public' and table_name=t and column_name='institution_id' and is_nullable='NO') then raise exception 'Phase 4A refused: %.institution_id missing or nullable',t; end if;
  execute format('alter table public.%I alter column institution_id drop default',t);
 end loop;
end $$;
-- Multi-institution Phase 4A onboarding schema foundation
-- Tenant ownership remains mandatory, and prerequisite validation above removes every compatibility default.
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
notify pgrst,'reload schema';
commit;
