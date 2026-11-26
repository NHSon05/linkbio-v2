import { createClient } from "@supabase/supabase-js";
import { DB_SCHEMA, getSupabaseEnv } from "@/lib/auth";
import { RESERVED_USERNAMES } from "@/lib/schemas/username";
import { isValidGlobalSlug } from "@/lib/slug";

const USERNAME = /^[a-z0-9][a-z0-9-]{2,29}$/;
const OLD_SLUG = /^[a-z0-9][a-z0-9-]{0,62}$/;
const TARGET = /^\/[a-z0-9][a-z0-9-]{2,29}$/;
const reserved = new Set<string>(RESERVED_USERNAMES);

/**
 * V2-14c: the address to look up for a public path: /{slug}, or an old /{username}/{slug} that may redirect.
 * Null when the path cannot be a public page (app routes, reserved names, assets, 3+ segments).
 */
export function publicPagePath(pathname: string) {
  const parts = pathname.split("/");
  if (parts[0] !== "") return null;
  if (parts.length === 2) return isValidGlobalSlug(parts[1]) ? pathname : null;
  if (parts.length !== 3) return null;
  const [, username, slug] = parts;
  return USERNAME.test(username) && !reserved.has(username) && OLD_SLUG.test(slug)
    ? pathname
    : null;
}

export type PublicLookup = "page" | { redirectTo: string } | null;

/**
 * Whether a path from publicPagePath() is a live page, an old address (with its /{slug} target) or nothing.
 * Not memoized: an in-process memo kept serving a renamed slug (no 308) and could loop after renaming back.
 * Answers "page" when Supabase cannot answer, so an outage never hides real pages.
 */
export async function lookupPublicPage(path: string): Promise<PublicLookup> {
  const env = getSupabaseEnv();
  if (!env) return "page";
  const supabase = createClient(env.url, env.key, {
    db: { schema: DB_SCHEMA },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data, error } = await supabase
    .rpc("get_published_page", { p_path: path })
    .select("redirect_to")
    .maybeSingle<{ redirect_to: string | null }>();
  if (error) return "page";
  if (!data) return null;
  if (!data.redirect_to) return "page";
  // Only same-site /{slug} targets, so bad data can never become an open redirect or a loop.
  if (!TARGET.test(data.redirect_to) || data.redirect_to === path) return null;
  return { redirectTo: data.redirect_to };
}
