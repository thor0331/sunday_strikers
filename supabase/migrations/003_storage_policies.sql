insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'player-photos',
  'player-photos',
  true,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'group-assets',
  'group-assets',
  true,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create policy "Public can read player photos"
on storage.objects for select
to anon, authenticated
using (bucket_id in ('player-photos', 'group-assets'));

create policy "Admins can upload player photos"
on storage.objects for insert
to authenticated
with check (bucket_id in ('player-photos', 'group-assets') and public.is_admin());

create policy "Admins can update player photos"
on storage.objects for update
to authenticated
using (bucket_id in ('player-photos', 'group-assets') and public.is_admin())
with check (bucket_id in ('player-photos', 'group-assets') and public.is_admin());

create policy "Admins can delete player photos"
on storage.objects for delete
to authenticated
using (bucket_id in ('player-photos', 'group-assets') and public.is_admin());
