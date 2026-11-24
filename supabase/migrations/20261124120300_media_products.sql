-- DB-04: media assets, products and their placement on pages, plus the `media` Storage bucket.

create table public.media_assets (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles (id) on delete cascade,
  storage_bucket text not null default 'media',
  storage_path text not null,
  mime_type text not null check (mime_type in ('image/webp', 'image/avif', 'image/png', 'image/jpeg')),
  bytes bigint not null check (bytes between 1 and 5242880),
  visibility text not null default 'public' check (visibility in ('public', 'private')),
  created_at timestamptz not null default now(),
  constraint media_assets_bucket_path_key unique (storage_bucket, storage_path),
  -- Never trust client paths: objects live under "<owner_id>/".
  constraint media_assets_path_owned check (storage_path like owner_id::text || '/%' and storage_path not like '%..%')
);
alter table public.media_assets enable row level security;
create index media_assets_owner_idx on public.media_assets (owner_id, created_at desc);

create table public.products (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles (id) on delete cascade,
  title text not null check (char_length(title) between 1 and 200),
  destination_url text not null check (destination_url ~ '^https?://'),
  affiliate_url text check (affiliate_url ~ '^https?://'),
  image_asset_id uuid references public.media_assets (id) on delete set null,
  image_url text check (image_url ~ '^(https?://|/)'),
  price numeric(14, 2) check (price >= 0),
  currency text check (currency ~ '^[A-Z]{3}$'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.products enable row level security;
create index products_owner_idx on public.products (owner_id, updated_at desc);
create index products_image_asset_idx on public.products (image_asset_id);

create trigger products_set_updated_at
before update on public.products
for each row execute function private.set_updated_at();

create table public.page_products (
  page_id uuid not null references public.pages (id) on delete cascade,
  product_id uuid not null references public.products (id) on delete cascade,
  position int not null default 0 check (position >= 0),
  visible boolean not null default true,
  primary key (page_id, product_id)
);
alter table public.page_products enable row level security;
create index page_products_product_idx on public.page_products (product_id);

-- Page and product must belong to the same owner, also for server-side writes.
create or replace function private.check_page_product_owner()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if (select owner_id from public.pages where id = new.page_id)
     is distinct from (select owner_id from public.products where id = new.product_id) then
    raise exception 'page and product owners differ' using errcode = 'PT403';
  end if;
  return new;
end;
$$;

create trigger page_products_same_owner
before insert or update on public.page_products
for each row execute function private.check_page_product_owner();

-- Storage: public bucket (served by URL), writes only into the caller's own folder.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('media', 'media', true, 5242880, array['image/webp', 'image/avif', 'image/png', 'image/jpeg'])
on conflict (id) do nothing;

create policy media_objects_insert_own on storage.objects
for insert to authenticated
with check (bucket_id = 'media' and (storage.foldername(name))[1] = (select auth.uid())::text);

create policy media_objects_select_own on storage.objects
for select to authenticated
using (bucket_id = 'media' and (storage.foldername(name))[1] = (select auth.uid())::text);

create policy media_objects_update_own on storage.objects
for update to authenticated
using (bucket_id = 'media' and (storage.foldername(name))[1] = (select auth.uid())::text)
with check (bucket_id = 'media' and (storage.foldername(name))[1] = (select auth.uid())::text);

create policy media_objects_delete_own on storage.objects
for delete to authenticated
using (bucket_id = 'media' and (storage.foldername(name))[1] = (select auth.uid())::text);
