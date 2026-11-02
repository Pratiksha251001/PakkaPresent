begin;
do $$ begin
 if exists(select 1 from public.institution_admin_transfer_events) then
   raise exception 'Phase 7D Stage 2D rollback refused: administrator transfer records exist';
 end if;
end $$;
drop function if exists public.platform_transfer_institution_admin(uuid,uuid,text);
drop table if exists public.institution_admin_transfer_events;
notify pgrst,'reload schema';
commit;
