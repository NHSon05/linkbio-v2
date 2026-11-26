-- V2-10c: our Storage bucket gets a linktree- name (Eosoft's project may already use "media"), and uploads
-- belong to the company: objects live under "<company_id>/", written by editor+ (role matrix).
-- Staging check 2026-11-26: bucket media had 0 objects, media_assets 0 rows, no page version referenced it,
-- so no files or URLs move. This chain never runs on Eosoft's project (baseline migration, data-model.md).

do $$
begin
  if exists (select 1 from storage.objects where bucket_id = 'media') or exists (select 1 from linktree.media_assets) then
    raise exception 'bucket media or media_assets is not empty: move the files first (V2-10c)';
  end if;
end;
$$;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('linktree-media', 'linktree-media', true, 5242880, array['image/webp', 'image/avif', 'image/png', 'image/jpeg'])
on conflict (id) do nothing;

drop policy media_objects_insert_own on storage.objects;
drop policy media_objects_select_own on storage.objects;
drop policy media_objects_update_own on storage.objects;
drop policy media_objects_delete_own on storage.objects;
-- Newer Storage blocks direct deletes unless this is set for the transaction.
select set_config('storage.allow_delete_query', 'true', true);
delete from storage.buckets where id = 'media';

create policy linktree_media_select_member on storage.objects
for select to authenticated
using (bucket_id = 'linktree-media' and exists (
  select 1 from linktree.company_members m
  where m.user_id = (select auth.uid()) and m.company_id::text = (storage.foldername(name))[1]
));

create policy linktree_media_insert_editor on storage.objects
for insert to authenticated
with check (bucket_id = 'linktree-media' and exists (
  select 1 from linktree.company_members m
  where m.user_id = (select auth.uid()) and m.company_id::text = (storage.foldername(name))[1]
    and m.role in ('editor', 'admin', 'owner', 'super_admin')
));

create policy linktree_media_delete_editor on storage.objects
for delete to authenticated
using (bucket_id = 'linktree-media' and exists (
  select 1 from linktree.company_members m
  where m.user_id = (select auth.uid()) and m.company_id::text = (storage.foldername(name))[1]
    and m.role in ('editor', 'admin', 'owner', 'super_admin')
));

-- media_assets follows the company too (table is empty, checked above). owner_id = uploader, kept for audit.
alter table linktree.media_assets
  add column company_id uuid not null references linktree.companies (id) on delete cascade,
  alter column storage_bucket set default 'linktree-media',
  alter column owner_id drop not null,
  drop constraint media_assets_owner_id_fkey,
  add constraint media_assets_owner_id_fkey foreign key (owner_id) references linktree.profiles (id) on delete set null,
  drop constraint media_assets_path_owned,
  add constraint media_assets_path_owned
    check (storage_path like company_id::text || '/%' and storage_path not like '%..%');
create index media_assets_company_idx on linktree.media_assets (company_id, created_at desc);

drop policy media_assets_select_own on linktree.media_assets;
drop policy media_assets_insert_own on linktree.media_assets;
drop policy media_assets_delete_own on linktree.media_assets;

create policy media_assets_select_member on linktree.media_assets
for select to authenticated
using (company_id in (select m.company_id from linktree.company_members m where m.user_id = (select auth.uid())));

create policy media_assets_insert_editor on linktree.media_assets
for insert to authenticated
with check (
  owner_id = (select auth.uid()) and storage_bucket = 'linktree-media'
  and exists (
    select 1 from linktree.company_members m
    where m.user_id = (select auth.uid()) and m.company_id = media_assets.company_id
      and m.role in ('editor', 'admin', 'owner', 'super_admin')
  )
);

create policy media_assets_delete_editor on linktree.media_assets
for delete to authenticated
using (exists (
  select 1 from linktree.company_members m
  where m.user_id = (select auth.uid()) and m.company_id = media_assets.company_id
    and m.role in ('editor', 'admin', 'owner', 'super_admin')
));
