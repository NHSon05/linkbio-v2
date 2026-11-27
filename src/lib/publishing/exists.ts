import { createClient } from "@supabase/supabase-js";
import { DB_SCHEMA, getSupabaseEnv } from "@/lib/auth";
import { CATEGORY_SLUG } from "@/lib/schemas/site";
import { isValidGlobalSlug } from "@/lib/slug";
import { hasCategoryPath } from "@/templates/catalog";

const OLD_SLUG = /^[a-z0-9][a-z0-9-]{0,62}$/;
const TARGET = /^\/[a-z0-9][a-z0-9-]{2,29}$/;

/**
 * V2-14c / V2-31b: the address to look up for a public path, or null when it cannot be one (app routes,
 * reserved names, assets, 4+ segments). Two segments are either a category, /{slug}/{category}, or an old
 * /{username}/{slug}; the username rule equals the global slug rule. Three segments are a subcategory.
 */
export function publicPagePath(pathname: string) {
  const parts = pathname.split("/");
  if (parts[0] !== "" || !isValidGlobalSlug(parts[1] ?? "")) return null;
  if (parts.length === 2) return pathname;
  if (parts.length === 3) return OLD_SLUG.test(parts[2]) ? pathname : null;
  if (parts.length === 4)
    return CATEGORY_SLUG.test(parts[2]) && CATEGORY_SLUG.test(parts[3])
      ? pathname
      : null;
  return null;
}

/** Static app routes with 2–3 segments; exists.test.ts keeps this equal to src/app. */
export const APP_PATHS = [
  "/api/v1/events",
  "/auth/callback",
  "/auth/confirm",
  "/auth/confirm/verify",
  "/register/resend",
];

/**
 * A 2–3 segment path that reaches the public catalog routes but cannot be a public page (e.g. /login/x,
 * /son/Laptop). The proxy must answer 404 itself: inside the streamed route, notFound() keeps status 200.
 * File-like paths (a dot in the last segment) are left to Next, which serves public/ files.
 */
export function isStrayPublicPath(pathname: string) {
  const parts = pathname.split("/");
  return (
    (parts.length === 3 || parts.length === 4) &&
    !APP_PATHS.includes(pathname) &&
    !pathname.startsWith("/_") &&
    !parts[parts.length - 1].includes(".") &&
    publicPagePath(pathname) === null
  );
}

export type PublicLookup = "page" | { redirectTo: string } | null;

type Row = { redirect_to: string | null; categories?: unknown };

/**
 * What a path from publicPagePath() is: a live page or category ("page"), an old address (308 target), or
 * nothing (404). Order: an exact old address (/{username}/{slug}); then a renamed page, keeping the category
 * part (/{old}/x → /{new}/x); then a live page that has that category.
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
  const find = (p: string, columns = "redirect_to") =>
    supabase
      .rpc("get_published_page", { p_path: p })
      .select(columns)
      .maybeSingle<Row>();

  const [, slug, category, subcategory] = path.split("/");
  const root = "/" + slug;
  // Two segments may be an old /{username}/{slug}. That redirect wins over a category, so a page that later
  // takes the slug {username} cannot capture old links. Only category paths read the category tree.
  const [base, exact] = await Promise.all([
    find(
      root,
      category === undefined
        ? "redirect_to"
        : "redirect_to, categories:config->catalog->categories",
    ),
    category !== undefined && subcategory === undefined ? find(path) : null,
  ]);
  const error = base.error ?? exact?.error;
  if (error) {
    console.error("lookupPublicPage: get_published_page failed", error.code);
    return "page";
  }
  if (exact?.data?.redirect_to) return target(exact.data.redirect_to, path, "");
  const row = base.data;
  if (!row) return null;
  if (row.redirect_to)
    return target(row.redirect_to, root, path.slice(root.length));
  return category === undefined ||
    hasCategoryPath(row.categories, category, subcategory)
    ? "page"
    : null;
}

/** Only same-site /{slug} targets, so bad data can never become an open redirect or a loop. */
function target(to: string, from: string, rest: string): PublicLookup {
  if (!TARGET.test(to) || to === from) return null;
  return { redirectTo: to + rest };
}
