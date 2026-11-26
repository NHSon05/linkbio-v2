import { createClient } from "@supabase/supabase-js";
import { DB_SCHEMA, getSupabaseEnv } from "@/lib/auth";
import { RESERVED_USERNAMES } from "@/lib/schemas/username";

const USERNAME = /^[a-z0-9][a-z0-9-]{2,29}$/;
const SLUG = /^[a-z0-9][a-z0-9-]{0,62}$/;
const reserved = new Set<string>(RESERVED_USERNAMES);

/** The {username, slug} of a public page address, or null when the path is not one (app routes, assets). */
export function publicPagePath(pathname: string) {
  const parts = pathname.split("/");
  if (parts.length !== 3 || parts[0] !== "" || reserved.has(parts[1]))
    return null;
  return { username: parts[1], slug: parts[2] };
}

// shortcut: per-instance memory, so a deleted page keeps a soft 404 (200) for up to a minute; move to a shared store if that matters.
const known = new Map<string, number>();
const KNOWN_MS = 60_000;

/**
 * Whether /{username}/{slug} is a live page or an old address that redirects.
 * Only "yes" is remembered, so a page published a moment ago is never answered 404.
 * Returns true when Supabase cannot answer, so an outage never hides real pages.
 */
export async function publicPageExists(
  username: string,
  slug: string,
  now = Date.now(),
) {
  if (!USERNAME.test(username) || !SLUG.test(slug)) return false;
  const key = `${username}/${slug}`;
  if ((known.get(key) ?? 0) > now) return true;

  const env = getSupabaseEnv();
  if (!env) return true;
  const supabase = createClient(env.url, env.key, {
    db: { schema: DB_SCHEMA },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data, error } = await supabase
    .rpc("get_published_page", { p_username: username, p_slug: slug })
    .select("redirect_to")
    .maybeSingle();
  if (error) return true;
  if (!data) return false;
  if (known.size > 10_000) known.clear();
  known.set(key, now + KNOWN_MS);
  return true;
}
