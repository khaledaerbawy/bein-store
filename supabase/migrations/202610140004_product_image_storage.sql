-- Public read-only product image bucket; writes are restricted to active admins.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('product-images','product-images',true,5242880,array['image/jpeg','image/png','image/webp','image/avif'])
on conflict (id) do update set public = true, file_size_limit = 5242880, allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Public can view Bein Store product images" on storage.objects;
create policy "Public can view Bein Store product images" on storage.objects for select to anon, authenticated using (bucket_id = 'product-images');
drop policy if exists "Admins upload Bein Store product images" on storage.objects;
create policy "Admins upload Bein Store product images" on storage.objects for insert to authenticated with check (bucket_id = 'product-images' and exists (select 1 from public.admin_roles ar where ar.user_id = (select auth.uid()) and ar.is_active = true));
drop policy if exists "Admins update Bein Store product images" on storage.objects;
create policy "Admins update Bein Store product images" on storage.objects for update to authenticated using (bucket_id = 'product-images' and exists (select 1 from public.admin_roles ar where ar.user_id = (select auth.uid()) and ar.is_active = true)) with check (bucket_id = 'product-images' and exists (select 1 from public.admin_roles ar where ar.user_id = (select auth.uid()) and ar.is_active = true));
drop policy if exists "Admins delete Bein Store product images" on storage.objects;
create policy "Admins delete Bein Store product images" on storage.objects for delete to authenticated using (bucket_id = 'product-images' and exists (select 1 from public.admin_roles ar where ar.user_id = (select auth.uid()) and ar.is_active = true));
