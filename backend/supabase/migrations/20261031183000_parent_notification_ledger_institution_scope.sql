-- Repair institution ownership in the parent notification ledger RPCs.
begin;

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

comment on function public.claim_parent_notification(uuid,text,date,text) is
  'Claims an approved parent notification attempt using the student institution.';
comment on function public.complete_parent_notification(uuid,text,date,text) is
  'Completes only the attempt matching the student institution.';
notify pgrst,'reload schema';
commit;
