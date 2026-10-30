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
