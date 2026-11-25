import { createClient } from "@supabase/supabase-js";
import { cacheLife, cacheTag } from "next/cache";
import { supabaseEnv } from "@/lib/auth";
import { siteFromConfig, type Site } from "@/lib/schemas/site";

/** Cache tag of one public page; publish/rename/delete call updateTag() with it. */
export const publishedPageTag = (username: string, slug: string) =>
  `published:${username.toLowerCase()}/${slug}`;

export type PublishedPage = { site: Site } | { redirectTo: string } | null;

const USERNAME = /^[a-z0-9][a-z0-9-]{2,29}$/;
const SLUG = /^[a-z0-9][a-z0-9-]{0,62}$/;
const PATH = /^\/[a-z0-9][a-z0-9-]*\/[a-z0-9][a-z0-9-]*$/;

/**
 * PUB-02: the live snapshot of /{username}/{slug}, cached until publish/rename/delete refreshes it.
 * Reads as anon through get_published_page(), so drafts can never leak into a public page.
 */
export async function getPublishedPage(
  username: string,
  slug: string,
): Promise<PublishedPage> {
  "use cache";
  cacheLife("max");
  cacheTag(publishedPageTag(username, slug));

  // Malformed addresses can never exist; skip the database for them.
  if (!USERNAME.test(username) || !SLUG.test(slug)) return null;

  const { url, key } = supabaseEnv();
  const supabase = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data, error } = await supabase
    .rpc("get_published_page", { p_username: username, p_slug: slug })
    .maybeSingle<{ config: unknown; redirect_to: string | null }>();
  // Throwing keeps a temporary outage from being cached as "page not found".
  if (error) throw new Error("Could not load published page: " + error.message);
  if (!data) return null;
  if (data.redirect_to)
    return PATH.test(data.redirect_to)
      ? { redirectTo: data.redirect_to }
      : null;
  try {
    return { site: siteFromConfig(data.config, username, slug) };
  } catch (err) {
    console.error("Published config is invalid", username, slug, err);
    return null;
  }
}
