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
    request_row.official_email,
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
revoke all on function public.platform_get_institution(uuid) from public, anon, service_role;
grant execute on function public.platform_get_institution(uuid) to authenticated;
comment on function public.platform_get_institution(uuid) is 'Read-only institution detail without invitation or administrator credential digests.';
notify pgrst, 'reload schema';
commit;
