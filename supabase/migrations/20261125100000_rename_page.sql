-- FE-07: rename a page's slug. A page that has been published keeps its old address working through url_redirects.
-- security definer: clients may not update pages or write url_redirects directly (DB-06); ownership is checked here.

create or replace function public.rename_page(p_page_id uuid, p_new_slug text)
returns public.pages
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  v_username text;
  v_page public.pages;
  v_old_path text;
  v_new_path text;
begin
  if v_uid is null then
    raise exception 'UNAUTHENTICATED' using errcode = 'PT401';
  end if;
  select username into v_username from public.profiles where id = v_uid;
  if v_username is null then
    raise exception 'USERNAME_REQUIRED' using errcode = 'PT403';
  end if;
  select * into v_page from public.pages where id = p_page_id and owner_id = v_uid for update;
  if not found then
    raise exception 'PAGE_NOT_FOUND' using errcode = 'PT404';
  end if;
  if v_page.slug = p_new_slug then
    return v_page;
  end if;

  v_old_path := '/' || v_username || '/' || v_page.slug;
  v_new_path := '/' || v_username || '/' || p_new_slug;

  begin
    update public.pages set slug = p_new_slug where id = v_page.id returning * into v_page;
  exception
    when unique_violation then
      raise exception 'SLUG_TAKEN' using errcode = 'PT409';
    when check_violation then
      raise exception 'INVALID_SLUG' using errcode = 'PT400';
  end;

  -- The new address is a real page again, so it can no longer redirect elsewhere.
  delete from public.url_redirects where old_path = v_new_path;
  if v_page.live_version_id is not null then
    -- Older addresses of this page skip straight to the new one (no redirect chains).
    update public.url_redirects set new_path = v_new_path where new_path = v_old_path;
    insert into public.url_redirects (page_id, old_path, new_path)
    values (v_page.id, v_old_path, v_new_path)
    on conflict (old_path) do update set page_id = excluded.page_id, new_path = excluded.new_path;
  end if;
  return v_page;
end;
$$;

revoke execute on function public.rename_page(uuid, text) from public, anon;
grant execute on function public.rename_page(uuid, text) to authenticated;
