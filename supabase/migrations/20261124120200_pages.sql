-- DB-03: pages and immutable page_versions.
-- Each draft save appends a version (revision + 1); pages.*_version_id point into it.
-- Clients create pages and save drafts only through create_page() / save_draft();
-- status, desired_version_id and live_version_id are written by the trusted server (Phase 5).

create table public.pages (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles (id) on delete cascade,
  template_id uuid not null references public.templates (id),
  slug text not null check (slug ~ '^[a-z0-9][a-z0-9-]{0,62}$'),
  status text not null default 'draft' check (status in ('draft', 'publishing', 'published', 'archived')),
  draft_version_id uuid,
  desired_version_id uuid,
  live_version_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- Same slug is fine for different owners: /{username}/{slug}.
  constraint pages_owner_slug_key unique (owner_id, slug)
);
alter table public.pages enable row level security;
create index pages_owner_updated_idx on public.pages (owner_id, updated_at desc);
create index pages_template_id_idx on public.pages (template_id);

create trigger pages_set_updated_at
before update on public.pages
for each row execute function private.set_updated_at();

create table public.page_versions (
  id uuid primary key default gen_random_uuid(),
  page_id uuid not null references public.pages (id) on delete cascade,
  revision bigint not null check (revision > 0),
  schema_version int not null check (schema_version > 0),
  -- PageConfigSchema (src/lib/schemas/site.ts); slug/owner live on pages, not here.
  config jsonb not null check (jsonb_typeof(config) = 'object'),
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  constraint page_versions_page_revision_key unique (page_id, revision),
  constraint page_versions_page_id_id_key unique (page_id, id),
  constraint page_versions_schema_version_matches check (config -> 'schemaVersion' = to_jsonb(schema_version))
);
alter table public.page_versions enable row level security;
create index page_versions_created_by_idx on public.page_versions (created_by);

-- A pointer may only reference a version of the same page.
alter table public.pages
  add constraint pages_draft_version_fk foreign key (id, draft_version_id) references public.page_versions (page_id, id),
  add constraint pages_desired_version_fk foreign key (id, desired_version_id) references public.page_versions (page_id, id),
  add constraint pages_live_version_fk foreign key (id, live_version_id) references public.page_versions (page_id, id);

-- Versions are snapshots: never edited after insert.
create or replace function private.forbid_update()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  raise exception '% rows are immutable', tg_table_name using errcode = 'PT409';
end;
$$;

create trigger page_versions_immutable
before update on public.page_versions
for each row execute function private.forbid_update();

-- Errors use PostgREST codes PT4xx so supabase-js gets the matching HTTP status.
create or replace function public.create_page(p_template_key text, p_slug text)
returns public.pages
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  v_template public.templates;
  v_page public.pages;
  v_version_id uuid;
begin
  if v_uid is null then
    raise exception 'UNAUTHENTICATED' using errcode = 'PT401';
  end if;
  if not exists (select 1 from public.profiles where id = v_uid and username is not null) then
    raise exception 'USERNAME_REQUIRED' using errcode = 'PT403';
  end if;
  select * into v_template from public.templates where key = p_template_key and is_active;
  if not found then
    raise exception 'TEMPLATE_NOT_FOUND' using errcode = 'PT404';
  end if;

  begin
    insert into public.pages (owner_id, template_id, slug)
    values (v_uid, v_template.id, p_slug)
    returning * into v_page;
  exception
    when unique_violation then
      raise exception 'SLUG_TAKEN' using errcode = 'PT409';
    when check_violation then
      raise exception 'INVALID_SLUG' using errcode = 'PT400';
  end;

  insert into public.page_versions (page_id, revision, schema_version, config, created_by)
  values (
    v_page.id, 1, v_template.schema_version,
    v_template.default_config || jsonb_build_object('template', v_template.key), v_uid
  )
  returning id into v_version_id;

  update public.pages set draft_version_id = v_version_id where id = v_page.id returning * into v_page;
  return v_page;
end;
$$;

create or replace function public.save_draft(p_page_id uuid, p_expected_revision bigint, p_config jsonb)
returns table (version_id uuid, revision bigint)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  v_page public.pages;
  v_current bigint;
  v_template_id uuid;
begin
  if v_uid is null then
    raise exception 'UNAUTHENTICATED' using errcode = 'PT401';
  end if;
  -- Lock the page so concurrent saves serialize on the revision check.
  select * into v_page from public.pages where id = p_page_id and owner_id = v_uid for update;
  if not found then
    raise exception 'PAGE_NOT_FOUND' using errcode = 'PT404';
  end if;
  if jsonb_typeof(p_config) is distinct from 'object' or p_config -> 'schemaVersion' is distinct from '1'::jsonb then
    raise exception 'INVALID_CONFIG' using errcode = 'PT400';
  end if;
  select id into v_template_id from public.templates where key = p_config ->> 'template' and is_active;
  if not found then
    raise exception 'TEMPLATE_NOT_FOUND' using errcode = 'PT400';
  end if;

  select v.revision into v_current from public.page_versions v where v.id = v_page.draft_version_id;
  if v_current is distinct from p_expected_revision then
    raise exception 'REVISION_CONFLICT' using errcode = 'PT409';
  end if;

  insert into public.page_versions (page_id, revision, schema_version, config, created_by)
  values (p_page_id, v_current + 1, 1, p_config, v_uid)
  returning id, page_versions.revision into version_id, revision;

  update public.pages set draft_version_id = version_id, template_id = v_template_id where id = p_page_id;
  return next;
end;
$$;

revoke execute on function public.create_page(text, text) from public, anon;
revoke execute on function public.save_draft(uuid, bigint, jsonb) from public, anon;
grant execute on function public.create_page(text, text) to authenticated;
grant execute on function public.save_draft(uuid, bigint, jsonb) to authenticated;
