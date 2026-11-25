-- PUB-01/PUB-02: on-demand publishing (decision 2026-11-25, replaces rebuild-per-publish).
-- Publishing points live_version_id at an immutable page_versions row; the app then refreshes that page's cache.

-- PUB-01: publish the draft revision the owner is looking at. Idempotent: publishing the same revision again is a no-op.
create or replace function public.publish_page(p_page_id uuid, p_expected_revision bigint)
returns table (revision bigint, live_version_id uuid, slug text)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  v_page public.pages;
  v_draft public.page_versions;
begin
  if v_uid is null then
    raise exception 'UNAUTHENTICATED' using errcode = 'PT401';
  end if;
  select * into v_page from public.pages where id = p_page_id and owner_id = v_uid for update;
  if not found then
    raise exception 'PAGE_NOT_FOUND' using errcode = 'PT404';
  end if;
  select * into v_draft from public.page_versions where id = v_page.draft_version_id;
  -- Never publish a newer draft than the one the owner reviewed (e.g. saved from another tab).
  if v_draft.revision <> p_expected_revision then
    raise exception 'REVISION_CONFLICT' using errcode = 'PT409';
  end if;

  if v_page.live_version_id is distinct from v_draft.id then
    update public.pages
    set desired_version_id = v_draft.id, live_version_id = v_draft.id, status = 'published'
    where id = v_page.id;
  end if;
  return query select v_draft.revision, v_draft.id, v_page.slug;
end;
$$;

-- PUB-02: what a visitor may read. Only the live snapshot (never drafts), or where an old address now points.
-- security definer because anon has no access to pages/page_versions/url_redirects (DB-06).
create or replace function public.get_published_page(p_username text, p_slug text)
returns table (config jsonb, redirect_to text)
language sql
stable
security definer
set search_path = ''
as $$
  -- A live page wins over a redirect for the same path (a new page may reuse a renamed page's old slug).
  select config, redirect_to from (
    select v.config, null::text as redirect_to, 0 as priority
    from public.profiles pr
    join public.pages p on p.owner_id = pr.id
    join public.page_versions v on v.id = p.live_version_id and v.page_id = p.id
    where pr.username = p_username and p.slug = p_slug
    union all
    select null::jsonb, r.new_path, 1
    from public.url_redirects r
    where r.old_path = '/' || p_username || '/' || p_slug
  ) found
  order by priority
  limit 1;
$$;

revoke execute on function public.publish_page(uuid, bigint) from public, anon;
grant execute on function public.publish_page(uuid, bigint) to authenticated;
revoke execute on function public.get_published_page(text, text) from public;
grant execute on function public.get_published_page(text, text) to anon, authenticated;
