-- V2-12a: read-only report before global slugs (V2-12b). Run against a project with:
--   supabase db query --remote --read-only -f supabase/reports/slug_collisions.sql
-- Lists slugs that V2-12b would change: shared by several pages, or not valid under the global rule.
select
  p.slug,
  count(*) as pages,
  string_agg(coalesce(pr.username::text, '(no username)'), ', ' order by p.created_at) as owners_oldest_first,
  bool_or(p.slug !~ '^[a-z0-9][a-z0-9-]{2,29}$') as bad_format,
  bool_or(p.slug = any (array[
    'admin', 'api', 'auth', 'dashboard', 'forgot-password', 'help', 'login', 'logout',
    'onboarding', 'register', 'settings', 'signup', 'static', 'support', 'templates', 'www'
  ])) as reserved
from linktree.pages p
left join linktree.profiles pr on pr.id = p.owner_id
group by p.slug
having count(*) > 1
  or bool_or(p.slug !~ '^[a-z0-9][a-z0-9-]{2,29}$')
  or bool_or(p.slug = any (array[
    'admin', 'api', 'auth', 'dashboard', 'forgot-password', 'help', 'login', 'logout',
    'onboarding', 'register', 'settings', 'signup', 'static', 'support', 'templates', 'www'
  ]))
order by p.slug;
