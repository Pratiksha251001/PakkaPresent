begin;
-- Guard against silently orphaning uploaded branding assets.
do $$ begin if exists(select 1 from storage.objects where bucket_id='institution-assets') then raise exception 'Remove institution-assets objects before rollback'; end if; end $$;
drop policy if exists institution_assets_read_own on storage.objects;
drop policy if exists institution_assets_admin_insert_own on storage.objects;
drop policy if exists institution_assets_admin_update_own on storage.objects;
drop policy if exists institution_assets_admin_delete_own on storage.objects;
drop function if exists public.update_own_institution_logo(text);
drop function if exists public.is_current_user_institution_admin();
delete from storage.buckets where id='institution-assets';
alter table public.institutions drop column if exists logo_updated_by,drop column if exists logo_updated_at,drop column if exists logo_path;
commit;
