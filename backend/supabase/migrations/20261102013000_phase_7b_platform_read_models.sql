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
