-- Multi-institution Phase 4E2: service-role-only institution access requests.
begin;
do $$ begin
 if to_regclass('public.institutions') is null then raise exception 'Phase 4E2 refused: institutions table missing'; end if;
 if to_regclass('public.institution_access_requests') is not null then raise exception 'Phase 4E2 refused: institution_access_requests already exists'; end if;
end $$;
-- Multi-institution Phase 4E2 institution access-request ledger
create table public.institution_access_requests (
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
notify pgrst,'reload schema';
commit;
