-- AN-01/AN-02: record page events and read per-day aggregates.

-- AN-01: called only by the app's events route with the secret key (service_role), after validation and rate limiting.
-- Events count only for live pages; returns false when the path is not a published page.
create or replace function public.record_page_event(
  p_username text,
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
  select p.id into v_page_id
  from public.pages p
  join public.profiles pr on pr.id = p.owner_id
  where pr.username = p_username and p.slug = p_slug and p.live_version_id is not null;
  if v_page_id is null then
    return false;
  end if;
  -- Column checks on page_events enforce event_type and field lengths.
  insert into public.page_events (page_id, event_type, block_id, referrer_host, utm_source)
  values (v_page_id, p_event_type, p_block_id, p_referrer_host, p_utm_source);
  return true;
end;
$$;

-- AN-02: daily views/clicks of the caller's own pages (days in Asia/Ho_Chi_Minh, at most 90).
-- security definer because clients have no direct access to page_events (DB-06); filtered by auth.uid().
create or replace function public.page_traffic(p_days int default 30)
returns table (page_id uuid, day date, views bigint, clicks bigint)
language sql
stable
security definer
set search_path = ''
as $$
  select
    e.page_id,
    (e.occurred_at at time zone 'Asia/Ho_Chi_Minh')::date as day,
    count(*) filter (where e.event_type = 'view') as views,
    count(*) filter (where e.event_type = 'click') as clicks
  from public.page_events e
  join public.pages p on p.id = e.page_id
  where p.owner_id = (select auth.uid())
    and e.occurred_at >= (
      ((now() at time zone 'Asia/Ho_Chi_Minh')::date - (least(greatest(p_days, 1), 90) - 1))::timestamp
      at time zone 'Asia/Ho_Chi_Minh'
    )
  group by 1, 2
  order by 1, 2;
$$;

revoke execute on function public.record_page_event(text, text, text, text, text, text) from public, anon, authenticated;
grant execute on function public.record_page_event(text, text, text, text, text, text) to service_role;
revoke execute on function public.page_traffic(int) from public, anon;
grant execute on function public.page_traffic(int) to authenticated;
