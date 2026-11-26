import { createClient } from "@supabase/supabase-js";
import { cacheLife, cacheTag } from "next/cache";
import { DB_SCHEMA, supabaseEnv } from "@/lib/auth";
import { siteFromConfig, type Site } from "@/lib/schemas/site";
import { isValidGlobalSlug } from "@/lib/slug";

/** V2-14a: cache tags. Every cached lookup of a path carries pathTag(path); one that found a page or a
 * redirect also carries pageTag(page id). Publish/rename/delete refresh pageTag(id), plus pathTag of an
 * address that starts showing a page (new slug, first publish). */
export const pageTag = (pageId: string) => `page:${pageId}`;
export const pathTag = (path: string) => `path:${path}`;

export type PublishedPage = { site: Site } | { redirectTo: string } | null;

const PATH = /^\/[a-z0-9][a-z0-9-]{2,29}$/;

/**
 * PUB-02 / V2-14a: the live snapshot of /{slug}, cached until publish/rename/delete refreshes it.
 * Reads as anon through get_published_page(), so drafts can never leak into a public page.
 */
export async function getPublishedPage(slug: string): Promise<PublishedPage> {
  "use cache";
  cacheLife("max");
  const path = "/" + slug;
  cacheTag(pathTag(path));

  // Malformed or reserved addresses can never exist; skip the database for them.
  if (!isValidGlobalSlug(slug)) return null;

  const { url, key } = supabaseEnv();
  const supabase = createClient(url, key, {
    db: { schema: DB_SCHEMA },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data, error } = await supabase
    .rpc("get_published_page", { p_path: path })
    .maybeSingle<{
      page_id: string;
      config: unknown;
      redirect_to: string | null;
    }>();
  // Throwing keeps a temporary outage from being cached as "page not found".
  if (error) throw new Error("Could not load published page: " + error.message);
  if (!data) return null;
  cacheTag(pageTag(data.page_id));
  if (data.redirect_to)
    // A redirect to itself would loop; treat it as broken data.
    return PATH.test(data.redirect_to) && data.redirect_to !== path
      ? { redirectTo: data.redirect_to }
      : null;
  try {
    return { site: siteFromConfig(data.config, slug) };
  } catch (err) {
    console.error("Published config is invalid", slug, err);
    return null;
  }
}
