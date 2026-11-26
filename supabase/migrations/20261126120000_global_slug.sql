-- V2-12b/c, V2-13b (Q6 approved 2026-11-26): one slug namespace for the whole system, served at /{slug}.
-- Rule: [a-z0-9-], 3–30 chars, starts with a letter or digit, not a reserved name. Old /{username}/{slug}
-- addresses of live pages keep working through url_redirects (the app answers 308).
-- V2-12a (read-only report, supabase/reports/slug_collisions.sql) on Staging 2026-11-26: no shared slugs,
-- all 3 slugs already valid, so the suffixing below changes nothing there.

-- Keep in sync with RESERVED_USERNAMES (src/lib/schemas/username.ts); src/lib/reserved.test.ts checks both
-- and that every top-level app route is listed.
create function linktree_private.reserved_names()
returns text[]
language sql
immutable
set search_path = ''
as $$
  select array[
    'admin', 'api', 'auth', 'dashboard', 'forgot-password', 'help', 'login', 'logout',
    'onboarding', 'register', 'settings', 'signup', 'static', 'support', 'templates', 'www'
  ]::text[];
$$;

-- ---------- backfill: suffix duplicates and slugs that break the new rule ----------
create temporary table slug_map as
select
  p.id,
  p.slug as old_slug,
  pr.username::text as username,
  p.live_version_id is not null as live,
  row_number() over (partition by p.slug order by p.created_at, p.id) as n
from linktree.pages p
left join linktree.profiles pr on pr.id = p.owner_id;

-- The oldest page keeps a valid slug; others get "-xxxx" from their id (a clash with an existing slug
-- fails the unique index below and rolls the migration back).
alter table slug_map add column new_slug text;
update slug_map set new_slug = case
  when n = 1 and old_slug ~ '^[a-z0-9][a-z0-9-]{2,29}$' and not old_slug = any (linktree_private.reserved_names())
    then old_slug
  else rtrim(left(old_slug, 25), '-') || '-' || left(md5(id::text), 4)
end;

-- Redirect paths may now be /{slug} (renamed page) or /{username}/{slug} (address before V2-12b).
alter table linktree.url_redirects
  drop constraint url_redirects_old_path_check,
  drop constraint url_redirects_new_path_check,
  add constraint url_redirects_old_path_check check (old_path ~ '^/[a-z0-9][a-z0-9-]*(/[a-z0-9][a-z0-9-]*)?$');

update linktree.url_redirects r
set new_path = '/' || m.new_slug
from slug_map m
where m.id = r.page_id;

insert into linktree.url_redirects (page_id, old_path, new_path)
select id, '/' || username || '/' || old_slug, '/' || new_slug
from slug_map
where live and username is not null
on conflict (old_path) do update set page_id = excluded.page_id, new_path = excluded.new_path;

update linktree.pages p
set slug = m.new_slug
from slug_map m
where m.id = p.id and p.slug <> m.new_slug;

alter table linktree.pages
  drop constraint pages_owner_slug_key,
  drop constraint pages_slug_check,
  add constraint pages_slug_format check (slug ~ '^[a-z0-9][a-z0-9-]{2,29}$'),
  add constraint pages_slug_reserved check (not slug = any (linktree_private.reserved_names())),
  add constraint pages_slug_key unique (slug);
drop table slug_map;
alter table linktree.url_redirects
  add constraint url_redirects_new_path_check check (new_path ~ '^/[a-z0-9][a-z0-9-]{2,29}$');

-- A slug another company's page still redirects from stays theirs, so nobody can capture its old links.
create function linktree_private.slug_held_by_other(p_slug text, p_company_id uuid)
returns boolean
language sql
stable
set search_path = ''
as $$
  select exists (
    select 1 from linktree.url_redirects r join linktree.pages p on p.id = r.page_id
    where r.old_path = '/' || p_slug and p.company_id <> p_company_id
  );
$$;

-- ---------- RPCs ----------
create or replace function linktree.create_page(p_template_key text, p_slug text)
returns linktree.pages
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_member linktree.company_members := linktree_private.my_membership();
  v_template linktree.templates;
  v_page linktree.pages;
  v_version_id uuid;
begin
  if linktree_private.role_rank(v_member.role) < linktree_private.role_rank('admin') then
    raise exception 'FORBIDDEN' using errcode = 'PT403';
  end if;
  select * into v_template from linktree.templates where key = p_template_key and is_active;
  if not found then
    raise exception 'TEMPLATE_NOT_FOUND' using errcode = 'PT404';
  end if;
  if linktree_private.slug_held_by_other(p_slug, v_member.company_id) then
    raise exception 'SLUG_TAKEN' using errcode = 'PT409';
  end if;

  begin
    insert into linktree.pages (owner_id, company_id, template_id, slug)
    values (v_member.user_id, v_member.company_id, v_template.id, p_slug)
    returning * into v_page;
  exception
    when unique_violation then
      raise exception 'SLUG_TAKEN' using errcode = 'PT409';
    when check_violation then
      raise exception 'INVALID_SLUG' using errcode = 'PT400';
  end;

  insert into linktree.page_versions (page_id, revision, schema_version, config, created_by)
  values (
    v_page.id, 1, v_template.schema_version,
    v_template.default_config || jsonb_build_object('template', v_template.key), v_member.user_id
  )
  returning id into v_version_id;

  -- The address is a real page now, so it can no longer redirect (only own redirects reach here).
  delete from linktree.url_redirects where old_path = '/' || p_slug;
  update linktree.pages set draft_version_id = v_version_id where id = v_page.id returning * into v_page;
  return v_page;
end;
$$;

create or replace function linktree.rename_page(p_page_id uuid, p_new_slug text)
returns linktree.pages
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_page linktree.pages := linktree_private.page_for(p_page_id, 'admin');
  v_old_path text := '/' || v_page.slug;
  v_new_path text := '/' || p_new_slug;
begin
  if v_page.slug = p_new_slug then
    return v_page;
  end if;
  if linktree_private.slug_held_by_other(p_new_slug, v_page.company_id) then
    raise exception 'SLUG_TAKEN' using errcode = 'PT409';
  end if;

  begin
    update linktree.pages set slug = p_new_slug where id = v_page.id returning * into v_page;
  exception
    when unique_violation then
      raise exception 'SLUG_TAKEN' using errcode = 'PT409';
    when check_violation then
      raise exception 'INVALID_SLUG' using errcode = 'PT400';
  end;

  -- The new address is a real page again, so it can no longer redirect elsewhere.
  delete from linktree.url_redirects where old_path = v_new_path;
  if v_page.live_version_id is not null then
    -- Every older address of this page goes straight to the new one (no redirect chains).
    update linktree.url_redirects set new_path = v_new_path where page_id = v_page.id;
    insert into linktree.url_redirects (page_id, old_path, new_path)
    values (v_page.id, v_old_path, v_new_path)
    on conflict (old_path) do update set page_id = excluded.page_id, new_path = excluded.new_path;
  end if;
  return v_page;
end;
$$;

-- For the create/rename forms: 'available', 'invalid', 'reserved' or 'taken'. The app rate-limits callers.
create function linktree.slug_available(p_slug text)
returns text
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_member linktree.company_members := linktree_private.my_membership();
begin
  if p_slug !~ '^[a-z0-9][a-z0-9-]{2,29}$' then
    return 'invalid';
  end if;
  if p_slug = any (linktree_private.reserved_names()) then
    return 'reserved';
  end if;
  if exists (select 1 from linktree.pages where slug = p_slug)
     or linktree_private.slug_held_by_other(p_slug, v_member.company_id) then
    return 'taken';
  end if;
  return 'available';
end;
$$;
revoke execute on function linktree.slug_available(text) from public, anon;
grant execute on function linktree.slug_available(text) to authenticated;

-- PUB-02: what a public path shows. '/{slug}' → the live config; '/{slug}' or '/{username}/{slug}' that
-- moved → redirect_to. page_id lets the app tag the cache per page. A live page wins over a redirect.
drop function linktree.get_published_page(text, text);
create function linktree.get_published_page(p_path text)
returns table (page_id uuid, config jsonb, redirect_to text)
language sql
stable
security definer
set search_path = ''
as $$
  select page_id, config, redirect_to from (
    select p.id as page_id, v.config, null::text as redirect_to, 0 as priority
    from linktree.pages p
    join linktree.page_versions v on v.id = p.live_version_id and v.page_id = p.id
    where left(p_path, 1) = '/' and p.slug = substr(p_path, 2)
    union all
    select r.page_id, null::jsonb, r.new_path, 1
    from linktree.url_redirects r
    where r.old_path = p_path
  ) found
  order by priority
  limit 1;
$$;
revoke execute on function linktree.get_published_page(text) from public;
grant execute on function linktree.get_published_page(text) to anon, authenticated, service_role;

-- AN-01: events are recorded by slug now (the tracker runs on /{slug}).
drop function linktree.record_page_event(text, text, text, text, text, text);
create function linktree.record_page_event(
  p_slug text,
  p_event_type text,
  p_block_id text default null,
  p_referrer_host text default null,
  p_utm_source text default null
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_page_id uuid;
begin
  select id into v_page_id from linktree.pages where slug = p_slug and live_version_id is not null;
  if v_page_id is null then
    return false;
  end if;
  -- Column checks on page_events enforce event_type and field lengths.
  insert into linktree.page_events (page_id, event_type, block_id, referrer_host, utm_source)
  values (v_page_id, p_event_type, p_block_id, p_referrer_host, p_utm_source);
  return true;
end;
$$;
revoke execute on function linktree.record_page_event(text, text, text, text, text) from public, anon, authenticated;
grant execute on function linktree.record_page_event(text, text, text, text, text) to service_role;
