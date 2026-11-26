-- DB-06 / V2-15a: tenant isolation and the role matrix. Everything runs in one transaction and is rolled back.
-- Run against a database with all migrations applied (local Supabase):
--   psql "$DB_URL" -v ON_ERROR_STOP=1 -f supabase/tests/rls_test.sql
-- Prints "rls_test: all passed" on success; any failed assertion aborts with an error.
--
-- Company A: a (owner), d (admin), e (editor), v (viewer). Company B: b (owner). c: own company, no username.

\set ON_ERROR_STOP 1
\set user_a '00000000-0000-4000-8000-00000000000a'
\set user_b '00000000-0000-4000-8000-00000000000b'
\set user_c '00000000-0000-4000-8000-00000000000c'
\set user_d '00000000-0000-4000-8000-00000000000d'
\set user_e '00000000-0000-4000-8000-00000000000e'
\set user_v '00000000-0000-4000-8000-00000000000f'

begin;

create schema tests;
grant usage on schema tests to anon, authenticated, service_role;

create function tests.ok(passed boolean, label text) returns void language plpgsql as $$
begin
  if passed is not true then raise exception 'FAILED: %', label; end if;
end $$;

-- Runs sql as the current role and expects it to fail with the given SQLSTATE.
create function tests.throws(sql text, code text, label text) returns void language plpgsql as $$
begin
  execute sql;
  raise exception 'FAILED (no error): %', label;
exception when others then
  if sqlstate like 'FAILED%' or sqlerrm like 'FAILED (no error)%' then raise; end if;
  if sqlstate <> code then raise exception 'FAILED: % (got % %, want %)', label, sqlstate, sqlerrm, code; end if;
end $$;

-- Switches the session to a signed-in user (role authenticated) or back to the superuser.
create function tests.as_user(uid uuid) returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claims', json_build_object('sub', uid, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
end $$;
grant execute on all functions in schema tests to anon, authenticated, service_role;

-- ---------- setup (superuser) ----------
insert into auth.users (id, raw_user_meta_data) values
  (:'user_a', '{"full_name": "Son"}'), (:'user_b', '{}'), (:'user_c', '{}'),
  (:'user_d', '{}'), (:'user_e', '{}'), (:'user_v', '{}');

select tests.ok((select display_name from linktree.profiles where id = :'user_a') = 'Son', 'signup trigger creates profile');
select tests.ok((select count(*) from linktree.company_members where role = 'owner' and user_id in (:'user_a', :'user_b', :'user_c')) = 3,
  'signup trigger makes each user owner of a company');
select tests.ok((select c.name from linktree.companies c join linktree.company_members m on m.company_id = c.id where m.user_id = :'user_a') = 'Son',
  'company named after the user');
select m.company_id as company_a from linktree.company_members m where m.user_id = :'user_a' \gset
select m.company_id as company_b from linktree.company_members m where m.user_id = :'user_b' \gset

-- d, e, v join company A (member management RPCs come with V2-11e).
delete from linktree.company_members where user_id in (:'user_d', :'user_e', :'user_v');
insert into linktree.company_members (company_id, user_id, role) values
  (:'company_a', :'user_d', 'admin'), (:'company_a', :'user_e', 'editor'), (:'company_a', :'user_v', 'viewer');
select tests.throws(format($$insert into linktree.company_members (company_id, user_id, role) values (%L, %L, 'viewer')$$, :'company_b', :'user_a'),
  '23505', 'a user belongs to one company only');
select tests.throws(format($$update linktree.company_members set role = 'boss' where user_id = %L$$, :'user_v'), '23514', 'unknown role rejected');

-- ---------- profiles ----------
select tests.as_user(:'user_a');
select tests.throws($$update linktree.profiles set username = 'Son' where id = auth.uid()$$, '23514', 'uppercase username rejected');
select tests.throws($$update linktree.profiles set username = 'login' where id = auth.uid()$$, '23514', 'reserved username rejected');
update linktree.profiles set username = 'son' where id = auth.uid();
select tests.throws($$update linktree.profiles set username = 'son2' where id = auth.uid()$$, 'PT409', 'username locked once set');
update linktree.profiles set display_name = 'hacked' where id = :'user_b';
reset role;
select tests.ok((select display_name from linktree.profiles where id = :'user_b') is null, 'cannot update another profile');

select tests.as_user(:'user_b');
select tests.throws($$update linktree.profiles set username = 'son' where id = auth.uid()$$, '23505', 'username unique (case-insensitive)');
update linktree.profiles set username = 'tien' where id = auth.uid();
reset role;

-- ---------- companies and membership ----------
select tests.as_user(:'user_v');
select tests.ok((select count(*) from linktree.company_members) = 1, 'member sees only own membership row');
select tests.ok((select count(*) from linktree.companies) = 1 and (select id from linktree.companies) = :'company_a', 'member sees only own company');
select tests.throws(format($$insert into linktree.company_members (company_id, user_id, role) values (%L, %L, 'owner')$$, :'company_a', :'user_c'),
  '42501', 'client cannot add members');
select tests.throws($$update linktree.company_members set role = 'super_admin' where user_id = auth.uid()$$, '42501', 'client cannot raise own role');
reset role;

-- ---------- create_page: global slug, admin+ ----------
select tests.as_user(:'user_a');
select (linktree.create_page('classic', 'tech-review')).id as page_a \gset
select tests.throws($$select linktree.create_page('classic', 'Bad Slug')$$, 'PT400', 'invalid slug');
select tests.throws($$select linktree.create_page('classic', 'ab')$$, 'PT400', 'slug shorter than 3 rejected');
select tests.throws($$select linktree.create_page('classic', 'login')$$, 'PT400', 'reserved slug rejected');
select tests.throws($$select linktree.create_page('classic', repeat('a', 31))$$, 'PT400', 'slug longer than 30 rejected');
select tests.throws($$select linktree.create_page('nope', 'some-page')$$, 'PT404', 'unknown template');
reset role;

select tests.as_user(:'user_b');
select tests.throws($$select linktree.create_page('classic', 'tech-review')$$, 'PT409', 'slug is global: another company cannot reuse it');
select (linktree.create_page('classic', 'tien-shop')).id as page_b \gset
reset role;

select tests.as_user(:'user_c');
select tests.ok((linktree.create_page('classic', 'no-username')).id is not null, 'username no longer needed for a page');
reset role;

select tests.as_user(:'user_e');
select tests.throws($$select linktree.create_page('classic', 'by-editor')$$, 'PT403', 'editor cannot create pages');
reset role;
select tests.as_user(:'user_v');
select tests.throws($$select linktree.create_page('classic', 'by-viewer')$$, 'PT403', 'viewer cannot create pages');
reset role;
select tests.as_user(:'user_d');
select (linktree.create_page('classic', 'other')).id as page_other \gset
reset role;

-- ---------- reads follow the company ----------
select tests.as_user(:'user_v');
select tests.ok((select count(*) from linktree.pages) = 2, 'viewer sees all pages of the company');
select tests.ok((select count(*) from linktree.page_versions where page_id = :'page_a') = 1, 'viewer reads company drafts');
select tests.ok((select count(*) from linktree.pages where id = :'page_b') = 0, 'viewer cannot see another company''s page');
reset role;
select tests.as_user(:'user_b');
select tests.ok((select count(*) from linktree.pages) = 1, 'B sees only own company pages');
select tests.ok((select count(*) from linktree.page_versions where page_id = :'page_a') = 0, 'B cannot read A versions');
reset role;

-- ---------- save_draft: editor+ ----------
select tests.as_user(:'user_v');
select tests.throws(format($$select linktree.save_draft(%L, 1, '{"schemaVersion":1,"template":"classic"}')$$, :'page_a'), 'PT403', 'viewer cannot save drafts');
reset role;
select tests.as_user(:'user_b');
select tests.throws(format($$select linktree.save_draft(%L, 1, '{"schemaVersion":1,"template":"classic"}')$$, :'page_a'), 'PT404', 'other company cannot save A draft');
reset role;
select tests.as_user(:'user_e');
select tests.ok((select revision from linktree.save_draft(:'page_a', 1, '{"schemaVersion":1,"template":"shop-grid","profile":{"title":"A"}}')) = 2, 'editor saves a draft');
select tests.throws(format($$select linktree.save_draft(%L, 1, '{"schemaVersion":1,"template":"classic"}')$$, :'page_a'), 'PT409', 'stale revision rejected');
select tests.throws(format($$select linktree.save_draft(%L, 2, '{"schemaVersion":2,"template":"classic"}')$$, :'page_a'), 'PT400', 'wrong schemaVersion rejected');
select tests.ok((select t.key from linktree.pages p join linktree.templates t on t.id = p.template_id where p.id = :'page_a') = 'shop-grid', 'template follows saved config');
select tests.throws(format($$update linktree.pages set live_version_id = draft_version_id where id = %L$$, :'page_a'), '42501', 'client cannot set live version');
select tests.throws(format($$insert into linktree.page_versions (page_id, revision, schema_version, config) values (%L, 9, 1, '{"schemaVersion":1}')$$, :'page_a'), '42501', 'client cannot insert versions directly');

-- ---------- publish / rename / delete: admin+ ----------
select tests.throws(format($$select * from linktree.publish_page(%L, 2)$$, :'page_a'), 'PT403', 'editor cannot publish');
select tests.throws(format($$select linktree.rename_page(%L, 'renamed')$$, :'page_a'), 'PT403', 'editor cannot rename');
select tests.throws(format($$select linktree.delete_page(%L)$$, :'page_a'), 'PT403', 'editor cannot delete');
select tests.throws(format($$delete from linktree.pages where id = %L$$, :'page_a'), '42501', 'client cannot delete pages directly');
reset role;
select tests.as_user(:'user_b');
select tests.throws(format($$select * from linktree.publish_page(%L, 2)$$, :'page_a'), 'PT404', 'other company cannot publish A page');
select tests.throws(format($$select linktree.rename_page(%L, 'renamed')$$, :'page_a'), 'PT404', 'other company cannot rename A page');
select tests.throws(format($$select linktree.delete_page(%L)$$, :'page_a'), 'PT404', 'other company cannot delete A page');
reset role;

select tests.as_user(:'user_d');
select tests.throws(format($$select * from linktree.publish_page(%L, 1)$$, :'page_a'), 'PT409', 'publish rejects a stale revision');
select tests.ok((select revision from linktree.publish_page(:'page_a', 2)) = 2, 'admin publishes');
select tests.ok((select revision from linktree.publish_page(:'page_a', 2)) = 2, 'publish is idempotent');
select tests.throws(format($$select linktree.rename_page(%L, 'Bad Slug')$$, :'page_a'), 'PT400', 'rename rejects invalid slug');
select tests.throws(format($$select linktree.rename_page(%L, 'tien-shop')$$, :'page_a'), 'PT409', 'rename rejects a slug of another company');
select tests.throws(format($$select linktree.rename_page(%L, 'other')$$, :'page_a'), 'PT409', 'rename rejects a slug of the same company');
select tests.ok((linktree.rename_page(:'page_a', 'tech-2')).slug = 'tech-2', 'admin renames');
select tests.ok((select new_path from linktree.url_redirects where old_path = '/tech-review') = '/tech-2', 'published rename redirects old path');
select tests.ok((linktree.rename_page(:'page_a', 'tech-3')).slug = 'tech-3', 'rename again');
select tests.ok((select new_path from linktree.url_redirects where old_path = '/tech-review') = '/tech-3', 'older addresses skip to the current one');
select tests.ok((select count(*) from linktree.url_redirects where page_id = :'page_a') = 2, 'one redirect per old address');
select tests.ok((linktree.rename_page(:'page_other', 'not-live')).slug = 'not-live', 'rename a draft page');
select tests.ok((select count(*) from linktree.url_redirects where page_id = :'page_other') = 0, 'unpublished rename adds no redirect');
select tests.throws($$insert into linktree.url_redirects (page_id, old_path, new_path) values (gen_random_uuid(), '/a-b', '/b-c')$$, '42501', 'client cannot write redirects');
select tests.ok((select revision from linktree.save_draft(:'page_a', 2, '{"schemaVersion":1,"template":"classic","profile":{"title":"Unpublished edit"}}')) = 3, 'save after publish');
reset role;

-- ---------- slugs held by redirects (no link capture) and slug_available ----------
select tests.as_user(:'user_b');
select tests.throws($$select linktree.create_page('classic', 'tech-review')$$, 'PT409', 'another company cannot take a redirected slug');
select tests.throws(format($$select linktree.rename_page(%L, 'tech-2')$$, :'page_b'), 'PT409', 'another company cannot rename into a redirected slug');
select tests.ok(linktree.slug_available('tech-2') = 'taken', 'redirected slug is taken for other companies');
select tests.ok(linktree.slug_available('tech-3') = 'taken', 'live slug is taken');
select tests.ok(linktree.slug_available('fresh-name') = 'available', 'free slug is available');
select tests.ok(linktree.slug_available('Bad Slug') = 'invalid', 'invalid slug reported');
select tests.ok(linktree.slug_available('dashboard') = 'reserved', 'reserved slug reported');
reset role;
select tests.as_user(:'user_a');
select tests.ok(linktree.slug_available('tech-2') = 'available', 'own redirected slug can be reused by the company');
select tests.ok((linktree.rename_page(:'page_a', 'tech-2')).slug = 'tech-2', 'company moves back to its old slug');
select tests.ok((select count(*) from linktree.url_redirects where old_path = '/tech-2') = 0, 'reused path stops redirecting');
select tests.ok((select new_path from linktree.url_redirects where old_path = '/tech-3') = '/tech-2', 'previous path redirects to current');
reset role;

-- ---------- public reads (anon) ----------
set local role anon;
select tests.ok((select config->'profile'->>'title' from linktree.get_published_page('/tech-2')) = 'A', 'anon reads the live version, not the newer draft');
select tests.ok((select page_id from linktree.get_published_page('/tech-2')) = :'page_a', 'public read returns the page id for cache tags');
select tests.ok((select redirect_to from linktree.get_published_page('/tech-review')) = '/tech-2', 'anon gets redirect for an old path');
select tests.ok((select count(*) from linktree.get_published_page('/tien-shop')) = 0, 'unpublished page is not readable');
select tests.ok((select count(*) from linktree.get_published_page('/son/tech-2')) = 0, 'username paths are not pages');
select tests.ok((select count(*) from linktree.get_published_page('tech-2')) = 0, 'path must start with a slash');
select tests.throws(format($$select * from linktree.publish_page(%L, 3)$$, :'page_a'), '42501', 'anon cannot publish');
select tests.throws($$select linktree.slug_available('x-y-z')$$, '42501', 'anon cannot check slugs');
select tests.throws($$select count(*) from linktree.pages$$, '42501', 'anon cannot read pages');
select tests.throws($$select count(*) from linktree.page_versions$$, '42501', 'anon cannot read drafts');
select tests.throws($$select count(*) from linktree.companies$$, '42501', 'anon cannot read companies');
select tests.throws($$select count(*) from linktree.company_members$$, '42501', 'anon cannot read members');
select tests.throws($$select linktree.create_page('classic', 'x-y-z')$$, '42501', 'anon cannot call create_page');
select tests.throws($$select linktree.rename_page(gen_random_uuid(), 'x-y-z')$$, '42501', 'anon cannot call rename_page');
select tests.throws($$select linktree.delete_page(gen_random_uuid())$$, '42501', 'anon cannot call delete_page');
select tests.ok((select count(*) from linktree.templates) = 3, 'anon reads active templates');
select tests.ok((select count(*) from linktree.profiles where id in (:'user_a', :'user_b', :'user_c')) = 2, 'anon sees only claimed profiles');
reset role;

-- ---------- record_page_event / page_traffic (AN-01, AN-02) ----------
set local role anon;
select tests.throws($$select linktree.record_page_event('tech-2', 'view')$$, '42501', 'anon cannot record events directly');
select tests.throws($$select * from linktree.page_traffic(30)$$, '42501', 'anon cannot read traffic');
reset role;
set local role service_role;
select tests.ok(linktree.record_page_event('tech-2', 'view'), 'server records a view on a live page');
select tests.ok(linktree.record_page_event('tech-2', 'click', 'b-link-1', 'facebook.com', 'fb'), 'server records a click');
select tests.ok(not linktree.record_page_event('tien-shop', 'view'), 'unpublished page gets no events');
select tests.throws($$select linktree.record_page_event('tech-2', 'purchase')$$, '23514', 'unknown event type rejected');
reset role;
select tests.as_user(:'user_v');
select tests.throws($$select linktree.record_page_event('tech-2', 'view')$$, '42501', 'signed-in users cannot record events directly');
select tests.ok((select views = 1 and clicks = 1 from linktree.page_traffic(30) where page_id = :'page_a'), 'viewer sees company traffic');
reset role;
select tests.as_user(:'user_b');
select tests.ok((select count(*) from linktree.page_traffic(30)) = 0, 'other company cannot see A traffic');
reset role;

-- ---------- invariants (superuser) ----------
select tests.throws(format($$update linktree.page_versions set config = '{}' where page_id = %L$$, :'page_a'), 'PT409', 'versions are immutable');
select tests.throws(
  format($$update linktree.pages set draft_version_id = (select id from linktree.page_versions where page_id = %L limit 1) where id = %L$$, :'page_b', :'page_a'),
  '23503', 'pointer cannot reference another page''s version');

-- ---------- media (V2-10c): bucket linktree-media, company folders, editor+ ----------
select tests.ok(not exists (select 1 from storage.buckets where id = 'media'), 'old media bucket removed');
select tests.ok((select public from storage.buckets where id = 'linktree-media'), 'linktree-media bucket is public');
select tests.as_user(:'user_e');
insert into linktree.media_assets (owner_id, company_id, storage_path, mime_type, bytes)
values (:'user_e', :'company_a', :'company_a' || '/x.png', 'image/png', 10);
select tests.throws(format($$insert into linktree.media_assets (owner_id, company_id, storage_path, mime_type, bytes) values (%L, %L, %L, 'image/png', 10)$$,
  :'user_e', :'company_a', :'company_b' || '/x.png'), '23514', 'media path must be under the company folder');
select tests.throws(format($$insert into linktree.media_assets (owner_id, company_id, storage_path, mime_type, bytes) values (%L, %L, %L, 'image/png', 10)$$,
  :'user_e', :'company_b', :'company_b' || '/y.png'), '42501', 'cannot record media for another company');
select tests.throws(format($$insert into linktree.media_assets (owner_id, company_id, storage_bucket, storage_path, mime_type, bytes) values (%L, %L, 'media', %L, 'image/png', 10)$$,
  :'user_e', :'company_a', :'company_a' || '/z.png'), '42501', 'media rows must use linktree-media');
insert into storage.objects (bucket_id, name) values ('linktree-media', :'company_a' || '/x.png');
select tests.throws(format($$insert into storage.objects (bucket_id, name) values ('linktree-media', %L)$$, :'company_b' || '/x.png'), '42501',
  'storage: cannot upload into another company folder');
reset role;
select tests.as_user(:'user_v');
select tests.ok((select count(*) from linktree.media_assets) = 1, 'viewer sees company media');
select tests.throws(format($$insert into linktree.media_assets (owner_id, company_id, storage_path, mime_type, bytes) values (%L, %L, %L, 'image/png', 10)$$,
  :'user_v', :'company_a', :'company_a' || '/v.png'), '42501', 'viewer cannot record media');
select tests.throws(format($$insert into storage.objects (bucket_id, name) values ('linktree-media', %L)$$, :'company_a' || '/v.png'), '42501',
  'storage: viewer cannot upload');
reset role;
select tests.as_user(:'user_b');
select tests.ok((select count(*) from linktree.media_assets) = 0, 'other company cannot see A media');
reset role;

-- ---------- products (still per user) ----------
insert into linktree.products (owner_id, title, destination_url) values (:'user_b', 'B product', 'https://b.example') returning id as product_b \gset
select tests.as_user(:'user_a');
select tests.throws(format($$insert into linktree.products (owner_id, title, destination_url) values (%L, 'x', 'https://x.example')$$, :'user_b'), '42501', 'cannot create product for B');
select tests.throws(format($$insert into linktree.products (owner_id, title, destination_url) values (%L, 'x', 'javascript:alert(1)')$$, :'user_a'), '23514', 'unsafe product URL rejected');
insert into linktree.products (owner_id, title, destination_url) values (:'user_a', 'A product', 'https://a.example') returning id as product_a \gset
select tests.ok((select count(*) from linktree.products) = 1, 'A sees only own products');
insert into linktree.page_products (page_id, product_id) values (:'page_a', :'product_a');
select tests.throws(format($$insert into linktree.page_products (page_id, product_id) values (%L, %L)$$, :'page_b', :'product_a'), 'PT403', 'cannot attach to B page');
select tests.throws(format($$insert into linktree.page_products (page_id, product_id) values (%L, %L)$$, :'page_a', :'product_b'), 'PT403', 'cannot attach B product');

-- server-only tables
select tests.throws(format($$insert into linktree.page_events (page_id, event_type) values (%L, 'view')$$, :'page_a'), '42501', 'client cannot write events');
select tests.throws($$select count(*) from linktree.page_events$$, '42501', 'client cannot read raw events');
select tests.throws(format($$insert into linktree.deployments (page_id) values (%L)$$, :'page_a'), '42501', 'client cannot write deployments');
reset role;

-- ---------- delete ----------
select tests.as_user(:'user_d');
select tests.ok((linktree.delete_page(:'page_a')).slug = 'tech-2', 'admin deletes and gets the slug back');
reset role;
select tests.ok((select count(*) from linktree.page_versions where page_id = :'page_a') = 0, 'delete cascades versions');
select tests.ok((select count(*) from linktree.url_redirects where page_id = :'page_a') = 0, 'delete cascades redirects');
select tests.ok((select count(*) from linktree.pages where id = :'page_b') = 1, 'other company page survives');
delete from auth.users where id = :'user_d';
select tests.ok((select owner_id from linktree.pages where id = :'page_other') is null, 'page outlives its creator account');

-- ---------- V2-10b: nothing of ours in Eosoft's namespaces ----------
select tests.ok(not exists (
  select 1 from pg_class c join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public' and c.relname in ('profiles', 'templates', 'pages', 'page_versions', 'media_assets',
    'products', 'page_products', 'deployments', 'url_redirects', 'page_events', 'companies', 'company_members')
), 'no LinkBio tables left in public');
select tests.ok(not exists (
  select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public' and p.proname in ('create_page', 'save_draft', 'publish_page', 'rename_page', 'delete_page',
    'slug_available', 'get_published_page', 'record_page_event', 'page_traffic')
), 'no LinkBio functions left in public');
select tests.ok(not exists (select 1 from pg_namespace where nspname = 'private'), 'schema private removed');
select tests.ok(exists (
  select 1 from pg_trigger t join pg_proc p on p.oid = t.tgfoid join pg_namespace n on n.oid = p.pronamespace
  where t.tgrelid = 'auth.users'::regclass and n.nspname = 'linktree_private' and p.proname = 'handle_new_user'
), 'sign-up trigger calls linktree_private.handle_new_user');
select tests.ok(not has_schema_privilege('anon', 'linktree_private', 'usage')
  and not has_schema_privilege('authenticated', 'linktree_private', 'usage'), 'linktree_private not reachable by clients');

select 'rls_test: all passed' as result;
rollback;
