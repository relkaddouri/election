-- =============================================================================
-- Supabase Storage — bucket du logo du parti (page « الإعدادات »)
-- =============================================================================

-- Bucket public : le logo est repris dans les en-têtes PDF/Excel et doit être
-- servi sans jeton. N'y déposer aucune donnée personnelle.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'public-assets',
  'public-assets',
  true,
  2 * 1024 * 1024,
  array['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml']
)
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "public_assets_read" on storage.objects;
create policy "public_assets_read" on storage.objects
  for select to anon, authenticated
  using (bucket_id = 'public-assets');

drop policy if exists "public_assets_insert" on storage.objects;
create policy "public_assets_insert" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'public-assets' and public.is_super_admin());

drop policy if exists "public_assets_update" on storage.objects;
create policy "public_assets_update" on storage.objects
  for update to authenticated
  using (bucket_id = 'public-assets' and public.is_super_admin())
  with check (bucket_id = 'public-assets' and public.is_super_admin());

drop policy if exists "public_assets_delete" on storage.objects;
create policy "public_assets_delete" on storage.objects
  for delete to authenticated
  using (bucket_id = 'public-assets' and public.is_super_admin());
